import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath, rename as fsRename, rm } from 'node:fs/promises';
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
}

export interface DatasetMaskService {
  read(dataset: string, sourcePath: string): Promise<DatasetMaskReadResult>;
  save(dataset: string, sourcePath: string, png: Buffer): Promise<void>;
}

const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function assertSingleSegment(value: string, label: string): void {
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || isAbsolute(value)) {
    throw new Error(`Invalid ${label} path`);
  }
}

function normalizeSourcePath(sourcePath: string): string {
  if (!sourcePath || isAbsolute(sourcePath) || sourcePath.includes('\\') || sourcePath.includes('\0')) {
    throw new Error('Invalid source path');
  }
  const segments = sourcePath.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('Invalid source path segment');
  }
  return segments.join('/');
}

function assertConfined(root: string, target: string): void {
  const child = relative(root, target);
  if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new Error('Path escapes datasets root');
  }
}

export function maskDatasetName(dataset: string): string {
  assertSingleSegment(dataset, 'dataset');
  return `${dataset}_masks`;
}

export function maskFilename(sourcePath: string): string {
  const normalized = normalizeSourcePath(sourcePath);
  return `${basename(normalized, extname(normalized))}.png`;
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

export function createDatasetMaskService(deps: DatasetMaskDependencies): DatasetMaskService {
  if (!Number.isSafeInteger(deps.maxPngBytes) || deps.maxPngBytes <= 0) throw new Error('Invalid max PNG bytes');
  const renameFile = deps.rename ?? fsRename;

  async function sourceDetails(dataset: string, sourcePath: string) {
    assertSingleSegment(dataset, 'dataset');
    const normalizedSource = normalizeSourcePath(sourcePath);
    if (!SOURCE_EXTENSIONS.has(extname(normalizedSource).toLowerCase())) throw new Error('Unsupported source image');

    const root = await realpath(deps.datasetsRoot);
    const datasetPath = join(root, dataset);
    let datasetStat;
    try {
      datasetStat = await lstat(datasetPath);
    } catch {
      throw new Error('Source not found');
    }
    if (datasetStat.isSymbolicLink() || !datasetStat.isDirectory()) throw new Error('Dataset symlink escape');
    const realDataset = await realpath(datasetPath);
    assertConfined(root, realDataset);

    const source = join(realDataset, normalizedSource);
    let sourceStat;
    try {
      sourceStat = await lstat(source);
    } catch {
      throw new Error('Source not found');
    }
    if (sourceStat.isSymbolicLink() || !sourceStat.isFile()) throw new Error('Source symlink escape');
    const realSource = await realpath(source);
    assertConfined(realDataset, realSource);
    const dimensions = imageSize(await readFile(realSource));
    if (!dimensions.width || !dimensions.height) throw new Error('Unsupported source image');
    return { root, normalizedSource, width: dimensions.width, height: dimensions.height };
  }

  async function maskDirectory(root: string, dataset: string): Promise<string> {
    const directory = join(root, maskDatasetName(dataset));
    try {
      const current = await lstat(directory);
      if (current.isSymbolicLink() || !current.isDirectory()) throw new Error('Mask directory symlink escape');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await mkdir(directory, { mode: 0o700 });
    }
    const realDirectory = await realpath(directory);
    assertConfined(root, realDirectory);
    return realDirectory;
  }

  async function destinationFor(root: string, dataset: string, sourcePath: string): Promise<string> {
    return join(await maskDirectory(root, dataset), maskFilename(sourcePath));
  }

  async function syncDirectory(directory: string): Promise<void> {
    const directoryHandle = await open(directory, constants.O_RDONLY);
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  }

  return {
    async read(dataset, sourcePath) {
      const source = await sourceDetails(dataset, sourcePath);
      const destination = await destinationFor(source.root, dataset, source.normalizedSource);
      try {
        const destinationStat = await lstat(destination);
        if (destinationStat.isSymbolicLink() || !destinationStat.isFile()) throw new Error('Mask symlink escape');
        if (destinationStat.size > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
        const bytes = await readFile(destination);
        const decoded = parsePng(bytes);
        if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
        return { exists: true, width: source.width, height: source.height, png: bytes };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return { exists: false, width: source.width, height: source.height, png: null };
        }
        throw error;
      }
    },

    async save(dataset, sourcePath, png) {
      const source = await sourceDetails(dataset, sourcePath);
      if (png.length > deps.maxPngBytes) throw new Error('PNG exceeds maximum bytes');
      const decoded = parsePng(png);
      if (decoded.width !== source.width || decoded.height !== source.height) throw new Error('Mask dimensions mismatch');
      const encoded = grayscalePng(decoded);
      const destination = await destinationFor(source.root, dataset, source.normalizedSource);
      if (encoded.allWhite) {
        try {
          const current = await lstat(destination);
          if (current.isSymbolicLink() || !current.isFile()) throw new Error('Mask symlink escape');
          await rm(destination);
          await syncDirectory(dirname(destination));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        return;
      }

      try {
        const current = await lstat(destination);
        if (current.isSymbolicLink() || !current.isFile()) throw new Error('Mask symlink escape');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }

      const directory = dirname(destination);
      const temporary = join(directory, `.${basename(destination)}.${process.pid}.${Date.now()}.tmp`);
      let handle;
      try {
        handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
        await handle.writeFile(encoded.bytes);
        await handle.sync();
        await handle.close();
        handle = undefined;
        await renameFile(temporary, destination);
        await syncDirectory(directory);
      } finally {
        if (handle) await handle.close().catch(() => undefined);
        await rm(temporary, { force: true }).catch(() => undefined);
      }
    },
  };
}
