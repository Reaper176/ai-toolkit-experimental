# Versioned Dataset Presets Design

**Date:** 2026-08-10

## Goal

Add reusable dataset presets that let a user select an exact subset of a
dataset, freeze the selected media and captions, save the dataset-loader
settings, and later train or retrain from the same immutable inputs. A job may
combine multiple dataset presets and must retain a queryable record of the
exact preset versions and resolved settings it used.

For example, a user can open `my-images`, enable 12 of its 50 images, save the
selection as `portrait-closeups`, and train from `portrait-closeups` version 1.
Editing the selection later creates version 2. The original job continues to
reference version 1 and remains reproducible even if files in `my-images` are
subsequently edited or deleted.

## Terminology and Invariants

- A **source dataset** is an existing live directory under the configured
  datasets root.
- A **dataset preset** is a stable, user-named object such as
  `portrait-closeups`.
- A **dataset preset version** is an immutable snapshot of selected media,
  captions, and loader settings.
- An **enabled image** is included in the draft preset version currently being
  created or edited. Enabled state is scoped to that preset draft; it is not a
  global flag on the source file.
- A **job usage** records one job dataset block's exact preset version,
  manifest checksum, and final resolved loader settings.

Published preset versions never change in place. Renaming or archiving a
preset does not alter existing versions or jobs. A source-file edit, rename,
or deletion cannot change a published version. Existing live-folder datasets
remain supported.

## Selected Approach

The first release uses managed immutable snapshot directories. Each published
version contains private copies of its selected media and captions plus a
human-readable manifest. SQLite stores searchable metadata and references.

This deliberately favors predictable behavior and simple recovery over disk
deduplication. A content-addressed object store could reduce duplication when
presets overlap, but it would introduce reference counting and garbage
collection without changing the user-facing behavior. Manifest-only presets
were rejected because editing or deleting source files would make them
irreproducible.

## User Experience

### Selecting images

The source dataset page gains a selection mode. In this mode:

- Each virtualized media card has an enabled/disabled checkbox overlay.
- The toolbar shows the enabled and total counts, such as `12 of 50 enabled`.
- `Select all`, `Select none`, and `Invert selection` operate on the complete
  dataset, not only the currently rendered virtualized cards.
- The user can save a non-empty selection as a new dataset preset.
- Leaving selection mode without saving asks before discarding a dirty draft.
- Selecting media never moves, renames, edits, or deletes source files.

Saving opens an accessible dialog containing the preset name, an optional
version note, the caption extension, and the supported dataset-loader
settings. Names are trimmed, case-insensitively unique, and limited to 80
UTF-16 code units, matching the existing training-preset naming convention.

### Viewing and editing presets

Opening a preset displays its name and explicit version, for example
`portrait-closeups · v2`. Earlier versions remain viewable. Editing begins
from a chosen version and creates a draft:

- Retained items are read from the prior immutable snapshot.
- Newly enabled items are read from the live source dataset.
- Disabled items are omitted only from the new version.
- Items retained from the prior version but missing from the live source are
  identified in the UI and may remain in the new version.

Saving the draft publishes the next monotonically increasing immutable
version. It never replaces an existing version.

### Using presets in training jobs

Each existing training dataset block can use either a live dataset folder or a
saved dataset preset version. Selecting a preset version fills the block with
its saved loader settings. The user may override those values for that job.
The job stores the final resolved settings, so later preset edits cannot
silently alter training behavior.

The existing ability to add multiple dataset blocks remains. A job may mix
multiple preset versions, or preset-backed and live-folder datasets, with
independent settings.

The job details page includes a **Dataset provenance** section for every
preset-backed block. It shows the preset name, version, source dataset, media
count, version creation time, manifest checksum, and resolved loader settings.
This section reads from dedicated usage records rather than parsing the job's
configuration JSON.

The existing general training presets remain separate. They continue to omit
datasets and job-specific values; dataset presets exclusively own reusable
dataset content and loader configuration.

## Snapshot Storage

Preset data lives at `<DATA_ROOT>/dataset_presets`, outside the user's live
dataset directories. `DATA_ROOT` is resolved through the existing server and
worker settings helpers and defaults to the repository's `data` directory. A
conceptual layout is:

