'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createMaskHistory, paintStroke, screenToImage, type MaskHistory, type Point } from '@/helpers/maskEditor';

export interface MaskEditorImage { img_path: string; relative_path: string }
export interface DatasetMaskEditorProps {
  datasetName: string;
  selectedLiveImages: readonly MaskEditorImage[];
  archivedReadOnly: boolean;
  open: boolean;
  onClose(): void;
  onStatusRefresh(): void;
}

const endpoint = (dataset: string, source: string) => `/api/datasets/${encodeURIComponent(dataset)}/masks?source=${encodeURIComponent(source)}`;

export default function DatasetMaskEditor({ datasetName, selectedLiveImages, archivedReadOnly, open, onClose, onStatusRefresh }: DatasetMaskEditorProps) {
  const [index, setIndex] = useState(0);
  const [mask, setMask] = useState<Uint8ClampedArray>();
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [brush, setBrush] = useState({ value: 0, size: 24, hardness: 1, opacity: 1 });
  const [overlayOpacity, setOverlayOpacity] = useState(.55);
  const [zoom, setZoom] = useState(1);
  const history = useRef<MaskHistory | null>(null);
  const sourceCanvas = useRef<HTMLCanvasElement>(null);
  const overlayCanvas = useRef<HTMLCanvasElement>(null);
  const request = useRef(0);
  const painting = useRef<Point | null>(null);
  const image = selectedLiveImages[index];
  useEffect(() => { if (index >= selectedLiveImages.length) setIndex(Math.max(0, selectedLiveImages.length - 1)); }, [index, selectedLiveImages.length]);

  const draw = useCallback((bytes: Uint8ClampedArray, width: number, height: number) => {
    const canvas = overlayCanvas.current;
    if (!canvas) return;
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const pixels = context.createImageData(width, height);
    bytes.forEach((value, pixel) => { const at = pixel * 4; pixels.data[at] = value; pixels.data[at + 1] = value; pixels.data[at + 2] = value; pixels.data[at + 3] = 255; });
    context.putImageData(pixels, 0, 0);
  }, []);

  useEffect(() => {
    if (!open || !image) return;
    const token = ++request.current;
    setDirty(false); setError(''); setZoom(1);
    const source = new Image();
    source.onload = async () => {
      if (token !== request.current) return;
      const width = source.naturalWidth, height = source.naturalHeight;
      setSize({ width, height });
      const canvas = sourceCanvas.current;
      if (canvas) { canvas.width = width; canvas.height = height; canvas.getContext('2d')?.drawImage(source, 0, 0); }
      try {
        const response = await fetch(endpoint(datasetName, image.relative_path));
        if (token !== request.current) return;
        let bytes = new Uint8ClampedArray(width * height); bytes.fill(255);
        if (response.status !== 204) {
          if (!response.ok) throw new Error(`Unable to load mask (HTTP ${response.status})`);
          const loaded = new Image(); loaded.src = URL.createObjectURL(await response.blob());
          await loaded.decode();
          if (token !== request.current) return;
          const offscreen = document.createElement('canvas'); offscreen.width = width; offscreen.height = height;
          const ctx = offscreen.getContext('2d')!; ctx.drawImage(loaded, 0, 0, width, height);
          const rgba = ctx.getImageData(0, 0, width, height).data;
          bytes = Uint8ClampedArray.from({ length: width * height }, (_, i) => rgba[i * 4]);
          URL.revokeObjectURL(loaded.src);
        }
        history.current = createMaskHistory(bytes); setMask(bytes); draw(bytes, width, height);
      } catch (cause) { if (token === request.current) setError(cause instanceof Error ? cause.message : 'Unable to load mask'); }
    };
    source.onerror = () => token === request.current && setError('Unable to load source image');
    source.src = `/api/img/${encodeURIComponent(image.img_path)}`;
    return () => { request.current += 1; };
  }, [datasetName, draw, image, open]);

  const confirmDirty = () => !dirty || window.confirm('Discard unsaved mask edits?');
  const navigate = (next: number) => { if (next >= 0 && next < selectedLiveImages.length && confirmDirty()) setIndex(next); };
  const restore = (bytes: Uint8ClampedArray) => { setMask(bytes); draw(bytes, size.width, size.height); setDirty(true); };
  const save = async () => {
    if (!mask || !image || archivedReadOnly) return;
    const token = request.current; setError('');
    try {
      const offscreen = document.createElement('canvas'); offscreen.width = size.width; offscreen.height = size.height;
      const ctx = offscreen.getContext('2d')!; const rgba = ctx.createImageData(size.width, size.height);
      mask.forEach((value, pixel) => { const at = pixel * 4; rgba.data[at] = value; rgba.data[at + 1] = value; rgba.data[at + 2] = value; rgba.data[at + 3] = 255; }); ctx.putImageData(rgba, 0, 0);
      const allWhite = mask.every(value => value === 255);
      const body = allWhite ? undefined : await new Promise<Blob>((resolve, reject) => offscreen.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG serialization failed')), 'image/png'));
      const response = await fetch(endpoint(datasetName, image.relative_path), { method: allWhite ? 'DELETE' : 'PUT', headers: allWhite ? undefined : { 'content-type': 'image/png' }, body });
      if (!response.ok) throw new Error(`Unable to save mask (HTTP ${response.status}). Try again.`);
      if (token !== request.current) return; setDirty(false); onStatusRefresh();
    } catch (cause) { if (token === request.current) setError(cause instanceof Error ? cause.message : 'Unable to save mask. Try again.'); }
  };
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return screenToImage({ x: event.clientX - rect.left, y: event.clientY - rect.top }, { zoom: rect.width / size.width, offsetX: 0, offsetY: 0 }); };
  const stroke = (to: Point) => { if (!mask || !painting.current) return; const next = paintStroke(mask, size.width, size.height, painting.current, to, brush); painting.current = to; setMask(next); draw(next, size.width, size.height); setDirty(true); };
  useEffect(() => {
    if (!open) return;
    const key = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); const next = event.shiftKey ? history.current?.redo() : history.current?.undo(); if (next) restore(next); }
      if (event.key === 'Escape' && confirmDirty()) onClose();
    }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  if (!open || !image) return null;
  return <div role="dialog" aria-modal="true" aria-label="Dataset mask editor" className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 p-4 text-white">
    <header className="flex flex-wrap items-center gap-2"><strong>{image.relative_path}</strong><span>{index + 1} / {selectedLiveImages.length}</span><button disabled={index === 0} onClick={() => navigate(index - 1)}>Previous</button><button disabled={index === selectedLiveImages.length - 1} onClick={() => navigate(index + 1)}>Next</button><button className="ml-auto" onClick={() => confirmDirty() && onClose()}>Close</button></header>
    <div className="flex flex-wrap gap-3 py-3">
      <button disabled={archivedReadOnly} aria-pressed={brush.value < 255} onClick={() => setBrush({ ...brush, value: 0 })}>Paint</button>
      <button disabled={archivedReadOnly} aria-pressed={brush.value === 255} onClick={() => setBrush({ ...brush, value: 255 })}>Eraser</button>
      {(['value','size','hardness','opacity'] as const).map(name => <label key={name}>{name}<input aria-label={`Brush ${name}`} type="range" min={name === 'value' ? 0 : name === 'size' ? 1 : 0} max={name === 'value' ? 255 : name === 'size' ? 200 : 1} step={name === 'value' || name === 'size' ? 1 : .05} value={brush[name]} disabled={archivedReadOnly} onChange={e => setBrush({ ...brush, [name]: Number(e.target.value) })}/></label>)}
      <label>Overlay opacity<input aria-label="Overlay opacity" type="range" min="0" max="1" step=".05" value={overlayOpacity} onChange={e => setOverlayOpacity(Number(e.target.value))}/></label>
      <button onClick={() => { const next = history.current?.undo(); if (next) restore(next); }} disabled={!history.current?.canUndo() || archivedReadOnly}>Undo</button><button onClick={() => { const next = history.current?.redo(); if (next) restore(next); }} disabled={!history.current?.canRedo() || archivedReadOnly}>Redo</button>
      <button onClick={() => setZoom(z => Math.min(8, z * 1.25))}>Zoom in</button><button onClick={() => setZoom(z => Math.max(.1, z / 1.25))}>Zoom out</button><button onClick={() => setZoom(1)}>Fit</button><button disabled={!dirty || archivedReadOnly} onClick={() => void save()}>Save mask</button>
    </div>{archivedReadOnly && <p>Archived mask preview is read-only.</p>}{error && <p role="alert" className="text-red-400">{error}</p>}
    <div className="relative flex-1 overflow-auto"><div className="relative mx-auto" style={{ width: size.width * zoom, height: size.height * zoom }}><canvas ref={sourceCanvas} className="absolute size-full"/><canvas ref={overlayCanvas} className="absolute size-full touch-none" style={{ opacity: overlayOpacity }} onPointerDown={e => { if (archivedReadOnly) return; e.currentTarget.setPointerCapture(e.pointerId); const start = point(e); painting.current = start; stroke(start); }} onPointerMove={e => { if (painting.current) stroke(point(e)); }} onPointerUp={() => { if (mask && painting.current) history.current?.push(mask); painting.current = null; }}/></div></div>
  </div>;
}
