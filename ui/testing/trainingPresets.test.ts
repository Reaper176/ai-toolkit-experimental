import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import { migrateJobConfig } from '../src/app/jobs/new/jobConfig';
import {
  MAX_PRESET_NAME_LENGTH,
  MAX_PRESET_SNAPSHOT_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
  applyTrainingPreset,
  applyTrainingPresetWithPolicy,
  normalizePresetName,
  sanitizeTrainingPreset,
  validateTrainingPresetSnapshot,
  type BuiltInTrainingPresetRecord,
  type TrainingPresetRecord,
  type UserTrainingPresetRecord,
} from '../src/helpers/trainingPresets';

type LooseJobConfig = JobConfig & Record<string, unknown>;

function jobFixture(): LooseJobConfig {
  return {
    job: 'extension',
    config: {
      name: 'current-job',
      process: [
        {
          type: 'diffusion_trainer',
          training_folder: '/current/output',
          sqlite_db_path: '/current/jobs.sqlite',
          device: 'cuda:1',
          trigger_word: 'CURRENT',
          datasets: [{ folder_path: '/current/images', resolution: [1024] }],
          performance_log_every: 10,
          network: { type: 'lora', linear: 16 },
          train: { steps: 1000, lr: 0.0001 },
          save: { save_every: 250 },
          logging: { log_every: 1 },
          model: {
            arch: 'flux',
            name_or_path: 'current/model',
            model_kwargs: { stale_flux_key: true },
          },
          sample: {
            sampler: 'flowmatch',
            sample_every: 100,
            guidance_scale: 3.5,
            samples: [{ prompt: 'current sample', seed: 12, control_image_path: '/current/control.png' }],
          },
          future_training_option: { enabled: true },
        },
      ],
    },
    meta: { name: '[name]', version: '1.0', future_meta: 'keep me' },
  } as unknown as LooseJobConfig;
}

function presetJobFixture(): LooseJobConfig {
  const job = jobFixture();
  const process = job.config.process[0] as unknown as Record<string, any>;
  process.training_folder = '/preset/output';
  process.sqlite_db_path = '/preset/jobs.sqlite';
  process.device = 'mps';
  process.trigger_word = 'PRESET';
  process.datasets = [{ folder_path: '/preset/images' }];
  process.model = {
    arch: 'sdxl',
    name_or_path: 'preset/model',
    model_kwargs: { sdxl_only_key: 42 },
  };
  process.sample = {
    sampler: 'ddim',
    sample_every: 25,
    guidance_scale: 7,
    samples: [{ prompt: 'preset sample' }],
    prompts: ['legacy preset prompt'],
  };
  process.future_training_option = { enabled: false, mode: 'future' };
  return job;
}

function userJobFixture(): LooseJobConfig {
  const job = presetJobFixture();
  (job.config.process[0] as any).sample.neg = 'saved user negative';
  return job;
}

function expectThrows(value: () => unknown, pattern: RegExp): void {
  assert.throws(value, pattern);
}

assert.equal(SNAPSHOT_SCHEMA_VERSION, 1);
assert.equal(MAX_PRESET_NAME_LENGTH, 80);
assert.equal(MAX_PRESET_SNAPSHOT_BYTES, 512 * 1024);

assert.deepEqual(normalizePresetName('  My Preset  '), {
  name: 'My Preset',
  nameKey: 'my preset',
});
expectThrows(() => normalizePresetName(12), /preset name.*string/i);
expectThrows(() => normalizePresetName(' \n\t '), /preset name.*required/i);
expectThrows(() => normalizePresetName('a'.repeat(81)), /preset name.*80/i);
assert.equal(normalizePresetName('\ud83d\ude00'.repeat(40)).name.length, 80);