```text
<dataset-preset-root>/
  <preset-id>/
    v1/
      manifest.json
      media/
        people/a.jpg
        people/a.txt
    v2/
      manifest.json
      media/
        people/a.jpg
        people/a.txt
        people/b.jpg
        people/b.txt
```

Relative source subdirectories are preserved below `media/`, preventing
basename collisions and keeping caption sidecars adjacent to their media.
Generated preset IDs, rather than user names, form storage paths. Renaming a
preset therefore does not move snapshot data or invalidate jobs.

Each version manifest uses a versioned schema and records:

- Manifest schema version
- Preset ID and preset version number
- Display name at publication time
- Source dataset name
- Creation timestamp and optional note
- Frozen dataset-loader settings
- Total media count and byte size
- Each selected media path relative to the source dataset
- The corresponding managed relative path
- Media byte size and SHA-256 checksum
- Caption extension, frozen caption text, byte size, and SHA-256 checksum
- An explicit missing-caption marker when no sidecar existed

The manifest checksum is the SHA-256 of a deterministic UTF-8 serialization
with stable key ordering. File entries are sorted by normalized relative path.
This makes the checksum reproducible and suitable for provenance comparisons.
The manifest itself is not treated as the sole database index.

Missing captions preserve the loader's saved `default_caption` behavior. An
empty caption file is distinct from a missing caption and is copied and
recorded as empty content.

## Persistence Model

Add these Prisma models to the existing SQLite database.

### `DatasetPreset`

- `id`: generated UUID primary key
- `name`: current display name
- `name_key`: trimmed lowercase name with a unique constraint
- `archived_at`: nullable archive timestamp
- `created_at` and `updated_at`

### `DatasetPresetVersion`

- `id`: generated UUID primary key
- `preset_id`: required relation to `DatasetPreset`
- `version`: positive integer
- `source_dataset`: source dataset name at publication time
- `manifest_path`: managed path relative to the preset storage root
- `manifest_sha256`: deterministic manifest checksum
- `loader_config`: frozen JSON object
- `note`: optional user note
- `media_count` and `total_bytes`
- `created_at`
- Unique constraint on `(preset_id, version)`

### `JobDatasetPresetUsage`

- `id`: generated UUID primary key
- `job_id`: required relation to `Job`, deleted with the job
- `preset_version_id`: required relation to `DatasetPresetVersion` with
  restrictive deletion
- `dataset_index`: zero-based index in the job process's datasets array
- `preset_name`: display name captured when the job was saved
- `preset_version`: version number captured when the job was saved
- `manifest_sha256`: checksum captured when the job was saved
- `resolved_loader_config`: final job-specific JSON settings
- Unique constraint on `(job_id, dataset_index)`

The denormalized name, version, and checksum keep the historical display
meaning clear while the relation enforces retention. Dataset preset usage rows
and the job configuration are written together in one database transaction on
job creation or update.

## Snapshot Publication Flow

The server, never the browser, owns snapshot publication:

1. Validate the request size, preset identity or name, source dataset,
   non-empty selected relative paths, caption extension, note, and loader
   settings.
2. Resolve the source directory below the configured dataset root and reject
   absolute paths, traversal, null bytes, duplicate normalized paths, and
   symbolic-link escapes.
3. Under a per-preset publication lock, allocate the next version number.
4. Create a temporary directory beneath the target preset directory so final
   publication can use a same-filesystem atomic rename.
5. For an edited version, copy retained files and captions from the prior
   snapshot. Copy newly enabled files and captions from the live source.
6. Preserve relative directory structure, calculate SHA-256 checksums while
   copying, and reject a file that changes during the copy.
7. Write and validate the deterministic manifest.
8. Atomically rename the temporary directory to its final `v<number>` path.
9. Insert the version metadata in SQLite.

The final directory is published before the database row. If the database
insert fails, the just-published unreferenced directory is removed. Startup
maintenance removes abandoned, age-bounded temporary directories and reports
final directories that lack database rows; it never automatically removes a
published version with a database record.

Concurrent creation attempts for one preset are serialized. The unique
database constraint remains the final defense against duplicate version
numbers. A conflicting request retries version allocation once and otherwise
returns a conflict response.

## Job Resolution and Training

