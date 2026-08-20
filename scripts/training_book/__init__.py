"""Validation support for the repository training book."""

from .manifest import BookManifest, BookPage, load_book_manifest, validate_book_manifest

__all__ = (
    "BookManifest",
    "BookPage",
    "load_book_manifest",
    "validate_book_manifest",
)