const sanitized = sanitizeTrainingPreset(presetJobFixture());
assert.equal(sanitized.schema_version, 1);
assert.equal(sanitized.job, 'extension');
assert.deepEqual(Object.keys(sanitized).sort(), ['config', 'job', 'schema_version']);
assert.deepEqual(Object.keys(sanitized.config), ['process']);
assert.equal(sanitized.config.process.length, 1);
const sanitizedProcess = sanitized.config.process[0] as Record<string, any>;
for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
  assert.equal(key in sanitizedProcess, false, `${key} must not be stored`);
}
assert.equal('samples' in sanitizedProcess.sample, false);
assert.equal('prompts' in sanitizedProcess.sample, false);
assert.equal(sanitizedProcess.type, 'diffusion_trainer');
assert.equal(sanitizedProcess.model.arch, 'sdxl');
assert.equal(sanitizedProcess.model.name_or_path, 'preset/model');
assert.deepEqual(sanitizedProcess.network, { type: 'lora', linear: 16 });
assert.deepEqual(sanitizedProcess.train, { steps: 1000, lr: 0.0001 });
assert.deepEqual(sanitizedProcess.save, { save_every: 250 });
assert.deepEqual(sanitizedProcess.logging, { log_every: 1 });
assert.equal(sanitizedProcess.sample.sampler, 'ddim');
assert.equal(sanitizedProcess.sample.sample_every, 25);
assert.equal('neg' in sanitizedProcess.sample, false);
assert.deepEqual(sanitizedProcess.future_training_option, { enabled: false, mode: 'future' });

const sanitizedUserPreset = sanitizeTrainingPreset(userJobFixture());
assert.equal((sanitizedUserPreset.config.process[0] as any).sample.neg, 'saved user negative');
const ordinaryUserApplied = applyTrainingPreset(jobFixture(), sanitizedUserPreset, (job: JobConfig) => job);
assert.equal((ordinaryUserApplied.config.process[0] as any).sample.neg, 'saved user negative');
const policyCurrent = jobFixture();
(policyCurrent.config.process[0] as any).sample.neg = 'current negative';
const policySnapshot = structuredClone(sanitizedUserPreset);
const ordinaryPolicyApplied = applyTrainingPresetWithPolicy(policyCurrent, policySnapshot, job => job, {
  preserveCurrentNegativePrompt: false,
});
assert.equal((ordinaryPolicyApplied.config.process[0] as any).sample.neg, 'saved user negative');
const builtInPolicySnapshot = structuredClone(sanitizedUserPreset) as any;
delete builtInPolicySnapshot.config.process[0].sample.neg;
const builtInPolicyApplied = applyTrainingPresetWithPolicy(policyCurrent, builtInPolicySnapshot, job => {
  const process = job.config.process[0] as any;
  process.sample.neg = process.model.name_or_path === 'current/model'
    ? 'migrated current negative'
    : 'candidate migration negative';
  return job;
}, { preserveCurrentNegativePrompt: true });
assert.equal((builtInPolicyApplied.config.process[0] as any).sample.neg, 'migrated current negative');

const arrayPropertyCurrent = jobFixture() as any;
arrayPropertyCurrent.config.process[0].train.future_values = [1];
arrayPropertyCurrent.config.process[0].train.future_values.extra = Number.NaN;
assert.throws(
  () => applyTrainingPresetWithPolicy(arrayPropertyCurrent, builtInPolicySnapshot, job => job, {
    preserveCurrentNegativePrompt: true,
  }),
  /array.*(?:property|index)/i,
);

const accessorCurrent = jobFixture() as any;
let unsafeAccessorReads = 0;
Object.defineProperty(accessorCurrent.config.process[0].train, 'changing_value', {
  enumerable: true,
  configurable: true,
  get: () => {
    unsafeAccessorReads += 1;
    return unsafeAccessorReads === 1 ? undefined : 1n;
  },
});
assert.throws(
  () => applyTrainingPresetWithPolicy(accessorCurrent, builtInPolicySnapshot, job => job, {
    preserveCurrentNegativePrompt: true,
  }),
  /accessor/i,
);
assert.equal(unsafeAccessorReads, 0, 'descriptor-aware copy must not invoke rejected accessors');

const protoKeyCurrent = jobFixture() as any;
Object.defineProperty(protoKeyCurrent.config.process[0].train, '__proto__', {
  value: undefined,
  enumerable: true,
  writable: true,
  configurable: true,
});
let protoKeyMigrationCall = 0;
applyTrainingPresetWithPolicy(protoKeyCurrent, builtInPolicySnapshot, job => {
  protoKeyMigrationCall += 1;
  if (protoKeyMigrationCall === 1) {
    const train = (job.config.process[0] as any).train;
    assert.equal(Object.prototype.hasOwnProperty.call(train, '__proto__'), true);
    assert.equal(train.__proto__, undefined);
  }
  return job;
}, { preserveCurrentNegativePrompt: true });
assert.equal(protoKeyMigrationCall, 2);

