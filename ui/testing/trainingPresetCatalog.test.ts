import assert from 'node:assert/strict';
import type { BuiltInTrainingPresetRecord } from '../src/helpers/trainingPresets';
import {
  BUILT_IN_ARCHITECTURE_BINDINGS,
  BUILT_IN_ARCHITECTURE_ORDER,
  BUILT_IN_CATEGORY_ORDER,
  BUILT_IN_PRESET_RELEASE_TIMESTAMP,
  BUILT_IN_PRESET_REVISION,
  BUILT_IN_RECIPE_PATHS,
} from '../src/helpers/builtInTrainingPresetBindings';
import {
  builtInsForArchitecture,
  canonicalizePresetJson,
  compareBuiltInTrainingPresetRecords,
  copyBuiltInPreset,
  deepFreezePreset,
  normalizeTrainingPresetRecipePath,
  trainingPresetRecipeUrl,
  validateBuiltInTrainingPresetRecord,
} from '../src/helpers/builtInTrainingPresets';

function validRecord(): BuiltInTrainingPresetRecord {
  return {
    id: 'builtin:flux:character-general-concept@1',
    name: 'FLUX.1 — Character / General Concept',
    source: 'builtin',
    read_only: true,
    schema_version: 1,
    model_arch: 'flux',
    category: 'character',
    intent_slug: 'character-general-concept',
    catalog_revision: 1,
    summary: 'A useful starting point.',
    recipe_path: 'docs/book/recipes/character-identity.md',
    prerequisites: ['Use compatible data.'],
    warnings: ['Configuration validation is not a quality guarantee.'],
    evidence: 'configuration-validated',
    created_at: '2026-08-14T00:00:00.000Z',
    updated_at: '2026-08-14T00:00:00.000Z',
    snapshot: {
      schema_version: 1,
      job: 'extension',
      config: {
        process: [
          {
            type: 'diffusion_trainer',
            model: { arch: 'flux', name_or_path: 'black-forest-labs/FLUX.1-dev', low_vram: false },
            network: { type: 'lora', linear: 16, linear_alpha: 16 },
            train: { steps: 2000, lr: 0.0001, gradient_accumulation: 1 },
            save: { save_every: 250, max_step_saves_to_keep: 4, push_to_hub: false },
            sample: { sample_every: 250, sample_start_step: 0, guidance_scale: 4 },
            logging: { log_every: 1, use_ui_logger: true, use_wandb: false },
          },
        ],
      },
    },
  };
}

function mutate(mutator: (record: any) => void): unknown {
  const record = validRecord() as any;
  mutator(record);
  return record;
}

assert.equal(
  canonicalizePresetJson({ '\uffff': 1, '\ud83d\ude00': 2, a: { '\ud83d\ude00': 3, '\uffff': 4 }, list: [3, 1, 2] }),
  '{"a":{"\uffff":4,"\ud83d\ude00":3},"list":[3,1,2],"\uffff":1,"\ud83d\ude00":2}',
);
assert.equal(canonicalizePresetJson({ b: 1, a: 2 }), canonicalizePresetJson({ a: 2, b: 1 }));
assert.equal(canonicalizePresetJson([3, { b: 2, a: 1 }, 1]), '[3,{"a":1,"b":2},1]');
const shared = { value: 1 };
assert.equal(canonicalizePresetJson({ right: shared, left: shared }), '{"left":{"value":1},"right":{"value":1}}');

class OverriddenMapArray extends Array<number> {}
Object.defineProperty(OverriddenMapArray.prototype, 'map', {
  value: () => [Symbol('unvalidated override')],
});
const overriddenMapArray = new OverriddenMapArray();
overriddenMapArray.push(4, 2);
assert.equal(canonicalizePresetJson(overriddenMapArray), '[4,2]');

let proxyPropertyReads = 0;
const changeOnReadProxy = new Proxy(
  { value: 'captured descriptor value' },
  {
    get: (target, key, receiver) => {
      proxyPropertyReads += 1;
      if (key === 'value') return Symbol('unvalidated changed value');
      return Reflect.get(target, key, receiver);
    },
  },
);
assert.equal(canonicalizePresetJson(changeOnReadProxy), '{"value":"captured descriptor value"}');
assert.equal(proxyPropertyReads, 0);

