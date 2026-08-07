import assert from 'node:assert/strict';
import type { CaptionJobConfig } from '../src/types';
import { handleCaptionerTypeChange } from '../src/helpers/captionJobConfig';

const config = {
  config: {
    process: [
      {
        type: 'DINOv3TaggerCaptioner',
        device: 'cuda',
        caption: {
          model_name_or_path: '/models/tagger.safetensors',
          vocab_path: '/models/vocab.json',
          selection_mode: 'threshold',
          threshold: 0.5,
          top_k: 30,
          included_categories: ['general', 'character', 'species_meta'],
          use_underscores: false,
          escape_parentheses: false,
          max_res: 1024,
          dtype: 'bf16',
          quantize: false,
          qtype: 'float8',
          low_vram: false,
          extensions: ['png'],
          path_to_caption: '/dataset',
          recaption: true,
          caption_extension: 'txt',
        },
      },
    ],
  },
} as unknown as CaptionJobConfig;

const updates: Array<[string, unknown]> = [];
handleCaptionerTypeChange('DINOv3TaggerCaptioner', 'Qwen3VLCaptioner', config, (value, key) => {
  updates.push([key, value]);
});
for (const key of [
  'vocab_path',
  'selection_mode',
  'threshold',
  'top_k',
  'included_categories',
  'use_underscores',
  'escape_parentheses',
]) {
  assert.ok(
    updates.some(([path, value]) => path === `config.process[0].caption.${key}` && value === undefined),
    `${key} was not cleared`,
  );
}
assert.ok(
  updates.some(
    ([key, value]) => key === 'config.process[0].caption.model_name_or_path' && value === 'Qwen/Qwen3-VL-8B-Instruct',
  ),
);
for (const key of ['quantize', 'low_vram']) {
  assert.ok(
    updates.some(([path, value]) => path === `config.process[0].caption.${key}` && value === true),
    `${key} was not restored when leaving DINOv3 for Qwen`,
  );
}

const leavingForAce: Array<[string, unknown]> = [];
handleCaptionerTypeChange('DINOv3TaggerCaptioner', 'AceStepCaptioner', config, (value, key) => {
  leavingForAce.push([key, value]);
});
for (const key of ['quantize', 'low_vram']) {
  assert.ok(
    leavingForAce.some(([path, value]) => path === `config.process[0].caption.${key}` && value === true),
    `${key} was not restored when leaving DINOv3 for Ace Step`,
  );
}

function enterDino(): Array<[string, unknown]> {
  const entering: Array<[string, unknown]> = [];
  handleCaptionerTypeChange('Qwen3VLCaptioner', 'DINOv3TaggerCaptioner', config, (value, key) => {
    entering.push([key, value]);
  });
  return entering;
}

const entering = enterDino();
assert.ok(entering.some(([key, value]) => key === 'config.process[0].caption.model_name_or_path' && value === ''));
assert.ok(entering.some(([key, value]) => key === 'config.process[0].caption.vocab_path' && value === undefined));
assert.ok(!entering.some(([, value]) => typeof value === 'string' && value.includes('/run/media/john/')));
for (const key of ['quantize', 'low_vram']) {
  assert.ok(
    entering.some(([path, value]) => path === `config.process[0].caption.${key}` && value === false),
    `${key} was not disabled when entering DINOv3`,
  );
}

const firstCategories = entering.find(
  ([key]) => key === 'config.process[0].caption.included_categories',
)?.[1] as string[];
assert.deepEqual(firstCategories, ['general', 'character', 'species_meta']);
firstCategories.push('artist');
const secondCategories = enterDino().find(
  ([key]) => key === 'config.process[0].caption.included_categories',
)?.[1] as string[];
assert.deepEqual(secondCategories, ['general', 'character', 'species_meta']);
assert.notEqual(secondCategories, firstCategories);

console.log('DINOv3 tagger type-change tests passed');
