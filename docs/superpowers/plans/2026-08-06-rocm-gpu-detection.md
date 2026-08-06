# ROCm GPU Detection and Job Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect and monitor the RX 7900 XTX in the UI, exclude the 512 MiB integrated Radeon, default jobs to GPU 0, and reject missing GPU assignments cleanly.

**Architecture:** Parse `rocm-smi` JSON in a pure server helper and normalize it into the existing GPU model. The GPU route selects NVIDIA, ROCm, macOS, or no backend; the form consumes that neutral contract, while a pure GPU-ID validator protects the jobs API from null persistence.

**Tech Stack:** Next.js 15 route handlers, TypeScript, Node child processes, ROCm SMI, Prisma, React

---

## File Structure

- Create `ui/src/server/rocmGpu.ts`: pure ROCm JSON parser and telemetry normalizer.
- Create `ui/testing/rocmGpu.test.ts`: zero-dependency parser regression tests compiled with the existing TypeScript compiler.
- Modify `ui/src/app/api/gpu/route.ts`: probe ROCm after NVIDIA and return a backend-neutral response.
- Modify `ui/src/types.ts`: add the GPU backend discriminator.
- Modify `ui/src/components/GPUMonitor.tsx`: show generic accelerator states instead of NVIDIA-only errors.
- Create `ui/src/server/jobGpu.ts`: pure platform-aware GPU-ID validation.
- Create `ui/testing/jobGpu.test.ts`: validation regression tests.
- Modify `ui/src/app/api/jobs/route.ts`: return HTTP 400 for missing non-macOS GPU IDs.
- Modify `ui/src/app/jobs/new/page.tsx`: block null submission, show a no-GPU message, and label devices by name.
- Modify `ui/src/app/jobs/new/SimpleJob.tsx`: label devices by index and full name.

## Test Command

The UI has no test runner dependency. Compile the pure TypeScript helpers and
tests into a disposable directory, then execute the generated CommonJS tests:

```bash
test_out="$(mktemp -d)"
test -n "$test_out" && test -d "$test_out"
case "$test_out" in
  /tmp/*) ;;
  *) echo "Unexpected temporary path: $test_out" >&2; exit 1 ;;
esac
(
  cd ui
  ./node_modules/.bin/tsc \
    --module commonjs \
    --moduleResolution node \
    --target es2020 \
    --esModuleInterop \
    --skipLibCheck \
    --outDir "$test_out" \
    src/server/rocmGpu.ts \
    src/server/jobGpu.ts \
    testing/rocmGpu.test.ts \
    testing/jobGpu.test.ts
)
node "$test_out/testing/rocmGpu.test.js"
node "$test_out/testing/jobGpu.test.js"
rm -rf -- "$test_out"
```

The temporary directory comes directly from `mktemp -d`; validate that
`test_out` is non-empty before removing it.

### Task 1: Add Failing ROCm Parser Tests

**Files:**
- Create: `ui/testing/rocmGpu.test.ts`
- Test: `ui/testing/rocmGpu.test.ts`

- [ ] **Step 1: Write the failing parser test**

Create `ui/testing/rocmGpu.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { parseRocmSmiJson } from '../src/server/rocmGpu';

const TWO_CARD_OUTPUT = JSON.stringify({
  card0: {
    'Temperature (Sensor edge) (C)': '53.0',
    'Temperature (Sensor junction) (C)': '62.0',
    'Average Graphics Package Power (W)': '92.0',
    'GPU use (%)': '27',
    'VRAM Total Memory (B)': '25753026560',
    'VRAM Total Used Memory (B)': '5476655104',
    'Card Series': 'AMD Radeon RX 7900 XTX',
  },
  card1: {
    'Temperature (Sensor edge) (C)': '40.0',
    'Current Socket Graphics Package Power (W)': '32.142',
    'GPU use (%)': '0',
    'VRAM Total Memory (B)': '536870912',
    'VRAM Total Used Memory (B)': '21512192',
    'Card Series': 'AMD Ryzen 7 7800X3D 8-Core Processor',
  },
});

const [gpu] = parseRocmSmiJson(TWO_CARD_OUTPUT);
assert.equal(parseRocmSmiJson(TWO_CARD_OUTPUT).length, 1);
assert.deepEqual(gpu, {
  index: 0,
  name: 'AMD Radeon RX 7900 XTX',
  driverVersion: 'ROCm',
  temperature: 53,
  utilization: { gpu: 27, memory: 21 },
  memory: { total: 24560, free: 19337, used: 5223 },
  power: { draw: 92, limit: 0 },
  clocks: { graphics: 0, memory: 0 },
  fan: { speed: 0 },
});

const cardTwoOnly = JSON.stringify({
  card2: {
    'GPU use (%)': '10',
    'VRAM Total Memory (B)': String(4 * 1024 ** 3),
    'VRAM Total Used Memory (B)': String(1024 ** 3),
    'Card Series': 'AMD Test GPU',
  },
});
const [cardTwo] = parseRocmSmiJson(cardTwoOnly);
assert.equal(cardTwo.index, 2);
assert.equal(cardTwo.temperature, 0);
assert.equal(cardTwo.power.draw, 0);

assert.throws(() => parseRocmSmiJson('not-json'), /Invalid ROCm SMI JSON/);
assert.throws(
  () => parseRocmSmiJson(JSON.stringify({ card0: { 'Card Series': 'Missing memory' } })),
  /missing required fields/i,
);

console.log('ROCm GPU parser tests passed');
```

