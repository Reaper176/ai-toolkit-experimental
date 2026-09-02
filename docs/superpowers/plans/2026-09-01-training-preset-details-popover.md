# Training Preset Details Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the training-preset selector usable after applying a built-in preset by moving its long guidance into a responsive, explicitly toggled popover.

**Architecture:** `TrainingPresetControl` remains the owner of the selected preset and adds only popover visibility, identity, and dismissal state. `TrainingPresetSelect` and `TrainingPresetDetails` keep their existing responsibilities; the details component is rendered inside an absolutely positioned, viewport-bounded region instead of inline toolbar flow.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, `react-test-renderer`, Node test assertions, existing training-preset test runner.

---

### Task 1: Replace inline guidance with a controlled details popover

**Files:**
- Modify: `ui/src/components/TrainingPresetControl.tsx`
- Test: `ui/testing/trainingPresetControl.test.tsx`

- [ ] **Step 1: Write the failing default/toggle/update tests**

Extend the built-in preset lifecycle block in `trainingPresetControl.test.tsx`. Add the second compatible FLUX built-in to the API fixture, then replace the existing immediate-details assertion with these assertions:

```tsx
const builtinFluxStyle = materializeBuiltInTrainingPresetRow(BUILT_IN_PRESET_ROWS[5]);

const builtinApi: TrainingPresetApi = {
  get: async () => ({
    data: {
      presets: [personal, builtinWan, builtinFlux, builtinFluxStyle, ...(savedFromBuiltin ? [savedFromBuiltin] : [])],
    },
  }),
  post: async (_url, body) => {
    builtinPostBody = body;
    savedFromBuiltin = record('saved-from-builtin', 'Saved from built-in');
    return { data: savedFromBuiltin };
  },
  put: async () => {
    throw new Error('built-ins must not PUT');
  },
  delete: async () => {
    throw new Error('built-ins must not DELETE');
  },
};

assert.equal(builtinRoot.findAllByProps({ 'data-preset-details-region': true }).length, 0);
const detailsButton = builtinRoot.findByProps({ 'aria-label': 'Show preset details' });
assert.equal(detailsButton.props['aria-expanded'], false);
assert.equal(select(builtinRoot).props.disabled, false);

act(() => detailsButton.props.onClick());
const detailsRegion = builtinRoot.findByProps({ 'data-preset-details-region': true });
assert.equal(detailsButton.props['aria-expanded'], true);
assert.equal(detailsButton.props['aria-controls'], detailsRegion.props.id);
assert.equal(detailsRegion.props.role, 'region');
assert.equal(builtinRoot.findByProps({ 'data-preset-summary': true }).children.join(''), builtinFlux.summary);
assert.equal(select(builtinRoot).props.disabled, false, 'open guidance never disables the preset selector');

act(() => detailsButton.props.onClick());
assert.equal(builtinRoot.findAllByProps({ 'data-preset-details-region': true }).length, 0);
assert.equal(detailsButton.props['aria-expanded'], false);
act(() => detailsButton.props.onClick());
assert.equal(builtinRoot.findAllByProps({ 'data-preset-details-region': true }).length, 1);

act(() =>
  select(builtinRoot).props.onChange({ currentTarget: { value: presetValue(builtinFluxStyle.id) } }),
);
await act(async () => builtinRenderer.update(builtinElement(builtinChanges.at(-1)!)));
assert.equal(
  builtinRoot.findByProps({ 'data-preset-summary': true }).children.join(''),
  builtinFluxStyle.summary,
  'an open card follows a newly selected compatible built-in',
);

act(() => select(builtinRoot).props.onChange({ currentTarget: { value: presetValue(personal.id) } }));
assert.equal(builtinRoot.findAllByProps({ 'aria-label': 'Show preset details' }).length, 0);
assert.equal(builtinRoot.findAllByProps({ 'data-preset-details-region': true }).length, 0);
```

- [ ] **Step 2: Run the preset suite and verify RED**

Run from `ui/`:

```bash
npm run test:training-presets
```

