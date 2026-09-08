# -*- coding: utf-8 -*-
"""Extract the 5 AyurAuth herb classes from archive.zip into data/herbs."""

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

TARGET_CLASSES = ["Amla", "Guava", "Neem", "Tulsi", "Hibiscus"]
ZIP_PREFIX = "Indian Medicinal Leaves Image Datasets/Medicinal Leaf dataset/"
DEFAULT_ZIP = Path(__file__).resolve().parent / "archive.zip"
OUTPUT_DIR = Path(__file__).resolve().parent / "data" / "herbs"


def extract_classes(zip_path: Path, output_dir: Path, classes: list[str], clean: bool = True) -> dict[str, int]:
    if not zip_path.is_file():
        raise FileNotFoundError(f"Archive not found: {zip_path}")

    if clean and output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    counts: dict[str, int] = {c: 0 for c in classes}
    class_set = set(classes)

    print(f"Extracting from {zip_path.name} -> {output_dir}")
    with zipfile.ZipFile(zip_path) as archive:
        for name in archive.namelist():
            if not name.startswith(ZIP_PREFIX) or name.endswith("/"):
                continue
            rel = name[len(ZIP_PREFIX) :]
            parts = rel.split("/")
            if len(parts) != 2:
                continue
            class_name, filename = parts
            if class_name not in class_set:
                continue

            dest = output_dir / class_name / filename
            dest.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(name) as src, open(dest, "wb") as dst:
                shutil.copyfileobj(src, dst)
            counts[class_name] += 1

    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract herb classes from archive.zip")
    parser.add_argument("--zip", type=Path, default=DEFAULT_ZIP, help="Path to archive.zip")
    parser.add_argument("--out", type=Path, default=OUTPUT_DIR, help="Output data/herbs directory")
    parser.add_argument("--no-clean", action="store_true", help="Do not delete existing output folder")
    args = parser.parse_args()

    counts = extract_classes(args.zip, args.out, TARGET_CLASSES, clean=not args.no_clean)

    print("\nExtracted images:")
    print("-" * 40)
    total = 0
    for cls in TARGET_CLASSES:
        n = counts.get(cls, 0)
        total += n
        print(f"  {cls:12} {n:4d}")
    print("-" * 40)
    print(f"  {'Total':12} {total:4d}")
    print(f"\nNext: python improved_cnn_model.py --data_dir {args.out}")


if __name__ == "__main__":
    main()
