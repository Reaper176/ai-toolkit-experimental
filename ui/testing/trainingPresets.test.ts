import assert from 'node:assert/strict';
import type { JobConfig } from '../src/types';
import {
  MAX_PRESET_NAME_LENGTH,
  MAX_PRESET_SNAPSHOT_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
  applyTrainingPreset,
  normalizePresetName,
  sanitizeTrainingPreset,
  validateTrainingPresetSnapshot,
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
            samples: [{ prompt: 'current sample', seed: 12 }],
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
assert.deepEqual(sanitizedProcess.future_training_option, { enabled: false, mode: 'future' });

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
expectThrows(
  () =>
    validateTrainingPresetSnapshot({
      ...sanitized,
      config: { process: [{ payload: '\ud83d\ude00'.repeat(MAX_PRESET_SNAPSHOT_BYTES / 2) }] },
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
assert.deepEqual(appliedProcess.sample.samples, [{ prompt: 'current sample', seed: 12 }]);
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

const snapshotWithLegacyPrompts = structuredClone(preset);
(snapshotWithLegacyPrompts.config.process[0] as any).sample.prompts = ['untrusted preset prompt'];
const withoutPresetPrompts = applyTrainingPreset(jobFixture(), snapshotWithLegacyPrompts, (job: JobConfig) => job);
assert.equal('prompts' in (withoutPresetPrompts.config.process[0] as any).sample, false);

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