The browser submits stable preset-version IDs for preset-backed dataset
blocks. The jobs API does not trust browser-provided paths or provenance.
During job creation or update, the server:

1. Loads every requested version. An archived preset may be resolved only when
   the job already has a usage row for that exact version; new jobs, cloned
   jobs, and newly changed dataset blocks must select an active preset.
2. Validates the stored manifest and its checksum.
3. Replaces the dataset block's live `folder_path` with the absolute managed
   `media/` directory.
4. Applies the preset's saved loader settings and then the explicit job
   overrides.
5. Stores internal provenance fields in the serialized job configuration and
   writes the corresponding `JobDatasetPresetUsage` rows in the same database
   transaction.

The Python `DatasetConfig` already ignores unrecognized keys. Internal
provenance keys may therefore remain in the JSON passed to the trainer without
changing existing loader behavior. A focused compatibility test locks in this
assumption.

Job queueing performs a fast preflight that confirms the database version,
manifest, managed media directory, and every manifest-listed file exist. The
worker repeats this preflight immediately before writing `.job_config.json`
and launching Python because a queued job may start much later. Preflight does
not rehash every media file, avoiding a full dataset read on every run. A
separate explicit integrity action performs full checksum verification when
needed.

Normal live-folder dataset blocks bypass preset resolution and preserve their
current behavior.

## Supported Loader Settings and Initial Scope

The preset dialog stores these primary dataset settings when the selected
trainer architecture supports them: `caption_ext`, `default_caption`,
`caption_dropout_rate`, `shuffle_tokens`, `num_repeats`, `resolution`,
`is_reg`, `network_weight`, `cache_latents_to_disk`, `flip_x`, `flip_y`,
`num_frames`, `shrink_video_to_frames`, `fps`, `auto_frame_count`, `do_i2v`,
`do_audio`, `audio_normalize`, `audio_preserve_pitch`, and automatic
`controls`. Unsupported keys are rejected rather than silently retained. The
manifest schema versions this allowlist so later additions do not alter an
existing version's meaning.

Exact snapshotting in the first release covers primary image, video, or audio
media and caption sidecars. A preset configuration that depends on an external
control, mask, unconditional, inpaint, or CLIP-image directory is rejected.
Those directories cannot be left live while claiming exact reproducibility.
Snapshotting matched auxiliary assets is a separate future feature.

## API Boundaries

Dedicated dataset-preset endpoints provide:

- List active presets with latest-version summaries
- List all versions for one preset
- Retrieve one version and its manifest
- Create a preset and its first version
- Publish a new version from an existing version plus draft changes
- Rename a preset
- Archive or restore a preset
- Permanently delete an eligible unreferenced version
- Run explicit full integrity verification

Requests and responses use IDs and relative paths. Absolute managed storage
paths are never accepted from or returned to the browser. Mutation endpoints
enforce conservative body-size limits, and snapshot publication streams files
rather than buffering media in memory.

Preset APIs are isolated from existing dataset APIs. If they are unavailable,
the dataset browser and live-folder training flow continue working; only
preset-specific controls report an error.

## Components and Responsibilities

### Pure helpers

A dependency-light module owns preset-name normalization, supported loader
setting validation, relative-path normalization, deterministic manifest
serialization, manifest-shape validation, and job-setting resolution. It has
no React or database dependencies.

### Snapshot service

A server-only service owns secure path resolution, publication locks, staging,
streamed copying and hashing, atomic publication, integrity verification, and
eligible deletion. File-system effects are kept behind a small interface so
failure paths can be tested with temporary directories.

### Persistence and route handlers

The persistence service owns metadata queries, version allocation, archive
rules, usage-reference checks, and transactional job usage writes. Route
handlers own request limits, authentication conventions already used by the
local UI, status codes, and safe error formatting.

### Dataset selection UI

Focused client components own selection state, complete-list batch operations,
dirty-draft protection, count display, preset/version loading, and the save
dialog. Selection is keyed by normalized relative path rather than virtualized
card mount state.

### Training editor and provenance UI

Each dataset block owns its source mode (`live` or `preset`), preset/version
selection, and override state. A read-only provenance component renders usage
records on the job details page. General training-preset application continues
to preserve all dataset blocks.

## Archive, Retention, and Deletion

