export type Point = Readonly<{ x: number; y: number }>;
export type MaskView = Readonly<{ zoom: number; offsetX: number; offsetY: number }>;
export type MaskEditorShortcut = 'save' | 'undo' | 'redo' | 'close' | 'previous' | 'next' | 'paint' | 'erase' | 'zoom-in' | 'zoom-out' | 'fit' | null;

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

/**
 * Paints one geometric segment with at most one opacity contribution per pixel.
 * Opacity is applied per segment; callers may separately implement path-level
 * accumulation when they need one contribution across multiple pointer events.
 */
export function paintStroke(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  from: Point,
  to: Point,
  brush: MaskBrush,
): Uint8ClampedArray {
  return paintStrokeResult(mask, width, height, from, to, brush, new Uint8ClampedArray(mask));
}

export function paintStrokeInPlace(mask: Uint8ClampedArray, width: number, height: number, from: Point, to: Point, brush: MaskBrush): Uint8ClampedArray {
  return paintStrokeResult(mask, width, height, from, to, brush, mask);
}

function paintStrokeResult(mask: Uint8ClampedArray, width: number, height: number, from: Point, to: Point, brush: MaskBrush, result: Uint8ClampedArray): Uint8ClampedArray {
  validatePaint(mask, width, height, brush);
  requireFinite('from.x', from.x);
  requireFinite('from.y', from.y);
  requireFinite('to.x', to.x);
  requireFinite('to.y', to.y);

  const radius = brush.size / 2;
  const coverageMinX = Math.max(0, Math.ceil(Math.min(from.x, to.x) - radius));
  const coverageMaxX = Math.min(width - 1, Math.floor(Math.max(from.x, to.x) + radius));
  const coverageMinY = Math.max(0, Math.ceil(Math.min(from.y, to.y) - radius));
  const coverageMaxY = Math.min(height - 1, Math.floor(Math.max(from.y, to.y) + radius));
  if (coverageMinX > coverageMaxX || coverageMinY > coverageMaxY) return result;
  const coverageWidth = coverageMaxX - coverageMinX + 1;
  const coverageHeight = coverageMaxY - coverageMinY + 1;
  const coverage = new Float32Array(coverageWidth * coverageHeight);
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
        const coverageIndex = (y - coverageMinY) * coverageWidth + x - coverageMinX;
        coverage[coverageIndex] = Math.max(coverage[coverageIndex], falloff);
      }
    }
  }

  for (let y = coverageMinY; y <= coverageMaxY; y += 1) {
    for (let x = coverageMinX; x <= coverageMaxX; x += 1) {
      const index = y * width + x;
      const coverageIndex = (y - coverageMinY) * coverageWidth + x - coverageMinX;
      const alpha = brush.opacity * coverage[coverageIndex];
      result[index] = Math.round(result[index] + (brush.value - result[index]) * alpha);
    }
  }
  return result;
}

export function isAllWhite(mask: Uint8ClampedArray): boolean {
  return mask.every(value => value === 255);
}

export function createWhiteMask(width: number, height: number): Uint8ClampedArray {
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) throw new RangeError('mask dimensions must be positive integers');
  return new Uint8ClampedArray(width * height).fill(255);
}

export function masksEqual(left: Uint8ClampedArray, right: Uint8ClampedArray): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function invertMask(mask: Uint8ClampedArray): Uint8ClampedArray {
  return Uint8ClampedArray.from(mask, value => 255 - value);
}

export function maskSaveMethod(mask: Uint8ClampedArray): 'PUT' | 'DELETE' {
  return isAllWhite(mask) ? 'DELETE' : 'PUT';
}

export function clampMaskImageIndex(index: number, count: number): number {
  if (count <= 0) return -1;
  return Math.max(0, Math.min(count - 1, index));
}

export function fitMaskView(source: Readonly<{ width: number; height: number }>, viewport: Readonly<{ width: number; height: number }>): MaskView {
  if (source.width <= 0 || source.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return { zoom: 1, offsetX: 0, offsetY: 0 };
  const zoom = Math.min(viewport.width / source.width, viewport.height / source.height);
  return { zoom, offsetX: (viewport.width - source.width * zoom) / 2, offsetY: (viewport.height - source.height * zoom) / 2 };
}

export function panMaskView(view: MaskView, dx: number, dy: number): MaskView {
  return { ...view, offsetX: view.offsetX + dx, offsetY: view.offsetY + dy };
}

export function canvasBackingSize(size: Readonly<{ width: number; height: number }>, devicePixelRatio: number, maxDimension = 4096, maxPixels = 4_194_304): { width: number; height: number } {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  let width = Math.max(1, Math.round(size.width * ratio)); let height = Math.max(1, Math.round(size.height * ratio));
  const scale = Math.min(1, maxDimension / width, maxDimension / height, Math.sqrt(maxPixels / (width * height)));
  width = Math.max(1, Math.floor(width * scale)); height = Math.max(1, Math.floor(height * scale));
  return { width, height };
}

export function createMaskRequestGate(): { begin(): { isCurrent(): boolean }; cancel(): void } {
  let generation = 0;
  return {
    begin() { const mine = ++generation; return { isCurrent: () => mine === generation }; },
    cancel() { generation += 1; },
  };
}

export function frozenMaskUrlsFromManifest(versionId: string, files: readonly unknown[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const untrusted of files) {
    if (!untrusted || typeof untrusted !== 'object') continue;
    const file = untrusted as Record<string, unknown>;
    if (typeof file.source_path !== 'string') continue;
    if (file.mask_missing === true || typeof file.mask_path !== 'string') continue;
    result[file.source_path] = `/api/dataset-preset-versions/${encodeURIComponent(versionId)}/files?path=${encodeURIComponent(file.mask_path)}`;
  }
  return result;
}

export function maskEditorShortcut(event: Readonly<{ key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }>): MaskEditorShortcut {
  const command = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (command && key === 's') return 'save';
  if (command && key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (event.key === 'Escape') return 'close';
  if (event.key === 'ArrowLeft') return 'previous';
  if (event.key === 'ArrowRight') return 'next';
  if (key === 'b') return 'paint';
  if (key === 'e') return 'erase';
  if (key === '+' || key === '=') return 'zoom-in';
  if (key === '-') return 'zoom-out';
  if (key === '0') return 'fit';
  return null;
}

export function createMaskHistory(initial: Uint8ClampedArray, limit = 20): MaskHistory {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('history limit must be a positive integer');
  let snapshots = [new Uint8ClampedArray(initial)];
  let index = 0;
  const copyCurrent = (): Uint8ClampedArray => new Uint8ClampedArray(snapshots[index]);

  return {
    current: copyCurrent,
    push(mask) {
      if (mask.length !== initial.length) throw new RangeError('mask length must match the initial mask length');
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
