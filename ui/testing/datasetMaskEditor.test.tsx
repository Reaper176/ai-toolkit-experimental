import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import DatasetMaskEditor from '../src/components/DatasetMaskEditor';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).requestAnimationFrame = (callback: () => void) => { callback(); return 1; };
(globalThis as any).cancelAnimationFrame = () => undefined;
(globalThis as any).URL.createObjectURL = () => 'blob:mask';
let revoked = 0;
(globalThis as any).URL.revokeObjectURL = () => { revoked += 1; };

class LoadedImage {
  naturalWidth = 2; naturalHeight = 1; onload?: () => void; onerror?: () => void;
  set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  async decode() {}
}
(globalThis as any).Image = LoadedImage;

let imageDataAllocations = 0;
const context = {
  createImageData: (width: number, height: number) => { imageDataAllocations += 1; return { width, height, data: new Uint8ClampedArray(width * height * 4) }; },
  putImageData() {}, drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray([255,255,255,255,255,255,255,255]) }),
  imageSmoothingEnabled: true,
};
const canvas = () => ({ width: 0, height: 0, getContext: () => context, toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'], { type: 'image/png' })), getBoundingClientRect: () => ({ left: 0, top: 0, width: 2, height: 1 }), setPointerCapture() {} });
let createdCanvases = 0; let restoredFocus = 0; let initialFocused = 0;
const priorFocus = { focus: () => { restoredFocus += 1; } };
(globalThis as any).document = { activeElement: priorFocus, createElement: (name: string) => { if (name === 'canvas') { createdCanvases += 1; return canvas(); } return {}; } };
const listeners = new Map<string, Function>();
(globalThis as any).window = { devicePixelRatio: 2, confirm: () => true, addEventListener: (name: string, listener: Function) => listeners.set(name, listener), removeEventListener: (name: string) => listeners.delete(name) };

const images = [{ img_path: '/root/a.png', relative_path: 'a.png' }, { img_path: '/root/b.png', relative_path: 'b.png' }];
const nodeMock = (element: any) => element.type === 'canvas' ? canvas() : element.props?.role === 'dialog' ? { querySelector: () => ({ focus: () => { initialFocused += 1; } }) } : element.props?.className?.includes('overflow-hidden') ? { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }), setPointerCapture() {} } : {};
const button = (renderer: TestRenderer.ReactTestRenderer, label: string) => renderer.root.findByProps({ children: label });
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