- [ ] **Step 2: Compile to verify the RED state**

Run from the repository root:

```bash
test_out="$(mktemp -d)"
test -n "$test_out" && test -d "$test_out"
case "$test_out" in
  /tmp/*) ;;
  *) echo "Unexpected temporary path: $test_out" >&2; exit 1 ;;
esac
(
  cd ui
  ./node_modules/.bin/tsc --module commonjs --moduleResolution node --target es2020 --esModuleInterop --skipLibCheck --outDir "$test_out" src/server/rocmGpu.ts testing/rocmGpu.test.ts
)
test_status=$?
rm -rf -- "$test_out"
exit "$test_status"
```

Expected: compilation fails because `src/server/rocmGpu.ts` does not exist.

- [ ] **Step 3: Commit the RED test**

```bash
git add ui/testing/rocmGpu.test.ts
git commit -m "test: cover ROCm GPU telemetry parsing"
```

### Task 2: Implement ROCm Parsing and GPU API Support

**Files:**
- Create: `ui/src/server/rocmGpu.ts`
- Modify: `ui/src/app/api/gpu/route.ts`
- Modify: `ui/src/types.ts`
- Modify: `ui/src/components/GPUMonitor.tsx`
- Test: `ui/testing/rocmGpu.test.ts`

- [ ] **Step 1: Implement the pure ROCm parser**

Create `ui/src/server/rocmGpu.ts`:

```typescript
import type { GpuInfo } from '../types';

const MIN_TRAINABLE_VRAM_BYTES = 2 * 1024 ** 3;

type RocmCard = Record<string, unknown>;

function numberValue(card: RocmCard, key: string, fallback = 0): number {
  const value = Number.parseFloat(String(card[key] ?? ''));
  return Number.isFinite(value) ? value : fallback;
}

export function parseRocmSmiJson(output: string): GpuInfo[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('Invalid ROCm SMI JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid ROCm SMI JSON');
  }

  return Object.entries(parsed)
    .map(([cardKey, value]) => {
      const match = /^card(\d+)$/.exec(cardKey);
      if (!match || !value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`ROCm card ${cardKey} is missing required fields`);
      }
      const card = value as RocmCard;
      const name = typeof card['Card Series'] === 'string' ? card['Card Series'].trim() : '';
      const totalBytes = numberValue(card, 'VRAM Total Memory (B)', Number.NaN);
      const usedBytes = numberValue(card, 'VRAM Total Used Memory (B)', Number.NaN);
      if (!name || !Number.isFinite(totalBytes) || !Number.isFinite(usedBytes)) {
        throw new Error(`ROCm card ${cardKey} is missing required fields`);
      }

      const total = Math.round(totalBytes / 1024 ** 2);
      const used = Math.round(usedBytes / 1024 ** 2);
      const powerDraw = numberValue(
        card,
        'Average Graphics Package Power (W)',
        numberValue(card, 'Current Socket Graphics Package Power (W)'),
      );

      return {
        totalBytes,
        gpu: {
          index: Number.parseInt(match[1], 10),
          name,
          driverVersion: 'ROCm',
          temperature: numberValue(card, 'Temperature (Sensor edge) (C)'),
          utilization: {
            gpu: numberValue(card, 'GPU use (%)'),
            memory: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
          },
          memory: { total, free: Math.max(0, total - used), used },
          power: { draw: powerDraw, limit: 0 },
          clocks: { graphics: 0, memory: 0 },
          fan: { speed: 0 },
        } satisfies GpuInfo,
      };
    })
    .filter(({ totalBytes }) => totalBytes >= MIN_TRAINABLE_VRAM_BYTES)
    .map(({ gpu }) => gpu)
    .sort((a, b) => a.index - b.index);
}
```

- [ ] **Step 2: Run the parser test GREEN**

Compile the helper and test to a validated `mktemp -d` directory, run the
generated `testing/rocmGpu.test.js`, then remove the temporary directory.