const migratedNegativeAccessorCurrent = jobFixture() as any;
let migratedNegativeGetterReads = 0;
let migratedNegativeAccessorCalls = 0;
assert.throws(
  () => applyTrainingPresetWithPolicy(migratedNegativeAccessorCurrent, builtInPolicySnapshot, job => {
    migratedNegativeAccessorCalls += 1;
    if (migratedNegativeAccessorCalls === 1) {
      Object.defineProperty((job.config.process[0] as any).sample, 'neg', {
        enumerable: true,
        configurable: true,
        get: () => {
          migratedNegativeGetterReads += 1;
          return 'unsafe migrated negative';
        },
      });
    }
    return job;
  }, { preserveCurrentNegativePrompt: true }),
  /sample\.neg.*accessor/i,
);
assert.equal(migratedNegativeGetterReads, 0, 'migrated negative getter must never execute');
assert.equal(migratedNegativeAccessorCalls, 1);

const userRecordContract: UserTrainingPresetRecord = {
  id: 'user-preset',
  name: 'User preset',
  source: 'user',
  read_only: false,
  schema_version: 1,
  snapshot: sanitizedUserPreset,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};
const builtInRecordContract: BuiltInTrainingPresetRecord = {
  id: 'builtin-preset',
  name: 'Built-in preset',
  source: 'builtin',
  read_only: true,
  schema_version: 1,
  snapshot: sanitizedUserPreset,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  category: 'style',
  intent_slug: 'style-balanced',
  model_arch: 'flux',
  catalog_revision: 1,
  summary: 'Balanced style training.',
  recipe_path: 'recipes/style-balanced.yaml',
  prerequisites: ['captioned images'],
  warnings: [],
  evidence: 'configuration-validated',
};
const recordContracts: TrainingPresetRecord[] = [userRecordContract, builtInRecordContract];
assert.deepEqual(recordContracts.map(record => record.source), ['user', 'builtin']);

const sourceForSanitize = presetJobFixture();
const isolatedSnapshot = sanitizeTrainingPreset(sourceForSanitize);
(sourceForSanitize.config.process[0] as any).model.model_kwargs.sdxl_only_key = -1;
assert.equal((isolatedSnapshot.config.process[0] as any).model.model_kwargs.sdxl_only_key, 42);
(isolatedSnapshot.config.process[0] as any).future_training_option.mode = 'changed';
assert.equal((sourceForSanitize.config.process[0] as any).future_training_option.mode, 'future');

expectThrows(
  () => sanitizeTrainingPreset({ ...jobFixture(), config: { ...jobFixture().config, process: [] } }),
  /exactly one process/i,
);
expectThrows(
  () => sanitizeTrainingPreset({ ...jobFixture(), job: 'caption' } as unknown as JobConfig),
  /job.*extension/i,
);
expectThrows(
  () =>
    sanitizeTrainingPreset({
      ...jobFixture(),
      config: { ...jobFixture().config, process: [jobFixture().config.process[0], jobFixture().config.process[0]] },
    }),
  /exactly one process/i,
);

const validated = validateTrainingPresetSnapshot(sanitized);
assert.deepEqual(validated, sanitized);
assert.notEqual(validated, sanitized);
assert.notEqual(validated.config, sanitized.config);
assert.notEqual(validated.config.process, sanitized.config.process);
assert.notEqual(validated.config.process[0], sanitized.config.process[0]);
(validated.config.process[0] as any).model.arch = 'mutated';
assert.equal((sanitized.config.process[0] as any).model.arch, 'sdxl');

for (const invalid of [null, [], 'preset']) {
  expectThrows(() => validateTrainingPresetSnapshot(invalid), /snapshot.*object/i);
}
expectThrows(() => validateTrainingPresetSnapshot({ ...sanitized, schema_version: 2 }), /schema_version.*1/i);
expectThrows(() => validateTrainingPresetSnapshot({ ...sanitized, job: 'caption' }), /job.*extension/i);
expectThrows(() => validateTrainingPresetSnapshot({ ...sanitized, config: null }), /config.*object/i);
expectThrows(() => validateTrainingPresetSnapshot({ ...sanitized, config: {} }), /process.*exactly one/i);
expectThrows(
  () => validateTrainingPresetSnapshot({ ...sanitized, config: { process: [{}, {}] } }),
  /process.*exactly one/i,
);
expectThrows(
  () => validateTrainingPresetSnapshot({ ...sanitized, config: { process: [[]] } }),
  /process.*plain object/i,
);