async function run() {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let saveResolve: ((response: Response) => void) | undefined;
  const recordFetch = (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    if (init?.method) return new Promise<Response>(resolve => { saveResolve = resolve; });
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  (globalThis as any).fetch = recordFetch;
  let closes = 0; let refreshes = 0;
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<DatasetMaskEditor datasetName="set" selectedLiveImages={images} archivedReadOnly={false} open onClose={() => closes++} onStatusRefresh={() => refreshes++}/>, { createNodeMock: nodeMock }); });
  await flush();
  assert.equal(initialFocused, 1, 'modal focuses its first interactive control');
  assert.equal(requests.length, 1, '204 missing mask only performs its GET and initializes without writing');
  assert.equal(button(renderer, 'Save mask').props.disabled, true, 'white initialization is clean');
  await act(async () => button(renderer, 'Invert').props.onClick());
  assert.equal(button(renderer, 'Save mask').props.disabled, false);
  await act(async () => button(renderer, 'Save mask').props.onClick());
  assert.equal(requests[1].init?.method, 'PUT');
  assert.equal(button(renderer, 'Next').props.disabled, true, 'navigation locks while a save is pending');
  assert.equal(button(renderer, 'Close').props.disabled, true, 'close locks while a save is pending');
  await act(async () => saveResolve!(new Response(null, { status: 500 })));
  assert.equal(button(renderer, 'Save mask').props.disabled, false, 'failed save retains dirty bytes');
  assert.match(renderer.root.findByProps({ role: 'alert' }).children.join(''), /try again/i);
  await act(async () => button(renderer, 'Clear white').props.onClick());
  await act(async () => button(renderer, 'Save mask').props.onClick());
  assert.equal(requests[2].init?.method, 'DELETE');
  await act(async () => saveResolve!(new Response(null, { status: 204 })));
  assert.equal(refreshes, 1);

  await act(async () => button(renderer, 'Invert').props.onClick());
  (globalThis as any).window.confirm = () => false;
  await act(async () => button(renderer, 'Next').props.onClick());
  assert.equal(renderer.root.findByType('strong').children.join(''), 'a.png', 'rejected dirty navigation preserves ordering/current image');
  assert.equal(closes, 0);
  const overlay = renderer.root.findAllByType('canvas')[1];
  let stopped = false;
  act(() => overlay.props.onPointerDown({ button: 1, shiftKey: false, stopPropagation: () => { stopped = true; }, currentTarget: { setPointerCapture() {} }, pointerId: 1, clientX: 1, clientY: 1 }));
  assert.equal(stopped, false, 'middle button bubbles to the viewport pan handler');
  const beforeMoveCanvases = createdCanvases;
  const beforePreviewAllocations = imageDataAllocations;
  act(() => overlay.props.onPointerDown({ button: 0, shiftKey: false, stopPropagation() {}, currentTarget: { setPointerCapture() {} }, pointerId: 2, clientX: 0, clientY: 0 }));
  act(() => overlay.props.onPointerMove({ clientX: 1, clientY: 0 }));
  act(() => overlay.props.onPointerMove({ clientX: 1.5, clientY: 0 }));
  act(() => overlay.props.onPointerCancel());
  assert.equal(createdCanvases, beforeMoveCanvases, 'pointer movement creates no source-resolution scratch canvases');
  assert.ok(imageDataAllocations - beforePreviewAllocations <= 1, 'repeated pointer previews reuse their capped RGBA buffer');
  assert.equal(button(renderer, 'Save mask').props.disabled, false, 'pointer cancellation finalizes the stroke');
  const focusables = [{ focus() { (globalThis as any).document.activeElement = focusables[0]; } }, { focus() { (globalThis as any).document.activeElement = focusables[1]; } }];
  (globalThis as any).document.activeElement = focusables[1]; let tabPrevented = false;
  renderer.root.findByProps({ role: 'dialog' }).props.onKeyDown({ key: 'Tab', shiftKey: false, currentTarget: { querySelectorAll: () => focusables }, preventDefault: () => { tabPrevented = true; } });
  assert.equal(tabPrevented, true); assert.equal((globalThis as any).document.activeElement, focusables[0], 'Tab wraps inside modal');
  await act(async () => renderer.unmount());
  assert.equal(restoredFocus, 1, 'modal restores prior focus');

  let stableRefreshes = 0;
  (globalThis as any).fetch = (_url: string, init?: RequestInit) => Promise.resolve(new Response(null, { status: init?.method ? 200 : 204 }));
  function ParentLikeHarness() {
    const [badgeRefreshKey, setBadgeRefreshKey] = React.useState(0);
    return <><span data-refresh-key={badgeRefreshKey}/><DatasetMaskEditor
      datasetName="set"
      selectedLiveImages={images}
      archivedReadOnly={false}
      open
      initialImagePath="b.png"
      launchToken={1}
      onClose={() => undefined}
      onStatusRefresh={() => { stableRefreshes += 1; setBadgeRefreshKey(value => value + 1); }}
    /></>;
  }
  await act(async () => { renderer = TestRenderer.create(<ParentLikeHarness/>, { createNodeMock: nodeMock }); });
  await flush();
  assert.equal(renderer.root.findByType('strong').children.join(''), 'b.png', 'launch path focuses the second image');
  assert.equal(renderer.root.findByType('header').findAllByType('span')[0].children.join(''), '2 / 2');
  await act(async () => button(renderer, 'Invert').props.onClick());
  await act(async () => button(renderer, 'Save mask').props.onClick());
  await flush();
  assert.equal(stableRefreshes, 1, 'successful save refreshes mask status once');
  assert.equal(renderer.root.findByProps({ 'data-refresh-key': 1 }).props['data-refresh-key'], 1, 'parent-like badge refresh rerenders');
  assert.equal(renderer.root.findByType('strong').children.join(''), 'b.png', 'badge refresh preserves the current image');
  assert.equal(renderer.root.findByType('header').findAllByType('span')[0].children.join(''), '2 / 2', 'badge refresh preserves the image counter');
  assert.equal(button(renderer, 'Save mask').props.disabled, true, 'successful save updates the clean baseline');
  await act(async () => renderer.unmount());

  const LaunchHarness = ({ editorImages, token }: { editorImages: typeof images; token: number }) => <DatasetMaskEditor
    datasetName="set"
    selectedLiveImages={editorImages}
    archivedReadOnly={false}
    open
    initialImagePath="b.png"
    launchToken={token}
    onClose={() => undefined}
    onStatusRefresh={() => undefined}
  />;
  await act(async () => { renderer = TestRenderer.create(<LaunchHarness editorImages={images} token={1}/>, { createNodeMock: nodeMock }); });
  await flush();
  await act(async () => button(renderer, 'Previous').props.onClick());
  await flush();
  assert.equal(renderer.root.findByType('strong').children.join(''), 'a.png', 'navigation can move away from the launch target');
  await act(async () => renderer.update(<LaunchHarness editorImages={images.map(image => ({ ...image }))} token={1}/>));
  await flush();
  assert.equal(renderer.root.findByType('strong').children.join(''), 'a.png', 'equivalent image-array churn does not replay the launch target');
  await act(async () => renderer.update(<LaunchHarness editorImages={images.map(image => ({ ...image }))} token={2}/>));
  await flush();
  assert.equal(renderer.root.findByType('strong').children.join(''), 'b.png', 'a new launch token retargets against the latest image list');
  await act(async () => renderer.unmount());

  requests.length = 0;
  (globalThis as any).fetch = recordFetch;
  await act(async () => { renderer = TestRenderer.create(<DatasetMaskEditor datasetName="set" selectedLiveImages={[images[0]]} archivedReadOnly open frozenMasks={{ 'a.png': '/immutable/version/mask.png' }} onClose={() => undefined} onStatusRefresh={() => refreshes++}/>, { createNodeMock: nodeMock }); });
  await flush();
  assert.equal(requests[0].url, '/immutable/version/mask.png');
  assert.equal(button(renderer, 'Save mask').props.disabled, true);
  assert.equal(button(renderer, 'Invert').props.disabled, true, 'frozen preview exposes no mutation');
  await act(async () => renderer.unmount());
  requests.length = 0; revoked = 0;
  (globalThis as any).fetch = () => Promise.resolve(new Response(new Blob(['mask'], { type: 'image/png' }), { status: 200 }));
  await act(async () => { renderer = TestRenderer.create(<DatasetMaskEditor datasetName="set" selectedLiveImages={[images[0]]} archivedReadOnly={false} open onClose={() => undefined} onStatusRefresh={() => undefined}/>, { createNodeMock: nodeMock }); });
  await flush(); assert.equal(revoked, 1, 'decoded mask blob URLs are always revoked'); await act(async () => renderer.unmount());

  const queued = new Map<number, () => void>(); let nextFrame = 10; const cancelled: number[] = [];
  (globalThis as any).requestAnimationFrame = (callback: () => void) => { const id = nextFrame++; queued.set(id, callback); return id; };
  (globalThis as any).cancelAnimationFrame = (id: number) => { cancelled.push(id); queued.delete(id); };
  (globalThis as any).fetch = () => Promise.resolve(new Response(null, { status: 204 }));
  await act(async () => { renderer = TestRenderer.create(<DatasetMaskEditor datasetName="set" selectedLiveImages={[images[0]]} archivedReadOnly={false} open onClose={() => undefined} onStatusRefresh={() => undefined}/>, { createNodeMock: nodeMock }); });
  await flush(); act(() => { for (const callback of [...queued.values()]) callback(); queued.clear(); });
  const deferredOverlay = renderer.root.findAllByType('canvas')[1];
  act(() => deferredOverlay.props.onPointerDown({ button: 0, shiftKey: false, stopPropagation() {}, currentTarget: { setPointerCapture() {} }, pointerId: 5, clientX: 0, clientY: 0 }));
  const pendingInteractive = [...queued.keys()][0];
  act(() => deferredOverlay.props.onPointerUp());
  assert.ok(cancelled.includes(pendingInteractive), 'stroke completion cancels the queued interactive preview before full-quality draw');
  assert.equal(queued.has(pendingInteractive), false, 'stale low-resolution callback cannot overwrite final quality');
  await act(async () => renderer.unmount());
  console.log('dataset mask editor mounted behavior tests passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
