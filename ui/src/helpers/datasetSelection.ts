export type SelectionAction = 'all' | 'none' | 'invert';

const WINDOWS_RESERVED_BASENAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const PORTABLE_SEGMENT_INVALID_CHARACTER = /[\u0000-\u001f<>:"|?*]/;

export function normalizeRelativeMediaPath(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Media path must be a string');
  const path = input.replace(/\\/g, '/');
  if (path.length === 0 || path.includes('\0') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    throw new Error('Media path must be a nonempty relative path');
  }
  const segments = path.split('/');
  if (
    segments.some(
      segment =>
        segment.length === 0 ||
        segment === '.' ||
        segment === '..' ||
        PORTABLE_SEGMENT_INVALID_CHARACTER.test(segment) ||
        /[. ]$/.test(segment) ||
        WINDOWS_RESERVED_BASENAME.test(segment),
    )
  ) {
    throw new Error('Media path must contain portable safe segments');
  }
  return segments.join('/');
}

export function applySelectionAction(
  selected: ReadonlySet<string>,
  available: Iterable<string>,
  action: SelectionAction,
): Set<string> {
  const options = new Set(available);
  if (action === 'all') return new Set(options);
  if (action === 'none') return new Set();
  if (action === 'invert') return new Set([...options].filter(value => !selected.has(value)));
  throw new Error(`Unknown selection action: ${String(action)}`);
}

export function areSelectionsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) return false;
  for (const path of left) {
    if (!right.has(path)) return false;
  }
  return true;
}

export function reconcileSelection(selected: ReadonlySet<string>, available: Iterable<string>): Set<string> {
  const currentPaths = new Set(available);
  return new Set([...selected].filter(path => currentPaths.has(path)));
}

export function getInterceptableInternalNavigationHref(event: MouseEvent, currentHref: string): string | undefined {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !event.target ||
    typeof (event.target as Element).closest !== 'function'
  ) {
    return undefined;
  }
  const anchor = (event.target as Element).closest('a[href]') as HTMLAnchorElement | null;
  if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return undefined;
  const current = new URL(currentHref);
  const destination = new URL(anchor.href, current);
  if (destination.origin !== current.origin || destination.href === current.href) return undefined;
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export interface SelectionHistoryWindow {
  location: Pick<Location, 'href'>;
  history: Pick<History, 'pushState' | 'back' | 'forward' | 'go'>;
  addEventListener(type: 'popstate', listener: () => void): void;
  removeEventListener(type: 'popstate', listener: () => void): void;
}

export interface DirtySelectionLeaveGuard {
  setDirty(dirty: boolean): void;
  requestLeave(): void;
  cancelLeaveAttempt(): void;
  consumeSentinelBeforeNavigation(onConsumed: () => void): void;
  allowLeave(): void;
  dispose(): void;
}

/**
 * Adds one disposable browser-history sentinel while a selection draft is dirty.
 * A back gesture restores that same sentinel, then the page chooses whether to
 * cancelLeaveAttempt() or allowLeave() after its accessible dialog resolves.
 * dispose intentionally only removes the listener: unmount cleanup must never
 * reverse an in-progress navigation.
 */
export function createDirtySelectionLeaveGuard(
  windowLike: SelectionHistoryWindow,
  onLeaveAttempt: () => void,
): DirtySelectionLeaveGuard {
  let dirty = false;
  let listening = false;
  let leaveAttemptPending = false;
  let suppressRestoredSentinelPopstate = false;

  const removeListener = () => {
    if (!listening) return;
    windowLike.removeEventListener('popstate', onPopstate);
    listening = false;
  };

  const onPopstate = () => {
    if (!dirty) return;
    if (suppressRestoredSentinelPopstate) {
      suppressRestoredSentinelPopstate = false;
      return;
    }
    suppressRestoredSentinelPopstate = true;
    windowLike.history.forward();
    if (leaveAttemptPending) return;
    leaveAttemptPending = true;
    onLeaveAttempt();
  };

  const addListener = () => {
    if (listening) return;
    windowLike.addEventListener('popstate', onPopstate);
    listening = true;
  };

  return {
    setDirty(nextDirty) {
      if (nextDirty === dirty) return;
      dirty = nextDirty;
      if (!dirty) {
        leaveAttemptPending = false;
        suppressRestoredSentinelPopstate = false;
        removeListener();
        windowLike.history.back();
        return;
      }
      windowLike.history.pushState({ datasetSelectionGuard: true }, '', windowLike.location.href);
      addListener();
    },
    requestLeave() {
      if (!dirty || leaveAttemptPending) return;
      windowLike.history.back();
    },
    cancelLeaveAttempt() {
      leaveAttemptPending = false;
    },
    consumeSentinelBeforeNavigation(onConsumed) {
      if (!dirty) {
        onConsumed();
        return;
      }
      dirty = false;
      leaveAttemptPending = false;
      suppressRestoredSentinelPopstate = false;
      removeListener();
      const onSentinelConsumed = () => {
        windowLike.removeEventListener('popstate', onSentinelConsumed);
        onConsumed();
      };
      windowLike.addEventListener('popstate', onSentinelConsumed);
      windowLike.history.back();
    },
    allowLeave() {
      if (!dirty || !leaveAttemptPending) return;
      dirty = false;
      leaveAttemptPending = false;
      suppressRestoredSentinelPopstate = false;
      removeListener();
      windowLike.history.go(-2);
    },
    dispose() {
      dirty = false;
      leaveAttemptPending = false;
      suppressRestoredSentinelPopstate = false;
      removeListener();
    },
  };
}