const validProcess = sanitized.config.process[0] as Record<string, any>;
expectThrows(
  () =>
    validateTrainingPresetSnapshot({
      ...sanitized,
      config: { process: [{ type: 'diffusion_trainer', model: {} }] },
    }),
  /config\.process\[0\]\.model\.name_or_path.*nonblank string/i,
);
for (const malformedType of [undefined, '   ', 42]) {
  expectThrows(
    () =>
      validateTrainingPresetSnapshot({
        ...sanitized,
        config: { process: [{ ...validProcess, type: malformedType }] },
      }),
    /config\.process\[0\]\.type.*nonblank string/i,
  );
}
for (const section of ['model', 'train', 'save', 'sample']) {
  const missing = structuredClone(validProcess);
  delete missing[section];
  expectThrows(
    () => validateTrainingPresetSnapshot({ ...sanitized, config: { process: [missing] } }),
    new RegExp(`config\\.process\\[0\\]\\.${section}.*plain object`, 'i'),
  );

  for (const malformed of [null, [], 'invalid']) {
    const process = structuredClone(validProcess);
    process[section] = malformed;
    expectThrows(
      () => validateTrainingPresetSnapshot({ ...sanitized, config: { process: [process] } }),
      new RegExp(`config\\.process\\[0\\]\\.${section}.*plain object`, 'i'),
    );
  }
}
for (const malformed of [undefined, null, '', '   ', 42]) {
  const process = structuredClone(validProcess);
  process.model.name_or_path = malformed;
  expectThrows(
    () => validateTrainingPresetSnapshot({ ...sanitized, config: { process: [process] } }),
    /config\.process\[0\]\.model\.name_or_path.*nonblank string/i,
  );
}
for (const malformed of [null, '', '   ', 42]) {
  const process = structuredClone(validProcess);
  process.model.arch = malformed;
  expectThrows(
    () => validateTrainingPresetSnapshot({ ...sanitized, config: { process: [process] } }),
    /config\.process\[0\]\.model\.arch.*nonblank string/i,
  );
}

for (const [type, arch, path] of [
  ['diffusion_trainer', 'flux', 'black-forest-labs/FLUX.1-dev'],
  ['concept_slider', 'qwen_image', 'Qwen/Qwen-Image'],
  ['future_trainer', 'future_arch', '/models/future.safetensors'],
]) {
  const variant = structuredClone(validProcess);
  variant.type = type;
  variant.model.arch = arch;
  variant.model.name_or_path = path;
  assert.equal(
    (validateTrainingPresetSnapshot({ ...sanitized, config: { process: [variant] } }).config.process[0] as any).type,
    type,
  );
}

// Representative Advanced-editor configs from config/examples/*.yaml use legacy flags without model.arch.
for (const legacyModel of [
  { label: 'Flux', name_or_path: 'black-forest-labs/FLUX.1-dev', is_flux: true },
  { label: 'Flex', name_or_path: 'ostris/Flex.1-alpha', is_flux: true },
  { label: 'Lumina 2', name_or_path: 'Alpha-VLLM/Lumina-Image-2.0', is_lumina2: true },
  { label: 'SD 3.5', name_or_path: 'stabilityai/stable-diffusion-3.5-large', is_v3: true },
]) {
  const legacyJob = presetJobFixture();
  const legacyProcess = legacyJob.config.process[0] as any;
  legacyProcess.type = 'sd_trainer';
  legacyProcess.model = { ...legacyModel };
  delete legacyProcess.model.label;

  const legacySnapshot = sanitizeTrainingPreset(legacyJob);
  const snapshotProcess = legacySnapshot.config.process[0] as any;
  assert.equal(snapshotProcess.type, 'sd_trainer', `${legacyModel.label} trainer type was retained`);
  assert.equal(snapshotProcess.model.name_or_path, legacyModel.name_or_path);
  assert.equal('arch' in snapshotProcess.model, false, `${legacyModel.label} gained an inferred architecture`);

  const legacyApplied = applyTrainingPreset(jobFixture(), legacySnapshot, (job: JobConfig) => job);
  const appliedLegacyProcess = legacyApplied.config.process[0] as any;
  assert.equal(appliedLegacyProcess.type, 'sd_trainer');
  assert.equal(appliedLegacyProcess.model.name_or_path, legacyModel.name_or_path);
  assert.equal('arch' in appliedLegacyProcess.model, false, `${legacyModel.label} gained an inferred architecture`);
  for (const flag of ['is_flux', 'is_lumina2', 'is_v3']) {
    assert.equal(appliedLegacyProcess.model[flag], (legacyProcess.model as any)[flag]);
  }
}

