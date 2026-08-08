# Training Presets Design

**Date:** 2026-08-08

## Goal

Add reusable, server-backed training presets to the training job editor. A user
can save the current training behavior, apply it while creating or editing a
job, update it, delete it, and undo the most recent application. Presets must
not overwrite job identity, datasets, trigger text, sample prompts, output
locations, or GPU selection.

The preset control appears in the top action bar next to the trainer-type
selector and remains available in both the Simple and Advanced editors.

## User Experience

### Placement

The Simple editor top bar is ordered as follows:

```text
Trainer Type | Preset | Show Advanced | Create/Update Job
```

The Advanced editor retains its existing GPU and import controls and adds the
preset control before the view toggle:

```text
GPU | Import Config | Preset | Show Simple | Create/Update Job
```

The control remains usable at narrow viewport sizes with a compact label and
width. It is not hidden merely because the screen is small.

### Dropdown contents

The dropdown contains saved presets sorted alphabetically, followed by the
available management actions:

- **Save current as new preset...**
- **Update selected preset**, enabled only when a saved preset is selected
- **Delete selected preset**, enabled only when a saved preset is selected
- **Undo last preset**, present only while an undo snapshot exists

Preset IDs and action values use distinct namespaces so a database ID can
never be interpreted as an action.

Selecting a saved preset applies it immediately. The selected name means
"last applied or saved preset" rather than a live link. Subsequent editor
changes do not mutate the preset until the user explicitly chooses **Update
selected preset**.

Saving opens an accessible naming dialog. Updating asks for confirmation.
Deleting asks for confirmation, removes the stored preset, and clears the
selection without changing the editor's current settings. Renaming, folders,
sharing, and preset import/export are outside the first version.

### Undo

Immediately before applying a preset, the editor stores one deep-copied undo
snapshot in component memory. **Undo last preset** restores that complete job
configuration and then consumes the snapshot. Saving, updating, or deleting a
preset does not create an undo snapshot because those operations do not change
the current job configuration.

The GPU selection is not part of a `JobConfig` and is never changed by preset
application or undo.

## Snapshot Semantics

### Stored structure

Each preset stores a versioned, sanitized configuration snapshot:

```ts
interface TrainingPresetSnapshotV1 {
  schema_version: 1;
  job: 'extension';
  config: {
    process: [Record<string, unknown>];
  };
}
```

Only the single-process training jobs supported by the current editor may be
saved. Missing or additional process entries are rejected with a clear error.
The snapshot contains the trainer type and all non-protected training fields,
including model architecture and path, network, optimizer, training, save,
logging, sampling behavior, and model-specific settings.

Using a sanitized near-complete snapshot makes a preset authoritative. When a
preset switches model architectures, settings left over from the previously
selected architecture disappear instead of leaking into the new configuration.
It also allows future training settings to be captured without maintaining a
large allowlist.

### Protected job-specific fields

The sanitizer never stores these values:

- `config.name`
- the complete top-level `meta` object
- `config.process[0].training_folder`
- `config.process[0].sqlite_db_path`
- `config.process[0].device`
- `config.process[0].trigger_word`
- `config.process[0].datasets`
- `config.process[0].sample.samples`
- legacy `config.process[0].sample.prompts`

GPU IDs are maintained in separate page state and therefore never enter the
snapshot. Model architecture and `model.name_or_path` are deliberately stored.
Other sampling settings such as interval, dimensions, seed, scheduler, and
guidance are stored even though the per-sample prompt list is protected.

### Application algorithm

Applying a preset is a pure operation over deep copies:

1. Validate the snapshot version and shape.
2. Pass a reconstructed copy through the existing job-config migration logic.
3. Capture the protected values from the current job.
4. Use the preset process as the authoritative process configuration.
5. Restore all protected fields from the current job, including the prompt
   list inside the preset's sampling configuration.
6. Restore the current top-level job name and metadata.
7. Validate the result before committing it to React state.

If validation or migration fails, the current editor state remains untouched.
The same pure sanitizer and application helpers are used by tests, the client,
and server-side validation where their runtime dependencies permit.

## Persistence and API

### Database model

Add a Prisma model backed by the existing SQLite database:

```prisma
model TrainingPreset {
  id             String   @id @default(uuid())
  name           String
  name_key       String   @unique
  preset_config  String
  schema_version Int      @default(1)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@index([name])
}
```

`name_key` is the trimmed name converted to lowercase, giving names
case-insensitive uniqueness independently of SQLite collation settings. The
existing startup `prisma generate` and `prisma db push` flow creates the table
without a separate destructive migration.

