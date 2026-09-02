import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TestRenderer, { act } from 'react-test-renderer';

import TrainingGuideLink, { TRAINING_GUIDE_URL } from '@/components/TrainingGuideLink';

const repositoryRoot = process.env.TRAINING_BOOK_REPOSITORY_ROOT;
assert.ok(repositoryRoot, 'TRAINING_BOOK_REPOSITORY_ROOT is required');

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let renderer!: TestRenderer.ReactTestRenderer;
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args);
};
try {
  act(() => {
    renderer = TestRenderer.create(<TrainingGuideLink />);
  });
} finally {
  console.error = originalError;
}

const anchors = renderer.root.findAllByType('a');
assert.equal(anchors.length, 1, 'TrainingGuideLink renders one anchor');
assert.equal(anchors[0].props.href, TRAINING_GUIDE_URL);
assert.equal(anchors[0].props.target, '_blank');
assert.equal(anchors[0].props.rel, 'noopener noreferrer');
assert.equal(anchors[0].props['aria-label'], 'Open LoRA Training Guide');

act(() => renderer.unmount());

const sidebarSource = readFileSync(join(repositoryRoot, 'ui', 'src', 'components', 'Sidebar.tsx'), 'utf8');
assert.equal(
  sidebarSource.match(/<TrainingGuideLink\b/gu)?.length ?? 0,
  1,
  'Sidebar renders TrainingGuideLink exactly once in its reusable content',
);

const readmeSource = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');
const introduction = readmeSource.split('\n## Supported Models', 1)[0];
assert.match(
  introduction,
  /\[[^\]]*LoRA Training Guide[^\]]*\]\(docs\/book\/README\.md\)/u,
  'README prominently links the training guide near its introductory training material',
);
