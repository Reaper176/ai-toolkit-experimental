import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import type { BuiltInTrainingPresetRecord } from '../src/helpers/trainingPresets';
import { migrateJobConfig } from '../src/app/jobs/new/jobConfig';
import { buildTrainingJobSaveRequest, validateTrainingJobForSave } from '../src/helpers/jobDatasetPresetClient';
import { EXPECTED_BUILT_IN_PRESET_IDS, EXPECTED_BUILT_IN_PRESET_RELEASE } from '../src/helpers/builtInTrainingPresetGolden';
import { applyBuiltInTrainingPreset, validateBuiltInTrainingPresetRecord } from '../src/helpers/builtInTrainingPresets';

const catalogKeys = ['source', 'read_only', 'category', 'intent_slug', 'model_arch', 'catalog_revision', 'summary', 'recipe_path', 'prerequisites', 'warnings', 'evidence'];
const protectedProcessKeys = ['datasets', 'trigger_word', 'trigger', 'job', 'name', 'meta', 'training_folder', 'sqlite_db_path', 'device', 'output', 'output_dir', 'output_path', 'output_folder'] as const;
const goldenRecords = EXPECTED_BUILT_IN_PRESET_RELEASE.map(golden => {
  const { binding: _independentBindingEvidence, ...record } = golden;
  return validateBuiltInTrainingPresetRecord(structuredClone(record)) as BuiltInTrainingPresetRecord;
});

assert.equal(EXPECTED_BUILT_IN_PRESET_IDS.length, 14, 'independent release oracle contains exactly 14 IDs');
assert.equal(goldenRecords.length, 14, 'save-boundary suite applies exactly 14 independent golden records');
assert.deepEqual(goldenRecords.map(record => record.id), [...EXPECTED_BUILT_IN_PRESET_IDS]);

function capture(object: object, key: PropertyKey): { present: boolean; value?: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor === undefined ? { present: false } : { present: true, value: descriptor.value };
}

for (const [index, preset] of goldenRecords.entries()) {
  const datasets = [{
    folder_path: `/datasets/${index}`,
    mask_path: `/browser-mask/${index}`,
    resolved_mask_available: true,
    control_path: `/controls/${index}`,
    dataset_preset: { preset_id: `preset-${index}`, version_id: `version-${index}`, has_masks: true },
    provenance_note: `keep-${index}`,
    optional_identity: undefined,
  }];
  const protectedValues: Record<(typeof protectedProcessKeys)[number], unknown> = {
    datasets,
    trigger_word: `TOKEN_WORD_${index}`,
    trigger: `TOKEN_ALIAS_${index}`,
    job: `process-job-${index}`,
    name: `process-name-${index}`,
    meta: { process_identity: index, explicit: undefined },
    training_folder: `/training/${index}`,
    sqlite_db_path: `/sqlite/${index}.db`,
    device: `cuda:${index % 2}`,
    output: { destination: `/output-object/${index}` },
    output_dir: `/output-dir/${index}`,
    output_path: `/output-path/${index}`,
    output_folder: `/output-folder/${index}`,
  };
  const process = {
    type: 'diffusion_trainer',
    ...protectedValues,
    network: { type: 'lora' },
    train: { inverted_mask_prior: false, inverted_mask_prior_multiplier: 0.5 },
    save: {},
    model: { name_or_path: `current-model-${index}`, arch: preset.model_arch },
    sample: {
      samples: [{ prompt: `prompt-${index}`, negative_prompt: `item-neg-${index}`, ctrl_img: `/sample-control/${index}.png`, nested: { explicit: undefined } }],
      neg: `current-negative-${index}`,
    },
    logging: {},
  };
  const current = {
    job: 'extension',
    config: { name: `config-identity-${index}`, process: [process] },
    meta: { name: '[name]', version: '1', distinctive: `root-meta-${index}`, explicit: undefined },
  } as unknown as JobConfig;

  const applied = applyBuiltInTrainingPreset(current, preset, migrateJobConfig);
  assert.notEqual(applied.config.process[0].datasets, datasets, `${preset.id} clones dataset references`);
  for (const key of protectedProcessKeys) {
    assert.deepEqual(capture(applied.config.process[0], key), capture(process, key), `${preset.id} preserves process.${key} value and presence`);
  }
  assert.deepEqual(capture(applied.config, 'name'), capture(current.config, 'name'));
  assert.deepEqual(capture(applied, 'meta'), capture(current, 'meta'));
  assert.deepEqual(capture(applied, 'job'), capture(current, 'job'));
  assert.deepEqual(capture(applied.config.process[0].sample, 'samples'), capture(process.sample, 'samples'));
  assert.deepEqual(capture(applied.config.process[0].sample, 'neg'), capture(process.sample, 'neg'));

  const migrated = migrateJobConfig(applied);
  validateTrainingJobForSave(migrated);
  const request = buildTrainingJobSaveRequest({ runId: null, cloneId: null, name: `save-${index}`, gpuIds: '0', jobConfig: migrated });
  const savedProcess = request.job_config.config.process[0];
  const savedDataset = savedProcess.datasets[0] as any;
  assert.notEqual(savedProcess.datasets, migrated.config.process[0].datasets, `${preset.id} save clones datasets`);
  assert.equal(savedDataset.mask_path, null);
  assert.equal(Object.hasOwn(savedDataset, 'resolved_mask_available'), false);
  assert.deepEqual(savedDataset.dataset_preset, datasets[0].dataset_preset);
  assert.equal(savedDataset.provenance_note, `keep-${index}`);
  for (const key of protectedProcessKeys.filter(key => key !== 'datasets')) {
    assert.deepEqual(capture(savedProcess, key), capture(migrated.config.process[0], key), `${preset.id} save preserves process.${key}`);
  }
  assert.deepEqual(capture(request.job_config.config, 'name'), capture(migrated.config, 'name'));
  assert.deepEqual(capture(request.job_config, 'meta'), capture(migrated, 'meta'));
  assert.deepEqual(capture(request.job_config, 'job'), capture(migrated, 'job'));
  assert.deepEqual(capture(savedProcess.sample, 'samples'), capture(migrated.config.process[0].sample, 'samples'));
  assert.deepEqual(capture(savedProcess.sample, 'neg'), capture(migrated.config.process[0].sample, 'neg'));
  const serialized = JSON.stringify(request);
  for (const key of catalogKeys) assert.equal(new RegExp(`"${key}"\\s*:`).test(serialized), false, `${preset.id} omits ${key}`);
}

console.log('all-catalog training preset save-boundary tests passed');
