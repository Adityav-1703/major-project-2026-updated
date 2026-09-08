# -*- coding: utf-8 -*-
"""
Model Accuracy Testing & Validation
Tests the improved model on a separate test set
"""

import os
import json
import numpy as np
from pathlib import Path
from PIL import Image
import matplotlib.pyplot as plt
import seaborn as sns

import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# ─── Configuration ─────────────────────────────────────────────────────────────

MODEL_PATH = Path("saved_models/herbal_auth_improved_final.h5")
CLASS_MAP_PATH = Path("saved_models/class_indices.json")
TEST_DATA_DIR = Path("data/herbs")
IMG_SIZE = (224, 224)
THRESHOLD = 0.7

# ─── Utilities ────────────────────────────────────────────────────────────────

def load_model():
    """Load trained model"""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    model = tf.keras.models.load_model(str(MODEL_PATH))
    print(f"✓ Model loaded: {MODEL_PATH}")
    return model


def load_class_indices():
    """Load class to index mapping"""
    if not CLASS_MAP_PATH.exists():
        raise FileNotFoundError(f"Class map not found: {CLASS_MAP_PATH}")

    with open(CLASS_MAP_PATH) as f:
        class_indices = json.load(f)

    idx_to_class = {v: k for k, v in class_indices.items()}
    return class_indices, idx_to_class


def load_image(image_path):
    """Load and preprocess image"""
    try:
        img = Image.open(image_path).convert('RGB')
        img = img.resize(IMG_SIZE)
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        return None


def test_single_image(model, image_path, class_indices):
    """Test single image prediction"""
    img_array = load_image(image_path)
    if img_array is None:
        return None

    prediction = model.predict(img_array, verbose=0)[0]
    pred_idx = np.argmax(prediction)
    confidence = float(prediction[pred_idx])

    idx_to_class = {v: k for k, v in class_indices.items()}
    pred_class = idx_to_class[pred_idx]

    return {
        "image_path": str(image_path),
        "predicted_class": pred_class,
        "confidence": round(confidence, 4),
        "is_authenticated": confidence >= THRESHOLD,
        "all_predictions": {
            idx_to_class[i]: round(float(prediction[i]), 4)
            for i in range(len(prediction))
        }
    }


def test_all_images(model, class_indices):
    """Test all images in test directory"""
    idx_to_class = {v: k for k, v in class_indices.items()}
    all_predictions = []
    all_true_labels = []
    all_confidences = []

    total_images = 0
    correct_predictions = 0
    high_confidence_correct = 0

    # Iterate through all class directories
    for class_name, class_idx in class_indices.items():
        class_dir = TEST_DATA_DIR / class_name

        if not class_dir.exists():
            print(f"⚠ Class directory not found: {class_dir}")
            continue

        image_files = list(class_dir.glob("*.jpg")) + \
                      list(class_dir.glob("*.jpeg")) + \
                      list(class_dir.glob("*.png")) + \
                      list(class_dir.glob("*.webp"))

        print(f"\nTesting {class_name} ({len(image_files)} images)")

        for image_file in image_files:
            result = test_single_image(model, image_file, class_indices)

            if result is None:
                continue

            all_predictions.append(result["predicted_class"])
            all_true_labels.append(class_name)
            all_confidences.append(result["confidence"])
            total_images += 1

            is_correct = result["predicted_class"] == class_name
            if is_correct:
                correct_predictions += 1
                if result["confidence"] >= THRESHOLD:
                    high_confidence_correct += 1

    print("\n" + "=" * 70)
    print("TEST RESULTS SUMMARY")
    print("=" * 70)

    if total_images == 0:
        print("⚠ No images found for testing!")
        return

    overall_accuracy = correct_predictions / total_images
    high_confidence_accuracy = (high_confidence_correct / correct_predictions) if correct_predictions > 0 else 0

    print(f"\nTotal images tested: {total_images}")
    print(f"Correct predictions: {correct_predictions}/{total_images}")
    print(f"Overall Accuracy: {overall_accuracy*100:.2f}%")
    print(f"High confidence (>{THRESHOLD*100:.0f}%) correct: {high_confidence_correct}/{correct_predictions}")

    # Per-class accuracy
    print("\n" + "-" * 70)
    print("Per-Class Accuracy:")
    print("-" * 70)

    for class_name in class_indices.keys():
        class_true = [all_true_labels[i] == class_name for i in range(len(all_true_labels))]
        class_pred = [all_predictions[i] == class_name for i in range(len(all_predictions))]

        if sum(class_true) == 0:
            continue

        class_acc = sum([class_true[i] and class_pred[i] for i in range(len(class_true))]) / sum(class_true)
        print(f"{class_name:15} : {class_acc*100:6.2f}% ({sum(class_true):3d} samples)")

    # Classification report
    print("\n" + "-" * 70)
    print("Detailed Classification Report:")
    print("-" * 70)
    print(classification_report(all_true_labels, all_predictions,
                                labels=list(class_indices.keys()),
                                target_names=list(class_indices.keys())))

    # Confusion matrix
    cm = confusion_matrix(all_true_labels, all_predictions,
                         labels=list(class_indices.keys()))

    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_indices.keys(),
                yticklabels=class_indices.keys(),
                cbar_kws={'label': 'Count'})
    plt.title('Confusion Matrix - Test Set')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(Path("saved_models") / "confusion_matrix_test.png", dpi=150)
    print("\n✓ Confusion matrix saved")

    # Confidence distribution
    plt.figure(figsize=(10, 5))
    plt.hist(all_confidences, bins=20, edgecolor='black', alpha=0.7)
    plt.axvline(THRESHOLD, color='red', linestyle='--', label=f'Threshold ({THRESHOLD})')
    plt.xlabel('Confidence Score')
    plt.ylabel('Frequency')
    plt.title('Confidence Distribution on Test Set')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(Path("saved_models") / "confidence_distribution.png", dpi=150)
    print("✓ Confidence distribution saved")

    return {
        "total_images": total_images,
        "overall_accuracy": overall_accuracy,
        "correct_predictions": correct_predictions,
    }


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        print("=" * 70)
        print("MODEL ACCURACY TESTING")
        print("=" * 70)

        # Load model and class indices
        model = load_model()
        class_indices, idx_to_class = load_class_indices()

        # Test all images
        results = test_all_images(model, class_indices)

        if results:
            print("\n" + "=" * 70)
            print("✓ TESTING COMPLETED")
            print("=" * 70)
        else:
            print("\n⚠ No test data found. Ensure your data is in: data/herbs/")

    except Exception as e:
        print(f"\n✗ Testing failed: {e}")
        raise
