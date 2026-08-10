/**
 * SECURITY BOUNDARY: <canonicalDataRoot>/dataset_presets is exclusively managed
 * by this application account. Portable Node does not expose handle-relative
 * openat2/renameat2/rm operations, so concurrent pathname mutation by another
 * process or account with write access is outside the supported threat model.
 * Identity and ancestry checks below are best-effort defenses within that
 * ownership boundary and repeat immediately before pathname mutations.
 */
import { createHash, randomUUID } from 'node:crypto';
import { constants, createWriteStream, lstatSync, realpathSync, statSync } from 'node:fs';
import { lstat, mkdir, open, opendir, readdir, realpath, rename, rm, stat } from 'node:fs/promises';
import type { BigIntStats, Dir } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { basename, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import {
  buildDatasetPresetManifest,
  DATASET_PRESET_NOTE_MAX,
  DatasetPresetLoaderConfig,
  DatasetPresetManifestFile,
  DatasetPresetManifestV1,
  manifestSha256,
  normalizePresetName,
  normalizeRelativeMediaPath,
  serializeManifest,
  validateLoaderConfig,
  validateManifest,
} from '../helpers/datasetPresets';

export interface StageVersionInput {
  presetId: string;
  version: number;
  presetName: string;
  sourceDataset: string;
  /** Configured datasets boundary. The canonical source root must remain within it. */
  datasetsRoot?: string;
  sourceRoot: string;
  selectedPaths: string[];
  retainedPaths?: string[];
  priorManifestPath?: string;
  captionExt: string;
  loaderConfig: DatasetPresetLoaderConfig;
  note: string | null;
}

export interface StagedPublication {
  versionRoot: string;
  manifestPath: string;
  manifest: DatasetPresetManifestV1;
  manifestSha256: string;
  publish(): Promise<void>;
  rollback(): Promise<void>;
}

export class DatasetPresetSnapshotConflictError extends Error {
  readonly code = 'version_exists';

  constructor(message = 'Dataset preset snapshot version already exists', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatasetPresetSnapshotConflictError';
  }
}

export type DatasetPresetVerificationMismatchKind =
  | 'missing'
  | 'size'
  | 'hash'
  | 'caption'
  | 'manifest'
  | 'unexpected';
export type DatasetPresetVerificationAsset = 'media' | 'caption' | 'manifest';

export interface DatasetPresetVerificationMismatch {
  kind: DatasetPresetVerificationMismatchKind;
  asset: DatasetPresetVerificationAsset;
  path: string;
  expected?: string | number | null;
  actual?: string | number | null;
}

export class DatasetPresetSnapshotVerificationError extends Error {
  readonly missingPaths: string[];

  constructor(
    readonly presetId: string,
    readonly version: number,
    readonly mismatches: DatasetPresetVerificationMismatch[],
    options?: { cause?: unknown },
  ) {
    super('Dataset preset snapshot verification failed', options);
    this.name = 'DatasetPresetSnapshotVerificationError';
    this.mismatches = mismatches.slice(0, 5).map(mismatch => ({ ...mismatch }));
    this.missingPaths = this.mismatches.filter(mismatch => mismatch.kind === 'missing').map(mismatch => mismatch.path);
  }
}

export interface SnapshotQuarantine {
  restore(): Promise<void>;
  remove(): Promise<void>;
}

export interface DatasetPresetSnapshotStore {
  stageVersion(input: StageVersionInput): Promise<StagedPublication>;
  readManifest(relativeManifestPath: string): Promise<DatasetPresetManifestV1>;
  verifyFast(relativeManifestPath: string): Promise<DatasetPresetManifestV1>;
  verifyFull(relativeManifestPath: string): Promise<DatasetPresetManifestV1>;
  resolveMediaRoot(relativeManifestPath: string): string;
  quarantineVersion(relativeManifestPath: string): Promise<SnapshotQuarantine>;
  cleanupStaging(olderThan: Date): Promise<StagingCleanupResult>;
  findPublishedOrphans(authoritativeManifestPaths: readonly string[]): Promise<PublishedOrphanScanResult>;
}

export interface MaintenanceScanPage<T> {
  done: boolean;
  inspectedEntries: number;
  result: T;
}

export interface DatasetPresetMaintenanceScan {
  cleanupPage(maxEntries: number): Promise<MaintenanceScanPage<StagingCleanupResult>>;
  beginOrphanScan(authoritativeManifestPaths: readonly string[]): void;
  orphanPage(maxEntries: number): Promise<MaintenanceScanPage<PublishedOrphanScanResult>>;
  close(): Promise<void>;
}

export interface DatasetPresetSnapshotMaintenanceStore extends DatasetPresetSnapshotStore {
  createMaintenanceScan(olderThan: Date): DatasetPresetMaintenanceScan;
}

export interface StagingCleanupResult {
  reportedRemoved: string[];
  totalRemoved: number;
  truncatedRemoved: number;
  skippedCandidates: number;
  reportedSkippedCandidates: string[];
}

export interface PublishedOrphanScanResult {
  reportedOrphans: string[];
  totalOrphans: number;
  truncatedOrphans: number;
  skippedCandidates: number;
  reportedSkippedCandidates: string[];
}

export const DATASET_PRESET_MAINTENANCE_MAX_SCAN = 10_000;
export const DATASET_PRESET_MAINTENANCE_MAX_REPORT = 100;

export interface DatasetPresetSnapshotDependencies {
  randomId(): string;
  beforeCopyComplete?: (sourcePath: string) => void | Promise<void>;
  beforeOrphanCandidateCheck?: (relativeVersionPath: string) => void | Promise<void>;
}

interface ParsedManifestPath {
  presetId: string;
  version: number;
  presetRoot: string;
  versionRoot: string;
  manifestFile: string;
}

interface ParsedManifestGrammar {
  presetId: string;
  version: number;
}

interface CopyResult {
  bytes: number;
  sha256: string;
  content?: Buffer;
}

function boundedSize(value: bigint): number | string {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
}

interface DirectoryPin {
  path: string;
  realPath: string;
  dev: bigint;
  ino: bigint;
}

interface RootPin {
  data: DirectoryPin;
  managed: DirectoryPin;
}

interface PinnedRegularFile {
  path: string;
  realPath: string;
  trustedRoot: string;
  handle: FileHandle;
  baseline: BigIntStats;
}

const decoder = new TextDecoder('utf-8', { fatal: true });

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function isDescendant(root: string, candidate: string): boolean {
  const child = relative(root, candidate);
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

function sameIdentity(left: Pick<BigIntStats, 'dev' | 'ino'>, right: Pick<BigIntStats, 'dev' | 'ino'>): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function pinFromStats(path: string, realPath: string, info: BigIntStats): DirectoryPin {
  return { path, realPath, dev: info.dev, ino: info.ino };
}

function assertWithinRoot(root: string, candidate: string, label: string): void {
  if (!isDescendant(root, candidate)) throw new Error(`${label} escapes its trusted root`);
}

function validatePortableComponent(value: unknown, label: string): string {
  const normalized = normalizeRelativeMediaPath(value);
  if (normalized.includes('/')) throw new Error(`${label} must be one portable directory component`);
  return normalized;
}

function validatePresetId(value: unknown): string {
  const normalized = validatePortableComponent(value, 'Preset ID');
  if (normalized.toLowerCase().startsWith('.tombstone-')) {
    throw new Error('Preset ID uses the reserved snapshot tombstone namespace');
  }
  return normalized;
}

function validatePositiveVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Version must be a positive safe integer');
  }
  return value;
}

function normalizeCaptionExt(value: string, loaderConfig: DatasetPresetLoaderConfig): string {
  return validateLoaderConfig({ ...loaderConfig, caption_ext: value }).caption_ext.replace(/^\./, '');
}

function sidecarPath(mediaPath: string, captionExt: string): string {
  const parsed = posix.parse(mediaPath);
  return posix.join(parsed.dir, `${parsed.name}.${captionExt.replace(/^\./, '')}`);
}

function toSystemPath(root: string, portableRelativePath: string): string {
  return join(root, ...portableRelativePath.split('/'));
}

