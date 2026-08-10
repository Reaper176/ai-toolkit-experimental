import { createHash, randomUUID } from 'node:crypto';
import { constants, createWriteStream, lstatSync, realpathSync, statSync } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import type { Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
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
  cleanupStaging(olderThan: Date): Promise<string[]>;
}

export interface DatasetPresetSnapshotDependencies {
  randomId(): string;
  beforeCopyComplete?: (sourcePath: string) => void | Promise<void>;
}

interface ParsedManifestPath {
  presetId: string;
  version: number;
  presetRoot: string;
  versionRoot: string;
  manifestFile: string;
}

interface CopyResult {
  bytes: number;
  sha256: string;
  content?: Buffer;
}

interface DirectoryPin {
  path: string;
  realPath: string;
  dev: number | bigint;
  ino: number | bigint;
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
  baseline: Stats;
}

const decoder = new TextDecoder('utf-8', { fatal: true });

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function isDescendant(root: string, candidate: string): boolean {
  const child = relative(root, candidate);
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

function sameIdentity(left: Pick<Stats, 'dev' | 'ino'>, right: Pick<Stats, 'dev' | 'ino'>): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function pinFromStats(path: string, realPath: string, info: Stats): DirectoryPin {
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

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
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
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error(`Path component must not be a symlink: ${current}`);
  }
}

async function validatePinnedFile(file: PinnedRegularFile): Promise<Stats> {
  const opened = await file.handle.stat();
  if (!opened.isFile()) throw new Error(`Opened file is no longer regular: ${file.path}`);
  const pathInfo = await lstat(file.path);
  if (pathInfo.isSymbolicLink() || !pathInfo.isFile()) throw new Error(`File path identity changed: ${file.path}`);
  await assertNoSymlinkComponents(file.trustedRoot, file.path);
  const currentRealPath = await realpath(file.path);
  assertWithinRoot(file.trustedRoot, currentRealPath, 'File path');
  if (currentRealPath !== file.realPath || !sameIdentity(opened, pathInfo)) {
    throw new Error(`File path identity changed: ${file.path}`);
  }
  if (
    opened.size !== file.baseline.size
    || opened.mtimeMs !== file.baseline.mtimeMs
    || !sameIdentity(opened, file.baseline)
  ) {
    throw new Error(`Source changed while it was being copied: ${file.path}`);
  }
  return opened;
}

