import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultJobConfig } from '../src/app/jobs/new/jobConfig';

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

console.log('mask training control tests passed');
