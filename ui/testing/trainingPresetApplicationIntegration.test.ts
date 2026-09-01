import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import { migrateJobConfig } from '../src/app/jobs/new/jobConfig';
import { buildTrainingJobSaveRequest, validateTrainingJobForSave } from '../src/helpers/jobDatasetPresetClient';
import { BUILT_IN_PRESET_ROWS, materializeBuiltInTrainingPresetRow } from '../src/helpers/builtInTrainingPresetDefinitions';
import { applyBuiltInTrainingPreset } from '../src/helpers/builtInTrainingPresets';

const catalogKeys = ['source', 'read_only', 'category', 'intent_slug', 'model_arch', 'catalog_revision', 'summary', 'recipe_path', 'prerequisites', 'warnings', 'evidence'];

for (const [index, row] of BUILT_IN_PRESET_ROWS.entries()) {
  const preset = materializeBuiltInTrainingPresetRow(row);
  const datasets = [{
    folder_path: `/datasets/${index}`,
    mask_path: `/browser-mask/${index}`,
    resolved_mask_available: true,
    control_path: `/controls/${index}`,
    dataset_preset: { preset_id: `preset-${index}`, version_id: `version-${index}`, has_masks: true },
    provenance_note: `keep-${index}`,
    optional_identity: undefined,
  }];
  const current = {
    job: 'extension',
    config: {
      name: `identity-${index}`,
      process: [{
        type: 'diffusion_trainer', training_folder: `/outputs/${index}`, device: `cuda:${index % 2}`,
        trigger_word: `TOKEN_${index}`, datasets,
        network: { type: 'lora' }, train: { inverted_mask_prior: false, inverted_mask_prior_multiplier: 0.5 },
        save: {}, model: { name_or_path: `current-${index}`, arch: preset.model_arch },
        sample: { samples: [{ prompt: `prompt-${index}`, negative_prompt: `item-neg-${index}`, ctrl_img: `/ctrl/${index}.png` }], neg: `negative-${index}` },
        logging: {},
      }],
    },
    meta: { name: '[name]', version: '1', distinctive: `meta-${index}` },
  } as unknown as JobConfig;

  const applied = applyBuiltInTrainingPreset(current, preset, migrateJobConfig);
  assert.deepEqual(applied.config.process[0].datasets, datasets, `${preset.id} preserves dataset property presence`);
  assert.notEqual(applied.config.process[0].datasets, datasets, `${preset.id} clones datasets`);
  assert.equal((applied.config.process[0].sample as any).neg, `negative-${index}`);
  assert.deepEqual((applied.config.process[0].sample as any).samples, (current.config.process[0].sample as any).samples);
  assert.equal(applied.config.name, `identity-${index}`);
  assert.deepEqual(applied.meta, current.meta);
  for (const key of ['trigger_word', 'training_folder', 'device'] as const) {
    assert.deepEqual(
      Object.getOwnPropertyDescriptor(applied.config.process[0], key),
      Object.getOwnPropertyDescriptor(current.config.process[0], key),
      `${preset.id} preserves ${key} value and property presence`,
    );
  }

  const migrated = migrateJobConfig(applied);
  validateTrainingJobForSave(migrated);
  const request = buildTrainingJobSaveRequest({ runId: null, cloneId: null, name: `save-${index}`, gpuIds: '0', jobConfig: migrated });
  const savedDataset = request.job_config.config.process[0].datasets[0] as any;
  assert.notEqual(request.job_config.config.process[0].datasets, migrated.config.process[0].datasets);
  assert.equal(savedDataset.mask_path, null);
  assert.equal(Object.hasOwn(savedDataset, 'resolved_mask_available'), false);
  assert.deepEqual(savedDataset.dataset_preset, datasets[0].dataset_preset);
  assert.equal(savedDataset.provenance_note, `keep-${index}`);
  const serialized = JSON.stringify(request);
  for (const key of catalogKeys) assert.equal(new RegExp(`"${key}"\\s*:`).test(serialized), false, `${preset.id} omits ${key}`);
}

console.log('all-catalog training preset save-boundary tests passed');