Expected: `ROCm GPU parser tests passed`.

- [ ] **Step 3: Add the backend discriminator**

In `ui/src/types.ts`, add:

```typescript
export type GPUBackend = 'nvidia' | 'rocm' | 'mps' | null;
```

and add `backend: GPUBackend` to `GPUApiResponse`.

- [ ] **Step 4: Integrate ROCm into the GPU route**

In `ui/src/app/api/gpu/route.ts`:

- import `execFile`, promisify it as `execFileAsync`, and import
  `parseRocmSmiJson`;
- add this helper:

```typescript
async function getRocmGpuStats() {
  const { stdout } = await execFileAsync(
    'rocm-smi',
    ['--showproductname', '--showuse', '--showmeminfo', 'vram', '--showtemp', '--showpower', '--json'],
    { encoding: 'utf-8', timeout: 5000, maxBuffer: 1024 * 1024 },
  );
  return parseRocmSmiJson(stdout);
}
```

Add `backend: 'mps'` to successful macOS responses and `backend: null` to the
failed macOS response. Add `backend: 'nvidia'` to the NVIDIA response. When
NVIDIA is unavailable on Linux, call `getRocmGpuStats()` and return:

```typescript
{
  hasNvidiaSmi: false,
  isMac: false,
  backend: 'rocm',
  gpus: rocmGpus,
  ...(rocmGpus.length === 0 ? { error: 'No trainable ROCm GPUs detected' } : {}),
}
```

If ROCm probing fails, return `backend: null`, an empty list, and
`No supported GPU monitoring tool was found`. Add `backend: null` to the route's
500 response and make its log message accelerator-neutral.

- [ ] **Step 5: Make the monitor backend-neutral**

In `ui/src/components/GPUMonitor.tsx`, replace the `!hasNvidiaSmi && !isMac`
branch with `!gpuData.backend`. Use the heading `No supported GPUs detected!`
and text `No supported GPU monitoring tool is available on this system.` Keep
the API error below it. Change the empty-list message to
`No trainable GPUs found for the detected backend.`

- [ ] **Step 6: Type-check and build**

Run from `ui/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0. The known optional `macos-temperature-sensor` warning on
Linux is acceptable.

- [ ] **Step 7: Commit ROCm monitoring**

```bash
git add ui/src/server/rocmGpu.ts ui/src/app/api/gpu/route.ts ui/src/types.ts ui/src/components/GPUMonitor.tsx
git commit -m "feat: monitor ROCm GPUs in the UI"
```

### Task 3: Add Failing GPU-ID Validation Tests

**Files:**
- Create: `ui/testing/jobGpu.test.ts`
- Test: `ui/testing/jobGpu.test.ts`

- [ ] **Step 1: Write the failing validator test**

Create `ui/testing/jobGpu.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { resolveGpuIds } from '../src/server/jobGpu';

assert.equal(resolveGpuIds(null, true), 'mps');
assert.equal(resolveGpuIds(undefined, true), 'mps');
assert.equal(resolveGpuIds(' 0 ', false), '0');
assert.equal(resolveGpuIds('0,1', false), '0,1');
assert.equal(resolveGpuIds(null, false), null);
assert.equal(resolveGpuIds(undefined, false), null);
assert.equal(resolveGpuIds('', false), null);
assert.equal(resolveGpuIds('   ', false), null);

