import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, lstatSync } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import { isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import {
  buildDatasetPresetManifest,
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
}

const decoder = new TextDecoder('utf-8', { fatal: true });

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function isDescendant(root: string, candidate: string): boolean {
  const child = relative(root, candidate);
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

function assertOwnedPath(root: string, candidate: string, expected: string): void {
  if (candidate !== expected || !isDescendant(root, candidate)) {
    throw new Error(`Refusing unsafe managed path: ${candidate}`);
  }
}

function validatePresetId(value: unknown): string {
  const normalized = normalizeRelativeMediaPath(value);
  if (normalized.includes('/')) throw new Error('Preset ID must be one portable directory component');
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

async function ensureDirectoryNoSymlink(path: string, label: string): Promise<void> {
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${label} must be a non-symlink directory`);
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

async function requireRegularNoSymlinks(root: string, portablePath: string): Promise<string> {
  const normalized = normalizeRelativeMediaPath(portablePath);
  let current = root;
  const segments = normalized.split('/');
  for (let index = 0; index < segments.length; index += 1) {
    current = join(current, segments[index]);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error(`Snapshot path must not contain symlinks: ${normalized}`);
    if (index < segments.length - 1 && !info.isDirectory()) {
      throw new Error(`Snapshot path component must be a directory: ${normalized}`);
    }
    if (index === segments.length - 1 && !info.isFile()) {
      throw new Error(`Snapshot path must be a regular file: ${normalized}`);
    }
  }
  return current;
}

async function copyAndHash(
  sourcePath: string,
  destinationPath: string,
  beforeCopyComplete?: (sourcePath: string) => void | Promise<void>,
): Promise<CopyResult> {
  const before = await stat(sourcePath);
  if (!before.isFile()) throw new Error(`Source must be a regular file: ${sourcePath}`);
  await mkdir(resolve(destinationPath, '..'), { recursive: true });
  const hash = createHash('sha256');
  let bytes = 0;
  const hashingStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      createReadStream(sourcePath),
      hashingStream,
      createWriteStream(destinationPath, { flags: 'wx' }),
    );
    await beforeCopyComplete?.(sourcePath);
    const after = await stat(sourcePath);
    if (!after.isFile() || before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      throw new Error(`Source changed while it was being copied: ${sourcePath}`);
    }
    const output = await open(destinationPath, 'r');
    try {
      await output.sync();
    } finally {
      await output.close();
    }
    return { bytes, sha256: hash.digest('hex') };
  } catch (error) {
    await rm(destinationPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  const hashingStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      callback();
    },
  });
  await pipeline(createReadStream(path), hashingStream);
  return hash.digest('hex');
}

async function resolveLiveFile(realSourceRoot: string, portablePath: string): Promise<string> {
  const candidate = toSystemPath(realSourceRoot, portablePath);
  const linkInfo = await lstat(candidate);
  if (!linkInfo.isFile() && !linkInfo.isSymbolicLink()) {
    throw new Error(`Source must be a regular file: ${portablePath}`);
  }
  const actual = await realpath(candidate);
  if (!isDescendant(realSourceRoot, actual)) throw new Error(`Source symlink escapes source root: ${portablePath}`);
  const actualInfo = await stat(actual);
  if (!actualInfo.isFile()) throw new Error(`Source must be a regular file: ${portablePath}`);
  return actual;
}

async function resolveOptionalLiveFile(realSourceRoot: string, portablePath: string): Promise<string | undefined> {
  const candidate = toSystemPath(realSourceRoot, portablePath);
  try {
    await lstat(candidate);
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
  return resolveLiveFile(realSourceRoot, portablePath);
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
    try {
      const info = lstatSync(candidate);
      if (info.isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
      if (directory && !info.isDirectory()) throw new Error(`${label} must be a directory`);
      if (!directory && !info.isFile()) throw new Error(`${label} must be a regular file`);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
}

export function createDatasetPresetSnapshotStore(
  dataRoot: string,
  dependencies?: Partial<DatasetPresetSnapshotDependencies>,
): DatasetPresetSnapshotStore {
  const managedRoot = resolve(join(dataRoot, 'dataset_presets'));
  const resolvedDependencies: DatasetPresetSnapshotDependencies = {
    randomId: dependencies?.randomId ?? randomUUID,
    beforeCopyComplete: dependencies?.beforeCopyComplete,
  };

  function nextOwnedName(prefix: string): string {
    const id = validatePresetId(resolvedDependencies.randomId());
    return `${prefix}${id}`;
  }

  async function initializeManagedRoot(): Promise<void> {
    await mkdir(managedRoot, { recursive: true });
    await ensureDirectoryNoSymlink(managedRoot, 'Dataset preset root');
  }

  async function readManifest(relativeManifestPath: string): Promise<DatasetPresetManifestV1> {
    const parsed = parseManifestPath(managedRoot, relativeManifestPath);
    await ensureDirectoryNoSymlink(parsed.presetRoot, 'Preset root');
    await ensureDirectoryNoSymlink(parsed.versionRoot, 'Version root');
    await requireRegularNoSymlinks(parsed.versionRoot, 'manifest.json');
    const raw = await readFile(parsed.manifestFile, 'utf8');
    let untrusted: unknown;
    try {
      untrusted = JSON.parse(raw);
    } catch {
      throw new Error('Snapshot manifest is not valid JSON');
    }
    const manifest = validateManifest(untrusted);
    if (raw !== serializeManifest(manifest)) throw new Error('Snapshot manifest is not in canonical checksum form');
    if (manifest.preset_id !== parsed.presetId || manifest.version !== parsed.version) {
      throw new Error('Snapshot manifest identity does not match its managed path');
    }
    return manifest;
  }

  async function verifyFast(relativeManifestPath: string): Promise<DatasetPresetManifestV1> {
    const parsed = parseManifestPath(managedRoot, relativeManifestPath);
    const manifest = await readManifest(relativeManifestPath);
    for (const file of manifest.files) {
      const managedPath = normalizeRelativeMediaPath(file.managed_path);
      if (!managedPath.startsWith('media/')) throw new Error(`Managed media path must be within media/: ${managedPath}`);
      const mediaPath = await requireRegularNoSymlinks(parsed.versionRoot, managedPath);
      const mediaInfo = await stat(mediaPath);
      if (mediaInfo.size !== file.media_bytes) throw new Error(`Managed media size mismatch: ${managedPath}`);
      const captionPath = sidecarPath(managedPath, file.caption_ext);
      if (file.caption_missing) {
        if (await pathExists(toSystemPath(parsed.versionRoot, captionPath))) {
          throw new Error(`Unexpected managed caption exists: ${captionPath}`);
        }
      } else {
        const managedCaption = await requireRegularNoSymlinks(parsed.versionRoot, captionPath);
        const captionInfo = await stat(managedCaption);
        if (captionInfo.size !== file.caption_bytes) throw new Error(`Managed caption size mismatch: ${captionPath}`);
      }
    }
    return manifest;
  }

  async function verifyFull(relativeManifestPath: string): Promise<DatasetPresetManifestV1> {
    const parsed = parseManifestPath(managedRoot, relativeManifestPath);
    const manifest = await verifyFast(relativeManifestPath);
    for (const file of manifest.files) {
      const mediaPath = toSystemPath(parsed.versionRoot, file.managed_path);
      if ((await hashFile(mediaPath)) !== file.media_sha256) {
        throw new Error(`Managed media checksum mismatch: ${file.managed_path}`);
      }
      if (!file.caption_missing) {
        const captionPath = sidecarPath(file.managed_path, file.caption_ext);
        if ((await hashFile(toSystemPath(parsed.versionRoot, captionPath))) !== file.caption_sha256) {
          throw new Error(`Managed caption checksum mismatch: ${captionPath}`);
        }
      }
    }
    return manifest;
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
    if (retainedPaths.length > 0 && !input.priorManifestPath) {
      throw new Error('A prior manifest path is required for retained paths');
    }

    await initializeManagedRoot();
    const presetRoot = join(managedRoot, presetId);
    await mkdir(presetRoot, { recursive: true });
    await ensureDirectoryNoSymlink(presetRoot, 'Preset root');
    const stagingRoot = join(presetRoot, nextOwnedName('.staging-'));
    const versionRoot = join(presetRoot, `v${version}`);
    assertOwnedPath(managedRoot, stagingRoot, stagingRoot);
    assertOwnedPath(managedRoot, versionRoot, versionRoot);
    await mkdir(stagingRoot);
    let state: 'staged' | 'published' | 'rolled-back' = 'staged';
    try {
      const realSourceRoot = await realpath(input.sourceRoot);
      const sourceRootInfo = await stat(realSourceRoot);
      if (!sourceRootInfo.isDirectory()) throw new Error('Source root must be a directory');
      const files: DatasetPresetManifestFile[] = [];
      const outputKeys = new Set<string>();

      const reserveOutputs = (mediaPath: string, ext: string): void => {
        for (const path of [mediaPath, sidecarPath(mediaPath, ext)]) {
          const key = path.toLowerCase();
          if (outputKeys.has(key)) throw new Error(`Managed output path collision: ${path}`);
          outputKeys.add(key);
        }
      };

      let priorBySource = new Map<string, DatasetPresetManifestFile>();
      let priorRoot: string | undefined;
      if (retainedPaths.length > 0) {
        const priorPath = parseManifestPath(managedRoot, input.priorManifestPath as string);
        if (priorPath.presetId !== presetId) throw new Error('Prior manifest must belong to the same preset ID');
        const priorManifest = await verifyFast(input.priorManifestPath as string);
        priorBySource = new Map(priorManifest.files.map(file => [file.source_path.toLowerCase(), file]));
        priorRoot = priorPath.versionRoot;
      }

      for (const sourcePath of retainedPaths) {
        const prior = priorBySource.get(sourcePath.toLowerCase());
        if (!prior || !priorRoot) throw new Error(`Retained path is missing from prior manifest: ${sourcePath}`);
        reserveOutputs(prior.managed_path, prior.caption_ext);
        const priorMedia = await requireRegularNoSymlinks(priorRoot, prior.managed_path);
        const destinationMedia = toSystemPath(stagingRoot, prior.managed_path);
        const media = await copyAndHash(priorMedia, destinationMedia, resolvedDependencies.beforeCopyComplete);
        if (media.bytes !== prior.media_bytes || media.sha256 !== prior.media_sha256) {
          throw new Error(`Retained media changed while copying: ${sourcePath}`);
        }
        if (!prior.caption_missing) {
          const priorCaptionPath = sidecarPath(prior.managed_path, prior.caption_ext);
          const priorCaption = await requireRegularNoSymlinks(priorRoot, priorCaptionPath);
          const destinationCaption = toSystemPath(stagingRoot, priorCaptionPath);
          const caption = await copyAndHash(priorCaption, destinationCaption, resolvedDependencies.beforeCopyComplete);
          if (caption.bytes !== prior.caption_bytes || caption.sha256 !== prior.caption_sha256) {
            throw new Error(`Retained caption changed while copying: ${sourcePath}`);
          }
        }
        files.push({ ...prior });
      }

      for (const sourcePath of selectedPaths) {
        const managedPath = `media/${sourcePath}`;
        const sourceMedia = await resolveLiveFile(realSourceRoot, sourcePath);
        const sourceCaptionPath = sidecarPath(sourcePath, captionExt);
        const sourceCaption = await resolveOptionalLiveFile(realSourceRoot, sourceCaptionPath);
        reserveOutputs(managedPath, captionExt);
        const media = await copyAndHash(
          sourceMedia,
          toSystemPath(stagingRoot, managedPath),
          resolvedDependencies.beforeCopyComplete,
        );
        let captionText: string | null = null;
        let captionBytes: number | null = null;
        let captionSha256: string | null = null;
        if (sourceCaption !== undefined) {
          const managedCaptionPath = sidecarPath(managedPath, captionExt);
          const caption = await copyAndHash(
            sourceCaption,
            toSystemPath(stagingRoot, managedCaptionPath),
            resolvedDependencies.beforeCopyComplete,
          );
          const captionBuffer = await readFile(toSystemPath(stagingRoot, managedCaptionPath));
          try {
            captionText = decoder.decode(captionBuffer);
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
          caption_missing: sourceCaption === undefined,
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
          if (await pathExists(versionRoot)) throw new Error(`Refusing to replace existing version: v${version}`);
          await rename(stagingRoot, versionRoot);
          state = 'published';
        },
        async rollback(): Promise<void> {
          if (state === 'rolled-back') return;
          const target = state === 'published' ? versionRoot : stagingRoot;
          const expected = state === 'published' ? versionRoot : stagingRoot;
          assertOwnedPath(managedRoot, target, expected);
          await rm(target, { recursive: true, force: true });
          state = 'rolled-back';
        },
      };
    } catch (error) {
      assertOwnedPath(managedRoot, stagingRoot, stagingRoot);
      await rm(stagingRoot, { recursive: true, force: true });
      state = 'rolled-back';
      throw error;
    }
  }

  return {
    stageVersion,
    readManifest,
    verifyFast,
    verifyFull,
    resolveMediaRoot(relativeManifestPath: string): string {
      const parsed = parseManifestPath(managedRoot, relativeManifestPath);
      validateExistingPathSynchronously(parsed);
      return join(parsed.versionRoot, 'media');
    },
    async quarantineVersion(relativeManifestPath: string): Promise<SnapshotQuarantine> {
      const parsed = parseManifestPath(managedRoot, relativeManifestPath);
      await readManifest(relativeManifestPath);
      const quarantineRoot = join(parsed.presetRoot, nextOwnedName(`.quarantine-v${parsed.version}-`));
      assertOwnedPath(managedRoot, parsed.versionRoot, parsed.versionRoot);
      assertOwnedPath(managedRoot, quarantineRoot, quarantineRoot);
      if (await pathExists(quarantineRoot)) throw new Error('Quarantine destination already exists');
      await rename(parsed.versionRoot, quarantineRoot);
      let state: 'quarantined' | 'restored' | 'removed' = 'quarantined';
      return {
        async restore(): Promise<void> {
          if (state === 'restored') return;
          if (state === 'removed') throw new Error('Cannot restore a removed quarantine');
          if (await pathExists(parsed.versionRoot)) throw new Error('Cannot restore over an existing version');
          await rename(quarantineRoot, parsed.versionRoot);
          state = 'restored';
        },
        async remove(): Promise<void> {
          if (state === 'removed') return;
          if (state !== 'quarantined') throw new Error('Cannot remove a restored quarantine');
          assertOwnedPath(managedRoot, quarantineRoot, quarantineRoot);
          await rm(quarantineRoot, { recursive: true, force: true });
          state = 'removed';
        },
      };
    },
    async cleanupStaging(olderThan: Date): Promise<string[]> {
      if (!(olderThan instanceof Date) || Number.isNaN(olderThan.getTime())) throw new Error('Cleanup cutoff must be a Date');
      await initializeManagedRoot();
      const removed: string[] = [];
      for (const presetEntry of await readdir(managedRoot, { withFileTypes: true })) {
        if (!presetEntry.isDirectory() || presetEntry.isSymbolicLink()) continue;
        const presetRoot = join(managedRoot, presetEntry.name);
        for (const childEntry of await readdir(presetRoot, { withFileTypes: true })) {
          if (!childEntry.isDirectory() || childEntry.isSymbolicLink() || !/^\.staging-.+/.test(childEntry.name)) continue;
          const childPath = join(presetRoot, childEntry.name);
          const info = await lstat(childPath);
          if (info.isSymbolicLink() || !info.isDirectory() || info.mtimeMs >= olderThan.getTime()) continue;
          assertOwnedPath(managedRoot, childPath, join(presetRoot, childEntry.name));
          await rm(childPath, { recursive: true });
          removed.push(`${presetEntry.name}/${childEntry.name}`);
        }
      }
      return removed.sort();
    },
  };
}
