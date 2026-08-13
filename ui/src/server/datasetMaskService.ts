import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, rename as fsRename, rm, type FileHandle } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'node:path';
import { imageSize } from 'image-size';
import { PNG } from 'pngjs';

export interface DatasetMaskReadResult {
  exists: boolean;
  width: number;
  height: number;
  png: Buffer | null;
}

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
      const bytes = await source.readFile();
      const dimensions = imageSize(bytes);
      if (!dimensions.width || !dimensions.height) throw new Error('Unsupported source image');
      return { width: dimensions.width, height: dimensions.height };
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
            return { exists: false, width: source.width, height: source.height, png: null };
          }
          throw error;
        }
        handles.push(mask);
        const stat = await mask.stat();
        if (stat.size > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
        const bytes = await mask.readFile();
        const decoded = parsePng(bytes);
        if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
        return { exists: true, width: source.width, height: source.height, png: bytes };
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

async function readPortableFile(path: string, root: string): Promise<Buffer> {
  const before = await lstat(path);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error('Refusing file symlink escape');
  const canonical = await realpath(path);
  assertPathConfined(root, canonical);
  const checked = await lstat(path);
  const expected = identityOf(before);
  if (!sameIdentity(expected, identityOf(checked))) throw new Error('File changed during validation');
  const handle = await open(path, constants.O_RDONLY);
  try {
    if (!sameIdentity(expected, identityOf(await handle.stat()))) throw new Error('File changed while opening');
    const bytes = await handle.readFile();
    if (!sameIdentity(expected, identityOf(await handle.stat()))) throw new Error('File changed while reading');
    return bytes;
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
      const bytes = await readPortableFile(join(directory, segments[segments.length - 1]), root);
      const dimensions = imageSize(bytes);
      if (!dimensions.width || !dimensions.height) throw new Error('Unsupported source image');
      return { root, width: dimensions.width, height: dimensions.height };
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

  return {
    async read(dataset, sourcePath) {
      const source = await sourceDetails(dataset, sourcePath);
      const directory = await maskDirectory(source.root, dataset);
      const destination = join(directory.path, maskFilename(sourcePath));
      await deps.beforeMaskFileOpen?.();
      let bytes: Buffer;
      try {
        bytes = await readPortableFile(destination, source.root);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return { exists: false, width: source.width, height: source.height, png: null };
        }
        throw error;
      }
      if (bytes.length > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
      const decoded = parsePng(bytes);
      if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
      return { exists: true, width: source.width, height: source.height, png: bytes };
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
  };
}

export function createDatasetMaskService(deps: DatasetMaskDependencies): DatasetMaskService {
  const strategy = deps.filesystemStrategy ?? (process.platform === 'linux' ? 'descriptor' : 'portable');
  return strategy === 'descriptor'
    ? createDescriptorDatasetMaskService(deps)
    : createPortableDatasetMaskService(deps);
}