const structurallyInvalidJob = presetJobFixture();
delete (structurallyInvalidJob.config.process[0] as any).train;
expectThrows(() => sanitizeTrainingPreset(structurallyInvalidJob), /config\.process\[0\]\.train.*plain object/i);

for (const [field, value] of [
  ['lr', Number.NaN],
  ['steps', Number.POSITIVE_INFINITY],
  ['minimum', Number.NEGATIVE_INFINITY],
] as const) {
  const unsafeJob = presetJobFixture();
  (unsafeJob.config.process[0] as any).train[field] = value;
  expectThrows(
    () => sanitizeTrainingPreset(unsafeJob),
    new RegExp(`\\$\\.config\\.process\\[0\\]\\.train\\.${field}.*finite number`, 'i'),
  );
}

for (const [field, value, description] of [
  ['bigint_value', BigInt(1), 'bigint'],
  ['function_value', () => true, 'function'],
  ['symbol_value', Symbol('unsafe'), 'symbol'],
] as const) {
  const unsafe = structuredClone(sanitized) as any;
  unsafe.config.process[0].train[field] = value;
  expectThrows(
    () => validateTrainingPresetSnapshot(unsafe),
    new RegExp(`\\$\\.config\\.process\\[0\\]\\.train\\.${field}.*${description}`, 'i'),
  );
}

const withUndefinedArrayElement = structuredClone(sanitized) as any;
withUndefinedArrayElement.config.process[0].train.future_values = [1, undefined, 3];
expectThrows(
  () => validateTrainingPresetSnapshot(withUndefinedArrayElement),
  /\$\.config\.process\[0\]\.train\.future_values\[1\].*undefined/i,
);

const withUnsupportedInstance = structuredClone(sanitized) as any;
withUnsupportedInstance.config.process[0].train.started_at = new Date();
expectThrows(
  () => validateTrainingPresetSnapshot(withUnsupportedInstance),
  /\$\.config\.process\[0\]\.train\.started_at.*plain object/i,
);

const circularSnapshot = structuredClone(sanitized) as any;
circularSnapshot.config.process[0].train.circular = circularSnapshot.config.process[0].train;
expectThrows(
  () => validateTrainingPresetSnapshot(circularSnapshot),
  /\$\.config\.process\[0\]\.train\.circular.*circular/i,
);

const withOptionalUndefined = structuredClone(sanitized) as any;
withOptionalUndefined.config.process[0].model.optional_future_path = undefined;
const withoutOptionalUndefined = validateTrainingPresetSnapshot(withOptionalUndefined);
assert.equal('optional_future_path' in (withoutOptionalUndefined.config.process[0] as any).model, false);

expectThrows(
  () =>
    validateTrainingPresetSnapshot({
      ...sanitized,
      config: {
        process: [{ ...structuredClone(validProcess), payload: '\ud83d\ude00'.repeat(MAX_PRESET_SNAPSHOT_BYTES / 2) }],
      },
    }),
  /512 KiB/i,
);

const current = jobFixture();
const preset = sanitizeTrainingPreset(presetJobFixture());
const currentBefore = structuredClone(current);
const presetBefore = structuredClone(preset);
let migrationCalls = 0;
const migrate = (job: JobConfig): JobConfig => {
  migrationCalls += 1;
  const process = job.config.process[0] as any;
  if (Array.isArray(process.sample?.prompts)) {
    process.sample.samples = process.sample.prompts.map((prompt: string) => ({ prompt }));
    delete process.sample.prompts;
  }
  // Exercise the post-migration protected-field restoration seam.
  if (process.model.arch === 'sdxl') {
    job.config.name = 'migration-overwrite';
    job.meta = { name: 'migration-overwrite', version: '0' };
    process.device = 'migration-overwrite';
    process.datasets = [{ folder_path: '/migration-overwrite' }];
    process.sample.samples = [{ prompt: 'migration-overwrite' }];
  }
  return job;
};

