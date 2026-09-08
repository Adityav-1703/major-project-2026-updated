# -*- coding: utf-8 -*-
"""
Quick Model Training - Uses available data to train improved model
Minimal dataset mode for demonstration
"""

import os
import json
import numpy as np
from pathlib import Path
from datetime import datetime

import tensorflow as tf
from tensorflow.keras import layers, Model, callbacks
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array
from tensorflow.keras.optimizers import Adam

import matplotlib.pyplot as plt
import seaborn as sns

# ─── Configuration ─────────────────────────────────────────────────────────────

IMG_SIZE = (224, 224)
BATCH_SIZE = 16  # Reduced for smaller datasets
EPOCHS_FROZEN = 15  # Reduced from 20
EPOCHS_FINE = 10  # Reduced from 15
LEARNING_RATE = 1e-3
FINE_LR = 1e-4
DROPOUT = 0.5
L2_REG = 1e-4

# Try multiple data locations
DATA_PATHS = [
    Path("data/herbs"),
    Path("../../Ayurvedic Leafs"),
]

MODEL_DIR = Path("saved_models")
MODEL_DIR.mkdir(exist_ok=True)

# Herb classes
HERB_CLASSES = ['Amla', 'Guava', 'Neem', 'Tulsi', 'Hibiscus']

# ─── Data Loading with Fallback ───────────────────────────────────────────────

def find_data_directory():
    """Find available data directory"""
    for path in DATA_PATHS:
        if path.exists():
            print(f"✓ Found data directory: {path}")
            return path

    # Create default if none found
    default = Path("data/herbs")
    default.mkdir(parents=True, exist_ok=True)
    return default


def create_minimal_dataset(data_dir):
    """Create minimal dataset for training from available images"""
    print(f"\nChecking for images in {data_dir}...")

    if not data_dir.exists():
        print(f"⚠ Creating directory: {data_dir}")
        data_dir.mkdir(parents=True, exist_ok=True)

    # Count existing images
    total_images = 0
    for herb_class in HERB_CLASSES:
        class_dir = data_dir / herb_class
        if class_dir.exists():
            images = list(class_dir.glob("*.*"))
            image_count = len([img for img in images if img.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']])
            if image_count > 0:
                total_images += image_count
                print(f"  ✓ {herb_class}: {image_count} images")
        else:
            print(f"  ⚠ {herb_class}: no images")

    return total_images > 0


def build_augmentation():
    """Data augmentation"""
    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=45,
        width_shift_range=0.25,
        height_shift_range=0.25,
        shear_range=0.2,
        zoom_range=0.3,
        horizontal_flip=True,
        brightness_range=[0.7, 1.3],
        channel_shift_range=20.0,
        fill_mode="reflect",
        validation_split=0.2,
    )

    val_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        validation_split=0.2
    )

    return train_gen, val_gen


def load_datasets(train_gen, val_gen, data_dir):
    """Load training and validation datasets"""
    try:
        train_ds = train_gen.flow_from_directory(
            data_dir,
            target_size=IMG_SIZE,
            batch_size=BATCH_SIZE,
            class_mode="categorical",
            subset="training",
            shuffle=True,
            seed=42,
        )

        val_ds = val_gen.flow_from_directory(
            data_dir,
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
        raise


def build_model(num_classes):
    """Build improved MobileNetV2 model"""
    base = MobileNetV2(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE, 3),
    )
    base.trainable = False

    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = base(inputs, training=False)

    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)

    x = layers.Dense(256, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(L2_REG))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(DROPOUT)(x)

    x = layers.Dense(128, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(L2_REG))(x)
    x = layers.Dropout(DROPOUT * 0.8)(x)

    output = layers.Dense(num_classes, activation="softmax")(x)

    model = Model(inputs=inputs, outputs=output, name="herbal_auth_improved")
    return model, base


def compile_model(model, learning_rate):
    """Compile model"""
    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def get_callbacks(phase):
    """Training callbacks"""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return [
        callbacks.ModelCheckpoint(
            MODEL_DIR / f"herbal_auth_improved_{phase}_{ts}.h5",
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=3,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-7,
            verbose=1,
        ),
    ]


def train(data_dir=None):
    """Main training function"""
    if data_dir:
        data_dir = Path(data_dir)
    else:
        data_dir = find_data_directory()

    print("=" * 70)
    print("IMPROVED HERBAL LEAF CNN - QUICK TRAINING")
    print("=" * 70)

    # Check if we have data
    has_data = create_minimal_dataset(data_dir)

    if not has_data:
        print("\n⚠ No training data found!")
        print(f"Expected structure:")
        print(f"  {data_dir}/")
        print(f"  ├── Amla/")
        print(f"  ├── Guava/")
        print(f"  ├── Neem/")
        print(f"  ├── Tulsi/")
        print(f"  └── Hibiscus/")
        print("\nTo get data:")
        print("  python prepare_dataset.py")
        return None

    # Load data
    print("\nLoading datasets...")
    train_gen, val_gen = build_augmentation()
    train_ds, val_ds = load_datasets(train_gen, val_gen, data_dir)

    num_classes = len(train_ds.class_indices)
    print(f"\n✓ Found {num_classes} herb classes:")
    print(f"  {list(train_ds.class_indices.keys())}")

    # Save class mapping
    with open(MODEL_DIR / "class_indices.json", "w") as f:
        json.dump(train_ds.class_indices, f, indent=2)

    with open(MODEL_DIR / "class_labels.txt", "w") as f:
        for class_name in sorted(train_ds.class_indices.keys()):
            f.write(f"{class_name}\n")

    print(f"\nDataset stats:")
    print(f"  Training samples: {train_ds.samples}")
    print(f"  Validation samples: {val_ds.samples}")

    # Build model
    print("\nBuilding model...")
    model, base = build_model(num_classes)
    model = compile_model(model, LEARNING_RATE)
    print(f"✓ Model built with {model.count_params():,} parameters")

    # Phase 1
    print("\n" + "=" * 70)
    print(f"PHASE 1: Training head (base frozen)")
    print(f"Epochs: {EPOCHS_FROZEN} | Batch size: {BATCH_SIZE}")
    print("=" * 70)

    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FROZEN,
        callbacks=get_callbacks("phase1"),
        verbose=1,
    )

    # Phase 2
    print("\n" + "=" * 70)
    print(f"PHASE 2: Fine-tuning (top 30 layers unfrozen)")
    print(f"Epochs: {EPOCHS_FINE}")
    print("=" * 70)

    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    model = compile_model(model, FINE_LR)

    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FINE,
        callbacks=get_callbacks("phase2"),
        verbose=1,
    )

    # Save final model
    final_path = MODEL_DIR / "herbal_auth_improved_final.h5"
    model.save(str(final_path))
    print(f"\n✓ Model saved: {final_path}")

    # Plot results
    plot_training(history1, history2)

    print("\n" + "=" * 70)
    print("✓ TRAINING COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print(f"\nNext: python test_accuracy.py")

    return model


def plot_training(h1, h2):
    """Plot training curves"""
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
    print("✓ Training curves saved")
    plt.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default=None, help="Data directory")
    args = parser.parse_args()

    try:
        train(args.data_dir)
    except Exception as e:
        print(f"\n✗ Training failed: {e}")
        raise
