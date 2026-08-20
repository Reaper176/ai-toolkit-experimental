#!/usr/bin/env python3
"""Validate the canonical training-book manifest."""

from pathlib import Path

from training_book.manifest import load_book_manifest, validate_book_manifest


FULL_ARCHITECTURES = (
    "anima", "flux", "flux_kontext", "flex1", "flex2", "chroma", "zeta_chroma",
    "wan21:1b", "wan21_i2v:14b480p", "wan21_i2v:14b", "wan21:14b",
    "wan22_14b:t2v", "wan22_14b_i2v", "wan22_5b", "lumina2", "qwen_image",
    "qwen_image:2512", "qwen_image_edit", "qwen_image_edit_plus",
    "qwen_image_edit_plus:2511", "hidream", "hidream_e1", "sdxl", "sd15",
    "omnigen2", "flux2", "zimage:turbo", "zimage", "zimage:deturbo",
    "minimax_h3", "ltx2", "ltx2.3", "ltx2.5", "flux2_klein_4b", "ernie_image",
    "flux2_klein_9b", "ace_step_15_xl", "ace_step_15", "nucleus_image",
    "hidream_o1", "zimage_l2p", "ideogram4", "prx_pixel", "krea2",
    "krea2:turbo", "krea2:o_edit", "krea2:o_edit_turbo", "mageflow",
    "mageflow_edit", "boogu_image", "boogu_image_edit",
)


def main() -> None:
    repository_root = Path(__file__).resolve().parents[1]
    manifest = load_book_manifest(repository_root / "docs/book/book-manifest.json")
    validate_book_manifest(
        manifest, expected_full_architectures=FULL_ARCHITECTURES
    )


if __name__ == "__main__":
    main()