const applied = applyTrainingPreset(current, preset, migrate) as LooseJobConfig;
assert.equal(migrationCalls, 2);
assert.equal(applied.config.name, 'current-job');
assert.deepEqual(applied.meta, current.meta);
const appliedProcess = applied.config.process[0] as unknown as Record<string, any>;
assert.equal(appliedProcess.training_folder, '/current/output');
assert.equal(appliedProcess.sqlite_db_path, '/current/jobs.sqlite');
assert.equal(appliedProcess.device, 'cuda:1');
assert.equal(appliedProcess.trigger_word, 'CURRENT');
assert.deepEqual(appliedProcess.datasets, [{ folder_path: '/current/images', resolution: [1024] }]);
assert.deepEqual(appliedProcess.sample.samples, [
  { prompt: 'current sample', seed: 12, control_image_path: '/current/control.png' },
]);
assert.equal(appliedProcess.sample.sampler, 'ddim');
assert.equal(appliedProcess.sample.guidance_scale, 7);
assert.equal(appliedProcess.model.arch, 'sdxl');
assert.deepEqual(appliedProcess.model.model_kwargs, { sdxl_only_key: 42 });
assert.equal('stale_flux_key' in appliedProcess.model.model_kwargs, false);
assert.deepEqual(appliedProcess.future_training_option, { enabled: false, mode: 'future' });
assert.deepEqual(current, currentBefore);
assert.deepEqual(preset, presetBefore);
assert.notEqual(applied.meta, current.meta);
assert.notEqual(appliedProcess.datasets, (current.config.process[0] as any).datasets);
assert.notEqual(appliedProcess.sample.samples, (current.config.process[0] as any).sample.samples);
assert.notEqual(appliedProcess.model, (preset.config.process[0] as any).model);

const legacyCurrent = jobFixture();
const legacySample = (legacyCurrent.config.process[0] as any).sample;
delete legacySample.samples;
legacySample.prompts = ['legacy current prompt'];
const legacyApplied = applyTrainingPreset(legacyCurrent, preset, (job: JobConfig) => {
  const sample = (job.config.process[0] as any).sample;
  if (Array.isArray(sample?.prompts)) {
    sample.samples = sample.prompts.map((prompt: string) => ({ prompt }));
    delete sample.prompts;
  }
  return job;
});
assert.deepEqual((legacyApplied.config.process[0] as any).sample.samples, [{ prompt: 'legacy current prompt' }]);

const absentCurrent = jobFixture() as any;
for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
  delete absentCurrent.config.process[0][key];
}
delete absentCurrent.config.name;
delete absentCurrent.meta;
delete absentCurrent.config.process[0].sample.samples;
const absentApplied = applyTrainingPreset(absentCurrent, preset, (job: JobConfig) => job) as any;
for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
  assert.equal(key in absentApplied.config.process[0], false, `${key} must remain absent`);
}
assert.equal('name' in absentApplied.config, false);
assert.equal('meta' in absentApplied, false);
assert.equal('samples' in absentApplied.config.process[0].sample, false);

const migrationArguments: JobConfig[] = [];
const migrationIsolated = applyTrainingPreset(jobFixture(), preset, (job: JobConfig) => {
  migrationArguments.push(job);
  return job;
});
assert.equal(migrationArguments.length, 2);
(migrationArguments[1].config.process[0] as any).model.arch = 'mutated after migration';
assert.equal((migrationIsolated.config.process[0] as any).model.arch, 'sdxl');
(migrationIsolated.config.process[0] as any).model.arch = 'mutated result';
assert.equal((migrationArguments[1].config.process[0] as any).model.arch, 'mutated after migration');

let malformedMigrationCall = 0;
expectThrows(
  () =>
    applyTrainingPreset(jobFixture(), preset, (job: JobConfig) => {
      malformedMigrationCall += 1;
      if (malformedMigrationCall === 2) (job.config.process[0] as any).sample = null;
      return job;
    }),
  /config\.process\[0\]\.sample.*plain object/i,
);

const snapshotWithLegacyPrompts = structuredClone(preset);
(snapshotWithLegacyPrompts.config.process[0] as any).sample.prompts = ['untrusted preset prompt'];
const withoutPresetPrompts = applyTrainingPreset(jobFixture(), snapshotWithLegacyPrompts, (job: JobConfig) => job);
assert.equal('prompts' in (withoutPresetPrompts.config.process[0] as any).sample, false);

