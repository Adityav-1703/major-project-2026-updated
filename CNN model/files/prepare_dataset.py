# -*- coding: utf-8 -*-
"""
Dataset Preparation Script
Organizes Kaggle Indian Medicinal Leaves Dataset into class folders
"""

import os
import shutil
import json
from pathlib import Path
from collections import defaultdict

# ─── Configuration ─────────────────────────────────────────────────────────────

# Target classes (5 main herbs)
TARGET_CLASSES = ['Amla', 'Guava', 'Neem', 'Tulsi', 'Hibiscus']

# Source and output directories
SOURCE_DIR = Path("dataset/Indian Medicinal Leaves Image Datasets/Medicinal Leaf dataset")
ALT_SOURCE = Path("dataset/selected")  # Colab / mega_project_5 layout
OUTPUT_DIR = Path("data/herbs")

# ─── Dataset Organization ────────────────────────────────────────────────────────

def verify_kaggle_setup():
    """Check if Kaggle API is configured"""
    kaggle_config = Path.home() / ".kaggle" / "kaggle.json"

    if not kaggle_config.exists():
        print("⚠ Kaggle API not configured!")
        print("\nTo set up Kaggle API:")
        print("1. Go to https://www.kaggle.com/settings/account")
        print("2. Click 'Create New API Token'")
        print("3. Place kaggle.json in ~/.kaggle/ directory")
        print("4. Run: chmod 600 ~/.kaggle/kaggle.json")
        return False

    print("✓ Kaggle API configured")
    return True


def download_kaggle_dataset():
    """Download dataset from Kaggle"""
    try:
        import kaggle

        print("\nDownloading Indian Medicinal Leaves Dataset from Kaggle...")
        print("Dataset: aryashah2k/indian-medicinal-leaves-dataset")

        kaggle.api.dataset_download_files(
            'aryashah2k/indian-medicinal-leaves-dataset',
            path='dataset/',
            unzip=True
        )

        print("✓ Dataset downloaded successfully")
        return True

    except Exception as e:
        print(f"✗ Failed to download dataset: {e}")
        print("\nAlternative: Download manually from Kaggle website")
        return False


def resolve_source_dir() -> Path | None:
    if SOURCE_DIR.exists():
        return SOURCE_DIR
    if ALT_SOURCE.exists():
        print(f"Using alternate source: {ALT_SOURCE}")
        return ALT_SOURCE
    return None


def organize_dataset():
    """Organize dataset into class folders"""
    source_root = resolve_source_dir()
    if source_root is None:
        print(f"⚠ Source directory not found: {SOURCE_DIR}")
        return False

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\nOrganizing dataset from {source_root}")
    print(f"Output directory: {OUTPUT_DIR}\n")

    # Map source folders to target classes
    source_classes = os.listdir(source_root)
    print(f"Found {len(source_classes)} classes in source directory")

    for target_class in TARGET_CLASSES:
        # Find matching source folder (case-insensitive)
        source_folder = None
        for src_class in source_classes:
            if src_class.lower() == target_class.lower():
                source_folder = src_class
                break

        if not source_folder:
            print(f"⚠ Source folder for {target_class} not found")
            continue

        source_path = source_root / source_folder
        target_path = OUTPUT_DIR / target_class

        # Remove existing target directory
        if target_path.exists():
            shutil.rmtree(target_path)

        # Copy class folder
        try:
            shutil.copytree(source_path, target_path)
            image_count = len(list(target_path.glob("*.*")))
            print(f"✓ {target_class:15} : {image_count:4d} images")
        except Exception as e:
            print(f"✗ Error copying {target_class}: {e}")

    print("\n" + "=" * 70)
    print_dataset_summary()


