# -*- coding: utf-8 -*-
"""Copy trained model + labels into the website ml-service folder."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_SOURCE = SCRIPT_DIR / "saved_models" / "herbal_auth_improved_final.h5"
FALLBACK_SOURCE = SCRIPT_DIR / "leaf_model.h5"
ML_SERVICE_MODELS = (
    SCRIPT_DIR.parent.parent
    / "Website frontend Mega Project"
    / "ayurvedic-blockchain-frontend"
    / "ml-service"
    / "models"
)


def deploy(source: Path, dest_dir: Path, dest_name: str | None = None) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    target_name = dest_name or source.name
    dest_model = dest_dir / target_name
    shutil.copy2(source, dest_model)
    print(f"Copied model -> {dest_model}")

    labels_src = source.parent / "class_labels.txt"
    if not labels_src.is_file():
        labels_src = SCRIPT_DIR / "saved_models" / "class_labels.txt"

    if labels_src.is_file():
        shutil.copy2(labels_src, dest_dir / "class_labels.txt")
        print(f"Copied labels -> {dest_dir / 'class_labels.txt'}")

    indices_src = source.parent / "class_indices.json"
    if indices_src.is_file():
        shutil.copy2(indices_src, dest_dir / "class_indices.json")
        print(f"Copied class_indices.json")

    return dest_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy CNN model to Flask ml-service")
    parser.add_argument("--source", type=Path, help="Path to .h5 model file")
    parser.add_argument(
        "--dest-dir",
        type=Path,
        default=ML_SERVICE_MODELS,
        help="ml-service/models directory",
    )
    parser.add_argument(
        "--as",
        dest="dest_name",
        default="herbal_auth_improved_final.h5",
        help="Filename in ml-service (improved model uses herbal_auth_improved_final.h5)",
    )
    args = parser.parse_args()

    source = args.source
    if source is None:
        source = DEFAULT_SOURCE if DEFAULT_SOURCE.is_file() else FALLBACK_SOURCE

    if not source.is_file():
        raise FileNotFoundError(
            f"No model at {source}. Train first:\n"
            "  python prepare_dataset.py\n"
            "  python improved_cnn_model.py --data_dir data/herbs\n"
            "  python deploy_model.py"
        )

    deploy(source, args.dest_dir, args.dest_name)
    print("\nRestart ML service: cd ayurvedic-blockchain-frontend && npm run ml")


if __name__ == "__main__":
    main()