const sparse = [1, 2];
delete sparse[1];
const extraArray = [1] as any;
extraArray.extra = true;
const outOfRangeArray = [1] as any;
Object.defineProperty(outOfRangeArray, '2', { value: 2, enumerable: true });
const reportedOutOfRangeArray = new Proxy([1], {
  ownKeys: target => [...Reflect.ownKeys(target), '2'],
  getOwnPropertyDescriptor: (target, key) =>
    key === '2'
      ? { value: 2, writable: true, configurable: true, enumerable: true }
      : Reflect.getOwnPropertyDescriptor(target, key),
});
const accessorArray = [1];
Object.defineProperty(accessorArray, '0', { get: () => 1, enumerable: true });
const nonEnumerableArray = [1];
Object.defineProperty(nonEnumerableArray, '0', { value: 1, enumerable: false });
const cycle: any = {};
cycle.self = cycle;
const accessorObject = {};
Object.defineProperty(accessorObject, 'value', { get: () => 1, enumerable: true });
const hiddenObject = {};
Object.defineProperty(hiddenObject, 'value', { value: 1, enumerable: false });
for (const value of [
  sparse,
  extraArray,
  outOfRangeArray,
  reportedOutOfRangeArray,
  accessorArray,
  nonEnumerableArray,
  undefined,
  NaN,
  Infinity,
  cycle,
  new Date(),
  () => 1,
  Symbol('value'),
  1n,
  accessorObject,
  hiddenObject,
  { [Symbol('key')]: 1 },
  { value: Symbol('value') },
]) {
  assert.throws(() => canonicalizePresetJson(value), /Unsupported canonical JSON value/);
}

assert.deepEqual(BUILT_IN_ARCHITECTURE_ORDER, [
  'anima',
  'flux',
  'flex1',
  'qwen_image',
  'qwen_image_edit_plus',
  'sdxl',
  'sd15',
  'wan21:1b',
  'wan22_14b:t2v',
]);
assert.deepEqual(BUILT_IN_CATEGORY_ORDER, ['character', 'style', 'object', 'refinement', 'low-vram', 'diagnostic']);
assert.equal(BUILT_IN_ARCHITECTURE_BINDINGS.length, 9);
assert.deepEqual(BUILT_IN_ARCHITECTURE_BINDINGS[8], {
  ui_arch: 'wan22_14b:t2v',
  model_path: 'ai-toolkit/Wan2.2-T2V-A14B-Diffusers-bf16',
  engine_arch: 'wan22_14b',
  model_class: 'Wan2214bModel',
});
assert.equal(BUILT_IN_PRESET_RELEASE_TIMESTAMP, '2026-08-14T00:00:00.000Z');
assert.equal(BUILT_IN_PRESET_REVISION, 1);
assert.deepEqual(BUILT_IN_RECIPE_PATHS, [
  'docs/book/recipes/character-identity.md',
  'docs/book/recipes/style.md',
  'docs/book/recipes/object-concept.md',
  'docs/book/recipes/focused-refinement.md',
  'docs/book/recipes/low-vram.md',
  'docs/book/recipes/diagnostic-run.md',
]);
assert.equal(Object.isFrozen(BUILT_IN_ARCHITECTURE_BINDINGS), true);
assert.equal(
  BUILT_IN_ARCHITECTURE_BINDINGS.every(binding => Object.isFrozen(binding)),
  true,
);
assert.equal(Object.isFrozen(BUILT_IN_ARCHITECTURE_ORDER), true);
assert.equal(Object.isFrozen(BUILT_IN_CATEGORY_ORDER), true);
assert.equal(Object.isFrozen(BUILT_IN_RECIPE_PATHS), true);
assert.equal(Reflect.set(BUILT_IN_ARCHITECTURE_BINDINGS[0], 'model_path', 'attacker/model'), false);
assert.equal(Reflect.set(BUILT_IN_ARCHITECTURE_ORDER, '0', 'attacker'), false);
assert.equal(BUILT_IN_ARCHITECTURE_BINDINGS[0].model_path, 'circlestone-labs/Anima-Base-v1.0-Diffusers');
assert.equal(BUILT_IN_ARCHITECTURE_ORDER[0], 'anima');

assert.equal(normalizeTrainingPresetRecipePath('docs/book/recipes/style.md'), 'docs/book/recipes/style.md');
assert.equal(
  trainingPresetRecipeUrl('docs/book/recipes/space name.md'),
  'https://github.com/Reaper176/ai-toolkit-experimental/blob/main/docs/book/recipes/space%20name.md',
);
for (const path of [
  '/docs/book/recipes/style.md',
  'docs\\book\\recipes\\style.md',
  'docs/book/recipes/../style.md',
  '../docs/book/recipes/style.md',
  'docs/book/recipes/style.md?raw=1',
  'docs/book/recipes/style.md#part',
  'docs/book/reference/style.md',
]) {
  assert.throws(() => normalizeTrainingPresetRecipePath(path), /recipe path/i);
}