Expected: FAIL in `trainingPresetControl.test.tsx` because details are still rendered inline and no `Show preset details` button or region exists.

- [ ] **Step 3: Implement the minimal controlled popover**

In `TrainingPresetControl.tsx`, import `useId`, add visibility state and a stable region ID, and use one shared disabled expression:

```tsx
import React, {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type ComponentType,
} from 'react';

const [detailsOpen, setDetailsOpen] = useState(false);
const detailsId = useId();
const interactionDisabled = disabled || loading || pending || dialog.kind !== 'closed';
```

When a selected preset is not a compatible built-in, close details without changing any preset application behavior:

```tsx
useEffect(() => {
  if (selectedBuiltIn === undefined) setDetailsOpen(false);
}, [selectedBuiltIn]);
```

Move the existing `selectedBuiltIn` derivation above that effect. In the incompatible built-in branch and after successfully selecting a user preset, also close synchronously:

```tsx
if (preset.source === 'builtin' && preset.model_arch !== jobConfigRef.current.config.process[0].model.arch) {
  setSelectedPresetId(null);
  setDetailsOpen(false);
  return;
}
try {
  const transaction = preparePresetApplication(jobConfigRef.current, preset, migrateRef.current);
  changeRef.current(transaction.jobConfig);
  setUndoConfig(transaction.undoConfig);
  setSelectedPresetId(preset.id);
  if (preset.source === 'user') setDetailsOpen(false);
  setError(null);
} catch (applyError) {
  setError(localError('Could not apply training preset', applyError));
}
```

Replace the inline details render with a relatively positioned wrapper, toggle, and anchored region:

```tsx
<div className="relative flex flex-wrap items-center gap-2">
  <TrainingPresetSelect
    presets={presets}
    selectedPresetId={selectedPresetId}
    currentModelArch={jobConfig.config.process[0].model.arch}
    canUndo={undoConfig !== null}
    disabled={interactionDisabled}
    onSelect={handleSelection}
  />
  {selectedBuiltIn?.source === 'builtin' && (
    <button
      type="button"
      aria-label="Show preset details"
      aria-expanded={detailsOpen}
      aria-controls={detailsId}
      disabled={interactionDisabled}
      className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 disabled:opacity-50"
      onClick={() => setDetailsOpen(open => !open)}
    >
      Details
    </button>
  )}
  {selectedBuiltIn?.source === 'builtin' && detailsOpen && (
    <div
      id={detailsId}
      role="region"
      aria-label="Selected preset details"
      data-preset-details-region
      className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto rounded shadow-xl"
    >
      <TrainingPresetDetails preset={selectedBuiltIn} />
    </div>
  )}
</div>
```

Keep the control's existing loading/pending status, error/retry block, and `Dialog` render as siblings inside this same wrapper after the new region.

- [ ] **Step 4: Run the preset suite and verify GREEN**

Run:

```bash
npm run test:training-presets
```

Expected: PASS, including `training preset controller lifecycle tests passed`, catalog TAP 63/63, and Python mapping 24/24.

- [ ] **Step 5: Commit the core popover**

```bash
git add ui/src/components/TrainingPresetControl.tsx ui/testing/trainingPresetControl.test.tsx
git commit -m "fix: keep preset details clear of selector"
```

### Task 2: Add outside-click and Escape dismissal

**Files:**
- Modify: `ui/src/components/TrainingPresetControl.tsx`
- Test: `ui/testing/trainingPresetControl.test.tsx`

- [ ] **Step 1: Write the failing dismissal tests**

Before the test's existing `try` block, install a minimal fake document that records `pointerdown` and `keydown` listeners, and give the popover wrapper a node mock with a deterministic `contains` method:

```tsx
type CapturedListener = EventListenerOrEventListenerObject;
const documentListeners = new Map<string, CapturedListener>();
const browserGlobal = globalThis as typeof globalThis & { document?: Document };
const originalDocument = browserGlobal.document;
const insideTarget = {};
const outsideTarget = {};
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    addEventListener: (type: string, listener: CapturedListener) => documentListeners.set(type, listener),
    removeEventListener: (type: string, listener: CapturedListener) => {
      if (documentListeners.get(type) === listener) documentListeners.delete(type);
    },
  },
});

const dispatchDocumentEvent = (type: string, event: object) => {
  const listener = documentListeners.get(type);
  assert.ok(listener, `${type} listener is registered while details are open`);
  if (typeof listener === 'function') listener(event as Event);
  else listener.handleEvent(event as Event);
};
```

