import assert from 'node:assert/strict';
import {
  createMaskHistory,
  isAllWhite,
  paintStroke,
  screenToImage,
  createWhiteMask,
  fitMaskView,
  panMaskView,
  invertMask,
  masksEqual,
  clampMaskImageIndex,
  maskSaveMethod,
  maskEditorShortcut,
  canvasBackingSize,
  createMaskRequestGate,
  frozenMaskUrlsFromManifest,
} from '../src/helpers/maskEditor';

assert.deepEqual(screenToImage({ x: 34, y: 26 }, { zoom: 2, offsetX: 10, offsetY: 6 }), { x: 12, y: 10 });
assert.throws(() => screenToImage({ x: 0, y: 0 }, { zoom: 0, offsetX: 0, offsetY: 0 }), /zoom/i);

const white = (length: number): Uint8ClampedArray => new Uint8ClampedArray(length).fill(255);

const clipped = paintStroke(white(9), 3, 3, { x: 0, y: 0 }, { x: 0, y: 0 }, {
  value: 0,
  size: 3,
  hardness: 1,
  opacity: 1,
});
assert.deepEqual([...clipped], [0, 0, 255, 0, 0, 255, 255, 255, 255]);

const soft = paintStroke(white(25), 5, 5, { x: 2, y: 2 }, { x: 2, y: 2 }, {
  value: 0,
  size: 5,
  hardness: 0,
  opacity: 1,
});
assert.equal(soft[2 * 5 + 2], 0);
assert.ok(soft[2 * 5 + 3] > 0 && soft[2 * 5 + 3] < 255);
assert.ok(soft[2 * 5] > soft[2 * 5 + 3]);
assert.equal(soft[0], 255);

const half = paintStroke(new Uint8ClampedArray([200]), 1, 1, { x: 0, y: 0 }, { x: 0, y: 0 }, {
  value: 100,
  size: 1,
  hardness: 1,
  opacity: 0.25,
});
assert.deepEqual([...half], [175]);

const translucentStroke = paintStroke(white(7), 7, 1, { x: 0, y: 0 }, { x: 6, y: 0 }, {
  value: 0,
  size: 1,
  hardness: 1,
  opacity: 0.5,
});
assert.deepEqual(
  [...translucentStroke],
  [128, 128, 128, 128, 128, 128, 128],
  'interpolated dabs contribute opacity only once per pixel',
);

const floatingAllocations: number[] = [];
const float32Descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Float32Array')!;
const float64Descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Float64Array')!;
const observeAllocations = <T extends Float32ArrayConstructor | Float64ArrayConstructor>(constructor: T): T => new Proxy(
  constructor,
  {
    construct(target, argumentsList) {
      if (typeof argumentsList[0] === 'number') floatingAllocations.push(argumentsList[0]);
      return Reflect.construct(target, argumentsList);
    },
  },
);
const largeMask = white(1_000_000);
try {
  Object.defineProperty(globalThis, 'Float32Array', { ...float32Descriptor, value: observeAllocations(Float32Array) });
  Object.defineProperty(globalThis, 'Float64Array', { ...float64Descriptor, value: observeAllocations(Float64Array) });
  const narrowStroke = paintStroke(largeMask, 1000, 1000, { x: 10, y: 10 }, { x: 20, y: 10 }, {
    value: 0,
    size: 3,
    hardness: 1,
    opacity: 0.5,
  });
  assert.equal(narrowStroke[10 * 1000 + 15], 128);
  assert.equal(largeMask[10 * 1000 + 15], 255);
} finally {
  Object.defineProperty(globalThis, 'Float32Array', float32Descriptor);
  Object.defineProperty(globalThis, 'Float64Array', float64Descriptor);
}
assert.ok(Math.max(0, ...floatingAllocations) < 1000, 'coverage allocation is restricted to the stroke bounds');

const erased = paintStroke(new Uint8ClampedArray([0]), 1, 1, { x: 0, y: 0 }, { x: 0, y: 0 }, {
  value: 255,
  size: 1,
  hardness: 1,
  opacity: 1,
});
assert.deepEqual([...erased], [255]);
assert.equal(isAllWhite(erased), true);
assert.equal(isAllWhite(new Uint8ClampedArray([255, 254])), false);

const source = white(7);
const continuous = paintStroke(source, 7, 1, { x: 0, y: 0 }, { x: 6, y: 0 }, {
  value: 0,
  size: 1,
  hardness: 1,
  opacity: 1,
});
assert.deepEqual([...continuous], [0, 0, 0, 0, 0, 0, 0]);
assert.deepEqual([...source], [255, 255, 255, 255, 255, 255, 255]);
assert.notEqual(continuous, source);