function cloneManifest(manifest: DatasetPresetManifestV1): DatasetPresetManifestV1 {
  return validateManifest(manifest);
}

function retainFirstSorted(values: string[], value: string, limit: number): void {
  if (values.length < limit) {
    values.push(value);
    values.sort();
    return;
  }
  if (value >= values[values.length - 1]) return;
  values[values.length - 1] = value;
  values.sort();
}

function safeMaintenanceLabel(value: string): string | undefined {
  try {
    const normalized = normalizeRelativeMediaPath(value);
    return normalized.length <= 512 ? normalized : undefined;
  } catch {
    return undefined;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path, { bigint: true });
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

async function assertNoSymlinkComponents(trustedRoot: string, candidate: string): Promise<void> {
  assertWithinRoot(trustedRoot, candidate, 'File path');
  const child = relative(trustedRoot, candidate);
  let current = trustedRoot;
  for (const segment of child.split(sep)) {
    current = join(current, segment);
    const info = await lstat(current, { bigint: true });
    if (info.isSymbolicLink()) throw new Error(`Path component must not be a symlink: ${current}`);
  }
}

async function validatePinnedFile(file: PinnedRegularFile): Promise<BigIntStats> {
  const opened = await file.handle.stat({ bigint: true });
  if (!opened.isFile()) throw new Error(`Opened file is no longer regular: ${file.path}`);
  const pathInfo = await lstat(file.path, { bigint: true });
  if (pathInfo.isSymbolicLink() || !pathInfo.isFile()) throw new Error(`File path identity changed: ${file.path}`);
  await assertNoSymlinkComponents(file.trustedRoot, file.path);
  const currentRealPath = await realpath(file.path);
  assertWithinRoot(file.trustedRoot, currentRealPath, 'File path');
  if (currentRealPath !== file.realPath || !sameIdentity(opened, pathInfo)) {
    throw new Error(`File path identity changed: ${file.path}`);
  }
  if (
    opened.size !== file.baseline.size ||
    opened.mtimeNs !== file.baseline.mtimeNs ||
    !sameIdentity(opened, file.baseline)
  ) {
    throw new Error(`Source changed while it was being copied: ${file.path}`);
  }
  return opened;
}

async function openPinnedRegularFile(path: string, trustedRoot: string): Promise<PinnedRegularFile> {
  await assertNoSymlinkComponents(trustedRoot, path);
  const before = await lstat(path, { bigint: true });
  if (before.isSymbolicLink() || !before.isFile()) throw new Error(`Path must be a non-symlink regular file: ${path}`);
  const beforeRealPath = await realpath(path);
  assertWithinRoot(trustedRoot, beforeRealPath, 'File path');
  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
  const handle = await open(path, constants.O_RDONLY | noFollow);
  const pinned: PinnedRegularFile = {
    path,
    realPath: beforeRealPath,
    trustedRoot,
    handle,
    baseline: before,
  };
  try {
    await validatePinnedFile(pinned);
    return pinned;
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

async function copyAndHashPinned(
  sourcePath: string,
  trustedRoot: string,
  destinationPath: string,
  beforeCopyComplete?: (sourcePath: string) => void | Promise<void>,
  captureContent = false,
): Promise<CopyResult> {
  const pinned = await openPinnedRegularFile(sourcePath, trustedRoot);
  const hash = createHash('sha256');
  let bytes = 0;
  const chunks: Buffer[] = [];
  const hashingStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      if (bytes > Number.MAX_SAFE_INTEGER - chunk.length) {
        callback(new Error(`File size exceeds the safe manifest byte range: ${sourcePath}`));
        return;
      }
      bytes += chunk.length;
      hash.update(chunk);
      if (captureContent) chunks.push(Buffer.from(chunk));
      callback(null, chunk);
    },
  });
  try {
    await mkdir(resolve(destinationPath, '..'), { recursive: true, mode: 0o700 });
    await pipeline(
      pinned.handle.createReadStream({ autoClose: false, start: 0 }),
      hashingStream,
      createWriteStream(destinationPath, { flags: 'wx' }),
    );
    await beforeCopyComplete?.(sourcePath);
    await validatePinnedFile(pinned);
    const output = await open(destinationPath, 'r');
    try {
      await output.sync();
    } finally {
      await output.close();
    }
    return {
      bytes,
      sha256: hash.digest('hex'),
      ...(captureContent ? { content: Buffer.concat(chunks) } : {}),
    };
  } catch (error) {
    await rm(destinationPath, { force: true }).catch(() => undefined);
    throw error;
  } finally {
    await pinned.handle.close().catch(() => undefined);
  }
}

async function hashPinnedFile(file: PinnedRegularFile): Promise<string> {
  const hash = createHash('sha256');
  const hashingStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      callback();
    },
  });
  await pipeline(file.handle.createReadStream({ autoClose: false, start: 0 }), hashingStream);
  await validatePinnedFile(file);
  return hash.digest('hex');
}

function parseManifestGrammar(relativeManifestPath: string): ParsedManifestGrammar {
  if (
    typeof relativeManifestPath !== 'string' ||
    isAbsolute(relativeManifestPath) ||
    relativeManifestPath.includes('\\')
  ) {
    throw new Error('Manifest path must be a relative portable path');
  }
  const segments = relativeManifestPath.split('/');
  if (segments.length !== 3 || segments[2] !== 'manifest.json') {
    throw new Error('Manifest path must match <preset-id>/v<version>/manifest.json');
  }
  const presetId = validatePresetId(segments[0]);
  const versionMatch = /^v([1-9]\d*)$/.exec(segments[1]);
  if (!versionMatch) throw new Error('Manifest path must contain a positive version');
  const version = Number(versionMatch[1]);
  validatePositiveVersion(version);
  return { presetId, version };
}

function resolveManifestPath(managedRoot: string, parsed: ParsedManifestGrammar): ParsedManifestPath {
  const { presetId, version } = parsed;
  const presetRoot = join(managedRoot, presetId);
  const versionRoot = join(presetRoot, `v${version}`);
  return { presetId, version, presetRoot, versionRoot, manifestFile: join(versionRoot, 'manifest.json') };
}

