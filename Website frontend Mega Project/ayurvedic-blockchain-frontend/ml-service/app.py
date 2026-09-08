"""
AyurAuth CNN inference service.

Models (in ml-service/models/):
  - herbal_auth_improved_final.h5  → 224×224 (preferred)
  - leaf_model.h5                  → 160×160 (legacy)

  pip install -r requirements.txt
  python app.py
"""
from __future__ import annotations

import base64
import io
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app)
IMPROVED_MODEL_PATH = BASE_DIR / "models" / "herbal_auth_improved_final.h5"
DEFAULT_MODEL_PATH = BASE_DIR / "models" / "leaf_model.h5"


def resolve_model_path() -> Path:
    env_path = os.environ.get("MODEL_PATH")
    if env_path:
        p = Path(env_path)
        if not p.is_absolute():
            p = BASE_DIR / p
        return p
    if IMPROVED_MODEL_PATH.is_file():
        return IMPROVED_MODEL_PATH
    return DEFAULT_MODEL_PATH


MODEL_PATH = resolve_model_path()
THRESHOLD = float(os.environ.get("AI_VERIFY_THRESHOLD", "0.7"))

_model = None
_class_names: list[str] = []
_model_version = "unknown"
_inference_size: int | None = None


def infer_input_size(model) -> int:
    """Read H×W from the loaded Keras model (model weights are the source of truth)."""
    shape = getattr(model, "input_shape", None)
    if shape and len(shape) == 4 and shape[1] and shape[2]:
        size = int(shape[1])
        env_size = os.environ.get("MODEL_IMG_SIZE")
        if env_size and int(env_size) != size:
            print(
                f"[WARN] MODEL_IMG_SIZE={env_size} ignored — model requires {size}×{size}"
            )
        return size

    if hasattr(model, "inputs") and model.inputs:
        tensor_shape = model.inputs[0].shape
        dims = tensor_shape.as_list() if hasattr(tensor_shape, "as_list") else list(tensor_shape)
        if len(dims) == 4 and dims[1] and dims[2]:
            return int(dims[1])

    for layer in model.layers:
        layer_shape = getattr(layer, "input_shape", None)
        if layer_shape and len(layer_shape) == 4 and layer_shape[1]:
            return int(layer_shape[1])

    # Safe fallbacks by known filenames
    name = MODEL_PATH.name.lower()
    if "improved" in name or "224" in name:
        return 224
    if "leaf" in name or "160" in name:
        return 160
    return 160


def load_model(force_reload: bool = False):
    global _model, _class_names, _model_version, _inference_size
    if _model is not None and not force_reload:
        return _model
    _model = None
    _inference_size = None

    if not MODEL_PATH.is_file():
        print(f"WARNING: Model not found at {MODEL_PATH}")
        print("Copy herbal_auth_improved_final.h5 or leaf_model.h5 into ml-service/models/")
        return None

    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    import tensorflow as tf  # noqa: WPS433

    _model = tf.keras.models.load_model(str(MODEL_PATH))
    _inference_size = infer_input_size(_model)

    if "improved" in MODEL_PATH.name.lower():
        _model_version = "herbal_auth_improved"
    else:
        _model_version = "leaf_model"

    print(f"[OK] Model loaded: {MODEL_PATH.name}")
    print(f"[OK] Inference size: {_inference_size}×{_inference_size}")
    print(f"[OK] Model input_shape: {_model.input_shape}")

    labels_path = MODEL_PATH.parent / "class_labels.txt"
    if labels_path.is_file():
        _class_names = [line.strip() for line in labels_path.read_text().splitlines() if line.strip()]
        print(f"[OK] Loaded {len(_class_names)} classes from class_labels.txt")
    else:
        out_shape = _model.output_shape[-1]
        n = int(out_shape) if out_shape is not None else 1
        _class_names = [f"class_{i}" for i in range(n)]
        print(f"[WARN] Using auto-generated class names ({n} classes)")

    return _model


def get_inference_size() -> int:
    load_model()
    return _inference_size or int(os.environ.get("MODEL_IMG_SIZE", "160"))


def decode_image(b64: str):
    import numpy as np
    from PIL import Image

    model = load_model()
    if model is None:
        raise RuntimeError("CNN model file is missing in ml-service/models/")

    size = get_inference_size()
    expected = None
    if model.input_shape and len(model.input_shape) == 4 and model.input_shape[1]:
        expected = int(model.input_shape[1])

    if expected and size != expected:
        print(f"[WARN] Resizing mismatch: config={size}, model expects {expected} — using {expected}")
        size = expected

    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img = img.resize((size, size))
    arr = np.array(img, dtype=np.float32) / 255.0
    batch = np.expand_dims(arr, axis=0)

    if expected and batch.shape[1:3] != (expected, expected):
        raise ValueError(
            f"Image tensor shape {batch.shape[1:3]} does not match model input ({expected}, {expected})"
        )

    return batch


def predict_tensor(batch):
    import numpy as np

    model = load_model()
    if model is None:
        return {
            "class": "model_not_loaded",
            "confidence": 0.0,
            "isAuthentic": False,
            "modelName": "model (missing)",
            "modelVersion": "unknown",
        }

    expected = model.input_shape[1] if model.input_shape else None
    if expected and (batch.shape[1] != expected or batch.shape[2] != expected):
        raise ValueError(
            f"Input shape {batch.shape[1:3]} incompatible with model — expected ({expected}, {expected}). "
            f"Restart ml-service after deploying a new .h5 file."
        )

    preds = model.predict(batch, verbose=0)[0]
    idx = int(np.argmax(preds))
    confidence = float(preds[idx])
    label = _class_names[idx] if idx < len(_class_names) else f"class_{idx}"

    return {
        "class": label,
        "confidence": round(confidence, 4),
        "isAuthentic": confidence >= THRESHOLD,
        "modelName": _model_version,
        "modelVersion": _model_version,
        "threshold": THRESHOLD,
        "imageSize": get_inference_size(),
    }


@app.get("/health")
def health():
    model = load_model()
    size = get_inference_size() if model else None
    return jsonify({
        "ok": True,
        "modelLoaded": model is not None,
        "modelPath": str(MODEL_PATH),
        "modelName": MODEL_PATH.name,
        "modelVersion": _model_version,
        "classes": len(_class_names),
        "classNames": _class_names,
        "imageSize": size,
        "modelInputShape": list(model.input_shape) if model and model.input_shape else None,
        "threshold": THRESHOLD,
    })


@app.post("/predict")
def predict():
    data = request.get_json(silent=True) or {}
    image_b64 = data.get("image")
    if not image_b64:
        return jsonify({"error": "Missing 'image' (base64) in JSON body"}), 400

    try:
        batch = decode_image(image_b64)
        result = predict_tensor(batch)
        return jsonify(result)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", "5001"))
    print(f"Using model: {MODEL_PATH}")
    load_model()
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
