import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultJobConfig } from '../src/app/jobs/new/jobConfig';
import React, { useState } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { InvertedMaskPriorControl } from '../src/app/jobs/new/SimpleJob';
import type { TrainConfig } from '../src/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const train = defaultJobConfig.config.process[0].train;
assert.equal(train.inverted_mask_prior, false);
assert.equal(train.inverted_mask_prior_multiplier, 0.5);

const source = readFileSync(resolve(process.cwd(), 'src/app/jobs/new/SimpleJob.tsx'), 'utf8');
assert.match(source, /label="Inverted Mask Prior"/);
assert.match(source, /disabled=\{!hasResolvedMasks\}/);
assert.match(source, /No resolved dataset masks are available/);
assert.match(source, /inverted_mask_prior_multiplier/);

const docs = readFileSync(resolve(process.cwd(), 'src/docs.tsx'), 'utf8');
assert.match(docs, /train\.inverted_mask_prior/);
assert.match(docs, /VRAM/i);
assert.match(docs, /turbo/i);

let current!: TrainConfig;
function Harness({ hasMasks }: { hasMasks: boolean }) {
  const [train, setTrain] = useState<TrainConfig>({
    ...defaultJobConfig.config.process[0].train,
    inverted_mask_prior: true,
    inverted_mask_prior_multiplier: 0.75,
  });
  current = train;
  return <InvertedMaskPriorControl train={train} hasResolvedMasks={hasMasks} setTrain={setTrain} />;
}
async function main() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<Harness hasMasks />); });
  await act(async () => { renderer.update(<Harness hasMasks={false} />); });
  assert.equal(current.inverted_mask_prior, false, 'losing mask availability automatically disables the prior');
  assert.equal(current.inverted_mask_prior_multiplier, 0.75, 'automatic disable preserves the configured multiplier');
  assert.ok(renderer.root.findAll(node => String(node.children.join('')).includes('automatically disabled')).length > 0);
  console.log('mask training control tests passed');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