def print_dataset_summary():
    """Print dataset summary"""
    if not OUTPUT_DIR.exists():
        print("⚠ Dataset directory not found!")
        return

    class_counts = {}
    total_images = 0

    print("\nDataset Summary:")
    print("-" * 70)

    for class_folder in sorted(OUTPUT_DIR.iterdir()):
        if not class_folder.is_dir():
            continue

        images = list(class_folder.glob("*.*"))
        image_count = len([img for img in images
                          if img.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']])

        if image_count > 0:
            class_counts[class_folder.name] = image_count
            total_images += image_count
            print(f"{class_folder.name:15} : {image_count:5d} images")

    print("-" * 70)
    print(f"{'Total':15} : {total_images:5d} images")
    print(f"{'Classes':15} : {len(class_counts):5d}")

    avg_per_class = total_images / len(class_counts) if class_counts else 0
    print(f"{'Avg per class':15} : {avg_per_class:5.0f} images")

    # Save summary
    summary = {
        "total_images": total_images,
        "num_classes": len(class_counts),
        "class_distribution": class_counts,
        "training_split": 0.8,
        "validation_split": 0.2,
    }

    with open(OUTPUT_DIR.parent / "dataset_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\n✓ Dataset summary saved")


def validate_dataset():
    """Validate dataset structure"""
    print("\n" + "=" * 70)
    print("VALIDATING DATASET")
    print("=" * 70)

    if not OUTPUT_DIR.exists():
        print("✗ Dataset directory not found!")
        return False

    required_classes = set(TARGET_CLASSES)
    found_classes = set()
    all_valid = True

    for class_folder in OUTPUT_DIR.iterdir():
        if not class_folder.is_dir():
            continue

        class_name = class_folder.name
        found_classes.add(class_name)

        images = [f for f in class_folder.glob("*.*")
                  if f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']]

        if len(images) == 0:
            print(f"✗ {class_name}: No images found")
            all_valid = False
        elif len(images) < 50:
            print(f"⚠ {class_name}: Only {len(images)} images (recommend 100+)")
        else:
            print(f"✓ {class_name}: {len(images)} images OK")

    missing_classes = required_classes - found_classes
    if missing_classes:
        print(f"\n✗ Missing classes: {missing_classes}")
        all_valid = False

    if all_valid:
        print("\n✓ Dataset validation passed!")
    else:
        print("\n⚠ Dataset validation issues found")

    return all_valid


# ─── Entry Point ───────────────────────────────────────────────────────────────

ARCHIVE_ZIP = Path(__file__).resolve().parent / "archive.zip"


if __name__ == "__main__":
    print("=" * 70)
    print("DATASET PREPARATION SCRIPT")
    print("=" * 70)

    if ARCHIVE_ZIP.is_file() and not OUTPUT_DIR.exists():
        print(f"\nFound local archive: {ARCHIVE_ZIP.name}")
        print("Extracting 5 herb classes (faster than full 9GB unzip)...")
        from extract_archive import extract_classes

        extract_classes(ARCHIVE_ZIP, OUTPUT_DIR, TARGET_CLASSES, clean=True)
        validate_dataset()
        print("\n=" * 70)
        print("Next step: python improved_cnn_model.py --data_dir data/herbs")
        print("=" * 70)
        raise SystemExit(0)

    # Step 1: Check Kaggle setup
    kaggle_ready = verify_kaggle_setup()

    # Step 2: Download if needed
    if resolve_source_dir() is None:
        if kaggle_ready:
            if not download_kaggle_dataset():
                print("\n⚠ Please download dataset manually and extract to: dataset/")
        else:
            print("\n⚠ Please download dataset from Kaggle manually:")
            print("   URL: https://www.kaggle.com/datasets/aryashah2k/indian-medicinal-leaves-dataset")
            print("   Extract to: dataset/")

    # Step 3: Organize dataset
    if resolve_source_dir() is not None:
        organize_dataset()
    else:
        print(f"\n⚠ Source directory still not found: {SOURCE_DIR}")
        print("Please download and extract the dataset first")

    # Step 4: Validate
    validate_dataset()

    print("\n" + "=" * 70)
    print("Next step: python improved_cnn_model.py --data_dir data/herbs")
    print("=" * 70)