Archiving is the normal preset removal action. An archived preset disappears
from new-job selectors but remains visible from historical jobs and may be
restored. Existing jobs can still be viewed and retrained from an archived
version because archival does not invalidate immutable data.

Permanent version deletion is available only when no
`JobDatasetPresetUsage` row references the version. It requires an explicit
confirmation that names the preset, version, media count, and bytes to be
removed. The server rechecks references immediately before deletion. Deleting
first moves the version directory to a same-root quarantine name, deletes the
database row transactionally, and then removes the quarantined files. If the
database deletion fails, the directory is moved back. A failed final file
removal is reported for maintenance but cannot make the database point at a
missing live version.

The UI displays storage used per version and preset. Automatic version or
storage cleanup is outside the first release because silent cleanup conflicts
with reproducibility.

## Error Handling

- Empty selections and invalid settings are rejected before copying.
- Duplicate preset names return a clear conflict response.
- Unsupported auxiliary-directory settings explain why exact snapshotting is
  unavailable.
- Missing newly selected source files identify the affected relative paths.
- Retained files missing from the live source continue to come from the prior
  snapshot.
- Source files that change during copying abort publication.
- Snapshot failures publish no visible version and leave no database record.
- A missing, incomplete, or corrupt manifest blocks job save and job start.
- A fast preflight failure names the preset and version and lists a bounded
  sample of missing files.
- Full integrity verification reports checksum mismatches without modifying
  data.
- Failed preset operations never mutate the active training configuration.
- Live-folder training remains available when preset services fail.

Unexpected storage and database details are logged server-side. Client errors
contain actionable context without exposing absolute filesystem paths.

## Testing and Verification

### Pure helper tests

- Name and relative-path normalization, including case-insensitive names
- Manifest determinism, sorting, schema version, and checksum
- Loader-setting validation and job override resolution
- Rejection of traversal, absolute paths, null bytes, and duplicate normalized
  paths
- Preservation of missing versus empty captions

### Snapshot service tests

- Exact copied media and caption bytes, relative directories, counts, sizes,
  and SHA-256 checksums
- Image, video, and audio extension handling consistent with the dataset page
- Source edits and deletion cannot affect old versions
- A new version can retain files solely from an old snapshot and add files
  from the source
- Source changes during copying abort publication
- Symlink escape protection on supported platforms
- Copy, manifest-write, rename, and database failures clean up safely
- Concurrent saves receive distinct monotonically increasing versions
- Full verification detects modified or missing snapshot files

### Persistence and API tests

- Create, list, retrieve, rename, archive, restore, and version behavior
- Case-insensitive duplicate-name conflicts and request-size limits
- Version IDs cannot be substituted across presets
- Referenced versions cannot be permanently deleted
- Unreferenced permanent deletion and quarantine recovery
- Corrupt database metadata and manifests return safe errors

### Job integration tests

- One job can combine multiple preset versions and live folders
- The server ignores browser-supplied managed paths and resolves IDs itself
- Preset defaults plus explicit overrides produce the expected final config
- Job config and usage rows commit or roll back together on create and update
- Updating a job removes stale usage rows
- Archived presets remain retrainable by existing jobs but unavailable to new
  selections
- Queue-time and worker-time preflight block missing snapshots
- Python `DatasetConfig` tolerates internal provenance keys
- Existing training presets continue to preserve dataset blocks

### UI tests

- Per-card toggles and full-list select-all, select-none, and invert behavior
- Selection survives virtualized card unmounting and remounting
- Enabled counts and empty-selection validation
- Dirty-draft discard confirmation
- Creating a preset and publishing a new version
- Display of retained-but-source-missing items
- Live versus preset source mode in each training dataset block
- Multiple independent preset-backed blocks and job-specific overrides
- Job provenance display and archived-preset display
- Preset API errors do not disable live-folder job editing

## Out of Scope

- Content-addressed deduplication and garbage collection
- Automatic retention or disk-quota cleanup
- Snapshotting control, mask, unconditional, inpaint, or CLIP-image datasets
- Sharing presets between ai-toolkit installations
- Importing or exporting snapshot archives
- Collaborative editing and revision merging
- Global enabled/disabled state on source files

These can be added later without changing the stable preset/version/job-usage
model.
