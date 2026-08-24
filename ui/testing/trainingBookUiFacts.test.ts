import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  collectTrainingBookUiFacts,
  collectCanonicalSetterPathsFromSource,
  collectDeclaredServerGlobalClaimsFromSource,
  collectVisibleControlClaimsFromSource,
  validateTrainingBookUiFacts,
  validateArchitectureProjectedControlTemplates,
  writeTrainingBookUiFacts,
} from './trainingBookFacts';

assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    function SimpleJob({ jobConfig }) {
      const validationConfig = jobConfig.config.process[0].train.validation_config;
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig(24, \`config.process[0].datasets[\${i}].fps\`));
      validationConfig.validation_items.map((item, validationIndex) =>
        setJobConfig('', \`config.process[0].train.validation_config.validation_items[\${validationIndex}].image_path\`));
      jobConfig.config.process[0].sample.samples.map((sample, i) =>
        ['ctrl_img_1', 'ctrl_img_2'].map(ctrlKey =>
          setJobConfig('', \`config.process[0].sample.samples[\${i}].\${ctrlKey}\`)));
    }
  `),
  [
    'config.process[*].datasets[*].fps',
    'config.process[*].sample.samples[*].ctrl_img_1',
    'config.process[*].sample.samples[*].ctrl_img_2',
    'config.process[*].train.validation_config.validation_items[*].image_path',
  ],
  'a top-level PascalCase function declaration is a proven component-prop boundary',
);
assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    const CaptionSimpleJob: React.FC<Props> = ({ jobConfig }) => {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig('', \`config.process[0].datasets[\${i}].caption_ext\`));
    };
  `),
  ['config.process[*].datasets[*].caption_ext'],
  'a top-level PascalCase variable-bound arrow is a proven component-prop boundary',
);
assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      function open() {
        const sampleCfg = jobConfig.config.process[0].sample;
        const items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt })).filter(item => item.prompt);
        openUpsamplePromptsModal(items, (index, prompt) =>
          setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`));
      }
    }
  `),
  ['config.process[*].sample.samples[*].prompt'],
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource("setJobConfig('', `config.process[0].datasets[${i}].fps`);"),
  /unbound setter path template identifier i/,
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource("other.map((row, i) => setJobConfig('', `config.process[0].datasets[${i}].fps`));"),
  /approved direct repeatable-array map/,
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    import unrelated from './unrelated';
    unrelated.config.process[0].datasets.map((dataset, i) =>
      setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
  `),
  /approved direct repeatable-array map/,
  'an arbitrary imported .config root must not acquire jobConfig provenance',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    import jobConfig from './unrelated';
    jobConfig.config.process[0].datasets.map((dataset, i) =>
      setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
  `),
  /approved direct repeatable-array map/,
  'an imported jobConfig name is not the collector jobConfig boundary',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    jobConfig.config.process[0].datasets.map((dataset, i) =>
      setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
  `),
  /approved direct repeatable-array map/,
  'an unbound jobConfig name is not a proven collector boundary',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function unrelated(jobConfig) {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
    }
  `),
  /approved direct repeatable-array map/,
  'a positional parameter named jobConfig is not the component-prop boundary',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Outer() {
      function Unrelated({ jobConfig }) {
        jobConfig.config.process[0].datasets.map((dataset, i) =>
          setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
      }
    }
  `),
  /approved direct repeatable-array map/,
  'a nested PascalCase helper is not a top-level component boundary',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function unrelated({ jobConfig }) {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
    }
  `),
  /approved direct repeatable-array map/,
  'a lowercase top-level function is not a component boundary',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig = unrelated }) {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
    }
  `),
  /approved direct repeatable-array map/,
  'a defaulted jobConfig binding is not the exact component prop',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture(unrelated, { jobConfig }) {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
    }
  `),
  /approved direct repeatable-array map/,
  'a later destructured parameter is not the component props boundary',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      function declareAlias() {
        const sampleCfg = jobConfig.config.process[0].sample;
        return sampleCfg;
      }
      function consumeAlias() {
        sampleCfg.samples.map((sample, i) =>
          setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
      }
    }
  `),
  /approved direct repeatable-array map/,
  'an alias declared in a sibling function must not leak into this scope',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      const sampleCfg = jobConfig.config.process[0].sample;
      function consumeAlias(sampleCfg) {
        sampleCfg.samples.map((sample, i) =>
          setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
      }
    }
  `),
  /approved direct repeatable-array map/,
  'a parameter must shadow a same-named source alias',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      const sampleCfg = jobConfig.config.process[0].sample;
      function consumeAlias() {
        sampleCfg.samples.map((sample, i) =>
          setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
        if (condition) {
          var sampleCfg = unrelated.sample;
        }
      }
    }
  `),
  /approved direct repeatable-array map/,
  'a nested-block var declaration must hoist and shadow the source alias throughout the function',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      let sampleCfg = jobConfig.config.process[0].sample;
      sampleCfg = unrelated.sample;
      sampleCfg.samples.map((sample, i) =>
        setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
    }
  `),
  /approved direct repeatable-array map/,
  'an alias loses provenance after rebinding',
);
for (const operator of ['&&=', '||=', '??=']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        let sampleCfg = jobConfig.config.process[0].sample;
        sampleCfg ${operator} unrelated.sample;
        sampleCfg.samples.map((sample, i) =>
          setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
      }
    `),
    /approved direct repeatable-array map/,
    `${operator} must invalidate alias provenance`,
  );
}
for (const assignment of [
  '[sampleCfg] = [unrelated.sample];',
  '({ sampleCfg } = { sampleCfg: unrelated.sample });',
]) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        let sampleCfg = jobConfig.config.process[0].sample;
        ${assignment}
        sampleCfg.samples.map((sample, i) =>
          setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
      }
    `),
    /approved direct repeatable-array map/,
    `${assignment} must invalidate alias provenance`,
  );
}
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      let sampleCfg = jobConfig.config.process[0].sample;
      {
        sampleCfg = unrelated.sample;
      }
      sampleCfg.samples.map((sample, i) =>
        setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
    }
  `),
  /approved direct repeatable-array map/,
  'a nested-block assignment must rebind its outer lexical alias',
);
for (const loopKind of ['of', 'in']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        let sampleCfg = jobConfig.config.process[0].sample;
        for (sampleCfg ${loopKind} sources) {
          sampleCfg.samples.map((sample, i) =>
            setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
        }
      }
    `),
    /approved direct repeatable-array map/,
    `a for-${loopKind} target must invalidate alias provenance before the loop body`,
  );
}
assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      let sampleCfg = jobConfig.config.process[0].sample;
      for (sampleCfg of sampleCfg.samples.map((sample, i) => {
        setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`);
        return sample;
      })) {
        break;
      }
    }
  `),
  ['config.process[*].sample.samples[*].prompt'],
  'a loop target assignment must not invalidate provenance while evaluating its iterable',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      let sampleCfg = jobConfig.config.process[0].sample;
      {
        for (sampleCfg of sources) {
          consume(sampleCfg);
        }
      }
      sampleCfg.samples.map((sample, i) =>
        setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
    }
  `),
  /approved direct repeatable-array map/,
  'a nested loop target must invalidate outer alias provenance after the loop',
);
assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      let sampleCfg = jobConfig.config.process[0].sample;
      {
        let sampleCfg = unrelated.sample;
        sampleCfg = other.sample;
      }
      sampleCfg.samples.map((sample, i) =>
        setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
    }
  `),
  ['config.process[*].sample.samples[*].prompt'],
  'a nested shadow assignment must not rebind its outer lexical alias',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      jobConfig.config.process[0].datasets.map((dataset, i) => {
        {
          const i = 0;
          setJobConfig('', \`config.process[0].datasets[\${i}].fps\`);
        }
      });
    }
  `),
  /unbound setter path template identifier i/,
  'a map index must be the exact lexical callback binding',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      jobConfig.config.process[0].datasets.map(undefined, (dataset, i) =>
        setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
    }
  `),
  /unbound setter path template identifier i/,
  'a function passed as the map thisArg is not a direct map callback',
);
for (const indexParameter of ['...i', 'i = 0']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        jobConfig.config.process[0].datasets.map((dataset, ${indexParameter}) =>
          setJobConfig('', \`config.process[0].datasets[\${i}].fps\`));
      }
    `),
    /unbound setter path template identifier i/,
    `map index parameter ${indexParameter} is not an exact numeric index binding`,
  );
}
for (const mutation of ['i++', 'i &&= 0', '[i] = [0]']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        jobConfig.config.process[0].datasets.map((dataset, i) =>
          (${mutation}, setJobConfig('', \`config.process[0].datasets[\${i}].fps\`)));
      }
    `),
    /unbound setter path template identifier i/,
    `concise map mutation ${mutation} must invalidate index provenance before the setter`,
  );
}
assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        ((() => i++), setJobConfig('', \`config.process[0].datasets[\${i}].fps\`)));
    }
  `),
  ['config.process[*].datasets[*].fps'],
  'a concise callback frame must not collect assignments from a nested function',
);
for (const mutation of ['++i;', 'i &&= 0;', '[i] = [0];']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        jobConfig.config.process[0].datasets.map((dataset, i) => {
          ${mutation}
          setJobConfig('', \`config.process[0].datasets[\${i}].fps\`);
        });
      }
    `),
    /unbound setter path template identifier i/,
    `${mutation} must invalidate map callback index provenance`,
  );
}
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig('', \`config.process[0].sample.samples[\${i}].prompt\`));
    }
  `),
  /mapped array does not match setter wildcard/,
  'a proven index can canonicalize only the exact array that bound it',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(
    "setJobConfig('', 'config.process[0].datasets[*].fps');",
  ),
  /unproven wildcard/,
  'canonical wildcard spelling in source is not wildcard provenance',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(
    "setJobConfig('', 'config.process[0].datasets[x].fps');",
  ),
  /unresolved index x/,
  'the model-architecture x placeholder is not valid in setter source',
);
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      function open() {
        const sampleCfg = jobConfig.config.process[0].sample;
        const items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt }));
        const unrelatedItems = items;
        openUpsamplePromptsModal(unrelatedItems, (index, prompt) => {
          setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`);
        });
      }
    }
  `),
  /unbound setter path template identifier index/,
  'the modal adapter requires argument zero to be the exact mapped samples array',
);
for (const indexParameter of ['...index', 'index = 0']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        function open() {
          const sampleCfg = jobConfig.config.process[0].sample;
          const items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt }));
          openUpsamplePromptsModal(items, (${indexParameter}) => {
            setJobConfig('', \`config.process[0].sample.samples[\${index}].prompt\`);
          });
        }
      }
    `),
    /unbound setter path template identifier index/,
    `modal index parameter ${indexParameter} is not an exact numeric index binding`,
  );
}
for (const mapperIndexParameter of ['...i', 'i = 0']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        function open() {
          const sampleCfg = jobConfig.config.process[0].sample;
          const items = sampleCfg.samples.map((s, ${mapperIndexParameter}) => ({ index: i, prompt: s.prompt }));
          openUpsamplePromptsModal(items, (index, prompt) => {
            setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`);
          });
        }
      }
    `),
    /unbound setter path template identifier index/,
    `modal mapper index parameter ${mapperIndexParameter} is not an exact numeric index binding`,
  );
}
for (const mutation of ['index++', 'index ||= 0', '[index] = [0]']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        const sampleCfg = jobConfig.config.process[0].sample;
        const items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt }));
        openUpsamplePromptsModal(items, (index, prompt) =>
          (${mutation}, setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`)));
      }
    `),
    /unbound setter path template identifier index/,
    `concise modal mutation ${mutation} must invalidate index provenance before the setter`,
  );
}
for (const mutation of ['items++;', 'items &&= [];', '[items] = [[]];']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        function open() {
          const sampleCfg = jobConfig.config.process[0].sample;
          let items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt }));
          ${mutation}
          openUpsamplePromptsModal(items, (index, prompt) => {
            setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`);
          });
        }
      }
    `),
    /unbound setter path template identifier index/,
    `${mutation} must invalidate modal items provenance`,
  );
}
for (const loopKind of ['of', 'in']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        const sampleCfg = jobConfig.config.process[0].sample;
        let items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt }));
        for (items ${loopKind} groups) {
          openUpsamplePromptsModal(items, (index, prompt) => {
            setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`);
          });
        }
      }
    `),
    /unbound setter path template identifier index/,
    `a for-${loopKind} target must invalidate modal items provenance before the loop body`,
  );
}
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig }) {
      function open() {
        const sampleCfg = jobConfig.config.process[0].sample;
        const items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt }));
        openUpsamplePromptsModal(items, (index, prompt) => {
          {
            const index = 0;
            setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`);
          }
        });
      }
    }
  `),
  /unbound setter path template identifier index/,
  'the modal wildcard must use the exact callback index binding',
);
for (const mutation of ['index ??= 0;', '[index] = [0];', 'for (index of [0]) break;']) {
  assert.throws(
    () => collectCanonicalSetterPathsFromSource(`
      function Fixture({ jobConfig }) {
        function open() {
          const sampleCfg = jobConfig.config.process[0].sample;
          const items = sampleCfg.samples.map((s, i) => ({ index: i, prompt: s.prompt }));
          openUpsamplePromptsModal(items, (index, prompt) => {
            ${mutation}
            setJobConfig(prompt, \`config.process[0].sample.samples[\${index}].prompt\`);
          });
        }
      }
    `),
    /unbound setter path template identifier index/,
    `${mutation} must invalidate modal callback index provenance`,
  );
}

const visibleControlClaims = collectVisibleControlClaimsFromSource(`
  export default function SimpleJob({ jobConfig, setJobConfig }) {
    return <>
      <NumberInput
        label="Steps"
        value={jobConfig.config.process[0].train.steps}
        onChange={value => setJobConfig(value, 'config.process[0].train.steps')}
        min={1}
        required
      />
      <SelectInput
        label="Mode"
        value={jobConfig.config.process[0].train.mode}
        onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
      />
    </>;
  }
`, 'ui/src/app/jobs/new/SimpleJob.tsx', 'SimpleJob');
assert.deepEqual(visibleControlClaims, [
  {
    source_path: 'ui/src/app/jobs/new/SimpleJob.tsx',
    symbol: 'SimpleJob::SelectInput::config.process[*].train.mode::Mode',
    path: 'config.process[*].train.mode',
    kind: 'setting',
    ui_label: { present: true, value: { kind: 'string', value: 'Mode' } },
    value_contract: {
      ui_type: 'string',
      widget_kind: 'select',
      optional: true,
      nullable: false,
      accepted_values: [
        { kind: 'string', value: 'a' },
        { kind: 'string', value: 'b' },
      ],
    },
  },
  {
    source_path: 'ui/src/app/jobs/new/SimpleJob.tsx',
    symbol: 'SimpleJob::NumberInput::config.process[*].train.steps::Steps',
    path: 'config.process[*].train.steps',
    kind: 'setting',
    ui_label: { present: true, value: { kind: 'string', value: 'Steps' } },
    value_contract: {
      ui_type: 'number',
      widget_kind: 'number',
      optional: false,
      nullable: true,
      minimum: 1,
    },
  },
]);
assert.throws(
  () => collectVisibleControlClaimsFromSource(`
    <NumberInput
      label={dynamicLabel}
      value={jobConfig.config.process[0].train.steps}
      onChange={value => setJobConfig(value, 'config.process[0].train.steps')}
    />
  `, 'fixture.tsx', 'Fixture'),
  /dynamic JSX label/,
);
assert.throws(
  () => collectVisibleControlClaimsFromSource(`
    <SelectInput
      label="Mode"
      value={jobConfig.config.process[0].train.mode}
      onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
      options={[{ value: dynamicValue, label: 'Dynamic' }]}
    />
  `, 'fixture.tsx', 'Fixture'),
  /option value.*literal|accepted value/,
);

function write(root: string, path: string, contents: string): void {
  const destination = join(root, path);
  mkdirSync(join(destination, '..'), { recursive: true });
  writeFileSync(destination, contents);
}

function fixtureRoot(optionsSource: string): string {
  const root = mkdtempSync(join(tmpdir(), 'training-book-ui-facts-fixture-'));
  write(
    root,
    'docs/book/book-manifest.json',
    JSON.stringify({
      schema_version: 1,
      book_revision: 1,
      verified_date: '2026-08-14',
      pages: [],
      preset_architectures: ['fixture'],
      focused_architectures: ['fixture'],
      full_architectures: ['fixture'],
      required_footer: 'fixture',
    }),
  );
  write(root, 'ui/src/app/jobs/new/options.tsx', optionsSource);
  write(root, 'ui/src/docs.tsx', "const docs = { 'config.process[0].train.steps': { title: 'Steps', description: <div>Steps.</div> } }; export default docs;\n");
  write(root, 'ui/src/app/jobs/new/SimpleJob.tsx', "setJobConfig(3000, 'config.process[0].train.steps');\n");
  write(
    root,
    'ui/src/app/jobs/new/jobConfig.ts',
    `export const defaultDatasetConfig = { folder_path: '/data', mask_path: null };
export const defaultJobConfig = { config: { process: [{ train: { steps: 3000 }, datasets: [defaultDatasetConfig] }] } };
`,
  );
  write(
    root,
    'ui/src/helpers/defaultSamples.ts',
    `export const defaultSampleConfig = { sample_every: 250, samples: [{ prompt: 'fixed' }] };
export const defaultAudioSampleConfig = { sample_every: 250, samples: [{ prompt: 'audio' }] };
export const defaultIdeogramSamplesConfig = { sample_every: 250, samples: [{ prompt: 'ideogram' }] };
`,
  );
  return root;
}

const source = `
const defaultPath = '';
export const modelArchs = [{
  name: 'fixture', label: 'Fixture', group: 'image', controls: ['depth'],
  isVideoModel: false, hasMultiLinePrompts: true,
  accuracyRecoveryAdapters: { '\u{10000}': 'astral.safetensors', '\uE000': 'private-use.safetensors' },
  sampleTags: { mood: { title: 'Mood', type: 'text' } },
  gateUrl: 'https://example.test/gate',
  defaults: {
    'config.process[0].model.name_or_path': ['model/repo', defaultPath],
    'config.process[0].model.empty_kwargs': [{}, {}],
    'config.process[0].model.model_kwargs': [{ nested: { enabled: true }, values: [1, undefined] }, {}],
    'config.process[0].datasets[x].fps': [24, undefined],
  },
  disableSections: ['network.conv'], additionalSections: ['datasets.control_path'],
  customModelSelectOptions: [{
    label: 'Mode', options: [{ value: 'a', label: 'Mode A' }, { value: 'b', label: 'Mode B' }],
    getValue: config => {
      const path = config?.config?.process?.[0]?.model?.assistant_lora_path;
      if (path && path.trim() !== '') return 'b';
      return 'a';
    },
    onChange: (value, config, setJobConfig) => {
      if (value === 'a') setJobConfig(undefined, 'config.process[0].model.assistant_lora_path');
      else if (value === 'b') {
        if (!config?.config?.process?.[0]?.train?.guidance_loss_target) {
          setJobConfig(3.5, 'config.process[0].train.guidance_loss_target');
        }
      }
    },
    doc: { title: 'Mode help', description: <div>Choose <code>a</code> or <a href="/guide">read this</a>.</div> },
  }],
  modelNotes: <div>Load <code>model/repo</code> from <a href="https://example.test/model">the model page</a>.</div>,
}];
`;

const root = fixtureRoot(source);
let baselineArchitecture: ReturnType<typeof collectTrainingBookUiFacts>['model_architectures'][number];
try {
  const facts = collectTrainingBookUiFacts(root);
  baselineArchitecture = facts.model_architectures[0];
  assert.equal(facts.schema_version, 1);
  assert.deepEqual(facts.model_architectures.map(item => item.name), ['fixture']);
  const architecture = facts.model_architectures[0];
  assert.deepEqual(architecture.model_path, {
    present: true,
    value: { kind: 'string', value: 'model/repo' },
  });
  assert.deepEqual(architecture.is_video_model, {
    present: true,
    value: { kind: 'boolean', value: false },
  });
  assert.deepEqual(
    architecture.accuracy_recovery_adapters.value?.kind === 'object'
      ? architecture.accuracy_recovery_adapters.value.entries.map(item => item.key)
      : [],
    ['\uE000', '\u{10000}'],
    'serialized object keys must use Python-compatible Unicode code-point order',
  );
  assert.deepEqual(architecture.defaults.map(item => item.path), [
    'config.process[*].datasets[*].fps',
    'config.process[*].model.model_kwargs.nested.enabled',
    'config.process[*].model.model_kwargs.values',
    'config.process[*].model.name_or_path',
  ]);
  assert.deepEqual(
    architecture.defaults.find(item => item.path.endsWith('.fps'))?.unselected,
    { present: true, value: { kind: 'undefined' } },
  );
  assert.deepEqual(
    architecture.defaults.find(item => item.path.endsWith('.values'))?.selected,
    {
      present: true,
      value: {
        kind: 'array',
        items: [{ kind: 'number', value: 1 }, { kind: 'undefined' }],
      },
    },
  );
  assert.deepEqual(architecture.default_containers, [
    {
      path: 'config.process[*].model.empty_kwargs',
      selected_present: true,
      unselected_present: true,
    },
    {
      path: 'config.process[*].model.model_kwargs',
      selected_present: true,
      unselected_present: true,
    },
    {
      path: 'config.process[*].model.model_kwargs.nested',
      selected_present: true,
      unselected_present: false,
    },
  ]);
  assert.deepEqual(architecture.model_notes, {
    present: true,
    text_literals: ['Load ', ' from ', 'the model page', '.'],
    code_literals: ['model/repo'],
    link_hrefs: ['https://example.test/model'],
  });
  const custom = architecture.custom_model_select_options.value?.[0];
  assert.deepEqual(custom?.get_value_cases, [
    {
      condition: {
        kind: 'and',
        operands: [
          { kind: 'truthy', path: 'config.process[*].model.assistant_lora_path' },
          { kind: 'nonblank-string', path: 'config.process[*].model.assistant_lora_path' },
        ],
      },
      return_value: { kind: 'string', value: 'b' },
    },
    { condition: { kind: 'always' }, return_value: { kind: 'string', value: 'a' } },
  ]);
  assert.deepEqual(custom?.writes, [
    {
      selected_value: 'a',
      path: 'config.process[*].model.assistant_lora_path',
      value: { kind: 'undefined' },
      guard: { kind: 'always' },
    },
    {
      selected_value: 'b',
      path: 'config.process[*].train.guidance_loss_target',
      value: { kind: 'number', value: 3.5 },
      guard: {
        kind: 'not',
        operand: { kind: 'truthy', path: 'config.process[*].train.guidance_loss_target' },
      },
    },
  ]);

  const output = join(root, 'owned', 'facts.json');
  writeTrainingBookUiFacts(root, output);
  const serialized = JSON.parse(readFileSync(output, 'utf8'));
  assert.deepEqual(serialized, facts);
  validateTrainingBookUiFacts(serialized);
  assert.throws(
    () => validateTrainingBookUiFacts({ ...serialized, extra: true }),
    /unexpected field.*extra/,
  );
  const invalidPresence = structuredClone(serialized);
  invalidPresence.model_architectures[0].gate_url = { present: true };
  assert.throws(() => validateTrainingBookUiFacts(invalidPresence), /present.*own value/);
} finally {
  rmSync(root, { recursive: true });
}

const invertedControlSource = `
export function InvertedMaskPriorControl({ train, setTrain }) {
  return <>
    <Checkbox label="Inverted Mask Prior" checked={train.inverted_mask_prior ?? false}
      onChange={value => setTrain(current => ({ ...current, inverted_mask_prior: value }))} />
    <NumberInput label="Inverted Mask Prior Multiplier" value={train.inverted_mask_prior_multiplier ?? 0.5}
      onChange={value => setTrain(current => ({ ...current, inverted_mask_prior_multiplier: value }))} min={0} />
  </>;
}
function ShadowedSibling({ train }) {
  return <Checkbox label="Unrelated" checked={train.unrelated} onChange={() => {}} />;
}
export default function SimpleJob({ jobConfig, setJobConfig }) {
  return <InvertedMaskPriorControl
    train={jobConfig.config.process[0].train}
    setTrain={update => {
      const next = typeof update === 'function' ? update(jobConfig.config.process[0].train) : update;
      setJobConfig(next.inverted_mask_prior, 'config.process[0].train.inverted_mask_prior');
      setJobConfig(next.inverted_mask_prior_multiplier, 'config.process[0].train.inverted_mask_prior_multiplier');
    }}
  />;
}
`;
const invertedRoot = fixtureRoot(source);
write(invertedRoot, 'ui/src/app/jobs/new/SimpleJob.tsx', invertedControlSource);
try {
  const invertedSettings = collectTrainingBookUiFacts(invertedRoot).config_claims.filter(item =>
    item.kind === 'setting' && item.symbol.startsWith('InvertedMaskPriorControl::'));
  assert.deepEqual(invertedSettings.map(item => item.path), [
    'config.process[*].train.inverted_mask_prior',
    'config.process[*].train.inverted_mask_prior_multiplier',
  ]);
} finally {
  rmSync(invertedRoot, { recursive: true });
}
const mutatedInvertedRoot = fixtureRoot(source);
write(mutatedInvertedRoot, 'ui/src/app/jobs/new/SimpleJob.tsx', invertedControlSource.replace(
  'train={jobConfig.config.process[0].train}',
  'train={jobConfig.config.process[0].sample}',
));
try {
  assert.throws(() => collectTrainingBookUiFacts(mutatedInvertedRoot), /train prop must bind exact training config/);
} finally {
  rmSync(mutatedInvertedRoot, { recursive: true });
}

const dynamicRoot = fixtureRoot(source.replace("[24, undefined]", "[Number.POSITIVE_INFINITY, undefined]"));
try {
  assert.throws(() => collectTrainingBookUiFacts(dynamicRoot), /finite|unsupported/);
} finally {
  rmSync(dynamicRoot, { recursive: true });
}

const unknownIndexRoot = fixtureRoot(source.replace('datasets[x].fps', 'datasets[0].fps'));
try {
  assert.throws(() => collectTrainingBookUiFacts(unknownIndexRoot), /numeric index|canonical path/);
} finally {
  rmSync(unknownIndexRoot, { recursive: true });
}

for (const [label, mutated] of [
  ['getter path', source.replaceAll('assistant_lora_path', 'unconditional_lora_path')],
  ['predicate operator', source.replace('path && path.trim()', 'path || path.trim()')],
  ['setter path', source.replace('train.guidance_loss_target', 'train.audio_loss_multiplier')],
  ['option value', source.replace("value: 'b', label: 'Mode B'", "value: 'both', label: 'Mode B'")],
  ['note href', source.replace('https://example.test/model', 'https://example.test/changed')],
] as const) {
  const mutationRoot = fixtureRoot(mutated);
  try {
    assert.notDeepEqual(
      collectTrainingBookUiFacts(mutationRoot).model_architectures[0],
      baselineArchitecture!,
      `${label} mutation must change an exact emitted fact`,
    );
  } finally {
    rmSync(mutationRoot, { recursive: true });
  }
}

const dynamicJsxRoot = fixtureRoot(source.replace(
  '<div>Load <code>model/repo</code> from',
  '<div>{renderDynamic()} Load <code>model/repo</code> from',
));
try {
  assert.throws(() => collectTrainingBookUiFacts(dynamicJsxRoot), /dynamic JSX|unsupported non-JSON-safe/);
} finally {
  rmSync(dynamicJsxRoot, { recursive: true });
}

const liveRoot = process.env.TRAINING_BOOK_REPOSITORY_ROOT;
if (liveRoot !== undefined) {
  const liveFacts = collectTrainingBookUiFacts(liveRoot);
  const liveSimpleJobSource = readFileSync(join(liveRoot, 'ui/src/app/jobs/new/SimpleJob.tsx'), 'utf8');
  validateArchitectureProjectedControlTemplates(liveSimpleJobSource, 'ui/src/app/jobs/new/SimpleJob.tsx', true, true);
  assert.throws(
    () => validateArchitectureProjectedControlTemplates(
      liveSimpleJobSource.replace('options={customOption.options}', 'options={[]}'),
      'ui/src/app/jobs/new/SimpleJob.tsx',
      true,
      true,
    ),
    /custom model option control no longer matches/,
  );
  assert.throws(
    () => validateArchitectureProjectedControlTemplates(
      liveSimpleJobSource.replaceAll(
        'config.process[0].sample.samples[${i}].prompt',
        'config.process[0].sample.samples[${i}].width',
      ),
      'ui/src/app/jobs/new/SimpleJob.tsx',
      true,
      true,
    ),
    /sample tag control must write only/,
  );
  assert.throws(
    () => validateArchitectureProjectedControlTemplates(
      liveSimpleJobSource.replaceAll('label={tag.title}', 'label={tag.otherTitle}'),
      'ui/src/app/jobs/new/SimpleJob.tsx',
      true,
      true,
    ),
    /sample tag architecture projection must have all three/,
  );
  assert.throws(
    () => collectVisibleControlClaimsFromSource(
      "const defaultCompileOptions = { block_compile: true };\n" + liveSimpleJobSource.replace(
        '[1280, 1328, 1536, 2048]',
        '[1280, 1328, 1536, 1e10000]',
      ),
      'ui/src/app/jobs/new/SimpleJob.tsx',
      'SimpleJob',
      true,
      true,
    ),
    /finite mapped numeric values must be finite/,
  );
  const manifest = JSON.parse(readFileSync(join(liveRoot, 'docs/book/book-manifest.json'), 'utf8'));
  const names = liveFacts.model_architectures.map(item => item.name);
  assert.deepEqual(names, manifest.full_architectures, 'live modelArchs order must equal the 51-architecture edition manifest');
  assert.equal(new Set(names).size, 51);
  assert.deepEqual(manifest.preset_architectures.filter((name: string) => names.includes(name)), manifest.preset_architectures);
  assert.deepEqual(manifest.focused_architectures.filter((name: string) => names.includes(name)), manifest.focused_architectures);
  assert.ok(liveFacts.defaults.some(item => item.symbol === 'defaultJobConfig'));
  assert.ok(liveFacts.defaults.some(item => item.symbol === 'defaultDatasetConfig'));
  assert.ok(liveFacts.defaults.some(item => item.symbol === 'defaultSampleConfig'));
  assert.equal(
    liveFacts.architecture_transitions.length,
    liveFacts.model_architectures.reduce((count, architecture) => count + architecture.defaults.length, 0),
  );
  const trainSteps = liveFacts.config_claims.find(item =>
    item.source_path === 'ui/src/app/jobs/new/SimpleJob.tsx' &&
    item.symbol === 'SimpleJob::NumberInput::config.process[*].train.steps::Steps' &&
    item.path === 'config.process[*].train.steps' &&
    item.kind === 'setting');
  assert.deepEqual(trainSteps, {
    source_path: 'ui/src/app/jobs/new/SimpleJob.tsx',
    symbol: 'SimpleJob::NumberInput::config.process[*].train.steps::Steps',
    path: 'config.process[*].train.steps',
    kind: 'setting',
    ui_label: { present: true, value: { kind: 'string', value: 'Steps' } },
    value_contract: {
      ui_type: 'number',
      widget_kind: 'number',
      optional: false,
      nullable: true,
      minimum: 1,
    },
  }, 'NumberInput accepts any finite number even though the Python parser requires an integer');
  const settingClaims = liveFacts.config_claims.filter(item => item.kind === 'setting');
  assert.equal(settingClaims.length, 172, 'every current directly bound or architecture-projected config control must emit');
  assert.ok(settingClaims.every(item => item.ui_label.present), 'all current visible config controls must resolve an exact label');
  assert.deepEqual(
    settingClaims
      .filter(item => item.path === 'config.process[*].datasets[*].resolution')
      .map(item => item.ui_label.value?.kind === 'string' ? item.ui_label.value.value : null),
    ['1024', '1280', '1328', '1536', '2048', '256', '512', '768'],
    'finite nested resolution maps must expand to exact labels',
  );
  assert.equal(liveFacts.global_settings.length, 91);
  assert.deepEqual(
    liveFacts.global_settings
      .filter(item => item.source_path === 'ui/src/app/settings/page.tsx')
      .map(item => [item.path, item.value_contract.ui_type, item.value_contract.widget_kind]),
    [
      ['settings.DATASETS_FOLDER', 'path', 'text'],
      ['settings.HF_TOKEN', 'string', 'text'],
      ['settings.MODELS_PATH', 'path', 'text'],
      ['settings.TRAINING_FOLDER', 'path', 'text'],
    ],
    'path-valued settings remain native text widgets',
  );
  for (const [path, before, after, message] of [
    [
      'ui/src/app/layout.tsx',
      'process.env.AI_TOOLKIT_AUTH ? true : false',
      'false',
      /RootLayout::process.env.AI_TOOLKIT_AUTH/,
    ],
    [
      'ui/src/utils/api.ts',
      "localStorage.removeItem('AI_TOOLKIT_AUTH')",
      "localStorage.setItem('AI_TOOLKIT_AUTH', '')",
      /apiClient.response::localStorage.removeItem/,
    ],
    [
      'ui/src/utils/callScript.ts',
      "headers['Authorization'] = `Bearer ${token}`",
      "headers['X-Token'] = token",
      /callScriptStream::Authorization.bearer/,
    ],
    [
      'ui/src/app/settings/page.tsx',
      'name="HF_TOKEN"',
      'name="OTHER_TOKEN"',
      /HF_TOKEN control/,
    ],
    [
      'ui/cron/actions/processQueue.ts',
      'data: { is_running: false }',
      'data: { is_running: true }',
      /processQueue::queue.is_running/,
    ],
  ] as const) {
    const sourceText = readFileSync(join(liveRoot, path), 'utf8');
    assert.throws(
      () => collectDeclaredServerGlobalClaimsFromSource(
        path,
        sourceText.replace(before, after),
      ),
      message,
    );
  }
  assert.deepEqual(
    settingClaims
      .filter(item => item.symbol.startsWith('InvertedMaskPriorControl::'))
      .map(item => item.path),
    [
      'config.process[*].train.inverted_mask_prior',
      'config.process[*].train.inverted_mask_prior_multiplier',
    ],
    'extracted controls must retain exact use-site config bindings',
  );
  assert.deepEqual(
    [...new Set(liveFacts.global_settings.map(item => item.source_path))].sort(),
    [
      'ui/cron/actions/processQueue.ts',
      'ui/cron/actions/startJob.ts',
      'ui/cron/fileServer.ts',
      'ui/cron/paths.ts',
      'ui/cron/worker.ts',
      'ui/src/app/api/jobs/[jobID]/mark_stopped/route.ts',
      'ui/src/app/api/jobs/[jobID]/sample_now/route.ts',
      'ui/src/app/api/jobs/[jobID]/save_now/route.ts',
      'ui/src/app/api/jobs/[jobID]/start/route.ts',
      'ui/src/app/api/jobs/[jobID]/stop/route.ts',
      'ui/src/app/api/jobs/route.ts',
      'ui/src/app/api/ostris_cloud/route.ts',
      'ui/src/app/api/queue/[queueID]/start/route.ts',
      'ui/src/app/api/queue/[queueID]/stop/route.ts',
      'ui/src/app/api/settings/route.ts',
      'ui/src/app/jobs/new/SimpleJob.tsx',
      'ui/src/app/jobs/new/page.tsx',
      'ui/src/app/layout.tsx',
      'ui/src/app/settings/page.tsx',
      'ui/src/components/AuthWrapper.tsx',
      'ui/src/components/Sidebar.tsx',
      'ui/src/components/ThemeProvider.tsx',
      'ui/src/hooks/useSettings.tsx',
      'ui/src/middleware.ts',
      'ui/src/server/prisma.ts',
      'ui/src/server/settings.ts',
      'ui/src/utils/api.ts',
      'ui/src/utils/callScript.ts',
    ],
    'every concrete server/global settings boundary must emit',
  );
  for (const identity of [
    'RootLayout::process.env.AI_TOOLKIT_AUTH',
    'Sidebar::process.env.NEXT_PUBLIC_APP_VERSION',
    'middleware::Authorization.bearer',
    'apiClient.response::localStorage.removeItem(AI_TOOLKIT_AUTH)',
    'callScriptStream::Authorization.bearer',
    'Settings::input::settings.HF_TOKEN::Hugging Face Token',
    'processQueue::queue.is_running',
    'startJob::job.status',
  ]) {
    assert.ok(
      liveFacts.global_settings.some(item => item.symbol === identity),
      `missing exact server/global fact ${identity}`,
    );
  }
  const modelArchitectureClaim = settingClaims.find(item => item.path === 'config.process[*].model.arch');
  assert.equal(modelArchitectureClaim?.value_contract.accepted_values?.length, 51);
  const textEncoderQuantization = settingClaims.find(item => item.path === 'config.process[*].model.qtype_te');
  assert.equal(textEncoderQuantization?.value_contract.accepted_values?.length, 18);
  const transformerQuantization = settingClaims.filter(item => item.path === 'config.process[*].model.qtype');
  assert.equal(transformerQuantization.length, 49, 'architectures hiding model.quantize must not emit a Transformer control');
  assert.ok(transformerQuantization.every(item =>
    item.value_contract.accepted_values?.every(value => value.kind !== 'string' || value.value !== '')),
  'empty Transformer selection writes the default qtype, not an empty string');
  const lokrFactor = settingClaims.find(item => item.path === 'config.process[*].network.lokr_factor');
  assert.equal(lokrFactor?.value_contract.ui_type, 'integer');
  assert.deepEqual(lokrFactor?.value_contract.accepted_values, [-1, 4, 8, 16, 32].map(value => ({ kind: 'number', value })));
  const validationSigmas = settingClaims.find(item => item.path === 'config.process[*].train.validation_config.validation_sigmas');
  assert.equal(validationSigmas?.value_contract.ui_type, 'number-list');
  assert.ok(validationSigmas?.value_contract.accepted_values?.every(value => value.kind === 'array'));
  const controlDataset = settingClaims.find(item => item.path === 'config.process[*].datasets[*].control_path');
  assert.equal(controlDataset?.value_contract.ui_type, 'string');
  assert.equal(controlDataset?.value_contract.nullable, true);
  const sampleWidth = settingClaims.find(item => item.path === 'config.process[*].sample.samples[*].width');
  assert.equal(sampleWidth?.value_contract.ui_type, 'integer');
  assert.equal(sampleWidth?.value_contract.widget_kind, 'text');
  assert.ok(settingClaims.filter(item => item.path === 'config.process[*].datasets[*].resolution').every(item =>
    item.value_contract.ui_type === 'integer-list'));
  for (const architecture of liveFacts.model_architectures) {
    const transformer = transformerQuantization.find(item => item.symbol.endsWith(`::architecture=${architecture.name}`));
    if (architecture.disable_sections.includes('model.quantize')) {
      assert.equal(transformer, undefined);
    } else {
      assert.ok(transformer?.value_contract.accepted_values !== undefined);
      if (architecture.accuracy_recovery_adapters.present && architecture.accuracy_recovery_adapters.value?.kind === 'object') {
        for (const adapter of architecture.accuracy_recovery_adapters.value.entries) {
          assert.ok(
            transformer.value_contract.accepted_values.some(value => JSON.stringify(value) === JSON.stringify(adapter.value)),
            `${architecture.name} Transformer choices must include ${adapter.key}`,
          );
        }
      }
    }
    if (architecture.sample_tags.present && architecture.sample_tags.value?.kind === 'object') {
      for (const tag of architecture.sample_tags.value.entries) {
        assert.ok(
          settingClaims.some(item => item.symbol.includes(`::architecture=${architecture.name}::tag=${tag.key}`)),
          `${architecture.name}.${tag.key} sample-tag control must be backed by its architecture projection`,
        );
      }
    }
    if (architecture.custom_model_select_options.present) {
      for (const option of architecture.custom_model_select_options.value ?? []) {
        const projected = settingClaims.filter(item => item.symbol.includes(`::${option.label}::architecture=${architecture.name}`));
        assert.ok(projected.length > 0, `${architecture.name}.${option.label} custom selector must emit projected source facts`);
        for (const item of projected) {
          const writes = option.writes.filter(write => write.path === item.path).map(write => write.value);
          assert.ok(writes.length > 0);
          assert.ok(writes.every(value =>
            value.kind === 'undefined' || value.kind === item.value_contract.ui_type ||
            (value.kind === 'number' && ['integer', 'number'].includes(String(item.value_contract.ui_type))),
          ));
        }
      }
    }
  }
  for (const architecture of liveFacts.model_architectures) {
    for (const key of ['is_video_model', 'has_multiline_prompts', 'accuracy_recovery_adapters', 'sample_tags'] as const) {
      assert.equal(typeof architecture[key].present, 'boolean', `${architecture.name}.${key} must emit presence`);
    }
    assert.ok(architecture.model_path.present, `${architecture.name} must emit its selected model path`);
  }
}

console.log('trainingBookUiFacts tests passed');
