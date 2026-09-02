import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractTrainingGuideHeadings,
  rewriteTrainingGuideHref,
  trainingGuidePathFromSlug,
  trainingGuideSlugFromPath,
} from '../src/helpers/trainingGuideMarkdown';

test('uses separators in real setting names for stable heading IDs', () => {
  assert.deepEqual(
    extractTrainingGuideHeadings(
      '### `dataset.folder_path`\n\n### `train.inverted_mask_prior`\n\n### `dataset.folder_path`',
    ),
    [
      { depth: 3, text: '`dataset.folder_path`', id: 'dataset-folder-path' },
      { depth: 3, text: '`train.inverted_mask_prior`', id: 'train-inverted-mask-prior' },
      { depth: 3, text: '`dataset.folder_path`', id: 'dataset-folder-path-1' },
    ],
  );
});

test('round trips root and nested README paths through canonical routes', () => {
  assert.equal(trainingGuideSlugFromPath('README.md'), '');
  assert.equal(trainingGuidePathFromSlug([]), 'README.md');

  const nestedSlug = trainingGuideSlugFromPath('examples/README.md');
  assert.equal(nestedSlug, 'examples/readme');
  assert.equal(trainingGuidePathFromSlug(nestedSlug.split('/')), 'examples/README.md');
  assert.equal(trainingGuidePathFromSlug(['examples', 'README']), undefined);
});

test('rewrites nested README links without collapsing them to the book root', () => {
  const allowedPaths = new Set([
    'README.md',
    'verification/first-run-smoke.md',
    'examples/README.md',
  ]);

  assert.equal(
    rewriteTrainingGuideHref(
      'verification/first-run-smoke.md',
      '../examples/README.md#configuration-files',
      allowedPaths,
    ),
    '/book/examples/readme#configuration-files',
  );
  assert.equal(rewriteTrainingGuideHref('examples/README.md', '../README.md', allowedPaths), '/book');
});
