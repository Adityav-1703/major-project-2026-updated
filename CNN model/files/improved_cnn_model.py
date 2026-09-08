# -*- coding: utf-8 -*-
"""
Improved Herbal Leaf CNN Classification Model
Enhances MobileNetV2 with better augmentation, architecture, and training techniques
Target accuracy: 92-95%
"""

import os
import json
import numpy as np
from pathlib import Path
from datetime import datetime

import tensorflow as tf
from tensorflow.keras import layers, Model, callbacks
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# ─── Configuration ─────────────────────────────────────────────────────────────

IMG_SIZE = (224, 224)  # Larger than 160 for better feature extraction
BATCH_SIZE = 32  # Increased from 16
EPOCHS_FROZEN = 20  # Phase 1: train head only (increased)
EPOCHS_FINE = 15  # Phase 2: fine-tune
LEARNING_RATE = 1e-3
FINE_LR = 1e-4  # Better fine-tuning rate
DROPOUT = 0.5  # Increased regularization
L2_REG = 1e-4

DATA_DIR = Path("data/herbs")  # Local data directory
MODEL_NAME = "herbal_auth_improved"
MODEL_DIR = Path("saved_models")
MODEL_DIR.mkdir(exist_ok=True)

# ─── Enhanced Data Augmentation ────────────────────────────────────────────────

def build_augmentation_pipeline():
    """
    Enhanced augmentation to simulate real-world conditions:
    Varying light, angles, partial occlusion, moisture, zoom levels
    """
    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=45,  # Increased from 20°
        width_shift_range=0.25,  # Added explicit width shift
        height_shift_range=0.25,  # Added explicit height shift
        shear_range=0.2,  # Added shearing
        zoom_range=0.3,  # Increased from 0.2
        horizontal_flip=True,
        vertical_flip=False,  # Vertical flip less realistic for leaves
        brightness_range=[0.7, 1.3],  # Added brightness variation
        channel_shift_range=20.0,  # Added color shift
        fill_mode="reflect",  # Better than 'nearest'
        validation_split=0.2,
    )

    val_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        validation_split=0.2
    )

    return train_gen, val_gen


def load_datasets(train_gen, val_gen):
    """Load training and validation datasets"""
    try:
        train_ds = train_gen.flow_from_directory(
            DATA_DIR,
            target_size=IMG_SIZE,
            batch_size=BATCH_SIZE,
            class_mode="categorical",
            subset="training",
            shuffle=True,
            seed=42,
        )

        val_ds = val_gen.flow_from_directory(
            DATA_DIR,
            target_size=IMG_SIZE,
            batch_size=BATCH_SIZE,
            class_mode="categorical",
            subset="validation",
            shuffle=False,
            seed=42,
        )

        return train_ds, val_ds
    except Exception as e:
        print(f"Error loading datasets: {e}")
        print(f"Expected data directory: {DATA_DIR}")
        raise


# ─── Improved Model Architecture ───────────────────────────────────────────────

def build_improved_model(num_classes: int) -> tuple:
    """
    MobileNetV2 with enhanced layers and regularization
    """
    base = MobileNetV2(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE, 3),
    )
    base.trainable = False  # Frozen in phase 1

    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = base(inputs, training=False)

    # Global context
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)  # Added BatchNorm

    # Shared dense trunk with regularization
    x = layers.Dense(
        256,
        activation="relu",
        kernel_regularizer=tf.keras.regularizers.l2(L2_REG)
    )(x)
    x = layers.BatchNormalization()(x)  # Added BatchNorm
    x = layers.Dropout(DROPOUT)(x)  # Increased dropout

    x = layers.Dense(
        128,
        activation="relu",
        kernel_regularizer=tf.keras.regularizers.l2(L2_REG)
    )(x)
    x = layers.Dropout(DROPOUT * 0.8)(x)

    # Output layer
    output = layers.Dense(num_classes, activation="softmax")(x)

    model = Model(inputs=inputs, outputs=output, name=MODEL_NAME)
    return model, base


def compile_model(model: Model, learning_rate: float) -> Model:
    """Compile model with optimizer and loss"""
    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


# ─── Training Callbacks ────────────────────────────────────────────────────────

