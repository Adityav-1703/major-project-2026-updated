"""
Herb Authentication Inference Service
Loads trained EfficientNetB4 and runs species + purity prediction on images.
"""

import json
import hashlib
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np
import tensorflow as tf
from PIL import Image, ImageFilter
import io

# ─── Config ───────────────────────────────────────────────────────────────────

IMG_SIZE   = (380, 380)
MODEL_PATH = Path("saved_models/herbal_auth_final.keras")
CLASS_MAP  = Path("saved_models/class_indices.json")

# Purity thresholds
PURITY_HIGH   = 0.85   # Certified pure
PURITY_MEDIUM = 0.60   # Acceptable, minor anomaly
PURITY_LOW    = 0.00   # Below this → rejected

CONFIDENCE_THRESHOLD = 0.70  # Min species confidence to issue cert


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class AuthResult:
    species: str
    confidence: float
    top3: list[dict]
    purity_score: float
    purity_label: str           # "pure" | "acceptable" | "adulterated"
    authenticated: bool
    image_hash: str
    timestamp: str
    rejection_reason: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "species":          self.species,
            "confidence":       round(self.confidence, 4),
            "top3_predictions": self.top3,
            "purity_score":     round(self.purity_score, 4),
            "purity_label":     self.purity_label,
            "authenticated":    self.authenticated,
            "image_hash":       self.image_hash,
            "timestamp":        self.timestamp,
            "rejection_reason": self.rejection_reason,
            "metadata":         self.metadata,
        }


# ─── Service ──────────────────────────────────────────────────────────────────

class HerbalAuthService:
    _instance = None  # Singleton — avoid reloading model per request

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self, model_path: str = None, class_map_path: str = None):
        if self._loaded:
            return
        mp = Path(model_path) if model_path else MODEL_PATH
        cp = Path(class_map_path) if class_map_path else CLASS_MAP

        if not mp.exists():
            raise FileNotFoundError(
                f"Model not found at {mp}. Run `python models/train_cnn.py` first."
            )

        print(f"Loading model from {mp} ...")
        self.model = tf.keras.models.load_model(mp)

        with open(cp) as f:
            class_indices = json.load(f)

        # {index: class_name}
        self.idx_to_class = {v: k for k, v in class_indices.items()}
        self.num_classes   = len(class_indices)
        self._loaded       = True
        print(f"Model ready — {self.num_classes} herb species.")

    # ── Image preprocessing ───────────────────────────────────────────────────

    @staticmethod
    def preprocess(image_bytes: bytes) -> np.ndarray:
        """
        Preprocess raw image bytes into model-ready tensor.
        Applies CLAHE-like contrast enhancement for field photos.
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Mild sharpening helps with blurry field captures
        img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=3))

        img = img.resize(IMG_SIZE, Image.LANCZOS)
        arr = np.array(img, dtype=np.float32) / 255.0

        # ImageNet-style normalisation (matches EfficientNet training)
        mean = np.array([0.485, 0.456, 0.406])
        std  = np.array([0.229, 0.224, 0.225])
        arr  = (arr - mean) / std

        return np.expand_dims(arr, 0)   # (1, H, W, 3)

    @staticmethod
    def hash_image(image_bytes: bytes) -> str:
        """SHA-256 fingerprint of the raw upload — stored on-chain."""
        return hashlib.sha256(image_bytes).hexdigest()

    # ── Inference ─────────────────────────────────────────────────────────────

    def predict(self, image_bytes: bytes, herb_name_hint: str = None) -> AuthResult:
        if not self._loaded:
            raise RuntimeError("Call .load() before .predict()")

        tensor = self.preprocess(image_bytes)
        image_hash = self.hash_image(image_bytes)
        timestamp  = datetime.now(timezone.utc).isoformat()

        # Run model (two outputs: species probs + purity score)
        species_probs, purity_tensor = self.model.predict(tensor, verbose=0)
        species_probs = species_probs[0]
        purity_score  = float(purity_tensor[0][0])

        # Top-3 species predictions
        top_indices = np.argsort(species_probs)[::-1][:3]
        top3 = [
            {
                "species":    self.idx_to_class[int(i)],
                "confidence": round(float(species_probs[i]), 4),
            }
            for i in top_indices
        ]

        best_species    = top3[0]["species"]
        best_confidence = top3[0]["confidence"]

        # Purity classification
        purity_label = (
            "pure"        if purity_score >= PURITY_HIGH   else
            "acceptable"  if purity_score >= PURITY_MEDIUM else
            "adulterated"
        )

        # Authentication decision
        authenticated    = True
        rejection_reason = None

        if best_confidence < CONFIDENCE_THRESHOLD:
            authenticated    = False
            rejection_reason = (
                f"Species confidence {best_confidence:.1%} below threshold "
                f"({CONFIDENCE_THRESHOLD:.0%}). Image may be unclear or species unknown."
            )
        elif purity_label == "adulterated":
            authenticated    = False
            rejection_reason = (
                f"Purity score {purity_score:.2f} indicates adulteration. "
                "Leaf may be mixed or degraded."
            )

        # Hint mismatch check
        if herb_name_hint and authenticated:
            if herb_name_hint.lower() not in best_species.lower():
                authenticated    = False
                rejection_reason = (
                    f"Predicted species '{best_species}' does not match "
                    f"declared species '{herb_name_hint}'."
                )

        return AuthResult(
            species          = best_species,
            confidence       = best_confidence,
            top3             = top3,
            purity_score     = purity_score,
            purity_label     = purity_label,
            authenticated    = authenticated,
            image_hash       = image_hash,
            timestamp        = timestamp,
            rejection_reason = rejection_reason,
            metadata={
                "model":       "EfficientNetB4",
                "image_size":  f"{IMG_SIZE[0]}x{IMG_SIZE[1]}",
                "num_classes": self.num_classes,
            },
        )


# ─── Module-level singleton ───────────────────────────────────────────────────

auth_service = HerbalAuthService()
