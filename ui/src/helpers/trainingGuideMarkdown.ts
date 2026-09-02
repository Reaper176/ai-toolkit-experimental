import path from 'node:path';

export interface TrainingGuideHeading {
  depth: number;
  text: string;
  id: string;
}

const REPOSITORY_PATH_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PUBLIC_ROUTE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const README_FILENAME = 'README.md';
const NESTED_README_SUFFIX = `/${README_FILENAME}`;
const NESTED_README_ROUTE_SEGMENT = 'readme';
const HTTP_HREF = /^https?:\/\//iu;

function isGuideMarkdownPath(value: string): boolean {
  if (
    value === '' ||
    value.includes('\\') ||
    value.includes('%') ||
    path.posix.isAbsolute(value) ||
    path.posix.normalize(value) !== value
  ) {
    return false;
  }
  const segments = value.split('/');
  const filename = segments.pop();
  if (
    filename === undefined ||
    !segments.every(segment => REPOSITORY_PATH_SEGMENT.test(segment))
  ) {
    return false;
  }
  if (filename === README_FILENAME) return true;
  if (!filename.endsWith('.md')) return false;
  const stem = filename.slice(0, -3);
  return stem !== NESTED_README_ROUTE_SEGMENT && REPOSITORY_PATH_SEGMENT.test(stem);
}

export function trainingGuideSlugFromPath(guidePath: string): string {
  if (!isGuideMarkdownPath(guidePath)) return '';
  if (guidePath === README_FILENAME) return '';
  if (guidePath.endsWith(NESTED_README_SUFFIX)) {
    return `${guidePath.slice(0, -NESTED_README_SUFFIX.length)}/${NESTED_README_ROUTE_SEGMENT}`;
  }
  return guidePath.slice(0, -3);
}

export function trainingGuidePathFromSlug(segments: readonly string[]): string | undefined {
  if (segments.length === 0) return README_FILENAME;
  if (!segments.every(segment => PUBLIC_ROUTE_SEGMENT.test(segment))) return undefined;
  if (segments.at(-1) === NESTED_README_ROUTE_SEGMENT) {
    if (segments.length === 1) return undefined;
    return `${segments.slice(0, -1).join('/')}/${README_FILENAME}`;
  }
  return `${segments.join('/')}.md`;
}

export function createTrainingGuideHeadingSlugger(): (text: string) => string {
  const counts = new Map<string, number>();

  return text => {
    const base = text
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-|-$/gu, '');
    const duplicateIndex = counts.get(base) ?? 0;
    counts.set(base, duplicateIndex + 1);
    return duplicateIndex === 0 ? base : `${base}-${duplicateIndex}`;
  };
}

export function extractTrainingGuideHeadings(markdown: string): TrainingGuideHeading[] {
  const headings: TrainingGuideHeading[] = [];
  const slug = createTrainingGuideHeadingSlugger();
  let fenceCharacter: '`' | '~' | undefined;
  let fenceLength = 0;

  for (const line of markdown.split(/\r?\n/u)) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
    if (fenceCharacter !== undefined) {
      const closingFence = line.match(/^ {0,3}(`+|~+)[ \t]*$/u);
      if (
        closingFence !== null &&
        closingFence[1][0] === fenceCharacter &&
        closingFence[1].length >= fenceLength
      ) {
        fenceCharacter = undefined;
        fenceLength = 0;
      }
      continue;
    }
    if (fence !== null) {
      fenceCharacter = fence[1][0] as '`' | '~';
      fenceLength = fence[1].length;
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/u);
    if (heading === null) continue;
    const text = heading[2].replace(/[ \t]+#+[ \t]*$/u, '').trim();
    headings.push({ depth: heading[1].length, text, id: slug(text) });
  }

  return headings;
}

export function rewriteTrainingGuideHref(
  currentPath: string,
  href: string,
  allowedPaths: ReadonlySet<string>,
): string | undefined {
  if (HTTP_HREF.test(href)) return href;
  if (href.startsWith('#') && !href.includes('?')) return href;
  if (
    href === '' ||
    href.includes('?') ||
    href.includes('\\') ||
    href.includes('%') ||
    path.posix.isAbsolute(href) ||
    !isGuideMarkdownPath(currentPath) ||
    !allowedPaths.has(currentPath)
  ) {
    return undefined;
  }

  const hashIndex = href.indexOf('#');
  const relativePath = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : href.slice(hashIndex);
  if (relativePath === '' || !relativePath.endsWith('.md')) return undefined;

  const targetPath = path.posix.normalize(path.posix.join(path.posix.dirname(currentPath), relativePath));
  if (!isGuideMarkdownPath(targetPath) || !allowedPaths.has(targetPath)) return undefined;

  const slug = trainingGuideSlugFromPath(targetPath);
  return `${slug === '' ? '/book' : `/book/${slug}`}${fragment}`;
}
