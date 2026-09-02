import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  type TrainingGuideHeading,
  extractTrainingGuideHeadings,
  trainingGuidePathFromSlug,
  trainingGuideSlugFromPath,
} from '../helpers/trainingGuideMarkdown';

export type TrainingGuideLoadResult =
  | { kind: 'found'; page: TrainingGuidePageModel }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

export interface TrainingGuideNavigationItem {
  path: string;
  slug: string;
  label: string;
}

export interface TrainingGuideNavigationGroup {
  key: string;
  label: string;
  items: TrainingGuideNavigationItem[];
}

export interface TrainingGuidePageModel extends TrainingGuideNavigationItem {
  markdown: string;
  title: string;
  headings: TrainingGuideHeading[];
  groups: TrainingGuideNavigationGroup[];
  previous?: TrainingGuideNavigationItem;
  next?: TrainingGuideNavigationItem;
  allowedPaths: string[];
}

interface TrainingGuideManifestPage {
  path: string;
  previous: string | null;
  next: string | null;
}

interface TrainingGuideManifest {
  schema_version: 1;
  book_revision: number;
  verified_date: string;
  pages: TrainingGuideManifestPage[];
  preset_architectures: string[];
  focused_architectures: string[];
  full_architectures: string[];
  required_footer: string;
}

const MANIFEST_FILENAME = 'book-manifest.json';
const MANIFEST_KEYS = [
  'book_revision',
  'focused_architectures',
  'full_architectures',
  'pages',
  'preset_architectures',
  'required_footer',
  'schema_version',
  'verified_date',
] as const;
const MANIFEST_PAGE_KEYS = ['next', 'path', 'previous'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function hasUniqueJsonObjectKeys(source: string): boolean {
  let position = 0;

  const fail = (): never => {
    throw new Error('Invalid JSON');
  };
  const skipWhitespace = () => {
    while (/\s/u.test(source[position] ?? '')) position += 1;
  };
  const parseString = (): string => {
    if (source[position] !== '"') return fail();
    const start = position;
    position += 1;
    while (position < source.length) {
      const character = source[position];
      if (character === '"') {
        position += 1;
        return JSON.parse(source.slice(start, position)) as string;
      }
      if (character === '\\') {
        position += 1;
        const escape = source[position];
        if (escape === 'u') {
          const hexadecimal = source.slice(position + 1, position + 5);
          if (!/^[0-9a-f]{4}$/iu.test(hexadecimal)) return fail();
          position += 5;
          continue;
        }
        if (escape === undefined || !'"\\/bfnrt'.includes(escape)) return fail();
        position += 1;
        continue;
      }
      if (character.charCodeAt(0) < 0x20) return fail();
      position += 1;
    }
    return fail();
  };
  const parsePrimitive = () => {
    const remaining = source.slice(position);
    const primitive = remaining.match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u)?.[0];
    if (primitive === undefined) return fail();
    position += primitive.length;
  };
  const parseValue = (): void => {
    skipWhitespace();
    const character = source[position];
    if (character === '{') {
      parseObject();
    } else if (character === '[') {
      parseArray();
    } else if (character === '"') {
      parseString();
    } else {
      parsePrimitive();
    }
  };
  const parseObject = (): void => {
    position += 1;
    skipWhitespace();
    const keys = new Set<string>();
    if (source[position] === '}') {
      position += 1;
      return;
    }
    while (position < source.length) {
      skipWhitespace();
      const key = parseString();
      if (keys.has(key)) return fail();
      keys.add(key);
      skipWhitespace();
      if (source[position] !== ':') return fail();
      position += 1;
      parseValue();
      skipWhitespace();
      if (source[position] === '}') {
        position += 1;
        return;
      }
      if (source[position] !== ',') return fail();
      position += 1;
    }
    return fail();
  };
  const parseArray = (): void => {
    position += 1;
    skipWhitespace();
    if (source[position] === ']') {
      position += 1;
      return;
    }
    while (position < source.length) {
      parseValue();
      skipWhitespace();
      if (source[position] === ']') {
        position += 1;
        return;
      }
      if (source[position] !== ',') return fail();
      position += 1;
    }
    return fail();
  };

  try {
    parseValue();
    skipWhitespace();
    return position === source.length;
  } catch {
    return false;
  }
}

function isUniqueNonEmptyStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string' || item === '' || seen.has(item)) return false;
    seen.add(item);
  }
  return true;
}

function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= monthLengths[month - 1];
}

function canonicalManifestPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const slug = trainingGuideSlugFromPath(value);
  const segments = slug === '' ? [] : slug.split('/');
  return trainingGuidePathFromSlug(segments) === value ? value : undefined;
}

