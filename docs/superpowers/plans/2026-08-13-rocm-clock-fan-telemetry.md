# ROCm Clock and Fan Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display live AMD GPU graphics/memory clocks and correctly labeled fan RPM in the existing GPU widget.

**Architecture:** Extend the existing ROCm JSON query with `--showmetrics`, then normalize its optional metrics in the pure ROCm parser. Add a backward-compatible fan unit to `GpuInfo` and centralize its display formatting in the existing GPU helper.

**Tech Stack:** TypeScript, Next.js route handlers, ROCm SMI JSON, Node assertion tests, React.

---

### Task 1: Define ROCm telemetry behavior

**Files:**
- Modify: `ui/testing/rocmGpu.test.ts`
- Modify: `ui/testing/gpuResponse.test.ts`

- [ ] **Step 1: Write failing parser assertions**

Add `current_gfxclk (MHz)`, `current_uclk (MHz)`, and `current_fan_speed (rpm)` to the representative card and expect:

```typescript
clocks: { graphics: 1295, memory: 1249 },
fan: { speed: 875, unit: 'RPM' },
```

Keep sparse-card assertions expecting zero clocks and zero RPM.

- [ ] **Step 2: Write failing fan formatting assertions**

Import `formatGpuFan` from `src/helpers/gpu` and assert:

```typescript
assert.equal(formatGpuFan({ speed: 875, unit: 'RPM' }), '875 RPM');
assert.equal(formatGpuFan({ speed: 42 }), '42%');
```

- [ ] **Step 3: Run the focused compilation/tests and verify RED**

Compile the pure helpers and tests into a disposable directory under `/tmp`, then run both generated test files. Expected failures are mismatched hardcoded ROCm zero values and the missing `formatGpuFan` export.

### Task 2: Normalize metrics and units

**Files:**
- Modify: `ui/src/types.ts`
- Modify: `ui/src/server/rocmGpu.ts`
- Modify: `ui/src/helpers/gpu.ts`
- Modify: `ui/src/app/api/gpu/route.ts`
- Modify: `ui/src/components/GPUWidget.tsx`

- [ ] **Step 1: Extend the fan contract**

Add an optional `unit?: '%' | 'RPM'` to `GpuFan`. The optional form preserves compatibility with existing callers.

- [ ] **Step 2: Parse ROCm metrics**

Populate clocks from `current_gfxclk (MHz)` and `current_uclk (MHz)`, and populate fan speed from `current_fan_speed (rpm)` with unit `RPM`. Continue using `numberValue`, which safely maps missing and `N/A` values to zero.

- [ ] **Step 3: Request metrics and label every backend**

Append `--showmetrics` to the ROCm SMI argument list. Mark NVIDIA fan output as `%` and macOS fan output as `RPM`.

- [ ] **Step 4: Render fan units through the helper**

Implement:

```typescript
export function formatGpuFan(fan: GpuFan): string {
  const unit = fan.unit ?? '%';
  return unit === '%' ? `${fan.speed}%` : `${fan.speed} ${unit}`;
}
```

Use `formatGpuFan(gpu.fan)` in `GPUWidget`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Repeat the disposable focused test command. Expected output includes `ROCm GPU parser tests passed` and `GPU response tests passed`.

### Task 3: Verify integration and publish

**Files:**
- Verify all modified source and test files.

- [ ] **Step 1: Run relevant test suites**

Run the focused GPU tests and the repository's existing dataset/training tests affected by shared UI types.

- [ ] **Step 2: Run the production build**

Run `npm run build` in `ui/`. Expected: successful Next.js build; the known optional `macos-temperature-sensor` warning may remain on Linux.

- [ ] **Step 3: Verify live ROCm output**

Run the same combined `rocm-smi` arguments used by the route and feed the JSON to the parser path. Confirm graphics and memory clocks are nonzero when reported, and fan RPM matches the kernel's current zero-RPM or active-fan state.

- [ ] **Step 4: Commit and push**

Commit the tested implementation and push `main` to `origin` without force.