function validateExistingPathSynchronously(path: ParsedManifestPath): void {
  for (const [candidate, label, directory] of [
    [path.presetRoot, 'Preset root', true],
    [path.versionRoot, 'Version root', true],
    [path.manifestFile, 'Manifest', false],
  ] as const) {
    const info = lstatSync(candidate, { bigint: true });
    if (info.isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
    if (directory && !info.isDirectory()) throw new Error(`${label} must be a directory`);
    if (!directory && !info.isFile()) throw new Error(`${label} must be a regular file`);
  }
}

export function createDatasetPresetSnapshotStore(
  dataRoot: string,
  dependencies?: Partial<DatasetPresetSnapshotDependencies>,
): DatasetPresetSnapshotMaintenanceStore {
  const configuredDataRoot = resolve(dataRoot);
  let canonicalDataRoot = configuredDataRoot;
  let managedRoot = join(canonicalDataRoot, 'dataset_presets');
  const resolvedDependencies: DatasetPresetSnapshotDependencies = {
    randomId: dependencies?.randomId ?? randomUUID,
    beforeCopyComplete: dependencies?.beforeCopyComplete,
    beforeOrphanCandidateCheck: dependencies?.beforeOrphanCandidateCheck,
  };
  let rootPin: RootPin | undefined;

  function validateAccountBoundary(info: BigIntStats, label: string): void {
    if (process.platform === 'win32') return;
    if ((info.mode & BigInt(0o022)) !== BigInt(0)) {
      throw new Error(`${label} must not be group/world writable`);
    }
    const getuid = process.getuid;
    if (typeof getuid === 'function' && info.uid !== BigInt(getuid())) {
      throw new Error(`${label} must be owned by the application account`);
    }
  }

  function pinDirectorySync(path: string, label: string, trustedRoot?: string): DirectoryPin {
    const info = lstatSync(path, { bigint: true });
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${label} must be a non-symlink directory`);
    const realPath = realpathSync(path);
    if (realPath !== path) throw new Error(`${label} must have a canonical non-symlink parent chain`);
    if (trustedRoot !== undefined) {
      assertWithinRoot(trustedRoot, realPath, label);
      validateAccountBoundary(info, label);
    }
    const followed = statSync(path, { bigint: true });
    if (!sameIdentity(info, followed)) throw new Error(`${label} identity changed while pinning`);
    if (trustedRoot !== undefined) validateAccountBoundary(followed, label);
    return pinFromStats(path, realPath, followed);
  }

  function validateDirectoryPinSync(pin: DirectoryPin, label: string, trustedRoot?: string): void {
    const current = pinDirectorySync(pin.path, label, trustedRoot);
    if (current.realPath !== pin.realPath || current.dev !== pin.dev || current.ino !== pin.ino) {
      throw new Error(`${label} identity changed`);
    }
  }

  function requirePinnedRootsSync(): RootPin {
    if (rootPin === undefined) {
      canonicalDataRoot = realpathSync(configuredDataRoot);
      managedRoot = join(canonicalDataRoot, 'dataset_presets');
      rootPin = {
        data: pinDirectorySync(canonicalDataRoot, 'Data root'),
        managed: pinDirectorySync(managedRoot, 'Dataset preset root', canonicalDataRoot),
      };
    }
    validateDirectoryPinSync(rootPin.data, 'Data root');
    validateDirectoryPinSync(rootPin.managed, 'Dataset preset root', canonicalDataRoot);
    return rootPin;
  }

  function nextOwnedName(prefix: string): string {
    const id = validatePortableComponent(resolvedDependencies.randomId(), 'Internal snapshot ID');
    return `${prefix}${id}`;
  }

  async function initializeManagedRoot(): Promise<void> {
    if (rootPin !== undefined) {
      requirePinnedRootsSync();
      return;
    }
    await mkdir(configuredDataRoot, { recursive: true });
    canonicalDataRoot = await realpath(configuredDataRoot);
    managedRoot = join(canonicalDataRoot, 'dataset_presets');
    pinDirectorySync(canonicalDataRoot, 'Data root');
    try {
      await mkdir(managedRoot, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    rootPin = {
      data: pinDirectorySync(canonicalDataRoot, 'Data root'),
      managed: pinDirectorySync(managedRoot, 'Dataset preset root', canonicalDataRoot),
    };
    requirePinnedRootsSync();
  }

  function validateMovedDirectoryPin(original: DirectoryPin, newPath: string, label: string): DirectoryPin {
    const moved = pinDirectorySync(newPath, label, managedRoot);
    if (moved.dev !== original.dev || moved.ino !== original.ino) {
      throw new Error(`${label} identity changed during rename`);
    }
    return moved;
  }

  async function movePinnedDirectoryToTombstone(
    pin: DirectoryPin,
    parentPin: DirectoryPin,
    label: string,
  ): Promise<void> {
    requirePinnedRootsSync();
    if (
      basename(pin.path).toLowerCase().startsWith('.tombstone-') &&
      relative(managedRoot, pin.path) === basename(pin.path)
    ) {
      validateDirectoryPinSync(pin, `${label} tombstone`, managedRoot);
      return;
    }
    validateDirectoryPinSync(parentPin, `${label} parent`, managedRoot);
    validateDirectoryPinSync(pin, label, parentPin.path);
    const tombstonePath = join(managedRoot, nextOwnedName('.tombstone-'));
    if (await pathExists(tombstonePath)) throw new Error('Owned tombstone destination already exists');

    // Node has no portable openat2/renameat2 binding. Rename into the pinned root,
    // then re-check dev/ino. Mutating the active pin immediately makes deletion retryable.
    const originalPin = { ...pin };
    await rename(pin.path, tombstonePath);
    pin.path = tombstonePath;
    pin.realPath = tombstonePath;
    const tombstonePin = validateMovedDirectoryPin(originalPin, tombstonePath, `${label} tombstone`);
    Object.assign(pin, tombstonePin);
  }

  async function deletePinnedTombstone(pin: DirectoryPin, label: string): Promise<void> {
    requirePinnedRootsSync();
    validateDirectoryPinSync(pin, `${label} tombstone`, managedRoot);
    // Best-effort portable check immediately before pathname-based recursive rm.
    try {
      await rm(pin.path, { recursive: true });
    } catch (error) {
      if (!(await pathExists(pin.path))) return;
      throw error;
    }
  }

  async function removePinnedDirectory(pin: DirectoryPin, parentPin: DirectoryPin, label: string): Promise<void> {
    await movePinnedDirectoryToTombstone(pin, parentPin, label);
    await deletePinnedTombstone(pin, label);
  }

  function createMaintenanceScan(olderThan: Date): DatasetPresetMaintenanceScan {
    if (!(olderThan instanceof Date) || Number.isNaN(olderThan.getTime())) {
      throw new Error('Cleanup cutoff must be a Date');
    }

    let cleanupRoot: Dir | undefined;
    let cleanupPreset: { directory: Dir; id: string; root: string; pin: DirectoryPin } | undefined;
    let cleanupDone = false;
    const cleanupResult: StagingCleanupResult = {
      reportedRemoved: [],
      totalRemoved: 0,
      truncatedRemoved: 0,
      skippedCandidates: 0,
      reportedSkippedCandidates: [],
    };

    let orphanRoot: Dir | undefined;
    let orphanPreset: { directory: Dir; id: string; root: string; pin: DirectoryPin } | undefined;
    let orphanDone = false;
    let authoritative: Set<string> | undefined;
    const orphanResult: PublishedOrphanScanResult = {
      reportedOrphans: [],
      totalOrphans: 0,
      truncatedOrphans: 0,
      skippedCandidates: 0,
      reportedSkippedCandidates: [],
    };
    let closed = false;

    const closeDirectory = async (directory: Dir | undefined): Promise<void> => {
      if (directory === undefined) return;
      try {
        await directory.close();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ERR_DIR_CLOSED') throw error;
      }
    };
    const checkBudget = (maxEntries: number): void => {
      if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0) {
        throw new Error('Maintenance scan page size must be a positive safe integer');
      }
      if (closed) throw new Error('Maintenance scan is closed');
    };
    const cleanupSkip = (label: string): void => {
      cleanupResult.skippedCandidates += 1;
      const safe = safeMaintenanceLabel(label);
      if (safe !== undefined) retainFirstSorted(cleanupResult.reportedSkippedCandidates, safe, 10);
    };
    const orphanSkip = (label: string): void => {
      orphanResult.skippedCandidates += 1;
      const safe = safeMaintenanceLabel(label);
      if (safe !== undefined) retainFirstSorted(orphanResult.reportedSkippedCandidates, safe, 10);
    };
    const cleanupSnapshot = (): StagingCleanupResult => ({
      reportedRemoved: [...cleanupResult.reportedRemoved],
      totalRemoved: cleanupResult.totalRemoved,
      truncatedRemoved: Math.max(0, cleanupResult.totalRemoved - cleanupResult.reportedRemoved.length),
      skippedCandidates: cleanupResult.skippedCandidates,
      reportedSkippedCandidates: [...cleanupResult.reportedSkippedCandidates],
    });
    const orphanSnapshot = (): PublishedOrphanScanResult => ({
      reportedOrphans: [...orphanResult.reportedOrphans],
      totalOrphans: orphanResult.totalOrphans,
      truncatedOrphans: Math.max(0, orphanResult.totalOrphans - orphanResult.reportedOrphans.length),
      skippedCandidates: orphanResult.skippedCandidates,
      reportedSkippedCandidates: [...orphanResult.reportedSkippedCandidates],
    });

    return {
      async cleanupPage(maxEntries: number): Promise<MaintenanceScanPage<StagingCleanupResult>> {
        checkBudget(maxEntries);
        if (cleanupDone) return { done: true, inspectedEntries: 0, result: cleanupSnapshot() };
        await initializeManagedRoot();
        requirePinnedRootsSync();
        cleanupRoot ??= await opendir(managedRoot);
        let inspectedEntries = 0;
        while (inspectedEntries < maxEntries && !cleanupDone) {
          if (cleanupPreset !== undefined) {
            const child = await cleanupPreset.directory.read();
            if (child === null) {
              await closeDirectory(cleanupPreset.directory);
              cleanupPreset = undefined;
              continue;
            }
            inspectedEntries += 1;
            if (!/^\.staging-.+/.test(child.name)) continue;
            const relativeStagingPath = `${cleanupPreset.id}/${child.name}`;
            if (child.isSymbolicLink()) {
              cleanupSkip(relativeStagingPath);
              continue;
            }
            if (!child.isDirectory()) continue;
            const childPath = join(cleanupPreset.root, child.name);
            try {
              requirePinnedRootsSync();
              validateDirectoryPinSync(cleanupPreset.pin, 'Preset root', managedRoot);
              const info = await lstat(childPath, { bigint: true });
              if (info.isSymbolicLink() || !info.isDirectory()) {
                cleanupSkip(relativeStagingPath);
                continue;
              }
              if (info.mtimeMs >= BigInt(olderThan.getTime())) continue;
              const stagingPin = pinDirectorySync(childPath, 'Staging directory', cleanupPreset.root);
              await removePinnedDirectory(stagingPin, cleanupPreset.pin, 'Staging directory');
            } catch {
              cleanupSkip(relativeStagingPath);
              continue;
            }
            cleanupResult.totalRemoved += 1;
            retainFirstSorted(
              cleanupResult.reportedRemoved,
              relativeStagingPath,
              DATASET_PRESET_MAINTENANCE_MAX_REPORT,
            );
            continue;
          }

          if (cleanupRoot === undefined) throw new Error('Cleanup scan root closed unexpectedly');
          const presetEntry = await cleanupRoot.read();
          if (presetEntry === null) {
            await closeDirectory(cleanupRoot);
            cleanupRoot = undefined;
            cleanupDone = true;
            continue;
          }
          inspectedEntries += 1;
          requirePinnedRootsSync();
          if (presetEntry.name.toLowerCase().startsWith('.tombstone-')) continue;
          if (presetEntry.isSymbolicLink()) {
            cleanupSkip(presetEntry.name);
            continue;
          }
          if (!presetEntry.isDirectory()) continue;
          const presetRoot = join(managedRoot, presetEntry.name);
          try {
            const presetPin = pinDirectorySync(presetRoot, 'Preset root', managedRoot);
            cleanupPreset = {
              directory: await opendir(presetRoot),
              id: presetEntry.name,
              root: presetRoot,
              pin: presetPin,
            };
          } catch {
            cleanupSkip(presetEntry.name);
          }
        }
        return { done: cleanupDone, inspectedEntries, result: cleanupSnapshot() };
      },

      beginOrphanScan(authoritativeManifestPaths: readonly string[]): void {
        if (!cleanupDone) throw new Error('Cleanup scan must complete before orphan scan');
        if (!Array.isArray(authoritativeManifestPaths)) throw new Error('Manifest paths must be an array');
        if (authoritative !== undefined) throw new Error('Orphan scan has already started');
        authoritative = new Set<string>();
        for (const value of authoritativeManifestPaths) {
          try {
            const grammar = parseManifestGrammar(value);
            authoritative.add(`${grammar.presetId}/v${grammar.version}/manifest.json`);
          } catch {
            // Malformed database values do not establish filesystem authority.
          }
        }
      },

      async orphanPage(maxEntries: number): Promise<MaintenanceScanPage<PublishedOrphanScanResult>> {
        checkBudget(maxEntries);
        if (authoritative === undefined) throw new Error('Authoritative manifest paths must be loaded first');
        if (orphanDone) return { done: true, inspectedEntries: 0, result: orphanSnapshot() };
        await initializeManagedRoot();
        requirePinnedRootsSync();
        orphanRoot ??= await opendir(managedRoot);
        let inspectedEntries = 0;
        while (inspectedEntries < maxEntries && !orphanDone) {
          if (orphanPreset !== undefined) {
            const child = await orphanPreset.directory.read();
            if (child === null) {
              await closeDirectory(orphanPreset.directory);
              orphanPreset = undefined;
              continue;
            }
            inspectedEntries += 1;
            const match = /^v([1-9]\d*)$/.exec(child.name);
            if (!match) continue;
            const relativeVersionPath = `${orphanPreset.id}/${child.name}`;
            if (child.isSymbolicLink() || !child.isDirectory()) {
              orphanSkip(relativeVersionPath);
              continue;
            }
            const version = Number(match[1]);
            if (!Number.isSafeInteger(version)) {
              orphanSkip(relativeVersionPath);
              continue;
            }
            const versionRoot = join(orphanPreset.root, child.name);
            try {
              requirePinnedRootsSync();
              validateDirectoryPinSync(orphanPreset.pin, 'Preset root', managedRoot);
              await resolvedDependencies.beforeOrphanCandidateCheck?.(relativeVersionPath);
              pinDirectorySync(versionRoot, 'Version root', orphanPreset.root);
              const manifestInfo = await lstat(join(versionRoot, 'manifest.json'), { bigint: true });
              if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile()) {
                orphanSkip(relativeVersionPath);
                continue;
              }
              validateAccountBoundary(manifestInfo, 'Manifest');
            } catch {
              orphanSkip(relativeVersionPath);
              continue;
            }
            const manifestPath = `${orphanPreset.id}/v${version}/manifest.json`;
            if (!authoritative.has(manifestPath)) {
              orphanResult.totalOrphans += 1;
              retainFirstSorted(
                orphanResult.reportedOrphans,
                relativeVersionPath,
                DATASET_PRESET_MAINTENANCE_MAX_REPORT,
              );
            }
            continue;
          }

          if (orphanRoot === undefined) throw new Error('Orphan scan root closed unexpectedly');
          const presetEntry = await orphanRoot.read();
          if (presetEntry === null) {
            await closeDirectory(orphanRoot);
            orphanRoot = undefined;
            orphanDone = true;
            continue;
          }
          inspectedEntries += 1;
          if (presetEntry.name.toLowerCase().startsWith('.tombstone-')) continue;
          if (presetEntry.isSymbolicLink()) {
            orphanSkip(presetEntry.name);
            continue;
          }
          if (!presetEntry.isDirectory()) continue;
          try {
            const presetId = validatePresetId(presetEntry.name);
            const presetRoot = join(managedRoot, presetId);
            const presetPin = pinDirectorySync(presetRoot, 'Preset root', managedRoot);
            orphanPreset = {
              directory: await opendir(presetRoot),
              id: presetId,
              root: presetRoot,
              pin: presetPin,
            };
          } catch {
            orphanSkip(presetEntry.name);
          }
        }
        return { done: orphanDone, inspectedEntries, result: orphanSnapshot() };
      },

      async close(): Promise<void> {
        if (closed) return;
        closed = true;
        const directories = [cleanupPreset?.directory, cleanupRoot, orphanPreset?.directory, orphanRoot];
        cleanupPreset = undefined;
        cleanupRoot = undefined;
        orphanPreset = undefined;
        orphanRoot = undefined;
        let firstError: unknown;
        for (const directory of directories) {
          try {
            await closeDirectory(directory);
          } catch (error) {
            firstError ??= error;
          }
        }
        if (firstError !== undefined) throw firstError;
      },
    };
  }

  async function readManifest(relativeManifestPath: string): Promise<DatasetPresetManifestV1> {
    requirePinnedRootsSync();
    const parsed = resolveManifestPath(managedRoot, parseManifestGrammar(relativeManifestPath));
    const presetPin = pinDirectorySync(parsed.presetRoot, 'Preset root', managedRoot);
    const versionPin = pinDirectorySync(parsed.versionRoot, 'Version root', parsed.presetRoot);
    const pinnedManifest = await openPinnedRegularFile(parsed.manifestFile, parsed.versionRoot);
    let rawBytes: Buffer;
    try {
      rawBytes = await pinnedManifest.handle.readFile();
      await validatePinnedFile(pinnedManifest);
    } finally {
      await pinnedManifest.handle.close().catch(() => undefined);
    }
    validateDirectoryPinSync(versionPin, 'Version root', parsed.presetRoot);
    validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
    requirePinnedRootsSync();
    let raw: string;
    try {
      raw = decoder.decode(rawBytes);
    } catch {
      throw new Error('Snapshot manifest is not valid UTF-8');
    }
    let untrusted: unknown;
    try {
      untrusted = JSON.parse(raw);
    } catch {
      throw new Error('Snapshot manifest is not valid JSON');
    }
    const manifest = validateManifest(untrusted);
    const canonicalBytes = Buffer.from(serializeManifest(manifest), 'utf8');
    if (!rawBytes.equals(canonicalBytes)) throw new Error('Snapshot manifest is not in canonical checksum form');
    if (manifest.preset_id !== parsed.presetId || manifest.version !== parsed.version) {
      throw new Error('Snapshot manifest identity does not match its managed path');
    }
    return manifest;
  }

  async function verifyFiles(relativeManifestPath: string, full: boolean): Promise<DatasetPresetManifestV1> {
    requirePinnedRootsSync();
    const parsed = resolveManifestPath(managedRoot, parseManifestGrammar(relativeManifestPath));
    let manifest: DatasetPresetManifestV1;
    try {
      manifest = await readManifest(relativeManifestPath);
    } catch (error) {
      if (error instanceof DatasetPresetSnapshotVerificationError) throw error;
      throw new DatasetPresetSnapshotVerificationError(
        parsed.presetId,
        parsed.version,
        [
          {
            kind: 'manifest',
            asset: 'manifest',
            path: 'manifest.json',
            expected: 'canonical valid manifest',
            actual: 'invalid',
          },
        ],
        { cause: error },
      );
    }
    const presetPin = pinDirectorySync(parsed.presetRoot, 'Preset root', managedRoot);
    const versionPin = pinDirectorySync(parsed.versionRoot, 'Version root', parsed.presetRoot);
    const mismatches: DatasetPresetVerificationMismatch[] = [];
    const recordMismatch = (mismatch: DatasetPresetVerificationMismatch) => {
      if (mismatches.length >= 5) return;
      if (
        mismatches.some(
          existing =>
            existing.kind === mismatch.kind && existing.asset === mismatch.asset && existing.path === mismatch.path,
        )
      ) {
        return;
      }
      mismatches.push(mismatch);
    };
    for (const file of manifest.files) {
      requirePinnedRootsSync();
      validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
      validateDirectoryPinSync(versionPin, 'Version root', parsed.presetRoot);
      const managedPath = normalizeRelativeMediaPath(file.managed_path);
      if (!managedPath.startsWith('media/'))
        throw new Error(`Managed media path must be within media/: ${managedPath}`);
      const mediaPath = toSystemPath(parsed.versionRoot, managedPath);
      let pinnedMedia: PinnedRegularFile | null = null;
      try {
        pinnedMedia = await openPinnedRegularFile(mediaPath, parsed.versionRoot);
      } catch (error) {
        if (isMissing(error)) {
          recordMismatch({
            kind: 'missing',
            asset: 'media',
            path: file.source_path,
            expected: 'present',
            actual: 'missing',
          });
        } else {
          recordMismatch({
            kind: 'missing',
            asset: 'media',
            path: file.source_path,
            expected: 'present',
            actual: 'unreadable',
          });
        }
      }
      if (pinnedMedia !== null) {
        try {
          const mediaInfo = await pinnedMedia.handle.stat({ bigint: true });
          if (mediaInfo.size !== BigInt(file.media_bytes)) {
            recordMismatch({
              kind: 'size',
              asset: 'media',
              path: file.source_path,
              expected: file.media_bytes,
              actual: boundedSize(mediaInfo.size),
            });
          } else if (full) {
            const actualHash = await hashPinnedFile(pinnedMedia);
            if (actualHash !== file.media_sha256) {
              recordMismatch({
                kind: 'hash',
                asset: 'media',
                path: file.source_path,
                expected: file.media_sha256,
                actual: actualHash,
              });
            }
          }
        } finally {
          await pinnedMedia.handle.close().catch(() => undefined);
        }
      }
      const captionPath = sidecarPath(managedPath, file.caption_ext);
      const absoluteCaptionPath = toSystemPath(parsed.versionRoot, captionPath);
      if (file.caption_missing) {
        if (await pathExists(absoluteCaptionPath)) {
          recordMismatch({
            kind: 'caption',
            asset: 'caption',
            path: sidecarPath(file.source_path, file.caption_ext),
            expected: 'missing',
            actual: 'present',
          });
        }
      } else {
        let pinnedCaption: PinnedRegularFile | null = null;
        try {
          pinnedCaption = await openPinnedRegularFile(absoluteCaptionPath, parsed.versionRoot);
        } catch (error) {
          if (isMissing(error)) {
            recordMismatch({
              kind: 'missing',
              asset: 'caption',
              path: sidecarPath(file.source_path, file.caption_ext),
              expected: 'present',
              actual: 'missing',
            });
          } else {
            recordMismatch({
              kind: 'missing',
              asset: 'caption',
              path: sidecarPath(file.source_path, file.caption_ext),
              expected: 'present',
              actual: 'unreadable',
            });
          }
        }
        if (pinnedCaption !== null) {
          try {
            const captionInfo = await pinnedCaption.handle.stat({ bigint: true });
            if (captionInfo.size !== BigInt(file.caption_bytes as number)) {
              recordMismatch({
                kind: 'size',
                asset: 'caption',
                path: sidecarPath(file.source_path, file.caption_ext),
                expected: file.caption_bytes,
                actual: boundedSize(captionInfo.size),
              });
            } else if (full) {
              const actualHash = await hashPinnedFile(pinnedCaption);
              if (actualHash !== file.caption_sha256) {
                recordMismatch({
                  kind: 'hash',
                  asset: 'caption',
                  path: sidecarPath(file.source_path, file.caption_ext),
                  expected: file.caption_sha256,
                  actual: actualHash,
                });
              }
            }
          } finally {
            await pinnedCaption.handle.close().catch(() => undefined);
          }
        }
      }
    }
    if (full) {
      const expectedFiles = new Set<string>();
      const knownFiles = new Set<string>();
      const expectedDirectories = new Set<string>(['media']);
      const captionExtensions = new Set<string>();
      const addExpectedAncestors = (portablePath: string) => {
        let directory = posix.dirname(portablePath);
        while (directory !== '.') {
          expectedDirectories.add(directory);
          directory = posix.dirname(directory);
        }
      };
      for (const file of manifest.files) {
        const managedPath = normalizeRelativeMediaPath(file.managed_path);
        const captionPath = sidecarPath(managedPath, file.caption_ext);
        expectedFiles.add(managedPath);
        knownFiles.add(managedPath);
        knownFiles.add(captionPath);
        if (!file.caption_missing) expectedFiles.add(captionPath);
        captionExtensions.add(file.caption_ext.replace(/^\./, '').toLowerCase());
        addExpectedAncestors(managedPath);
        addExpectedAncestors(captionPath);
      }
      const mediaRoot = join(parsed.versionRoot, 'media');
      let mediaPin: DirectoryPin | null = null;
      try {
        mediaPin = pinDirectorySync(mediaRoot, 'Managed media root', parsed.versionRoot);
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      const classifyAsset = (portablePath: string): DatasetPresetVerificationAsset => {
        const extension = posix.extname(portablePath).slice(1).toLowerCase();
        return captionExtensions.has(extension) ? 'caption' : 'media';
      };
      const walk = async (directoryPin: DirectoryPin, portableDirectory: string): Promise<void> => {
        validateDirectoryPinSync(directoryPin, 'Managed media directory', parsed.versionRoot);
        const entries = await readdir(directoryPin.path, { withFileTypes: true });
        entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
        for (const entry of entries) {
          const portablePath = posix.join(portableDirectory, entry.name);
          const displayPath = portablePath.slice('media/'.length);
          const absolutePath = join(directoryPin.path, entry.name);
          const info = await lstat(absolutePath, { bigint: true });
          if (info.isSymbolicLink()) {
            recordMismatch({
              kind: 'unexpected',
              asset: classifyAsset(portablePath),
              path: displayPath,
              expected: 'absent',
              actual: 'symlink',
            });
            continue;
          }
          if (info.isDirectory()) {
            if (!expectedDirectories.has(portablePath)) {
              recordMismatch({
                kind: 'unexpected',
                asset: 'media',
                path: displayPath,
                expected: 'absent',
                actual: 'directory',
              });
              continue;
            }
            const childPin = pinDirectorySync(absolutePath, 'Managed media directory', parsed.versionRoot);
            await walk(childPin, portablePath);
            continue;
          }
          if (info.isFile()) {
            if (!expectedFiles.has(portablePath) && !knownFiles.has(portablePath)) {
              recordMismatch({
                kind: 'unexpected',
                asset: classifyAsset(portablePath),
                path: displayPath,
                expected: 'absent',
                actual: 'file',
              });
            }
            continue;
          }
          recordMismatch({
            kind: 'unexpected',
            asset: classifyAsset(portablePath),
            path: displayPath,
            expected: 'absent',
            actual: 'special',
          });
        }
        validateDirectoryPinSync(directoryPin, 'Managed media directory', parsed.versionRoot);
      };
      if (mediaPin !== null) await walk(mediaPin, 'media');
    }
    validateDirectoryPinSync(versionPin, 'Version root', parsed.presetRoot);
    validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
    requirePinnedRootsSync();
    if (mismatches.length > 0) {
      throw new DatasetPresetSnapshotVerificationError(parsed.presetId, parsed.version, mismatches);
    }
    return manifest;
  }

  async function verifyFast(relativeManifestPath: string): Promise<DatasetPresetManifestV1> {
    return verifyFiles(relativeManifestPath, false);
  }

  async function verifyFull(relativeManifestPath: string): Promise<DatasetPresetManifestV1> {
    return verifyFiles(relativeManifestPath, true);
  }

  async function stageVersion(input: StageVersionInput): Promise<StagedPublication> {
    const presetId = validatePresetId(input.presetId);
    const version = validatePositiveVersion(input.version);
    const presetName = normalizePresetName(input.presetName).name;
    if (typeof input.sourceDataset !== 'string' || input.sourceDataset.trim().length === 0) {
      throw new Error('Source dataset must be a nonempty string');
    }
    const loaderConfig = validateLoaderConfig(input.loaderConfig);
    const captionExt = normalizeCaptionExt(input.captionExt, loaderConfig);
    const loaderCaptionExt = loaderConfig.caption_ext.replace(/^\./, '');
    if (captionExt !== loaderCaptionExt) throw new Error('Caption extension must match loader config caption_ext');
    loaderConfig.caption_ext = captionExt;
    if (input.note !== null && typeof input.note !== 'string') throw new Error('Note must be a string or null');
    if (typeof input.note === 'string' && input.note.length > DATASET_PRESET_NOTE_MAX) {
      throw new Error(`Note must be at most ${DATASET_PRESET_NOTE_MAX} characters`);
    }
    if (!Array.isArray(input.selectedPaths) || !Array.isArray(input.retainedPaths ?? [])) {
      throw new Error('Selected and retained paths must be arrays');
    }
    const selectedPaths = input.selectedPaths.map(normalizeRelativeMediaPath);
    const retainedPaths = (input.retainedPaths ?? []).map(normalizeRelativeMediaPath);
    if (selectedPaths.length + retainedPaths.length === 0) throw new Error('A snapshot must contain at least one file');
    const selectedKeys = new Set<string>();
    for (const path of selectedPaths) {
      const key = path.toLowerCase();
      if (selectedKeys.has(key)) throw new Error(`Duplicate selected path: ${path}`);
      selectedKeys.add(key);
    }
    const retainedKeys = new Set<string>();
    for (const path of retainedPaths) {
      const key = path.toLowerCase();
      if (selectedKeys.has(key)) throw new Error(`Path cannot be both selected and retained: ${path}`);
      if (retainedKeys.has(key)) throw new Error(`Duplicate retained path: ${path}`);
      retainedKeys.add(key);
    }
    if (retainedPaths.length > 0 && input.priorManifestPath === undefined) {
      throw new Error('A prior manifest path is required for retained paths');
    }

    const parsedPriorGrammar =
      input.priorManifestPath !== undefined ? parseManifestGrammar(input.priorManifestPath) : undefined;
    if (parsedPriorGrammar && retainedPaths.length > 0 && parsedPriorGrammar.presetId !== presetId) {
      throw new Error('Prior manifest must belong to the same preset ID');
    }

    if (typeof input.sourceRoot !== 'string' || input.sourceRoot.trim().length === 0) {
      throw new Error('Source root must be a nonempty path');
    }
    const configuredDatasetsRoot = input.datasetsRoot ?? resolve(input.sourceRoot, '..');
    if (typeof configuredDatasetsRoot !== 'string' || configuredDatasetsRoot.trim().length === 0) {
      throw new Error('Datasets root must be a nonempty path');
    }
    const canonicalDatasetsRoot = await realpath(configuredDatasetsRoot);
    const datasetsRootInfo = await stat(canonicalDatasetsRoot, { bigint: true });
    if (!datasetsRootInfo.isDirectory()) throw new Error('Datasets root must be a directory');
    const realSourceRoot = await realpath(input.sourceRoot);
    assertWithinRoot(canonicalDatasetsRoot, realSourceRoot, 'Source root');
    const sourceRootInfo = await stat(realSourceRoot, { bigint: true });
    if (!sourceRootInfo.isDirectory()) throw new Error('Source root must be a directory');
    const sourceRootPin = pinDirectorySync(realSourceRoot, 'Source root');

    let priorBySource = new Map<string, DatasetPresetManifestFile>();
    let priorRoot: string | undefined;
    let priorPresetPin: DirectoryPin | undefined;
    let priorVersionPin: DirectoryPin | undefined;
    if (retainedPaths.length > 0 && parsedPriorGrammar && input.priorManifestPath !== undefined) {
      const priorManifest = await verifyFast(input.priorManifestPath);
      if (captionExt !== priorManifest.loader_config.caption_ext.replace(/^\./, '')) {
        throw new Error('Caption extension cannot change while files are retained from the prior manifest');
      }
      const parsedPriorPath = resolveManifestPath(managedRoot, parsedPriorGrammar);
      priorBySource = new Map(priorManifest.files.map(file => [file.source_path.toLowerCase(), file]));
      const selectedFromPrior = selectedPaths.find(path => priorBySource.has(path.toLowerCase()));
      if (selectedFromPrior !== undefined) {
        throw new Error(`Selected path must be absent from the prior manifest: ${selectedFromPrior}`);
      }
      priorRoot = parsedPriorPath.versionRoot;
      priorPresetPin = pinDirectorySync(parsedPriorPath.presetRoot, 'Prior preset root', managedRoot);
      priorVersionPin = pinDirectorySync(parsedPriorPath.versionRoot, 'Prior version root', parsedPriorPath.presetRoot);
    }

    const outputKeys = new Set<string>();
    const reserveOutputs = (mediaPath: string, ext: string): void => {
      for (const path of [mediaPath, sidecarPath(mediaPath, ext)]) {
        const key = path.toLowerCase();
        if (outputKeys.has(key)) throw new Error(`Managed output path collision: ${path}`);
        outputKeys.add(key);
      }
    };
    for (const sourcePath of retainedPaths) {
      const prior = priorBySource.get(sourcePath.toLowerCase());
      if (!prior || !priorRoot) throw new Error(`Retained path is missing from prior manifest: ${sourcePath}`);
      reserveOutputs(prior.managed_path, prior.caption_ext);
    }

    for (const sourcePath of selectedPaths) {
      const managedPath = `media/${sourcePath}`;
      reserveOutputs(managedPath, captionExt);
    }

    const stagingName = nextOwnedName('.staging-');

    await initializeManagedRoot();
    requirePinnedRootsSync();
    const presetRoot = join(managedRoot, presetId);
    await mkdir(presetRoot, { recursive: true, mode: 0o700 });
    const presetPin = pinDirectorySync(presetRoot, 'Preset root', managedRoot);
    const stagingRoot = join(presetRoot, stagingName);
    const versionRoot = join(presetRoot, `v${version}`);
    requirePinnedRootsSync();
    validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
    await mkdir(stagingRoot, { mode: 0o700 });
    let ownedPin = pinDirectorySync(stagingRoot, 'Owned staging directory', presetRoot);
    let state: 'staged' | 'published' | 'rolled-back' = 'staged';
    try {
      const files: DatasetPresetManifestFile[] = [];

      for (const sourcePath of retainedPaths) {
        const prior = priorBySource.get(sourcePath.toLowerCase());
        if (!prior || !priorRoot) throw new Error(`Retained path is missing from prior manifest: ${sourcePath}`);
        requirePinnedRootsSync();
        validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
        validateDirectoryPinSync(ownedPin, 'Owned staging directory', presetRoot);
        if (!priorPresetPin || !priorVersionPin) throw new Error('Prior snapshot identity was not pinned');
        validateDirectoryPinSync(priorPresetPin, 'Prior preset root', managedRoot);
        validateDirectoryPinSync(priorVersionPin, 'Prior version root', priorPresetPin.path);
        const priorMedia = toSystemPath(priorRoot, prior.managed_path);
        const destinationMedia = toSystemPath(stagingRoot, prior.managed_path);
        const media = await copyAndHashPinned(
          priorMedia,
          priorRoot,
          destinationMedia,
          resolvedDependencies.beforeCopyComplete,
        );
        if (media.bytes !== prior.media_bytes || media.sha256 !== prior.media_sha256) {
          throw new Error(`Retained media changed while copying: ${sourcePath}`);
        }
        if (!prior.caption_missing) {
          requirePinnedRootsSync();
          validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
          validateDirectoryPinSync(ownedPin, 'Owned staging directory', presetRoot);
          validateDirectoryPinSync(priorPresetPin, 'Prior preset root', managedRoot);
          validateDirectoryPinSync(priorVersionPin, 'Prior version root', priorPresetPin.path);
          const priorCaptionPath = sidecarPath(prior.managed_path, prior.caption_ext);
          const priorCaption = toSystemPath(priorRoot, priorCaptionPath);
          const destinationCaption = toSystemPath(stagingRoot, priorCaptionPath);
          const caption = await copyAndHashPinned(
            priorCaption,
            priorRoot,
            destinationCaption,
            resolvedDependencies.beforeCopyComplete,
          );
          if (caption.bytes !== prior.caption_bytes || caption.sha256 !== prior.caption_sha256) {
            throw new Error(`Retained caption changed while copying: ${sourcePath}`);
          }
        }
        files.push({ ...prior });
      }

      for (const sourcePath of selectedPaths) {
        requirePinnedRootsSync();
        validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
        validateDirectoryPinSync(ownedPin, 'Owned staging directory', presetRoot);
        validateDirectoryPinSync(sourceRootPin, 'Source root');
        const managedPath = `media/${sourcePath}`;
        const sourceMedia = toSystemPath(realSourceRoot, sourcePath);
        const sourceCaptionPath = sidecarPath(sourcePath, captionExt);
        const sourceCaption = toSystemPath(realSourceRoot, sourceCaptionPath);
        const media = await copyAndHashPinned(
          sourceMedia,
          realSourceRoot,
          toSystemPath(stagingRoot, managedPath),
          resolvedDependencies.beforeCopyComplete,
        );
        let captionText: string | null = null;
        let captionBytes: number | null = null;
        let captionSha256: string | null = null;
        let captionMissing = false;
        try {
          await lstat(sourceCaption, { bigint: true });
        } catch (error) {
          if (isMissing(error)) captionMissing = true;
          else throw error;
        }
        if (!captionMissing) {
          requirePinnedRootsSync();
          validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
          validateDirectoryPinSync(ownedPin, 'Owned staging directory', presetRoot);
          validateDirectoryPinSync(sourceRootPin, 'Source root');
          const managedCaptionPath = sidecarPath(managedPath, captionExt);
          const caption = await copyAndHashPinned(
            sourceCaption,
            realSourceRoot,
            toSystemPath(stagingRoot, managedCaptionPath),
            resolvedDependencies.beforeCopyComplete,
            true,
          );
          try {
            if (caption.content === undefined) throw new Error('Caption bytes were not captured');
            captionText = decoder.decode(caption.content);
          } catch {
            throw new Error(`Caption is not valid UTF-8: ${sourceCaptionPath}`);
          }
          captionBytes = caption.bytes;
          captionSha256 = caption.sha256;
        }
        files.push({
          source_path: sourcePath,
          managed_path: managedPath,
          media_bytes: media.bytes,
          media_sha256: media.sha256,
          caption_ext: captionExt,
          caption_text: captionText,
          caption_bytes: captionBytes,
          caption_sha256: captionSha256,
          caption_missing: captionMissing,
        });
      }

      const manifest = buildDatasetPresetManifest({
        preset_id: presetId,
        version,
        preset_name: presetName,
        source_dataset: input.sourceDataset,
        created_at: new Date().toISOString(),
        note: input.note,
        loader_config: loaderConfig,
        files,
      });
      const manifestText = serializeManifest(manifest);
      const manifestFile = join(stagingRoot, 'manifest.json');
      requirePinnedRootsSync();
      validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
      validateDirectoryPinSync(ownedPin, 'Owned staging directory', presetRoot);
      const handle = await open(manifestFile, 'wx');
      try {
        await handle.writeFile(manifestText, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      const relativeManifestPath = `${presetId}/v${version}/manifest.json`;
      const checksum = manifestSha256(manifest);
      return {
        versionRoot,
        manifestPath: relativeManifestPath,
        get manifest() {
          return cloneManifest(manifest);
        },
        manifestSha256: checksum,
        async publish(): Promise<void> {
          if (state === 'published') return;
          if (state !== 'staged') throw new Error('Cannot publish a rolled-back snapshot');
          requirePinnedRootsSync();
          validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
          validateDirectoryPinSync(ownedPin, 'Owned staging directory', presetRoot);
          if (await pathExists(versionRoot)) {
            const cause = Object.assign(new Error('Final snapshot version destination already exists'), {
              code: 'EEXIST',
            });
            throw new DatasetPresetSnapshotConflictError(`Dataset preset snapshot version v${version} already exists`, {
              cause,
            });
          }
          try {
            await rename(stagingRoot, versionRoot);
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if ((code === 'EEXIST' || code === 'ENOTEMPTY') && (await pathExists(versionRoot))) {
              throw new DatasetPresetSnapshotConflictError(
                `Dataset preset snapshot version v${version} already exists`,
                { cause: error },
              );
            }
            throw error;
          }
          ownedPin = validateMovedDirectoryPin(ownedPin, versionRoot, 'Owned published directory');
          state = 'published';
        },
        async rollback(): Promise<void> {
          if (state === 'rolled-back') return;
          await removePinnedDirectory(ownedPin, presetPin, 'Owned snapshot directory');
          state = 'rolled-back';
        },
      };
    } catch (primaryError) {
      let cleanupError: unknown;
      try {
        await removePinnedDirectory(ownedPin, presetPin, 'Owned staging directory');
      } catch (error) {
        // A failed rm may leave the staging pin as a root tombstone. Public
        // cleanupStaging deliberately ignores those for manual investigation.
        cleanupError = error;
      } finally {
        state = 'rolled-back';
      }
      if (cleanupError !== undefined) {
        const message = primaryError instanceof Error ? primaryError.message : String(primaryError);
        throw new AggregateError([primaryError, cleanupError], message);
      }
      throw primaryError;
    }
  }

  return {
    stageVersion,
    readManifest,
    verifyFast,
    verifyFull,
    createMaintenanceScan,
    resolveMediaRoot(relativeManifestPath: string): string {
      requirePinnedRootsSync();
      const parsed = resolveManifestPath(managedRoot, parseManifestGrammar(relativeManifestPath));
      validateExistingPathSynchronously(parsed);
      const mediaRoot = join(parsed.versionRoot, 'media');
      pinDirectorySync(parsed.presetRoot, 'Preset root', managedRoot);
      pinDirectorySync(parsed.versionRoot, 'Version root', parsed.presetRoot);
      pinDirectorySync(mediaRoot, 'Media root', parsed.versionRoot);
      requirePinnedRootsSync();
      return mediaRoot;
    },
    async quarantineVersion(relativeManifestPath: string): Promise<SnapshotQuarantine> {
      requirePinnedRootsSync();
      const parsed = resolveManifestPath(managedRoot, parseManifestGrammar(relativeManifestPath));
      await readManifest(relativeManifestPath);
      const presetPin = pinDirectorySync(parsed.presetRoot, 'Preset root', managedRoot);
      let quarantinePin = pinDirectorySync(parsed.versionRoot, 'Version root', parsed.presetRoot);
      const quarantineRoot = join(parsed.presetRoot, nextOwnedName(`.quarantine-v${parsed.version}-`));
      if (await pathExists(quarantineRoot)) throw new Error('Quarantine destination already exists');
      requirePinnedRootsSync();
      validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
      validateDirectoryPinSync(quarantinePin, 'Version root', parsed.presetRoot);
      await rename(parsed.versionRoot, quarantineRoot);
      quarantinePin = validateMovedDirectoryPin(quarantinePin, quarantineRoot, 'Quarantine directory');
      let state: 'quarantined' | 'restored' | 'removed' = 'quarantined';
      return {
        async restore(): Promise<void> {
          if (state === 'restored') return;
          if (state === 'removed') throw new Error('Cannot restore a removed quarantine');
          requirePinnedRootsSync();
          validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
          validateDirectoryPinSync(quarantinePin, 'Quarantine directory', parsed.presetRoot);
          if (await pathExists(parsed.versionRoot)) throw new Error('Cannot restore over an existing version');
          await rename(quarantineRoot, parsed.versionRoot);
          quarantinePin = validateMovedDirectoryPin(quarantinePin, parsed.versionRoot, 'Restored version directory');
          state = 'restored';
        },
        async remove(): Promise<void> {
          if (state === 'removed') return;
          if (state !== 'quarantined') throw new Error('Cannot remove a restored quarantine');
          await removePinnedDirectory(quarantinePin, presetPin, 'Quarantine directory');
          state = 'removed';
        },
      };
    },
    async cleanupStaging(olderThan: Date): Promise<StagingCleanupResult> {
      if (!(olderThan instanceof Date) || Number.isNaN(olderThan.getTime()))
        throw new Error('Cleanup cutoff must be a Date');
      await initializeManagedRoot();
      requirePinnedRootsSync();
      const reportedRemoved: string[] = [];
      const reportedSkippedCandidates: string[] = [];
      let totalRemoved = 0;
      let skippedCandidates = 0;
      const skip = (label: string) => {
        skippedCandidates += 1;
        const safe = safeMaintenanceLabel(label);
        if (safe !== undefined) retainFirstSorted(reportedSkippedCandidates, safe, 10);
      };
      for await (const presetEntry of await opendir(managedRoot)) {
        requirePinnedRootsSync();
        // Dot-prefixed preset IDs are valid. Only this reserved root namespace
        // represents an internal deletion tombstone and must be skipped.
        if (presetEntry.name.toLowerCase().startsWith('.tombstone-')) continue;
        if (presetEntry.isSymbolicLink()) {
          skip(presetEntry.name);
          continue;
        }
        if (!presetEntry.isDirectory()) continue;
        const presetRoot = join(managedRoot, presetEntry.name);
        let presetPin: DirectoryPin;
        let presetDirectory;
        try {
          presetPin = pinDirectorySync(presetRoot, 'Preset root', managedRoot);
          presetDirectory = await opendir(presetRoot);
        } catch {
          skip(presetEntry.name);
          continue;
        }
        for await (const childEntry of presetDirectory) {
          if (!/^\.staging-.+/.test(childEntry.name)) continue;
          const relativeStagingPath = `${presetEntry.name}/${childEntry.name}`;
          if (childEntry.isSymbolicLink()) {
            skip(relativeStagingPath);
            continue;
          }
          if (!childEntry.isDirectory()) continue;
          const childPath = join(presetRoot, childEntry.name);
          try {
            const info = await lstat(childPath, { bigint: true });
            if (info.isSymbolicLink() || !info.isDirectory()) {
              skip(relativeStagingPath);
              continue;
            }
            if (info.mtimeMs >= BigInt(olderThan.getTime())) continue;
            const stagingPin = pinDirectorySync(childPath, 'Staging directory', presetRoot);
            await removePinnedDirectory(stagingPin, presetPin, 'Staging directory');
          } catch {
            skip(relativeStagingPath);
            continue;
          }
          totalRemoved += 1;
          retainFirstSorted(
            reportedRemoved,
            `${presetEntry.name}/${childEntry.name}`,
            DATASET_PRESET_MAINTENANCE_MAX_REPORT,
          );
        }
      }
      return {
        reportedRemoved,
        totalRemoved,
        truncatedRemoved: Math.max(0, totalRemoved - reportedRemoved.length),
        skippedCandidates,
        reportedSkippedCandidates,
      };
    },
    async findPublishedOrphans(authoritativeManifestPaths: readonly string[]): Promise<PublishedOrphanScanResult> {
      if (!Array.isArray(authoritativeManifestPaths)) throw new Error('Manifest paths must be an array');
      await initializeManagedRoot();
      requirePinnedRootsSync();

      const authoritative = new Set<string>();
      for (const value of authoritativeManifestPaths) {
        try {
          const grammar = parseManifestGrammar(value);
          authoritative.add(`${grammar.presetId}/v${grammar.version}/manifest.json`);
        } catch {
          // A malformed database value cannot make any published directory
          // authoritative. The regular verification path reports that record.
        }
      }

      const reportedOrphans: string[] = [];
      const reportedSkippedCandidates: string[] = [];
      let totalOrphans = 0;
      let skippedCandidates = 0;
      const skip = (label: string) => {
        skippedCandidates += 1;
        const safe = safeMaintenanceLabel(label);
        if (safe !== undefined) retainFirstSorted(reportedSkippedCandidates, safe, 10);
      };
      for await (const presetEntry of await opendir(managedRoot)) {
        if (presetEntry.name.toLowerCase().startsWith('.tombstone-')) continue;
        if (presetEntry.isSymbolicLink()) {
          skip(presetEntry.name);
          continue;
        }
        if (!presetEntry.isDirectory()) continue;
        let presetId: string;
        let presetRoot: string;
        try {
          presetId = validatePresetId(presetEntry.name);
          presetRoot = join(managedRoot, presetId);
          pinDirectorySync(presetRoot, 'Preset root', managedRoot);
        } catch {
          skip(presetEntry.name);
          continue;
        }

        let presetDirectory;
        try {
          presetDirectory = await opendir(presetRoot);
        } catch (error) {
          skip(presetId);
          continue;
        }
        for await (const child of presetDirectory) {
          const match = /^v([1-9]\d*)$/.exec(child.name);
          if (!match) continue;
          const relativeVersionPath = `${presetId}/${child.name}`;
          if (child.isSymbolicLink() || !child.isDirectory()) {
            skip(relativeVersionPath);
            continue;
          }
          const version = Number(match[1]);
          if (!Number.isSafeInteger(version)) {
            skip(relativeVersionPath);
            continue;
          }
          const versionRoot = join(presetRoot, child.name);
          try {
            await resolvedDependencies.beforeOrphanCandidateCheck?.(relativeVersionPath);
            pinDirectorySync(versionRoot, 'Version root', presetRoot);
            const manifestInfo = await lstat(join(versionRoot, 'manifest.json'), { bigint: true });
            if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile()) {
              skip(relativeVersionPath);
              continue;
            }
            validateAccountBoundary(manifestInfo, 'Manifest');
          } catch (error) {
            skip(relativeVersionPath);
            continue;
          }
          const manifestPath = `${presetId}/v${version}/manifest.json`;
          if (!authoritative.has(manifestPath)) {
            totalOrphans += 1;
            retainFirstSorted(reportedOrphans, relativeVersionPath, DATASET_PRESET_MAINTENANCE_MAX_REPORT);
          }
        }
      }
      return {
        reportedOrphans,
        totalOrphans,
        truncatedOrphans: Math.max(0, totalOrphans - reportedOrphans.length),
        skippedCandidates,
        reportedSkippedCandidates,
      };
    },
  };
}
