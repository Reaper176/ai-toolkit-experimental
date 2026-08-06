import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import { handleModelArchChange } from '../src/app/jobs/new/utils';

const architectureChangeConfig = {
  config: {
    process: [
      {
        model: {
          arch: 'anima',
          name_or_path: '/models/anima.safetensors',
          te_name_or_path: '/models/qwen.safetensors',
          vae_path: '/models/vae.safetensors',
          quantize: true,
          model_kwargs: { custom_setting: 'preserved' },
        },
        datasets: [],
        sample: { samples: [] },
      },
    ],
  },
};
const modelUpdates: unknown[] = [];

handleModelArchChange('anima', 'flux', architectureChangeConfig as unknown as JobConfig, (value, key) => {
  if (key === 'config.process[0].model') modelUpdates.push(value);
});

assert.equal(modelUpdates.length, 1);
assert.deepEqual(modelUpdates[0], {
  arch: 'anima',
  name_or_path: '/models/anima.safetensors',
  quantize: true,
  model_kwargs: { custom_setting: 'preserved' },
});

console.log('Anima model architecture change tests passed');