Create the built-in renderer with:

```tsx
builtinRenderer = TestRenderer.create(builtinElement(builtinInitial), {
  createNodeMock: element =>
    element.props['data-training-preset-control']
      ? { contains: (target: unknown) => target === insideTarget }
      : {},
});
```

After opening details, prove inside interaction does not close it, then prove outside interaction and Escape do:

```tsx
act(() => dispatchDocumentEvent('pointerdown', { target: insideTarget }));
assert.equal(builtinRoot.findAllByProps({ 'data-preset-details-region': true }).length, 1);

act(() => dispatchDocumentEvent('pointerdown', { target: outsideTarget }));
assert.equal(builtinRoot.findAllByProps({ 'data-preset-details-region': true }).length, 0);

act(() => builtinRoot.findByProps({ 'aria-label': 'Show preset details' }).props.onClick());
act(() => dispatchDocumentEvent('keydown', { key: 'Escape' }));
assert.equal(builtinRoot.findAllByProps({ 'data-preset-details-region': true }).length, 0);
```

Assert the listener map is empty after unmount, then restore `globalThis.document` in the test's existing `finally` block:

```tsx
assert.equal(documentListeners.size, 0);
if (originalDocument === undefined) delete browserGlobal.document;
else {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
}
```

- [ ] **Step 2: Run the preset suite and verify RED**

Run:

```bash
npm run test:training-presets
```

Expected: FAIL because no document dismissal listeners are registered.

- [ ] **Step 3: Implement guarded document dismissal**

Add a control ref and attach it to the existing relative wrapper:

```tsx
const controlRef = useRef<HTMLDivElement>(null);

<div ref={controlRef} data-training-preset-control className="relative flex flex-wrap items-center gap-2">
```

Register listeners only while the region is open. Use the wrapper containment check so interactions with the selector, toggle, or details card never close the card before their own event handling:

```tsx
useEffect(() => {
  if (!detailsOpen || typeof document === 'undefined') return;

  const handlePointerDown = (event: PointerEvent) => {
    if (event.target !== null && !controlRef.current?.contains(event.target as Node)) {
      setDetailsOpen(false);
    }
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setDetailsOpen(false);
  };

  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [detailsOpen]);
```

- [ ] **Step 4: Run the preset suite and verify GREEN**

Run:

```bash
npm run test:training-presets
```

Expected: PASS with the document listener map empty after the control unmounts.

- [ ] **Step 5: Commit dismissal behavior**

```bash
git add ui/src/components/TrainingPresetControl.tsx ui/testing/trainingPresetControl.test.tsx
git commit -m "fix: dismiss preset details popover"
```

### Task 3: Verify the integrated UI change

**Files:**
- Verify only; modify files only for a focused correction exposed by these checks.

- [ ] **Step 1: Run the full training-preset gate**

Run from `ui/`:

```bash
npm run test:training-presets
```

Expected: PASS; catalog TAP 63/63, service/route/Prisma/UI lifecycle phases, and Python mapping 24/24 all pass.

- [ ] **Step 2: Run the smoke-required book gate**

Run:

```bash
npm run test:training-book
```

Expected: PASS with the package expanding to `runTrainingBookTests.mjs --require-smoke`.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS and generate all 28 static pages. The known optional `macos-temperature-sensor` warning may remain on Linux.

- [ ] **Step 4: Confirm generated files and Git cleanliness**

Run from the repository root:

```bash
python scripts/generate_training_book_reference.py --check
python scripts/generate_training_book_navigation.py --check
git diff --check
git status --short --branch
```

Expected: both generator checks and `git diff --check` exit 0; status contains only the branch header after the two implementation commits.
