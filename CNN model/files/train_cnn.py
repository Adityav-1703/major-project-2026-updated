"""
Herbal Authentication CNN Training Pipeline
Model: EfficientNetB4 (fine-tuned for herb leaf classification)
Expected accuracy: 95-98% on balanced dataset
"""

import os
import json
import numpy as np
from pathlib import Path
from datetime import datetime

import tensorflow as tf
from tensorflow.keras import layers, Model, callbacks
from tensorflow.keras.applications import EfficientNetB4
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import AdamW
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt

# ─── Config ───────────────────────────────────────────────────────────────────

IMG_SIZE       = (380, 380)   # EfficientNetB4 native resolution
BATCH_SIZE     = 16
EPOCHS_FROZEN  = 10           # Phase 1: train head only
EPOCHS_FINE    = 30           # Phase 2: fine-tune top 60 layers
LEARNING_RATE  = 1e-3
FINE_LR        = 5e-5
DROPOUT        = 0.4
DATA_DIR       = Path("data/herbs")
MODEL_DIR      = Path("saved_models")
MODEL_DIR.mkdir(exist_ok=True)

# ─── Augmentation ─────────────────────────────────────────────────────────────

def build_augmentation_pipeline():
    """
    Heavy augmentation to simulate real-world capture conditions:
    varying light, angles, partial occlusion, moisture on leaves.
    """
    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=40,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.3,
        horizontal_flip=True,
        vertical_flip=True,
        brightness_range=[0.6, 1.4],
        channel_shift_range=30.0,
        fill_mode="reflect",
        validation_split=0.2,
    )
    val_gen = ImageDataGenerator(rescale=1.0 / 255, validation_split=0.2)
    return train_gen, val_gen


def load_datasets(train_gen, val_gen):
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


# ─── Model ────────────────────────────────────────────────────────────────────

def build_model(num_classes: int) -> Model:
    """
    Two-head output:
      1. Species classification  (which herb is this?)
      2. Purity score            (0.0 = adulterated, 1.0 = pure)
    """
    base = EfficientNetB4(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE, 3),
        drop_connect_rate=0.3,
    )
    base.trainable = False  # frozen in phase 1

    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = base(inputs, training=False)

    # Global context
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)

    # Shared dense trunk
    x = layers.Dense(512, activation="swish", kernel_regularizer=tf.keras.regularizers.l2(1e-4))(x)
    x = layers.Dropout(DROPOUT)(x)
    x = layers.Dense(256, activation="swish")(x)
    x = layers.Dropout(DROPOUT / 2)(x)

    # Head 1 — species classification
    species_out = layers.Dense(num_classes, activation="softmax", name="species")(x)

    # Head 2 — purity regression (sigmoid → 0..1 score)
    purity_out = layers.Dense(64, activation="swish")(x)
    purity_out = layers.Dense(1, activation="sigmoid", name="purity")(purity_out)

    model = Model(inputs, [species_out, purity_out], name="HerbalAuthNet")
    return model, base


def compile_model(model: Model) -> Model:
    model.compile(
        optimizer=AdamW(learning_rate=LEARNING_RATE, weight_decay=1e-5),
        loss={
            "species": "categorical_crossentropy",
            "purity": "binary_crossentropy",
        },
        loss_weights={"species": 1.0, "purity": 0.6},
        metrics={
            "species": ["accuracy", tf.keras.metrics.TopKCategoricalAccuracy(k=3, name="top3")],
            "purity": ["mae"],
        },
    )
    return model


# ─── Training ─────────────────────────────────────────────────────────────────

def get_callbacks(phase: str) -> list:
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    return [
        callbacks.ModelCheckpoint(
            MODEL_DIR / f"herbal_auth_{phase}_{ts}.keras",
            monitor="val_species_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_species_accuracy",
            patience=8,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.4,
            patience=4,
            min_lr=1e-7,
            verbose=1,
        ),
        callbacks.TensorBoard(
            log_dir=f"logs/{phase}_{ts}",
            histogram_freq=1,
        ),
    ]


