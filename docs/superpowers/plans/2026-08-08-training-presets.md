# Training Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-backed, versioned training presets that can be saved, applied, updated, deleted, and undone from the training editor top bar without overwriting job-specific data.

**Architecture:** A pure TypeScript snapshot module owns sanitization, validation, migration-safe application, and deep-copy rules. A Prisma-backed service and thin Next.js routes own persistence, while a dedicated client controller and native-select view own preset interactions. The training page remains the source of truth for `jobConfig` and GPU state.

**Tech Stack:** TypeScript, React 19, Next.js 15 route handlers, Prisma 6 with SQLite, Node assertions and `react-dom/server` for focused tests.

---

## File Map

- Create `ui/src/helpers/trainingPresets.ts`: pure snapshot/name/application logic.
- Create `ui/src/server/trainingPresetService.ts`: persistence service over a small store interface.
- Create `ui/src/app/api/training-presets/route.ts`: list and create route.
- Create `ui/src/app/api/training-presets/[presetId]/route.ts`: update and delete route.
- Create `ui/src/components/TrainingPresetSelect.tsx`: stateless accessible dropdown view.
- Create `ui/src/components/TrainingPresetControl.tsx`: API, confirmation, selection, and undo controller.
- Modify `ui/src/app/jobs/new/page.tsx`: place the control and apply complete configurations.
- Modify `ui/prisma/schema.prisma`: persist presets in SQLite.
- Modify `ui/package.json`: add a focused preset test command.
- Create `ui/testing/trainingPresets.test.ts`: pure snapshot tests.
- Create `ui/testing/trainingPresetService.test.ts`: API-service tests with an in-memory store.
- Create `ui/testing/trainingPresetSelect.test.tsx`: server-rendered dropdown tests.
- Create `ui/testing/trainingPresetPageIntegration.test.ts`: top-bar integration source contract.
- Create `ui/testing/tsconfig.trainingPresets.json`: focused TypeScript compilation.
- Create `ui/testing/runTrainingPresetTests.mjs`: safe one-command test runner.

## Task 1: Build the Pure Snapshot Engine

**Files:**
- Create: `ui/src/helpers/trainingPresets.ts`
- Create: `ui/testing/trainingPresets.test.ts`
- Create: `ui/testing/tsconfig.trainingPresets.json`
- Create: `ui/testing/runTrainingPresetTests.mjs`
- Modify: `ui/package.json`

- [ ] **Step 1: Add the focused test command and safe runner**

Add to `ui/package.json`:

```json
"test:training-presets": "node testing/runTrainingPresetTests.mjs"
```

Create `ui/testing/tsconfig.trainingPresets.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "allowJs": false,
    "baseUrl": "..",
    "incremental": false,
    "isolatedModules": false,
    "jsx": "react-jsx",
    "module": "commonjs",
    "moduleResolution": "node",
    "noEmit": false,
    "rootDir": "..",
    "target": "es2020"
  },
  "include": [
    "../src/helpers/trainingPresets.ts",
    "trainingPresets.test.ts"
  ],
  "exclude": ["../.next", "../node_modules"]
}
```

Create `ui/testing/runTrainingPresetTests.mjs` with an owned temporary directory,
direct argument-array process spawning, and guarded cleanup:

```js
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PREFIX = 'ai-toolkit-training-presets-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
let outputDirectory;

function assertSafe(directory) {
  const realTemp = realpathSync(tmpdir());
  const realOutput = realpathSync(directory);
  const child = relative(realTemp, realOutput);
  if (
    child === '' || child === '..' || child.startsWith(`..${sep}`) ||
    isAbsolute(child) || !basename(realOutput).startsWith(PREFIX)
  ) {
    throw new Error(`Refusing unsafe test directory: ${realOutput}`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: uiRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${basename(command)} exited with status ${result.status}`);
  }
}

