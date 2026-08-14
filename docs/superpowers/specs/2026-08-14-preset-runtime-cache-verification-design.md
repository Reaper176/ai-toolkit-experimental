# Preset Runtime Cache Verification Design

## Problem

Training from an immutable dataset preset writes toolkit-managed runtime caches beside the frozen media. The next queue preflight recursively verifies the snapshot and currently classifies those generated entries as unexpected tampering. `spade-1` version 6 now contains `.aitk_size.json`, `_latent_cache`, and `_t_e_cache`, so `spade-4` is rejected even though verification reports no changed declared media, captions, masks, or manifest.

## Decision

Full snapshot verification will tolerate only these toolkit-managed entries at the root of the frozen `media` directory:

- `.aitk_size.json` as a regular file
- `_latent_cache` as a directory tree
- `_t_e_cache` as a directory tree

These entries will remain in place so subsequent jobs can reuse image-size metadata, latents, and text embeddings. They are runtime derivatives and are not added to the immutable manifest or `total_bytes` calculation.

All manifest-declared media, captions, and masks remain subject to the existing presence, size, and SHA-256 checks. The manifest checksum remains authoritative. Any other undeclared entry in `media` or `masks` remains an `unexpected` verification mismatch.

The exception applies only to exact root-level names with the expected file type. A root-level cache name with the wrong type remains unexpected. A similarly named file or directory elsewhere remains unexpected. Symlinked cache entries are not accepted.

## Implementation Boundary

The snapshot verification service will own a small predicate that recognizes allowed runtime cache roots while walking the media tree. When an allowed cache directory is encountered, verification will skip descending into it. This keeps queue preflight bounded by the immutable snapshot contents rather than potentially enumerating large cache trees.

No Python cache behavior, loader configuration, manifest schema, snapshot staging, archived preview, or queue ordering behavior changes in this fix.

## Recovery and Runtime Validation

The existing version 6 caches will not be deleted. After deploying the verifier change, `spade-1` version 6 must pass full verification and `spade-4` must successfully enter the queue. The worker must claim the job, demonstrating that the live UI is running the corrected build.

## Tests

Regression coverage will prove:

1. Exact root-level `.aitk_size.json`, `_latent_cache`, and `_t_e_cache` entries do not produce unexpected mismatches.
2. Cache directories are not recursively enumerated by verification.
3. Wrong-type cache entries, symlinks, near-match names, nested cache names, and arbitrary undeclared files remain rejected.
4. Declared media and mask tampering continues to fail size/SHA verification.