const validationInput = validRecord();
const validated = validateBuiltInTrainingPresetRecord(validationInput);
assert.equal(Object.isFrozen(validationInput), false);
(validationInput.snapshot.config.process[0] as any).train.steps = 99;
assert.equal((validated.snapshot.config.process[0] as any).train.steps, 2000);
assert.notEqual(validated, validationInput);
assert.notEqual(validated.snapshot, validationInput.snapshot);
assert.equal(Object.isFrozen(validated), true);
assert.equal(Object.isFrozen(validated.snapshot.config.process[0]), true);
const copied = copyBuiltInPreset(validated);
assert.notEqual(copied, validated);
assert.equal(Object.isFrozen(copied), false);
(copied.snapshot.config.process[0] as any).train.steps = 1;
assert.equal((validated.snapshot.config.process[0] as any).train.steps, 2000);
const manuallyFrozen = deepFreezePreset({ nested: [{ value: 1 }] });
assert.equal(Object.isFrozen(manuallyFrozen.nested[0]), true);

const second = mutate(record => {
  record.id = 'builtin:flux:style-aesthetic@1';
  record.intent_slug = 'style-aesthetic';
  record.category = 'style';
  record.name = 'Style';
}) as BuiltInTrainingPresetRecord;
assert.equal(compareBuiltInTrainingPresetRecords(validRecord(), second) < 0, true);
assert.deepEqual(
  builtInsForArchitecture([second, validated], 'flux').map(record => record.category),
  ['character', 'style'],
);
assert.deepEqual(builtInsForArchitecture([validated], 'sdxl'), []);
assert.notEqual(builtInsForArchitecture([validated], 'flux')[0], validated);

let proxiedSourceReads = 0;
const changingRecordProxy = new Proxy(validRecord(), {
  get: (target, key, receiver) => {
    if (key === 'source') {
      proxiedSourceReads += 1;
      return proxiedSourceReads === 1 ? 'builtin' : 'user';
    }
    return Reflect.get(target, key, receiver);
  },
});
const validatedProxyRecord = validateBuiltInTrainingPresetRecord(changingRecordProxy);
assert.equal(validatedProxyRecord.source, 'builtin');
assert.equal(proxiedSourceReads, 0);

for (const [owner, key, inherited] of [
  ['snapshot', 'schema_version', 1],
  ['snapshot', 'job', 'extension'],
  ['snapshot', 'config', { process: validRecord().snapshot.config.process }],
  ['config', 'process', validRecord().snapshot.config.process],
] as const) {
  const pollutedRecord = validRecord() as any;
  const target = owner === 'snapshot' ? pollutedRecord.snapshot : pollutedRecord.snapshot.config;
  Object.defineProperty(Object.prototype, key, {
    value: inherited,
    configurable: true,
    enumerable: false,
    writable: true,
  });
  try {
    delete target[key];
    assert.throws(
      () => validateBuiltInTrainingPresetRecord(pollutedRecord),
      new RegExp(`snapshot(?:\\.config)?\\.${key}.*(?:own|required)|${key}.*(?:own|required)`, 'i'),
    );
  } finally {
    delete (Object.prototype as Record<string, unknown>)[key];
  }
}

