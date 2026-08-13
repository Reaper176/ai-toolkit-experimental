'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  canvasBackingSize, clampMaskImageIndex, createMaskHistory, createMaskRequestGate, createWhiteMask, fitMaskView, invertMask, maskEditorShortcut,
  masksEqual, maskSaveMethod, paintStroke, panMaskView, screenToImage,
  type MaskHistory, type MaskView, type Point,
} from '@/helpers/maskEditor';

export interface MaskEditorImage { img_path: string; relative_path: string }
export interface DatasetMaskEditorProps {
  datasetName: string;
  selectedLiveImages: readonly MaskEditorImage[];
  archivedReadOnly: boolean;
  open: boolean;
  onClose(): void;
  onStatusRefresh(): void;
  frozenMasks?: Readonly<Record<string, string>>;
}

const endpoint = (dataset: string, source: string) => `/api/datasets/${encodeURIComponent(dataset)}/masks?source=${encodeURIComponent(source)}`;

export default function DatasetMaskEditor(props: DatasetMaskEditorProps) {
  const { datasetName, selectedLiveImages, archivedReadOnly, open, onClose, onStatusRefresh, frozenMasks } = props;
  const [index, setIndex] = useState(0);
  const [mask, setMask] = useState<Uint8ClampedArray>();
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brush, setBrush] = useState({ value: 0, size: 24, hardness: 1, opacity: 1 });
  const [overlayOpacity, setOverlayOpacity] = useState(.55);
  const [view, setView] = useState<MaskView>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const baseline = useRef<Uint8ClampedArray | null>(null);
  const original = useRef<Uint8ClampedArray | null>(null);
  const history = useRef<MaskHistory | null>(null);
  const sourceCanvas = useRef<HTMLCanvasElement>(null);
  const overlayCanvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const request = useRef(createMaskRequestGate());
  const painting = useRef<Point | null>(null);
  const panning = useRef<Point | null>(null);
  const image = selectedLiveImages[index];
  const dirty = !!mask && !!baseline.current && !masksEqual(mask, baseline.current);
  const readOnly = archivedReadOnly;

  const drawMask = useCallback((bytes: Uint8ClampedArray, width: number, height: number) => {
    const canvas = overlayCanvas.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1; const backing = canvasBackingSize({ width, height }, ratio);
    canvas.width = backing.width; canvas.height = backing.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scratch = document.createElement('canvas'); scratch.width = width; scratch.height = height;
    const scratchContext = scratch.getContext('2d')!; const pixels = scratchContext.createImageData(width, height);
    bytes.forEach((value, pixel) => { const at = pixel * 4; pixels.data[at] = value; pixels.data[at + 1] = value; pixels.data[at + 2] = value; pixels.data[at + 3] = 255; });
    scratchContext.putImageData(pixels, 0, 0); context.imageSmoothingEnabled = false; context.drawImage(scratch, 0, 0, backing.width, backing.height);
  }, []);

  const fit = useCallback((nextSize: Readonly<{ width: number; height: number }>) => {
    const bounds = viewport.current?.getBoundingClientRect();
    if (bounds) setView(fitMaskView(nextSize, { width: bounds.width, height: bounds.height }));
  }, []);

  useEffect(() => { setIndex(current => clampMaskImageIndex(current, selectedLiveImages.length)); }, [selectedLiveImages.length]);
  useEffect(() => {
    const token = request.current.begin();
    setMask(undefined); baseline.current = null; original.current = null; history.current = null;
    painting.current = null; setError('');
    if (!open || !image || (readOnly && !frozenMasks?.[image.relative_path])) { setLoading(false); return; }
    setLoading(true);
    const source = new Image();
    source.onload = async () => {
      if (!token.isCurrent()) return;
      const width = source.naturalWidth, height = source.naturalHeight;
      setSize({ width, height });
      const canvas = sourceCanvas.current;
      if (canvas) { const backing = canvasBackingSize({ width, height }, window.devicePixelRatio || 1); canvas.width = backing.width; canvas.height = backing.height; canvas.getContext('2d')?.drawImage(source, 0, 0, backing.width, backing.height); }
      try {
        const maskUrl = readOnly ? frozenMasks![image.relative_path] : endpoint(datasetName, image.relative_path);
        const response = await fetch(maskUrl);
        if (!token.isCurrent()) return;
        let bytes = createWhiteMask(width, height);
        if (response.status !== 204) {
          if (!response.ok) throw new Error(`Unable to load mask (HTTP ${response.status})`);
          const loaded = new Image(); loaded.src = URL.createObjectURL(await response.blob()); await loaded.decode();
          if (!token.isCurrent()) return;
          const offscreen = document.createElement('canvas'); offscreen.width = width; offscreen.height = height;
          const context = offscreen.getContext('2d')!; context.drawImage(loaded, 0, 0, width, height);
          const rgba = context.getImageData(0, 0, width, height).data;
          bytes = Uint8ClampedArray.from({ length: width * height }, (_, pixel) => rgba[pixel * 4]); URL.revokeObjectURL(loaded.src);
        }
        if (!token.isCurrent()) return;
        baseline.current = new Uint8ClampedArray(bytes); original.current = new Uint8ClampedArray(bytes);
        history.current = createMaskHistory(bytes); setMask(bytes); drawMask(bytes, width, height); setLoading(false);
        requestAnimationFrame(() => fit({ width, height }));
      } catch (cause) { if (token.isCurrent()) { setMask(undefined); history.current = null; setLoading(false); setError(cause instanceof Error ? cause.message : 'Unable to load mask'); } }
    };
    source.onerror = () => { if (token.isCurrent()) { setLoading(false); setError('Unable to load source image'); } };
    source.src = `/api/img/${encodeURIComponent(image.img_path)}`;
    return () => request.current.cancel();
  }, [datasetName, drawMask, fit, frozenMasks, image, open, readOnly]);

  const confirmDirty = () => !dirty || window.confirm('Discard unsaved mask edits?');
  const navigate = (next: number) => { const bounded = clampMaskImageIndex(next, selectedLiveImages.length); if (bounded !== index && confirmDirty()) setIndex(bounded); };
  const apply = (bytes: Uint8ClampedArray, push = false) => { setMask(bytes); drawMask(bytes, size.width, size.height); if (push) history.current?.push(bytes); };
  const save = async () => {
    if (!mask || !image || readOnly || loading) return;
    const token = request.current.begin(); const savingImage = image.relative_path; setError('');
    try {
      const method = maskSaveMethod(mask); let body: Blob | undefined;
      if (method === 'PUT') {
        const offscreen = document.createElement('canvas'); offscreen.width = size.width; offscreen.height = size.height;
        const context = offscreen.getContext('2d')!; const rgba = context.createImageData(size.width, size.height);
        mask.forEach((value, pixel) => { const at = pixel * 4; rgba.data[at] = value; rgba.data[at + 1] = value; rgba.data[at + 2] = value; rgba.data[at + 3] = 255; }); context.putImageData(rgba, 0, 0);
        body = await new Promise<Blob>((resolve, reject) => offscreen.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG serialization failed')), 'image/png'));
      }
      const response = await fetch(endpoint(datasetName, savingImage), { method, headers: method === 'PUT' ? { 'content-type': 'image/png' } : undefined, body });
      if (!response.ok) throw new Error(`Unable to save mask (HTTP ${response.status}). Try again.`);
      if (!token.isCurrent() || image.relative_path !== savingImage) return;
      baseline.current = new Uint8ClampedArray(mask); setMask(new Uint8ClampedArray(mask)); onStatusRefresh();
    } catch (cause) { if (token.isCurrent()) setError(cause instanceof Error ? cause.message : 'Unable to save mask. Try again.'); }
  };
  const imagePoint = (event: React.PointerEvent) => { const rect = viewport.current!.getBoundingClientRect(); return screenToImage({ x: event.clientX - rect.left, y: event.clientY - rect.top }, view); };
  const stroke = (to: Point) => { if (!mask || !painting.current) return; const next = paintStroke(mask, size.width, size.height, painting.current, to, brush); painting.current = to; apply(next); };
  const runShortcut = useCallback((action: ReturnType<typeof maskEditorShortcut>) => {
    if (action === 'save') void save();
    else if (action === 'undo') { const next = history.current?.undo(); if (next) apply(next); }
    else if (action === 'redo') { const next = history.current?.redo(); if (next) apply(next); }
    else if (action === 'close' && confirmDirty()) onClose();
    else if (action === 'previous') navigate(index - 1);
    else if (action === 'next') navigate(index + 1);
    else if (action === 'paint' && !readOnly) setBrush(current => ({ ...current, value: 0 }));
    else if (action === 'erase' && !readOnly) setBrush(current => ({ ...current, value: 255 }));
    else if (action === 'zoom-in') setView(current => ({ ...current, zoom: Math.min(8, current.zoom * 1.25) }));
    else if (action === 'zoom-out') setView(current => ({ ...current, zoom: Math.max(.05, current.zoom / 1.25) }));
    else if (action === 'fit') fit(size);
  }, [index, mask, readOnly, size, view, dirty]);
  useEffect(() => {
    if (!open) return;
    const key = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!(event.ctrlKey || event.metaKey) && target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      const action = maskEditorShortcut(event); if (!action) return; event.preventDefault(); runShortcut(action);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [open, runShortcut]);
  if (!open || !image || (readOnly && !frozenMasks?.[image.relative_path])) return null;
  const transform = `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.zoom})`;
  return <div role="dialog" aria-modal="true" aria-label="Dataset mask editor" className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 p-4 text-white">
    <header className="flex flex-wrap items-center gap-2"><strong>{image.relative_path}</strong><span>{index + 1} / {selectedLiveImages.length}</span><button disabled={index === 0 || loading} onClick={() => navigate(index - 1)}>Previous</button><button disabled={index === selectedLiveImages.length - 1 || loading} onClick={() => navigate(index + 1)}>Next</button><button className="ml-auto" onClick={() => confirmDirty() && onClose()}>Close</button></header>
    <div className="flex flex-wrap gap-3 py-3">
      <button disabled={readOnly || loading} aria-pressed={brush.value < 255} onClick={() => setBrush({ ...brush, value: 0 })}>Paint</button><button disabled={readOnly || loading} aria-pressed={brush.value === 255} onClick={() => setBrush({ ...brush, value: 255 })}>Eraser</button>
      {(['value','size','hardness','opacity'] as const).map(name => <label key={name}>{name}<input aria-label={`Brush ${name}`} type="range" min={name === 'value' ? 0 : name === 'size' ? 1 : 0} max={name === 'value' ? 255 : name === 'size' ? 200 : 1} step={name === 'value' || name === 'size' ? 1 : .05} value={brush[name]} disabled={readOnly || loading} onChange={event => setBrush({ ...brush, [name]: Number(event.target.value) })}/></label>)}
      <label>Overlay opacity<input aria-label="Overlay opacity" type="range" min="0" max="1" step=".05" value={overlayOpacity} onChange={event => setOverlayOpacity(Number(event.target.value))}/></label>
      <button onClick={() => { const next = history.current?.undo(); if (next) apply(next); }} disabled={!history.current?.canUndo() || readOnly || loading}>Undo</button><button onClick={() => { const next = history.current?.redo(); if (next) apply(next); }} disabled={!history.current?.canRedo() || readOnly || loading}>Redo</button>
      <button onClick={() => original.current && apply(new Uint8ClampedArray(original.current), true)} disabled={!mask || readOnly || loading}>Reset original</button><button onClick={() => apply(createWhiteMask(size.width, size.height), true)} disabled={!mask || readOnly || loading}>Clear white</button><button onClick={() => mask && apply(invertMask(mask), true)} disabled={!mask || readOnly || loading}>Invert</button>
      <button onClick={() => runShortcut('zoom-in')}>Zoom in</button><button onClick={() => runShortcut('zoom-out')}>Zoom out</button><button onClick={() => fit(size)}>Fit</button><button disabled={!dirty || readOnly || loading} onClick={() => void save()}>Save mask</button>
    </div>{loading && <p role="status">Loading mask…</p>}{readOnly && <p>Archived frozen mask preview is read-only.</p>}{error && <p role="alert" className="text-red-400">{error}</p>}
    <div ref={viewport} className="relative flex-1 overflow-hidden bg-black" onPointerDown={event => { if (event.button === 1 || event.shiftKey) panning.current = { x: event.clientX, y: event.clientY }; }} onPointerMove={event => { if (!panning.current) return; setView(current => panMaskView(current, event.clientX - panning.current!.x, event.clientY - panning.current!.y)); panning.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={() => { panning.current = null; }}>
      <div className="absolute origin-top-left" style={{ width: size.width, height: size.height, transform }}><canvas ref={sourceCanvas} className="absolute inset-0" style={{ width: size.width, height: size.height }}/><canvas ref={overlayCanvas} className="absolute inset-0 touch-none" style={{ width: size.width, height: size.height, opacity: overlayOpacity }} onPointerDown={event => { if (readOnly || loading || event.shiftKey) return; event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); const start = imagePoint(event); painting.current = start; stroke(start); }} onPointerMove={event => { if (painting.current) stroke(imagePoint(event)); }} onPointerUp={() => { if (mask && painting.current) history.current?.push(mask); painting.current = null; }}/></div>
    </div>
  </div>;
}
