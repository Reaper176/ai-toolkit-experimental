import assert from 'node:assert/strict';
import {
  createMaskHistory,
  isAllWhite,
  paintStroke,
  screenToImage,
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