try {
  outputDirectory = mkdtempSync(join(tmpdir(), PREFIX));
  assertSafe(outputDirectory);
  run(process.execPath, [
    tsc,
    '--project',
    'testing/tsconfig.trainingPresets.json',
    '--outDir',
    outputDirectory,
  ]);
  for (const testFile of [
    'trainingPresets.test.js',
    'trainingPresetService.test.js',
    'trainingPresetSelect.test.js',
    'trainingPresetPageIntegration.test.js',
  ]) {
    const compiled = join(outputDirectory, 'testing', testFile);
    if (existsSync(compiled)) run(process.execPath, [compiled]);
  }
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
```

- [ ] **Step 2: Write failing snapshot tests**

Create `ui/testing/trainingPresets.test.ts` with a representative job factory
and assertions for all protected and retained fields:

```ts
import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import {
  SNAPSHOT_SCHEMA_VERSION,
  applyTrainingPreset,
  normalizePresetName,
  sanitizeTrainingPreset,
  validateTrainingPresetSnapshot,
} from '../src/helpers/trainingPresets';

function job(overrides: Record<string, unknown> = {}): JobConfig {
  return {
    job: 'extension',
    config: {
      name: 'current_job',
      process: [{
        type: 'diffusion_trainer',
        training_folder: '/output/current',
        sqlite_db_path: './aitk_db.db',
        device: 'cuda',
        trigger_word: 'current_trigger',
        datasets: [{ folder_path: '/datasets/current', caption_ext: 'txt' }],
        model: {
          arch: 'flux',
          name_or_path: '/models/current.safetensors',
          model_kwargs: { current_only: true },
        },
        network: { type: 'lora', linear: 16, linear_alpha: 16 },
        train: { steps: 1000, optimizer: 'adamw8bit' },
        save: { save_every: 100, dtype: 'bf16' },
        sample: {
          sample_every: 100,
          width: 768,
          height: 768,
          samples: [{ prompt: 'current prompt' }],
        },
        ...overrides,
      }],
    },
    meta: { name: 'current-meta', version: '1.0' },
  } as unknown as JobConfig;
}

const source = job();
const snapshot = sanitizeTrainingPreset(source);
assert.equal(snapshot.schema_version, SNAPSHOT_SCHEMA_VERSION);
const stored = snapshot.config.process[0];
for (const key of [
  'training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets',
]) {
  assert.ok(!(key in stored), `${key} leaked into the preset`);
}
assert.ok(!('samples' in (stored.sample as Record<string, unknown>)));
assert.equal((stored.model as any).name_or_path, '/models/current.safetensors');
assert.equal((stored.model as any).arch, 'flux');
assert.equal((stored.sample as any).width, 768);

const presetJob = job({
  type: 'concept_slider',
  model: {
    arch: 'qwen_image',
    name_or_path: '/models/preset.safetensors',
    model_kwargs: { preset_only: true },
  },
  train: { steps: 2400, optimizer: 'prodigy' },
  sample: {
    sample_every: 250,
    width: 1024,
    height: 1024,
    samples: [{ prompt: 'must not be stored' }],
  },
});
const applied = applyTrainingPreset(source, sanitizeTrainingPreset(presetJob), value => value);
assert.equal(applied.config.name, 'current_job');
assert.deepEqual(applied.meta, source.meta);
assert.equal(applied.config.process[0].training_folder, '/output/current');
assert.equal(applied.config.process[0].trigger_word, 'current_trigger');
assert.deepEqual(applied.config.process[0].datasets, source.config.process[0].datasets);
assert.deepEqual(applied.config.process[0].sample.samples, [{ prompt: 'current prompt' }]);
assert.equal(applied.config.process[0].sample.width, 1024);
assert.equal(applied.config.process[0].model.arch, 'qwen_image');
assert.deepEqual(applied.config.process[0].model.model_kwargs, { preset_only: true });

(applied.config.process[0].datasets as any[])[0].folder_path = '/mutated';
assert.equal(source.config.process[0].datasets[0].folder_path, '/datasets/current');
assert.equal((presetJob.config.process[0].datasets as any[])[0].folder_path, '/datasets/current');

assert.deepEqual(normalizePresetName('  Portrait BF16  '), {
  name: 'Portrait BF16',
  nameKey: 'portrait bf16',
});
for (const invalidName of ['', ' '.repeat(4), 'x'.repeat(81)]) {
  assert.throws(() => normalizePresetName(invalidName));
}
assert.throws(() => sanitizeTrainingPreset({
  ...source,
  config: { ...source.config, process: [source.config.process[0], source.config.process[0]] },
} as JobConfig), /exactly one process/i);
assert.throws(() => validateTrainingPresetSnapshot({ ...snapshot, schema_version: 99 }), /version/i);

console.log('Training preset snapshot tests passed');
```

- [ ] **Step 3: Run the focused command and verify RED**

Run:

```bash
cd ui && npm run test:training-presets
```

Expected: TypeScript fails because `src/helpers/trainingPresets.ts` does not
exist.

- [ ] **Step 4: Implement the snapshot module**

Create `ui/src/helpers/trainingPresets.ts` with these public contracts:

```ts
import type { JobConfig } from '../types';

export const SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const MAX_PRESET_NAME_LENGTH = 80;
export const MAX_PRESET_SNAPSHOT_BYTES = 512 * 1024;

export interface TrainingPresetSnapshotV1 {
  schema_version: typeof SNAPSHOT_SCHEMA_VERSION;
  job: 'extension';
  config: { process: [Record<string, any>] };
}

export interface TrainingPresetRecord {
  id: string;
  name: string;
  schema_version: number;
  snapshot: TrainingPresetSnapshotV1;
  created_at: string;
  updated_at: string;
}

type Migration = (jobConfig: JobConfig) => JobConfig;

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function normalizePresetName(input: unknown): { name: string; nameKey: string } {
  if (typeof input !== 'string') throw new Error('Preset name must be text');
  const name = input.trim();
  if (name.length === 0 || name.length > MAX_PRESET_NAME_LENGTH) {
    throw new Error(`Preset name must be between 1 and ${MAX_PRESET_NAME_LENGTH} characters`);
  }
  return { name, nameKey: name.toLowerCase() };
}

function requireSingleProcess(jobConfig: JobConfig): Record<string, any> {
  const processes = jobConfig?.config?.process;
  if (!Array.isArray(processes) || processes.length !== 1 || !processes[0]) {
    throw new Error('Training presets require exactly one process');
  }
  return processes[0] as unknown as Record<string, any>;
}

export function validateTrainingPresetSnapshot(value: unknown): TrainingPresetSnapshotV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Preset snapshot must be an object');
  }
  const snapshot = value as Record<string, any>;
  if (snapshot.schema_version !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Unsupported preset schema version: ${String(snapshot.schema_version)}`);
  }
  if (snapshot.job !== 'extension') throw new Error('Preset job type must be extension');
  if (!snapshot.config || !Array.isArray(snapshot.config.process) || snapshot.config.process.length !== 1) {
    throw new Error('Preset snapshot must contain exactly one process');
  }
  const process = snapshot.config.process[0];
  if (!process || typeof process !== 'object' || Array.isArray(process)) {
    throw new Error('Preset process must be an object');
  }
  const normalized = copy(snapshot) as TrainingPresetSnapshotV1;
  const size = new TextEncoder().encode(JSON.stringify(normalized)).byteLength;
  if (size > MAX_PRESET_SNAPSHOT_BYTES) throw new Error('Preset snapshot is too large');
  return normalized;
}

export function sanitizeTrainingPreset(jobConfig: JobConfig): TrainingPresetSnapshotV1 {
  const process = copy(requireSingleProcess(jobConfig));
  delete process.training_folder;
  delete process.sqlite_db_path;
  delete process.device;
  delete process.trigger_word;
  delete process.datasets;
  if (process.sample && typeof process.sample === 'object' && !Array.isArray(process.sample)) {
    delete process.sample.samples;
    delete process.sample.prompts;
  }
  return validateTrainingPresetSnapshot({
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    job: 'extension',
    config: { process: [process] },
  });
}

export function applyTrainingPreset(
  currentJob: JobConfig,
  untrustedSnapshot: unknown,
  migrate: Migration,
): JobConfig {
  const current = copy(migrate(copy(currentJob)));
  const currentProcess = requireSingleProcess(current);
  const snapshot = validateTrainingPresetSnapshot(untrustedSnapshot);
  const presetProcess = copy(snapshot.config.process[0]);
  const currentSamples = copy(currentProcess.sample?.samples);
  const candidate = copy(current) as JobConfig;
  candidate.config.process = [presetProcess as any];
  const candidateProcess = candidate.config.process[0] as any;
  for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
    if (key in currentProcess) candidateProcess[key] = copy(currentProcess[key]);
  }
  candidateProcess.sample = candidateProcess.sample || {};
  if (currentSamples !== undefined) candidateProcess.sample.samples = currentSamples;
  delete candidateProcess.sample.prompts;
  const migrated = migrate(copy(candidate));
  const result = copy(migrated);
  result.config.name = current.config.name;
  result.meta = copy(current.meta);
  const resultProcess = requireSingleProcess(result);
  for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
    if (key in currentProcess) resultProcess[key] = copy(currentProcess[key]);
    else delete resultProcess[key];
  }
  resultProcess.sample = resultProcess.sample || {};
  if (currentSamples !== undefined) resultProcess.sample.samples = copy(currentSamples);
  else delete resultProcess.sample.samples;
  delete resultProcess.sample.prompts;
  return result;
}
```

During implementation, preserve optional fields without manufacturing values:
if a protected field is absent in the current job it must also be absent after
application. Do not replace the direct reconstruction above with recursive
merging, because that would retain stale architecture-specific keys.

- [ ] **Step 5: Run the snapshot tests and verify GREEN**

Run:

```bash
cd ui && npm run test:training-presets
```

Expected: `Training preset snapshot tests passed` and exit 0.

- [ ] **Step 6: Commit the snapshot engine**

```bash
git add ui/package.json ui/src/helpers/trainingPresets.ts ui/testing
git commit -m "feat: define training preset snapshots"
```

## Task 2: Add SQLite Persistence and API Services

**Files:**
- Modify: `ui/prisma/schema.prisma`
- Create: `ui/src/server/trainingPresetService.ts`
- Create: `ui/src/app/api/training-presets/route.ts`
- Create: `ui/src/app/api/training-presets/[presetId]/route.ts`
- Create: `ui/testing/trainingPresetService.test.ts`
- Modify: `ui/testing/tsconfig.trainingPresets.json`

- [ ] **Step 1: Write failing service tests**

Create `ui/testing/trainingPresetService.test.ts`. Use a small in-memory store
that implements the service interface rather than touching `aitk_db.db`:

```ts
import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import {
  MAX_PRESET_REQUEST_BYTES,
  TrainingPresetConflictError,
  TrainingPresetNotFoundError,
  createTrainingPresetService,
  parsePresetRequestText,
} from '../src/server/trainingPresetService';

const rows = new Map<string, any>();
let sequence = 0;
const store = {
  findMany: async () => [...rows.values()],
  findUnique: async ({ where }: any) =>
    where.id ? rows.get(where.id) ?? null : [...rows.values()].find(row => row.name_key === where.name_key) ?? null,
  create: async ({ data }: any) => {
    const row = { ...data, id: `preset-${++sequence}`, created_at: new Date(0), updated_at: new Date(0) };
    rows.set(row.id, row);
    return row;
  },
  update: async ({ where, data }: any) => {
    const current = rows.get(where.id);
    if (!current) throw new TrainingPresetNotFoundError(where.id);
    const row = { ...current, ...data, updated_at: new Date(1) };
    rows.set(row.id, row);
    return row;
  },
  delete: async ({ where }: any) => {
    const current = rows.get(where.id);
    if (!current) throw new TrainingPresetNotFoundError(where.id);
    rows.delete(where.id);
    return current;
  },
};

function job(modelPath: string): JobConfig {
  return {
    job: 'extension',
    config: {
      name: 'do-not-store',
      process: [{
        type: 'diffusion_trainer',
        training_folder: '/private/output',
        sqlite_db_path: './aitk_db.db',
        device: 'cuda',
        trigger_word: 'secret-trigger',
        datasets: [{ folder_path: '/private/dataset' }],
        model: { arch: 'flux', name_or_path: modelPath },
        sample: { sample_every: 100, samples: [{ prompt: 'private prompt' }] },
      }],
    },
    meta: { name: 'private-meta', version: '1.0' },
  } as unknown as JobConfig;
}

const service = createTrainingPresetService(store);
async function main() {
  const created = await service.create('  Portrait  ', job('/models/a'));
  assert.equal(created.name, 'Portrait');
  assert.equal(created.snapshot.config.process[0].model.name_or_path, '/models/a');
  assert.ok(!('datasets' in created.snapshot.config.process[0]));
  assert.deepEqual((await service.list()).map(item => item.name), ['Portrait']);
  await assert.rejects(() => service.create('portrait', job('/models/b')), TrainingPresetConflictError);

  const updated = await service.update(created.id, job('/models/b'));
  assert.equal(updated.name, 'Portrait');
  assert.equal(updated.snapshot.config.process[0].model.name_or_path, '/models/b');
  await service.remove(created.id);
  assert.deepEqual(await service.list(), []);
  await assert.rejects(() => service.update('missing', job('/models/c')), TrainingPresetNotFoundError);

  const parsed = parsePresetRequestText(JSON.stringify({ name: 'Valid', job_config: job('/models/a') }));
  assert.equal(parsed.name, 'Valid');
  assert.throws(
    () => parsePresetRequestText('x'.repeat(MAX_PRESET_REQUEST_BYTES + 1)),
    /too large/i,
  );

  console.log('Training preset service tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```

Extend the focused tsconfig `include` with the service and its test.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd ui && npm run test:training-presets
```

Expected: compilation fails because `trainingPresetService.ts` is missing.

- [ ] **Step 3: Add the Prisma model**

Append to `ui/prisma/schema.prisma`:

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

- [ ] **Step 4: Implement the service over a narrow store interface**

Create `ui/src/server/trainingPresetService.ts`. Define a structural
`TrainingPresetStore` interface containing only `findMany`, `findUnique`,
`create`, `update`, and `delete`, so focused tests can provide the in-memory
store. Export:

```ts
export const MAX_PRESET_REQUEST_BYTES = 1024 * 1024;

export class TrainingPresetConflictError extends Error {}
export class TrainingPresetNotFoundError extends Error {}
export class TrainingPresetCorruptError extends Error {}

export function parsePresetRequestText(text: string): {
  name?: unknown;
  job_config: JobConfig;
} {
  if (new TextEncoder().encode(text).byteLength > MAX_PRESET_REQUEST_BYTES) {
    throw new Error('Preset request is too large');
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new Error('Preset request must be valid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !('job_config' in body)) {
    throw new Error('Preset request must contain job_config');
  }
  return body as { name?: unknown; job_config: JobConfig };
}
```

`createTrainingPresetService(store)` must provide:

- `list()`: deserialize and validate every row, require the row and embedded
  schema versions to match, return ISO timestamps, then sort with
  `name.localeCompare(other.name, undefined, { sensitivity: 'base' })`.
- `create(name, jobConfig)`: normalize the name, explicitly reject an existing
  `name_key`, sanitize on the server, enforce the 512 KiB serialized limit, and
  create the row.
- `update(id, jobConfig)`: require the ID to exist, sanitize the current job,
  update only `preset_config` and `schema_version`, and retain the stored name.
- `remove(id)`: require the ID to exist before deleting it.

All returned objects must be new parsed values, not mutable store row objects.
Do not accept a pre-sanitized browser snapshot in create or update requests.

- [ ] **Step 5: Add thin Next.js route handlers**

Create `ui/src/app/api/training-presets/route.ts`:

```ts
import { NextResponse } from 'next/server';
import prisma from '@/server/prisma';
import {
  TrainingPresetConflictError,
  createTrainingPresetService,
  parsePresetRequestText,
} from '@/server/trainingPresetService';

const service = createTrainingPresetService(prisma.trainingPreset);

export async function GET() {
  try {
    return NextResponse.json({ presets: await service.list() });
  } catch (error) {
    console.error('Failed to list training presets:', error);
    return NextResponse.json({ error: 'Failed to list training presets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = parsePresetRequestText(await request.text());
    return NextResponse.json(await service.create(body.name, body.job_config), { status: 201 });
  } catch (error) {
    if (error instanceof TrainingPresetConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && /must|too large|exactly one/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to create training preset:', error);
    return NextResponse.json({ error: 'Failed to create training preset' }, { status: 500 });
  }
}
```

Create `ui/src/app/api/training-presets/[presetId]/route.ts` with `PUT` and
`DELETE`. Await `context.params`, reject blank IDs, map
`TrainingPresetNotFoundError` to 404, validation to 400, and unexpected errors
to 500. `PUT` parses `{ job_config }`, calls `service.update`, and never accepts
a replacement name. `DELETE` calls `service.remove` and returns `{ ok: true }`.

Do not classify validation errors using a broad regular expression in the
finished code. Introduce an explicit `TrainingPresetValidationError` and use
`instanceof` in both routes so internal error text cannot accidentally turn a
server failure into a 400 response.

- [ ] **Step 6: Run service tests, Prisma generation, and schema validation**

Run:

```bash
cd ui
npm run test:training-presets
npx prisma validate
npx prisma generate
```

Expected: service and snapshot tests pass; Prisma reports that the schema is
valid and generates a client exposing `trainingPreset`.

- [ ] **Step 7: Commit persistence and API support**

```bash
git add ui/prisma/schema.prisma ui/src/server/trainingPresetService.ts \
  ui/src/app/api/training-presets ui/testing
git commit -m "feat: persist training presets"
```

## Task 3: Build the Preset Dropdown and Controller

**Files:**
- Create: `ui/src/components/TrainingPresetSelect.tsx`
- Create: `ui/src/components/TrainingPresetControl.tsx`
- Create: `ui/testing/trainingPresetSelect.test.tsx`
- Modify: `ui/testing/tsconfig.trainingPresets.json`

- [ ] **Step 1: Write failing server-rendered view tests**

Create `ui/testing/trainingPresetSelect.test.tsx`:

```tsx
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrainingPresetSelect } from '../src/components/TrainingPresetSelect';

const presets = [
  { id: 'b', name: 'Zeta' },
  { id: 'a', name: 'alpha' },
] as any;

const withoutUndo = renderToStaticMarkup(
  <TrainingPresetSelect
    presets={presets}
    selectedPresetId={null}
    canUndo={false}
    disabled={false}
    onSelect={() => undefined}
  />,
);
assert.match(withoutUndo, /Preset/);
assert.ok(withoutUndo.indexOf('alpha') < withoutUndo.indexOf('Zeta'));
assert.match(withoutUndo, /Save current as new preset/);
assert.match(withoutUndo, /value="action:update" disabled="">Update selected preset<\/option>/);
assert.ok(!withoutUndo.includes('Undo last preset'));
assert.match(withoutUndo, /w-32/);

const withSelection = renderToStaticMarkup(
  <TrainingPresetSelect
    presets={presets}
    selectedPresetId="a"
    canUndo
    disabled={false}
    onSelect={() => undefined}
  />,
);
assert.match(withSelection, /Undo last preset/);
assert.match(withSelection, /value="preset:a" selected/);

console.log('Training preset dropdown tests passed');
```

Extend the focused tsconfig with both component files and this test.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd ui && npm run test:training-presets
```

Expected: compilation fails because `TrainingPresetSelect.tsx` is missing.

- [ ] **Step 3: Implement the stateless native-select view**

Create `ui/src/components/TrainingPresetSelect.tsx` with reserved values:

```tsx
import React from 'react';

export const PRESET_ACTION_SAVE = 'action:save';
export const PRESET_ACTION_UPDATE = 'action:update';
export const PRESET_ACTION_DELETE = 'action:delete';
export const PRESET_ACTION_UNDO = 'action:undo';
export const presetValue = (id: string) => `preset:${id}`;

interface Props {
  presets: Array<{ id: string; name: string }>;
  selectedPresetId: string | null;
  canUndo: boolean;
  disabled: boolean;
  onSelect: (value: string) => void;
}

export function TrainingPresetSelect(props: Props) {
  const presets = [...props.presets].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
  );
  return (
    <label className="block w-32 sm:w-48 flex-shrink-0">
      <span className="sr-only">Training preset</span>
      <select
        aria-label="Training preset"
        className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 sm:text-sm"
        value={props.selectedPresetId ? presetValue(props.selectedPresetId) : ''}
        disabled={props.disabled}
        onChange={event => {
          const selected = event.currentTarget.value;
          event.currentTarget.value = props.selectedPresetId ? presetValue(props.selectedPresetId) : '';
          props.onSelect(selected);
        }}
      >
        <option value="">Preset</option>
        <optgroup label="Saved presets">
          {presets.map(preset => (
            <option key={preset.id} value={presetValue(preset.id)}>{preset.name}</option>
          ))}
        </optgroup>
        <optgroup label="Actions">
          <option value={PRESET_ACTION_SAVE}>Save current as new preset...</option>
          <option value={PRESET_ACTION_UPDATE} disabled={!props.selectedPresetId}>Update selected preset</option>
          <option value={PRESET_ACTION_DELETE} disabled={!props.selectedPresetId}>Delete selected preset</option>
          {props.canUndo && <option value={PRESET_ACTION_UNDO}>Undo last preset</option>}
        </optgroup>
      </select>
    </label>
  );
}
```

The component must never hide at mobile breakpoints. Keep the screen-reader
label even when the visible selected text is compact.

- [ ] **Step 4: Implement the stateful controller**

Create `ui/src/components/TrainingPresetControl.tsx` with props:

```ts
interface TrainingPresetControlProps {
  jobConfig: JobConfig;
  onJobConfigChange: (jobConfig: JobConfig) => void;
  migrateJobConfig: (jobConfig: JobConfig) => JobConfig;
}
```

The controller must:

1. Fetch `GET /api/training-presets` on mount and expose a retry button on
   failure without disabling the job editor.
2. Track `selectedPresetId`, one `undoConfig`, `pending`, and `error`.
3. For `preset:<id>`, deep-copy the current config, call
   `applyTrainingPreset`, and only after it succeeds set the undo copy and call
   `onJobConfigChange`.
4. For save, call `openConfirm` with `inputTitle: 'Preset name'`; POST
   `{ name, job_config: jobConfig }`; refresh; select the new ID.
5. For update, confirm the selected name; PUT
   `{ job_config: jobConfig }`; refresh without changing configuration.
6. For delete, confirm the selected name; DELETE; refresh and clear selection
   without changing configuration.
7. For undo, restore a deep copy, clear undo state, and leave the selected
   preset as the last-applied label.
8. Read server errors from `error.response?.data?.error` and show them in a
   compact `role="alert"` element next to the select.
9. Disable mutations while a request is pending.

Use `apiClient`, `openConfirm`, `TrainingPresetSelect`, and the pure helper.
Do not duplicate snapshot sanitization in the component. Treat API snapshots
as untrusted and let `applyTrainingPreset` validate them before changing state.

- [ ] **Step 5: Add controller seam tests**

Export a small pure dispatcher from the controller module:

```ts
export type TrainingPresetSelection =
  | { kind: 'preset'; id: string }
  | { kind: 'save' }
  | { kind: 'update' }
  | { kind: 'delete' }
  | { kind: 'undo' }
  | { kind: 'none' };

export function parseTrainingPresetSelection(value: string): TrainingPresetSelection;
```

Extend `trainingPresetSelect.test.tsx` to assert every reserved action, a
preset ID containing punctuation, blank selection, and an unknown value. An
unknown value must return `none`, never an arbitrary action.

- [ ] **Step 6: Run tests and production type checking**

Run:

```bash
cd ui
npm run test:training-presets
npx tsc --noEmit --incremental false
```

Expected: focused tests pass. If the repository-wide type-check reports an
existing unrelated generated-route issue, archive `HEAD` and `main` into two
separately validated temporary directories and prove the failure exists on
both before classifying it as pre-existing.

- [ ] **Step 7: Commit the dropdown and controller**

```bash
git add ui/src/components/TrainingPresetSelect.tsx \
  ui/src/components/TrainingPresetControl.tsx ui/testing
git commit -m "feat: manage training presets in the editor"
```

## Task 4: Integrate Presets into Both Training Editor Modes

**Files:**
- Modify: `ui/src/app/jobs/new/page.tsx`
- Create: `ui/testing/trainingPresetPageIntegration.test.ts`
- Modify: `ui/testing/tsconfig.trainingPresets.json`

- [ ] **Step 1: Write the failing top-bar integration contract**

Create `ui/testing/trainingPresetPageIntegration.test.ts`. Read the source file
relative to the repository root and assert a single unconditional control is
placed after both mode-specific blocks and before the view-toggle button:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/app/jobs/new/page.tsx'), 'utf8');
assert.match(source, /import TrainingPresetControl/);
assert.equal((source.match(/<TrainingPresetControl/g) || []).length, 1);
const advancedBlock = source.indexOf('{showAdvancedView &&');
const simpleBlock = source.indexOf('{!showAdvancedView &&');
const presetControl = source.indexOf('<TrainingPresetControl');
const viewToggle = source.indexOf('onClick={() => setShowAdvancedView');
assert.ok(advancedBlock >= 0 && simpleBlock > advancedBlock);
assert.ok(presetControl > simpleBlock && presetControl < viewToggle);
assert.match(source.slice(presetControl, viewToggle), /jobConfig={jobConfig}/);
assert.match(source.slice(presetControl, viewToggle), /onJobConfigChange={setJobConfig}/);

console.log('Training preset page integration tests passed');
```

Add this test to the focused tsconfig. This source contract is intentionally
narrow: behavior belongs to the pure/controller tests, while this test guards
the exact requirement that one control remains outside both conditional mode
blocks.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd ui && npm run test:training-presets
```

Expected: the integration assertion fails because the page has no preset
control.

- [ ] **Step 3: Place the control in the top bar**

Import `TrainingPresetControl`. After the closing fragments for the Advanced
and Simple mode-specific controls, and before the Show Advanced/Show Simple
button, add:

```tsx
<div className="flex-shrink-0 px-1 sm:px-2">
  <TrainingPresetControl
    jobConfig={jobConfig}
    onJobConfigChange={nextConfig => setJobConfig(nextConfig)}
    migrateJobConfig={migrateJobConfig}
  />
</div>
<div className="hidden sm:block bg-gray-200 dark:bg-gray-800 w-px h-6" />
```

Because this JSX is outside both `showAdvancedView` conditionals, it appears
after Trainer Type in Simple mode and after GPU/Import Config in Advanced mode.
Do not pass or modify `gpuIDs`; presets must not affect GPU selection.

- [ ] **Step 4: Test create/edit/clone/import preservation through the pure seam**

Extend `trainingPresets.test.ts` with four current configurations representing
a new default job, an edited job, a cloned job name/dataset, and an imported
job with legacy `sample.prompts`. Apply the same preset to each and assert:

- current name and metadata remain exact;
- current dataset list remains exact;
- current trigger remains exact;
- current training folder, SQLite path, and device remain exact;
- current `sample.samples` remains exact after migration;
- preset trainer type, model architecture/path, network, optimizer, and sample
  numeric settings are applied.

Use this table-driven shape so every lifecycle exercises the same invariants:

```ts
import { migrateJobConfig } from '../src/app/jobs/new/jobConfig';

const lifecycleCases: Array<[string, JobConfig]> = [
  ['new', job()],
  ['edit', job({ trigger_word: 'edited-trigger' })],
  ['clone', {
    ...job(),
    config: {
      ...job().config,
      name: 'cloned_job_copy',
      process: [{
        ...job().config.process[0],
        datasets: [{ folder_path: '/datasets/cloned', caption_ext: 'caption' }],
      }],
    },
  } as JobConfig],
  ['import', {
    ...job(),
    config: {
      ...job().config,
      name: 'imported_job',
      process: [{
        ...job().config.process[0],
        sample: {
          ...job().config.process[0].sample,
          samples: undefined,
          prompts: ['legacy one', 'legacy two'],
        },
      }],
    },
  } as unknown as JobConfig],
];

const lifecyclePreset = sanitizeTrainingPreset(presetJob);
for (const [label, current] of lifecycleCases) {
  const normalizedCurrent = migrateJobConfig(JSON.parse(JSON.stringify(current)));
  const result = applyTrainingPreset(current, lifecyclePreset, migrateJobConfig);
  assert.equal(result.config.name, normalizedCurrent.config.name, `${label}: name`);
  assert.deepEqual(result.meta, normalizedCurrent.meta, `${label}: meta`);
  assert.deepEqual(
    result.config.process[0].datasets,
    normalizedCurrent.config.process[0].datasets,
    `${label}: datasets`,
  );
  assert.equal(
    result.config.process[0].trigger_word,
    normalizedCurrent.config.process[0].trigger_word,
    `${label}: trigger`,
  );
  assert.deepEqual(
    result.config.process[0].sample.samples,
    normalizedCurrent.config.process[0].sample.samples,
    `${label}: samples`,
  );
  assert.equal(result.config.process[0].type, presetJob.config.process[0].type, `${label}: trainer`);
  assert.equal(result.config.process[0].model.arch, 'qwen_image', `${label}: architecture`);
  assert.equal(result.config.process[0].model.name_or_path, '/models/preset.safetensors', `${label}: model`);
  assert.equal(result.config.process[0].train.optimizer, 'prodigy', `${label}: optimizer`);
  assert.equal(result.config.process[0].sample.width, 1024, `${label}: sample width`);
}
```

Use the real `migrateJobConfig` for the legacy-import case. Add
`../src/app/jobs/new/jobConfig.ts` to the focused tsconfig include so signature
drift is caught.

- [ ] **Step 5: Run the focused suite and production build**

Run:

```bash
cd ui
npm run test:training-presets
npm run test:anima-model-paths
npm run test:dinov3-tagger-captioner
npm run build
```

Expected: all focused suites pass and Next.js produces the production build.
The known optional `macos-temperature-sensor` warning is permitted only if it
is unchanged from `main`.

- [ ] **Step 6: Commit page integration**

```bash
git add ui/src/app/jobs/new/page.tsx ui/testing
git commit -m "feat: add presets to the training top bar"
```

## Task 5: Verify the Database and Complete the Feature

**Files:**
- Review all changes in `main...HEAD`.
- No tracked verification artifacts expected.

- [ ] **Step 1: Validate schema creation against an owned temporary database**

Create an owned directory with `mktemp -d /tmp/ai-toolkit-preset-db.XXXXXX`,
validate its canonical parent and prefix, copy `schema.prisma` into it, replace
only the copied datasource URL with a database inside that directory, then run:

```bash
cd ui
npx prisma validate --schema /tmp/ai-toolkit-preset-db.<suffix>/schema.prisma
npx prisma db push --schema /tmp/ai-toolkit-preset-db.<suffix>/schema.prisma
```

Query the temporary SQLite schema and assert `TrainingPreset` exists with a
unique `name_key`. Remove only the canonical, prefix-validated temporary
directory afterward. Never point the verification command at `aitk_db.db`.

- [ ] **Step 2: Run all fresh automated verification**

Run:

```bash
cd ui
npm run test:training-presets
npm run test:anima-model-paths
npm run test:dinov3-tagger-captioner
npx prisma validate
npx prisma generate
npm run build
cd ..
./.venv/bin/python -m unittest testing.test_dinov3_tagger_captioner
git diff --check main...HEAD
git status --short --branch
```

Expected: all feature tests and build commands exit 0, generated client exposes
`trainingPreset`, diff check is clean, and no temporary database is present.

- [ ] **Step 3: Manually verify the top-bar lifecycle using the local UI**

Start the normal UI and verify in both editor modes:

1. Save a preset containing a distinctive model path, optimizer, step count,
   sample dimensions, and sample interval.
2. Change the job name, dataset, trigger, sample prompts, training folder, and
   GPU.
3. Apply the preset and confirm all distinctive training settings change while
   every protected value remains unchanged.
4. Undo and confirm the entire pre-apply editor configuration returns.
5. Apply again, modify a training setting, update the selected preset, then
   load it into a fresh job and confirm the update persisted.
6. Delete it and confirm current settings remain while the dropdown entry
   disappears.
7. Switch between Simple and Advanced and confirm the control stays visible.

Use a temporary preset name with a distinctive prefix and delete it at the end.
Do not create or start a training job during this verification.

- [ ] **Step 4: Request final code review**

Use `superpowers:requesting-code-review` over `main...HEAD`. Address every
Critical or Important finding with a failing regression test, the minimal fix,
and a fresh full verification run.

- [ ] **Step 5: Run verification-before-completion and finish the branch**

Use `superpowers:verification-before-completion`, rerun the commands from Step
2, inspect their complete output and exit codes, then use
`superpowers:finishing-a-development-branch` to offer the four integration
choices. Do not merge, push, or delete the branch without the user's selected
choice.