assert.throws(
  () => paintStroke(white(3), 2, 2, { x: 0, y: 0 }, { x: 0, y: 0 }, { value: 0, size: 1, hardness: 1, opacity: 1 }),
  /dimensions|length/i,
);

const initial = new Uint8ClampedArray([255]);
const history = createMaskHistory(initial, 2);
assert.throws(() => history.push(new Uint8ClampedArray([255, 255])), /length/i);
assert.deepEqual([...history.current()], [255]);
assert.equal(history.canUndo(), false);
history.push(new Uint8ClampedArray([200]));
history.push(new Uint8ClampedArray([100]));
history.push(new Uint8ClampedArray([0]));
assert.equal(history.canUndo(), true);
assert.deepEqual([...history.undo()], [100]);

assert.deepEqual([...createWhiteMask(2, 2)], [255, 255, 255, 255], 'missing masks initialize white in memory');
assert.deepEqual([...invertMask(new Uint8ClampedArray([0, 64, 255]))], [255, 191, 0]);
assert.equal(masksEqual(new Uint8ClampedArray([1, 2]), new Uint8ClampedArray([1, 2])), true);
assert.equal(masksEqual(new Uint8ClampedArray([1, 2]), new Uint8ClampedArray([1, 3])), false);
assert.equal(maskSaveMethod(createWhiteMask(1, 1)), 'DELETE', 'white masks remove storage instead of writing');
assert.equal(maskSaveMethod(new Uint8ClampedArray([254])), 'PUT');
assert.equal(clampMaskImageIndex(-1, 3), 0);
assert.equal(clampMaskImageIndex(9, 3), 2);
assert.equal(clampMaskImageIndex(0, 0), -1);
assert.deepEqual(fitMaskView({ width: 400, height: 200 }, { width: 200, height: 200 }), { zoom: 0.5, offsetX: 0, offsetY: 50 });
assert.deepEqual(panMaskView({ zoom: 2, offsetX: 10, offsetY: 20 }, 5, -4), { zoom: 2, offsetX: 15, offsetY: 16 });
assert.deepEqual(screenToImage({ x: 115, y: 66 }, { zoom: 2, offsetX: 15, offsetY: 16 }), { x: 50, y: 25 });
assert.equal(maskEditorShortcut({ key: 'ArrowRight', ctrlKey: false, metaKey: false, shiftKey: false }), 'next');
assert.equal(maskEditorShortcut({ key: 'b', ctrlKey: false, metaKey: false, shiftKey: false }), 'paint');
assert.equal(maskEditorShortcut({ key: 'e', ctrlKey: false, metaKey: false, shiftKey: false }), 'erase');
assert.equal(maskEditorShortcut({ key: '0', ctrlKey: false, metaKey: false, shiftKey: false }), 'fit');
assert.equal(maskEditorShortcut({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: true }), 'redo');
assert.deepEqual(canvasBackingSize({ width: 320, height: 200 }, 2), { width: 640, height: 400 });
assert.deepEqual(canvasBackingSize({ width: 320, height: 200 }, 0), { width: 320, height: 200 });
const maskRequests = createMaskRequestGate();
const oldMaskRequest = maskRequests.begin();
const currentMaskRequest = maskRequests.begin();
assert.equal(oldMaskRequest.isCurrent(), false, 'a new image invalidates its predecessor load/save');
assert.equal(currentMaskRequest.isCurrent(), true);
maskRequests.cancel();
assert.equal(currentMaskRequest.isCurrent(), false, 'closing the editor invalidates pending async work');
assert.deepEqual(frozenMaskUrlsFromManifest('version 1', [{ source_path: 'a.png', mask_managed_path: 'masks/a.png' }, { source_path: 'b.png' }, { source_path: 'c.png', frozen_mask_url: '/immutable/c' }]), {
  'a.png': '/api/dataset-preset-versions/version%201/files?path=masks%2Fa.png', 'c.png': '/immutable/c',
});
assert.deepEqual([...history.undo()], [200]);
assert.deepEqual([...history.undo()], [200]);
assert.equal(history.canUndo(), false);
assert.equal(history.canRedo(), true);
assert.deepEqual([...history.redo()], [100]);
history.push(new Uint8ClampedArray([75]));
assert.equal(history.canRedo(), false);
assert.deepEqual([...history.redo()], [75]);
initial[0] = 0;
assert.deepEqual([...history.undo()], [100]);