const lifecyclePresetJob = presetJobFixture();
const lifecyclePresetProcess = lifecyclePresetJob.config.process[0] as any;
lifecyclePresetProcess.type = 'concept_slider';
lifecyclePresetProcess.model = {
  arch: 'qwen_image',
  name_or_path: 'Qwen/Qwen-Image',
  model_kwargs: { preset_only: true },
};
lifecyclePresetProcess.network = { type: 'lokr', linear: 48, linear_alpha: 24 };
lifecyclePresetProcess.train = { steps: 4321, optimizer: 'prodigy', lr: 0.0002 };
lifecyclePresetProcess.sample = {
  sampler: 'flowmatch',
  sample_every: 73,
  guidance_scale: 4.25,
  width: 768,
  height: 1024,
  samples: [{ prompt: 'preset prompt must not be applied' }],
};
const lifecyclePreset = sanitizeTrainingPreset(lifecyclePresetJob);

for (const scenario of [
  { name: 'new', jobName: 'new-job', promptKind: 'samples' },
  { name: 'edit', jobName: 'edited-job', promptKind: 'samples' },
  { name: 'clone', jobName: 'source-job_copy', promptKind: 'samples' },
  { name: 'legacy import', jobName: 'imported-job', promptKind: 'prompts' },
] as const) {
  const currentJob = jobFixture() as any;
  const currentProcess = currentJob.config.process[0];
  currentJob.config.name = scenario.jobName;
  currentJob.meta = { name: `[${scenario.name}]`, version: 'legacy', lifecycle: scenario.name };
  currentProcess.training_folder = `/${scenario.name}/output`;
  currentProcess.sqlite_db_path = `/${scenario.name}/jobs.sqlite`;
  currentProcess.device = process.platform === 'darwin' ? 'mps' : `device:${scenario.name}`;
  currentProcess.trigger_word = `TRIGGER_${scenario.name}`;
  currentProcess.datasets = [{ folder_path: `/${scenario.name}/images`, num_repeats: 7 }];
  currentProcess.model = {
    arch: 'flux',
    name_or_path: 'old/model',
    model_kwargs: { stale_old_model_field: true },
    stale_model_specific_field: 'remove me',
  };
  currentProcess.network = { type: 'lora', linear: 4 };
  currentProcess.train = { steps: 12, optimizer: 'adamw8bit' };
  currentProcess.sample = {
    sampler: 'old-sampler',
    sample_every: 2,
    guidance_scale: 1,
    width: 256,
    height: 256,
    ...(scenario.promptKind === 'prompts'
      ? { prompts: [`${scenario.name} legacy prompt`] }
      : { samples: [{ prompt: `${scenario.name} sample prompt`, seed: 99 }] }),
  };
  const currentBefore = structuredClone(currentJob);
  const presetBefore = structuredClone(lifecyclePreset);

  const result = applyTrainingPreset(currentJob, lifecyclePreset, migrateJobConfig) as any;
  const resultProcess = result.config.process[0];

  assert.equal(result.config.name, scenario.jobName, `${scenario.name}: name`);
  assert.deepEqual(result.meta, currentJob.meta, `${scenario.name}: meta`);
  assert.equal(resultProcess.training_folder, currentProcess.training_folder, `${scenario.name}: training folder`);
  assert.equal(resultProcess.sqlite_db_path, currentProcess.sqlite_db_path, `${scenario.name}: sqlite path`);
  assert.equal(resultProcess.device, currentProcess.device, `${scenario.name}: device`);
  assert.equal(resultProcess.trigger_word, currentProcess.trigger_word, `${scenario.name}: trigger`);
  assert.deepEqual(resultProcess.datasets, currentProcess.datasets, `${scenario.name}: datasets`);
  assert.deepEqual(
    resultProcess.sample.samples,
    scenario.promptKind === 'prompts' ? [{ prompt: `${scenario.name} legacy prompt` }] : currentProcess.sample.samples,
    `${scenario.name}: samples`,
  );
  assert.equal('prompts' in resultProcess.sample, false, `${scenario.name}: legacy prompts normalized`);
  assert.equal(resultProcess.type, 'concept_slider', `${scenario.name}: process type`);
  assert.equal(resultProcess.model.arch, 'qwen_image', `${scenario.name}: model architecture`);
  assert.equal(resultProcess.model.name_or_path, 'Qwen/Qwen-Image', `${scenario.name}: model path`);
  assert.deepEqual(resultProcess.model.model_kwargs, { preset_only: true }, `${scenario.name}: model kwargs`);
  assert.equal('stale_model_specific_field' in resultProcess.model, false, `${scenario.name}: stale model fields`);
  assert.deepEqual(resultProcess.network, { type: 'lokr', linear: 48, linear_alpha: 24 });
  assert.equal(resultProcess.train.optimizer, 'prodigy');
  assert.equal(resultProcess.train.steps, 4321);
  assert.equal(resultProcess.sample.sample_every, 73);
  assert.equal(resultProcess.sample.guidance_scale, 4.25);
  assert.equal(resultProcess.sample.width, 768);
  assert.equal(resultProcess.sample.height, 1024);
  assert.deepEqual(currentJob, currentBefore, `${scenario.name}: current input must not mutate`);
  assert.deepEqual(lifecyclePreset, presetBefore, `${scenario.name}: preset input must not mutate`);
}

