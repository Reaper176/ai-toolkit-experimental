import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractTrainingGuideHeadings,
  rewriteTrainingGuideHref,
  trainingGuidePathFromSlug,
  trainingGuideSlugFromPath,
} from '../src/helpers/trainingGuideMarkdown';

test('converts guide paths and URL segments', () => {
  assert.equal(trainingGuideSlugFromPath('README.md'), '');
  assert.equal(
    trainingGuideSlugFromPath('getting-started/first-lora.md'),
    'getting-started/first-lora',
  );
  assert.equal(trainingGuidePathFromSlug([]), 'README.md');
  assert.equal(
    trainingGuidePathFromSlug(['getting-started', 'first-lora']),
    'getting-started/first-lora.md',
  );
  assert.equal(trainingGuidePathFromSlug(['..', 'README']), undefined);
});

test('extracts unique heading IDs and ignores fenced code', () => {
  const markdown = '# Title\n\n## Start Here\n\n## Start Here\n\n```md\n## ignored\n```';

  assert.deepEqual(extractTrainingGuideHeadings(markdown), [
    { depth: 1, text: 'Title', id: 'title' },
    { depth: 2, text: 'Start Here', id: 'start-here' },
    { depth: 2, text: 'Start Here', id: 'start-here-1' },
  ]);
});

test('rewrites allowlisted Markdown links and preserves safe links', () => {
  const allowedPaths = new Set([
    'README.md',
    'getting-started/first-lora.md',
    'datasets/curation.md',
  ]);

  assert.equal(
    rewriteTrainingGuideHref(
      'getting-started/first-lora.md',
      '../datasets/curation.md#masks',
      allowedPaths,
    ),
    '/book/datasets/curation#masks',
  );
  assert.equal(rewriteTrainingGuideHref('README.md', '#launch', allowedPaths), '#launch');
  assert.equal(
    rewriteTrainingGuideHref('README.md', 'https://example.com/guide', allowedPaths),
    'https://example.com/guide',
  );
  assert.equal(rewriteTrainingGuideHref('README.md', '../README.md', allowedPaths), undefined);
});

test('rejects ambiguous or unsafe relative guide links', () => {
  const allowedPaths = new Set(['README.md', 'datasets/curation.md']);

  assert.equal(rewriteTrainingGuideHref('README.md', '/README.md', allowedPaths), undefined);
  assert.equal(rewriteTrainingGuideHref('README.md', '%2e%2e/README.md', allowedPaths), undefined);
  assert.equal(rewriteTrainingGuideHref('README.md', '..\\README.md', allowedPaths), undefined);
  assert.equal(
    rewriteTrainingGuideHref('README.md', 'datasets/curation.md?mode=full', allowedPaths),
    undefined,
  );
  assert.equal(rewriteTrainingGuideHref('README.md', 'datasets/image.png', allowedPaths), undefined);
});