async function openPinnedRegularFile(path: string, trustedRoot: string): Promise<PinnedRegularFile> {
  await assertNoSymlinkComponents(trustedRoot, path);
  const before = await lstat(path);
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
      bytes += chunk.length;
      hash.update(chunk);
      if (captureContent) chunks.push(Buffer.from(chunk));
      callback(null, chunk);
    },
  });
  try {
    await mkdir(resolve(destinationPath, '..'), { recursive: true });
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

function parseManifestPath(managedRoot: string, relativeManifestPath: string): ParsedManifestPath {
  if (typeof relativeManifestPath !== 'string' || isAbsolute(relativeManifestPath) || relativeManifestPath.includes('\\')) {
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
    const info = lstatSync(candidate);
    if (info.isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
    if (directory && !info.isDirectory()) throw new Error(`${label} must be a directory`);
    if (!directory && !info.isFile()) throw new Error(`${label} must be a regular file`);
  }
}

export function createDatasetPresetSnapshotStore(
  dataRoot: string,
  dependencies?: Partial<DatasetPresetSnapshotDependencies>,
): DatasetPresetSnapshotStore {
  const absoluteDataRoot = resolve(dataRoot);
  const managedRoot = join(absoluteDataRoot, 'dataset_presets');
  const resolvedDependencies: DatasetPresetSnapshotDependencies = {
    randomId: dependencies?.randomId ?? randomUUID,
    beforeCopyComplete: dependencies?.beforeCopyComplete,
  };
  let rootPin: RootPin | undefined;

  function pinDirectorySync(path: string, label: string, trustedRoot?: string): DirectoryPin {
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${label} must be a non-symlink directory`);
    const realPath = realpathSync(path);
    if (realPath !== path) throw new Error(`${label} must have a canonical non-symlink parent chain`);
    if (trustedRoot !== undefined) assertWithinRoot(trustedRoot, realPath, label);
    const followed = statSync(path);
    if (!sameIdentity(info, followed)) throw new Error(`${label} identity changed while pinning`);
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
      rootPin = {
        data: pinDirectorySync(absoluteDataRoot, 'Data root'),
        managed: pinDirectorySync(managedRoot, 'Dataset preset root', absoluteDataRoot),
      };
    }
    validateDirectoryPinSync(rootPin.data, 'Data root');
    validateDirectoryPinSync(rootPin.managed, 'Dataset preset root', absoluteDataRoot);
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
    await mkdir(absoluteDataRoot, { recursive: true });
    pinDirectorySync(absoluteDataRoot, 'Data root');
    try {
      await mkdir(managedRoot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    rootPin = {
      data: pinDirectorySync(absoluteDataRoot, 'Data root'),
      managed: pinDirectorySync(managedRoot, 'Dataset preset root', absoluteDataRoot),
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

  async function removePinnedDirectory(pin: DirectoryPin, parentPin: DirectoryPin, label: string): Promise<void> {
    requirePinnedRootsSync();
    validateDirectoryPinSync(parentPin, `${label} parent`, managedRoot);
    validateDirectoryPinSync(pin, label, parentPin.path);
    const tombstonePath = join(managedRoot, nextOwnedName('.tombstone-'));
    if (await pathExists(tombstonePath)) throw new Error('Owned tombstone destination already exists');

    // Node has no portable openat2/renameat2 binding. Rename into the pinned root,
    // then re-check dev/ino before rm so a swapped pathname is never recursively removed.
    await rename(pin.path, tombstonePath);
    const tombstonePin = validateMovedDirectoryPin(pin, tombstonePath, `${label} tombstone`);
    requirePinnedRootsSync();
    validateDirectoryPinSync(tombstonePin, `${label} tombstone`, managedRoot);
    await rm(tombstonePath, { recursive: true });
  }

  async function readManifest(relativeManifestPath: string): Promise<DatasetPresetManifestV1> {
    requirePinnedRootsSync();
    const parsed = parseManifestPath(managedRoot, relativeManifestPath);
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
    const parsed = parseManifestPath(managedRoot, relativeManifestPath);
    const manifest = await readManifest(relativeManifestPath);
    const presetPin = pinDirectorySync(parsed.presetRoot, 'Preset root', managedRoot);
    const versionPin = pinDirectorySync(parsed.versionRoot, 'Version root', parsed.presetRoot);
    for (const file of manifest.files) {
      requirePinnedRootsSync();
      validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
      validateDirectoryPinSync(versionPin, 'Version root', parsed.presetRoot);
      const managedPath = normalizeRelativeMediaPath(file.managed_path);
      if (!managedPath.startsWith('media/')) throw new Error(`Managed media path must be within media/: ${managedPath}`);
      const mediaPath = toSystemPath(parsed.versionRoot, managedPath);
      const pinnedMedia = await openPinnedRegularFile(mediaPath, parsed.versionRoot);
      try {
        const mediaInfo = await pinnedMedia.handle.stat();
        if (mediaInfo.size !== file.media_bytes) throw new Error(`Managed media size mismatch: ${managedPath}`);
        if (full && (await hashPinnedFile(pinnedMedia)) !== file.media_sha256) {
          throw new Error(`Managed media checksum mismatch: ${managedPath}`);
        }
      } finally {
        await pinnedMedia.handle.close().catch(() => undefined);
      }
      const captionPath = sidecarPath(managedPath, file.caption_ext);
      const absoluteCaptionPath = toSystemPath(parsed.versionRoot, captionPath);
      if (file.caption_missing) {
        if (await pathExists(absoluteCaptionPath)) {
          throw new Error(`Unexpected managed caption exists: ${captionPath}`);
        }
      } else {
        const pinnedCaption = await openPinnedRegularFile(absoluteCaptionPath, parsed.versionRoot);
        try {
          const captionInfo = await pinnedCaption.handle.stat();
          if (captionInfo.size !== file.caption_bytes) throw new Error(`Managed caption size mismatch: ${captionPath}`);
          if (full && (await hashPinnedFile(pinnedCaption)) !== file.caption_sha256) {
            throw new Error(`Managed caption checksum mismatch: ${captionPath}`);
          }
        } finally {
          await pinnedCaption.handle.close().catch(() => undefined);
        }
      }
    }
    validateDirectoryPinSync(versionPin, 'Version root', parsed.presetRoot);
    validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
    requirePinnedRootsSync();
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

    const parsedPriorPath = input.priorManifestPath !== undefined
      ? parseManifestPath(managedRoot, input.priorManifestPath)
      : undefined;
    if (parsedPriorPath && retainedPaths.length > 0 && parsedPriorPath.presetId !== presetId) {
      throw new Error('Prior manifest must belong to the same preset ID');
    }

    if (typeof input.sourceRoot !== 'string' || input.sourceRoot.trim().length === 0) {
      throw new Error('Source root must be a nonempty path');
    }
    const realSourceRoot = await realpath(input.sourceRoot);
    const sourceRootInfo = await stat(realSourceRoot);
    if (!sourceRootInfo.isDirectory()) throw new Error('Source root must be a directory');
    const sourceRootPin = pinDirectorySync(realSourceRoot, 'Source root');

    let priorBySource = new Map<string, DatasetPresetManifestFile>();
    let priorRoot: string | undefined;
    let priorPresetPin: DirectoryPin | undefined;
    let priorVersionPin: DirectoryPin | undefined;
    if (retainedPaths.length > 0 && parsedPriorPath && input.priorManifestPath !== undefined) {
      const priorManifest = await verifyFast(input.priorManifestPath);
      priorBySource = new Map(priorManifest.files.map(file => [file.source_path.toLowerCase(), file]));
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
    await mkdir(presetRoot, { recursive: true });
    const presetPin = pinDirectorySync(presetRoot, 'Preset root', managedRoot);
    const stagingRoot = join(presetRoot, stagingName);
    const versionRoot = join(presetRoot, `v${version}`);
    requirePinnedRootsSync();
    validateDirectoryPinSync(presetPin, 'Preset root', managedRoot);
    await mkdir(stagingRoot);
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
          await lstat(sourceCaption);
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
          if (await pathExists(versionRoot)) throw new Error(`Refusing to replace existing version: v${version}`);
          await rename(stagingRoot, versionRoot);
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
    resolveMediaRoot(relativeManifestPath: string): string {
      requirePinnedRootsSync();
      const parsed = parseManifestPath(managedRoot, relativeManifestPath);
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
      const parsed = parseManifestPath(managedRoot, relativeManifestPath);
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
    async cleanupStaging(olderThan: Date): Promise<string[]> {
      if (!(olderThan instanceof Date) || Number.isNaN(olderThan.getTime())) throw new Error('Cleanup cutoff must be a Date');
      await initializeManagedRoot();
      requirePinnedRootsSync();
      const removed: string[] = [];
      for (const presetEntry of await readdir(managedRoot, { withFileTypes: true })) {
        requirePinnedRootsSync();
        if (presetEntry.isSymbolicLink()) throw new Error(`Preset parent must not be a symlink: ${presetEntry.name}`);
        if (!presetEntry.isDirectory() || presetEntry.name.toLowerCase().startsWith('.tombstone-')) continue;
        const presetRoot = join(managedRoot, presetEntry.name);
        const presetPin = pinDirectorySync(presetRoot, 'Preset root', managedRoot);
        for (const childEntry of await readdir(presetRoot, { withFileTypes: true })) {
          if (!/^\.staging-.+/.test(childEntry.name)) continue;
          if (childEntry.isSymbolicLink()) throw new Error(`Staging directory must not be a symlink: ${childEntry.name}`);
          if (!childEntry.isDirectory()) continue;
          const childPath = join(presetRoot, childEntry.name);
          const info = await lstat(childPath);
          if (info.isSymbolicLink() || !info.isDirectory() || info.mtimeMs >= olderThan.getTime()) continue;
          const stagingPin = pinDirectorySync(childPath, 'Staging directory', presetRoot);
          await removePinnedDirectory(stagingPin, presetPin, 'Staging directory');
          removed.push(`${presetEntry.name}/${childEntry.name}`);
        }
      }
      return removed.sort();
    },
  };
}
