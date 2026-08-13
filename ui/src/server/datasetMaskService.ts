import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, readdir, readFile, rename as fsRename, rm, type FileHandle } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { imageSize } from 'image-size';
import { PNG } from 'pngjs';

export interface DatasetMaskReadResult {
  exists: boolean;
  width: number;
  height: number;
  png: Buffer | null;
  source_identity?: DatasetMaskSourceIdentity;
  source_sha256?: string;
}

export interface DatasetMaskSourceIdentity { dev: string; ino: string }

export interface DatasetMaskDependencies {
  datasetsRoot: string;
  maxPngBytes: number;
  rename?: typeof fsRename;
  beforeSourceFileOpen?: () => void | Promise<void>;
  beforeMaskFileOpen?: () => void | Promise<void>;
  beforeTemporaryOpen?: () => void | Promise<void>;
  filesystemStrategy?: 'descriptor' | 'portable';
}

export interface DatasetMaskService {
  read(dataset: string, sourcePath: string): Promise<DatasetMaskReadResult>;
  save(dataset: string, sourcePath: string, png: Buffer): Promise<void>;
  delete(dataset: string, sourcePath: string): Promise<void>;
  deleteByAbsoluteSource(sourcePath: string): Promise<void>;
}

const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const DIRECTORY_FLAGS = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
const READ_FLAGS = constants.O_RDONLY | constants.O_NOFOLLOW;

function descriptorPath(handle: FileHandle, child?: string): string {
  return child === undefined ? `/proc/self/fd/${handle.fd}` : `/proc/self/fd/${handle.fd}/${child}`;
}

async function openDirectory(path: string): Promise<FileHandle> {
  const handle = await open(path, DIRECTORY_FLAGS);
  const stat = await handle.stat();
  if (!stat.isDirectory()) {
    await handle.close();
    throw new Error('Path is not a directory');
  }
  return handle;
}

async function openFileAt(directory: FileHandle, name: string): Promise<FileHandle> {
  try {
    const handle = await open(descriptorPath(directory, name), READ_FLAGS);
    const stat = await handle.stat();
    if (!stat.isFile()) {
      await handle.close();
      throw new Error('Path is not a regular file');
    }
    return handle;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ELOOP') throw new Error('Refusing symlink open');
    throw error;
  }
}

function assertSingleSegment(value: string, label: string): void {
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || isAbsolute(value)) {
    throw new Error(`Invalid ${label} path`);
  }
}

function sourceSegments(sourcePath: string): string[] {
  if (!sourcePath || isAbsolute(sourcePath) || sourcePath.includes('\\') || sourcePath.includes('\0')) {
    throw new Error('Invalid source path');
  }
  const segments = sourcePath.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('Invalid source path segment');
  }
  return segments;
}

async function absoluteSourceParts(datasetsRoot: string, sourcePath: string): Promise<{ dataset: string; source: string }> {
  if (!isAbsolute(sourcePath)) throw new Error('Invalid absolute source path');
  const root = resolve(datasetsRoot);
  const child = relative(root, sourcePath);
  if (child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) throw new Error('Path escapes datasets root');
  const parts = child.split(sep);
  if (parts.length < 2) throw new Error('Invalid absolute source path');
  assertSingleSegment(parts[0], 'dataset');
  const source = parts.slice(1).join('/');
  sourceSegments(source);
  return { dataset: parts[0], source };
}

export function maskDatasetName(dataset: string): string {
  assertSingleSegment(dataset, 'dataset');
  return `${dataset}_masks`;
}

export function maskFilename(sourcePath: string): string {
  const segments = sourceSegments(sourcePath);
  const name = segments[segments.length - 1];
  return `${basename(name, extname(name))}.png`;
}

export function assertUniqueMaskBasenames(paths: readonly string[]): void {
  const seen = new Set<string>();
  for (const path of paths) {
    const name = maskFilename(path).toLocaleLowerCase('en-US');
    if (seen.has(name)) throw new Error(`Duplicate mask basename: ${name}`);
    seen.add(name);
  }
}