### Endpoints

Use dedicated endpoints rather than overloading job storage:

- `GET /api/training-presets` returns metadata and parsed snapshots. The client
  sorts them with a case-insensitive name comparison for deterministic display
  across SQLite builds.
- `POST /api/training-presets` validates a name and job configuration,
  sanitizes it on the server, and creates a preset.
- `PUT /api/training-presets/[presetId]` confirms the target exists, sanitizes
  the supplied current job configuration, and updates its snapshot while
  retaining its name.
- `DELETE /api/training-presets/[presetId]` deletes the selected preset.

Names are trimmed, must contain between 1 and 80 UTF-16 code units, and must be
unique after lowercase normalization. Request bodies and serialized snapshots
are limited to 1 MiB and 512 KiB respectively. The database `schema_version`
must equal the version embedded in the snapshot. Unsupported or mismatched
versions, malformed JSON, invalid single-process shapes, missing IDs, and
duplicate names receive specific 4xx responses. Unexpected storage failures
return a generic 500 response while the detailed error is logged server-side.

The client refreshes its preset list after every mutation. Presets are shared
by all browsers connected to this ai-toolkit installation. Concurrent updates
use last-confirmed-write behavior; collaborative locking and revision history
are out of scope.

## Components and Responsibilities

### Pure preset helper

A focused helper module owns:

- preset name normalization and validation
- snapshot shape and schema-version validation
- job sanitization
- preset application with protected-field restoration
- deep-copy guarantees

It has no database or React dependencies and is directly unit tested.

### API routes

The API owns persistence, request-size checks, server-side re-sanitization,
duplicate-name handling, and safe response formatting. The database never
accepts a browser-provided snapshot without rebuilding it through the
sanitizer.

### Top-bar preset control

A dedicated client component owns loading and rendering the list, naming and
confirmation dialogs, mutation requests, selected-preset state, and the
one-level undo action. The training page remains responsible for the canonical
`jobConfig` and passes explicit apply/restore callbacks to the control.

The control operates on the same state used by the Advanced YAML editor, so
applying or undoing a preset is reflected immediately in either editor mode.
If the preset API is unavailable, the editor and job save controls continue to
work; only preset operations show an error.

## Error Handling

- Fetch failures show a retryable preset-specific error and do not block job
  creation or editing.
- Create/update/delete controls disable while their request is pending to
  prevent duplicate actions.
- Duplicate names receive a clear conflict message in the naming dialog.
- Invalid or obsolete snapshots are not applied and do not create undo state.
- Failed updates and deletes retain both the selected preset and editor state.
- A deleted preset never rolls back settings that were already applied.
- Preset migration works on a copy so migrations cannot partially mutate the
  active editor configuration.

## Testing and Verification

### Pure helper tests

- Sanitization removes every protected field and retains model architecture,
  model path, trainer type, and non-prompt sample settings.
- Application restores job name, metadata, datasets, trigger word, paths,
  device, and sample prompts.
- Applying a different architecture removes stale model-specific fields.
- Inputs, stored snapshots, protected arrays, and returned configurations do
  not share mutable references.
- Invalid versions, malformed shapes, and multi-process configurations fail
  without mutation.
- Name validation is trimmed, bounded, and case-insensitive.

### API tests

- List ordering and empty state.
- Create, update, and delete behavior.
- Case-insensitive duplicate-name conflict.
- Missing preset, malformed body, oversized body, and corrupt stored snapshot
  responses.
- Server-side sanitization cannot be bypassed by a crafted request.

### UI tests

- The control is rendered in both Simple and Advanced top bars.
- Selecting applies immediately and preserves all job-specific fields.
- Saving, updating, deleting, and list refresh behavior.
- One-level undo restores the exact pre-apply configuration and is consumed.
- A failed request or invalid response leaves the editor unchanged.
- Actions are correctly enabled or hidden based on selection and undo state.
- New-job, edit-job, clone-job, imported-config, and trainer-type transitions
  retain their existing behavior.
- Narrow viewport rendering keeps the preset control accessible.

### Completion checks

Run focused preset tests, existing job-editor and feature tests, Prisma client
generation/database schema validation against a temporary SQLite database,
TypeScript checking, the production UI build, and `git diff --check`. Confirm
that no test database or preset fixture is left in the working tree.

## Non-Goals

The initial feature does not provide preset folders, renaming, cloud sync,
sharing, import/export, built-in presets, partial-section selection, revision
history, or automatic live synchronization between open browsers.