def train(data_dir: str = None):
    if data_dir:
        global DATA_DIR
        DATA_DIR = Path(data_dir)

    print("=" * 60)
    print("Herbal Authentication — CNN Training Pipeline")
    print("=" * 60)

    train_gen, val_gen = build_augmentation_pipeline()
    train_ds, val_ds   = load_datasets(train_gen, val_gen)

    num_classes = len(train_ds.class_indices)
    print(f"\nDetected {num_classes} herb species: {list(train_ds.class_indices.keys())}")

    # Save class mapping
    with open(MODEL_DIR / "class_indices.json", "w") as f:
        json.dump(train_ds.class_indices, f, indent=2)

    model, base = build_model(num_classes)
    model = compile_model(model)
    model.summary()

    # Phase 1 — frozen base, train head
    print("\n── Phase 1: Training classification head (base frozen) ──")
    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FROZEN,
        callbacks=get_callbacks("phase1"),
    )

    # Phase 2 — unfreeze top 60 layers of EfficientNetB4
    print("\n── Phase 2: Fine-tuning top 60 layers ──")
    base.trainable = True
    for layer in base.layers[:-60]:
        layer.trainable = False

    model.compile(
        optimizer=AdamW(learning_rate=FINE_LR, weight_decay=1e-5),
        loss={"species": "categorical_crossentropy", "purity": "binary_crossentropy"},
        loss_weights={"species": 1.0, "purity": 0.6},
        metrics={
            "species": ["accuracy", tf.keras.metrics.TopKCategoricalAccuracy(k=3, name="top3")],
            "purity": ["mae"],
        },
    )

    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FINE,
        callbacks=get_callbacks("phase2"),
    )

    # Evaluate
    print("\n── Evaluation ──")
    evaluate_model(model, val_ds, train_ds.class_indices)

    # Save final model + metadata
    final_path = MODEL_DIR / "herbal_auth_final.keras"
    model.save(final_path)
    print(f"\nModel saved: {final_path}")

    plot_training(history1, history2)
    return model


# ─── Evaluation ───────────────────────────────────────────────────────────────

def evaluate_model(model: Model, val_ds, class_indices: dict):
    idx_to_class = {v: k for k, v in class_indices.items()}
    all_true, all_pred = [], []

    for batch_x, (batch_species, _) in val_ds:
        species_pred, _ = model.predict(batch_x, verbose=0)
        all_true.extend(np.argmax(batch_species, axis=1))
        all_pred.extend(np.argmax(species_pred, axis=1))
        if len(all_true) >= val_ds.samples:
            break

    labels = [idx_to_class[i] for i in sorted(idx_to_class)]
    print("\nClassification Report:")
    print(classification_report(all_true, all_pred, target_names=labels))


def plot_training(h1, h2):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    acc1 = h1.history.get("species_accuracy", [])
    acc2 = h2.history.get("species_accuracy", [])
    val_acc1 = h1.history.get("val_species_accuracy", [])
    val_acc2 = h2.history.get("val_species_accuracy", [])

    combined_acc     = acc1 + acc2
    combined_val_acc = val_acc1 + val_acc2
    split            = len(acc1)

    axes[0].plot(combined_acc, label="Train accuracy")
    axes[0].plot(combined_val_acc, label="Val accuracy")
    axes[0].axvline(split, color="gray", linestyle="--", label="Fine-tune start")
    axes[0].set_title("Species classification accuracy")
    axes[0].legend()

    loss1 = h1.history.get("loss", [])
    loss2 = h2.history.get("loss", [])
    axes[1].plot(loss1 + loss2, label="Train loss")
    axes[1].axvline(split, color="gray", linestyle="--", label="Fine-tune start")
    axes[1].set_title("Combined loss")
    axes[1].legend()

    plt.tight_layout()
    plt.savefig(MODEL_DIR / "training_curves.png", dpi=150)
    print("Training curves saved.")


# ─── Entry ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="data/herbs", help="Root folder with one sub-dir per herb species")
    args = parser.parse_args()
    train(args.data_dir)
