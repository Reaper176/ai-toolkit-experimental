# Masked Job Queue Preflight Design

## Problem

Saved jobs that use immutable dataset preset masks contain server-resolved `folder_path` and `mask_path` values. Queue preflight currently applies the save-request external-path rejection to that persisted configuration, so a valid masked job fails with HTTP 400 before it can enter the queue.

## Trust Boundary

Fresh save requests remain untrusted. A browser may not choose `folder_path`, `mask_path`, or another managed auxiliary path for a dataset preset.

Queue and worker preflight treat persisted paths only as disposable cached values. Preflight verifies the referenced preset version and immutable manifest, derives the media and mask directories from the verified database-owned `manifest_path`, and overwrites the persisted paths. It never authorizes a path merely because it was stored in the job JSON.

## Behavior

Masked and maskless preset jobs both pass preflight when their immutable versions verify successfully. Masked versions receive the verified sibling `masks` directory; maskless versions receive `mask_path: null`. Tampered snapshots or references continue to block queueing with the existing preset/version integrity response.

## Testing

Add regressions that:

- save a masked preset job and successfully pass the same persisted configuration through queue preflight;
- prove arbitrary persisted preset paths are ignored and replaced by verified paths;
- prove fresh save requests containing external preset paths remain rejected; and
- exercise the start orchestration path so successful preflight reaches queue mutation while integrity failures do not.

Run the dataset preset suite and production build. After deployment/restart, retry `spade-3`; no direct database edits are part of the fix.

## Scope

This change does not relax live-dataset path validation, bypass immutable snapshot verification, alter queue ordering, or automatically queue existing jobs during deployment.