console.log('Job GPU validation tests passed');
```

- [ ] **Step 2: Compile to verify the RED state**

Compile `src/server/jobGpu.ts` and `testing/jobGpu.test.ts` with the disposable
TypeScript test command.

Expected: compilation fails because `src/server/jobGpu.ts` does not exist.

- [ ] **Step 3: Commit the RED test**

```bash
git add ui/testing/jobGpu.test.ts
git commit -m "test: cover job GPU assignment validation"
```

### Task 4: Prevent Null GPU Job Submission

**Files:**
- Create: `ui/src/server/jobGpu.ts`
- Modify: `ui/src/app/api/jobs/route.ts`
- Modify: `ui/src/app/jobs/new/page.tsx`
- Modify: `ui/src/app/jobs/new/SimpleJob.tsx`
- Test: `ui/testing/jobGpu.test.ts`

- [ ] **Step 1: Implement the pure validator**

Create `ui/src/server/jobGpu.ts`:

```typescript
export function resolveGpuIds(value: unknown, mac: boolean): string | null {
  if (mac) return 'mps';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
```

- [ ] **Step 2: Run both helper tests GREEN**

Use the disposable test command in this plan to compile both helpers and test
files, then run both generated tests.

Expected:

```text
ROCm GPU parser tests passed
Job GPU validation tests passed
```

- [ ] **Step 3: Validate at the jobs API boundary**

In `ui/src/app/api/jobs/route.ts`, import `resolveGpuIds` and replace the current
GPU assignment with:

```typescript
const gpu_ids = resolveGpuIds(body.gpu_ids, isMac());
if (gpu_ids === null) {
  return NextResponse.json({ error: 'A GPU selection is required' }, { status: 400 });
}
```

Keep the remaining update/create logic unchanged.

- [ ] **Step 4: Guard and explain the client state**

In `ui/src/app/jobs/new/page.tsx`:

- import `isMac` from `@/helpers/basic`;
- at the start of `saveJob`, before setting status, add:

```typescript
if (!isMac() && gpuIDs === null) {
  alert('No trainable GPU was detected. Verify ROCm or NVIDIA GPU monitoring before creating a job.');
  return;
}
```

- define `const noGpuAvailable = isGPUInfoLoaded && !isMac() && gpuList.length === 0;`;
- disable the top Create/Update button when saving or `noGpuAvailable`;
- immediately below the hidden file input, render this when `noGpuAvailable`:

```tsx
<div className="mx-4 mt-4 rounded border border-yellow-700 bg-yellow-900 px-4 py-3 text-yellow-200">
  No trainable GPU was detected. Verify ROCm or NVIDIA GPU monitoring before creating a job.
</div>
```

- change the advanced selector options to labels of
  ``GPU #${gpu.index} — ${gpu.name}``.

In `ui/src/app/jobs/new/SimpleJob.tsx`, make the same full-name label change.

- [ ] **Step 5: Type-check and build**

Run from `ui/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0 with only the accepted optional macOS sensor warning.

- [ ] **Step 6: Commit safe job submission**

```bash
git add ui/src/server/jobGpu.ts ui/src/app/api/jobs/route.ts ui/src/app/jobs/new/page.tsx ui/src/app/jobs/new/SimpleJob.tsx
git commit -m "fix: require a detected GPU for jobs"
```

### Task 5: Live ROCm and Failure-Path Verification

**Files:**
- Verify: `ui/src/app/api/gpu/route.ts`
- Verify: `ui/src/app/api/jobs/route.ts`
- Verify: repository state

- [ ] **Step 1: Run all pure tests and production build**

Run the disposable helper-test command, `npx tsc --noEmit`, and `npm run build`.

Expected: both helper tests pass, type-check exits 0, and the production build
completes.

- [ ] **Step 2: Start the built UI on an alternate port**

From the repository root, start only the built file server on port 8765:

```bash
server_log="$(mktemp)"
(
  cd ui
  node dist/cron/fileServer.js start --port 8765
) >"$server_log" 2>&1 &
server_pid=$!
for attempt in $(seq 1 30); do
  curl -fsS http://localhost:8765/api/gpu >/dev/null 2>&1 && break
  sleep 1
done
kill -0 "$server_pid"
```

Keep its process ID and terminate only that process after verification. Do not
stop the user's existing server on port 8675.

- [ ] **Step 3: Verify live ROCm output**

Run:

```bash
curl -fsS http://localhost:8765/api/gpu
```

Expected JSON has `backend: "rocm"`, one GPU only, index `0`, name
`AMD Radeon RX 7900 XTX`, approximately 24560 MiB total memory, and no Ryzen
integrated GPU.

- [ ] **Step 4: Verify missing GPU IDs fail before Prisma**

Run:

```bash
verify_name="codex-null-gpu-verification-$(date +%s)-$$"
response_file="$(mktemp)"
http_code="$(curl -sS -o "$response_file" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$verify_name\",\"gpu_ids\":null,\"job_config\":{}}" \
  http://localhost:8765/api/jobs)"
test "$http_code" = 400
test "$(cat "$response_file")" = '{"error":"A GPU selection is required"}'
curl -fsS http://localhost:8765/api/jobs | grep -Fq "$verify_name" && exit 1 || true
rm -f -- "$response_file"
```

Expected: HTTP 400 with `{"error":"A GPU selection is required"}`. Confirm no
job with that unique name exists through `GET /api/jobs`; because validation
precedes Prisma, no cleanup should be needed.

- [ ] **Step 5: Stop the alternate server and verify cleanliness**

Terminate only the saved alternate-server PID, wait for it to exit, remove its
temporary log, then run:

```bash
kill "$server_pid"
wait "$server_pid" || true
rm -f -- "$server_log"
git diff --check
git status --short
```

Expected: no generated tracked changes and a clean feature branch.

- [ ] **Step 6: Do not commit verification artifacts**

No commit is expected for this task. If verification requires tracked changes,
return to root-cause analysis rather than bundling an unplanned adjustment.
