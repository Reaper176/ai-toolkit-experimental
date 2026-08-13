'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  canvasBackingSize, clampMaskImageIndex, createMaskHistory, createMaskRequestGate, createWhiteMask, fitMaskView, invertMask, maskEditorShortcut,
  masksEqual, maskSaveMethod, paintStrokeInPlace, panMaskView, screenToImage,
  type MaskHistory, type MaskView, type Point,
} from '@/helpers/maskEditor';

export interface MaskEditorImage { img_path: string; relative_path: string; frozenImageUrl?: string }
export interface DatasetMaskEditorProps {
  datasetName: string;
  selectedLiveImages: readonly MaskEditorImage[];
  archivedReadOnly: boolean;
  open: boolean;
  initialImagePath?: string;
  launchToken?: number;
  onClose(): void;
  onStatusRefresh(): void;
  frozenMasks?: Readonly<Record<string, string>>;
}

const endpoint = (dataset: string, source: string) => `/api/datasets/${encodeURIComponent(dataset)}/masks?source=${encodeURIComponent(source)}`;

export default function DatasetMaskEditor(props: DatasetMaskEditorProps) {
  const { datasetName, selectedLiveImages, archivedReadOnly, open, initialImagePath, launchToken, onClose, onStatusRefresh, frozenMasks } = props;
  const [index, setIndex] = useState(0);
  const [mask, setMask] = useState<Uint8ClampedArray>();
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const dialog = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const request = useRef(createMaskRequestGate());
  const painting = useRef<Point | null>(null);
  const working = useRef<Uint8ClampedArray | null>(null);
  const previewFrame = useRef<number | null>(null);
  const previewGeneration = useRef(0);
  const previewPixels = useRef<ImageData | null>(null);
  const panning = useRef<Point | null>(null);
  const handledLaunch = useRef<{ open: boolean; token?: number }>({ open: false });
  const image = selectedLiveImages[index];
  const dirty = !!mask && !!baseline.current && !masksEqual(mask, baseline.current);
  const readOnly = archivedReadOnly;

  const drawMask = useCallback((bytes: Uint8ClampedArray, width: number, height: number, interactive = false) => {
    const canvas = overlayCanvas.current;
    if (!canvas) return;
    const bounds = viewport.current?.getBoundingClientRect();
    const display = bounds ? { width: Math.max(1, Math.min(bounds.width, width)), height: Math.max(1, Math.min(bounds.height, height)) } : { width, height };
    const ratio = window.devicePixelRatio || 1;
    const backing = interactive ? canvasBackingSize(display, ratio, 1024, 524_288) : canvasBackingSize(display, ratio);
    canvas.width = backing.width; canvas.height = backing.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    let pixels = previewPixels.current;
    if (!pixels || pixels.width !== backing.width || pixels.height !== backing.height) {
      pixels = context.createImageData(backing.width, backing.height); previewPixels.current = pixels;
    }
    for (let y = 0; y < backing.height; y += 1) for (let x = 0; x < backing.width; x += 1) {
      const value = bytes[Math.min(height - 1, Math.floor(y * height / backing.height)) * width + Math.min(width - 1, Math.floor(x * width / backing.width))];
      const at = (y * backing.width + x) * 4; pixels.data[at] = value; pixels.data[at + 1] = value; pixels.data[at + 2] = value; pixels.data[at + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
  }, []);
  const schedulePreview = useCallback((bytes: Uint8ClampedArray, width: number, height: number) => {
    working.current = bytes;
    if (previewFrame.current !== null) return;
    const generation = previewGeneration.current; let fired = false;
    const id = requestAnimationFrame(() => {
      fired = true; previewFrame.current = null;
      if (generation === previewGeneration.current && painting.current && working.current) drawMask(working.current, width, height, true);
    });
    if (!fired) previewFrame.current = id;
  }, [drawMask]);
  const cancelPreview = useCallback(() => {
    previewGeneration.current += 1;
    if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current);
    previewFrame.current = null;
  }, []);

  const fit = useCallback((nextSize: Readonly<{ width: number; height: number }>) => {
    const bounds = viewport.current?.getBoundingClientRect();
    if (bounds) setView(fitMaskView(nextSize, { width: bounds.width, height: bounds.height }));
  }, []);

  useEffect(() => { setIndex(current => clampMaskImageIndex(current, selectedLiveImages.length)); }, [selectedLiveImages.length]);
  useEffect(() => {
    const previous = handledLaunch.current;
    handledLaunch.current = { open, token: launchToken };
    if (!open || (previous.open && previous.token === launchToken) || !initialImagePath) return;
    const requested = selectedLiveImages.findIndex(candidate => candidate.relative_path === initialImagePath);
    if (requested >= 0) setIndex(requested);
  }, [open, launchToken, initialImagePath, selectedLiveImages]);
  useEffect(() => {
    cancelPreview();
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
          const loaded = new Image(); const objectUrl = URL.createObjectURL(await response.blob());
          try {
            loaded.src = objectUrl; await loaded.decode(); if (!token.isCurrent()) return;
            const offscreen = document.createElement('canvas'); offscreen.width = width; offscreen.height = height;
            const context = offscreen.getContext('2d')!; context.drawImage(loaded, 0, 0, width, height);
            const rgba = context.getImageData(0, 0, width, height).data;
            bytes = Uint8ClampedArray.from({ length: width * height }, (_, pixel) => rgba[pixel * 4]);
          } finally { URL.revokeObjectURL(objectUrl); }
        }
        if (!token.isCurrent()) return;
        baseline.current = new Uint8ClampedArray(bytes); original.current = new Uint8ClampedArray(bytes);
        history.current = createMaskHistory(bytes); working.current = bytes; setMask(bytes); drawMask(bytes, width, height); setLoading(false);
        requestAnimationFrame(() => fit({ width, height }));
      } catch (cause) { if (token.isCurrent()) { setMask(undefined); history.current = null; setLoading(false); setError(cause instanceof Error ? cause.message : 'Unable to load mask'); } }
    };
    source.onerror = () => { if (token.isCurrent()) { setLoading(false); setError('Unable to load source image'); } };
    source.src = readOnly && image.frozenImageUrl ? image.frozenImageUrl : `/api/img/${encodeURIComponent(image.img_path)}`;
    return () => { cancelPreview(); request.current.cancel(); };
  }, [cancelPreview, datasetName, drawMask, fit, frozenMasks, image, open, readOnly]);

  const confirmDirty = () => !dirty || window.confirm('Discard unsaved mask edits?');
  const navigate = (next: number) => { const bounded = clampMaskImageIndex(next, selectedLiveImages.length); if (bounded !== index && confirmDirty()) setIndex(bounded); };
  const apply = (bytes: Uint8ClampedArray, push = false) => { working.current = bytes; setMask(bytes); drawMask(bytes, size.width, size.height); if (push) history.current?.push(bytes); };
  const save = async () => {
    if (!mask || !image || readOnly || loading || saving) return;
    const token = request.current.begin(); const savingImage = image.relative_path; setError('');
    setSaving(true);
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
    finally { if (token.isCurrent()) setSaving(false); }
  };
  const imagePoint = (event: React.PointerEvent) => { const rect = viewport.current!.getBoundingClientRect(); return screenToImage({ x: event.clientX - rect.left, y: event.clientY - rect.top }, view); };
  const stroke = (to: Point) => { if (!working.current || !painting.current) return; paintStrokeInPlace(working.current, size.width, size.height, painting.current, to, brush); painting.current = to; schedulePreview(working.current, size.width, size.height); };
  const finishPaint = () => { const wasPainting = painting.current !== null; painting.current = null; cancelPreview(); if (wasPainting && working.current) { history.current?.push(working.current); setMask(new Uint8ClampedArray(working.current)); drawMask(working.current, size.width, size.height); } };
  const runShortcut = useCallback((action: ReturnType<typeof maskEditorShortcut>) => {
    if (saving && action !== 'zoom-in' && action !== 'zoom-out' && action !== 'fit') return;
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
  }, [index, mask, readOnly, size, view, dirty, saving]);
  useEffect(() => {
    if (!open) return;
    const key = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!(event.ctrlKey || event.metaKey) && target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      const action = maskEditorShortcut(event); if (!action) return; event.preventDefault(); runShortcut(action);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [open, runShortcut]);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => dialog.current?.querySelector?.<HTMLElement>('button:not([disabled]), input:not([disabled])')?.focus());
    return () => previousFocus.current?.focus?.();
  }, [open]);
  if (!open || !image || (readOnly && !frozenMasks?.[image.relative_path])) return null;
  const transform = `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.zoom})`;
  return <div ref={dialog} role="dialog" aria-modal="true" aria-label="Dataset mask editor" className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 p-4 text-white" onKeyDown={event => { if (event.key !== 'Tab') return; const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')]; if (!items.length) return; const at = items.indexOf(document.activeElement as HTMLElement); const next = event.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : (at === items.length - 1 ? 0 : at + 1); if (at <= 0 && event.shiftKey || at === items.length - 1 && !event.shiftKey) { event.preventDefault(); items[next].focus(); } }}>
    <header className="flex flex-wrap items-center gap-2"><strong>{image.relative_path}</strong><span>{index + 1} / {selectedLiveImages.length}</span><button disabled={index === 0 || loading || saving} onClick={() => navigate(index - 1)}>Previous</button><button disabled={index === selectedLiveImages.length - 1 || loading || saving} onClick={() => navigate(index + 1)}>Next</button><button disabled={saving} className="ml-auto" onClick={() => confirmDirty() && onClose()}>Close</button></header>
    <div className="flex flex-wrap gap-3 py-3">
      <button disabled={readOnly || loading || saving} aria-pressed={brush.value < 255} onClick={() => setBrush({ ...brush, value: 0 })}>Paint</button><button disabled={readOnly || loading || saving} aria-pressed={brush.value === 255} onClick={() => setBrush({ ...brush, value: 255 })}>Eraser</button>
      {(['value','size','hardness','opacity'] as const).map(name => <label key={name}>{name}<input aria-label={`Brush ${name}`} type="range" min={name === 'value' ? 0 : name === 'size' ? 1 : 0} max={name === 'value' ? 255 : name === 'size' ? 200 : 1} step={name === 'value' || name === 'size' ? 1 : .05} value={brush[name]} disabled={readOnly || loading || saving} onChange={event => setBrush({ ...brush, [name]: Number(event.target.value) })}/></label>)}
      <label>Overlay opacity<input aria-label="Overlay opacity" type="range" min="0" max="1" step=".05" value={overlayOpacity} onChange={event => setOverlayOpacity(Number(event.target.value))}/></label>
      <button onClick={() => { const next = history.current?.undo(); if (next) apply(next); }} disabled={!history.current?.canUndo() || readOnly || loading || saving}>Undo</button><button onClick={() => { const next = history.current?.redo(); if (next) apply(next); }} disabled={!history.current?.canRedo() || readOnly || loading || saving}>Redo</button>
      <button onClick={() => original.current && apply(new Uint8ClampedArray(original.current), true)} disabled={!mask || readOnly || loading || saving}>Reset original</button><button onClick={() => apply(createWhiteMask(size.width, size.height), true)} disabled={!mask || readOnly || loading || saving}>Clear white</button><button onClick={() => mask && apply(invertMask(mask), true)} disabled={!mask || readOnly || loading || saving}>Invert</button>
      <button onClick={() => runShortcut('zoom-in')}>Zoom in</button><button onClick={() => runShortcut('zoom-out')}>Zoom out</button><button onClick={() => fit(size)}>Fit</button><button disabled={!dirty || readOnly || loading || saving} onClick={() => void save()}>Save mask</button>
    </div>{loading && <p role="status">Loading mask…</p>}{readOnly && <p>Archived frozen mask preview is read-only.</p>}{error && <p role="alert" className="text-red-400">{error}</p>}
    <div ref={viewport} className="relative flex-1 overflow-hidden bg-black" onPointerDown={event => { if (event.button === 1 || event.shiftKey) { event.currentTarget.setPointerCapture(event.pointerId); panning.current = { x: event.clientX, y: event.clientY }; } }} onPointerMove={event => { if (!panning.current) return; setView(current => panMaskView(current, event.clientX - panning.current!.x, event.clientY - panning.current!.y)); panning.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={() => { panning.current = null; }} onPointerCancel={() => { panning.current = null; }} onLostPointerCapture={() => { panning.current = null; }}>
      <div className="absolute origin-top-left" style={{ width: size.width, height: size.height, transform }}><canvas ref={sourceCanvas} className="absolute inset-0" style={{ width: size.width, height: size.height }}/><canvas ref={overlayCanvas} className="absolute inset-0 touch-none" style={{ width: size.width, height: size.height, opacity: overlayOpacity }} onPointerDown={event => { if (readOnly || loading || saving || event.shiftKey || event.button === 1) return; event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); const start = imagePoint(event); painting.current = start; stroke(start); }} onPointerMove={event => { if (painting.current) stroke(imagePoint(event)); }} onPointerUp={finishPaint} onPointerCancel={finishPaint} onLostPointerCapture={finishPaint}/></div>
    </div>
  </div>;
}