def get_callbacks(phase: str) -> list:
    """Get training callbacks"""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return [
        callbacks.ModelCheckpoint(
            MODEL_DIR / f"{MODEL_NAME}_{phase}_{ts}.h5",
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=5,  # Reduced patience for better stopping
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,  # More aggressive LR reduction
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
    ]


# ─── Training Pipeline ─────────────────────────────────────────────────────────

def train(data_dir: str = None):
    """Main training pipeline"""
    if data_dir:
        global DATA_DIR
        DATA_DIR = Path(data_dir)

    print("=" * 70)
    print("IMPROVED HERBAL LEAF CNN MODEL - MobileNetV2 Enhanced")
    print("=" * 70)

    train_gen, val_gen = build_augmentation_pipeline()
    train_ds, val_ds = load_datasets(train_gen, val_gen)

    num_classes = len(train_ds.class_indices)
    print(f"\n[OK] Detected {num_classes} herb classes:")
    print(f"  {list(train_ds.class_indices.keys())}")

    # Save class mapping
    with open(MODEL_DIR / "class_indices.json", "w") as f:
        json.dump(train_ds.class_indices, f, indent=2)

    # Save class labels for Flask service
    with open(MODEL_DIR / "class_labels.txt", "w") as f:
        for class_name in sorted(train_ds.class_indices.keys()):
            f.write(f"{class_name}\n")

    model, base = build_improved_model(num_classes)
    model = compile_model(model, LEARNING_RATE)

    print("\n" + "=" * 70)
    print("MODEL ARCHITECTURE")
    print("=" * 70)
    model.summary()

    # Phase 1 — frozen base, train head
    print("\n" + "=" * 70)
    print(f"PHASE 1: Training classification head (base frozen)")
    print(f"Epochs: {EPOCHS_FROZEN} | Batch size: {BATCH_SIZE}")
    print("=" * 70)

    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FROZEN,
        callbacks=get_callbacks("phase1"),
        verbose=1,
    )

    # Phase 2 — unfreeze top layers
    print("\n" + "=" * 70)
    print(f"PHASE 2: Fine-tuning top 30 layers")
    print(f"Epochs: {EPOCHS_FINE} | Learning rate: {FINE_LR}")
    print("=" * 70)

    base.trainable = True
    for layer in base.layers[:-30]:  # Unfreeze top 30 layers
        layer.trainable = False

    model = compile_model(model, FINE_LR)

    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FINE,
        callbacks=get_callbacks("phase2"),
        verbose=1,
    )

    # Evaluate
    print("\n" + "=" * 70)
    print("FINAL EVALUATION")
    print("=" * 70)
    evaluate_model(model, val_ds, train_ds.class_indices)

    # Save final model
    final_path = MODEL_DIR / f"{MODEL_NAME}_final.h5"
    model.save(str(final_path))
    print(f"\n[OK] Model saved: {final_path}")

    # Plot training curves
    plot_training(history1, history2)

    # Deploy to website ml-service
    try:
        from deploy_model import deploy, ML_SERVICE_MODELS

        deploy(final_path, ML_SERVICE_MODELS, "herbal_auth_improved_final.h5")
        print(f"\n[OK] Deployed to ml-service: {ML_SERVICE_MODELS}")
    except Exception as deploy_err:  # noqa: BLE001
        print(f"\n⚠ Auto-deploy skipped: {deploy_err}")
        print("  Run manually: python deploy_model.py")

    return model


# ─── Model Evaluation ──────────────────────────────────────────────────────────

def evaluate_model(model: Model, val_ds, class_indices: dict):
    """Evaluate model and print detailed metrics"""
    idx_to_class = {v: k for k, v in class_indices.items()}
    all_true = []
    all_pred = []

    for batch_x, batch_y in val_ds:
        batch_pred = model.predict(batch_x, verbose=0)
        all_true.extend(np.argmax(batch_y, axis=1))
        all_pred.extend(np.argmax(batch_pred, axis=1))
        if len(all_true) >= val_ds.samples:
            break

    # Trim to exact sample count
    all_true = all_true[:val_ds.samples]
    all_pred = all_pred[:val_ds.samples]

    labels = [idx_to_class[i] for i in sorted(idx_to_class)]

    print("\nClassification Report:")
    print(classification_report(all_true, all_pred, target_names=labels))

    # Confusion matrix
    cm = confusion_matrix(all_true, all_pred)

    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=labels, yticklabels=labels,
                cbar_kws={'label': 'Count'})
    plt.title('Confusion Matrix - Final Model')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(MODEL_DIR / "confusion_matrix_final.png", dpi=150)
    print("[OK] Confusion matrix saved")

    # Overall accuracy
    accuracy = np.mean(np.array(all_true) == np.array(all_pred))
    print(f"\nOverall Accuracy: {accuracy*100:.2f}%")


def plot_training(h1, h2):
    """Plot training and validation curves"""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    acc1 = h1.history.get("accuracy", [])
    acc2 = h2.history.get("accuracy", [])
    val_acc1 = h1.history.get("val_accuracy", [])
    val_acc2 = h2.history.get("val_accuracy", [])

    combined_acc = acc1 + acc2
    combined_val_acc = val_acc1 + val_acc2
    split = len(acc1)

    axes[0].plot(combined_acc, label="Train accuracy", linewidth=2)
    axes[0].plot(combined_val_acc, label="Val accuracy", linewidth=2)
    axes[0].axvline(split, color="red", linestyle="--", label="Fine-tune start")
    axes[0].set_title("Model Accuracy", fontsize=12, fontweight='bold')
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Accuracy")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    loss1 = h1.history.get("loss", [])
    loss2 = h2.history.get("loss", [])
    combined_loss = loss1 + loss2

    axes[1].plot(combined_loss, label="Train loss", linewidth=2)
    axes[1].axvline(split, color="red", linestyle="--", label="Fine-tune start")
    axes[1].set_title("Model Loss", fontsize=12, fontweight='bold')
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Loss")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(MODEL_DIR / "training_curves.png", dpi=150)
    print("[OK] Training curves saved")
    plt.close()


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Train improved herbal leaf classification model"
    )
    parser.add_argument(
        "--data_dir",
        default="data/herbs",
        help="Root folder with one sub-dir per herb species"
    )
    args = parser.parse_args()

    try:
        train(args.data_dir)
        print("\n" + "=" * 70)
        print("[OK] TRAINING COMPLETED SUCCESSFULLY")
        print("=" * 70)
    except Exception as e:
        print(f"\n[FAIL] Training failed: {e}")
        raise