export async function resolveLiveMaskDirectory(sourceRoot: string, options: {
  datasetsRoot?: string; maxDepth?: number; maxFiles?: number; maxEntries?: number; maxDirectories?: number;
  maxPngBytes?: number;
  filesystemStrategy?: 'descriptor' | 'portable';
  beforeChildDirectoryOpen?: (relativePath: string) => void | Promise<void>;
} = {}): Promise<string | null> {
  if (!isAbsolute(sourceRoot)) throw new Error('Live dataset path must be absolute');
  const maxDepth = options.maxDepth ?? 32;
  const maxFiles = options.maxFiles ?? 10_000;
  const maxEntries = options.maxEntries ?? 50_000;
  const maxDirectories = options.maxDirectories ?? 10_000;
  let canonicalSource: string;
  try {
    canonicalSource = await realpath(sourceRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  if (canonicalSource !== resolve(sourceRoot)) throw new Error('Live dataset root cannot be a symlink');
  if (options.datasetsRoot) {
    const canonicalDatasetsRoot = await realpath(options.datasetsRoot);
    const child = relative(canonicalDatasetsRoot, canonicalSource);
    if (!child || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
      throw new Error('Live dataset path escapes configured datasets root');
    }
  }
  const sourceInfo = await lstat(canonicalSource);
  if (!sourceInfo.isDirectory() || sourceInfo.isSymbolicLink()) throw new Error('Live dataset path is not a secure directory');
  const maskRoot = join(dirname(canonicalSource), `${basename(canonicalSource)}_masks`);
  let canonicalMasks: string;
  try {
    canonicalMasks = await realpath(maskRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const maskInfo = await lstat(canonicalMasks);
  if (!maskInfo.isDirectory() || maskInfo.isSymbolicLink() || canonicalMasks !== maskRoot) {
    throw new Error('Live mask path is not a secure sibling directory');
  }
  const sources = new Map<string, string>();
  let inspectedEntries = 0;
  let inspectedDirectories = 0;
  const recordEntry = (entryName: string, relativePath: string): void => {
    inspectedEntries += 1;
    if (inspectedEntries > maxEntries) throw new Error('Live dataset entry limit exceeded');
    if (!SOURCE_EXTENSIONS.has(extname(entryName).toLowerCase())) return;
    if (sources.size >= maxFiles) throw new Error('Live dataset file limit exceeded');
    const maskName = maskFilename(relativePath).toLocaleLowerCase('en-US');
    if (sources.has(maskName)) throw new Error(`Duplicate mask basename: ${maskName}`);
    sources.set(maskName, relativePath);
  };
  const walkPortable = async (directory: string, prefix = '', depth = 0): Promise<void> => {
    if (depth > maxDepth) throw new Error('Live dataset nesting limit exceeded');
    inspectedDirectories += 1;
    if (inspectedDirectories > maxDirectories) throw new Error('Live dataset directory limit exceeded');
    const before = await lstat(directory);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      inspectedEntries += 1;
      if (inspectedEntries > maxEntries) throw new Error('Live dataset entry limit exceeded');
      if (entry.isSymbolicLink()) throw new Error(`Refusing symlink in live dataset: ${relativePath}`);
      if (entry.isDirectory()) await walkPortable(join(directory, entry.name), relativePath, depth + 1);
      else if (entry.isFile()) {
        inspectedEntries -= 1;
        recordEntry(entry.name, relativePath);
      }
    }
    const after = await lstat(directory);
    if (before.dev !== after.dev || before.ino !== after.ino || before.mtimeMs !== after.mtimeMs) {
      throw new Error('Live dataset changed during enumeration');
    }
  };
  const walkDescriptor = async (directory: FileHandle, prefix = '', depth = 0): Promise<void> => {
    if (depth > maxDepth) throw new Error('Live dataset nesting limit exceeded');
    inspectedDirectories += 1;
    if (inspectedDirectories > maxDirectories) throw new Error('Live dataset directory limit exceeded');
    for (const entry of await readdir(descriptorPath(directory), { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      inspectedEntries += 1;
      if (inspectedEntries > maxEntries) throw new Error('Live dataset entry limit exceeded');
      if (entry.isSymbolicLink()) throw new Error(`Refusing symlink in live dataset: ${relativePath}`);
      if (entry.isDirectory()) {
        await options.beforeChildDirectoryOpen?.(relativePath);
        let child: FileHandle;
        try { child = await openDirectory(descriptorPath(directory, entry.name)); }
        catch { throw new Error(`Refusing changed child directory: ${relativePath}`); }
        try { await walkDescriptor(child, relativePath, depth + 1); }
        finally { await child.close().catch(() => undefined); }
      } else if (entry.isFile()) {
        inspectedEntries -= 1;
        recordEntry(entry.name, relativePath);
      }
    }
  };
  if ((options.filesystemStrategy ?? (process.platform === 'linux' ? 'descriptor' : 'portable')) === 'descriptor') {
    const root = await openDirectory(canonicalSource);
    try { await walkDescriptor(root); } finally { await root.close().catch(() => undefined); }
  } else {
    await walkPortable(canonicalSource);
  }
  const masks = createDatasetMaskService({
    datasetsRoot: dirname(canonicalSource), maxPngBytes: options.maxPngBytes ?? 64 * 1024 * 1024,
  });
  for (const source of sources.values()) {
    const result = await masks.read(basename(canonicalSource), source);
    if (result.exists) return canonicalMasks;
  }
  return null;
}

function parsePng(bytes: Buffer): PNG {
  try {
    return PNG.sync.read(bytes);
  } catch {
    throw new Error('Invalid PNG');
  }
}

function grayscalePng(image: PNG): { bytes: Buffer; allWhite: boolean } {
  const output = new PNG({ width: image.width, height: image.height, colorType: 0 });
  let allWhite = true;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3] / 255;
    const luminance = Math.round(
      (0.299 * image.data[offset] + 0.587 * image.data[offset + 1] + 0.114 * image.data[offset + 2]) * alpha +
        255 * (1 - alpha),
    );
    output.data[offset] = luminance;
    output.data[offset + 1] = luminance;
    output.data[offset + 2] = luminance;
    output.data[offset + 3] = 255;
    if (luminance !== 255) allWhite = false;
  }
  return { bytes: PNG.sync.write(output, { colorType: 0 }), allWhite };
}

async function closeAll(handles: FileHandle[]): Promise<void> {
  await Promise.all(handles.reverse().map(handle => handle.close().catch(() => undefined)));
}

function createDescriptorDatasetMaskService(deps: DatasetMaskDependencies): DatasetMaskService {
  if (!Number.isSafeInteger(deps.maxPngBytes) || deps.maxPngBytes <= 0) throw new Error('Invalid max PNG bytes');
  const renameFile = deps.rename ?? fsRename;

  async function openRoot(): Promise<FileHandle> {
    const canonicalRoot = await realpath(deps.datasetsRoot);
    const root = await openDirectory(canonicalRoot);
    if (await realpath(descriptorPath(root)) !== canonicalRoot) {
      await root.close();
      throw new Error('Datasets root changed while opening');
    }
    return root;
  }

  async function openChildDirectory(parent: FileHandle, name: string, missingMessage: string): Promise<FileHandle> {
    try {
      return await openDirectory(descriptorPath(parent, name));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') throw new Error(missingMessage);
      if (code === 'ELOOP' || code === 'ENOTDIR') throw new Error('Refusing symlink escape');
      throw error;
    }
  }

  async function readSource(dataset: string, sourcePath: string) {
    assertSingleSegment(dataset, 'dataset');
    const segments = sourceSegments(sourcePath);
    if (!SOURCE_EXTENSIONS.has(extname(segments[segments.length - 1]).toLowerCase())) {
      throw new Error('Unsupported source image');
    }
    const handles: FileHandle[] = [];
    try {
      let directory = await openRoot();
      handles.push(directory);
      directory = await openChildDirectory(directory, dataset, 'Source not found');
      handles.push(directory);
      for (const segment of segments.slice(0, -1)) {
        directory = await openChildDirectory(directory, segment, 'Source not found');
        handles.push(directory);
      }
      await deps.beforeSourceFileOpen?.();
      let source: FileHandle;
      try {
        source = await openFileAt(directory, segments[segments.length - 1]);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('Source not found');
        throw error;
      }
      handles.push(source);
      const sourceStat = await source.stat({ bigint: true });
      const bytes = await source.readFile();
      const afterSourceStat = await source.stat({ bigint: true });
      if (sourceStat.dev !== afterSourceStat.dev || sourceStat.ino !== afterSourceStat.ino ||
          sourceStat.size !== afterSourceStat.size || sourceStat.mtimeNs !== afterSourceStat.mtimeNs) {
        throw new Error('Source changed while reading');
      }
      const dimensions = imageSize(bytes);
      if (!dimensions.width || !dimensions.height) throw new Error('Unsupported source image');
      return {
        width: dimensions.width,
        height: dimensions.height,
        source_identity: { dev: sourceStat.dev.toString(), ino: sourceStat.ino.toString() },
        source_sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    } finally {
      await closeAll(handles);
    }
  }

  async function openMaskDirectory(root: FileHandle, dataset: string): Promise<FileHandle> {
    const name = maskDatasetName(dataset);
    try {
      return await openChildDirectory(root, name, 'Mask directory missing');
    } catch (error) {
      if ((error as Error).message !== 'Mask directory missing') throw error;
      try {
        await mkdir(descriptorPath(root, name), { mode: 0o700 });
      } catch (mkdirError) {
        if ((mkdirError as NodeJS.ErrnoException).code !== 'EEXIST') throw mkdirError;
      }
      return openChildDirectory(root, name, 'Mask directory missing');
    }
  }

  async function syncDirectory(directory: FileHandle): Promise<void> {
    await directory.sync();
  }

  async function deleteMask(dataset: string, sourcePath: string): Promise<void> {
    assertSingleSegment(dataset, 'dataset');
    sourceSegments(sourcePath);
    const handles: FileHandle[] = [];
    try {
      const root = await openRoot();
      handles.push(root);
      let directory: FileHandle;
      try {
        directory = await openChildDirectory(root, maskDatasetName(dataset), 'Mask directory missing');
      } catch (error) {
        if ((error as Error).message === 'Mask directory missing') return;
        throw error;
      }
      handles.push(directory);
      await rm(descriptorPath(directory, maskFilename(sourcePath)), { force: true });
      await syncDirectory(directory);
    } finally {
      await closeAll(handles);
    }
  }

  return {
    async read(dataset, sourcePath) {
      const source = await readSource(dataset, sourcePath);
      const handles: FileHandle[] = [];
      try {
        const root = await openRoot();
        handles.push(root);
        const directory = await openMaskDirectory(root, dataset);
        handles.push(directory);
        await deps.beforeMaskFileOpen?.();
        let mask: FileHandle;
        try {
          mask = await openFileAt(directory, maskFilename(sourcePath));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { exists: false, width: source.width, height: source.height, png: null, source_identity: source.source_identity, source_sha256: source.source_sha256 };
          }
          throw error;
        }
        handles.push(mask);
        const stat = await mask.stat();
        if (stat.size > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
        const bytes = await mask.readFile();
        const decoded = parsePng(bytes);
        if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
        return { exists: true, width: source.width, height: source.height, png: bytes, source_identity: source.source_identity, source_sha256: source.source_sha256 };
      } finally {
        await closeAll(handles);
      }
    },

    async save(dataset, sourcePath, png) {
      const source = await readSource(dataset, sourcePath);
      if (png.length > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
      const decoded = parsePng(png);
      if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
      const encoded = grayscalePng(decoded);
      if (encoded.bytes.length > deps.maxPngBytes) throw new Error('Encoded PNG exceeds maximum bytes');

      const handles: FileHandle[] = [];
      let temporary: string | undefined;
      try {
        const root = await openRoot();
        handles.push(root);
        const directory = await openMaskDirectory(root, dataset);
        handles.push(directory);
        const destination = descriptorPath(directory, maskFilename(sourcePath));

        try {
          const current = await openFileAt(directory, maskFilename(sourcePath));
          await current.close();
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }

        if (encoded.allWhite) {
          await rm(destination, { force: true });
          await syncDirectory(directory);
          return;
        }

        await deps.beforeTemporaryOpen?.();
        temporary = descriptorPath(directory, `.${maskFilename(sourcePath)}.${randomUUID()}.tmp`);
        const temporaryHandle = await open(
          temporary,
          constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
          0o600,
        );
        handles.push(temporaryHandle);
        await temporaryHandle.writeFile(encoded.bytes);
        await temporaryHandle.sync();
        await temporaryHandle.close();
        handles.pop();
        await renameFile(temporary, destination);
        temporary = undefined;
        await syncDirectory(directory);
      } finally {
        if (temporary) await rm(temporary, { force: true }).catch(() => undefined);
        await closeAll(handles);
      }
    },
    async delete(dataset, sourcePath) {
      await readSource(dataset, sourcePath);
      await deleteMask(dataset, sourcePath);
    },
    async deleteByAbsoluteSource(sourcePath) {
      const target = await absoluteSourceParts(deps.datasetsRoot, sourcePath);
      await deleteMask(target.dataset, target.source);
    },
  };
}

interface FileIdentity {
  dev: number;
  ino: number;
  mode: number;
}

function identityOf(stat: { dev: number; ino: number; mode: number }): FileIdentity {
  return { dev: stat.dev, ino: stat.ino, mode: stat.mode };
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}

function assertPathConfined(root: string, target: string): void {
  const child = relative(root, target);
  if (child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) throw new Error('Path escapes datasets root');
}

async function validatePortableDirectory(path: string, root: string): Promise<FileIdentity> {
  const before = await lstat(path);
  if (before.isSymbolicLink() || !before.isDirectory()) throw new Error('Refusing directory symlink escape');
  const canonical = await realpath(path);
  assertPathConfined(root, canonical);
  const after = await lstat(path);
  const beforeIdentity = identityOf(before);
  if (!sameIdentity(beforeIdentity, identityOf(after))) throw new Error('Directory changed during validation');
  return beforeIdentity;
}

async function readPortableFile(path: string, root: string): Promise<{ bytes: Buffer; identity: DatasetMaskSourceIdentity }> {
  const before = await lstat(path);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error('Refusing file symlink escape');
  const canonical = await realpath(path);
  assertPathConfined(root, canonical);
  const checked = await lstat(path);
  const expected = identityOf(before);
  if (!sameIdentity(expected, identityOf(checked))) throw new Error('File changed during validation');
  const handle = await open(path, constants.O_RDONLY);
  try {
    const openedStats = await handle.stat();
    if (!sameIdentity(expected, identityOf(openedStats)) || openedStats.size !== before.size || openedStats.mtimeMs !== before.mtimeMs) {
      throw new Error('File changed while opening');
    }
    const opened = await handle.stat({ bigint: true });
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (!sameIdentity(expected, identityOf(after)) || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error('File changed while reading');
    }
    return { bytes, identity: { dev: opened.dev.toString(), ino: opened.ino.toString() } };
  } finally {
    await handle.close();
  }
}

function createPortableDatasetMaskService(deps: DatasetMaskDependencies): DatasetMaskService {
  if (!Number.isSafeInteger(deps.maxPngBytes) || deps.maxPngBytes <= 0) throw new Error('Invalid max PNG bytes');
  const renameFile = deps.rename ?? fsRename;

  async function rootPath(): Promise<string> {
    const root = await realpath(deps.datasetsRoot);
    await validatePortableDirectory(root, root);
    return root;
  }

  async function sourceDetails(dataset: string, sourcePath: string) {
    assertSingleSegment(dataset, 'dataset');
    const segments = sourceSegments(sourcePath);
    if (!SOURCE_EXTENSIONS.has(extname(segments[segments.length - 1]).toLowerCase())) {
      throw new Error('Unsupported source image');
    }
    const root = await rootPath();
    let directory = join(root, dataset);
    try {
      await validatePortableDirectory(directory, root);
      for (const segment of segments.slice(0, -1)) {
        directory = join(directory, segment);
        await validatePortableDirectory(directory, root);
      }
      await deps.beforeSourceFileOpen?.();
      const source = await readPortableFile(join(directory, segments[segments.length - 1]), root);
      const dimensions = imageSize(source.bytes);
      if (!dimensions.width || !dimensions.height) throw new Error('Unsupported source image');
      return { root, width: dimensions.width, height: dimensions.height, source_identity: source.identity,
        source_sha256: createHash('sha256').update(source.bytes).digest('hex') };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('Source not found');
      throw error;
    }
  }

  async function maskDirectory(root: string, dataset: string): Promise<{ path: string; identity: FileIdentity }> {
    const path = join(root, maskDatasetName(dataset));
    try {
      await mkdir(path, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    return { path, identity: await validatePortableDirectory(path, root) };
  }

  async function assertDirectoryUnchanged(directory: { path: string; identity: FileIdentity }, root: string): Promise<void> {
    if (!sameIdentity(directory.identity, await validatePortableDirectory(directory.path, root))) {
      throw new Error('Mask directory changed during operation');
    }
  }

  async function syncPortableDirectory(directory: { path: string; identity: FileIdentity }, root: string): Promise<void> {
    await assertDirectoryUnchanged(directory, root);
    const handle = await open(directory.path, constants.O_RDONLY);
    try {
      if (!sameIdentity(directory.identity, identityOf(await handle.stat()))) throw new Error('Mask directory changed while opening');
      try {
        await handle.sync();
      } catch (error) {
        // Windows and some macOS filesystems do not permit fsync on directory handles.
        if (!['EINVAL', 'EPERM', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      }
    } finally {
      await handle.close();
    }
  }

  async function deleteMask(dataset: string, sourcePath: string): Promise<void> {
    assertSingleSegment(dataset, 'dataset');
    sourceSegments(sourcePath);
    const root = await rootPath();
    const path = join(root, maskDatasetName(dataset));
    let directory: { path: string; identity: FileIdentity };
    try {
      directory = { path, identity: await validatePortableDirectory(path, root) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const destination = join(path, maskFilename(sourcePath));
    try {
      const current = await lstat(destination);
      if (current.isSymbolicLink() || !current.isFile()) throw new Error('Refusing mask symlink escape');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    await assertDirectoryUnchanged(directory, root);
    await rm(destination);
    await syncPortableDirectory(directory, root);
  }

  return {
    async read(dataset, sourcePath) {
      const source = await sourceDetails(dataset, sourcePath);
      const directory = await maskDirectory(source.root, dataset);
      const destination = join(directory.path, maskFilename(sourcePath));
      await deps.beforeMaskFileOpen?.();
      let bytes: Buffer;
      try {
        bytes = (await readPortableFile(destination, source.root)).bytes;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return { exists: false, width: source.width, height: source.height, png: null, source_identity: source.source_identity, source_sha256: source.source_sha256 };
        }
        throw error;
      }
      if (bytes.length > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
      const decoded = parsePng(bytes);
      if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
      return { exists: true, width: source.width, height: source.height, png: bytes, source_identity: source.source_identity, source_sha256: source.source_sha256 };
    },

    async save(dataset, sourcePath, png) {
      const source = await sourceDetails(dataset, sourcePath);
      if (png.length > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
      const decoded = parsePng(png);
      if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
      const encoded = grayscalePng(decoded);
      if (encoded.bytes.length > deps.maxPngBytes) throw new Error('Encoded PNG exceeds maximum bytes');

      const directory = await maskDirectory(source.root, dataset);
      const destination = join(directory.path, maskFilename(sourcePath));
      try {
        const current = await lstat(destination);
        if (current.isSymbolicLink() || !current.isFile()) throw new Error('Refusing mask symlink escape');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }

      if (encoded.allWhite) {
        await assertDirectoryUnchanged(directory, source.root);
        await rm(destination, { force: true });
        await syncPortableDirectory(directory, source.root);
        return;
      }

      await deps.beforeTemporaryOpen?.();
      await assertDirectoryUnchanged(directory, source.root);
      let temporary: string | undefined = join(directory.path, `.${maskFilename(sourcePath)}.${randomUUID()}.tmp`);
      let handle: FileHandle | undefined;
      try {
        handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
        const canonicalTemporary = await realpath(temporary);
        assertPathConfined(source.root, canonicalTemporary);
        if (dirname(canonicalTemporary) !== await realpath(directory.path)) throw new Error('Temporary path escaped mask directory');
        await assertDirectoryUnchanged(directory, source.root);
        await handle.writeFile(encoded.bytes);
        await handle.sync();
        await assertDirectoryUnchanged(directory, source.root);
        await handle.close();
        handle = undefined;
        await renameFile(temporary, destination);
        temporary = undefined;
        await syncPortableDirectory(directory, source.root);
      } finally {
        if (handle) await handle.close().catch(() => undefined);
        if (temporary) await rm(temporary, { force: true }).catch(() => undefined);
      }
    },
    async delete(dataset, sourcePath) {
      await sourceDetails(dataset, sourcePath);
      await deleteMask(dataset, sourcePath);
    },
    async deleteByAbsoluteSource(sourcePath) {
      const target = await absoluteSourceParts(deps.datasetsRoot, sourcePath);
      await deleteMask(target.dataset, target.source);
    },
  };
}

export function createDatasetMaskService(deps: DatasetMaskDependencies): DatasetMaskService {
  const strategy = deps.filesystemStrategy ?? (process.platform === 'linux' ? 'descriptor' : 'portable');
  return strategy === 'descriptor'
    ? createDescriptorDatasetMaskService(deps)
    : createPortableDatasetMaskService(deps);
}