const invalidCases: Array<[(record: any) => void, RegExp]> = [
  [
    record => {
      record.source = 'user';
    },
    /source/,
  ],
  [
    record => {
      record.read_only = false;
    },
    /read.only/,
  ],
  [
    record => {
      record.schema_version = 2;
    },
    /schema.version/,
  ],
  [
    record => {
      record.catalog_revision = 0;
    },
    /catalog.revision/,
  ],
  [
    record => {
      record.intent_slug = 'Bad Slug';
    },
    /intent.slug/,
  ],
  [
    record => {
      record.id = 'builtin:flux:wrong@1';
    },
    /id/,
  ],
  [
    record => {
      record.name = ' ';
    },
    /name/,
  ],
  [
    record => {
      record.summary = '';
    },
    /summary/,
  ],
  [
    record => {
      record.created_at = '2026-08-15T00:00:00.000Z';
    },
    /created.at/,
  ],
  [
    record => {
      record.updated_at = '2026-08-15T00:00:00.000Z';
    },
    /updated.at/,
  ],
  [
    record => {
      record.category = 'other';
    },
    /category/,
  ],
  [
    record => {
      record.evidence = 'unverified';
    },
    /evidence/,
  ],
  [
    record => {
      record.recipe_path = 'docs/book/recipes/not-real.md';
    },
    /recipe.path/,
  ],
  [
    record => {
      record.prerequisites = [''];
    },
    /prerequisites/,
  ],
  [
    record => {
      record.warnings = 'none';
    },
    /warnings/,
  ],
  [
    record => {
      record.snapshot.config.process[0].type = 'other';
    },
    /type/,
  ],
  [
    record => {
      record.snapshot.config.process[0].model.arch = 'sdxl';
    },
    /model.arch/,
  ],
  [
    record => {
      record.snapshot.config.process[0].model.name_or_path = 'other/model';
    },
    /name.or.path/,
  ],
  [
    record => {
      record.snapshot.config.process[0].network.type = 'lycoris';
    },
    /network.type/,
  ],
  [
    record => {
      record.snapshot.config.process[0].train.lr = -1;
    },
    /train.lr/,
  ],
  [
    record => {
      record.snapshot.config.process[0].train.lr = 2;
    },
    /train.lr/,
  ],
  [
    record => {
      record.snapshot.config.process[0].train.gradient_accumulation = 1.5;
    },
    /gradient.accumulation/,
  ],
  [
    record => {
      record.snapshot.config.process[0].model.transformer_layer_offload_percent = 1.1;
    },
    /offload.percent/,
  ],
  [
    record => {
      record.snapshot.config.process[0].train.steps = Infinity;
    },
    /finite|canonical JSON/,
  ],
  [
    record => {
      record.snapshot.config.process[0].save.save_every = -1;
    },
    /save.save.every/,
  ],
  [
    record => {
      record.snapshot.config.process[0].sample.sample_every = -1;
    },
    /sample.sample.every/,
  ],
  [
    record => {
      record.snapshot.config.process[0].logging.log_every = -1;
    },
    /logging.log.every/,
  ],
  [
    record => {
      record.snapshot.config.process[0].save.push_to_hub = true;
    },
    /push.to.hub/,
  ],
  [
    record => {
      record.snapshot.config.process[0].save.hf_repo_id = 'mine/model';
    },
    /hub|destination|hf.repo/,
  ],
  [
    record => {
      record.snapshot.config.process[0].logging.use_wandb = true;
    },
    /wandb/,
  ],
  [
    record => {
      record.snapshot.config.process[0].logging.wandb_project = 'project';
    },
    /wandb/,
  ],
  [
    record => {
      record.snapshot.config.process[0].logging.project_name = 'project';
    },
    /project.name|wandb/,
  ],
  [
    record => {
      record.snapshot.config.process[0].logging.use_mlflow = true;
    },
    /remote logging|use.mlflow/,
  ],
  [
    record => {
      record.snapshot.config.process[0].datasets = [];
    },
    /datasets/,
  ],
  [
    record => {
      record.snapshot.config.process[0].trigger_word = 'TOKEN';
    },
    /trigger.word/,
  ],
  [
    record => {
      record.snapshot.config.process[0].training_folder = '/tmp/output';
    },
    /training.folder/,
  ],
  [
    record => {
      record.snapshot.config.process[0].sqlite_db_path = '/tmp/db';
    },
    /sqlite.db.path/,
  ],
  [
    record => {
      record.snapshot.config.process[0].device = 'cuda:0';
    },
    /device/,
  ],
  [
    record => {
      record.snapshot.config.process[0].job = 'name';
    },
    /job/,
  ],
  [
    record => {
      record.snapshot.config.process[0].output_dir = 'output';
    },
    /output/,
  ],
  [
    record => {
      record.snapshot.config.name = 'leaked-job';
    },
    /config.name|identity/,
  ],
  [
    record => {
      record.snapshot.meta = { name: 'leaked-job' };
    },
    /snapshot.meta|identity/,
  ],
  [
    record => {
      record.snapshot.config.process[0].sample.samples = [];
    },
    /sample.samples/,
  ],
  [
    record => {
      record.snapshot.config.process[0].sample.prompts = [];
    },
    /sample.prompts/,
  ],
  [
    record => {
      record.snapshot.config.process[0].sample.neg = 'bad';
    },
    /sample.neg/,
  ],
  [
    record => {
      record.snapshot.config.process[0].model.name_or_path = '${MODEL_PATH}';
    },
    /name.or.path|placeholder/,
  ],
  [
    record => {
      record.snapshot.config.process[0].model.adapter_path = '/home/alice/model';
    },
    /personal|mutable|path/,
  ],
  [
    record => {
      delete record.snapshot.config.process[0].logging;
    },
    /logging/,
  ],
  [
    record => {
      record.snapshot.config.process[0].logging = [];
    },
    /logging/,
  ],
];
for (const [mutator, pattern] of invalidCases) {
  assert.throws(() => validateBuiltInTrainingPresetRecord(mutate(mutator)), pattern);
}

console.log('training preset catalog tests passed');
