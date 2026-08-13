export type Point = Readonly<{ x: number; y: number }>;

export type MaskBrush = Readonly<{
  value: number;
  size: number;
  hardness: number;
  opacity: number;
}>;

export type MaskHistory = Readonly<{
  current(): Uint8ClampedArray;
  push(mask: Uint8ClampedArray): Uint8ClampedArray;
  undo(): Uint8ClampedArray;
  redo(): Uint8ClampedArray;
  canUndo(): boolean;
  canRedo(): boolean;
}>;

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

export function screenToImage(
  point: Point,
  transform: Readonly<{ zoom: number; offsetX: number; offsetY: number }>,
): Point {
  requireFinite('point.x', point.x);
  requireFinite('point.y', point.y);
  requireFinite('zoom', transform.zoom);
  requireFinite('offsetX', transform.offsetX);
  requireFinite('offsetY', transform.offsetY);
  if (transform.zoom <= 0) throw new RangeError('zoom must be greater than zero');
  return {
    x: (point.x - transform.offsetX) / transform.zoom,
    y: (point.y - transform.offsetY) / transform.zoom,
  };
}

function validatePaint(mask: Uint8ClampedArray, width: number, height: number, brush: MaskBrush): void {
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new RangeError('mask dimensions must be positive integers');
  }
  if (mask.length !== width * height) throw new RangeError('mask length does not match dimensions');
  requireFinite('brush value', brush.value);
  requireFinite('brush size', brush.size);
  requireFinite('brush hardness', brush.hardness);
  requireFinite('brush opacity', brush.opacity);
  if (brush.value < 0 || brush.value > 255) throw new RangeError('brush value must be between 0 and 255');
  if (brush.size <= 0) throw new RangeError('brush size must be greater than zero');
  if (brush.hardness < 0 || brush.hardness > 1) throw new RangeError('brush hardness must be between 0 and 1');
  if (brush.opacity < 0 || brush.opacity > 1) throw new RangeError('brush opacity must be between 0 and 1');
}

export function paintStroke(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  from: Point,
  to: Point,
  brush: MaskBrush,
): Uint8ClampedArray {
  validatePaint(mask, width, height, brush);
  requireFinite('from.x', from.x);
  requireFinite('from.y', from.y);
  requireFinite('to.x', to.x);
  requireFinite('to.y', to.y);

  const result = new Uint8ClampedArray(mask);
  const radius = brush.size / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.ceil(distance / Math.max(radius / 2, 0.25));

  for (let step = 0; step <= steps; step += 1) {
    const progress = steps === 0 ? 0 : step / steps;
    const centerX = from.x + dx * progress;
    const centerY = from.y + dy * progress;
    const minX = Math.max(0, Math.ceil(centerX - radius));
    const maxX = Math.min(width - 1, Math.floor(centerX + radius));
    const minY = Math.max(0, Math.ceil(centerY - radius));
    const maxY = Math.min(height - 1, Math.floor(centerY + radius));
    const solidRadius = radius * brush.hardness;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const pixelDistance = Math.hypot(x - centerX, y - centerY);
        if (pixelDistance > radius) continue;
        const falloff = pixelDistance <= solidRadius || solidRadius === radius
          ? 1
          : (radius - pixelDistance) / (radius - solidRadius);
        const index = y * width + x;
        const alpha = brush.opacity * falloff;
        result[index] = Math.round(result[index] + (brush.value - result[index]) * alpha);
      }
    }
  }
  return result;
}

export function isAllWhite(mask: Uint8ClampedArray): boolean {
  return mask.every(value => value === 255);
}

export function createMaskHistory(initial: Uint8ClampedArray, limit = 20): MaskHistory {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('history limit must be a positive integer');
  let snapshots = [new Uint8ClampedArray(initial)];
  let index = 0;
  const copyCurrent = (): Uint8ClampedArray => new Uint8ClampedArray(snapshots[index]);

  return {
    current: copyCurrent,
    push(mask) {
      snapshots = snapshots.slice(0, index + 1);
      snapshots.push(new Uint8ClampedArray(mask));
      if (snapshots.length > limit + 1) snapshots.shift();
      index = snapshots.length - 1;
      return copyCurrent();
    },
    undo() {
      if (index > 0) index -= 1;
      return copyCurrent();
    },
    redo() {
      if (index < snapshots.length - 1) index += 1;
      return copyCurrent();
    },
    canUndo: () => index > 0,
    canRedo: () => index < snapshots.length - 1,
  };
}