function parseManifest(source: string): TrainingGuideManifest | undefined {
  if (!hasUniqueJsonObjectKeys(source)) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return undefined;
  }
  if (!isRecord(value) || !hasExactKeys(value, MANIFEST_KEYS)) return undefined;
  if (
    value.schema_version !== 1 ||
    !Number.isSafeInteger(value.book_revision) ||
    (value.book_revision as number) < 1 ||
    !isIsoCalendarDate(value.verified_date) ||
    !Array.isArray(value.pages) ||
    value.pages.length === 0 ||
    !isUniqueNonEmptyStringArray(value.preset_architectures) ||
    !isUniqueNonEmptyStringArray(value.focused_architectures) ||
    !isUniqueNonEmptyStringArray(value.full_architectures) ||
    typeof value.required_footer !== 'string' ||
    value.required_footer === ''
  ) {
    return undefined;
  }

  const pages: TrainingGuideManifestPage[] = [];
  const paths = new Set<string>();
  for (const candidate of value.pages) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, MANIFEST_PAGE_KEYS)) return undefined;
    const guidePath = canonicalManifestPath(candidate.path);
    const previous = candidate.previous;
    const next = candidate.next;
    if (
      guidePath === undefined ||
      paths.has(guidePath) ||
      (previous !== null && (typeof previous !== 'string' || canonicalManifestPath(previous) === undefined)) ||
      (next !== null && (typeof next !== 'string' || canonicalManifestPath(next) === undefined))
    ) {
      return undefined;
    }
    paths.add(guidePath);
    pages.push({ path: guidePath, previous, next });
  }

  for (const [index, page] of pages.entries()) {
    const expectedPrevious = pages[index - 1]?.path ?? null;
    const expectedNext = pages[index + 1]?.path ?? null;
    if (page.previous !== expectedPrevious || page.next !== expectedNext) return undefined;
  }

  return {
    schema_version: 1,
    book_revision: value.book_revision as number,
    verified_date: value.verified_date,
    pages,
    preset_architectures: value.preset_architectures,
    focused_architectures: value.focused_architectures,
    full_architectures: value.full_architectures,
    required_footer: value.required_footer,
  };
}

function isConfinedFile(bookDirectory: string, candidate: string): boolean {
  const relativeCandidate = path.relative(bookDirectory, candidate);
  return (
    relativeCandidate !== '' &&
    relativeCandidate !== '..' &&
    !relativeCandidate.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeCandidate) &&
    statSync(candidate).isFile()
  );
}

function titleCaseSegment(segment: string): string {
  return segment
    .split('-')
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function navigationItem(guidePath: string): TrainingGuideNavigationItem {
  const filename = path.posix.basename(guidePath);
  let label: string;
  if (guidePath === 'README.md') {
    label = 'Overview';
  } else if (filename === 'README.md') {
    label = titleCaseSegment(path.posix.basename(path.posix.dirname(guidePath)));
  } else {
    label = titleCaseSegment(filename.slice(0, -3));
  }
  return { path: guidePath, slug: trainingGuideSlugFromPath(guidePath), label };
}

function navigationGroups(pages: readonly TrainingGuideManifestPage[]): TrainingGuideNavigationGroup[] {
  const groups = new Map<string, TrainingGuideNavigationGroup>();
  for (const page of pages) {
    const separatorIndex = page.path.indexOf('/');
    const key = separatorIndex === -1 ? 'overview' : page.path.slice(0, separatorIndex);
    let group = groups.get(key);
    if (group === undefined) {
      group = { key, label: titleCaseSegment(key), items: [] };
      groups.set(key, group);
    }
    group.items.push(navigationItem(page.path));
  }
  return [...groups.values()];
}

export function trainingGuideRepositoryRoot(): string {
  return process.env.TRAINING_GUIDE_REPOSITORY_ROOT ?? path.resolve(process.cwd(), '..');
}

export function loadTrainingGuidePage(repositoryRoot: string, slug: readonly string[]): TrainingGuideLoadResult {
  const requestedPath = trainingGuidePathFromSlug(slug);
  if (requestedPath === undefined) return { kind: 'not-found' };

  try {
    const bookDirectory = realpathSync(path.join(path.resolve(repositoryRoot), 'docs', 'book'));
    const manifestPath = realpathSync(path.join(bookDirectory, MANIFEST_FILENAME));
    if (!isConfinedFile(bookDirectory, manifestPath)) return { kind: 'unavailable' };

    const manifest = parseManifest(readFileSync(manifestPath, 'utf8'));
    if (manifest === undefined) return { kind: 'unavailable' };

    const realPagePaths = new Map<string, string>();
    for (const page of manifest.pages) {
      const realPagePath = realpathSync(path.join(bookDirectory, page.path));
      if (!isConfinedFile(bookDirectory, realPagePath)) return { kind: 'unavailable' };
      realPagePaths.set(page.path, realPagePath);
    }

    const currentPage = manifest.pages.find(page => page.path === requestedPath);
    if (currentPage === undefined) return { kind: 'not-found' };
    const currentRealPath = realPagePaths.get(currentPage.path);
    if (currentRealPath === undefined) return { kind: 'unavailable' };

    const markdown = readFileSync(currentRealPath, 'utf8');
    const headings = extractTrainingGuideHeadings(markdown);
    const title = headings.find(heading => heading.depth === 1)?.text;
    if (title === undefined || title === '') return { kind: 'unavailable' };

    const items = new Map(manifest.pages.map(page => [page.path, navigationItem(page.path)] as const));
    const previous = currentPage.previous === null ? undefined : items.get(currentPage.previous);
    const next = currentPage.next === null ? undefined : items.get(currentPage.next);
    if (
      (currentPage.previous !== null && previous === undefined) ||
      (currentPage.next !== null && next === undefined)
    ) {
      return { kind: 'unavailable' };
    }

    return {
      kind: 'found',
      page: {
        ...navigationItem(currentPage.path),
        markdown,
        title,
        headings,
        groups: navigationGroups(manifest.pages),
        previous,
        next,
        allowedPaths: manifest.pages.map(page => page.path),
      },
    };
  } catch {
    return { kind: 'unavailable' };
  }
}