const absentLifecycleCurrent = jobFixture() as any;
delete absentLifecycleCurrent.config.name;
delete absentLifecycleCurrent.meta;
for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
  delete absentLifecycleCurrent.config.process[0][key];
}
delete absentLifecycleCurrent.config.process[0].sample.samples;
delete absentLifecycleCurrent.config.process[0].sample.prompts;
const absentLifecycleCurrentBefore = structuredClone(absentLifecycleCurrent);
const absentLifecyclePresetBefore = structuredClone(lifecyclePreset);
const absentLifecycleApplied = applyTrainingPreset(absentLifecycleCurrent, lifecyclePreset, migrateJobConfig) as any;
assert.equal('name' in absentLifecycleApplied.config, false);
assert.equal('meta' in absentLifecycleApplied, false);
for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
  assert.equal(key in absentLifecycleApplied.config.process[0], false, `${key} must remain absent`);
}
assert.equal('samples' in absentLifecycleApplied.config.process[0].sample, false);
assert.equal('prompts' in absentLifecycleApplied.config.process[0].sample, false);
assert.deepEqual(absentLifecycleCurrent, absentLifecycleCurrentBefore, 'absent current input must not mutate');
assert.deepEqual(lifecyclePreset, absentLifecyclePresetBefore, 'absent preset input must not mutate');

const migrationIntroducedApplied = applyTrainingPreset(
  absentLifecycleCurrent,
  lifecyclePreset,
  (jobConfig: JobConfig) => {
    const migrated = migrateJobConfig(jobConfig) as any;
    migrated.config.name = 'migration-added-name';
    migrated.meta = { name: 'migration-added-meta', version: '0' };
    const process = migrated.config.process[0];
    process.training_folder = '/migration-added/output';
    process.sqlite_db_path = '/migration-added/jobs.sqlite';
    process.device = 'migration-added-device';
    process.trigger_word = 'MIGRATION_ADDED';
    process.datasets = [{ folder_path: '/migration-added/images' }];
    process.sample.samples = [{ prompt: 'migration-added prompt' }];
    return migrated;
  },
) as any;
assert.equal('name' in migrationIntroducedApplied.config, false);
assert.equal('meta' in migrationIntroducedApplied, false);
for (const key of ['training_folder', 'sqlite_db_path', 'device', 'trigger_word', 'datasets']) {
  assert.equal(key in migrationIntroducedApplied.config.process[0], false, `${key} added by migration must be removed`);
}
assert.equal('samples' in migrationIntroducedApplied.config.process[0].sample, false);
assert.equal('prompts' in migrationIntroducedApplied.config.process[0].sample, false);
assert.deepEqual(
  absentLifecycleCurrent,
  absentLifecycleCurrentBefore,
  'migration must not mutate absent current input',
);
assert.deepEqual(lifecyclePreset, absentLifecyclePresetBefore, 'migration must not mutate absent preset input');

const throwingCurrent = jobFixture();
const throwingSnapshot = sanitizeTrainingPreset(presetJobFixture());
const throwingCurrentBefore = structuredClone(throwingCurrent);
const throwingSnapshotBefore = structuredClone(throwingSnapshot);
expectThrows(
  () =>
    applyTrainingPreset(throwingCurrent, throwingSnapshot, (_job: JobConfig) => {
      throw new Error('migration failed');
    }),
  /migration failed/,
);
assert.deepEqual(throwingCurrent, throwingCurrentBefore);
assert.deepEqual(throwingSnapshot, throwingSnapshotBefore);

console.log('Training preset snapshot tests passed');
