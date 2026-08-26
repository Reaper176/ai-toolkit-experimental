import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defaultAudioSampleConfig, defaultIdeogramSamplesConfig, defaultSampleConfig } from '@/helpers/defaultSamples';
import { defaultDatasetConfig, defaultJobConfig } from '@/app/jobs/new/jobConfig';
import { modelArchs as runtimeModelArchs } from '@/app/jobs/new/options';
import type { ModelArch } from '@/app/jobs/new/options';
import type { JobConfig } from '@/types';

import {
  collectTrainingBookUiFacts,
  collectCanonicalSetterPathsFromSource,
  collectDeclaredServerGlobalClaimsFromSource,
  collectDeclaredTypeScriptSourcePaths,
  collectHandleModelArchChangeBehaviorClaimsFromSource,
  collectMigrateJobConfigBehaviorClaimsFromSource,
  collectVisibleControlClaimsFromSource,
  normalizeTrainingBookPath,
  validateTrainingBookUiFacts,
  validateArchitectureProjectedControlTemplates,
  writeTrainingBookUiFacts,
} from './trainingBookFacts';
import type { CustomModelSelectOptionFact, ModelOptionPredicateFact, StaticJsxFact, TrainingBookValueFact, UiDefaultFact } from './trainingBookFacts';

const structuralServerFacts = collectDeclaredServerGlobalClaimsFromSource(
  'ui/src/example.ts',
  `
    function Example() {
      const first = process.env.EXAMPLE_DOT;
      const second = process.env['EXAMPLE_BRACKET'];
      const saved = localStorage.getItem('panel');
      localStorage.setItem('panel', saved || 'open');
      sessionStorage.removeItem('draft');
      headers['Authorization'] = \`Bearer \${token}\`;
      if (error.response.status === 401) isAuthorizedState.set(false);
    }
  `,
);
assert.deepEqual(
  structuralServerFacts.map(item => [item.symbol, item.path, item.value_contract.ui_type]),
  [
    ['Example::Authorization.bearer', 'http.Authorization', 'string'],
    ['Example::localStorage.getItem(panel)', 'browser.localStorage.panel', 'string'],
    ['Example::localStorage.setItem(panel)', 'browser.localStorage.panel', 'string'],
    ['Example::process.env.EXAMPLE_BRACKET', 'EXAMPLE_BRACKET', 'string'],
    ['Example::process.env.EXAMPLE_DOT', 'EXAMPLE_DOT', 'string'],
    ['Example::sessionStorage.removeItem(draft)', 'browser.sessionStorage.draft', 'string'],
    ['Example::status=401', 'auth.is_authorized', 'boolean'],
  ],
  'executable environment, persistence, and authorization boundaries are discovered structurally',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/empty.ts', `
    // process.env.COMMENT_ONLY
    const inert = "localStorage.getItem('STRING_ONLY')";
    if (false) {
      process.env.DEAD_ENV;
      localStorage.setItem('DEAD_STORAGE', 'x');
    }
    false && process.env.DEAD_AND;
    true || process.env.DEAD_OR;
    const selected = false ? process.env.DEAD_CONDITIONAL : 'live';
    function afterReturn() {
      return;
      process.env.DEAD_AFTER_RETURN;
    }
    function afterThrow() {
      throw new Error('stop');
      sessionStorage.setItem('DEAD_AFTER_THROW', 'x');
    }
    if (0) process.env.DEAD_NUMERIC_IF;
    while (0) process.env.DEAD_NUMERIC_WHILE;
    0 && process.env.DEAD_NUMERIC_AND;
    for (; false;) process.env.DEAD_FOR;
    while (unknown) {
      continue;
      process.env.DEAD_AFTER_CONTINUE;
    }
    while (unknown) {
      break;
      process.env.DEAD_AFTER_BREAK;
    }
    switch (mode) {
      case 'return':
        return;
        process.env.DEAD_SWITCH_RETURN;
      case 'break':
        break;
        process.env.DEAD_SWITCH_BREAK;
    }
    function afterTryReturn() {
      try { return; } finally {}
      process.env.DEAD_AFTER_TRY_RETURN;
    }
    function afterFinallyReturn() {
      try {} finally { return; }
      process.env.DEAD_AFTER_FINALLY_RETURN;
    }
    function afterProvenNonThrowingReturn() {
      try { 1; if (false) mayThrow(); return; } catch {}
      process.env.DEAD_AFTER_PROVEN_NON_THROWING_RETURN;
    }
  `),
  [],
  'comments, inert strings, and statically dead branches cannot satisfy structural discovery',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/unknown.ts',
    `if (unknownCondition) process.env.UNKNOWN_CONDITION_SETTING;`,
  ).map(item => item.path),
  ['UNKNOWN_CONDITION_SETTING'],
  'unknown conditions remain conservatively discoverable',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/conservative-try.ts', `
    function caughtThrow() {
      try { throw new Error('caught'); } catch {}
      process.env.LIVE_AFTER_CATCH;
    }
    function unknownTry(flag) {
      try { if (flag) return; } finally {}
      process.env.LIVE_AFTER_UNKNOWN_TRY;
    }
    function unknownFinally(flag) {
      try {} finally { if (flag) return; }
      process.env.LIVE_AFTER_UNKNOWN_FINALLY;
    }
    function maybeCaughtBeforeReturn(flag) {
      try { if (flag) throw new Error('caught'); return; } catch {}
      process.env.LIVE_AFTER_POSSIBLE_CATCH;
    }
    function caughtReturnCall() {
      try { return mayThrow(); } catch {}
      process.env.LIVE_AFTER_CAUGHT_RETURN_CALL;
    }
    function caughtCallBeforeReturn() {
      try { mayThrow(); return; } catch {}
      process.env.LIVE_AFTER_CAUGHT_CALL_BEFORE_RETURN;
    }
    function caughtGetter(object) {
      try { return object.maybeGetter; } catch {}
      process.env.LIVE_AFTER_CAUGHT_GETTER;
    }
    function caughtElementAccess(object, key) {
      try { return object[key]; } catch {}
      process.env.LIVE_AFTER_CAUGHT_ELEMENT_ACCESS;
    }
    function caughtNullDereference() {
      try { return null.missing; } catch {}
      process.env.LIVE_AFTER_CAUGHT_NULL_DEREFERENCE;
    }
    function caughtObjectDestructureNull() {
      try { const { x } = null; return; } catch {}
      process.env.LIVE_AFTER_CAUGHT_OBJECT_DESTRUCTURE_NULL;
    }
    function caughtArrayDestructureNull() {
      try { const [x] = null; return; } catch {}
      process.env.LIVE_AFTER_CAUGHT_ARRAY_DESTRUCTURE_NULL;
    }
    function caughtDefaultDestructure() {
      try { const { x = mayThrow() } = {}; return; } catch {}
      process.env.LIVE_AFTER_CAUGHT_DEFAULT_DESTRUCTURE;
    }
    function caughtGetterDestructure() {
      try { const { x } = { get x() { throw new Error('getter'); } }; return; } catch {}
      process.env.LIVE_AFTER_CAUGHT_GETTER_DESTRUCTURE;
    }
    function caughtUsing() {
      try { using x = {}; return; } catch {}
      process.env.LIVE_AFTER_CAUGHT_USING;
    }
    async function caughtAwaitUsing() {
      try { await using x = {}; return; } catch {}
      process.env.LIVE_AFTER_CAUGHT_AWAIT_USING;
    }
  `).map(item => item.path),
  [
    'LIVE_AFTER_CAUGHT_ARRAY_DESTRUCTURE_NULL',
    'LIVE_AFTER_CAUGHT_AWAIT_USING',
    'LIVE_AFTER_CAUGHT_CALL_BEFORE_RETURN',
    'LIVE_AFTER_CAUGHT_DEFAULT_DESTRUCTURE',
    'LIVE_AFTER_CAUGHT_ELEMENT_ACCESS',
    'LIVE_AFTER_CAUGHT_GETTER',
    'LIVE_AFTER_CAUGHT_GETTER_DESTRUCTURE',
    'LIVE_AFTER_CAUGHT_NULL_DEREFERENCE',
    'LIVE_AFTER_CAUGHT_OBJECT_DESTRUCTURE_NULL',
    'LIVE_AFTER_CAUGHT_RETURN_CALL',
    'LIVE_AFTER_CATCH',
    'LIVE_AFTER_CAUGHT_USING',
    'LIVE_AFTER_POSSIBLE_CATCH',
    'LIVE_AFTER_UNKNOWN_FINALLY',
    'LIVE_AFTER_UNKNOWN_TRY',
  ],
  'catch and unknown try/finally paths remain conservatively discoverable',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/finite-keys.ts', `
    const ENV_KEY = 'FINITE_ENV';
    const STORAGE_KEY = 'finite-storage';
    process.env[ENV_KEY];
    localStorage.getItem(STORAGE_KEY);
  `).map(item => item.path),
  ['browser.localStorage.finite-storage', 'FINITE_ENV'],
  'finite lexical environment and storage keys resolve exactly',
);
for (const [label, source] of [
  ['environment', `function dynamic(key: string) { return process.env[key]; }`],
  ['local storage', `function dynamic(key: string) { return localStorage.getItem(key); }`],
  ['session storage', `function dynamic(key: string) { sessionStorage.removeItem(key); }`],
] as const) {
  assert.throws(
    () => collectDeclaredServerGlobalClaimsFromSource('ui/src/dynamic-key.ts', source),
    /dynamic .* key cannot be resolved to one finite string/,
    `${label} dynamic keys fail closed`,
  );
}
const persistedDynamicSource = `
  interface PersistedSettings { alpha: boolean; beta: number; }
  function settingsStorageKey() {
    if (typeof window === 'undefined') return null;
    return \`jobLossGraph:\${window.location.pathname}\${window.location.search}\`;
  }
  function load() {
    const key = settingsStorageKey();
    const raw = localStorage.getItem(key);
    const saved = JSON.parse(raw) as Partial<PersistedSettings>;
    saved.alpha;
    saved.beta;
  }
`;
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/persisted.ts', persistedDynamicSource)
    .map(item => [item.symbol, item.path]),
  [
    ['load::hydrate::alpha', 'browser.localStorage.jobLossGraph.alpha'],
    ['load::hydrate::beta', 'browser.localStorage.jobLossGraph.beta'],
  ],
  'a specialized runtime URL storage key is admitted only through its exact parsed persisted-settings structure',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/persisted.ts',
    persistedDynamicSource.replace('    saved.beta;\n', ''),
  ).map(item => item.path),
  ['browser.localStorage.jobLossGraph.alpha'],
  'removing one persisted field read removes that exact hydrate fact',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource('ui/src/fake-persisted.ts', `
    interface PersistedSettings { alpha: boolean; }
    function load(key: string) {
      const raw = localStorage.getItem(key);
      const saved = JSON.parse(raw) as Partial<PersistedSettings>;
      saved.alpha;
    }
  `),
  /dynamic storage key cannot be resolved to one finite string/,
  'a matching interface cannot bypass dynamic storage-key rejection',
);
for (const [label, mutation] of [
  [
    'shadowed helper',
    persistedDynamicSource.replace(
      '  function load() {',
      "  function load() { function settingsStorageKey() { return 'arbitrary'; }",
    ),
  ],
  [
    'rebound helper',
    persistedDynamicSource.replace(
      '    const key = settingsStorageKey();',
      "    settingsStorageKey = () => 'arbitrary';\n    const key = settingsStorageKey();",
    ),
  ],
  [
    'mixed helper return',
    persistedDynamicSource.replace(
      "    if (typeof window === 'undefined') return null;",
      "    if (typeof window === 'undefined') return null;\n    if (unknown) return 'arbitrary';",
    ),
  ],
] as const) {
  assert.throws(
    () => collectDeclaredServerGlobalClaimsFromSource('ui/src/persisted-review.ts', mutation),
    /dynamic storage key cannot be resolved to one finite string/,
    `${label} cannot authorize the specialized runtime storage key`,
  );
}
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/persisted-sibling.ts', persistedDynamicSource.replace(
    '  function load() {',
    "  function unrelated() { return 'arbitrary'; }\n  function load() { if (false) { function settingsStorageKey() { return 'arbitrary'; } }",
  )).filter(item => item.path.includes('jobLossGraph')).map(item => item.path),
  ['browser.localStorage.jobLossGraph.alpha', 'browser.localStorage.jobLossGraph.beta'],
  'an unrelated sibling and dead shadow branch do not leak into exact helper binding',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource('ui/src/persisted-unknown-branch.ts', persistedDynamicSource.replace(
    "    if (typeof window === 'undefined') return null;",
    "    if (typeof window === 'undefined') return null;\n    if (unknown) return 'arbitrary';",
  )),
  /dynamic storage key cannot be resolved to one finite string/,
  'an arbitrary return behind an unknown branch is conservatively rejected',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource('ui/src/persisted-fallthrough.ts', persistedDynamicSource.replace(
    '    return `jobLossGraph:${window.location.pathname}${window.location.search}`;',
    '    if (unknown) return `jobLossGraph:${window.location.pathname}${window.location.search}`;',
  )),
  /dynamic storage key cannot be resolved to one finite string/,
  'an exact URL return on only one branch cannot authorize implicit helper fallthrough',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/environment-spread.ts', `
    function copyEnvironment() { return { ...process.env }; }
  `).map(item => [item.symbol, item.path, item.value_contract.ui_type]),
  [['copyEnvironment::process.env.pass-through', 'process.env.inherited', 'object']],
  'a general process environment spread emits an exact pass-through effect',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/spawn-spread.ts', `
    function launch() { spawn('tool', [], { env: { ...process.env } }); }
  `).map(item => item.path),
  ['spawn.env.inherited'],
  'a spawn environment spread emits only its distinct spawn pass-through contract',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/example.ts',
    'function Example() { return process.env.NEW_SETTING_KEY; }',
  ).map(item => item.path),
  ['NEW_SETTING_KEY'],
  'a new executable environment key becomes a distinct emitted fact',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/server/example.ts', `
    async function loadCustomSetting() {
      const key = 'CUSTOM_ROOT';
      return prisma.settings.findFirst({ where: { key } });
    }
  `).map(item => [item.symbol, item.path, item.value_contract.ui_type]),
  [['loadCustomSetting::settings.CUSTOM_ROOT', 'settings.CUSTOM_ROOT', 'path']],
  'a new executable database settings key is discovered from its lexical binding',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/cron/actions/startJob.ts', `
    import { getHFToken } from '../paths';
    async function launch() { return getHFToken(); }
    export default async function startJob() { return launch(); }
  `).map(item => [item.symbol, item.path]),
  [['startJob::settings.HF_TOKEN', 'settings.HF_TOKEN']],
  'an imported settings getter is attributed to the public cron operation',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/server/example.ts', `
    async function mutateState() {
      await prisma.job.update({ data: { status: 'queued', stop: false, pid: null } });
      await transaction.queue.update({ data: { is_running: true } });
    }
  `).map(item => [item.symbol, item.path, item.value_contract.ui_type, item.value_contract.accepted_values]),
  [
    ['mutateState::job.pid', 'job.pid', 'integer', undefined],
    ['mutateState::job.status', 'job.status', 'string', [{ kind: 'string', value: 'queued' }]],
    ['mutateState::job.stop', 'job.stop', 'boolean', [{ kind: 'boolean', value: false }]],
    ['mutateState::queue.is_running', 'queue.is_running', 'boolean', [{ kind: 'boolean', value: true }]],
  ],
  'server-owned job and queue writes emit exact typed state facts',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/app/jobs/new/example.ts', `
    function importConfig(parsed, settings, setJobConfig) {
      parsed.config.process[0].training_folder = settings.TRAINING_FOLDER;
      setJobConfig(settings.TRAINING_FOLDER, 'config.process[0].training_folder');
    }
  `).map(item => [item.symbol, item.path, item.value_contract.ui_type]),
  [
    ['importConfig::import::config.process[*].training_folder', 'config.process[*].training_folder', 'path'],
    ['importConfig::settings.TRAINING_FOLDER', 'settings.TRAINING_FOLDER', 'path'],
    ['importConfig::settings.TRAINING_FOLDER::role=settings-property-read/arg:setJobConfig[0]', 'settings.TRAINING_FOLDER', 'path'],
    ['importConfig::settings.TRAINING_FOLDER::role=settings-property-read/rhs:parsed.config.process[*].training_folder', 'settings.TRAINING_FOLDER', 'path'],
    ['importConfig::settings::config.process[*].training_folder', 'config.process[*].training_folder', 'path'],
  ],
  'config import overrides and settings-mediated setters are structural facts',
);
const settingsInputSource = `
  import useSettings from '@/hooks/useSettings';
  function Settings() {
    const { settings, setSettings } = useSettings();
    const setOther = value => value;
    const handleChange = event => {
      const { name, value } = event.target;
      setSettings(previous => ({ ...previous, [name]: value }));
    };
    const handleSubmit = event => event.preventDefault();
    return <form>
      <label htmlFor="HF_TOKEN">Hugging Face Token</label>
      <input id="HF_TOKEN" name="HF_TOKEN" type="password" value={settings.HF_TOKEN} onChange={handleChange} />
    </form>;
  }
`;
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/app/settings/page.tsx', settingsInputSource)
    .filter(item => item.kind === 'setting')
    .map(item => [item.symbol, item.path, item.ui_label.value]),
  [[
    'Settings::input::settings.HF_TOKEN::Hugging Face Token',
    'settings.HF_TOKEN',
    { kind: 'string', value: 'Hugging Face Token' },
  ]],
  'settings inputs are discovered from exact JSX bindings and their associated label',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/app/settings/page.tsx', `
    // <input name="HF_TOKEN" value={settings.HF_TOKEN} onChange={handleChange} />
    const inert = '<label htmlFor="HF_TOKEN">Hugging Face Token</label>';
  `),
  [],
  'comments and strings cannot masquerade as settings JSX controls',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/app/settings/page.tsx',
    settingsInputSource.replace('name="HF_TOKEN"', 'name="OTHER_TOKEN"'),
  ),
  /settings input name must match its bound key/,
  'a partially matching settings control fails closed',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/app/settings/page.tsx',
    settingsInputSource.replace('onChange={handleChange}', 'onChange={handleSubmit}'),
  ),
  /settings input onChange must update settings from the bound input/,
  'a settings input cannot bind an unrelated declared handler',
);
for (const [label, source] of [
  ['sibling setter', settingsInputSource.replace('setSettings(previous =>', 'setOther(previous =>')],
  ['shadowed setter', settingsInputSource.replace('      const { name, value } = event.target;', '      const { name, value } = event.target;\n      const setSettings = setOther;')],
  ['rebound setter', settingsInputSource.replace('      const { name, value } = event.target;', '      const { name, value } = event.target;\n      setSettings = setOther;')],
] as const) {
  assert.throws(
    () => collectDeclaredServerGlobalClaimsFromSource('ui/src/app/settings/page.tsx', source),
    /settings input onChange must update settings from the bound input/,
    `a ${label} cannot satisfy the settings state owner`,
  );
}
for (const [label, handlerBody] of [
  [
    'statically dead exact setter',
    `
      const { name, value } = event.target;
      if (false) setSettings(previous => ({ ...previous, [name]: value }));
      setOther(previous => ({ ...previous, [name]: value }));
    `,
  ],
  [
    'nested uninvoked exact setter',
    `
      const { name, value } = event.target;
      function neverCalled() { setSettings(previous => ({ ...previous, [name]: value })); }
      setOther(previous => ({ ...previous, [name]: value }));
    `,
  ],
] as const) {
  assert.throws(
    () => collectDeclaredServerGlobalClaimsFromSource(
      'ui/src/app/settings/page.tsx',
      settingsInputSource.replace(
        `
      const { name, value } = event.target;
      setSettings(previous => ({ ...previous, [name]: value }));
    `,
        handlerBody,
      ),
    ),
    /settings input onChange must update settings from the bound input/,
    `a ${label} cannot mask the live wrong settings setter`,
  );
}
const authInputSource = `
  import { useState } from 'react';
  function AuthWrapper() {
    const [token, setToken] = useState('');
    function handleSubmit() { localStorage.setItem('AI_TOOLKIT_AUTH', token); }
    return <form><label htmlFor="token">Password</label><input id="token" name="token" type="password"
      value={token} onChange={event => setToken(event.target.value)} /></form>;
  }
`;
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/components/AuthWrapper.tsx', authInputSource)
    .filter(item => item.kind === 'setting')
    .map(item => [item.symbol, item.path]),
  [['AuthWrapper::input::browser.localStorage.AI_TOOLKIT_AUTH::Password', 'browser.localStorage.AI_TOOLKIT_AUTH']],
  'the authentication input is joined structurally to its persisted token binding',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/components/AuthWrapper.tsx',
    authInputSource.replace('setToken(event.target.value)', 'setOtherToken(event.target.value)'),
  ),
  /persisted input onChange must update its exact state binding/,
  'a persisted input cannot update a different state setter',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/components/AuthWrapper.tsx',
    authInputSource.replace(
      'onChange={event => setToken(event.target.value)}',
      'onChange={event => { const setToken = setOtherToken; setToken(event.target.value); }}',
    ),
  ),
  /persisted input onChange must update its exact state binding/,
  'a shadowed authentication setter cannot satisfy the React state owner',
);
for (const [label, replacement] of [
  [
    'statically dead exact authentication setter',
    'onChange={event => { if (false) setToken(event.target.value); setOtherToken(event.target.value); }}',
  ],
  [
    'nested uninvoked exact authentication setter',
    'onChange={event => { function neverCalled() { setToken(event.target.value); } setOtherToken(event.target.value); }}',
  ],
] as const) {
  assert.throws(
    () => collectDeclaredServerGlobalClaimsFromSource(
      'ui/src/components/AuthWrapper.tsx',
      authInputSource.replace('onChange={event => setToken(event.target.value)}', replacement),
    ),
    /persisted input onChange must update its exact state binding/,
    `${label} cannot mask the live wrong authentication setter`,
  );
}
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/components/AuthWrapper.tsx', `
    // localStorage.setItem('AI_TOOLKIT_AUTH', token)
    const inert = '<input name="token" type="password" value={token} />';
  `),
  [],
  'comments and strings cannot masquerade as the authentication control',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/hooks/useSettings.tsx', `
    export default function useSettings() {
      useEffect(() => apiClient.get('/api/settings').then(res => res.data).then(data => {
        setSettings({
          HF_TOKEN: data.HF_TOKEN || '',
          MODELS_PATH: data.MODELS_PATH || '',
        });
      }), []);
    }
  `).map(item => [item.symbol, item.path, item.value_contract.ui_type]),
  [
    ['useSettings::hydrate::settings.HF_TOKEN', 'settings.HF_TOKEN', 'string'],
    ['useSettings::hydrate::settings.MODELS_PATH', 'settings.MODELS_PATH', 'path'],
  ],
  'settings hydration is derived from the executable response-to-state object',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/app/api/jobs/route.ts', `
    export async function POST(request: Request) {
      const body = await request.json();
      const gpu_ids = resolveGpuIds(body.gpu_ids, isMac());
      return saveJob({ gpu_ids });
    }
  `).map(item => [item.symbol, item.path, item.value_contract.ui_type]),
  [['POST::gpuids', 'gpuids', 'string']],
  'a resolved GPU selection passed into the job save operation emits structurally',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/app/api/jobs/[jobID]/start/route.ts', `
    export async function GET() {
      const mutateQueue = async () => {
        await prisma.job.update({ data: { status: 'queued', stop: false } });
      };
      await mutateQueue();
    }
  `).map(item => item.symbol),
  ['GET::mutateQueue::job.status', 'GET::mutateQueue::job.stop'],
  'nested route helpers retain their lexical operation beneath the exported route',
);
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/utils/api.ts', `
    apiClient.interceptors.request.use(config => {
      const token = localStorage.getItem('AI_TOOLKIT_AUTH');
      config.headers.Authorization = \`Bearer \${token}\`;
      return config;
    });
    apiClient.interceptors.response.use(response => response, error => {
      if (error.response.status === 401) localStorage.removeItem('AI_TOOLKIT_AUTH');
    });
  `).map(item => item.symbol),
  [
    'apiClient.request::Authorization.bearer',
    'apiClient.request::localStorage.getItem(AI_TOOLKIT_AUTH)',
    'apiClient.response::localStorage.removeItem(AI_TOOLKIT_AUTH)',
    'apiClient.response::status=401',
  ],
  'interceptor callbacks are named from their executable request/response registration',
);
for (const [category, source, removed] of [
  ['environment', `function duplicate() { function primary() { process.env.SAME_KEY; } function fallback() { process.env.SAME_KEY; } }`, `function duplicate() { function primary() { process.env.SAME_KEY; } }`],
  ['storage', `function duplicate() { function hydrate() { localStorage.getItem('same'); } function refresh() { localStorage.getItem('same'); } }`, `function duplicate() { function hydrate() { localStorage.getItem('same'); } }`],
  ['authorization', `function duplicate() { function primary() { headers.Authorization = \`Bearer \${one}\`; } function retry() { headers.Authorization = \`Bearer \${two}\`; } }`, `function duplicate() { function primary() { headers.Authorization = \`Bearer \${one}\`; } }`],
  ['settings', `async function duplicate() { async function primary() { await prisma.settings.findFirst({ where: { key: 'SAME_KEY' } }); } async function fallback() { await prisma.settings.findFirst({ where: { key: 'SAME_KEY' } }); } }`, `async function duplicate() { async function primary() { await prisma.settings.findFirst({ where: { key: 'SAME_KEY' } }); } }`],
  ['job state', `async function duplicate() { async function claim() { await prisma.job.update({ data: { status: 'queued' } }); } async function retry() { await prisma.job.update({ data: { status: 'queued' } }); } }`, `async function duplicate() { async function claim() { await prisma.job.update({ data: { status: 'queued' } }); } }`],
] as const) {
  assert.notDeepEqual(
    collectDeclaredServerGlobalClaimsFromSource('ui/src/duplicate.ts', source),
    collectDeclaredServerGlobalClaimsFromSource('ui/src/duplicate.ts', removed),
    `removing one executable duplicate ${category} occurrence must change emitted facts`,
  );
}
assert.deepEqual(
  collectDeclaredServerGlobalClaimsFromSource('ui/src/reordered.ts', `
    function owner() {
      function first() { process.env.SAME_KEY; }
      function second() { process.env.SAME_KEY; }
    }
  `),
  collectDeclaredServerGlobalClaimsFromSource('ui/src/reordered.ts', `
    function owner() {
      function second() { process.env.SAME_KEY; }
      function first() { process.env.SAME_KEY; }
    }
  `),
  'semantic sibling identities do not leak across nested functions or depend on source order',
);
assert.throws(
  () => collectDeclaredServerGlobalClaimsFromSource(
    'ui/src/ambiguous.ts',
    `function ambiguous() { process.env.SAME_KEY; process.env.SAME_KEY; }`,
  ),
  /indistinguishable duplicate structural fact/,
  'same-role duplicate occurrences fail closed instead of being silently collapsed or numbered',
);

const modelArchProjectionBoundary = {
  name: true,
  label: true,
  group: true,
  controls: true,
  isVideoModel: true,
  hasMultiLinePrompts: true,
  defaults: true,
  disableSections: true,
  additionalSections: true,
  accuracyRecoveryAdapters: true,
  sampleTags: true,
  gateUrl: true,
  modelNotes: true,
  customModelSelectOptions: true,
} satisfies Record<keyof ModelArch, true>;
assert.deepEqual(Object.keys(modelArchProjectionBoundary).sort(), [
  'accuracyRecoveryAdapters',
  'additionalSections',
  'controls',
  'customModelSelectOptions',
  'defaults',
  'disableSections',
  'gateUrl',
  'group',
  'hasMultiLinePrompts',
  'isVideoModel',
  'label',
  'modelNotes',
  'name',
  'sampleTags',
]);

const compareCodePoint = (left: string, right: string): number => {
  const leftPoints = Array.from(left, character => character.codePointAt(0)!);
  const rightPoints = Array.from(right, character => character.codePointAt(0)!);
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] < rightPoints[index] ? -1 : 1;
  }
  return leftPoints.length < rightPoints.length ? -1 : leftPoints.length > rightPoints.length ? 1 : 0;
};

function runtimeValue(value: unknown): TrainingBookValueFact {
  if (value === undefined) return { kind: 'undefined' };
  if (value === null) return { kind: 'null' };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), 'runtime fact numbers must be finite');
    return { kind: 'number', value };
  }
  if (typeof value === 'string') return { kind: 'string', value };
  if (Array.isArray(value)) return { kind: 'array', items: value.map(runtimeValue) };
  assert.equal(typeof value, 'object', 'runtime fact values must be JSON-safe data');
  return {
    kind: 'object',
    entries: Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareCodePoint(left, right))
      .map(([key, item]) => ({ key, value: runtimeValue(item) })),
  };
}

function runtimePresence(container: object, key: PropertyKey): { present: boolean; value?: TrainingBookValueFact } {
  return Object.prototype.hasOwnProperty.call(container, key)
    ? { present: true, value: runtimeValue((container as Record<PropertyKey, unknown>)[key]) }
    : { present: false };
}

function runtimeDefaultFacts(value: unknown, symbol: string, sourcePath: string, basePath: string): UiDefaultFact[] {
  const result: UiDefaultFact[] = [];
  const walk = (path: string, item: TrainingBookValueFact): void => {
    if (item.kind === 'object') {
      for (const entry of item.entries) walk(path === '' ? entry.key : `${path}.${entry.key}`, entry.value);
    } else {
      result.push({
        path: normalizeTrainingBookPath(path),
        value: { present: true, value: item },
        source_path: sourcePath,
        symbol,
      });
    }
  };
  walk(basePath, runtimeValue(value));
  return result;
}

function runtimeJsxFact(node: unknown): StaticJsxFact {
  const text_literals: string[] = [];
  const code_literals: string[] = [];
  const link_hrefs: string[] = [];
  const walk = (child: unknown, insideCode = false): void => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (typeof child === 'string' || typeof child === 'number') {
      const literal = String(child);
      (insideCode ? code_literals : text_literals).push(literal);
      return;
    }
    if (Array.isArray(child)) {
      for (const item of child) walk(item, insideCode);
      return;
    }
    assert.equal(typeof child, 'object', 'runtime JSX must remain a finite React node');
    const element = child as { type?: unknown; props?: Record<string, unknown> };
    const tag = typeof element.type === 'string'
      ? element.type
      : typeof element.type === 'function'
        ? element.type.name
        : String(element.type);
    if (tag === 'a' || tag === 'Link') {
      const href = element.props?.href;
      assert.equal(typeof href, 'string', 'runtime JSX links require a string href');
      link_hrefs.push(href as string);
    }
    walk(element.props?.children, insideCode || tag === 'code');
  };
  walk(node);
  return { present: true, text_literals, code_literals, link_hrefs };
}

function runtimeArchitectureDefaults(defaults: ModelArch['defaults']): {
  leaves: Array<{ declaration_path: string; path: string; selected: { present: boolean; value?: TrainingBookValueFact }; unselected: { present: boolean; value?: TrainingBookValueFact } }>;
  containers: Array<{ path: string; selected_present: boolean; unselected_present: boolean }>;
} {
  const leaves: Array<{ declaration_path: string; path: string; selected: { present: boolean; value?: TrainingBookValueFact }; unselected: { present: boolean; value?: TrainingBookValueFact } }> = [];
  const containers: Array<{ path: string; selected_present: boolean; unselected_present: boolean }> = [];
  const objectEntry = (value: TrainingBookValueFact | undefined, key: string): TrainingBookValueFact | undefined =>
    value?.kind === 'object' ? value.entries.find(entry => entry.key === key)?.value : undefined;
  for (const [rawPath, rawPair] of Object.entries(defaults ?? {})) {
    assert.ok(Array.isArray(rawPair) && rawPair.length === 2, `${rawPath} runtime default must remain a pair`);
    const declarationPath = normalizeTrainingBookPath(rawPath.replace('[x]', '[*]'));
    const walk = (path: string, selected: TrainingBookValueFact | undefined, unselected: TrainingBookValueFact | undefined): void => {
      const selectedObject = selected?.kind === 'object' ? selected : undefined;
      const unselectedObject = unselected?.kind === 'object' ? unselected : undefined;
      if (selectedObject !== undefined || unselectedObject !== undefined) {
        assert.ok(selected === undefined || selectedObject !== undefined, `${path} selected runtime container changed type`);
        assert.ok(unselected === undefined || unselectedObject !== undefined, `${path} unselected runtime container changed type`);
        containers.push({ path, selected_present: selectedObject !== undefined, unselected_present: unselectedObject !== undefined });
        const keys = new Set([
          ...(selectedObject?.entries.map(entry => entry.key) ?? []),
          ...(unselectedObject?.entries.map(entry => entry.key) ?? []),
        ]);
        for (const key of [...keys].sort(compareCodePoint)) walk(`${path}.${key}`, objectEntry(selectedObject, key), objectEntry(unselectedObject, key));
        return;
      }
      leaves.push({
        declaration_path: declarationPath,
        path,
        selected: selected === undefined ? { present: false } : { present: true, value: selected },
        unselected: unselected === undefined ? { present: false } : { present: true, value: unselected },
      });
    };
    walk(declarationPath, runtimeValue(rawPair[0]), runtimeValue(rawPair[1]));
  }
  leaves.sort((left, right) => compareCodePoint(left.path, right.path));
  containers.sort((left, right) => compareCodePoint(left.path, right.path));
  return { leaves, containers };
}

function runtimePathValue(value: unknown, canonicalPath: string): unknown {
  let current = value;
  const concrete = canonicalPath.replaceAll('[*]', '[0]');
  for (const match of concrete.matchAll(/(?:^|\.)([^.\[]+)|\[(\d+)\]/g)) {
    const key: string | number = match[1] ?? Number.parseInt(match[2], 10);
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

function runtimePredicate(predicate: ModelOptionPredicateFact, config: unknown): boolean {
  if (predicate.kind === 'always') return true;
  if (predicate.kind === 'truthy') return Boolean(runtimePathValue(config, predicate.path));
  if (predicate.kind === 'nonblank-string') {
    const value = runtimePathValue(config, predicate.path);
    return typeof value === 'string' && value.trim() !== '';
  }
  if (predicate.kind === 'not') return !runtimePredicate(predicate.operand, config);
  if (predicate.kind === 'and') return runtimePredicate(predicate.operands[0], config) && runtimePredicate(predicate.operands[1], config);
  return runtimePredicate(predicate.operands[0], config) || runtimePredicate(predicate.operands[1], config);
}

assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    function SimpleJob({ jobConfig, setJobConfig }) {
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
    const CaptionSimpleJob: React.FC<Props> = ({ jobConfig, setJobConfig }) => {
      jobConfig.config.process[0].datasets.map((dataset, i) =>
        setJobConfig('', \`config.process[0].datasets[\${i}].caption_ext\`));
    };
  `),
  ['config.process[*].datasets[*].caption_ext'],
  'a top-level PascalCase variable-bound arrow is a proven component-prop boundary',
);
assert.deepEqual(
  collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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
    function Fixture({ jobConfig, setJobConfig }) {
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
      function Fixture({ jobConfig, setJobConfig }) {
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

const factualUiContractFailures: string[] = [];
const finiteChoiceClaims = collectVisibleControlClaimsFromSource(`
  function Fixture({ jobConfig, setJobConfig }) {
    return <>
      <SelectInput
        label="Mode"
        value={jobConfig.config.process[0].train.mode}
        onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
      />
      {jobConfig.config.process[0].datasets.map((dataset, i) => (
        <CreatableSelectInput
          label="Caption Extension"
          value={dataset.caption_ext}
          onChange={value => setJobConfig(value, \`config.process[0].datasets[\${i}].caption_ext\`)}
          options={[{ value: 'txt', label: 'txt' }, { value: 'json', label: 'json' }]}
        />
      ))}
    </>;
  }
`, 'fixture.tsx', 'Fixture');
const closedSelect = finiteChoiceClaims.find(item => item.path === 'config.process[*].train.mode');
const creatableSelect = finiteChoiceClaims.find(item => item.path === 'config.process[*].datasets[*].caption_ext');
if (JSON.stringify(closedSelect?.value_contract.accepted_values) !== JSON.stringify([
  { kind: 'string', value: 'a' },
  { kind: 'string', value: 'b' },
])) factualUiContractFailures.push('ordinary SelectInput closed accepted values');
if (creatableSelect?.value_contract.accepted_values !== undefined) {
  factualUiContractFailures.push('CreatableSelectInput has no closed accepted values');
}
if (JSON.stringify((creatableSelect?.value_contract as unknown as Record<string, unknown>)?.suggested_values) !== JSON.stringify([
  { kind: 'string', value: 'txt' },
  { kind: 'string', value: 'json' },
])) factualUiContractFailures.push('CreatableSelectInput finite suggestions');
const aliasedSelectClaims = collectVisibleControlClaimsFromSource(`
  const modeOptions = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
  function Fixture({ jobConfig, setJobConfig }) {
    return <SelectInput
      label="Mode"
      value={jobConfig.config.process[0].train.mode}
      onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
      options={modeOptions}
    />;
  }
`, 'fixture.tsx', 'Fixture');
if (JSON.stringify(aliasedSelectClaims[0]?.value_contract.accepted_values) !== JSON.stringify([
  { kind: 'string', value: 'a' },
  { kind: 'string', value: 'b' },
])) factualUiContractFailures.push('ordinary SelectInput finite alias remains closed');
try {
  collectVisibleControlClaimsFromSource(`
    function Fixture({ jobConfig, setJobConfig }) {
      return <SelectInput
        label="Mode"
        value={jobConfig.config.process[0].train.mode}
        onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
        options={unresolvedOptions}
      />;
    }
  `, 'fixture.tsx', 'Fixture');
  factualUiContractFailures.push('ordinary SelectInput unresolved options fail closed');
} catch (error) {
  assert.match(String(error), /select.*options|accepted values/i);
}
for (const [label, declarations] of [
  [
    'ordinary SelectInput reassigned options fail closed',
    `let modeOptions = [{ value: 'a', label: 'A' }];
     modeOptions = [{ value: 'b', label: 'B' }];`,
  ],
  [
    'ordinary SelectInput branch-ambiguous options fail closed',
    `let modeOptions = [{ value: 'a', label: 'A' }];
     if (condition) modeOptions = [{ value: 'b', label: 'B' }];`,
  ],
  [
    'ordinary SelectInput member-mutated options fail closed',
    `const modeOptions = [{ value: 'a', label: 'A' }];
     modeOptions.push({ value: 'b', label: 'B' });`,
  ],
] as const) {
  try {
    collectVisibleControlClaimsFromSource(`
      ${declarations}
      function Fixture({ jobConfig, setJobConfig }) {
        return <SelectInput
          label="Mode"
          value={jobConfig.config.process[0].train.mode}
          onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
          options={modeOptions}
        />;
      }
    `, 'fixture.tsx', 'Fixture');
    factualUiContractFailures.push(label);
  } catch (error) {
    assert.match(String(error), /select.*options|accepted values/i, `${label} must reject non-exact option provenance`);
  }
}
for (const [label, sourceText] of [
  [
    'ordinary SelectInput later module mutation fails closed',
    `const modeOptions = [{ value: 'a', label: 'A' }];
     function Fixture({ jobConfig, setJobConfig }) {
       return <SelectInput
         label="Mode"
         value={jobConfig.config.process[0].train.mode}
         onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
         options={modeOptions}
       />;
     }
     modeOptions.push({ value: 'b', label: 'B' });`,
  ],
  [
    'ordinary SelectInput aliased member mutation fails closed',
    `const modeOptions = [{ value: 'a', label: 'A' }];
     const optionAlias = modeOptions;
     optionAlias.push({ value: 'b', label: 'B' });
     function Fixture({ jobConfig, setJobConfig }) {
       return <SelectInput
         label="Mode"
         value={jobConfig.config.process[0].train.mode}
         onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
         options={modeOptions}
       />;
     }`,
  ],
] as const) {
  try {
    collectVisibleControlClaimsFromSource(sourceText, 'fixture.tsx', 'Fixture');
    factualUiContractFailures.push(label);
  } catch (error) {
    assert.match(String(error), /select.*options|accepted values/i, `${label} must reject stale option values`);
  }
}
for (const [label, moduleEffect] of [
  [
    'ordinary SelectInput class static option mutation fails closed',
    `class OptionMutator {
       static changed = modeOptions.push({ value: 'b', label: 'B' });
     }`,
  ],
  [
    'ordinary SelectInput synchronous forEach option mutation fails closed',
    `[1].forEach(() => modeOptions.push({ value: 'b', label: 'B' }));`,
  ],
  [
    'ordinary SelectInput synchronous map option mutation fails closed',
    `[1].map(() => modeOptions.push({ value: 'b', label: 'B' }));`,
  ],
] as const) {
  try {
    collectVisibleControlClaimsFromSource(`
      const modeOptions = [{ value: 'a', label: 'A' }];
      ${moduleEffect}
      function Fixture({ jobConfig, setJobConfig }) {
        return <SelectInput
          label="Mode"
          value={jobConfig.config.process[0].train.mode}
          onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
          options={modeOptions}
        />;
      }
    `, 'fixture.tsx', 'Fixture');
    factualUiContractFailures.push(label);
  } catch (error) {
    assert.match(String(error), /select.*options|accepted values/i, `${label} must reject executed module effects`);
  }
}
try {
  const harmlessUninvokedOptionClaims = collectVisibleControlClaimsFromSource(`
    const modeOptions = [{ value: 'a', label: 'A' }];
    const uninvoked = () => modeOptions.push({ value: 'b', label: 'B' });
    class Uninstantiated {
      mutate() { modeOptions.push({ value: 'c', label: 'C' }); }
      static mutate() { modeOptions.push({ value: 'd', label: 'D' }); }
    }
    function Fixture({ jobConfig, setJobConfig }) {
      return <SelectInput
        label="Mode"
        value={jobConfig.config.process[0].train.mode}
        onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
        options={modeOptions}
      />;
    }
  `, 'fixture.tsx', 'Fixture');
  if (JSON.stringify(harmlessUninvokedOptionClaims[0]?.value_contract.accepted_values) !== JSON.stringify([
    { kind: 'string', value: 'a' },
  ])) factualUiContractFailures.push('uninvoked option callbacks and class methods remain harmless');
} catch {
  factualUiContractFailures.push('uninvoked option callbacks and class methods remain harmless');
}

const projectedOptionsControl = (before: string, during: string, after: string): string => `
  import { groupedModelOptions } from './options';
  import { handleModelArchChange } from './utils';
  ${before}
  function SimpleJob({ jobConfig, setJobConfig }) {
    ${during}
    return <SelectInput
      label="Model Architecture"
      value={jobConfig.config.process[0].model.arch}
      onChange={value => {
        handleModelArchChange(jobConfig.config.process[0].model.arch, value, jobConfig, setJobConfig);
      }}
      options={groupedModelOptions}
    />;
  }
  ${after}
`;
const projectedMutation = `groupedModelOptions.push({ value: 'stale', label: 'Stale' });`;
for (const [label, projectedSource] of [
  ['projected options mutation before component fails closed', projectedOptionsControl(projectedMutation, '', '')],
  ['projected options mutation after component fails closed', projectedOptionsControl('', '', projectedMutation)],
  ['projected options mutation during render fails closed', projectedOptionsControl('', projectedMutation, '')],
] as const) {
  try {
    collectVisibleControlClaimsFromSource(projectedSource, 'fixture.tsx', 'SimpleJob', false, true);
    factualUiContractFailures.push(label);
  } catch (error) {
    assert.match(String(error), /select.*options|accepted values|projected/i, `${label} must reject mutable imported options`);
  }
}

const quantizationProjectionClaims = collectVisibleControlClaimsFromSource(`
  function Fixture({ jobConfig, setJobConfig }) {
    return <SelectInput
      label="Transformer"
      value={jobConfig.config.process[0].model.quantize ? jobConfig.config.process[0].model.qtype : ''}
      onChange={value => {
        if (value === '') {
          setJobConfig(false, 'config.process[0].model.quantize');
          value = 'qfloat8';
        } else {
          setJobConfig(true, 'config.process[0].model.quantize');
        }
        setJobConfig(value, 'config.process[0].model.qtype');
      }}
      options={[{ value: '', label: 'Disabled' }, { value: 'qfloat8', label: 'qfloat8' }]}
    />;
  }
`, 'fixture.tsx', 'Fixture');
const qtypeProjection = quantizationProjectionClaims.find(item => item.path === 'config.process[*].model.qtype');
const quantizeProjection = quantizationProjectionClaims.find(item => item.path === 'config.process[*].model.quantize');
if (JSON.stringify(qtypeProjection?.value_contract.accepted_values) !== JSON.stringify([
  { kind: 'string', value: '' },
  { kind: 'string', value: 'qfloat8' },
])) factualUiContractFailures.push('primary qtype strings remain string accepted values');
if (
  quantizeProjection?.value_contract.ui_type !== 'boolean'
  || quantizeProjection.value_contract.widget_kind !== 'select'
  || JSON.stringify(quantizeProjection.value_contract.accepted_values) !== JSON.stringify([
    { kind: 'boolean', value: false },
    { kind: 'boolean', value: true },
  ])
) factualUiContractFailures.push('secondary quantize writes have boolean select semantics');

const layerScaleSource = `
  function Fixture({ jobConfig, setJobConfig }) {
    return <SliderInput
      label="Transformer Offload %"
      value={Math.round((jobConfig.config.process[0].model.layer_offloading_transformer_percent ?? 1) * 100)}
      onChange={value => setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent')}
      min={0}
      max={100}
      step={1}
    />;
  }
`;
const layerScaleClaim = collectVisibleControlClaimsFromSource(layerScaleSource, 'fixture.tsx', 'Fixture')[0];
const layerScaleContract = layerScaleClaim?.value_contract as unknown as Record<string, unknown>;
if (layerScaleContract?.config_to_ui_scale !== 100 || layerScaleContract?.ui_to_config_scale !== 0.01) {
  factualUiContractFailures.push('layer offload read/write scale contract');
}
for (const [label, mutated] of [
  ['config-to-UI multiplier drift', layerScaleSource.replace('* 100)', '* 10)')],
  ['UI-to-config multiplier drift', layerScaleSource.replace('value * 0.01', 'value * 0.1')],
  [
    'extra unscaled UI-to-config write',
    layerScaleSource.replace(
      "onChange={value => setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent')}",
      "onChange={value => {\n        setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent');\n        setJobConfig(value, 'config.process[0].model.layer_offloading_transformer_percent');\n      }}",
    ),
  ],
] as const) {
  try {
    collectVisibleControlClaimsFromSource(mutated, 'fixture.tsx', 'Fixture');
    factualUiContractFailures.push(label);
  } catch (error) {
    assert.match(String(error), /reciprocal|scale/i, `${label} must fail for the scale contract`);
  }
}
try {
  const deadUnscaledLayerWrite = layerScaleSource.replace(
    "onChange={value => setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent')}",
    "onChange={value => {\n        if (false) setJobConfig(value, 'config.process[0].model.layer_offloading_transformer_percent');\n        setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent');\n      }}",
  );
  const deadWriteContract = collectVisibleControlClaimsFromSource(
    deadUnscaledLayerWrite,
    'fixture.tsx',
    'Fixture',
  )[0]?.value_contract as unknown as Record<string, unknown>;
  if (deadWriteContract.config_to_ui_scale !== 100 || deadWriteContract.ui_to_config_scale !== 0.01) {
    factualUiContractFailures.push('statically dead extra scale writes remain harmless');
  }
} catch {
  factualUiContractFailures.push('statically dead extra scale writes remain harmless');
}
for (const [label, sourceText] of [
  [
    'uninvoked nested scale writes remain unrelated',
    layerScaleSource.replace(
      "onChange={value => setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent')}",
      "onChange={value => {\n        function unrelated() { setJobConfig(value, 'config.process[0].model.layer_offloading_transformer_percent'); }\n        setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent');\n      }}",
    ),
  ],
  [
    'binding-resolved dead scale writes remain harmless',
    layerScaleSource.replace(
      "onChange={value => setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent')}",
      "onChange={value => {\n        const never = false;\n        if (never) setJobConfig(value, 'config.process[0].model.layer_offloading_transformer_percent');\n        setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent');\n      }}",
    ),
  ],
] as const) {
  try {
    const contract = collectVisibleControlClaimsFromSource(sourceText, 'fixture.tsx', 'Fixture')[0]?.value_contract as unknown as Record<string, unknown>;
    if (contract.config_to_ui_scale !== 100 || contract.ui_to_config_scale !== 0.01) factualUiContractFailures.push(label);
  } catch {
    factualUiContractFailures.push(label);
  }
}

const guardedQuantizationSource = `
  function SimpleJob({ jobConfig, setJobConfig, disableSections }) {
    return <>
      {disableSections.includes('model.quantize') ? null : (
        <Card title="Quantize / Compile">
          <SelectInput
            label="Transformer"
            value={jobConfig.config.process[0].model.quantize ? jobConfig.config.process[0].model.qtype : ''}
            onChange={value => {
              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');
              else setJobConfig(true, 'config.process[0].model.quantize');
              setJobConfig(value, 'config.process[0].model.qtype');
            }}
            options={[{ value: '', label: 'Disabled' }, { value: 'qfloat8', label: 'qfloat8' }]}
          />
          {!disableSections.includes('model.quantize_te') && (
            <SelectInput
              label="Text Encoder"
              value={jobConfig.config.process[0].model.quantize_te ? jobConfig.config.process[0].model.qtype_te : ''}
              onChange={value => {
                if (value === '') setJobConfig(false, 'config.process[0].model.quantize_te');
                else setJobConfig(true, 'config.process[0].model.quantize_te');
                setJobConfig(value, 'config.process[0].model.qtype_te');
              }}
              options={[{ value: '', label: 'Disabled' }, { value: 'qfloat8', label: 'qfloat8' }]}
            />
          )}
        </Card>
      )}
    </>;
  }
`;
const detachedTextEncoderSource = guardedQuantizationSource
  .replace(
    "          {!disableSections.includes('model.quantize_te') && (",
    "        </Card>\n      )}\n      {!disableSections.includes('model.quantize_te') && (",
  )
  .replace(
    "          )}\n        </Card>\n      )}\n    </>;",
    "      )}\n    </>;",
  );
const overbroadTextEncoderGuardSource = guardedQuantizationSource
  .replace(
    "          <SelectInput\n            label=\"Transformer\"",
    "          {!disableSections.includes('model.quantize_te') && (\n            <>\n          <SelectInput\n            label=\"Transformer\"",
  )
  .replace(
    "          {!disableSections.includes('model.quantize_te') && (\n            <SelectInput\n              label=\"Text Encoder\"",
    "            <SelectInput\n              label=\"Text Encoder\"",
  )
  .replace(
    "          )}\n        </Card>",
    "            </>\n          )}\n        </Card>",
  );
const redundantOverbroadTextEncoderGuardSource = guardedQuantizationSource
  .replace(
    "          <SelectInput\n            label=\"Transformer\"",
    "          {!disableSections.includes('model.quantize_te') && (\n            <>\n          <SelectInput\n            label=\"Transformer\"",
  )
  .replace(
    "          )}\n        </Card>",
    "          )}\n            </>\n          )}\n        </Card>",
  );
const unrelatedOuterGuardSource = redundantOverbroadTextEncoderGuardSource.replace(
  "!disableSections.includes('model.quantize_te')",
  "!disableSections.includes('model.low_vram')",
);
const swappedTransformerBooleanSource = guardedQuantizationSource.replace(
  "              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');\n              else setJobConfig(true, 'config.process[0].model.quantize');",
  "              if (value === '') setJobConfig(true, 'config.process[0].model.quantize');\n              else setJobConfig(false, 'config.process[0].model.quantize');",
);
const swappedTextEncoderBooleanSource = guardedQuantizationSource.replace(
  "                if (value === '') setJobConfig(false, 'config.process[0].model.quantize_te');\n                else setJobConfig(true, 'config.process[0].model.quantize_te');",
  "                if (value === '') setJobConfig(true, 'config.process[0].model.quantize_te');\n                else setJobConfig(false, 'config.process[0].model.quantize_te');",
);
const nestedQuantizationControlsSource = guardedQuantizationSource
  .replace(
    '    return <>',
    '    function QuantizationPanel() {\n      return <>',
  )
  .replace(
    '    </>;\n  }',
    '      </>;\n    }\n    return <QuantizationPanel />;\n  }',
  );
const unrelatedNestedFunctionSource = guardedQuantizationSource.replace(
  '    return <>',
  '    function UnrelatedPanel() { return null; }\n    return <>',
);
const deadTransformerBooleanSource = guardedQuantizationSource.replace(
  "              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');\n              else setJobConfig(true, 'config.process[0].model.quantize');",
  "              if (value === '') {\n                if (false) setJobConfig(false, 'config.process[0].model.quantize');\n              } else {\n                if (false) setJobConfig(true, 'config.process[0].model.quantize');\n              }",
);
const deadTextEncoderBooleanSource = guardedQuantizationSource.replace(
  "                if (value === '') setJobConfig(false, 'config.process[0].model.quantize_te');\n                else setJobConfig(true, 'config.process[0].model.quantize_te');",
  "                if (value === '') {\n                  if (false) setJobConfig(false, 'config.process[0].model.quantize_te');\n                } else {\n                  if (false) setJobConfig(true, 'config.process[0].model.quantize_te');\n                }",
);
const harmlessDeadBooleanWriteSource = guardedQuantizationSource.replace(
  "              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');",
  "              if (false) setJobConfig(true, 'config.process[0].model.quantize');\n              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');",
);
const unrelatedNestedBooleanWriteSource = guardedQuantizationSource.replace(
  "              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');",
  "              function unrelated() { setJobConfig(false, 'config.process[0].model.quantize'); }\n              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');",
);
const uninvokedTransformerBooleanSource = guardedQuantizationSource.replace(
  "              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');\n              else setJobConfig(true, 'config.process[0].model.quantize');",
  "              function uninvoked() {\n                if (value === '') setJobConfig(false, 'config.process[0].model.quantize');\n                else setJobConfig(true, 'config.process[0].model.quantize');\n              }",
);
const bindingDeadTransformerBooleanSource = guardedQuantizationSource.replace(
  "              if (value === '') setJobConfig(false, 'config.process[0].model.quantize');\n              else setJobConfig(true, 'config.process[0].model.quantize');",
  "              const never = false;\n              if (value === '') {\n                if (never) setJobConfig(false, 'config.process[0].model.quantize');\n              } else {\n                if (never) setJobConfig(true, 'config.process[0].model.quantize');\n              }",
);
try {
  collectVisibleControlClaimsFromSource(
    guardedQuantizationSource,
    'ui/src/app/jobs/new/SimpleJob.tsx',
    'SimpleJob',
  );
} catch {
  factualUiContractFailures.push('exact quantization visibility guards');
}
try {
  collectVisibleControlClaimsFromSource(
    unrelatedOuterGuardSource,
    'ui/src/app/jobs/new/SimpleJob.tsx',
    'SimpleJob',
  );
} catch {
  factualUiContractFailures.push('unrelated outer visibility guards remain independent');
}
for (const [label, positive] of [
  ['unrelated nested functions remain independent', unrelatedNestedFunctionSource],
  ['statically dead extra boolean writes remain harmless', harmlessDeadBooleanWriteSource],
  ['uninvoked nested boolean writes remain unrelated', unrelatedNestedBooleanWriteSource],
] as const) {
  try {
    collectVisibleControlClaimsFromSource(
      positive,
      'ui/src/app/jobs/new/SimpleJob.tsx',
      'SimpleJob',
    );
  } catch {
    factualUiContractFailures.push(label);
  }
}
for (const [label, mutated] of [
  [
    'outer model.quantize visibility guard drift',
    guardedQuantizationSource.replace("disableSections.includes('model.quantize') ? null", "disableSections.includes('model.quantize_te') ? null"),
  ],
  [
    'nested model.quantize_te visibility guard drift',
    guardedQuantizationSource.replace("!disableSections.includes('model.quantize_te')", "!disableSections.includes('model.quantize')"),
  ],
  [
    'Text Encoder detached from outer quantization card',
    detachedTextEncoderSource,
  ],
  [
    'model.quantize_te guard wraps more than Text Encoder',
    overbroadTextEncoderGuardSource,
  ],
  [
    'additional model.quantize_te guard also wraps Transformer',
    redundantOverbroadTextEncoderGuardSource,
  ],
  [
    'Transformer secondary boolean setter drift',
    guardedQuantizationSource.replaceAll("model.quantize');", "model.low_vram');"),
  ],
  [
    'Text Encoder secondary boolean setter drift',
    guardedQuantizationSource.replaceAll("model.quantize_te');", "model.low_vram');"),
  ],
  [
    'Transformer empty/nonempty boolean mapping drift',
    swappedTransformerBooleanSource,
  ],
  [
    'Text Encoder empty/nonempty boolean mapping drift',
    swappedTextEncoderBooleanSource,
  ],
  [
    'quantization controls moved to nested lexical owner',
    nestedQuantizationControlsSource,
  ],
  [
    'Transformer boolean evidence is statically unreachable',
    deadTransformerBooleanSource,
  ],
  [
    'Text Encoder boolean evidence is statically unreachable',
    deadTextEncoderBooleanSource,
  ],
  [
    'Transformer boolean evidence in an uninvoked nested function is unreachable',
    uninvokedTransformerBooleanSource,
  ],
  [
    'Transformer boolean evidence in a binding-resolved dead branch is unreachable',
    bindingDeadTransformerBooleanSource,
  ],
] as const) {
  try {
    collectVisibleControlClaimsFromSource(
      mutated,
      'ui/src/app/jobs/new/SimpleJob.tsx',
      'SimpleJob',
    );
    factualUiContractFailures.push(label);
  } catch (error) {
    assert.match(String(error), /quantiz|disableSections|visibility/i, `${label} must fail closed`);
  }
}
assert.deepEqual(factualUiContractFailures, [], 'shared factual UI contracts must remain exact');

assert.throws(
  () => collectVisibleControlClaimsFromSource(`
    function Fixture({ jobConfig, setJobConfig }) { return <NumberInput
      label={dynamicLabel}
      value={jobConfig.config.process[0].train.steps}
      onChange={value => setJobConfig(value, 'config.process[0].train.steps')}
    />; }
  `, 'fixture.tsx', 'Fixture'),
  /dynamic JSX label/,
);
assert.throws(
  () => collectVisibleControlClaimsFromSource(`
    function Fixture({ jobConfig, setJobConfig }) { return <SelectInput
      label="Mode"
      value={jobConfig.config.process[0].train.mode}
      onChange={value => setJobConfig(value, 'config.process[0].train.mode')}
      options={[{ value: dynamicValue, label: 'Dynamic' }]}
    />; }
  `, 'fixture.tsx', 'Fixture'),
  /option value.*literal|accepted value/,
);
const singleDuplicateProbeSource = `
  function Fixture({ jobConfig, setJobConfig }) {
    return <>
      <NumberInput
        label="Steps"
        value={jobConfig.config.process[0].train.steps}
        onChange={value => setJobConfig(value, 'config.process[0].train.steps')}
      />
    </>;
  }
`;
assert.equal(
  collectVisibleControlClaimsFromSource(singleDuplicateProbeSource, 'fixture.tsx', 'Fixture').length,
  1,
  'one proven config-bound control emits exactly once',
);
assert.throws(
  () => collectVisibleControlClaimsFromSource(singleDuplicateProbeSource.replace(
    '    </>;',
    `
      <NumberInput
        label="Steps"
        value={jobConfig.config.process[0].train.steps}
        onChange={value => setJobConfig(value, 'config.process[0].train.steps')}
      />
    </>;`,
  ), 'fixture.tsx', 'Fixture'),
  /duplicate visible control/,
  'identical visible controls must not silently coalesce',
);
assert.throws(
  () => collectVisibleControlClaimsFromSource(`
    function Fixture({ jobConfig, setJobConfig }) {
      return <NumberInput
        label="Steps"
        value={jobConfig.config.process[0].train.steps}
      />;
    }
  `, 'fixture.tsx', 'Fixture'),
  /editable visible control.*onChange/,
  'a config-bound editable control requires an exact change binding',
);
for (const [label, onChange] of [
  ['wrong setter path', "value => setJobConfig(value, 'config.process[0].sample.sample_every')"],
  ['side-effect only', 'value => sideEffect(value)'],
] as const) {
  assert.throws(
    () => collectVisibleControlClaimsFromSource(`
      function Fixture({ jobConfig, setJobConfig }) {
        return <NumberInput
          label="Steps"
          value={jobConfig.config.process[0].train.steps}
          onChange={${onChange}}
        />;
      }
    `, 'fixture.tsx', 'Fixture'),
    /primary bound read path.*onChange setter/,
    `${label} must not satisfy a config-bound editable control`,
  );
}
assert.deepEqual(
  collectVisibleControlClaimsFromSource(`
    function Fixture({ jobConfig, setJobConfig }) {
      return <NumberInput
        label="Steps"
        value={jobConfig.config.process[0].train.steps}
        onChange={value => {
          setJobConfig(value, 'config.process[0].train.steps');
          setJobConfig(true, 'config.process[0].train.force_first_sample');
        }}
      />;
    }
  `, 'fixture.tsx', 'Fixture').map(item => item.path),
  ['config.process[*].train.steps'],
  'a primary setter may retain additional explicit writes',
);
const architectureMediatorControl = `
  import { handleModelArchChange } from './utils';
  function Fixture({ jobConfig, setJobConfig }) {
    return <SelectInput
      label="Model Architecture"
      value={jobConfig.config.process[0].model.arch}
      onChange={value => {
        handleModelArchChange(jobConfig.config.process[0].model.arch, value, jobConfig, setJobConfig);
      }}
      options={[{ value: 'flux', label: 'Flux' }]}
    />;
  }
`;
assert.deepEqual(
  collectVisibleControlClaimsFromSource(architectureMediatorControl, 'fixture.tsx', 'Fixture').map(item => item.path),
  ['config.process[*].model.arch'],
  'the exact architecture-change mediator projects its primary setter path',
);
for (const [label, mutated] of [
  ['type-only import clause', architectureMediatorControl.replace('import { handleModelArchChange }', 'import type { handleModelArchChange }')],
  ['type-only import specifier', architectureMediatorControl.replace('{ handleModelArchChange }', '{ type handleModelArchChange }')],
] as const) {
  assert.throws(
    () => collectVisibleControlClaimsFromSource(mutated, 'fixture.tsx', 'Fixture'),
    /exact named import from \.\/utils/,
    `architecture mediator ${label} must fail`,
  );
}
for (const [label, sourceText] of [
  ['locally shadowed setter', `
    function Fixture({ jobConfig, setJobConfig }) {
      {
        const setJobConfig = sideEffect;
        return <NumberInput label="Steps" value={jobConfig.config.process[0].train.steps}
          onChange={value => setJobConfig(value, 'config.process[0].train.steps')} />;
      }
    }
  `],
  ['setter from a different owner', `
    function Fixture({ jobConfig, setJobConfig }) {
      function adaptor({ setJobConfig }) {
        return <NumberInput label="Steps" value={jobConfig.config.process[0].train.steps}
          onChange={value => setJobConfig(value, 'config.process[0].train.steps')} />;
      }
    }
  `],
] as const) {
  assert.throws(
    () => collectVisibleControlClaimsFromSource(sourceText, 'fixture.tsx', 'Fixture'),
    /exact component setJobConfig prop binding/,
    `${label} must not emit a setting setter fact`,
  );
}
for (const [label, sourceText] of [
  ['locally shadowed mediator', architectureMediatorControl.replace(
    'function Fixture({ jobConfig, setJobConfig }) {',
    'function Fixture({ jobConfig, setJobConfig }) {\n    const handleModelArchChange = sideEffect;',
  )],
  ['shadowed callback arguments', architectureMediatorControl.replace(
    'handleModelArchChange(jobConfig.config.process[0].model.arch, value, jobConfig, setJobConfig);',
    '((value, jobConfig, setJobConfig) => handleModelArchChange(jobConfig.config.process[0].model.arch, value, jobConfig, setJobConfig))(value, jobConfig, setJobConfig);',
  )],
] as const) {
  assert.throws(
    () => collectVisibleControlClaimsFromSource(sourceText, 'fixture.tsx', 'Fixture'),
    /exact named import|exact onChange value binding|same component owner/,
    `${label} must not emit an architecture mediator setter fact`,
  );
}
assert.throws(
  () => collectCanonicalSetterPathsFromSource(`
    function Fixture({ jobConfig, setJobConfig }) {
      setNestedValue(jobConfig, 1, 'config.process[0].train.steps');
    }
  `),
  /setNestedValue.*provenance|unsupported setting setter/,
  'an unproven recognized setNestedValue call must fail closed',
);
for (const [label, mutated] of [
  ['handler', architectureMediatorControl.replace('handleModelArchChange(', 'otherHandler(')],
  ['current path', architectureMediatorControl.replaceAll('.model.arch', '.model.name_or_path')],
  ['next value', architectureMediatorControl.replace(', value, jobConfig,', ', otherValue, jobConfig,')],
  ['config argument', architectureMediatorControl.replace(', jobConfig, setJobConfig', ', otherConfig, setJobConfig')],
  ['setter argument', architectureMediatorControl.replace(', setJobConfig);', ', otherSetter);')],
] as const) {
  assert.throws(
    () => collectVisibleControlClaimsFromSource(mutated, 'fixture.tsx', 'Fixture'),
    /primary bound read path.*onChange setter|architecture mediator/,
    `architecture mediator ${label} mutation must fail`,
  );
}

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
  write(root, 'ui/src/app/jobs/new/SimpleJob.tsx', "export default function SimpleJob({ jobConfig, setJobConfig }) { setJobConfig(3000, 'config.process[0].train.steps'); return null; }\n");
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

const exactDocsIconSource = `
const docs = {
  'model.layer_offloading': {
    title: <><span>Layer Offloading ( <IoFlaskSharp className="inline text-yellow-500" name="Experimental" /> Experimental)</span></>,
    description: <div>Layer offloading.</div>,
  },
};
export default docs;
`;
const exactDocsIconRoot = fixtureRoot(source);
write(exactDocsIconRoot, 'ui/src/docs.tsx', exactDocsIconSource);
try {
  const iconClaim = collectTrainingBookUiFacts(exactDocsIconRoot).config_claims.find(item => item.kind === 'doc' && item.path === 'config.process[*].model.layer_offloading');
  assert.deepEqual(iconClaim?.ui_label, { present: true, value: { kind: 'string', value: 'Layer Offloading ( Experimental)' } });
} finally {
  rmSync(exactDocsIconRoot, { recursive: true });
}
for (const [label, mutated] of [
  ['tag', exactDocsIconSource.replaceAll('IoFlaskSharp', 'OtherIcon')],
  ['attribute name', exactDocsIconSource.replace('className=', 'class=')],
  ['name value', exactDocsIconSource.replace('name="Experimental"', 'name="Other"')],
  ['class value', exactDocsIconSource.replace('inline text-yellow-500', 'changed')],
  ['additional attribute', exactDocsIconSource.replace('name="Experimental"', 'name="Experimental" data-extra="x"')],
  ['children', exactDocsIconSource.replace('name="Experimental" />', 'name="Experimental">hidden</IoFlaskSharp>')],
] as const) {
  const mutationRoot = fixtureRoot(source);
  write(mutationRoot, 'ui/src/docs.tsx', mutated);
  try {
    assert.throws(
      () => collectTrainingBookUiFacts(mutationRoot),
      /IoFlaskSharp docs-title projection|unprojected JSX component/,
      `exact docs icon ${label} mutation must fail`,
    );
  } finally {
    rmSync(mutationRoot, { recursive: true });
  }
}

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
  const behaviorFacts = structuredClone(serialized);
  behaviorFacts.config_claims[0].behavior_contract = {
    guard: 'property-absent',
    operation: 'write',
    sources: [],
    payload: {
      kind: 'literal',
      value: {
        kind: 'object',
        entries: [
          { key: 'log_every', value: { kind: 'number', value: 1 } },
          { key: 'use_ui_logger', value: { kind: 'boolean', value: true } },
        ],
      },
    },
  };
  validateTrainingBookUiFacts(behaviorFacts);
  for (const guard of [
    'text-encoder-path-unsupported',
    'vae-path-unsupported',
    'layer-offloading-unsupported-property-present',
  ] as const) {
    const exactGuardFacts = structuredClone(behaviorFacts);
    (exactGuardFacts.config_claims[0]!.behavior_contract as any).guard = guard;
    validateTrainingBookUiFacts(exactGuardFacts);
  }
  const vagueGuardFacts = structuredClone(behaviorFacts);
  (vagueGuardFacts.config_claims[0]!.behavior_contract as any).guard = 'cleaned-model-changed';
  assert.throws(
    () => validateTrainingBookUiFacts(vagueGuardFacts),
    /guard is unsupported/,
    'behavior contracts reject the stale cleaned-model-changed guard',
  );
  const architectureNameFacts = structuredClone(serialized);
  architectureNameFacts.config_claims[0].behavior_contract = {
    guard: 'architecture-change',
    operation: 'write',
    sources: [],
    payload: { kind: 'architecture-name' },
  };
  validateTrainingBookUiFacts(architectureNameFacts);
  for (const [label, mutate, expectedError] of [
    ['source', (contract: any) => { contract.sources = ['config.process[*].model.arch']; }, /architecture-name.*source-free write/],
    ['delete operation', (contract: any) => { contract.operation = 'delete'; }, /delete requires undefined/],
  ] as const) {
    const invalidArchitectureName = structuredClone(architectureNameFacts);
    mutate(invalidArchitectureName.config_claims[0].behavior_contract);
    assert.throws(
      () => validateTrainingBookUiFacts(invalidArchitectureName),
      expectedError,
      `architecture-name behavior rejects ${label}`,
    );
  }
  for (const [label, mutate, expectedError] of [
    ['unknown operation', (contract: any) => { contract.operation = 'rename'; }, /operation/],
    ['noncanonical source', (contract: any) => { contract.sources = ['config.process[0].sample.prompts']; }, /sources.*canonical/],
    ['untagged payload', (contract: any) => { contract.payload = { value: false }; }, /payload.*kind/],
    ['delete with literal', (contract: any) => { contract.operation = 'delete'; }, /delete.*undefined/],
    ['copy without source', (contract: any) => { contract.payload = { kind: 'copy' }; }, /payload.*source_path/],
    ['prompt map without source', (contract: any) => { contract.payload = { kind: 'map-prompt-objects', item_key: 'prompt' }; }, /payload.*source_path/],
  ] as const) {
    const invalidBehavior = structuredClone(behaviorFacts);
    mutate(invalidBehavior.config_claims[0].behavior_contract);
    assert.throws(
      () => validateTrainingBookUiFacts(invalidBehavior),
      expectedError,
      `behavior contracts reject ${label}`,
    );
  }
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

const sortedArchitectureSource = `
export const modelArchs = [
  { name: 'z', label: 'Zulu', group: 'image', defaults: { 'config.process[0].model.name_or_path': ['z/model', ''] } },
  { name: 'a', label: 'Alpha', group: 'image', defaults: { 'config.process[0].model.name_or_path': ['a/model', ''] } },
].sort((a, b) => {
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}) as any;
`;
const sortedArchitectureRoot = fixtureRoot(sortedArchitectureSource);
const reversedArchitectureRoot = fixtureRoot(sortedArchitectureSource.replace(
  'a.label.localeCompare(b.label',
  'b.label.localeCompare(a.label',
));
try {
  const sortedFacts = collectTrainingBookUiFacts(sortedArchitectureRoot).model_architectures;
  const reversedFacts = collectTrainingBookUiFacts(reversedArchitectureRoot).model_architectures;
  assert.deepEqual(sortedFacts.map(item => item.name), ['a', 'z'], 'collector order must execute the live architecture comparator');
  assert.deepEqual(reversedFacts.map(item => item.name), ['z', 'a'], 'reversing the live comparator must reverse emitted facts');
  assert.notDeepEqual(reversedFacts, sortedFacts, 'reverse comparator mutation must not be byte-equivalent');
} finally {
  rmSync(sortedArchitectureRoot, { recursive: true });
  rmSync(reversedArchitectureRoot, { recursive: true });
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
  ['getter return', source.replace("return 'b';", "return 'changed';")],
  ['predicate operator', source.replace('path && path.trim()', 'path || path.trim()')],
  ['setter path', source.replace('train.guidance_loss_target', 'train.audio_loss_multiplier')],
  ['setter value', source.replace('setJobConfig(3.5,', 'setJobConfig(4.5,')],
  ['setter guard', source.replace('if (!config?.config', 'if (config?.config')],
  ['option value', source.replace("value: 'b', label: 'Mode B'", "value: 'both', label: 'Mode B'")],
  ['option label', source.replace("value: 'b', label: 'Mode B'", "value: 'b', label: 'Changed Mode'")],
  ['note href', source.replace('https://example.test/model', 'https://example.test/changed')],
  ['note path', source.replaceAll('model/repo', 'changed/model')],
  ['note text', source.replace('the model page', 'the changed model page')],
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

for (const [label, mutated] of [
  [
    'trailing getValue branch statement',
    source.replace("if (path && path.trim() !== '') return 'b';", "if (path && path.trim() !== '') { return 'b'; sideEffect(); }"),
  ],
  [
    'trailing onChange statement',
    source.replace("      }\n    },\n    doc:", "      }\n      sideEffect();\n    },\n    doc:"),
  ],
  [
    'unsupported getValue loop',
    source.replace("return 'a';\n    },", "while (condition) { break; }\n      return 'a';\n    },"),
  ],
] as const) {
  const mutationRoot = fixtureRoot(mutated);
  try {
    assert.throws(
      () => collectTrainingBookUiFacts(mutationRoot),
      /unsupported|getValue if branch must contain exactly one return|complete if\/else-if branch chain/,
      `${label} must fail closed instead of being ignored`,
    );
  } finally {
    rmSync(mutationRoot, { recursive: true });
  }
}
for (const declaration of [
  'const hidden = sideEffect();',
  'const hidden = 1;',
  'const hidden = config?.config?.process?.[0]?.train?.guidance_loss_target;',
]) {
  const mutationRoot = fixtureRoot(source.replace(
    "if (!config?.config?.process?.[0]?.train?.guidance_loss_target) {",
    `if (!config?.config?.process?.[0]?.train?.guidance_loss_target) { ${declaration}`,
  ));
  try {
    assert.throws(
      () => collectTrainingBookUiFacts(mutationRoot),
      /unsupported onChange statement/,
      `nested onChange declaration must fail closed: ${declaration}`,
    );
  } finally {
    rmSync(mutationRoot, { recursive: true });
  }
}
for (const [label, mutated] of [
  ['second unconditional return', source.replace("      return 'a';", "      return 'a';\n      return 'b';")],
  ['conditional after final return', source.replace("      return 'a';", "      return 'a';\n      if (path) return 'b';")],
] as const) {
  const mutationRoot = fixtureRoot(mutated);
  try {
    assert.throws(
      () => collectTrainingBookUiFacts(mutationRoot),
      /final unconditional return.*last|getValue.*trailing control flow/,
      `${label} must fail unreachable getValue control flow`,
    );
  } finally {
    rmSync(mutationRoot, { recursive: true });
  }
}
for (const [label, mutated] of [
  ['renamed getValue parameter', source.replace('getValue: config =>', 'getValue: renamed =>')],
  ['extra getValue parameter', source.replace('getValue: config =>', 'getValue: (config, extra) =>')],
  ['rest getValue parameter', source.replace('getValue: config =>', 'getValue: (...config) =>')],
  ['defaulted getValue parameter', source.replace('getValue: config =>', 'getValue: (config = fallback) =>')],
  ['optional getValue parameter', source.replace('getValue: config =>', 'getValue: (config?: any) =>')],
  ['destructured getValue parameter', source.replace('getValue: config =>', 'getValue: ({ config }) =>')],
  ['renamed onChange parameter', source.replace('onChange: (value, config, setJobConfig) =>', 'onChange: (renamed, config, setJobConfig) =>')],
  ['extra onChange parameter', source.replace('onChange: (value, config, setJobConfig) =>', 'onChange: (value, config, setJobConfig, extra) =>')],
  ['rest onChange parameter', source.replace('onChange: (value, config, setJobConfig) =>', 'onChange: (value, config, ...setJobConfig) =>')],
  ['defaulted onChange parameter', source.replace('onChange: (value, config, setJobConfig) =>', 'onChange: (value, config = fallback, setJobConfig) =>')],
  ['optional onChange parameter', source.replace('onChange: (value, config, setJobConfig) =>', 'onChange: (value, config?: any, setJobConfig?: any) =>')],
  ['destructured onChange parameter', source.replace('onChange: (value, config, setJobConfig) =>', 'onChange: ({ value }, config, setJobConfig) =>')],
] as const) {
  const mutationRoot = fixtureRoot(mutated);
  try {
    assert.throws(
      () => collectTrainingBookUiFacts(mutationRoot),
      /exact (?:getValue|onChange) callback signature/,
      `${label} must fail the exact callback boundary`,
    );
  } finally {
    rmSync(mutationRoot, { recursive: true });
  }
}
for (const [label, mutated] of [
  ['async getValue', source.replace('getValue: config =>', 'getValue: async config =>')],
  ['generator getValue', source.replace('getValue: config => {', 'getValue: function* (config) {')],
  ['async onChange', source.replace('onChange: (value, config, setJobConfig) =>', 'onChange: async (value, config, setJobConfig) =>')],
  ['generator onChange', source.replace('onChange: (value, config, setJobConfig) => {', 'onChange: function* (value, config, setJobConfig) {')],
] as const) {
  const mutationRoot = fixtureRoot(mutated);
  try {
    assert.throws(
      () => collectTrainingBookUiFacts(mutationRoot),
      /synchronous non-generator (?:getValue|onChange) callback/,
      `${label} must fail the synchronous callback boundary`,
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
for (const [label, mutated] of [
  ['dynamic element attribute', source.replace('<div>Load', '<div data-value={dynamicValue}>Load')],
  ['dynamic self-closing component', source.replace('<div>Load', '<div><DynamicNote value={dynamicValue} />Load')],
  ['unprojected self-closing component', source.replace('<div>Load', '<div><DynamicNote />Load')],
  ['unprojected opening component', source.replace('<div>Load', '<div><DynamicNote>hidden</DynamicNote>Load')],
  ['member component', source.replace('<div>Load', '<div><Dynamic.Note />Load')],
] as const) {
  const mutationRoot = fixtureRoot(mutated);
  try {
    assert.throws(
      () => collectTrainingBookUiFacts(mutationRoot),
      /dynamic JSX attribute|unsupported static JSX attribute|unprojected JSX component|member or dynamic JSX tags/,
      `${label} must not be silently omitted from static JSX facts`,
    );
  } finally {
    rmSync(mutationRoot, { recursive: true });
  }
}

const liveRoot = process.env.TRAINING_BOOK_REPOSITORY_ROOT;
if (liveRoot !== undefined) {
  const declaredTypeScriptSources = collectDeclaredTypeScriptSourcePaths(liveRoot);
  const summaryMigrateSource = readFileSync(join(liveRoot, 'ui/src/app/jobs/new/jobConfig.ts'), 'utf8');
  const summaryArchSource = readFileSync(join(liveRoot, 'ui/src/app/jobs/new/utils.ts'), 'utf8');
  const summaryAnimaSource = readFileSync(join(liveRoot, 'ui/src/helpers/animaModelPaths.ts'), 'utf8');
  const summaryMigrateFacts = collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource);
  const summaryArchFacts = collectHandleModelArchChangeBehaviorClaimsFromSource(summaryArchSource, summaryAnimaSource);
  const recursiveEffectSource = summaryMigrateSource.replace(
    '  if (isMac()) {',
    '  const helpers = {};\n  function install() { helpers.platformCheck = isMac; install(); }\n  install();\n  if (helpers.platformCheck()) {',
  );
  const recursiveEffectStart = Date.now();
  assert.throws(
    () => collectMigrateJobConfigBehaviorClaimsFromSource(recursiveEffectSource),
    /recursive|cycle|tainted|unsupported local invocation/,
    'recursive finite member-effect invocation must fail closed',
  );
  assert.ok(Date.now() - recursiveEffectStart < 2_000, 'recursive finite member-effect rejection must terminate within two seconds');
  const invocationSummaryMissingRejects = [
    ['local config return', summaryMigrateSource.replace('  return jobConfig;', '  function selectConfig() { return jobConfig; }\n  const targetConfig = selectConfig();\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;')],
    ['IIFE config return', summaryMigrateSource.replace('  return jobConfig;', '  const targetConfig = (() => jobConfig)();\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;')],
    ['conditional config return', summaryMigrateSource.replace('  return jobConfig;', '  function selectConfig() { return runtimeCondition ? jobConfig : otherConfig; }\n  const targetConfig = selectConfig();\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;')],
    ['multiple exact config returns', summaryMigrateSource.replace('  return jobConfig;', '  function selectConfig() { if (runtimeCondition) return jobConfig; return jobConfig; }\n  const targetConfig = selectConfig();\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;')],
    ['recursive config return', summaryMigrateSource.replace('  return jobConfig;', '  function selectConfig() { return selectConfig(); }\n  const targetConfig = selectConfig();\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;')],
    ['returned Object.assign', summaryMigrateSource.replace('  return jobConfig;', '  function selectAssign() { return Object.assign; }\n  selectAssign()(jobConfig.config.process[0].train, { steps: 99 });\n  return jobConfig;')],
    ['returned prompt accumulator', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', '    function getSamples() { return newSamples; }\n    getSamples().reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;')],
  ].flatMap(([label, source]) => {
    try { collectMigrateJobConfigBehaviorClaimsFromSource(source); return [label]; } catch { return []; }
  });
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', "  function getSetter() { return setJobConfig; }\n  getSetter()(99, 'config.process[0].train.steps');\n\n  // update samples"),
      summaryAnimaSource,
    );
    invocationSummaryMissingRejects.push('returned setter');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', "  function getCleaned() { return cleaned; }\n  getCleaned().other_path = 'changed';\n  return cleaned;"),
    );
    invocationSummaryMissingRejects.push('returned cleaned model');
  } catch {}
  const invocationSummaryPositiveFailures = [
    ['local helper return', '  function getPlatform() { return isMac; }\n  const platformCheck = getPlatform();\n  if (platformCheck()) {'],
    ['IIFE helper return', '  const platformCheck = (() => isMac)();\n  if (platformCheck()) {'],
    ['multiple exact helper returns', '  function getPlatform() { if (runtimeCondition) return isMac; return isMac; }\n  const platformCheck = getPlatform();\n  if (platformCheck()) {'],
    ['invoked member writer', '  const helpers = {};\n  function install() { helpers.platformCheck = isMac; }\n  install();\n  if (helpers.platformCheck()) {'],
    ['IIFE member writer', '  const helpers = {};\n  (() => { helpers.platformCheck = isMac; })();\n  if (helpers.platformCheck()) {'],
    ['forEach member writer', '  const helpers = {};\n  [1].forEach(() => { helpers.platformCheck = isMac; });\n  if (helpers.platformCheck()) {'],
    ['nested member writer', '  const helpers = {};\n  function installInner() { helpers.platformCheck = isMac; }\n  function install() { installInner(); }\n  install();\n  if (helpers.platformCheck()) {'],
  ].flatMap(([label, replacement]) => {
    try {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts);
      return [];
    } catch { return [label]; }
  });
  assert.deepEqual(
    { missingRejects: invocationSummaryMissingRejects, positiveFailures: invocationSummaryPositiveFailures },
    { missingRejects: [], positiveFailures: [] },
    'finite invocation return summaries and ordered member-effect replay',
  );
  for (const [label, source] of [
    ['member write after use', summaryMigrateSource
      .replace('  if (isMac()) {', '  const helpers = {};\n  if (helpers.platformCheck()) {')
      .replace('  return jobConfig;', '  function install() { helpers.platformCheck = isMac; }\n  install();\n  return jobConfig;')],
    ['member rebind before use', summaryMigrateSource.replace(
      '  if (isMac()) {',
      '  const helpers = {};\n  helpers.platformCheck = isMac;\n  helpers.platformCheck = otherCheck;\n  if (helpers.platformCheck()) {',
    )],
    ['conditional member effect', summaryMigrateSource.replace(
      '  if (isMac()) {',
      '  const helpers = {};\n  function install() { if (runtimeCondition) helpers.platformCheck = isMac; }\n  install();\n  if (helpers.platformCheck()) {',
    )],
    ['return helper implicit fallthrough', summaryMigrateSource.replace(
      '  return jobConfig;',
      '  function selectConfig() { if (runtimeCondition) return jobConfig; }\n  const targetConfig = selectConfig();\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;',
    )],
  ] as const) {
    assert.throws(
      () => collectMigrateJobConfigBehaviorClaimsFromSource(source),
      /tainted|unsupported|requires exact|requires one write|device behavior/,
      `${label} must fail closed`,
    );
  }
  for (const [label, replacement] of [
    ['map member writer', '  const helpers = {};\n  [1].map(() => { helpers.platformCheck = isMac; });\n  if (helpers.platformCheck()) {'],
    ['parameter-bound member writer', '  const helpers = {};\n  function install(target) { target.platformCheck = isMac; }\n  install(helpers);\n  if (helpers.platformCheck()) {'],
    ['same exact conditional effects', '  const helpers = {};\n  function install() { if (runtimeCondition) helpers.platformCheck = isMac; else helpers.platformCheck = isMac; }\n  install();\n  if (helpers.platformCheck()) {'],
    ['uninvoked member writer ignored', '  const helpers = {};\n  function dormant() { helpers.platformCheck = otherCheck; }\n  if (isMac()) {'],
  ] as const) {
    assert.deepEqual(
      collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)),
      summaryMigrateFacts,
      `${label} preserves exact migration facts`,
    );
  }
  const finiteBindingMissingRejects = [
    ['object-pattern config mutation', summaryMigrateSource.replace('  return jobConfig;', "  function mutate({ target }) { target.config.process[0].train.steps = 99; }\n  mutate({ target: jobConfig });\n  return jobConfig;")],
    ['nested-pattern config mutation', summaryMigrateSource.replace('  return jobConfig;', "  function mutate([, { target }]) { target.config.process[0].train.steps = 99; }\n  mutate([0, { target: jobConfig }]);\n  return jobConfig;")],
    ['dynamic spread config mutation', summaryMigrateSource.replace('  return jobConfig;', "  function mutate(target) { target.config.process[0].train.steps = 99; }\n  mutate(...dynamicArgs);\n  return jobConfig;")],
    ['rest-parameter config mutation', summaryMigrateSource.replace('  return jobConfig;', "  function mutate(...args) { args[0].config.process[0].train.steps = 99; }\n  mutate(jobConfig);\n  return jobConfig;")],
    ['sparse callback config mutation', summaryMigrateSource.replace('  return jobConfig;', "  [, jobConfig].forEach(target => { target.config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['dynamic callback element config mutation', summaryMigrateSource.replace('  return jobConfig;', "  [dynamicConfig].forEach(target => { target.config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['unknown callback receiver config mutation', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConfigs.forEach(target => { target.config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['destructured API parameter mutation', summaryMigrateSource.replace('  return jobConfig;', "  function mutate({ assign }) { assign(jobConfig.config.process[0].train, { steps: 99 }); }\n  mutate({ assign: Object.assign });\n  return jobConfig;")],
    ['returned destructured prompt accumulator', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    function getSamples({ target }) { return target; }\n    getSamples({ target: newSamples }).reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].flatMap(([label, source]) => {
    try { collectMigrateJobConfigBehaviorClaimsFromSource(source); return [label]; } catch { return []; }
  });
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', "  function mutate([commit]) { commit(99, 'config.process[0].train.steps'); }\n  mutate([setJobConfig]);\n\n  // update samples"),
      summaryAnimaSource,
    );
    finiteBindingMissingRejects.push('array-pattern setter mutation');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', "  function select({ target }) { return target; }\n  select({ target: cleaned }).other_path = 'changed';\n  return cleaned;"),
    );
    finiteBindingMissingRejects.push('object-pattern cleaned-model mutation');
  } catch {}
  const finiteBindingPositiveFailures = [
    ['object parameter helper', "  function getPlatform({ fn }) { return fn; }\n  const platformCheck = getPlatform({ fn: isMac });\n  if (platformCheck()) {"],
    ['nested array parameter helper', "  function getPlatform([, { fn }]) { return fn; }\n  const platformCheck = getPlatform([0, { fn: isMac }]);\n  if (platformCheck()) {"],
    ['parameter default helper', "  function getPlatform({ fn } = { fn: isMac }) { return fn; }\n  const platformCheck = getPlatform();\n  if (platformCheck()) {"],
    ['binding default helper', "  function getPlatform({ fn = isMac }) { return fn; }\n  const platformCheck = getPlatform({});\n  if (platformCheck()) {"],
    ['direct literal tuple spread', "  const helpers = {};\n  function install(target, fn) { target.platformCheck = fn; }\n  install(...[helpers, isMac]);\n  if (helpers.platformCheck()) {"],
    ['const tuple spread', "  const helpers = {};\n  const args = [helpers, isMac];\n  function install(target, fn) { target.platformCheck = fn; }\n  install(...args);\n  if (helpers.platformCheck()) {"],
    ['call tuple spread', "  const helpers = {};\n  function install(target, fn) { target.platformCheck = fn; }\n  install.call(null, ...[helpers, isMac]);\n  if (helpers.platformCheck()) {"],
    ['bind tuple spread', "  const helpers = {};\n  function install(target, fn) { target.platformCheck = fn; }\n  install.bind(null, ...[helpers])(isMac);\n  if (helpers.platformCheck()) {"],
    ['literal forEach element', "  const helpers = {};\n  [isMac].forEach(fn => { helpers.platformCheck = fn; });\n  if (helpers.platformCheck()) {"],
    ['const-array map element', "  const helpers = {};\n  const callbacks = [isMac];\n  callbacks.map(fn => { helpers.platformCheck = fn; });\n  if (helpers.platformCheck()) {"],
    ['callback index and receiver', "  const helpers = {};\n  [isMac].forEach((fn, index, receiver) => { helpers.platformCheck = receiver[index]; });\n  if (helpers.platformCheck()) {"],
    ['harmless dynamic spread', "  function ignore() { return 1; }\n  ignore(...dynamicArgs);\n  if (isMac()) {"],
    ['harmless unknown callback', "  dynamicItems.forEach(() => 42);\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts);
      return [];
    } catch { return [label]; }
  });
  assert.deepEqual(
    { missingRejects: finiteBindingMissingRejects, positiveFailures: finiteBindingPositiveFailures },
    { missingRejects: [], positiveFailures: [] },
    'finite parameter patterns, tuple spreads, and synchronous callback provenance',
  );
  for (const [label, source] of [
    ['exact tuple-spread config mutation', summaryMigrateSource.replace('  return jobConfig;', "  function mutate(target) { target.config.process[0].train.steps = 99; }\n  mutate(...[jobConfig]);\n  return jobConfig;")],
    ['conditional tuple-spread config mutation', summaryMigrateSource.replace('  return jobConfig;', "  const args = runtimeCondition ? [jobConfig] : [otherConfig];\n  function mutate(target) { target.config.process[0].train.steps = 99; }\n  mutate(...args);\n  return jobConfig;")],
    ['object-rest config mutation', summaryMigrateSource.replace('  return jobConfig;', "  function mutate({ ...rest }) { rest.target.config.process[0].train.steps = 99; }\n  mutate({ target: jobConfig });\n  return jobConfig;")],
    ['callback setter mutation', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].map(target => { target.config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['spread prompt mutation', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    function reorder(target) { target.reverse(); }\n    reorder(...[newSamples]);\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['callback prompt mutation', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    [newSamples].forEach(target => target.reverse());\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ] as const) {
    assert.throws(() => collectMigrateJobConfigBehaviorClaimsFromSource(source), /tainted|unsupported|requires exact|requires one write|accumulator mutation/, `${label} must fail closed`);
  }
  for (const [label, insertion] of [
    ['spread setter mutation', "  function mutate(commit, value, path) { commit(value, path); }\n  mutate(...[setJobConfig, 99, 'config.process[0].train.steps']);\n"],
    ['callback setter mutation', "  [setJobConfig].forEach(commit => commit(99, 'config.process[0].train.steps'));\n"],
  ] as const) {
    assert.throws(
      () => collectHandleModelArchChangeBehaviorClaimsFromSource(summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`), summaryAnimaSource),
      /handleModelArchChange.*behavior|unsupported reachable mutation|unsupported local invocation/,
      `${label} must fail closed`,
    );
  }
  for (const [label, mutation] of [
    ['spread cleaned-model mutation', "  function mutate(target) { target.other_path = 'changed'; }\n  mutate(...[cleaned]);\n"],
    ['callback cleaned-model mutation', "  [cleaned].forEach(target => { target.other_path = 'changed'; });\n"],
  ] as const) {
    assert.throws(
      () => collectHandleModelArchChangeBehaviorClaimsFromSource(summaryArchSource, summaryAnimaSource.replace('  return cleaned;', `${mutation}  return cleaned;`)),
      /Anima path behavior|unsupported reachable model mutation|unsupported local invocation/,
      `${label} must fail closed`,
    );
  }
  for (const [label, replacement] of [
    ['computed object binding key', "  function getPlatform({ ['fn']: selected }) { return selected; }\n  const platformCheck = getPlatform({ fn: isMac });\n  if (platformCheck()) {"],
    ['nested binding default', "  function getPlatform({ nested: { fn = isMac } = {} } = {}) { return fn; }\n  const platformCheck = getPlatform();\n  if (platformCheck()) {"],
    ['explicit undefined parameter default', "  function getPlatform({ fn: selected } = { fn: isMac }) { return selected; }\n  const platformCheck = getPlatform(undefined);\n  if (platformCheck()) {"],
    ['explicit undefined binding default', "  function getPlatform({ fn = isMac }) { return fn; }\n  const platformCheck = getPlatform({ fn: undefined });\n  if (platformCheck()) {"],
    ['spread finite callback receiver', "  const helpers = {};\n  const callbacks = [isMac];\n  [...callbacks].forEach(fn => { helpers.platformCheck = fn; });\n  if (helpers.platformCheck()) {"],
    ['harmless destructuring rest', "  function ignore({ ...rest }) { return 1; }\n  ignore({ value: dynamicValue });\n  if (isMac()) {"],
    ['harmless sparse callback', "  [, dynamicValue].forEach(() => 42);\n  if (isMac()) {"],
  ] as const) {
    assert.deepEqual(
      collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)),
      summaryMigrateFacts,
      `${label} preserves exact migration facts`,
    );
  }
  const callbackProjectionMissingRejects = [
    ['property callback config mutation', summaryMigrateSource.replace('  return jobConfig;', "  const callbacks = { mutate: target => { target.config.process[0].train.steps = 99; } };\n  [jobConfig].forEach(callbacks.mutate);\n  return jobConfig;")],
    ['method callback config mutation', summaryMigrateSource.replace('  return jobConfig;', "  const callbacks = { mutate(target) { target.config.process[0].train.steps = 99; } };\n  [jobConfig].map(callbacks.mutate);\n  return jobConfig;")],
    ['assigned-member callback config mutation', summaryMigrateSource.replace('  return jobConfig;', "  const callbacks = {};\n  callbacks.mutate = target => { target.config.process[0].train.steps = 99; };\n  [jobConfig].forEach(callbacks.mutate);\n  return jobConfig;")],
    ['datasets inline element mutation', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[0].datasets.forEach(dataset => { dataset.extra = 99; });\n  return jobConfig;")],
    ['datasets identifier element mutation', summaryMigrateSource.replace('  return jobConfig;', "  const mutate = dataset => { dataset.extra = 99; };\n  jobConfig.config.process[0].datasets.map(mutate);\n  return jobConfig;")],
    ['datasets member element mutation', summaryMigrateSource.replace('  return jobConfig;', "  const callbacks = { mutate: dataset => { dataset.extra = 99; } };\n  jobConfig.config.process[0].datasets.map(callbacks.mutate);\n  return jobConfig;")],
    ['datasets const receiver mutation', summaryMigrateSource.replace('  return jobConfig;', "  const datasetRows = jobConfig.config.process[0].datasets;\n  datasetRows.forEach(dataset => { dataset.extra = 99; });\n  return jobConfig;")],
    ['datasets rebound member mutation', summaryMigrateSource.replace('  return jobConfig;', "  const callbacks = { mutate: dataset => 42 };\n  callbacks.mutate = dataset => { dataset.extra = 99; };\n  jobConfig.config.process[0].datasets.map(callbacks.mutate);\n  return jobConfig;")],
    ['datasets dynamic callback', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[0].datasets.forEach(dynamicCallback);\n  return jobConfig;")],
    ['validation items inline element mutation', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[0].train.validation_config.validation_items.forEach(item => { item.extra = 99; });\n  return jobConfig;")],
    ['sample items inline element mutation', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[0].sample.samples.forEach(sample => { sample.extra = 99; });\n  return jobConfig;")],
    ['symbolic process index mutation', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process.forEach((process, index, target) => { target[index].train.steps = 99; });\n  return jobConfig;")],
    ['finite receiver index mutation', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].forEach((value, index, receiver) => { receiver[index].config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['finite receiver zero mutation', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].forEach((value, index, receiver) => { receiver[0].config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['target process index mutation', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig.config.process].forEach((target, index) => { target[index].train.steps = 99; });\n  return jobConfig;")],
    ['explicit undefined mutation default', summaryMigrateSource.replace('  return jobConfig;', "  [undefined].forEach((target = jobConfig) => { target.config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['hole callback helper', summaryMigrateSource.replace('  if (isMac()) {', "  const helpers = {};\n  [, isMac].forEach(fn => { helpers.platformCheck = fn; });\n  if (helpers.platformCheck()) {")],
    ['unknown callback element helper', summaryMigrateSource.replace('  if (isMac()) {', "  const helpers = {};\n  [dynamicCallback].forEach(fn => { helpers.platformCheck = fn; });\n  if (helpers.platformCheck()) {")],
  ].flatMap(([label, source]) => {
    try { collectMigrateJobConfigBehaviorClaimsFromSource(source); return [label]; } catch { return []; }
  });
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', "  const callbacks = { mutate: commit => commit(99, 'config.process[0].train.steps') };\n  [setJobConfig].forEach(callbacks.mutate);\n\n  // update samples"),
      summaryAnimaSource,
    );
    callbackProjectionMissingRejects.push('property callback setter mutation');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', "  const callbacks = { mutate(target) { target.other_path = 'changed'; } };\n  [cleaned].forEach(callbacks.mutate);\n  return cleaned;"),
    );
    callbackProjectionMissingRejects.push('method callback cleaned-model mutation');
  } catch {}
  const callbackProjectionPositiveFailures = [
    ['identifier forEach callback', "  const helpers = {};\n  const install = fn => { helpers.platformCheck = fn; };\n  [isMac].forEach(install);\n  if (helpers.platformCheck()) {"],
    ['property map callback', "  const helpers = {};\n  const callbacks = { install: fn => { helpers.platformCheck = fn; } };\n  [isMac].map(callbacks.install);\n  if (helpers.platformCheck()) {"],
    ['method forEach callback', "  const helpers = {};\n  const callbacks = { install(fn) { helpers.platformCheck = fn; } };\n  [isMac].forEach(callbacks.install);\n  if (helpers.platformCheck()) {"],
    ['assigned-member callback', "  const helpers = {};\n  const callbacks = {};\n  callbacks.install = fn => { helpers.platformCheck = fn; };\n  [isMac].forEach(callbacks.install);\n  if (helpers.platformCheck()) {"],
    ['explicit undefined callback default', "  const helpers = {};\n  [undefined].forEach((fn = isMac) => { helpers.platformCheck = fn; });\n  if (helpers.platformCheck()) {"],
    ['callback direct zero access', "  const helpers = {};\n  [isMac].forEach((fn, index, target) => { helpers.platformCheck = target[0]; });\n  if (helpers.platformCheck()) {"],
    ['callback identifier index receiver', "  const helpers = {};\n  function install(fn, index, target) { helpers.platformCheck = target[index]; }\n  [isMac].map(install);\n  if (helpers.platformCheck()) {"],
    ['harmless dynamic thisArg', "  [isMac].forEach(() => 42, dynamicThis);\n  if (isMac()) {"],
    ['callback member rebound harmlessly', "  const callbacks = { mutate: target => { target.config.process[0].train.steps = 99; } };\n  callbacks.mutate = () => 42;\n  [jobConfig].forEach(callbacks.mutate);\n  if (isMac()) {"],
    ['callback passed only as thisArg', "  const mutate = target => { target.config.process[0].train.steps = 99; };\n  [jobConfig].forEach(() => 42, mutate);\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts);
      return [];
    } catch { return [label]; }
  });
  assert.deepEqual(
    { missingRejects: callbackProjectionMissingRejects, positiveFailures: callbackProjectionPositiveFailures },
    { missingRejects: [], positiveFailures: [] },
    'general finite map and forEach callback projection',
  );
  const callbackBoundaryMissingRejects = [
    ['ordinary callback absent thisArg', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].forEach(function () { this.config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['ordinary callback dynamic thisArg', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].forEach(function () { this.config.process[0].train.steps = 99; }, dynamicThis);\n  return jobConfig;")],
    ['arrow ignores dynamic thisArg', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].forEach(() => { jobConfig.config.process[0].train.steps = 99; }, dynamicThis);\n  return jobConfig;")],
    ['unknown callback finite job receiver', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].forEach(dynamicCallback);\n  return jobConfig;")],
    ['unknown callback finite process receiver', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig.config.process].map(dynamicCallback);\n  return jobConfig;")],
    ['dynamic exact-base config index', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[runtimeIndex].train.steps = 99;\n  return jobConfig;")],
    ['callback index plus zero', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig].forEach((value, index, receiver) => { receiver[index + 0].config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['const index plus zero', summaryMigrateSource.replace('  return jobConfig;', "  const zero = 0;\n  jobConfig.config.process[zero + 0].train.steps = 99;\n  return jobConfig;")],
    ['tainted-base dynamic index', summaryMigrateSource.replace('  return jobConfig;', "  let target = jobConfig;\n  if (runtimeCondition) target = otherConfig;\n  target.config.process[runtimeIndex].train.steps = 99;\n  return jobConfig;")],
    ['rebound static index', summaryMigrateSource.replace('  return jobConfig;', "  let index = 0;\n  index = runtimeIndex;\n  jobConfig.config.process[index].train.steps = 99;\n  return jobConfig;")],
    ['unsupported computed index operation', summaryMigrateSource.replace('  return jobConfig;', "  const index = 0;\n  jobConfig.config.process[index * 1].train.steps = 99;\n  return jobConfig;")],
    ['unknown callback const relevant receiver', summaryMigrateSource.replace('  return jobConfig;', "  const receivers = [jobConfig];\n  receivers.forEach(dynamicCallback);\n  return jobConfig;")],
    ['unknown callback sparse relevant receiver', summaryMigrateSource.replace('  return jobConfig;', "  [, jobConfig].forEach(dynamicCallback);\n  return jobConfig;")],
    ['exact thisArg prompt mutation', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const context = { target: newSamples };\n    [1].forEach(function () { this.target.reverse(); }, context);\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].flatMap(([label, source]) => {
    try { collectMigrateJobConfigBehaviorClaimsFromSource(source); return [label]; } catch { return []; }
  });
  const promptBlockStart = summaryMigrateSource.indexOf('  // upgrade prompt strings to samples');
  const promptBlockEnd = summaryMigrateSource.indexOf('  // upgrade job from ui_trainer', promptBlockStart);
  const promptBlock = summaryMigrateSource.slice(promptBlockStart, promptBlockEnd);
  const promptCallbackSource = summaryMigrateSource.replace(
    promptBlock,
    `${promptBlock.slice(0, promptBlock.indexOf('\n') + 1)}  [jobConfig].forEach(target => {\n${promptBlock.slice(promptBlock.indexOf('\n') + 1).replaceAll('jobConfig', 'target')}  });\n\n`,
  );
  const callbackBoundaryPositiveFailures = [
    ['exact ordinary callback thisArg', summaryMigrateSource.replace('  if (isMac()) {', "  const helpers = {};\n  [isMac].forEach(function (fn) { this.platformCheck = fn; }, helpers);\n  if (helpers.platformCheck()) {")],
    ['migrate type callback guard substitution', summaryMigrateSource.replace(
      "  if (jobConfig?.config?.process && jobConfig.config.process[0]?.type === 'ui_trainer') {\n    jobConfig.config.process[0].type = 'diffusion_trainer';\n  }",
      "  [jobConfig].forEach(target => {\n    if (target?.config?.process && target.config.process[0]?.type === 'ui_trainer') {\n      target.config.process[0].type = 'diffusion_trainer';\n    }\n  });",
    )],
    ['migrate auto-memory callback guard and RHS substitution', summaryMigrateSource.replace(
      "  if ('auto_memory' in jobConfig.config.process[0].model) {\n    jobConfig.config.process[0].model.layer_offloading = (jobConfig.config.process[0].model.auto_memory ||\n      false) as boolean;\n    delete jobConfig.config.process[0].model.auto_memory;\n  }",
      "  [jobConfig].forEach(target => {\n    if ('auto_memory' in target.config.process[0].model) {\n      target.config.process[0].model.layer_offloading = (target.config.process[0].model.auto_memory || false) as boolean;\n      delete target.config.process[0].model.auto_memory;\n    }\n  });",
    )],
    ['migrate prompt callback guard and source substitution', promptCallbackSource],
    ['migrate logging callback guard substitution', summaryMigrateSource.replace(
      "  if (!('logging' in jobConfig.config.process[0])) {\n    //@ts-ignore\n    jobConfig.config.process[0].logging = {\n      log_every: 1,\n      use_ui_logger: true,\n    };\n  }",
      "  [jobConfig].forEach(target => {\n    if (!('logging' in target.config.process[0])) {\n      target.config.process[0].logging = { log_every: 1, use_ui_logger: true };\n    }\n  });",
    )],
    ['migrate device callback guard substitution', summaryMigrateSource.replace(
      "  if (isMac()) {\n    jobConfig.config.process[0].device = 'mps';\n  }",
      "  [isMac].forEach(platformCheck => {\n    if (platformCheck()) {\n      jobConfig.config.process[0].device = 'mps';\n    }\n  });",
    )],
    ['exact function declaration callback thisArg', summaryMigrateSource.replace('  if (isMac()) {', "  const helpers = {};\n  function install(fn) { this.platformCheck = fn; }\n  [isMac].map(install, helpers);\n  if (helpers.platformCheck()) {")],
    ['exact method callback thisArg', summaryMigrateSource.replace('  if (isMac()) {', "  const helpers = {};\n  const callbacks = { install(fn) { this.platformCheck = fn; } };\n  [isMac].forEach(callbacks.install, helpers);\n  if (helpers.platformCheck()) {")],
  ].flatMap(([label, source]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(source), summaryMigrateFacts); return []; } catch { return [label]; }
  });
  const animaCallbackFrameSource = summaryAnimaSource
    .replace('if (!supportsTextEncoderPath) delete cleaned.te_name_or_path;', 'if (!supportsTextEncoderPath) [cleaned].forEach(target => { delete target.te_name_or_path; });')
    .replace('if (!supportsVaePath) delete cleaned.vae_path;', 'if (!supportsVaePath) [cleaned].forEach(target => { delete target.vae_path; });');
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(summaryArchSource, animaCallbackFrameSource);
  } catch {
    callbackBoundaryPositiveFailures.push('Anima callback frame excluded from runtime guards');
  }
  const animaOuterGuardSource = summaryAnimaSource.replace(
    'if (!supportsTextEncoderPath) delete cleaned.te_name_or_path;',
    'if (runtimeCondition) { if (!supportsTextEncoderPath) [cleaned].forEach(target => { delete target.te_name_or_path; }); }',
  );
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(summaryArchSource, animaOuterGuardSource);
    callbackBoundaryMissingRejects.push('Anima outer runtime guard counted');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', "  const context = { commit: setJobConfig };\n  [99].forEach(function (value) { this.commit(value, 'config.process[0].train.steps'); }, context);\n\n  // update samples"),
      summaryAnimaSource,
    );
    callbackBoundaryMissingRejects.push('exact thisArg setter mutation');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', "  const context = { target: cleaned };\n  [1].forEach(function () { delete this.target.other_path; }, context);\n  return cleaned;"),
    );
    callbackBoundaryMissingRejects.push('exact thisArg model mutation');
  } catch {}
  const animaNestedCallbackFrameSource = summaryAnimaSource
    .replace('if (!supportsTextEncoderPath) delete cleaned.te_name_or_path;', 'if (!supportsTextEncoderPath) [cleaned].forEach(target => { [target].map(inner => { delete inner.te_name_or_path; }); });')
    .replace('if (!supportsVaePath) delete cleaned.vae_path;', 'if (!supportsVaePath) [cleaned].forEach(target => { [target].map(inner => { delete inner.vae_path; }); });');
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(summaryArchSource, animaNestedCallbackFrameSource);
  } catch {
    callbackBoundaryPositiveFailures.push('nested Anima callback frames excluded from runtime guards');
  }
  for (const [label, replacement] of [
    ['harmless unknown finite callback', "  [1].forEach(dynamicCallback);\n  if (isMac()) {"],
    ['harmless dynamic computed index', "  otherObject[runtimeIndex] = 99;\n  if (isMac()) {"],
    ['harmless sparse unknown callback', "  [, 1].forEach(dynamicCallback);\n  if (isMac()) {"],
  ] as const) {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); }
    catch { callbackBoundaryPositiveFailures.push(label); }
  }
  assert.deepEqual(
    { missingRejects: callbackBoundaryMissingRejects, positiveFailures: callbackBoundaryPositiveFailures },
    { missingRejects: [], positiveFailures: [] },
    'finite callback this, unknown receiver, computed index, and frame semantics',
  );
  const aggregateRelevanceMissingRejects = [
    ['dynamic config aggregate access', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig, otherConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested dynamic config aggregate access', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [[otherConfig], [jobConfig]];\n  targets[runtimeIndex][0].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['spread mixed dynamic config aggregate access', summaryMigrateSource.replace('  return jobConfig;', "  const configTargets = [jobConfig];\n  const targets = [1, ...configTargets];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['unknown spread dynamic config aggregate access', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [...dynamicTargets];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['cyclic dynamic config aggregate access', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig, targets];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['dynamic prompt aggregate access', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const targets = [newSamples, otherSamples];\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['unknown spread dynamic prompt aggregate access', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const targets = [...dynamicTargets];\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['unknown spread callback aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [...dynamicTargets];\n  targets.forEach(dynamicCallback);\n  return jobConfig;")],
    ['cyclic callback aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig, targets];\n  targets.forEach(dynamicCallback);\n  return jobConfig;")],
    ['exact static aggregate selection', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig];\n  targets[0].config.process[0].train.steps = 99;\n  return jobConfig;")],
  ].flatMap(([label, source]) => {
    try { collectMigrateJobConfigBehaviorClaimsFromSource(source); return [label]; } catch { return []; }
  });
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', "  const setters = [setJobConfig, otherSetter];\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n\n  // update samples"),
      summaryAnimaSource,
    );
    aggregateRelevanceMissingRejects.push('dynamic setter aggregate access');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', "  const setters = [[otherSetter], [setJobConfig]];\n  setters[runtimeIndex][0](99, 'config.process[0].train.steps');\n\n  // update samples"),
      summaryAnimaSource,
    );
    aggregateRelevanceMissingRejects.push('nested dynamic setter aggregate access');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', "  const targets = [cleaned, otherModel];\n  delete targets[runtimeIndex].other_path;\n  return cleaned;"),
    );
    aggregateRelevanceMissingRejects.push('dynamic model aggregate access');
  } catch {}
  try {
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', "  const targets = [[otherModel], [cleaned]];\n  delete targets[runtimeIndex][0].other_path;\n  return cleaned;"),
    );
    aggregateRelevanceMissingRejects.push('nested dynamic model aggregate access');
  } catch {}
  const aggregateRelevancePositiveFailures = [
    ['harmless nested finite callback', "  [[1], [2]].forEach(dynamicCallback);\n  if (isMac()) {"],
    ['harmless const spread nested callback', "  const values = [1, 2];\n  [[...values]].forEach(dynamicCallback);\n  if (isMac()) {"],
    ['harmless mixed literal callback', "  [1, 'two', null, undefined].forEach(dynamicCallback);\n  if (isMac()) {"],
    ['harmless dynamic nested access', "  const values = [[1], [2]];\n  values[runtimeIndex][0];\n  if (isMac()) {"],
    ['harmless sparse nested callback', "  [, [1], [2]].forEach(dynamicCallback);\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  assert.deepEqual(
    { missingRejects: aggregateRelevanceMissingRejects, positiveFailures: aggregateRelevancePositiveFailures },
    { missingRejects: [], positiveFailures: [] },
    'recursive finite aggregate relevance joins',
  );
  const configLeafMissingRejects = [
    ['literal homogeneous config leaves', summaryMigrateSource.replace('  return jobConfig;', "  [jobConfig, jobConfig][runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['const homogeneous config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig, jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['aliased config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig];\n  const aliases = targets;\n  aliases[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['spread config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig];\n  const spreadTargets = [...targets];\n  spreadTargets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['sparse config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [, jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested homogeneous config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [[jobConfig], [jobConfig]];\n  targets[runtimeIndex][0].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['callback-projected config leaves', summaryMigrateSource.replace('  return jobConfig;', "  [[jobConfig], [jobConfig]].forEach(targets => { targets[runtimeIndex].config.process[0].train.steps = 99; });\n  return jobConfig;")],
    ['Object.assign config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig, jobConfig];\n  Object.assign(targets[runtimeIndex].config.process[0].train, { steps: 99 });\n  return jobConfig;")],
    ['Reflect.set config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig, jobConfig];\n  Reflect.set(targets[runtimeIndex].config.process[0].train, 'steps', 99);\n  return jobConfig;")],
    ['Reflect.deleteProperty config leaves', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [jobConfig, jobConfig];\n  Reflect.deleteProperty(targets[runtimeIndex].config.process[0].train, 'steps');\n  return jobConfig;")],
  ].flatMap(([label, source]) => {
    try { collectMigrateJobConfigBehaviorClaimsFromSource(source); return [label]; } catch { return []; }
  });
  const configLeafPositiveFailures = [
    ['static homogeneous config leaf', "  const targets = [jobConfig, jobConfig];\n  targets[0];\n  if (isMac()) {"],
    ['harmless homogeneous numeric leaves', "  const targets = [1, 1];\n  otherObject.value = targets[runtimeIndex];\n  if (isMac()) {"],
    ['harmless nested sparse leaves', "  const targets = [[, 1], [, 1]];\n  targets[runtimeIndex][1];\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  assert.deepEqual(
    { missingRejects: configLeafMissingRejects, positiveFailures: configLeafPositiveFailures },
    { missingRejects: [], positiveFailures: [] },
    'config consumers inspect aggregate leaves and identities',
  );
  const latticeAggregateMissingRejects = [
    ['static conditional config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = true ? [jobConfig] : [otherConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['static logical config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = false || [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['static nullish config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = null ?? [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime conditional config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = runtimeCondition ? [jobConfig] : [otherConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['helper-returned config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  function selectTargets() { return [jobConfig]; }\n  selectTargets()[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['IIFE-returned config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  (() => [jobConfig])()[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['recursive helper config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  function selectTargets() { return selectTargets(); }\n  selectTargets()[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['object-member config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { targets: [jobConfig] };\n  holder.targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['assigned-member config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const holder = {};\n  holder.targets = [jobConfig];\n  holder.targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['rebound-member config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { targets: [jobConfig] };\n  if (runtimeCondition) holder.targets = [otherConfig];\n  holder.targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['object-destructured config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const { targets } = { targets: [jobConfig] };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['array-destructured config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const [targets] = [[jobConfig]];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['call-returned config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  function selectTargets() { return [jobConfig]; }\n  selectTargets.call(null)[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['apply-returned config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  function selectTargets() { return [jobConfig]; }\n  selectTargets.apply(null, [])[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['bind-returned config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  function selectTargets() { return [jobConfig]; }\n  selectTargets.bind(null)()[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['method-returned config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { selectTargets() { return [jobConfig]; } };\n  holder.selectTargets()[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['same-branch config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = runtimeCondition ? [jobConfig] : [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['object-destructure-default config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const { targets = [jobConfig] } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['array-destructure-default config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const [targets = [jobConfig]] = [];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime object-destructure-default config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const { targets = [jobConfig] } = runtimeHolder;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime array-destructure-default config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const [targets = [jobConfig]] = runtimeTargets;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['member-cycle config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const holder = {};\n  holder.targets = [jobConfig, holder.targets];\n  holder.targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['rebound-method config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { selectTargets() { return [jobConfig]; } };\n  if (runtimeCondition) holder.selectTargets = () => [otherConfig];\n  holder.selectTargets()[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['helper-returned prompt aggregate', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    function selectTargets() { return [newSamples]; }\n    selectTargets()[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['member prompt aggregate', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const holder = { targets: [newSamples] };\n    holder.targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['runtime conditional prompt aggregate', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const targets = runtimeCondition ? [newSamples] : [otherSamples];\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].flatMap(([label, source]) => {
    try { collectMigrateJobConfigBehaviorClaimsFromSource(source); return [label]; } catch { return []; }
  });
  for (const [label, insertion] of [
    ['IIFE-returned setter aggregate', "  (() => [setJobConfig])()[runtimeIndex](99, 'config.process[0].train.steps');\n"],
    ['member setter aggregate', "  const holder = { setters: [setJobConfig] };\n  holder.setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
    ['object-destructured setter aggregate', "  const { setters } = { setters: [setJobConfig] };\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
    ['static logical setter aggregate', "  const setters = false || [setJobConfig];\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
  ] as const) {
    try {
      collectHandleModelArchChangeBehaviorClaimsFromSource(
        summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
        summaryAnimaSource,
      );
      latticeAggregateMissingRejects.push(label);
    } catch {}
  }
  for (const [label, insertion] of [
    ['helper-returned model aggregate', "  function selectTargets() { return [cleaned]; }\n  delete selectTargets()[runtimeIndex].other_path;\n"],
    ['assigned-member model aggregate', "  const holder = {};\n  holder.targets = [cleaned];\n  delete holder.targets[runtimeIndex].other_path;\n"],
    ['array-destructured model aggregate', "  const [targets] = [[cleaned]];\n  delete targets[runtimeIndex].other_path;\n"],
    ['static nullish model aggregate', "  const targets = null ?? [cleaned];\n  delete targets[runtimeIndex].other_path;\n"],
  ] as const) {
    try {
      collectHandleModelArchChangeBehaviorClaimsFromSource(
        summaryArchSource,
        summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
      );
      latticeAggregateMissingRejects.push(label);
    } catch {}
  }
  const latticeAggregatePositiveFailures = [
    ['harmless static conditional aggregate', "  const values = true ? [1] : [jobConfig];\n  otherObject.value = values[runtimeIndex];\n  if (isMac()) {"],
    ['harmless static logical aggregate', "  const values = false || [1];\n  otherObject.value = values[runtimeIndex];\n  if (isMac()) {"],
    ['harmless helper-returned aggregate', "  function selectValues() { return [1]; }\n  otherObject.value = selectValues()[runtimeIndex];\n  if (isMac()) {"],
    ['harmless member aggregate', "  const holder = { values: [1] };\n  otherObject.value = holder.values[runtimeIndex];\n  if (isMac()) {"],
    ['harmless destructured aggregate', "  const { values } = { values: [1] };\n  otherObject.value = values[runtimeIndex];\n  if (isMac()) {"],
    ['harmless call-returned aggregate', "  function selectValues() { return [1]; }\n  otherObject.value = selectValues.call(null)[runtimeIndex];\n  if (isMac()) {"],
    ['harmless method-returned aggregate', "  const holder = { selectValues() { return [1]; } };\n  otherObject.value = holder.selectValues()[runtimeIndex];\n  if (isMac()) {"],
    ['harmless same-branch aggregate', "  const values = runtimeCondition ? [1] : [1];\n  otherObject.value = values[runtimeIndex];\n  if (isMac()) {"],
    ['harmless destructure-default aggregate', "  const { values = [1] } = {};\n  otherObject.value = values[runtimeIndex];\n  if (isMac()) {"],
    ['harmless member cycle', "  const holder = {};\n  holder.values = [1, holder.values];\n  otherObject.value = holder.values[runtimeIndex];\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  assert.deepEqual(
    { missingRejects: latticeAggregateMissingRejects, positiveFailures: latticeAggregatePositiveFailures },
    { missingRejects: [], positiveFailures: [] },
    'finite aggregate relevance consumes the shared provenance lattice',
  );
  const boundedFactsRejection = (label: string, run: () => unknown): string | undefined => {
    const started = Date.now();
    try {
      run();
      return `${label}: accepted`;
    } catch (error) {
      const elapsed = Date.now() - started;
      if (error instanceof RangeError) return `${label}: RangeError after ${elapsed}ms`;
      if (!(error instanceof Error) || error.constructor.name !== 'FactsError') return `${label}: ${String(error)}`;
      if (elapsed > 2_000) return `${label}: FactsError took ${elapsed}ms`;
      return undefined;
    }
  };
  const runtimeLogicalFailures = [
    ['runtime && config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = runtimeCondition && [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime || config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = runtimeCondition || [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime ?? config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = runtimeCondition ?? [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['static true && config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const targets = true && [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['same-origin runtime logical config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  const candidate = [jobConfig];\n  const targets = candidate || candidate;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['helper runtime logical config aggregate', summaryMigrateSource.replace('  return jobConfig;', "  function selectTargets() { return runtimeCondition && [jobConfig]; }\n  selectTargets()[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime && prompt aggregate', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const targets = runtimeCondition && [newSamples];\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['helper runtime nullish prompt aggregate', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    function selectTargets() { return runtimeCondition ?? [newSamples]; }\n    selectTargets()[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['runtime || setter aggregate', "  const setters = runtimeCondition || [setJobConfig];\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
    ['helper runtime logical setter aggregate', "  function selectSetters() { return runtimeCondition && [setJobConfig]; }\n  selectSetters()[runtimeIndex](99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) runtimeLogicalFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['runtime ?? model aggregate', "  const targets = runtimeCondition ?? [cleaned];\n  delete targets[runtimeIndex].other_path;\n"],
    ['helper runtime logical model aggregate', "  function selectTargets() { return runtimeCondition || [cleaned]; }\n  delete selectTargets()[runtimeIndex].other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) runtimeLogicalFailures.push(failure);
  }
  const stableProjectionFailures = [
    ['runtime object default projection', summaryMigrateSource.replace('  return jobConfig;', "  const { targets = [jobConfig] } = runtimeHolder;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime array default projection', summaryMigrateSource.replace('  return jobConfig;', "  const [targets = [jobConfig]] = runtimeTargets;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime object projection', summaryMigrateSource.replace('  return jobConfig;', "  const { targets } = runtimeHolder;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['runtime array projection', summaryMigrateSource.replace('  return jobConfig;', "  const [targets] = runtimeTargets;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested runtime object default projection', summaryMigrateSource.replace('  return jobConfig;', "  const { nested: { targets = [jobConfig] } = {} } = runtimeHolder;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['multiple runtime object default projections', summaryMigrateSource.replace('  return jobConfig;', "  const { values = [1], targets = [jobConfig] } = runtimeHolder;\n  values;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['separate static member projection keys', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { values: [1], targets: [jobConfig] };\n  const { values, targets } = holder;\n  otherObject.value = values[runtimeIndex];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['cyclic member default projection', summaryMigrateSource.replace('  return jobConfig;', "  const holder = {};\n  holder.targets = holder.targets;\n  const { targets = [jobConfig] } = holder;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  const staticLogicalPositiveFailures = [
    ['static false && excludes aggregate', "  const targets = false && [jobConfig];\n  otherObject.value = targets;\n  if (isMac()) {"],
    ['static true || excludes aggregate', "  const targets = true || [jobConfig];\n  otherObject.value = targets;\n  if (isMac()) {"],
    ['static nonnull ?? excludes aggregate', "  const targets = 0 ?? [jobConfig];\n  otherObject.value = targets;\n  if (isMac()) {"],
    ['separate harmless projection keys', "  const holder = { values: [1], others: [2] };\n  const { values, others } = holder;\n  otherObject.value = [values[runtimeIndex], others[runtimeIndex]];\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  assert.deepEqual(
    { runtimeLogicalFailures, stableProjectionFailures, staticLogicalPositiveFailures },
    { runtimeLogicalFailures: [], stableProjectionFailures: [], staticLogicalPositiveFailures: [] },
    'runtime logical joins and destructuring projections fail closed with bounded completion',
  );
  const destructureDefaultFailures = [
    ['declaration unshadowed undefined default', summaryMigrateSource.replace('  return jobConfig;', "  const { targets = [jobConfig] } = { targets: undefined };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['declaration void zero default', summaryMigrateSource.replace('  return jobConfig;', "  const { targets = [jobConfig] } = { targets: void 0 };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['declaration runtime-value default', summaryMigrateSource.replace('  return jobConfig;', "  const { targets = [jobConfig] } = { targets: runtimeTargets };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['declaration call-result default', summaryMigrateSource.replace('  return jobConfig;', "  const { targets = [jobConfig] } = { targets: maybeTargets() };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested declaration undefined default', summaryMigrateSource.replace('  return jobConfig;', "  const { nested: { targets = [jobConfig] } } = { nested: { targets: undefined } };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['literal-computed declaration undefined default', summaryMigrateSource.replace('  return jobConfig;', "  const { ['targets']: targets = [jobConfig] } = { targets: undefined };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['dynamic-computed declaration default', summaryMigrateSource.replace('  return jobConfig;', "  const { [runtimeKey]: targets = [jobConfig] } = runtimeHolder;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['undefined source uses default helper', summaryMigrateSource.replace('  return jobConfig;', "  function fallbackTargets() { return [jobConfig]; }\n  const { targets = fallbackTargets() } = { targets: undefined };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['undefined source uses renamed default', summaryMigrateSource.replace('  return jobConfig;', "  const fallbackTargets = [jobConfig];\n  const { targets = fallbackTargets } = { targets: undefined };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['assignment unshadowed undefined default', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ targets = [jobConfig] } = { targets: undefined });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['assignment void zero default', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ targets = [jobConfig] } = { targets: void 0 });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['assignment possibly undefined default', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ targets = [jobConfig] } = runtimeHolder);\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['assignment call-result default', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ targets = [jobConfig] } = { targets: maybeTargets() });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['computed assignment undefined default', summaryMigrateSource.replace('  return jobConfig;', "  const key = 'targets';\n  let targets = [otherConfig];\n  ({ [key]: targets = [jobConfig] } = { targets: undefined });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested assignment undefined default', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ nested: { targets = [jobConfig] } } = { nested: { targets: undefined } });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['array assignment undefined default', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  [targets = [jobConfig]] = [undefined];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['array assignment runtime default', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  [targets = [jobConfig]] = runtimeTargets;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['array assignment cyclic default', summaryMigrateSource.replace('  return jobConfig;', "  const values = [];\n  values[0] = values;\n  let targets = [otherConfig];\n  [targets = [jobConfig]] = values;\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['prompt declaration undefined default', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const { targets = [newSamples] } = { targets: undefined };\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['prompt assignment undefined default', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    let targets = [otherSamples];\n    ({ targets = [newSamples] } = { targets: undefined });\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['setter declaration undefined default', "  const { setters = [setJobConfig] } = { setters: undefined };\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
    ['setter assignment undefined default', "  let setters = [otherSetter];\n  ({ setters = [setJobConfig] } = { setters: undefined });\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) destructureDefaultFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['model declaration undefined default', "  const { targets = [cleaned] } = { targets: undefined };\n  delete targets[runtimeIndex].other_path;\n"],
    ['model assignment undefined default', "  let targets = [otherModel];\n  ({ targets = [cleaned] } = { targets: undefined });\n  delete targets[runtimeIndex].other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) destructureDefaultFailures.push(failure);
  }
  for (const [label, source] of [
    ['nested object fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { holder: { targets } = { targets: [jobConfig] } } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested array fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const [[targets] = [[jobConfig]]] = [];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['mixed object-array fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { holder: [targets] = [[jobConfig]] } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['renamed nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { holder: { source: targets } = { source: [jobConfig] } } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['computed nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const key = 'source';\n  const { holder: { [key]: targets } = { source: [jobConfig] } } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['aliased nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = { targets: [jobConfig] };\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['called nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  function fallback() { return { targets: [jobConfig] }; }\n  const { holder: { targets } = fallback() } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['multi-level nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { outer: { holder: { targets } = { targets: [jobConfig] } } = {} } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['tainted nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = runtimeCondition ? { targets: [jobConfig] } : { targets: [otherConfig] };\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested rest fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { holder: { ...targets } = { config: jobConfig } } = {};\n  targets.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested assignment fallback config', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ holder: { targets } = { targets: [jobConfig] } } = {});\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['explicit-undefined nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { holder: { targets } = { targets: [jobConfig] } } = { holder: undefined };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['void nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { holder: { targets } = { targets: [jobConfig] } } = { holder: void 0 };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['maybe nested fallback config', summaryMigrateSource.replace('  return jobConfig;', "  const { holder: { targets } = { targets: [jobConfig] } } = { holder: maybeHolder() };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested object fallback prompt', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const { holder: { targets } = { targets: [newSamples] } } = {};\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['nested array fallback prompt', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const [[targets] = [[newSamples]]] = [];\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source));
    if (failure !== undefined) destructureDefaultFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['nested object fallback setter', "  const { holder: { setters } = { setters: [setJobConfig] } } = {};\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
    ['nested array fallback setter', "  const [[setters] = [[setJobConfig]]] = [];\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) destructureDefaultFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['nested object fallback model', "  const { holder: { targets } = { targets: [cleaned] } } = {};\n  delete targets[runtimeIndex].other_path;\n"],
    ['nested array fallback model', "  const [[targets] = [[cleaned]]] = [];\n  delete targets[runtimeIndex].other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) destructureDefaultFailures.push(failure);
  }
  const destructureDefaultPositiveFailures = [
    ['declaration null does not default', "  const { targets = [jobConfig] } = { targets: null };\n  targets;\n  if (isMac()) {"],
    ['declaration present value does not default', "  const { targets = [jobConfig] } = { targets: [otherConfig] };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['declaration shadowed undefined does not default', "  const undefined = [otherConfig];\n  const { targets = [jobConfig] } = { targets: undefined };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['declaration exact computed key', "  const key = 'targets';\n  const { [key]: targets = [jobConfig] } = { targets: [otherConfig] };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['assignment null does not default', "  let targets = [otherConfig];\n  ({ targets = [jobConfig] } = { targets: null });\n  targets;\n  if (isMac()) {"],
    ['assignment present value does not default', "  let targets = [otherConfig];\n  ({ targets = [jobConfig] } = { targets: [otherConfig] });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['assignment shadowed undefined does not default', "  const undefined = [otherConfig];\n  let targets = [otherConfig];\n  ({ targets = [jobConfig] } = { targets: undefined });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['present source skips default helper', "  function fallbackTargets() { return [jobConfig]; }\n  const { targets = fallbackTargets() } = { targets: [otherConfig] };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['assignment exact computed key', "  const key = 'targets';\n  let targets = [otherConfig];\n  ({ [key]: targets = [jobConfig] } = { targets: [otherConfig] });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['present source skips renamed default', "  const fallbackTargets = [jobConfig];\n  const { targets = fallbackTargets } = { targets: [otherConfig] };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['array assignment present value control', "  let targets = [otherConfig];\n  [targets = [jobConfig]] = [[otherConfig]];\n  targets[runtimeIndex];\n  if (isMac()) {"],
    ['nested present source skips fallback', "  const { holder: { targets } = { targets: [jobConfig] } } = { holder: { targets: [otherConfig] } };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['harmless cyclic nested fallback completes', "  const fallback: any = {};\n  fallback.targets = fallback;\n  const { holder: { targets } = fallback } = {};\n  targets;\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  assert.deepEqual(
    { destructureDefaultFailures, destructureDefaultPositiveFailures },
    { destructureDefaultFailures: [], destructureDefaultPositiveFailures: [] },
    'destructuring defaults distinguish undefined, present, and ambiguous source values',
  );
  const projectedMemberTimelineFailures = [
    ['direct member update before fallback projection', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = { targets: [otherConfig] };\n  fallback.targets = [jobConfig];\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['helper member update before fallback projection', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = { targets: [otherConfig] };\n  function install() { fallback.targets = [jobConfig]; }\n  install();\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['Object.assign before fallback projection', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = { targets: [otherConfig] };\n  Object.assign(fallback, { targets: [jobConfig] });\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['Reflect.set before fallback projection', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = { targets: [otherConfig] };\n  Reflect.set(fallback, 'targets', [jobConfig]);\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['aliased Object.assign before fallback projection', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = { targets: [otherConfig] };\n  const assign = Object.assign;\n  assign(fallback, { targets: [jobConfig] });\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['destructured Reflect.set before fallback projection', summaryMigrateSource.replace('  return jobConfig;', "  const fallback = { targets: [otherConfig] };\n  const { set } = Reflect;\n  set(fallback, 'targets', [jobConfig]);\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['cyclic member update before fallback projection', summaryMigrateSource.replace('  return jobConfig;', "  const fallback: any = { targets: [otherConfig] };\n  fallback.targets = [jobConfig, fallback.targets];\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['prompt member update before fallback projection', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const fallback = { targets: [otherSamples] };\n    fallback.targets = [newSamples];\n    const { holder: { targets } = fallback } = {};\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['setter member update before fallback projection', "  const fallback = { setters: [otherSetter] };\n  Object.assign(fallback, { setters: [setJobConfig] });\n  const { holder: { setters } = fallback } = {};\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) projectedMemberTimelineFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['model member update before fallback projection', "  const fallback = { targets: [otherModel] };\n  Reflect.set(fallback, 'targets', [cleaned]);\n  const { holder: { targets } = fallback } = {};\n  delete targets[runtimeIndex].other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) projectedMemberTimelineFailures.push(failure);
  }
  const nestedAssignmentDefaultFailures = [
    ['nested assignment absent config', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ holder: { targets } = { targets: [jobConfig] } } = {});\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested assignment undefined config', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ holder: { targets } = { targets: [jobConfig] } } = { holder: undefined });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested assignment maybe config', summaryMigrateSource.replace('  return jobConfig;', "  let targets = [otherConfig];\n  ({ holder: { targets } = { targets: [jobConfig] } } = runtimeHolder);\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested assignment absent prompt', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    let targets = [otherSamples];\n    ({ holder: { targets } = { targets: [newSamples] } } = {});\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['nested assignment absent setter', "  let setters = [otherSetter];\n  ({ holder: { setters } = { setters: [setJobConfig] } } = {});\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) nestedAssignmentDefaultFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['nested assignment absent model', "  let targets = [otherModel];\n  ({ holder: { targets } = { targets: [cleaned] } } = {});\n  delete targets[runtimeIndex].other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) nestedAssignmentDefaultFailures.push(failure);
  }
  const projectedDefaultPositiveFailures = [
    ['member update after fallback projection', "  const fallback = { targets: [otherConfig] };\n  const { holder: { targets } = fallback } = {};\n  fallback.targets = [jobConfig];\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['member update overwritten before fallback projection', "  const fallback = { targets: [jobConfig] };\n  fallback.targets = [otherConfig];\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['unused relevant fallback with present source', "  const fallback = { targets: [jobConfig] };\n  const { holder: { targets } = fallback } = { holder: { targets: [otherConfig] } };\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['nested assignment present source skips fallback', "  let targets = [jobConfig];\n  ({ holder: { targets } = { targets: [jobConfig] } } = { holder: { targets: [otherConfig] } });\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['shadowed Object.assign does not update fallback', "  const fallback = { targets: [otherConfig] };\n  const Object = { assign() {} };\n  Object.assign(fallback, { targets: [jobConfig] });\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['rebound Object.assign alias does not update fallback', "  const fallback = { targets: [otherConfig] };\n  let assign = Object.assign;\n  assign = (_target, _source) => {};\n  assign(fallback, { targets: [jobConfig] });\n  const { holder: { targets } = fallback } = {};\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  try {
    assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      "    const fallback = { targets: [newSamples] };\n    let targets = [newSamples];\n    ({ holder: { targets } = fallback } = { holder: { targets: [otherSamples] } });\n    targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;",
    )), summaryMigrateFacts);
  } catch { projectedDefaultPositiveFailures.push('nested assignment present prompt skips fallback'); }
  try {
    assert.deepEqual(collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace(
        '  // update samples',
        "  const fallback = { setters: [setJobConfig] };\n  let setters = [setJobConfig];\n  ({ holder: { setters } = fallback } = { holder: { setters: [otherSetter] } });\n  setters[runtimeIndex](99, 'config.process[0].train.steps');\n\n  // update samples",
      ),
      summaryAnimaSource,
    ), summaryArchFacts);
  } catch { projectedDefaultPositiveFailures.push('nested assignment present setter skips fallback'); }
  try {
    assert.deepEqual(collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace(
        '  return cleaned;',
        "  const fallback = { targets: [cleaned] };\n  let targets = [cleaned];\n  ({ holder: { targets } = fallback } = { holder: { targets: [otherModel] } });\n  delete targets[runtimeIndex].other_path;\n  return cleaned;",
      ),
    ), summaryArchFacts);
  } catch { projectedDefaultPositiveFailures.push('nested assignment present model skips fallback'); }
  assert.deepEqual(
    { projectedMemberTimelineFailures, nestedAssignmentDefaultFailures, projectedDefaultPositiveFailures },
    { projectedMemberTimelineFailures: [], nestedAssignmentDefaultFailures: [], projectedDefaultPositiveFailures: [] },
    'nested projections honor member timelines and assignment default selection',
  );
  const logicalMemberJoinFailures = [
    ['unknown && member assignment', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { targets: [jobConfig] };\n  runtimeCondition && (holder.targets = [otherConfig]);\n  holder.targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['unknown || member assignment', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { targets: [jobConfig] };\n  runtimeCondition || (holder.targets = [otherConfig]);\n  holder.targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['unknown ?? member assignment', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { targets: [jobConfig] };\n  runtimeCondition ?? (holder.targets = [otherConfig]);\n  holder.targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['unknown logical prompt member assignment', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const holder = { targets: [newSamples] };\n    runtimeCondition && (holder.targets = [otherSamples]);\n    holder.targets[runtimeIndex].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['unknown logical setter member assignment', "  const holder = { setters: [setJobConfig] };\n  runtimeCondition || (holder.setters = [otherSetter]);\n  holder.setters[runtimeIndex](99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) logicalMemberJoinFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['unknown logical model member assignment', "  const holder = { targets: [cleaned] };\n  runtimeCondition ?? (holder.targets = [otherModel]);\n  delete holder.targets[runtimeIndex].other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) logicalMemberJoinFailures.push(failure);
  }
  const unmodeledIdentityFailures = [
    ['unmodeled config consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer(jobConfig);\n  return jobConfig;")],
    ['unmodeled returned config consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer(jobConfig).config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['unmodeled consumer of returned config identity', summaryMigrateSource.replace('  return jobConfig;', "  function selectTarget() { return runtimeCondition ? jobConfig : otherConfig; }\n  dynamicConsumer(selectTarget());\n  return jobConfig;")],
    ['unmodeled finite config aggregate consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer({ primary: jobConfig, secondary: otherConfig });\n  return jobConfig;")],
    ['unmodeled finite array config consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer([otherConfig, [jobConfig]]);\n  return jobConfig;")],
    ['unmodeled ambiguous object spread consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer({ ...otherObject });\n  return jobConfig;")],
    ['unmodeled ambiguous array spread consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer([...otherValues]);\n  return jobConfig;")],
    ['unmodeled accessor object consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer({ get target() { return otherConfig; } });\n  return jobConfig;")],
    ['unmodeled computed object consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer({ [runtimeKey]: otherConfig });\n  return jobConfig;")],
    ['unmodeled cyclic aggregate consumer', summaryMigrateSource.replace('  return jobConfig;', "  function selectTarget() { return runtimeCondition ? jobConfig : selectTarget(); }\n  dynamicConsumer(selectTarget());\n  return jobConfig;")],
    ['unmodeled prompt consumer', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    dynamicConsumer(newSamples);\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['unmodeled returned prompt consumer', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    dynamicConsumer(newSamples).reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['unmodeled setter consumer', "  dynamicConsumer(setJobConfig);\n"],
    ['unmodeled returned setter consumer', "  dynamicConsumer(setJobConfig)(99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) unmodeledIdentityFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['unmodeled model consumer', "  dynamicConsumer(cleaned);\n"],
    ['unmodeled returned model consumer', "  delete dynamicConsumer(cleaned).other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) unmodeledIdentityFailures.push(failure);
  }
  const finiteObjectAggregateFailures = [
    ['dynamic finite object config selection', summaryMigrateSource.replace('  return jobConfig;', "  const targets = { primary: jobConfig, secondary: otherConfig };\n  targets[runtimeKey].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested dynamic finite object config selection', summaryMigrateSource.replace('  return jobConfig;', "  const targets = { primary: { target: jobConfig }, secondary: { target: otherConfig } };\n  targets[runtimeKey].target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['dynamic finite object prompt selection', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const targets = { primary: newSamples, secondary: otherSamples };\n    targets[runtimeKey].reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['dynamic projected-member config write', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  holder[runtimeKey] = jobConfig;\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['dynamic projected-member prompt write', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const holder = { target: otherSamples };\n    holder[runtimeKey] = newSamples;\n    holder.target.reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
    ['bounded dynamic projected-member cycle', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  holder[runtimeKey] = holder;\n  holder[runtimeKey] = jobConfig;\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['dynamic finite object setter selection', "  const setters = { primary: setJobConfig, secondary: otherSetter };\n  setters[runtimeKey](99, 'config.process[0].train.steps');\n"],
    ['dynamic projected-member setter write', "  const holder = { commit: otherSetter };\n  holder[runtimeKey] = setJobConfig;\n  holder.commit(99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) finiteObjectAggregateFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['dynamic finite object model selection', "  const targets = { primary: cleaned, secondary: otherModel };\n  delete targets[runtimeKey].other_path;\n"],
    ['dynamic projected-member model write', "  const holder = { target: otherModel };\n  holder[runtimeKey] = cleaned;\n  delete holder.target.other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) finiteObjectAggregateFailures.push(failure);
  }
  const possiblyUndefinedDefaultFailures = [
    ['aliased undefined parameter default', summaryMigrateSource.replace('  return jobConfig;', "  const missing = undefined;\n  function mutate(target = jobConfig) { target.config.process[0].train.steps = 99; }\n  mutate(missing);\n  return jobConfig;")],
    ['aliased undefined object binding default', summaryMigrateSource.replace('  return jobConfig;', "  const missing = undefined;\n  function mutate({ target = jobConfig }) { target.config.process[0].train.steps = 99; }\n  mutate({ target: missing });\n  return jobConfig;")],
    ['aliased undefined array binding default', summaryMigrateSource.replace('  return jobConfig;', "  const missing = undefined;\n  function mutate([target = jobConfig]) { target.config.process[0].train.steps = 99; }\n  mutate([missing]);\n  return jobConfig;")],
    ['aliased undefined returned default', summaryMigrateSource.replace('  return jobConfig;', "  const missing = undefined;\n  function select(target = jobConfig) { return target; }\n  select(missing).config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['possibly undefined supplied config', summaryMigrateSource.replace('  return jobConfig;', "  const maybeTarget = runtimeCondition ? otherConfig : undefined;\n  function mutate(target = jobConfig) { target.config.process[0].train.steps = 99; }\n  mutate(maybeTarget);\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['aliased undefined setter default', "  const missing = undefined;\n  function mutate(commit = setJobConfig) { commit(99, 'config.process[0].train.steps'); }\n  mutate(missing);\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) possiblyUndefinedDefaultFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['aliased undefined model default', "  const missing = undefined;\n  function mutate(target = cleaned) { delete target.other_path; }\n  mutate(missing);\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) possiblyUndefinedDefaultFailures.push(failure);
  }
  const sharedProvenancePositiveFailures = [
    ['static false && member assignment', "  const holder = { targets: [otherConfig] };\n  false && (holder.targets = [jobConfig]);\n  dynamicConsumer(holder.targets[runtimeIndex]);\n  if (isMac()) {"],
    ['static true || member assignment', "  const holder = { targets: [otherConfig] };\n  true || (holder.targets = [jobConfig]);\n  dynamicConsumer(holder.targets[runtimeIndex]);\n  if (isMac()) {"],
    ['static present ?? member assignment', "  const holder = { targets: [otherConfig] };\n  0 ?? (holder.targets = [jobConfig]);\n  dynamicConsumer(holder.targets[runtimeIndex]);\n  if (isMac()) {"],
    ['harmless unknown call and object', "  const value = dynamicFactory(otherObject);\n  value.other = 1;\n  if (isMac()) {"],
    ['harmless unrelated local return consumer', "  function selectOther() { return runtimeCondition ? otherConfig : otherObject; }\n  dynamicConsumer(selectOther());\n  if (isMac()) {"],
    ['harmless primitive aggregate consumer', "  dynamicConsumer({ first: 1, nested: [2] });\n  if (isMac()) {"],
    ['harmless exact spread and computed consumer', "  const safeKey = 'value';\n  dynamicConsumer({ ...{ first: 1 }, [safeKey]: [...[2]] });\n  if (isMac()) {"],
    ['modeled harmless consumer shadows unknown', "  function dynamicConsumer(_value) { return 1; }\n  dynamicConsumer(jobConfig);\n  if (isMac()) {"],
    ['rebound consumer becomes modeled', "  let consume = dynamicConsumer;\n  consume = (_value) => 1;\n  consume(jobConfig);\n  if (isMac()) {"],
    ['harmless finite object selection', "  const values = { first: 1, second: 2 };\n  otherObject.value = values[runtimeKey];\n  if (isMac()) {"],
    ['harmless dynamic projected-member write', "  const holder = { value: 1 };\n  holder[runtimeKey] = 2;\n  otherObject.value = holder.value;\n  if (isMac()) {"],
    ['absent invocation default', "  function getPlatform(fn = isMac) { return fn; }\n  const platformCheck = getPlatform();\n  if (platformCheck()) {"],
    ['aliased undefined invocation default', "  const missing = undefined;\n  function getPlatform(fn = isMac) { return fn; }\n  const platformCheck = getPlatform(missing);\n  if (platformCheck()) {"],
    ['exact present invocation argument', "  function getPlatform(fn = otherCheck) { return fn; }\n  const platformCheck = getPlatform(isMac);\n  if (platformCheck()) {"],
    ['exact null skips invocation default', "  function mutate(target = jobConfig) { target.config.process[0].train.steps = 99; }\n  mutate(null);\n  if (isMac()) {"],
    ['shadowed undefined skips invocation default', "  const undefined = otherConfig;\n  function mutate(target = jobConfig) { target.config.process[0].train.steps = 99; }\n  mutate(undefined);\n  if (isMac()) {"],
    ['rebound missing skips invocation default', "  let missing = undefined;\n  missing = otherConfig;\n  function mutate(target = jobConfig) { target.config.process[0].train.steps = 99; }\n  mutate(missing);\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  assert.deepEqual(
    {
      logicalMemberJoinFailures,
      unmodeledIdentityFailures,
      finiteObjectAggregateFailures,
      possiblyUndefinedDefaultFailures,
      sharedProvenancePositiveFailures,
    },
    {
      logicalMemberJoinFailures: [],
      unmodeledIdentityFailures: [],
      finiteObjectAggregateFailures: [],
      possiblyUndefinedDefaultFailures: [],
      sharedProvenancePositiveFailures: [],
    },
    'shared fail-closed provenance covers logical member joins, unknown calls, finite objects, dynamic writes, and invocation defaults',
  );
  const reviewTaintedMemberFailures = [
    ['nested conditional config member write', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  if (runtimeCondition) { if (otherCondition) holder.target = jobConfig; }\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['conditional dynamic config member write', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  if (runtimeCondition) holder[runtimeKey] = jobConfig;\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested conditional prompt member write', summaryMigrateSource.replace('    jobConfig.config.process[0].sample.samples = newSamples;', "    const holder = { target: otherSamples };\n    if (runtimeCondition) { if (otherCondition) holder.target = newSamples; }\n    holder.target.reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['conditional dynamic setter member write', "  const holder = { commit: otherSetter };\n  if (runtimeCondition) holder[runtimeKey] = setJobConfig;\n  holder.commit(99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) reviewTaintedMemberFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['nested conditional cleaned member write', "  const holder = { target: otherModel };\n  if (runtimeCondition) { if (otherCondition) holder.target = cleaned; }\n  delete holder.target.other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) reviewTaintedMemberFailures.push(failure);
  }
  const reviewObjectProjectionFailures = [
    ['duplicate literal unsafe last', "  const holder = { target: otherConfig, target: jobConfig };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['computed property unsafe last', "  const key = 'target';\n  const holder = { target: otherConfig, [key]: jobConfig };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['exact spread unsafe last', "  const holder = { target: otherConfig, ...{ target: jobConfig } };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['unknown spread unsafe last', "  const holder = { target: otherConfig, ...otherObject };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['getter definition shadowed by unsafe last', "  const holder = { get target() { return otherConfig; }, target: jobConfig };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const reviewDestructuringWriteFailures = [
    ['array destructuring config member write', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  [holder.target] = [jobConfig];\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['object destructuring config member write', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  ({ target: holder.target } = { target: jobConfig });\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['nested destructuring config member write', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  ({ nested: [holder.target] } = { nested: [jobConfig] });\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['object destructuring setter member write', "  const holder = { commit: otherSetter };\n  ({ commit: holder.commit } = { commit: setJobConfig });\n  holder.commit(99, 'config.process[0].train.steps');\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource.replace('  // update samples', `${insertion}\n  // update samples`),
      summaryAnimaSource,
    ));
    if (failure !== undefined) reviewDestructuringWriteFailures.push(failure);
  }
  for (const [label, insertion] of [
    ['array destructuring cleaned member write', "  const holder = { target: otherModel };\n  [holder.target] = [cleaned];\n  delete holder.target.other_path;\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) reviewDestructuringWriteFailures.push(failure);
  }
  const reviewUnknownBuiltinFailures = [
    ['array push adds relevant config target', summaryMigrateSource.replace('  return jobConfig;', "  const targets = [otherConfig];\n  targets.push(jobConfig);\n  targets[runtimeIndex].config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['non-array config map receiver', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[0].train.map();\n  return jobConfig;")],
    ['non-array config forEach receiver', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[0].model.forEach();\n  return jobConfig;")],
    ['non-array config push receiver', summaryMigrateSource.replace('  return jobConfig;', "  jobConfig.config.process[0].train.push(otherConfig);\n  return jobConfig;")],
    ['own map consumer', summaryMigrateSource.replace('  return jobConfig;', "  const items = { map: dynamicConsumer };\n  items.map(jobConfig);\n  return jobConfig;")],
    ['own map on exact array', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.defineProperty(items, 'map', { value: dynamicConsumer });\n  items.map(jobConfig);\n  return jobConfig;")],
    ['rebound map consumer', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.map = dynamicConsumer;\n  items.map(jobConfig);\n  return jobConfig;")],
    ['global prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  Array.prototype.map = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['assigned global prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  Object.assign(Array.prototype, { map: dynamicConsumer });\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['defined global prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  Object.defineProperty(Array.prototype, 'map', { value: dynamicConsumer });\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['local prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.setPrototypeOf(items, { map: dynamicConsumer });\n  items.map(jobConfig);\n  return jobConfig;")],
    ['conditional global prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  if (runtimeCondition) Array.prototype.map = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['dynamic global prototype member rebound', summaryMigrateSource.replace('  return jobConfig;', "  Array.prototype[runtimeKey] = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['aliased global prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const ArrayAlias = Array;\n  ArrayAlias.prototype.map = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['aliased assigned prototype push rebound', summaryMigrateSource.replace('  return jobConfig;', "  const ArrayAlias = Array;\n  Object.assign(ArrayAlias.prototype, { push: dynamicConsumer });\n  const items = [];\n  items.push(jobConfig);\n  return jobConfig;")],
    ['aliased defined prototype forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  const ArrayAlias = Array;\n  Object.defineProperty(ArrayAlias.prototype, 'forEach', { value: dynamicConsumer });\n  const items = [];\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['destructured prototype alias map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const { prototype: arrayPrototype } = Array;\n  arrayPrototype.map = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['ambiguous rebound Array alias map', summaryMigrateSource.replace('  return jobConfig;', "  let ArrayAlias = Array;\n  if (runtimeCondition) ArrayAlias = otherArrayLike;\n  ArrayAlias.prototype.map = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['computed global prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  Array['prototype']['map'] = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['dynamic global prototype key rebound', summaryMigrateSource.replace('  return jobConfig;', "  Array[runtimeKey].map = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module global prototype map rebound', summaryMigrateSource.replace('export const migrateJobConfig', "Array.prototype.map = dynamicConsumer;\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module assigned prototype push rebound', summaryMigrateSource.replace('export const migrateJobConfig', "Object.assign(Array.prototype, { push: dynamicConsumer });\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.push(jobConfig);\n  return jobConfig;")],
    ['module defined prototype forEach rebound', summaryMigrateSource.replace('export const migrateJobConfig', "Object.defineProperty(Array.prototype, 'forEach', { value: dynamicConsumer });\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['later module prototype map rebound', `${summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")}\nArray.prototype.map = dynamicConsumer;`],
    ['legacy local prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.__proto__ = { map: dynamicConsumer };\n  items.map(jobConfig);\n  return jobConfig;")],
    ['legacy local prototype forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.__proto__ = { forEach: dynamicConsumer };\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['legacy local prototype push rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.__proto__ = { push: dynamicConsumer };\n  items.push(jobConfig);\n  return jobConfig;")],
    ['computed legacy prototype map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items['__proto__'] = { map: dynamicConsumer };\n  items.map(jobConfig);\n  return jobConfig;")],
    ['legacy prototype direct map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.__proto__.map = dynamicConsumer;\n  items.map(jobConfig);\n  return jobConfig;")],
    ['legacy prototype direct forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.__proto__.forEach = dynamicConsumer;\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['legacy prototype direct push rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.__proto__.push = dynamicConsumer;\n  items.push(jobConfig);\n  return jobConfig;")],
    ['legacy prototype assigned map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.assign(items.__proto__, { map: dynamicConsumer });\n  items.map(jobConfig);\n  return jobConfig;")],
    ['legacy prototype assigned forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.assign(items.__proto__, { forEach: dynamicConsumer });\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['legacy prototype assigned push rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.assign(items.__proto__, { push: dynamicConsumer });\n  items.push(jobConfig);\n  return jobConfig;")],
    ['legacy prototype defined map rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.defineProperty(items.__proto__, 'map', { value: dynamicConsumer });\n  items.map(jobConfig);\n  return jobConfig;")],
    ['legacy prototype defined forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.defineProperty(items.__proto__, 'forEach', { value: dynamicConsumer });\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['legacy prototype defined push rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.defineProperty(items.__proto__, 'push', { value: dynamicConsumer });\n  items.push(jobConfig);\n  return jobConfig;")],
    ['dynamic legacy prototype key rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items[runtimeKey] = { map: dynamicConsumer };\n  items.map(jobConfig);\n  return jobConfig;")],
    ['own forEach consumer', summaryMigrateSource.replace('  return jobConfig;', "  const items = { forEach: dynamicConsumer };\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['own forEach on exact array', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.defineProperty(items, 'forEach', { value: dynamicConsumer });\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['rebound forEach consumer', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.forEach = dynamicConsumer;\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['global prototype forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  Array.prototype.forEach = dynamicConsumer;\n  const items = [];\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['assigned global prototype forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  Object.assign(Array.prototype, { forEach: dynamicConsumer });\n  const items = [];\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['defined global prototype forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  Object.defineProperty(Array.prototype, 'forEach', { value: dynamicConsumer });\n  const items = [];\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['local prototype forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.setPrototypeOf(items, { forEach: dynamicConsumer });\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['conditional local prototype forEach rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  if (runtimeCondition) Object.setPrototypeOf(items, { forEach: dynamicConsumer });\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['own push consumer', summaryMigrateSource.replace('  return jobConfig;', "  const items = { push: dynamicConsumer };\n  items.push(jobConfig);\n  return jobConfig;")],
    ['own push on exact array', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.defineProperty(items, 'push', { value: dynamicConsumer });\n  items.push(jobConfig);\n  return jobConfig;")],
    ['rebound push consumer', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  items.push = dynamicConsumer;\n  items.push(jobConfig);\n  return jobConfig;")],
    ['global prototype push rebound', summaryMigrateSource.replace('  return jobConfig;', "  Array.prototype.push = dynamicConsumer;\n  const items = [];\n  items.push(jobConfig);\n  return jobConfig;")],
    ['assigned global prototype push rebound', summaryMigrateSource.replace('  return jobConfig;', "  Object.assign(Array.prototype, { push: dynamicConsumer });\n  const items = [];\n  items.push(jobConfig);\n  return jobConfig;")],
    ['defined global prototype push rebound', summaryMigrateSource.replace('  return jobConfig;', "  Object.defineProperty(Array.prototype, 'push', { value: dynamicConsumer });\n  const items = [];\n  items.push(jobConfig);\n  return jobConfig;")],
    ['local prototype push rebound', summaryMigrateSource.replace('  return jobConfig;', "  const items = [];\n  Object.setPrototypeOf(items, { push: dynamicConsumer });\n  items.push(jobConfig);\n  return jobConfig;")],
    ['Reflect.apply dynamic consumer', summaryMigrateSource.replace('  return jobConfig;', "  Reflect.apply(dynamicConsumer, null, [jobConfig]);\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  const reviewDefaultEffectFailures = [
    ['absent config parameter default effect', summaryMigrateSource.replace('  return jobConfig;', "  function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {}\n  use();\n  return jobConfig;")],
    ['undefined config parameter default effect', summaryMigrateSource.replace('  return jobConfig;', "  function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {}\n  use(undefined);\n  return jobConfig;")],
    ['maybe undefined config parameter default effect', summaryMigrateSource.replace('  return jobConfig;', "  const maybeTarget = runtimeCondition ? otherConfig : undefined;\n  function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {}\n  use(maybeTarget);\n  return jobConfig;")],
    ['object binding config default effect', summaryMigrateSource.replace('  return jobConfig;', "  function use({ target = (jobConfig.config.process[0].train.steps = 99, otherConfig) } = {}) {}\n  use({});\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, insertion] of [
    ['undefined cleaned model default effect', "  function use(target = (delete cleaned.other_path, otherModel)) {}\n  use(undefined);\n"],
    ['maybe undefined cleaned model default effect', "  const maybeTarget = runtimeCondition ? otherModel : undefined;\n  function use(target = (delete cleaned.other_path, otherModel)) {}\n  use(maybeTarget);\n"],
  ] as const) {
    const failure = boundedFactsRejection(label, () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      summaryArchSource,
      summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
    ));
    if (failure !== undefined) reviewDefaultEffectFailures.push(failure);
  }
  const reviewLogicalAliasFailures = [
    ['rebound false alias remains unknown', summaryMigrateSource.replace('  return jobConfig;', "  let flag = false;\n  flag = runtimeCondition;\n  const holder = { target: otherConfig };\n  flag && (holder.target = jobConfig);\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['unknown const alias remains unknown', summaryMigrateSource.replace('  return jobConfig;', "  const flag = runtimeCondition;\n  const holder = { target: otherConfig };\n  flag || (holder.target = jobConfig);\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  const reviewPositiveFailures = [
    ['nested conditional unrelated member', "  const holder = { target: otherConfig };\n  if (runtimeCondition) { if (otherCondition) holder.target = otherTarget; }\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['conditional dynamic unrelated member', "  const holder = { target: otherConfig };\n  if (runtimeCondition) holder[runtimeKey] = otherTarget;\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['duplicate literal safe last', "  const holder = { target: jobConfig, target: otherConfig };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['computed property safe last', "  const key = 'target';\n  const holder = { target: jobConfig, [key]: otherConfig };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['exact spread safe last', "  const holder = { target: jobConfig, ...{ target: otherConfig } };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['unknown spread shadowed by safe last', "  const holder = { ...otherObject, target: otherConfig };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['getter shadowed by safe last', "  const holder = { get target() { return jobConfig; }, target: otherConfig };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['array destructuring safe member overwrite', "  const holder = { target: jobConfig };\n  [holder.target] = [otherConfig];\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['object destructuring safe member overwrite', "  const holder = { target: jobConfig };\n  ({ target: holder.target } = { target: otherConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['exact native array methods', "  [jobConfig].map(() => 1);\n  [jobConfig].forEach(() => 1);\n  const items = [];\n  items.push(jobConfig);\n  if (isMac()) {"],
    ['const-array native methods', "  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['known config-array native methods', "  jobConfig.config.process.map(() => 1);\n  jobConfig.config.process[0].datasets.forEach(() => 1);\n  jobConfig.config.process[0].sample.samples.map(() => 1);\n  jobConfig.config.process[0].train.validation_config.validation_items.forEach(() => 1);\n  if (isMac()) {"],
    ['later prototype rebind preserves earlier native calls', "  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  Array.prototype.map = dynamicConsumer;\n  Array.prototype.forEach = dynamicConsumer;\n  Array.prototype.push = dynamicConsumer;\n  if (isMac()) {"],
    ['later mutation APIs preserve earlier native calls', "  [jobConfig].map(() => 1);\n  [jobConfig].forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  Object.assign(Array.prototype, { map: dynamicConsumer });\n  Object.defineProperty(Array.prototype, 'forEach', { value: dynamicConsumer });\n  const unrelated = [];\n  unrelated.push(otherConfig);\n  Object.setPrototypeOf(unrelated, { push: dynamicConsumer });\n  if (isMac()) {"],
    ['unrelated object prototype rebind preserves array natives', "  const unrelated = {};\n  Object.setPrototypeOf(unrelated, { map: dynamicConsumer, forEach: dynamicConsumer, push: dynamicConsumer });\n  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['shadowed Array prototype writes preserve global natives', "  {\n    const Array = { prototype: {} };\n    Array.prototype.map = dynamicConsumer;\n    Array.prototype.forEach = dynamicConsumer;\n    Array.prototype.push = dynamicConsumer;\n  }\n  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['shadowed Object prototype APIs preserve array natives', "  {\n    const Object = { assign: dynamicConsumer, defineProperty: dynamicConsumer, setPrototypeOf: dynamicConsumer };\n    const unrelated = {};\n    Object.assign(unrelated, { map: otherConsumer });\n    Object.defineProperty(unrelated, 'forEach', { value: otherConsumer });\n    Object.setPrototypeOf(unrelated, { push: otherConsumer });\n  }\n  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['restored native array methods remain exact', "  const nativeMap = [].map;\n  const nativeForEach = [].forEach;\n  const nativePush = [].push;\n  Array.prototype.map = dynamicConsumer;\n  Array.prototype.forEach = dynamicConsumer;\n  Array.prototype.push = dynamicConsumer;\n  Array.prototype.map = nativeMap;\n  Array.prototype.forEach = nativeForEach;\n  Array.prototype.push = nativePush;\n  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['exact Array alias without mutation preserves natives', "  const ArrayAlias = Array;\n  ArrayAlias;\n  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['shadowed Array alias prototype writes are unrelated', "  {\n    const ArrayAlias = { prototype: {} };\n    ArrayAlias.prototype.map = dynamicConsumer;\n    Object.assign(ArrayAlias.prototype, { forEach: dynamicConsumer });\n    Object.defineProperty(ArrayAlias.prototype, 'push', { value: dynamicConsumer });\n  }\n  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['exact unrelated rebound Array alias is harmless', "  let ArrayAlias = Array;\n  ArrayAlias = { prototype: {} };\n  ArrayAlias.prototype.map = dynamicConsumer;\n  const items = [jobConfig];\n  items.map(() => 1);\n  if (isMac()) {"],
    ['later legacy prototype rebind preserves earlier call', "  const items = [];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  items.push(otherConfig);\n  items.__proto__ = { map: dynamicConsumer, forEach: dynamicConsumer, push: dynamicConsumer };\n  if (isMac()) {"],
    ['unrelated dynamic prototype key is harmless', "  otherObject[runtimeKey] = { map: dynamicConsumer, forEach: dynamicConsumer, push: dynamicConsumer };\n  const items = [jobConfig];\n  items.map(() => 1);\n  items.forEach(() => 1);\n  const output = [];\n  output.push(jobConfig);\n  if (isMac()) {"],
    ['selected present config skips default effect', "  function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {}\n  use(otherConfig);\n  if (isMac()) {"],
    ['selected null config skips default effect', "  function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {}\n  use(null);\n  if (isMac()) {"],
    ['const false alias dead && branch', "  const flag = false;\n  const holder = { target: otherConfig };\n  flag && (holder.target = jobConfig);\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['chained false alias dead && branch', "  const first = false;\n  const flag = first;\n  const holder = { target: otherConfig };\n  flag && (holder.target = jobConfig);\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['const true alias certain && branch', "  const flag = true;\n  const holder = { target: jobConfig };\n  flag && (holder.target = otherConfig);\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['const true alias dead || branch', "  const flag = true;\n  const holder = { target: otherConfig };\n  flag || (holder.target = jobConfig);\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['const false alias certain || branch', "  const flag = false;\n  const holder = { target: jobConfig };\n  flag || (holder.target = otherConfig);\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['const present alias dead nullish branch', "  const value = 0;\n  const holder = { target: otherConfig };\n  value ?? (holder.target = jobConfig);\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['const null alias certain nullish branch', "  const value = null;\n  const holder = { target: jobConfig };\n  value ?? (holder.target = otherConfig);\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
  ].flatMap(([label, replacement]) => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts); return []; }
    catch { return [label]; }
  });
  for (const [label, insertion] of [
    ['selected present model skips default effect', "  function use(target = (delete cleaned.other_path, otherModel)) {}\n  use(otherModel);\n"],
  ] as const) {
    try {
      assert.deepEqual(collectHandleModelArchChangeBehaviorClaimsFromSource(
        summaryArchSource,
        summaryAnimaSource.replace('  return cleaned;', `${insertion}  return cleaned;`),
      ), summaryArchFacts);
    } catch { reviewPositiveFailures.push(label); }
  }
  const reviewAppendedRootFailures = [
    ['non-array map consumer', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer.map(jobConfig);\n  return jobConfig;")],
    ['nested conditional member RHS join', summaryMigrateSource.replace('  return jobConfig;', "  const holder = { target: otherConfig };\n  if (runtimeA) { if (runtimeB) holder.target = runtimeCondition ? jobConfig : otherConfig; }\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['mutated named spread source', summaryMigrateSource.replace('  return jobConfig;', "  const source = { target: otherConfig };\n  source.target = jobConfig;\n  const holder = { ...source };\n  holder.target.config.process[0].train.steps = 99;\n  return jobConfig;")],
    ['dynamic spread may select config default', summaryMigrateSource.replace('  return jobConfig;', "  function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {}\n  use(...runtimeArgs);\n  return jobConfig;")],
    ['unknown callback may select config default', summaryMigrateSource.replace('  return jobConfig;', "  dynamicConsumer(function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {});\n  return jobConfig;")],
    ['const true direct and branch stays live', summaryMigrateSource.replace('  return jobConfig;', "  const directFlag = true;\n  directFlag && (jobConfig.config.process[0].train.steps = 99);\n  return jobConfig;")],
    ['const false direct or branch stays live', summaryMigrateSource.replace('  return jobConfig;', "  const directFlag = false;\n  directFlag || (jobConfig.config.process[0].train.steps = 99);\n  return jobConfig;")],
    ['const null direct nullish branch stays live', summaryMigrateSource.replace('  return jobConfig;', "  const directValue = null;\n  directValue ?? (jobConfig.config.process[0].train.steps = 99);\n  return jobConfig;")],
    ['rebound direct logical branch stays unknown', summaryMigrateSource.replace('  return jobConfig;', "  let directFlag = false;\n  directFlag = runtimeCondition;\n  directFlag && (jobConfig.config.process[0].train.steps = 99);\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  for (const [label, replacement] of [
    ['unrelated non-array map call', "  dynamicConsumer.map(otherConfig);\n  if (isMac()) {"],
    ['nested conditional unrelated RHS join', "  const holder = { target: otherConfig };\n  if (runtimeA) { if (runtimeB) holder.target = runtimeCondition ? otherConfig : otherTarget; }\n  dynamicConsumer(holder.target);\n  if (isMac()) {"],
    ['mutated named spread safe last', "  const source = { target: jobConfig };\n  source.target = otherConfig;\n  const holder = { ...source };\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['finite present spread skips config default', "  function use(target = (jobConfig.config.process[0].train.steps = 99, otherConfig)) {}\n  const args = [otherConfig];\n  use(...args);\n  if (isMac()) {"],
    ['unknown callback harmless default', "  dynamicConsumer(function use(target = (otherConfig.other = 1, otherConfig)) {});\n  if (isMac()) {"],
    ['const false direct and branch is dead', "  const directFlag = false;\n  directFlag && (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['const true direct or branch is dead', "  const directFlag = true;\n  directFlag || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['const present direct nullish branch is dead', "  const directValue = 0;\n  directValue ?? (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['const false direct call branch is dead', "  const directFlag = false;\n  directFlag && dynamicConsumer(jobConfig);\n  if (isMac()) {"],
  ] as const) {
    try {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts);
    } catch {
      reviewPositiveFailures.push(label);
    }
  }
  const repeatedCalls = Array.from({ length: 32 }, () => '  inspectRepeated(holder);').join('\n');
  const repeatedQuerySource = summaryMigrateSource.replace(
    '  if (isMac()) {',
    `  const holder = { target: otherConfig };\n  function inspectRepeated(value) { dynamicConsumer(value.target); }\n${repeatedCalls}\n  if (isMac()) {`,
  );
  const repeatedQueryStarted = Date.now();
  const reviewRepeatedQueryFailures: string[] = [];
  try {
    assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(repeatedQuerySource), summaryMigrateFacts);
  } catch {
    reviewRepeatedQueryFailures.push('same-binding repeated query changed semantics');
  }
  const repeatedQueryElapsed = Date.now() - repeatedQueryStarted;
  if (repeatedQueryElapsed > 3_000) reviewRepeatedQueryFailures.push(`32 same-binding repeated queries took ${repeatedQueryElapsed}ms`);
  assert.deepEqual(
    {
      reviewTaintedMemberFailures,
      reviewObjectProjectionFailures,
      reviewDestructuringWriteFailures,
      reviewUnknownBuiltinFailures,
      reviewDefaultEffectFailures,
      reviewLogicalAliasFailures,
      reviewPositiveFailures,
      reviewAppendedRootFailures,
      reviewRepeatedQueryFailures,
    },
    {
      reviewTaintedMemberFailures: [],
      reviewObjectProjectionFailures: [],
      reviewDestructuringWriteFailures: [],
      reviewUnknownBuiltinFailures: [],
      reviewDefaultEffectFailures: [],
      reviewLogicalAliasFailures: [],
      reviewPositiveFailures: [],
      reviewAppendedRootFailures: [],
      reviewRepeatedQueryFailures: [],
    },
    'reviewed provenance roots preserve taint, exact object order, destructuring writes, built-in identity, default effects, and lexical logical constants',
  );
  const nextReviewDynamicMutationFailures = [
    ['dynamic defineProperty config key', "  const holder = { target: otherConfig };\n  Object.defineProperty(holder, runtimeKey, { value: jobConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['dynamic Reflect.set config key', "  const holder = { target: otherConfig };\n  Reflect.set(holder, runtimeKey, jobConfig);\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['dynamic defineProperty array method key', "  const items = [];\n  Object.defineProperty(items, runtimeKey, { value: dynamicConsumer });\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['dynamic Reflect.set array method key', "  const items = [];\n  Reflect.set(items, runtimeKey, dynamicConsumer);\n  items.forEach(jobConfig);\n  if (isMac()) {"],
    ['dynamic defineProperty legacy prototype key', "  const items = [];\n  Object.defineProperty(items, runtimeKey, { value: { push: dynamicConsumer } });\n  items.push(jobConfig);\n  if (isMac()) {"],
    ['dynamic Reflect.set legacy prototype key', "  const items = [];\n  Reflect.set(items, runtimeKey, { map: dynamicConsumer });\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['dynamic defineProperty global prototype key', "  Object.defineProperty(Array.prototype, runtimeKey, { value: dynamicConsumer });\n  const items = [];\n  items.push(jobConfig);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const nextReviewDescriptorOrderFailures = [
    ['descriptor duplicate unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperty(holder, 'target', { value: otherConfig, value: jobConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['descriptor computed unsafe last', "  const descriptorKey = 'value';\n  const holder = { target: otherConfig };\n  Object.defineProperty(holder, 'target', { value: otherConfig, [descriptorKey]: jobConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['descriptor spread unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperty(holder, 'target', { value: otherConfig, ...{ value: jobConfig } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['descriptor unknown spread unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperty(holder, 'target', { value: otherConfig, ...runtimeDescriptor });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['descriptor accessor unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperty(holder, 'target', { value: otherConfig, get value() { return jobConfig; } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const nextReviewEscapeFailures = [
    ['escaped exact array before map', "  const items = [];\n  dynamicConsumer(items);\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['escaped Array prototype before forEach', "  dynamicConsumer(Array.prototype);\n  const items = [];\n  items.forEach(jobConfig);\n  if (isMac()) {"],
    ['escaped method holder before prototype install', "  const nativePush = [].push;\n  const methods = { push: nativePush };\n  dynamicConsumer(methods);\n  Array.prototype.push = methods.push;\n  const items = [];\n  items.push(jobConfig);\n  if (isMac()) {"],
    ['own map call escapes exact array', "  const items = [];\n  const consumer = { map: dynamicConsumer };\n  consumer.map(items);\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['rebound push call escapes exact array', "  const items = [];\n  const consumer = [];\n  consumer.push = dynamicConsumer;\n  consumer.push(items);\n  items.map(jobConfig);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const nextReviewModuleExecutionFailures = [
    ['invoked module helper mutates native', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; }\ninstall();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module IIFE mutates native', summaryMigrateSource.replace('export const migrateJobConfig', "(() => { Array.prototype.forEach = dynamicConsumer; })();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.forEach(jobConfig);\n  return jobConfig;")],
    ['recursive module effect cycle', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.push = dynamicConsumer; install(); }\ninstall();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.push(jobConfig);\n  return jobConfig;")],
    ['dynamic module call escapes prototype', summaryMigrateSource.replace('export const migrateJobConfig', "dynamicConsumer(Array.prototype);\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['invoked parameterized module helper mutates native', summaryMigrateSource.replace('export const migrateJobConfig', "function install(target, consumer) { target.map = consumer; }\ninstall(Array.prototype, dynamicConsumer);\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  const nextReviewExecutedAccessorFailures = [
    ['destructured argument getter effect', "  function consume({ target }) {}\n  consume({ get target() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  if (isMac()) {"],
    ['object spread getter effect', "  const source = { get target() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } };\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['spread argument iterator effect', "  const iterable = { [Symbol.iterator]() { jobConfig.config.process[0].train.steps = 99; return [otherConfig][Symbol.iterator](); } };\n  function consume(target) {}\n  consume(...iterable);\n  if (isMac()) {"],
    ['unknown relevant getter effect', "  const source = { get target() { dynamicConsumer(jobConfig); return otherConfig; } };\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['unknown relevant iterator identity', "  const iterable = { value: jobConfig, [runtimeKey]: dynamicConsumer };\n  function consume(target) {}\n  consume(...iterable);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const nextReviewFunctionPrototypeFailures = [
    ['global Function call rebound', "  Function.prototype.call = dynamicConsumer;\n  function consume(target) {}\n  consume.call(null, jobConfig);\n  if (isMac()) {"],
    ['assigned global Function apply rebound', "  Object.assign(Function.prototype, { apply: dynamicConsumer });\n  function consume(target) {}\n  consume.apply(null, [jobConfig]);\n  if (isMac()) {"],
    ['defined global Function bind rebound', "  Object.defineProperty(Function.prototype, 'bind', { value: dynamicConsumer });\n  function consume(target) {}\n  consume.bind(null, jobConfig)();\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const nextReviewLexicalAssignmentFailures = [
    ['const true alias live if assignment', "  const flag = true;\n  const holder = { target: otherConfig };\n  if (flag) holder.target = jobConfig;\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['rebound false alias unknown if assignment', "  let flag = false;\n  flag = runtimeCondition;\n  const holder = { target: otherConfig };\n  if (flag) holder.target = jobConfig;\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['const true alias live native assignment', "  const flag = true;\n  if (flag) Array.prototype.map = dynamicConsumer;\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const nextReviewPositiveFailures: string[] = [];
  for (const [label, replacement] of [
    ['dynamic defineProperty after relevant call', "  const items = [];\n  items.map(jobConfig);\n  Object.defineProperty(items, runtimeKey, { value: dynamicConsumer });\n  if (isMac()) {"],
    ['dynamic Reflect.set unrelated object', "  Reflect.set(otherObject, runtimeKey, dynamicConsumer);\n  const items = [];\n  items.map(() => 1);\n  if (isMac()) {"],
    ['descriptor duplicate safe last', "  const holder = { target: jobConfig };\n  Object.defineProperty(holder, 'target', { value: jobConfig, value: otherConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['descriptor computed safe last', "  const descriptorKey = 'value';\n  const holder = { target: jobConfig };\n  Object.defineProperty(holder, 'target', { value: jobConfig, [descriptorKey]: otherConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['descriptor spread safe last', "  const holder = { target: jobConfig };\n  Object.defineProperty(holder, 'target', { value: jobConfig, ...{ value: otherConfig } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['descriptor accessor shadowed by safe last', "  const holder = { target: jobConfig };\n  Object.defineProperty(holder, 'target', { get value() { return jobConfig; }, value: otherConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['escaped array with no later member use', "  const items = [];\n  dynamicConsumer(items);\n  if (isMac()) {"],
    ['array escape after relevant native call', "  const items = [];\n  items.map(jobConfig);\n  dynamicConsumer(items);\n  if (isMac()) {"],
    ['escaped array restored before later call', "  const nativeMap = [].map;\n  const items = [];\n  dynamicConsumer(items);\n  items.map = nativeMap;\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['uninvoked module helper has no effect', "  function install() { Array.prototype.map = dynamicConsumer; }\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['harmless invoked module helper', "  function inspect() { otherObject.value = 1; }\n  inspect();\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['harmless destructured argument getter', "  function consume({ target }) {}\n  consume({ get target() { otherObject.value = 1; return otherConfig; } });\n  if (isMac()) {"],
    ['harmless object spread getter', "  const source = { get target() { otherObject.value = 1; return otherConfig; } };\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['nested object spread getter shadowed by safe last', "  const source = { get target() { jobConfig.config.process[0].train.steps = 99; return jobConfig; }, ...{ target: otherConfig } };\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['unknown unrelated iterator identity', "  const iterable = { value: otherConfig, [runtimeKey]: dynamicConsumer };\n  function consume(target) {}\n  consume(...iterable);\n  if (isMac()) {"],
    ['Function call rebound after invocation', "  function consume(target) {}\n  consume.call(null, jobConfig);\n  Function.prototype.call = dynamicConsumer;\n  if (isMac()) {"],
    ['shadowed Function prototype is unrelated', "  { const Function = { prototype: {} }; Function.prototype.call = dynamicConsumer; }\n  function consume(target) {}\n  consume.call(null, jobConfig);\n  if (isMac()) {"],
    ['unrelated constructor prototype is unrelated', "  OtherFunction.prototype.call = dynamicConsumer;\n  function consume(target) {}\n  consume.call(null, jobConfig);\n  if (isMac()) {"],
    ['restored native Function methods remain exact', "  const nativeCall = (function () {}).call;\n  const nativeApply = (function () {}).apply;\n  const nativeBind = (function () {}).bind;\n  Function.prototype.call = dynamicConsumer;\n  Function.prototype.apply = dynamicConsumer;\n  Function.prototype.bind = dynamicConsumer;\n  Function.prototype.call = nativeCall;\n  Function.prototype.apply = nativeApply;\n  Function.prototype.bind = nativeBind;\n  function consume(target) {}\n  consume.call(null, jobConfig);\n  consume.apply(null, [jobConfig]);\n  consume.bind(null, jobConfig)();\n  if (isMac()) {"],
    ['harmless recursive module helper is bounded', "  function inspect() { inspect(); }\n  inspect();\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['const false alias dead if assignment', "  const flag = false;\n  const holder = { target: otherConfig };\n  if (flag) holder.target = jobConfig;\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['chained false alias dead conditional assignment', "  const first = false;\n  const flag = first;\n  const holder = { target: otherConfig };\n  flag ? holder.target = jobConfig : otherObject;\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['delete own method restores array native', "  const items = [];\n  items.map = dynamicConsumer;\n  delete items.map;\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['assign exact native restores array method', "  const nativeMap = [].map;\n  const items = [];\n  items.map = dynamicConsumer;\n  items.map = nativeMap;\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Object.assign exact native restores array method', "  const nativeMap = [].map;\n  const items = [];\n  items.map = dynamicConsumer;\n  Object.assign(items, { map: nativeMap });\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Object.assign exact native restores prototype method', "  const nativeMap = [].map;\n  Array.prototype.map = dynamicConsumer;\n  Object.assign(Array.prototype, { map: nativeMap });\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.deleteProperty restores inherited array native', "  const items = [];\n  items.map = dynamicConsumer;\n  Reflect.deleteProperty(items, 'map');\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['const false alias dead native assignment', "  const flag = false;\n  flag && (Array.prototype.map = dynamicConsumer);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
  ] as const) {
    try {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts);
    } catch {
      nextReviewPositiveFailures.push(label);
    }
  }
  const guardedAliasStarted = Date.now();
  try {
    assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace(
      '  if (isMac()) {',
      "  const assign = Object.assign;\n  const holder = { target: otherConfig };\n  assign(holder, { target: otherConfig });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {",
    )), summaryMigrateFacts);
  } catch {
    nextReviewPositiveFailures.push('stable aliased API query changed semantics');
  }
  const guardedAliasElapsed = Date.now() - guardedAliasStarted;
  if (guardedAliasElapsed > 2_000) nextReviewPositiveFailures.push(`stable aliased API query took ${guardedAliasElapsed}ms`);
  for (const [label, source] of [
    ['uninvoked module helper has no module effect', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; }\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['invoked harmless module helper has no relevant effect', summaryMigrateSource.replace('export const migrateJobConfig', "function inspect() { otherObject.value = 1; }\ninspect();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module helper restores captured native method', summaryMigrateSource.replace('export const migrateJobConfig', "const nativeMap = [].map;\nfunction install() { Array.prototype.map = dynamicConsumer; Array.prototype.map = nativeMap; }\ninstall();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['harmless recursive module helper is bounded', summaryMigrateSource.replace('export const migrateJobConfig', "function inspect() { inspect(); }\ninspect();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
  ] as const) {
    try {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(source), summaryMigrateFacts);
    } catch {
      nextReviewPositiveFailures.push(label);
    }
  }
  assert.deepEqual(
    {
      nextReviewDynamicMutationFailures,
      nextReviewDescriptorOrderFailures,
      nextReviewEscapeFailures,
      nextReviewModuleExecutionFailures,
      nextReviewExecutedAccessorFailures,
      nextReviewFunctionPrototypeFailures,
      nextReviewLexicalAssignmentFailures,
      nextReviewPositiveFailures,
    },
    {
      nextReviewDynamicMutationFailures: [],
      nextReviewDescriptorOrderFailures: [],
      nextReviewEscapeFailures: [],
      nextReviewModuleExecutionFailures: [],
      nextReviewExecutedAccessorFailures: [],
      nextReviewFunctionPrototypeFailures: [],
      nextReviewLexicalAssignmentFailures: [],
      nextReviewPositiveFailures: [],
    },
    'next bounded provenance review preserves dynamic mutation taint, descriptor order, escaped identities, module effects, access effects, Function natives, and lexical dead writes',
  );
  const finalReviewDefinePropertiesFailures = [
    ['defineProperties duplicate unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperties(holder, { target: { value: otherConfig }, target: { value: jobConfig } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties computed unsafe last', "  const key = 'target';\n  const holder = { target: otherConfig };\n  Object.defineProperties(holder, { target: { value: otherConfig }, [key]: { value: jobConfig } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties spread unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperties(holder, { target: { value: otherConfig }, ...{ target: { value: jobConfig } } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties inner descriptor spread unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperties(holder, { target: { value: otherConfig, ...{ value: jobConfig } } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties descriptor accessor unsafe last', "  const holder = { target: otherConfig };\n  Object.defineProperties(holder, { target: { value: otherConfig, get value() { return jobConfig; } } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const finalReviewReflectSetFailures = [
    ['Reflect.set inherited __proto__ setter', "  const items = [];\n  Reflect.set(items, '__proto__', { map: dynamicConsumer });\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set writes through Array prototype receiver', "  const holder = { map: [].map };\n  Reflect.set(holder, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set writes through exact array receiver', "  const holder = { map: [].map };\n  const items = [];\n  Reflect.set(holder, 'map', dynamicConsumer, items);\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set executes exact target setter', "  const target = { set map(value) { Array.prototype.map = value; } };\n  Reflect.set(target, 'map', dynamicConsumer);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set exact target setter consumes relevant value', "  const target = { set map(value) { dynamicConsumer(value); } };\n  Reflect.set(target, 'map', jobConfig);\n  if (isMac()) {"],
    ['Reflect.set exact key invokes inherited target setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype };\n  Reflect.set(target, 'value', 1);\n  if (isMac()) {"],
    ['Reflect.set exact key invokes inherited setter revealed by delete', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype, value: 1 };\n  delete target.value;\n  Reflect.set(target, 'value', 1);\n  if (isMac()) {"],
    ['setPrototypeOf exact alias installs inherited harmful setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = {};\n  const setProto = Object.setPrototypeOf;\n  setProto(target, prototype);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['setPrototypeOf destructured alias installs inherited harmful setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = {};\n  const { setPrototypeOf: setProto } = Object;\n  setProto(target, prototype);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['setPrototypeOf alias replaces prior null prototype', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: null };\n  const setProto = Object.setPrototypeOf;\n  setProto(target, prototype);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['deleteProperty alias reveals inherited harmful setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype, value: 1 };\n  const remove = Reflect.deleteProperty;\n  remove(target, 'value');\n  Reflect.set(target, 'value', 2);\n  if (isMac()) {"],
    ['deleteProperty call reveals inherited harmful setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype, value: 1 };\n  Reflect.deleteProperty.call(null, target, 'value');\n  Reflect.set(target, 'value', 2);\n  if (isMac()) {"],
    ['own data __proto__ assignment preserves inherited setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype };\n  Object.defineProperty(target, '__proto__', { value: otherObject, writable: true });\n  target.__proto__ = null;\n  Reflect.set(target, 'value', 1);\n  if (isMac()) {"],
    ['own __proto__ setter executes on direct assignment', "  const target = { set __proto__(next) { jobConfig.config.process[0].train.steps = 99; } };\n  target.__proto__ = otherObject;\n  if (isMac()) {"],
    ['Reflect.set exact target setter uses supplied receiver as this', "  const target = { set value(next) { this.config.process[0].train.steps = next; } };\n  Reflect.set(target, 'value', 99, jobConfig);\n  if (isMac()) {"],
    ['Reflect.set exact target setter defaults this to target', "  const target = { config: jobConfig.config, set value(next) { this.config.process[0].train.steps = next; } };\n  Reflect.set(target, 'value', 99);\n  if (isMac()) {"],
    ['Reflect.set helper parameter exact key invokes target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign(target, 'value', jobConfig);\n  if (isMac()) {"],
    ['Reflect.set direct const exact key invokes target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  const key = 'value';\n  Reflect.set(target, key, jobConfig);\n  if (isMac()) {"],
    ['Reflect.set helper call exact key invokes target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign.call(null, target, 'value', jobConfig);\n  if (isMac()) {"],
    ['Reflect.set helper apply exact key invokes target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign.apply(null, [target, 'value', jobConfig]);\n  if (isMac()) {"],
    ['Reflect.set helper bind exact key invokes target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign.bind(null, target, 'value', jobConfig)();\n  if (isMac()) {"],
    ['Reflect.set helper tainted key fails closed for target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign(target, runtimeKey, jobConfig);\n  if (isMac()) {"],
    ['Reflect.set helper tainted key may select captured relevant setter', "  const target = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set tainted key may select prototype-rebinding setter', "  const target = { set value(next) { Array.prototype.map = dynamicConsumer; } };\n  Reflect.set(target, runtimeKey, 1);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set tainted key joins every finite own setter', "  const target = { set first(next) { otherObject.value = next; }, set second(next) { jobConfig.config.process[0].train.steps = 99; } };\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set tainted key joins inherited finite setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = {};\n  Object.setPrototypeOf(target, prototype);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set tainted key joins object-literal inherited setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype };\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set tainted key rejects cyclic prototype state without recursion', "  const first = {};\n  const second = {};\n  Object.setPrototypeOf(first, second);\n  Object.setPrototypeOf(second, first);\n  Reflect.set(first, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set primitive target still evaluates target expression', "  Reflect.set((Array.prototype.map = dynamicConsumer, 1), 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set primitive target still evaluates value argument', "  Reflect.set(1, 'map', (Array.prototype.map = dynamicConsumer), Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set primitive target still evaluates receiver argument', "  Reflect.set(1, 'map', dynamicConsumer, (Array.prototype.map = dynamicConsumer, Array.prototype));\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const finalReviewEscapeFailures = [
    ['own call escapes exact array', "  const items = [];\n  const consumer = { call: dynamicConsumer };\n  consumer.call(null, items);\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['rebound apply escapes exact array', "  const items = [];\n  function consumer() {}\n  consumer.apply = dynamicConsumer;\n  consumer.apply(null, [items]);\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['rebound bind escapes exact array', "  const items = [];\n  function consumer() {}\n  consumer.bind = dynamicConsumer;\n  consumer.bind(null, items)();\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['post literal method holder escape', "  const methods = {};\n  methods.map = [].map;\n  dynamicConsumer(methods);\n  Array.prototype.map = methods.map;\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['nested aggregate exact array escape', "  const items = [];\n  dynamicConsumer({ items });\n  items.map(jobConfig);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const finalReviewModuleInvocationFailures = [
    ['module helper exact alias invocation', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; }\nconst run = install;\nrun();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module helper native call invocation', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; }\ninstall.call(null);\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module helper native apply invocation', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; }\ninstall.apply(null, []);\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module helper native bind invocation', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; }\ninstall.bind(null)();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module helper aliased effect cycle', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; run(); }\nconst run = install;\nrun();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
  ].map(([label, source]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(source))).filter((failure): failure is string => failure !== undefined);
  const finalReviewAccessEffectFailures = [
    ['object rest getter effect', "  function consume({ ...rest }) {}\n  consume({ get target() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  if (isMac()) {"],
    ['array parameter iterator effect', "  const iterable = { [Symbol.iterator]() { jobConfig.config.process[0].train.steps = 99; return [otherConfig][Symbol.iterator](); } };\n  function consume([target]) {}\n  consume(iterable);\n  if (isMac()) {"],
    ['array rest parameter iterator effect', "  const iterable = { [Symbol.iterator]() { jobConfig.config.process[0].train.steps = 99; return [otherConfig, otherConfig][Symbol.iterator](); } };\n  function consume([target, ...rest]) {}\n  consume(iterable);\n  if (isMac()) {"],
    ['relevant dynamic object spread', "  const copied = { ...jobConfig };\n  copied;\n  if (isMac()) {"],
    ['relevant dynamic argument spread', "  function consume(target) {}\n  consume(...jobConfig);\n  if (isMac()) {"],
    ['object spread executes installed enumerable getter', "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['object rest executes installed enumerable getter', "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  function consume({ ...rest }) {}\n  consume(source);\n  if (isMac()) {"],
    ['object spread executes helper-installed enumerable getter', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  install(source);\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['object rest executes helper-installed enumerable getter', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  install(source);\n  function consume({ ...rest }) {}\n  consume(source);\n  if (isMac()) {"],
    ['object spread executes IIFE-installed enumerable getter', "  const source = {};\n  ((target) => { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); })(source);\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['object rest executes IIFE-installed enumerable getter', "  const source = {};\n  ((target) => { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); })(source);\n  function consume({ ...rest }) {}\n  consume(source);\n  if (isMac()) {"],
    ['object spread executes call-installed enumerable getter', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  install.call(null, source);\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['object spread executes apply-installed enumerable getter', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  install.apply(null, [source]);\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['object spread executes bind-installed enumerable getter', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  install.bind(null, source)();\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['dynamic helper invocation may install relevant enumerable getter', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  dynamicConsumer(install, source);\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['recursive helper installation is bounded and fail closed', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); install(target); }\n  install(source);\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const finalReviewPositiveFailures: string[] = [];
  for (const [label, replacement] of [
    ['defineProperties duplicate safe last', "  const holder = { target: jobConfig };\n  Object.defineProperties(holder, { target: { value: jobConfig }, target: { value: otherConfig } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties computed safe last', "  const key = 'target';\n  const holder = { target: jobConfig };\n  Object.defineProperties(holder, { target: { value: jobConfig }, [key]: { value: otherConfig } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties spread safe last', "  const holder = { target: jobConfig };\n  Object.defineProperties(holder, { target: { value: jobConfig }, ...{ target: { value: otherConfig } } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties inner descriptor spread safe last', "  const holder = { target: jobConfig };\n  Object.defineProperties(holder, { target: { value: jobConfig, ...{ value: otherConfig } } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['defineProperties descriptor accessor shadowed by safe last', "  const holder = { target: jobConfig };\n  Object.defineProperties(holder, { target: { get value() { return jobConfig; }, value: otherConfig } });\n  holder.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['Reflect.set __proto__ own data property is ordinary', "  const items = [];\n  Object.defineProperty(items, '__proto__', { value: otherObject, writable: true });\n  Reflect.set(items, '__proto__', { map: dynamicConsumer });\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set unrelated receiver preserves array native', "  const holder = { map: [].map };\n  Reflect.set(holder, 'map', dynamicConsumer, otherObject);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set false nonwritable target preserves receiver', "  const holder = {};\n  Object.defineProperty(holder, 'map', { value: [].map, writable: false });\n  Reflect.set(holder, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set false nonwritable receiver preserves native', "  const nativeMap = [].map;\n  Object.defineProperty(Array.prototype, 'map', { value: nativeMap, writable: false });\n  const holder = { map: nativeMap };\n  Reflect.set(holder, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set primitive receiver throws before later use', "  const holder = { map: [].map };\n  Reflect.set(holder, 'map', dynamicConsumer, 1);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set primitive target throws before receiver write', "  Reflect.set(1, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set string target throws before receiver write', "  Reflect.set('target', 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set boolean target throws before receiver write', "  Reflect.set(true, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set bigint target throws before receiver write', "  Reflect.set(1n, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set symbol target throws before receiver write', "  Reflect.set(Symbol('target'), 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set null target throws before receiver write', "  Reflect.set(null, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set undefined target throws before receiver write', "  Reflect.set(undefined, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set primitive target does not coerce property key', "  const key = { toString() { Array.prototype.map = dynamicConsumer; return 'map'; } };\n  Reflect.set(1, key, dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set harmless exact target setter', "  const target = { set map(value) { otherObject.value = value; } };\n  Reflect.set(target, 'map', dynamicConsumer);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set dynamic key invokes harmless Object.setPrototypeOf setter', "  const prototype = { set value(next) { otherObject.value = next; } };\n  const target = {};\n  Object.setPrototypeOf(target, prototype);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set exact key invokes harmless Object.setPrototypeOf setter', "  const prototype = { set value(next) { otherObject.value = next; } };\n  const target = {};\n  Object.setPrototypeOf(target, prototype);\n  Reflect.set(target, 'value', 1);\n  if (isMac()) {"],
    ['Reflect.set own data shadows inherited setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype, value: 1 };\n  Reflect.set(target, 'value', 2);\n  if (isMac()) {"],
    ['Reflect.set inherited data shadows farther inherited setter', "  const base = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const prototype = { __proto__: base, value: 1 };\n  const target = { __proto__: prototype };\n  Reflect.set(target, runtimeKey, 2);\n  if (isMac()) {"],
    ['Reflect.set later own data descriptor shadows inherited setter', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype };\n  Object.defineProperty(target, 'value', { value: 1, writable: true });\n  Reflect.set(target, runtimeKey, 2);\n  if (isMac()) {"],
    ['Reflect.set deleted inherited setter is harmless', "  const prototype = {};\n  Object.defineProperty(prototype, 'value', { configurable: true, set(next) { jobConfig.config.process[0].train.steps = 99; } });\n  delete prototype.value;\n  const target = { __proto__: prototype };\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set exact key on null prototype is harmless', "  const target = { __proto__: null };\n  Reflect.set(target, 'value', 1);\n  if (isMac()) {"],
    ['Reflect.set dynamic key after null setPrototypeOf is harmless', "  const target = {};\n  Object.setPrototypeOf(target, null);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['setPrototypeOf call with harmless prototype is harmless', "  const prototype = { set value(next) { otherObject.value = next; } };\n  const target = {};\n  Object.setPrototypeOf.call(null, target, prototype);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['setPrototypeOf apply with harmless prototype is harmless', "  const prototype = { set value(next) { otherObject.value = next; } };\n  const target = {};\n  Object.setPrototypeOf.apply(null, [target, prototype]);\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['setPrototypeOf bind with harmless prototype is harmless', "  const prototype = { set value(next) { otherObject.value = next; } };\n  const target = {};\n  Object.setPrototypeOf.bind(null, target, prototype)();\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['defineProperty alias installs own data shadow', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype };\n  const define = Object.defineProperty;\n  define(target, 'value', { value: 1, writable: true });\n  Reflect.set(target, runtimeKey, 2);\n  if (isMac()) {"],
    ['defineProperty call installs own data shadow', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: prototype };\n  Object.defineProperty.call(null, target, 'value', { value: 1, writable: true });\n  Reflect.set(target, runtimeKey, 2);\n  if (isMac()) {"],
    ['null prototype __proto__ assignment creates ordinary own data', "  const prototype = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const target = { __proto__: null };\n  target.__proto__ = prototype;\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set exact target setter uses harmless supplied receiver', "  const target = { set value(next) { this.value = next; } };\n  Reflect.set(target, 'value', 99, otherObject);\n  if (isMac()) {"],
    ['Reflect.set exact target setter with primitive receiver throws before relevant this write', "  const target = { set value(next) { this.config.process[0].train.steps = next; } };\n  Reflect.set(target, 'value', 99, 1);\n  if (isMac()) {"],
    ['Reflect.set helper parameter nonmatching exact key skips target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign(target, 'other', jobConfig);\n  if (isMac()) {"],
    ['Reflect.set direct const nonmatching key skips target setter', "  const target = { set value(next) { next.config.process[0].train.steps = 99; } };\n  const key = 'other';\n  Reflect.set(target, key, jobConfig);\n  if (isMac()) {"],
    ['Reflect.set tainted key with harmless finite setters is harmless', "  const target = { set value(next) { otherObject.value = next; } };\n  function assign(object, key, value) { Reflect.set(object, key, value); }\n  assign(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['Reflect.set tainted key with multiple harmless finite setters is harmless', "  const target = { set first(next) { otherObject.first = next; }, set second(next) { otherObject.second = next; } };\n  Reflect.set(target, runtimeKey, 1);\n  if (isMac()) {"],
    ['cyclic prototype state without a dynamic member operation is harmless', "  const first = {};\n  const second = {};\n  Object.setPrototypeOf(first, second);\n  Object.setPrototypeOf(second, first);\n  if (isMac()) {"],
    ['Reflect.set getter-only target returns false', "  const target = { get map() { return [].map; } };\n  Reflect.set(target, 'map', dynamicConsumer, Array.prototype);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['Reflect.set exact throwing setter stops before later use', "  const target = { set map(value) { throw new Error('stop'); } };\n  Reflect.set(target, 'map', dynamicConsumer);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['noncallable installed setter throws during definition', "  const target = {};\n  Object.defineProperty(target, 'map', { set: 1 });\n  Reflect.set(target, 'map', dynamicConsumer);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['native local call does not escape argument', "  const items = [];\n  function inspect(target) {}\n  inspect.call(null, items);\n  items.map(jobConfig);\n  if (isMac()) {"],
    ['nested aggregate without later use is harmless', "  const items = [];\n  dynamicConsumer({ items });\n  if (isMac()) {"],
    ['harmless object rest getter', "  function consume({ ...rest }) {}\n  consume({ get target() { otherObject.value = 1; return otherConfig; } });\n  if (isMac()) {"],
    ['harmless array rest iterator', "  const iterable = { [Symbol.iterator]() { otherObject.value = 1; return [otherConfig, otherConfig][Symbol.iterator](); } };\n  function consume([target, ...rest]) {}\n  consume(iterable);\n  if (isMac()) {"],
    ['harmless installed enumerable getter in object spread', "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, get() { otherObject.value = 1; return otherConfig; } });\n  const copied = { ...source };\n  copied;\n  if (isMac()) {"],
    ['harmless installed enumerable getter in object rest', "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, get() { otherObject.value = 1; return otherConfig; } });\n  function consume({ ...rest }) {}\n  consume(source);\n  if (isMac()) {"],
    ['harmless helper-installed enumerable getter in object spread and rest', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { otherObject.value = 1; return otherConfig; } }); }\n  install(source);\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  copied;\n  if (isMac()) {"],
    ['getter installed by helper after spread and rest is not retroactive', "  const source = {};\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  install(source);\n  copied;\n  if (isMac()) {"],
    ['uninvoked getter installation helper is harmless', "  const source = {};\n  function install(target) { Object.defineProperty(target, 'value', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } }); }\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  copied;\n  if (isMac()) {"],
    ['nonenumerable installed getter is not executed by spread or rest', "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: false, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  copied;\n  if (isMac()) {"],
    ['default-nonenumerable installed getter is not executed', "  const source = {};\n  Object.defineProperty(source, 'target', { get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  copied;\n  if (isMac()) {"],
    ['deleted installed getter is not executed', "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, configurable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  delete source.target;\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  copied;\n  if (isMac()) {"],
    ['installed getter shadowed by safe data descriptor', "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, configurable: true, get() { jobConfig.config.process[0].train.steps = 99; return jobConfig; } });\n  Object.defineProperty(source, 'target', { enumerable: true, value: otherConfig });\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  copied.target.config.process[0].train.steps = 99;\n  if (isMac()) {"],
    ['getter installed after spread and rest is not retroactive', "  const source = {};\n  const copied = { ...source };\n  function consume({ ...rest }) {}\n  consume(source);\n  Object.defineProperty(source, 'target', { enumerable: true, get() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } });\n  copied;\n  if (isMac()) {"],
    ['unrelated dynamic object spread', "  const copied = { ...otherConfig };\n  copied;\n  if (isMac()) {"],
    ['unrelated dynamic argument spread', "  function consume(target) {}\n  consume(...otherConfig);\n  if (isMac()) {"],
  ] as const) {
    try {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)), summaryMigrateFacts);
    } catch {
      finalReviewPositiveFailures.push(label);
    }
  }
  for (const [label, source] of [
    ['uninvoked module helper alias is harmless', summaryMigrateSource.replace('export const migrateJobConfig', "function install() { Array.prototype.map = dynamicConsumer; }\nconst run = install;\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['module alias helper restores native before export use', summaryMigrateSource.replace('export const migrateJobConfig', "const nativeMap = [].map;\nfunction install() { Array.prototype.map = dynamicConsumer; Array.prototype.map = nativeMap; }\nconst run = install;\nrun();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
    ['harmless aliased recursive module cycle is bounded', summaryMigrateSource.replace('export const migrateJobConfig', "function inspect() { run(); }\nconst run = inspect;\nrun();\nexport const migrateJobConfig").replace('  return jobConfig;', "  const items = [];\n  items.map(jobConfig);\n  return jobConfig;")],
  ] as const) {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(source), summaryMigrateFacts); }
    catch { finalReviewPositiveFailures.push(label); }
  }
  const finalReviewRepeatedStarted = Date.now();
  const repeatedWrapperSource = summaryMigrateSource.replace(
    '  if (isMac()) {',
    "  const items = [];\n  function inspect(target) {}\n  inspect.call(null, { nested: [items] });\n  items.map(jobConfig);\n  if (isMac()) {",
  );
  try {
    for (let index = 0; index < 3; index += 1) {
      assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(repeatedWrapperSource), summaryMigrateFacts);
    }
  } catch {
    finalReviewPositiveFailures.push('repeated exact wrapper provenance changed semantics');
  }
  const finalReviewRepeatedElapsed = Date.now() - finalReviewRepeatedStarted;
  if (finalReviewRepeatedElapsed > 3_000) finalReviewPositiveFailures.push(`repeated exact wrapper provenance took ${finalReviewRepeatedElapsed}ms`);
  const finalReviewRepeatedDescriptorStarted = Date.now();
  const repeatedDescriptorSources = [
    "  const target = { set map(value) { otherObject.value = value; } };\n  Reflect.set(target, 'map', dynamicConsumer);\n  const items = [];\n  items.map(jobConfig);\n  if (isMac()) {",
    "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, get() { otherObject.value = 1; return otherConfig; } });\n  const copied = { ...source };\n  copied;\n  if (isMac()) {",
    "  const source = {};\n  Object.defineProperty(source, 'target', { enumerable: true, get() { otherObject.value = 1; return otherConfig; } });\n  function consume({ ...rest }) {}\n  consume(source);\n  if (isMac()) {",
  ];
  try {
    for (let index = 0; index < 3; index += 1) {
      for (const replacement of repeatedDescriptorSources) {
        assert.deepEqual(
          collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)),
          summaryMigrateFacts,
        );
      }
    }
  } catch {
    finalReviewPositiveFailures.push('repeated descriptor queries changed semantics');
  }
  const finalReviewRepeatedDescriptorElapsed = Date.now() - finalReviewRepeatedDescriptorStarted;
  if (finalReviewRepeatedDescriptorElapsed > 3_000) {
    finalReviewPositiveFailures.push(`repeated spread/rest/Reflect descriptor queries took ${finalReviewRepeatedDescriptorElapsed}ms`);
  }
  assert.deepEqual(
    {
      finalReviewDefinePropertiesFailures,
      finalReviewReflectSetFailures,
      finalReviewEscapeFailures,
      finalReviewModuleInvocationFailures,
      finalReviewAccessEffectFailures,
      finalReviewPositiveFailures,
    },
    {
      finalReviewDefinePropertiesFailures: [],
      finalReviewReflectSetFailures: [],
      finalReviewEscapeFailures: [],
      finalReviewModuleInvocationFailures: [],
      finalReviewAccessEffectFailures: [],
      finalReviewPositiveFailures: [],
    },
    'final bounded review covers defineProperties order, Reflect receivers, aggregate escapes, indirect module calls, and rest/iterator access effects',
  );
  const conversionAndAccessEffectFailures = [
    ['Object.assign executes source getter', "  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.assign({}, source);\n  if (isMac()) {"],
    ['Object.assign executes target setter', "  const target = { set value(next) { jobConfig.config.process[0].train.steps = next; } };\n  Object.assign(target, { value: 99 });\n  if (isMac()) {"],
    ['Object.assign target setter consumes relevant source value', "  const target = { set value(next) { dynamicConsumer(next); } };\n  Object.assign(target, { value: jobConfig });\n  if (isMac()) {"],
    ['Reflect.set executes key coercion', "  const key = { toString() { jobConfig.config.process[0].train.steps = 99; return 'value'; } };\n  Reflect.set({}, key, 1);\n  if (isMac()) {"],
    ['Object.defineProperty executes key coercion', "  const key = { toString() { jobConfig.config.process[0].train.steps = 99; return 'value'; } };\n  Object.defineProperty({}, key, { value: 1 });\n  if (isMac()) {"],
    ['Object.defineProperty executes descriptor value getter', "  const descriptor = { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperty({}, 'value', descriptor);\n  if (isMac()) {"],
    ['Object.defineProperty executes inherited descriptor getter', "  const fields = { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  const descriptor = { __proto__: fields };\n  Object.defineProperty({}, 'value', descriptor);\n  if (isMac()) {"],
    ['Object.assign executes relevant getter before later throw', "  const source = { get first() { jobConfig.config.process[0].train.steps = 99; return 1; }, get second() { throw new Error('stop'); } };\n  Object.assign({}, source);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const proxyTrapFailures = [
    ['Reflect.set Proxy trap consumes relevant value', "  const proxy = new Proxy({}, { set(target, key, value) { dynamicConsumer(value); return true; } });\n  Reflect.set(proxy, 'value', jobConfig);\n  if (isMac()) {"],
    ['Reflect.set Proxy trap captures relevant config', "  const proxy = new Proxy({}, { set() { jobConfig.config.process[0].train.steps = 99; return true; } });\n  Reflect.set(proxy, 'value', 1);\n  if (isMac()) {"],
    ['Object.assign Proxy set trap consumes relevant value', "  const proxy = new Proxy({}, { set(target, key, value) { dynamicConsumer(value); return true; } });\n  Object.assign(proxy, { value: jobConfig });\n  if (isMac()) {"],
    ['Object.defineProperty Proxy trap consumes relevant descriptor', "  const proxy = new Proxy({}, { defineProperty(target, key, descriptor) { dynamicConsumer(descriptor.value); return true; } });\n  Object.defineProperty(proxy, 'value', { value: jobConfig });\n  if (isMac()) {"],
    ['Reflect.set unknown Proxy handler fails closed', "  const proxy = new Proxy({}, runtimeHandler);\n  Reflect.set(proxy, 'value', jobConfig);\n  if (isMac()) {"],
    ['Object.assign unknown Proxy set trap fails closed', "  const proxy = new Proxy({}, { set: runtimeTrap });\n  Object.assign(proxy, { value: jobConfig });\n  if (isMac()) {"],
    ['Object.defineProperty unknown Proxy trap fails closed', "  const proxy = new Proxy({}, { defineProperty: runtimeTrap });\n  Object.defineProperty(proxy, 'value', { value: jobConfig });\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const localAccessEffectFailures = [
    ['local object destructuring executes getter', "  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } };\n  const { value } = source;\n  if (isMac()) {"],
    ['local object rest executes getter', "  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return otherConfig; } };\n  const { ...rest } = source;\n  if (isMac()) {"],
    ['local array destructuring executes custom iterator', "  const iterable = { [Symbol.iterator]() { jobConfig.config.process[0].train.steps = 99; return [otherConfig][Symbol.iterator](); } };\n  const [value] = iterable;\n  if (isMac()) {"],
    ['for-of executes custom iterator', "  const iterable = { [Symbol.iterator]() { jobConfig.config.process[0].train.steps = 99; return [otherConfig][Symbol.iterator](); } };\n  for (const value of iterable) { break; }\n  if (isMac()) {"],
    ['absent object property executes destructuring default', "  const source = {};\n  const { value = (jobConfig.config.process[0].train.steps = 99) } = source;\n  if (isMac()) {"],
    ['undefined object property executes destructuring default', "  const source = { value: undefined };\n  const { value = (jobConfig.config.process[0].train.steps = 99) } = source;\n  if (isMac()) {"],
    ['absent array element executes destructuring default', "  const source = [];\n  const [value = (jobConfig.config.process[0].train.steps = 99)] = source;\n  if (isMac()) {"],
    ['recursive custom iterator is bounded and fails closed', "  const iterable = { [Symbol.iterator]() { return iterable[Symbol.iterator](); } };\n  const [value] = iterable;\n  value.config.process[0].train.steps = 99;\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const staticValueFailures = [
    ['live 1n and branch', "  1n && (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['live 0n or branch', "  0n || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['live RegExp and branch', "  /x/ && (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['live class expression and branch', "  (class {}) && (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['live class declaration alias branch', "  class Flag {}\n  Flag && (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['rebound RegExp alias remains live', "  let flag = /x/;\n  flag = runtimeFlag;\n  flag || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const finalProvenancePositiveFailures: string[] = [];
  for (const [label, replacement] of [
    ['Object.assign harmless source getter', "  const source = { get value() { otherObject.value = 1; return 1; } };\n  Object.assign({}, source);\n  if (isMac()) {"],
    ['Object.assign skips nonenumerable source getter', "  const source = {};\n  Object.defineProperty(source, 'value', { enumerable: false, get() { jobConfig.config.process[0].train.steps = 99; return 1; } });\n  Object.assign({}, source);\n  if (isMac()) {"],
    ['Object.assign skips nonmatching target setter', "  const target = { set value(next) { jobConfig.config.process[0].train.steps = next; } };\n  Object.assign(target, { other: 1 });\n  if (isMac()) {"],
    ['Object.assign throw stops later source getter', "  const source = { get first() { throw new Error('stop'); }, get second() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.assign({}, source);\n  if (isMac()) {"],
    ['Reflect.set throwing key stops target setter', "  const key = { toString() { throw new Error('stop'); } };\n  const target = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  Reflect.set(target, key, 1);\n  if (isMac()) {"],
    ['Object.defineProperty throwing key stops descriptor getter', "  const key = { toString() { throw new Error('stop'); } };\n  const descriptor = { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperty({}, key, descriptor);\n  if (isMac()) {"],
    ['Object.defineProperty throwing descriptor field stops later getter', "  const descriptor = { get enumerable() { throw new Error('stop'); }, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperty({}, 'value', descriptor);\n  if (isMac()) {"],
    ['Reflect.set harmless Proxy trap', "  const proxy = new Proxy({}, { set(target, key, value) { otherObject.value = value; return true; } });\n  Reflect.set(proxy, 'value', 1);\n  if (isMac()) {"],
    ['Object.assign harmless Proxy trap', "  const proxy = new Proxy({}, { set(target, key, value) { otherObject.value = value; return true; } });\n  Object.assign(proxy, { value: 1 });\n  if (isMac()) {"],
    ['Object.defineProperty harmless Proxy trap', "  const proxy = new Proxy({}, { defineProperty(target, key, descriptor) { otherObject.value = descriptor.value; return true; } });\n  Object.defineProperty(proxy, 'value', { value: 1 });\n  if (isMac()) {"],
    ['unused unknown Proxy is harmless', "  const proxy = new Proxy({}, runtimeHandler);\n  proxy;\n  if (isMac()) {"],
    ['local harmless object getter', "  const source = { get value() { otherObject.value = 1; return otherConfig; } };\n  const { value } = source;\n  if (isMac()) {"],
    ['local harmless custom iterator', "  const iterable = { [Symbol.iterator]() { otherObject.value = 1; return [otherConfig][Symbol.iterator](); } };\n  const [value] = iterable;\n  if (isMac()) {"],
    ['present object property skips destructuring default', "  const source = { value: otherConfig };\n  const { value = (jobConfig.config.process[0].train.steps = 99) } = source;\n  if (isMac()) {"],
    ['null object property skips destructuring default', "  const source = { value: null };\n  const { value = (jobConfig.config.process[0].train.steps = 99) } = source;\n  if (isMac()) {"],
    ['present array element skips destructuring default', "  const source = [otherConfig];\n  const [value = (jobConfig.config.process[0].train.steps = 99)] = source;\n  if (isMac()) {"],
    ['dead 0n and branch', "  0n && (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['dead 1n or branch', "  1n || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['0n is present for nullish branch', "  0n ?? (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['dead RegExp or branch', "  /x/ || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['dead class expression or branch', "  (class {}) || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['dead class declaration alias branch', "  class Flag {}\n  Flag || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
    ['dead const RegExp alias branch', "  const flag = /x/;\n  flag || (jobConfig.config.process[0].train.steps = 99);\n  if (isMac()) {"],
  ] as const) {
    try {
      assert.deepEqual(
        collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)),
        summaryMigrateFacts,
      );
    } catch {
      finalProvenancePositiveFailures.push(label);
    }
  }
  assert.deepEqual(
    {
      conversionAndAccessEffectFailures,
      proxyTrapFailures,
      localAccessEffectFailures,
      staticValueFailures,
      finalProvenancePositiveFailures,
    },
    {
      conversionAndAccessEffectFailures: [],
      proxyTrapFailures: [],
      localAccessEffectFailures: [],
      staticValueFailures: [],
      finalProvenancePositiveFailures: [],
    },
    'final provenance review covers access conversion effects, Proxy traps, local destructuring iteration, and exact static values',
  );
  const definePropertiesAccessFailures = [
    ['defineProperties executes outer descriptor getter', "  const descriptors = { get value() { jobConfig.config.process[0].train.steps = 99; return { value: 1 }; } };\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['defineProperties executes returned descriptor field getter', "  const descriptors = { get value() { return { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } }; } };\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['defineProperties executes direct descriptor field getter', "  const descriptors = { value: { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } } };\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['defineProperties executes returned descriptor getter through outer spread', "  const source = { get value() { return { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } }; } };\n  Object.defineProperties({}, { ...source });\n  if (isMac()) {"],
    ['defineProperties executes descriptor getter through inner spread', "  const fields = { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperties({}, { value: { ...fields } });\n  if (isMac()) {"],
    ['defineProperties executes nonenumerable descriptor field getter', "  const descriptor = {};\n  Object.defineProperty(descriptor, 'value', { enumerable: false, get() { jobConfig.config.process[0].train.steps = 99; return 1; } });\n  Object.defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties preserves earlier outer getter effect before later throw', "  const descriptors = { get first() { jobConfig.config.process[0].train.steps = 99; return { value: 1 }; }, get second() { throw new Error('stop'); } };\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['defineProperties preserves earlier field getter effect before later throw', "  const descriptor = { get enumerable() { jobConfig.config.process[0].train.steps = 99; return true; }, get configurable() { throw new Error('stop'); } };\n  Object.defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties preserves inner spread getter effect before field throw', "  const fields = { get enumerable() { jobConfig.config.process[0].train.steps = 99; return true; } };\n  const descriptor = { ...fields, get value() { throw new Error('stop'); } };\n  Object.defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties preserves outer spread getter effect before returned field throw', "  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return { get enumerable() { throw new Error('stop'); } }; } };\n  Object.defineProperties({}, { ...source });\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const objectAssignGetterValueFailures = [
    ['Object.assign source getter return reaches target setter', "  const target = { set value(next) { dynamicConsumer(next); } };\n  const source = { get value() { return jobConfig; } };\n  Object.assign(target, source);\n  if (isMac()) {"],
    ['Object.assign aliased getter return reaches target setter', "  const selected = jobConfig;\n  const target = { set value(next) { dynamicConsumer(next); } };\n  const source = { get value() { return selected; } };\n  Object.assign(target, source);\n  if (isMac()) {"],
    ['Object.assign relevant first source is consumed before safe overwrite', "  const target = { set value(next) { dynamicConsumer(next); } };\n  Object.assign(target, { get value() { return jobConfig; } }, { get value() { return otherConfig; } });\n  if (isMac()) {"],
    ['Object.assign relevant later source is consumed after safe write', "  const target = { set value(next) { dynamicConsumer(next); } };\n  Object.assign(target, { get value() { return otherConfig; } }, { get value() { return jobConfig; } });\n  if (isMac()) {"],
    ['Object.assign getter result is consumed before later source throw', "  const target = { set value(next) { dynamicConsumer(next); } };\n  Object.assign(target, { get value() { return jobConfig; } }, { get stop() { throw new Error('stop'); } });\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const descriptorAndGetterValuePositiveFailures: string[] = [];
  for (const [label, replacement] of [
    ['defineProperties accepts data descriptors', "  Object.defineProperties({}, { value: { value: 1, enumerable: true } });\n  if (isMac()) {"],
    ['defineProperties accepts harmless outer getter', "  const descriptors = { get value() { otherObject.value = 1; return { value: 1 }; } };\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['defineProperties skips nonenumerable outer descriptor getter', "  const descriptors = {};\n  Object.defineProperty(descriptors, 'value', { enumerable: false, get() { jobConfig.config.process[0].train.steps = 99; return { value: 1 }; } });\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['defineProperties skips unrelated descriptor field getter', "  const descriptor = { get other() { jobConfig.config.process[0].train.steps = 99; return 1; }, value: 1 };\n  Object.defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties throwing outer getter stops later outer getter', "  const descriptors = { get first() { throw new Error('stop'); }, get second() { jobConfig.config.process[0].train.steps = 99; return { value: 1 }; } };\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['defineProperties throwing field getter stops later field getter', "  const descriptor = { get enumerable() { throw new Error('stop'); }, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties throwing inner spread getter stops later field getter', "  const fields = { get enumerable() { throw new Error('stop'); } };\n  const descriptor = { ...fields, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties throwing outer spread getter stops later outer getter', "  const source = { get first() { throw new Error('stop'); } };\n  const descriptors = { ...source, get second() { jobConfig.config.process[0].train.steps = 99; return { value: 1 }; } };\n  Object.defineProperties({}, descriptors);\n  if (isMac()) {"],
    ['Object.assign harmless getter return reaches consuming setter', "  const target = { set value(next) { dynamicConsumer(next); } };\n  const source = { get value() { return otherConfig; } };\n  Object.assign(target, source);\n  if (isMac()) {"],
    ['Object.assign relevant getter return reaches harmless setter', "  const target = { set value(next) { otherObject.value = next; } };\n  const source = { get value() { return jobConfig; } };\n  Object.assign(target, source);\n  if (isMac()) {"],
    ['Object.assign throwing getter stops target setter', "  const target = { set value(next) { jobConfig.config.process[0].train.steps = 99; } };\n  const source = { get value() { throw new Error('stop'); } };\n  Object.assign(target, source);\n  if (isMac()) {"],
    ['Object.assign throwing source stops later relevant source', "  const target = { set value(next) { dynamicConsumer(next); } };\n  Object.assign(target, { get stop() { throw new Error('stop'); } }, { get value() { return jobConfig; } });\n  if (isMac()) {"],
  ] as const) {
    try {
      assert.deepEqual(
        collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)),
        summaryMigrateFacts,
      );
    } catch {
      descriptorAndGetterValuePositiveFailures.push(label);
    }
  }
  assert.deepEqual(
    {
      definePropertiesAccessFailures,
      objectAssignGetterValueFailures,
      descriptorAndGetterValuePositiveFailures,
    },
    {
      definePropertiesAccessFailures: [],
      objectAssignGetterValueFailures: [],
      descriptorAndGetterValuePositiveFailures: [],
    },
    'acceptance review covers defineProperties access order and Object.assign getter return provenance',
  );
  const aliasAbruptConstructionFailures = [
    ['defineProperties const alias preserves harmful spread before throw', "  const defineProperties = Object.defineProperties;\n  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return { get enumerable() { throw new Error('stop'); } }; } };\n  defineProperties({}, { ...source });\n  if (isMac()) {"],
    ['defineProperties destructured alias preserves harmful spread before throw', "  const { defineProperties } = Object;\n  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return { get enumerable() { throw new Error('stop'); } }; } };\n  defineProperties({}, { ...source });\n  if (isMac()) {"],
    ['defineProperties call preserves harmful spread before throw', "  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return { get enumerable() { throw new Error('stop'); } }; } };\n  Object.defineProperties.call(null, {}, { ...source });\n  if (isMac()) {"],
    ['defineProperties apply preserves harmful spread before throw', "  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return { get enumerable() { throw new Error('stop'); } }; } };\n  Object.defineProperties.apply(null, [{}, { ...source }]);\n  if (isMac()) {"],
    ['defineProperties bind preserves harmful spread before throw', "  const source = { get value() { jobConfig.config.process[0].train.steps = 99; return { get enumerable() { throw new Error('stop'); } }; } };\n  Object.defineProperties.bind(null, {}, { ...source })();\n  if (isMac()) {"],
    ['helper own call rebind before invocation remains tainted', "  function applyDescriptors(descriptor) { Object.defineProperties.call(null, {}, { value: descriptor }); }\n  Object.defineProperties.call = dynamicConsumer;\n  applyDescriptors({ value: jobConfig });\n  if (isMac()) {"],
    ['IIFE own apply rebind before invocation remains tainted', "  Object.defineProperties.apply = dynamicConsumer;\n  (() => Object.defineProperties.apply(null, [{}, { value: { value: jobConfig } }]))();\n  if (isMac()) {"],
    ['nested helper own bind rebind before invocation remains tainted', "  function inner(descriptor) { Object.defineProperties.bind(null, {}, { value: descriptor })(); }\n  function outer(descriptor) { inner(descriptor); }\n  Object.defineProperties.bind = dynamicConsumer;\n  outer({ value: jobConfig });\n  if (isMac()) {"],
    ['helper prototype call rebind before invocation remains tainted', "  function applyDescriptors(descriptor) { Object.defineProperties.call(null, {}, { value: descriptor }); }\n  Function.prototype.call = dynamicConsumer;\n  applyDescriptors({ value: jobConfig });\n  if (isMac()) {"],
    ['IIFE prototype apply rebind before invocation remains tainted', "  Function.prototype.apply = dynamicConsumer;\n  (() => Object.defineProperties.apply(null, [{}, { value: { value: jobConfig } }]))();\n  if (isMac()) {"],
    ['nested helper prototype bind rebind before invocation remains tainted', "  function inner(descriptor) { Object.defineProperties.bind(null, {}, { value: descriptor })(); }\n  function outer(descriptor) { inner(descriptor); }\n  Function.prototype.bind = dynamicConsumer;\n  outer({ value: jobConfig });\n  if (isMac()) {"],
    ['warmed helper observes later own call rebind', "  function applyDescriptors(descriptor) { Object.defineProperties.call(null, {}, { value: descriptor }); }\n  applyDescriptors({ value: otherConfig });\n  Object.defineProperties.call = dynamicConsumer;\n  applyDescriptors({ value: jobConfig });\n  if (isMac()) {"],
  ].map(([label, replacement]) => boundedFactsRejection(label, () => collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)))).filter((failure): failure is string => failure !== undefined);
  const aliasAbruptConstructionPositiveFailures: string[] = [];
  for (const [label, replacement] of [
    ['defineProperties const alias spread throw stops harmful field getter', "  const defineProperties = Object.defineProperties;\n  const fields = { get enumerable() { throw new Error('stop'); } };\n  const descriptor = { ...fields, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties destructured alias spread throw stops harmful field getter', "  const { defineProperties } = Object;\n  const fields = { get enumerable() { throw new Error('stop'); } };\n  const descriptor = { ...fields, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  defineProperties({}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties call spread throw stops harmful field getter', "  const fields = { get enumerable() { throw new Error('stop'); } };\n  const descriptor = { ...fields, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperties.call(null, {}, { value: descriptor });\n  if (isMac()) {"],
    ['defineProperties apply spread throw stops harmful field getter', "  const fields = { get enumerable() { throw new Error('stop'); } };\n  const descriptor = { ...fields, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperties.apply(null, [{}, { value: descriptor }]);\n  if (isMac()) {"],
    ['defineProperties bind spread throw stops harmful field getter', "  const fields = { get enumerable() { throw new Error('stop'); } };\n  const descriptor = { ...fields, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  Object.defineProperties.bind(null, {}, { value: descriptor })();\n  if (isMac()) {"],
    ['repeated defineProperties wrapper normalization remains bounded', "  function applyDescriptors(descriptor) { Object.defineProperties.call(null, {}, { value: descriptor }); }\n  const fields = { get enumerable() { throw new Error('stop'); } };\n  const descriptor = { ...fields, get value() { jobConfig.config.process[0].train.steps = 99; return 1; } };\n  applyDescriptors(descriptor);\n  applyDescriptors(descriptor);\n  if (isMac()) {"],
    ['helper own call rebind after invocation does not retroactively taint', "  function applyDescriptors(descriptor) { Object.defineProperties.call(null, {}, { value: descriptor }); }\n  applyDescriptors({ value: jobConfig });\n  Object.defineProperties.call = dynamicConsumer;\n  if (isMac()) {"],
    ['IIFE own apply rebind after invocation does not retroactively taint', "  (() => Object.defineProperties.apply(null, [{}, { value: { value: jobConfig } }]))();\n  Object.defineProperties.apply = dynamicConsumer;\n  if (isMac()) {"],
    ['nested helper prototype bind rebind after invocation does not retroactively taint', "  function inner(descriptor) { Object.defineProperties.bind(null, {}, { value: descriptor })(); }\n  function outer(descriptor) { inner(descriptor); }\n  outer({ value: jobConfig });\n  Function.prototype.bind = dynamicConsumer;\n  if (isMac()) {"],
    ['helper own call delete restores inherited native before invocation', "  function applyDescriptors(descriptor) { Object.defineProperties.call(null, {}, { value: descriptor }); }\n  Object.defineProperties.call = dynamicConsumer;\n  delete Object.defineProperties.call;\n  applyDescriptors({ value: jobConfig });\n  if (isMac()) {"],
    ['IIFE prototype apply restoration is observed before invocation', "  const nativeApply = Function.prototype.apply;\n  Function.prototype.apply = dynamicConsumer;\n  Function.prototype.apply = nativeApply;\n  (() => Object.defineProperties.apply(null, [{}, { value: { value: jobConfig } }]))();\n  if (isMac()) {"],
    ['nested helper prototype bind delete throws before native invocation', "  function inner(descriptor) { Object.defineProperties.bind(null, {}, { value: descriptor })(); }\n  function outer(descriptor) { inner(descriptor); }\n  delete Function.prototype.bind;\n  outer({ value: jobConfig });\n  if (isMac()) {"],
    ['shadowed Object defineProperties does not replay descriptor fields', "  const Object = { defineProperties(target, descriptors) { otherObject.value = descriptors; return target; } };\n  Object.defineProperties({}, { value: { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } } });\n  if (isMac()) {"],
    ['rebound defineProperties alias does not replay descriptor fields', "  let defineProperties = Object.defineProperties;\n  defineProperties = (target, descriptors) => target;\n  defineProperties({}, { value: { get value() { jobConfig.config.process[0].train.steps = 99; return 1; } } });\n  if (isMac()) {"],
  ] as const) {
    const started = Date.now();
    try {
      assert.deepEqual(
        collectMigrateJobConfigBehaviorClaimsFromSource(summaryMigrateSource.replace('  if (isMac()) {', replacement)),
        summaryMigrateFacts,
      );
      const elapsed = Date.now() - started;
      if (elapsed > 2_000) aliasAbruptConstructionPositiveFailures.push(`${label}: completed in ${elapsed}ms`);
    } catch {
      aliasAbruptConstructionPositiveFailures.push(label);
    }
  }
  assert.deepEqual(
    { aliasAbruptConstructionFailures, aliasAbruptConstructionPositiveFailures },
    { aliasAbruptConstructionFailures: [], aliasAbruptConstructionPositiveFailures: [] },
    'defineProperties abrupt construction prepass uses normalized exact invocation identity',
  );
  assert.equal(summaryArchFacts.length, 30);
  assert.equal(declaredTypeScriptSources.length, 150, 'every concrete TypeScript source matched by the declared globs is scanned');
  assert.ok(declaredTypeScriptSources.includes('ui/src/components/JobLossGraph.tsx'));
  assert.ok(declaredTypeScriptSources.includes('ui/src/components/Card.tsx'), 'declared files with no relevant facts remain part of source coverage');
  assert.deepEqual(
    collectDeclaredServerGlobalClaimsFromSource(
      'ui/src/components/Card.tsx',
      `${readFileSync(join(liveRoot, 'ui/src/components/Card.tsx'), 'utf8')}\nconst added = process.env.PREVIOUSLY_ZERO_SETTING;`,
    ).map(item => item.path),
    ['PREVIOUSLY_ZERO_SETTING'],
    'a relevant occurrence added to a previously-zero declared file becomes emitted',
  );
  const liveFacts = collectTrainingBookUiFacts(liveRoot);
  const migrateJobConfigSource = readFileSync(
    join(liveRoot, 'ui/src/app/jobs/new/jobConfig.ts'),
    'utf8',
  );
  const migrateClaims = collectMigrateJobConfigBehaviorClaimsFromSource(
    migrateJobConfigSource,
    'ui/src/app/jobs/new/jobConfig.ts',
  );
  assert.deepEqual(
    migrateClaims.map(claim => [
      claim.symbol,
      claim.path,
      claim.behavior_contract,
    ]),
    [
      [
        'migrateJobConfig::auto_memory::after-write::delete',
        'config.process[*].model.auto_memory',
        {
          guard: 'property-present', operation: 'delete',
          sources: ['config.process[*].model.auto_memory', 'config.process[*].model.layer_offloading'],
          payload: { kind: 'undefined' },
        },
      ],
      [
        'migrateJobConfig::auto_memory::present::write',
        'config.process[*].model.layer_offloading',
        {
          guard: 'property-present', operation: 'write',
          sources: ['config.process[*].model.auto_memory'],
          payload: {
            kind: 'copy', source_path: 'config.process[*].model.auto_memory',
            fallback: { kind: 'boolean', value: false },
          },
        },
      ],
      [
        'migrateJobConfig::device::mac::write',
        'config.process[*].device',
        {
          guard: 'platform-mac', operation: 'write', sources: [],
          payload: { kind: 'literal', value: { kind: 'string', value: 'mps' } },
        },
      ],
      [
        'migrateJobConfig::logging::absent::write',
        'config.process[*].logging',
        {
          guard: 'property-absent', operation: 'write', sources: [],
          payload: {
            kind: 'literal',
            value: {
              kind: 'object',
              entries: [
                { key: 'log_every', value: { kind: 'number', value: 1 } },
                { key: 'use_ui_logger', value: { kind: 'boolean', value: true } },
              ],
            },
          },
        },
      ],
      [
        'migrateJobConfig::prompts-to-samples::after-write::delete',
        'config.process[*].sample.prompts',
        {
          guard: 'after-prompts-write', operation: 'delete',
          sources: ['config.process[*].sample.prompts', 'config.process[*].sample.samples'],
          payload: { kind: 'undefined' },
        },
      ],
      [
        'migrateJobConfig::prompts-to-samples::nonempty-array::write',
        'config.process[*].sample.samples',
        {
          guard: 'prompts-nonempty-array', operation: 'write',
          sources: ['config.process[*].sample.prompts'],
          payload: {
            kind: 'map-prompt-objects',
            source_path: 'config.process[*].sample.prompts', item_key: 'prompt',
          },
        },
      ],
      [
        'migrateJobConfig::type::ui_trainer::write',
        'config.process[*].type',
        {
          guard: 'type-is-ui-trainer', operation: 'write',
          sources: ['config.process[*].type'],
          payload: { kind: 'literal', value: { kind: 'string', value: 'diffusion_trainer' } },
        },
      ],
    ],
    'migrateJobConfig emits one exact semantic fact per reachable mutation',
  );
  for (const [label, mutated] of [
    ['prompt guard', migrateJobConfigSource.replace('.prompts.length > 0', '.prompts.length >= 0')],
    ['prompt source', migrateJobConfigSource.replaceAll('.sample.prompts', '.sample.legacyPrompts')],
    ['sample target', migrateJobConfigSource.replace('.sample.samples = newSamples', '.sample.items = newSamples')],
    ['trainer output', migrateJobConfigSource.replace("= 'diffusion_trainer'", "= 'other_trainer'")],
    ['auto-memory fallback', migrateJobConfigSource.replace('auto_memory ||\n      false', 'auto_memory ??\n      false')],
    ['logging value', migrateJobConfigSource.replace(
      'jobConfig.config.process[0].logging = {\n      log_every: 1',
      'jobConfig.config.process[0].logging = {\n      log_every: 2',
    )],
    ['platform guard', migrateJobConfigSource.replace('if (isMac())', 'if (isLinux())')],
    ['shadowed undefined nullish helper fallback', migrateJobConfigSource.replace(
      '  if (isMac()) {',
      '  const undefined = otherCheck;\n  const platformCheck = undefined ?? isMac;\n  if (platformCheck()) {',
    )],
    ['prompt write/delete order', migrateJobConfigSource.replace(
      'jobConfig.config.process[0].sample.samples = newSamples;\n    delete jobConfig.config.process[0].sample.prompts;',
      'delete jobConfig.config.process[0].sample.prompts;\n    jobConfig.config.process[0].sample.samples = newSamples;',
    )],
    ['auto-memory write/delete order', migrateJobConfigSource.replace(
      "jobConfig.config.process[0].model.layer_offloading = (jobConfig.config.process[0].model.auto_memory ||\n      false) as boolean;\n    delete jobConfig.config.process[0].model.auto_memory;",
      "delete jobConfig.config.process[0].model.auto_memory;\n    jobConfig.config.process[0].model.layer_offloading = (jobConfig.config.process[0].model.auto_memory ||\n      false) as boolean;",
    )],
    ['arrow IIFE mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  (() => { jobConfig.config.process[0].train.steps = 99; })();\n  return jobConfig;",
    )],
    ['function-expression IIFE mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  (function () { jobConfig.config.process[0].train.steps = 99; })();\n  return jobConfig;",
    )],
    ['invoked local function mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  function mutateConfig() { jobConfig.config.process[0].train.steps = 99; }\n  mutateConfig();\n  return jobConfig;",
    )],
    ['invoked local arrow mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  const mutateConfig = () => { jobConfig.config.process[0].train.steps = 99; };\n  mutateConfig();\n  return jobConfig;",
    )],
    ['compound assignment', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  jobConfig.config.process[0].train.steps += 1;\n  return jobConfig;",
    )],
    ['postfix update', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  jobConfig.config.process[0].train.steps++;\n  return jobConfig;",
    )],
    ['prefix update', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  ++jobConfig.config.process[0].train.steps;\n  return jobConfig;",
    )],
    ['local config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  const processConfig = jobConfig.config.process[0];\n  processConfig.train.steps = 99;\n  return jobConfig;",
    )],
    ['object destructuring mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  ({ steps: jobConfig.config.process[0].train.steps } = { steps: 99 });\n  return jobConfig;",
    )],
    ['array destructuring mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  [jobConfig.config.process[0].train.steps] = [99];\n  return jobConfig;",
    )],
    ['prompt object extra field', migrateJobConfigSource.replace(
      '        prompt: prompt,\n      });',
      '        prompt: prompt,\n        seed: 1,\n      });',
    )],
    ['prompt accumulator reorder', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      '    newSamples.reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;',
    )],
    ['prompt accumulator unshift', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      "    newSamples.unshift({ prompt: 'extra' });\n    jobConfig.config.process[0].sample.samples = newSamples;",
    )],
    ['conditional prompt push', migrateJobConfigSource.replace(
      `      newSamples.push({
        prompt: prompt,
      });`,
      `      if (prompt) {
        newSamples.push({
          prompt: prompt,
        });
      }`,
    )],
    ['prompt accumulator IIFE mutation', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      '    (() => newSamples.reverse())();\n    jobConfig.config.process[0].sample.samples = newSamples;',
    )],
    ['prompt accumulator invoked helper mutation', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      '    function reorderSamples() { newSamples.reverse(); }\n    reorderSamples();\n    jobConfig.config.process[0].sample.samples = newSamples;',
    )],
    ['synchronous forEach config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  [1].forEach(() => { jobConfig.config.process[0].train.steps = 99; });\n  return jobConfig;',
    )],
    ['bound synchronous forEach config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const mutateEach = () => { jobConfig.config.process[0].train.steps = 99; };\n  [1].forEach(mutateEach);\n  return jobConfig;',
    )],
    ['unmodeled callback config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  scheduleLater(() => { jobConfig.config.process[0].train.steps = 99; });\n  return jobConfig;',
    )],
    ['invoked callback through local helper', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  function invokeCallback(callback) { callback(); }\n  invokeCallback(() => { jobConfig.config.process[0].train.steps = 99; });\n  return jobConfig;',
    )],
    ['rebound platform helper alias', migrateJobConfigSource
      .replace('  if (isMac()) {', '  let platformCheck = isMac;\n  platformCheck = otherCheck;\n  if (platformCheck()) {')],
    ['platform helper alias before declaration', migrateJobConfigSource
      .replace('  if (isMac()) {', '  if (platformCheck()) {')
      .replace('  return jobConfig;', '  const platformCheck = isMac;\n  return jobConfig;')],
    ['dynamic destructure helper rebind', migrateJobConfigSource.replace(
      '  if (isMac()) {',
      '  let platformCheck = isMac;\n  ({ [runtimeKey]: platformCheck } = runtimeObject);\n  if (platformCheck()) {',
    )],
    ['unknown-branch config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  let targetConfig = jobConfig;\n  if (runtimeCondition) targetConfig = otherConfig;\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;',
    )],
    ['ternary-tainted config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const targetConfig = runtimeCondition ? jobConfig : otherConfig;\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;',
    )],
    ['logical-tainted config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const targetConfig = runtimeCondition && jobConfig;\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;',
    )],
    ['nullish-tainted config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const targetConfig = maybeConfig ?? jobConfig;\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;',
    )],
    ['switch-tainted config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  let targetConfig;\n  switch (runtimeMode) { case 1: targetConfig = jobConfig; break; default: targetConfig = otherConfig; }\n  targetConfig.config.process[0].train.steps = 99;\n  return jobConfig;',
    )],
    ['invoked object method mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const helpers = { mutate(config) { config.config.process[0].train.steps = 99; } };\n  helpers.mutate(jobConfig);\n  return jobConfig;',
    )],
    ['unknown-branch member helper rebind', migrateJobConfigSource.replace(
      '  if (isMac()) {',
      '  const helpers = { platformCheck: isMac };\n  if (runtimeCondition) helpers.platformCheck = otherCheck;\n  if (helpers.platformCheck()) {',
    )],
    ['local helper call invocation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  function mutate(config) { config.config.process[0].train.steps = 99; }\n  mutate.call(null, jobConfig);\n  return jobConfig;',
    )],
    ['local helper finite apply invocation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  function mutate(config) { config.config.process[0].train.steps = 99; }\n  mutate.apply(null, [jobConfig]);\n  return jobConfig;',
    )],
    ['local helper immediate bind invocation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  function mutate(config) { config.config.process[0].train.steps = 99; }\n  mutate.bind(null, jobConfig)();\n  return jobConfig;',
    )],
    ['local helper dynamic apply invocation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  function mutate(config) { config.config.process[0].train.steps = 99; }\n  mutate.apply(null, runtimeArgs);\n  return jobConfig;',
    )],
    ['Object.assign config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  Object.assign(jobConfig.config.process[0].train, { steps: 99 });\n  return jobConfig;',
    )],
    ['Object.defineProperty config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  Object.defineProperty(jobConfig.config.process[0].train, 'steps', { value: 99 });\n  return jobConfig;",
    )],
    ['Object.defineProperties config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  Object.defineProperties(jobConfig.config.process[0].train, { steps: { value: 99 } });\n  return jobConfig;',
    )],
    ['Reflect.set config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  Reflect.set(jobConfig.config.process[0].train, 'steps', 99);\n  return jobConfig;",
    )],
    ['Reflect.deleteProperty config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  Reflect.deleteProperty(jobConfig.config.process[0].train, 'steps');\n  return jobConfig;",
    )],
    ['aliased Object.assign config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const assignConfig = Object.assign;\n  const trainConfig = jobConfig.config.process[0].train;\n  assignConfig(trainConfig, { steps: 99 });\n  return jobConfig;',
    )],
    ['destructured Object.assign config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const { assign: assignConfig } = Object;\n  assignConfig(jobConfig.config.process[0].train, { steps: 99 });\n  return jobConfig;',
    )],
    ['computed Object.assign config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  Object['assign'](jobConfig.config.process[0].train, { steps: 99 });\n  return jobConfig;",
    )],
    ['assigned destructured Object.assign config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  let assignConfig;\n  ({ assign: assignConfig } = Object);\n  assignConfig(jobConfig.config.process[0].train, { steps: 99 });\n  return jobConfig;',
    )],
    ['assigned config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  let trainConfig;\n  trainConfig = jobConfig.config.process[0].train;\n  trainConfig.steps = 99;\n  return jobConfig;',
    )],
    ['destructured config alias mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  const { config: migratedConfig } = jobConfig;\n  migratedConfig.process[0].train.steps = 99;\n  return jobConfig;',
    )],
    ['Object.assign call config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  Object.assign.call(null, jobConfig.config.process[0].train, { steps: 99 });\n  return jobConfig;',
    )],
    ['Object.assign finite apply config mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  Object.assign.apply(null, [jobConfig.config.process[0].train, { steps: 99 }]);\n  return jobConfig;',
    )],
    ['overridden global Object.assign config call', migrateJobConfigSource.replace(
      '  return jobConfig;',
      '  Object.assign = otherAssign;\n  Object.assign(jobConfig.config.process[0].train, { steps: 99 });\n  return jobConfig;',
    )],
    ['prompt accumulator alias mutation', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      '    const sampleAccumulator = newSamples;\n    sampleAccumulator.reverse();\n    jobConfig.config.process[0].sample.samples = newSamples;',
    )],
    ['prompt accumulator alias API mutation', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      "    const sampleAccumulator = newSamples;\n    Reflect.set(sampleAccumulator, '0', { prompt: 'extra' });\n    jobConfig.config.process[0].sample.samples = newSamples;",
    )],
    ['prompt element alias mutation', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      "    const firstSample = newSamples[0];\n    firstSample.seed = 1;\n    jobConfig.config.process[0].sample.samples = newSamples;",
    )],
    ['prompt destructured element mutation', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      "    const [firstSample] = newSamples;\n    firstSample.seed = 1;\n    jobConfig.config.process[0].sample.samples = newSamples;",
    )],
    ['prompt assigned destructured element mutation', migrateJobConfigSource.replace(
      '    jobConfig.config.process[0].sample.samples = newSamples;',
      "    let firstSample;\n    [firstSample] = newSamples;\n    firstSample.seed = 1;\n    jobConfig.config.process[0].sample.samples = newSamples;",
    )],
    ['prompt item alias extra field', migrateJobConfigSource.replace(
      `      newSamples.push({
        prompt: prompt,
      });`,
      `      const sampleItem = { prompt: prompt, seed: 1 };
      newSamples.push(sampleItem);`,
    )],
    ['export binding', migrateJobConfigSource.replace('export const migrateJobConfig', 'const migrateJobConfig')],
    ['added reachable mutation', migrateJobConfigSource.replace(
      '  return jobConfig;',
      "  jobConfig.config.process[0].train.steps = 99;\n  return jobConfig;",
    )],
  ] as const) {
    assert.throws(
      () => collectMigrateJobConfigBehaviorClaimsFromSource(
        mutated,
        'ui/src/app/jobs/new/jobConfig.ts',
      ),
      /migrateJobConfig.*behavior|unsupported reachable mutation|unsupported local invocation|computed property names are unsupported/,
      `migrateJobConfig rejects changed ${label}`,
    );
  }
  assert.deepEqual(
    collectMigrateJobConfigBehaviorClaimsFromSource(
      `${migrateJobConfigSource}\nfunction sibling(jobConfig) { jobConfig.config.process[0].device = 'cpu'; }`,
      'ui/src/app/jobs/new/jobConfig.ts',
    ),
    migrateClaims,
    'sibling-function mutations do not cross the exact function boundary',
  );
  assert.deepEqual(
    collectMigrateJobConfigBehaviorClaimsFromSource(
      migrateJobConfigSource.replace(
        '  return jobConfig;',
        "  if (false) jobConfig.config.process[0].device = 'cpu';\n  return jobConfig;",
      ),
      'ui/src/app/jobs/new/jobConfig.ts',
    ),
    migrateClaims,
    'statically dead mutations do not alter migration facts',
  );
  assert.deepEqual(
    collectMigrateJobConfigBehaviorClaimsFromSource(
      migrateJobConfigSource.replaceAll('newSamples', 'migratedSamples'),
      'ui/src/app/jobs/new/jobConfig.ts',
    ),
    migrateClaims,
    'harmless local binding renames preserve semantic migration identities',
  );
  assert.deepEqual(
    collectMigrateJobConfigBehaviorClaimsFromSource(
      `${migrateJobConfigSource}\n// jobConfig.config.process[0].device = 'cpu';\nconst text = "delete jobConfig.config.process[0].sample.prompts";`,
      'ui/src/app/jobs/new/jobConfig.ts',
    ),
    migrateClaims,
    'comments and inert strings cannot create migration behavior facts',
  );
  for (const [label, insertion] of [
    ['uninvoked local function', "  function dormant() { jobConfig.config.process[0].train.steps = 99; }\n"],
    ['uninvoked local arrow', "  const dormant = () => { jobConfig.config.process[0].train.steps = 99; };\n"],
    ['dead IIFE', "  if (false) (() => { jobConfig.config.process[0].train.steps = 99; })();\n"],
    ['dead synchronous callback', "  if (false) [1].forEach(() => { jobConfig.config.process[0].train.steps = 99; });\n"],
    ['harmless unmodeled callback', "  scheduleLater(() => 42);\n"],
    ['unused callback in invoked local helper', "  function ignoreCallback(callback) {}\n  ignoreCallback(() => { jobConfig.config.process[0].train.steps = 99; });\n"],
    ['recursive no-op helper', "  function recurse() { recurse(); }\n  recurse();\n"],
    ['uninvoked object method', "  const helpers = { dormant() { jobConfig.config.process[0].train.steps = 99; } };\n"],
  ] as const) {
    assert.deepEqual(
      collectMigrateJobConfigBehaviorClaimsFromSource(
        migrateJobConfigSource.replace('  return jobConfig;', `${insertion}  return jobConfig;`),
        'ui/src/app/jobs/new/jobConfig.ts',
      ),
      migrateClaims,
      `${label} is not an executable config mutation boundary`,
    );
  }
  assert.deepEqual(
    collectMigrateJobConfigBehaviorClaimsFromSource(
      migrateJobConfigSource
        .replace('  if (isMac()) {', '  const platformCheck = isMac;\n  if (platformCheck()) {'),
      'ui/src/app/jobs/new/jobConfig.ts',
    ),
    migrateClaims,
    'source-ordered aliases of the exact isMac import preserve platform behavior',
  );
  for (const [label, replacement] of [
    ['later assignment', '  let platformCheck;\n  platformCheck = isMac;\n  if (platformCheck()) {'],
    ['array destructure', '  const [platformCheck] = [isMac];\n  if (platformCheck()) {'],
    ['object destructure', '  const { isMac: platformCheck } = { isMac };\n  if (platformCheck()) {'],
    ['array assignment destructure', '  let platformCheck;\n  [platformCheck] = [isMac];\n  if (platformCheck()) {'],
    ['object assignment destructure', '  let platformCheck;\n  ({ isMac: platformCheck } = { isMac });\n  if (platformCheck()) {'],
    ['statically live assignment', '  let platformCheck;\n  if (true) platformCheck = isMac;\n  if (platformCheck()) {'],
    ['same-origin if join', '  let platformCheck;\n  if (runtimeCondition) platformCheck = isMac;\n  else platformCheck = isMac;\n  if (platformCheck()) {'],
    ['same-origin switch join', '  let platformCheck;\n  switch (runtimeMode) { case 1: platformCheck = isMac; break; default: platformCheck = isMac; }\n  if (platformCheck()) {'],
    ['same-origin ternary join', '  const platformCheck = runtimeCondition ? isMac : isMac;\n  if (platformCheck()) {'],
    ['statically false logical fallback', "  const platformCheck = '' || isMac;\n  if (platformCheck()) {"],
    ['statically nullish fallback', '  const platformCheck = null ?? isMac;\n  if (platformCheck()) {'],
    ['later static member assignment', '  const helpers = {};\n  helpers.platformCheck = isMac;\n  if (helpers.platformCheck()) {'],
    ['same-origin member if join', '  const helpers = {};\n  if (runtimeCondition) helpers.platformCheck = isMac;\n  else helpers.platformCheck = isMac;\n  if (helpers.platformCheck()) {'],
    ['same-origin member switch join', '  const helpers = {};\n  switch (runtimeMode) { case 1: helpers.platformCheck = isMac; break; default: helpers.platformCheck = isMac; }\n  if (helpers.platformCheck()) {'],
  ] as const) {
    assert.deepEqual(
      collectMigrateJobConfigBehaviorClaimsFromSource(
        migrateJobConfigSource.replace('  if (isMac()) {', replacement),
        'ui/src/app/jobs/new/jobConfig.ts',
      ),
      migrateClaims,
      `source-ordered ${label} helper origin preserves platform behavior`,
    );
  }
  const aliasedPromptMapping = migrateJobConfigSource.replace(
    `      newSamples.push({
        prompt: prompt,
      });`,
    `      const sampleItem = { prompt: prompt };
      const sampleAccumulator = newSamples;
      sampleAccumulator.push(sampleItem);`,
  );
  assert.deepEqual(
    collectMigrateJobConfigBehaviorClaimsFromSource(aliasedPromptMapping, 'ui/src/app/jobs/new/jobConfig.ts'),
    migrateClaims,
    'exact accumulator and prompt-item aliases preserve one-to-one prompt mapping',
  );
  for (const [label, insertion] of [
    ['call', '  function inspect(config) {}\n  inspect.call(null, jobConfig);\n'],
    ['literal apply', '  function inspect(config) {}\n  inspect.apply(null, [jobConfig]);\n'],
    ['tuple apply', '  function inspect(config) {}\n  const inspectArgs = [jobConfig] as const;\n  inspect.apply(null, inspectArgs);\n'],
    ['immediate bind', '  function inspect(config) {}\n  inspect.bind(null, jobConfig)();\n'],
    ['dead dynamic apply', '  function inspect(config) {}\n  if (false) inspect.apply(null, runtimeArgs);\n'],
  ] as const) {
    assert.deepEqual(
      collectMigrateJobConfigBehaviorClaimsFromSource(
        migrateJobConfigSource.replace('  return jobConfig;', `${insertion}  return jobConfig;`),
        'ui/src/app/jobs/new/jobConfig.ts',
      ),
      migrateClaims,
      `finite local helper ${label} invocation preserves migration facts`,
    );
  }
  for (const [label, insertion] of [
    ['unrelated global API', '  Object.assign({}, { steps: 99 });\n'],
    ['dead global API', '  if (false) Object.assign(jobConfig.config.process[0].train, { steps: 99 });\n'],
    ['shadowed API', '  const Object = { assign: (target, value) => target };\n  Object.assign(jobConfig.config.process[0].train, { steps: 99 });\n'],
    ['rebound API alias', '  let assignConfig = Object.assign;\n  assignConfig = (target, value) => target;\n  assignConfig(jobConfig.config.process[0].train, { steps: 99 });\n'],
  ] as const) {
    assert.deepEqual(
      collectMigrateJobConfigBehaviorClaimsFromSource(
        migrateJobConfigSource.replace('  return jobConfig;', `${insertion}  return jobConfig;`),
        'ui/src/app/jobs/new/jobConfig.ts',
      ),
      migrateClaims,
      `${label} does not masquerade as an exact global config mutation API`,
    );
  }
  const modelArchChangeSource = readFileSync(
    join(liveRoot, 'ui/src/app/jobs/new/utils.ts'),
    'utf8',
  );
  const animaPathSource = readFileSync(
    join(liveRoot, 'ui/src/helpers/animaModelPaths.ts'),
    'utf8',
  );
  const architectureClaims = collectHandleModelArchChangeBehaviorClaimsFromSource(
    modelArchChangeSource,
    animaPathSource,
    'ui/src/app/jobs/new/utils.ts',
    'ui/src/helpers/animaModelPaths.ts',
  );
  const architectureSummary = architectureClaims.map(claim => ({
    symbol: claim.symbol,
    path: claim.path,
    behavior: claim.behavior_contract,
  }));
  const architectureExpected = [
    {
      symbol: 'handleModelArchChange::anima-paths::te_name_or_path::delete',
      path: 'config.process[*].model.te_name_or_path',
      behavior: { guard: 'text-encoder-path-unsupported', operation: 'delete', sources: ['config.process[*].model.te_name_or_path'], payload: { kind: 'undefined' } },
    },
    {
      symbol: 'handleModelArchChange::anima-paths::vae_path::delete',
      path: 'config.process[*].model.vae_path',
      behavior: { guard: 'vae-path-unsupported', operation: 'delete', sources: ['config.process[*].model.vae_path'], payload: { kind: 'undefined' } },
    },
    {
      symbol: 'handleModelArchChange::low_vram::section-unsupported::write',
      path: 'config.process[*].model.low_vram',
      behavior: { guard: 'section-unsupported', operation: 'write', sources: [], payload: { kind: 'literal', value: { kind: 'boolean', value: false } } },
    },
    ...[
      'layer_offloading',
      'layer_offloading_text_encoder_percent',
      'layer_offloading_transformer_percent',
    ].map(path => ({
      symbol: `handleModelArchChange::layer-offloading::unsupported-property-present::${path}::delete`,
      path: `config.process[*].model.${path}`,
      behavior: {
        guard: 'layer-offloading-unsupported-property-present', operation: 'delete',
        sources: ['config.process[*].model.layer_offloading'],
        payload: { kind: 'undefined' },
      },
    })),
    {
      symbol: 'handleModelArchChange::layer-offloading::supported-absent::layer_offloading::write',
      path: 'config.process[*].model.layer_offloading',
      behavior: { guard: 'section-supported-property-absent', operation: 'write', sources: ['config.process[*].model.layer_offloading'], payload: { kind: 'literal', value: { kind: 'boolean', value: false } } },
    },
    ...[
      'layer_offloading_text_encoder_percent',
      'layer_offloading_transformer_percent',
    ].map(path => ({
      symbol: `handleModelArchChange::layer-offloading::supported-absent::${path}::write`,
      path: `config.process[*].model.${path}`,
      behavior: { guard: 'section-supported-property-absent', operation: 'write', sources: ['config.process[*].model.layer_offloading'], payload: { kind: 'literal', value: { kind: 'number', value: 1 } } },
    })),
    {
      symbol: 'handleModelArchChange::architecture::change::write',
      path: 'config.process[*].model.arch',
      behavior: { guard: 'architecture-change', operation: 'write', sources: [], payload: { kind: 'architecture-name' } },
    },
    {
      symbol: 'handleModelArchChange::datasets::controls::write',
      path: 'config.process[*].datasets[*].controls',
      behavior: { guard: 'architecture-change', operation: 'write', sources: [], payload: { kind: 'architecture-field', field: 'controls' } },
    },
    ...['control_path_1', 'control_path_2', 'control_path_3'].map(path => ({
      symbol: `handleModelArchChange::datasets::multi-control::${path}::initialize`,
      path: `config.process[*].datasets[*].${path}`,
      behavior: { guard: 'multi-control', operation: 'write', sources: [`config.process[*].datasets[*].${path}`], payload: { kind: 'copy', source_path: `config.process[*].datasets[*].${path}`, fallback: { kind: 'null' } } },
    })),
    {
      symbol: 'handleModelArchChange::datasets::multi-control::control_path-to-control_path_1::copy',
      path: 'config.process[*].datasets[*].control_path_1',
      behavior: { guard: 'source-nonempty-target-empty', operation: 'write', sources: ['config.process[*].datasets[*].control_path', 'config.process[*].datasets[*].control_path_1'], payload: { kind: 'copy', source_path: 'config.process[*].datasets[*].control_path' } },
    },
    {
      symbol: 'handleModelArchChange::datasets::multi-control::control_path::delete',
      path: 'config.process[*].datasets[*].control_path',
      behavior: { guard: 'multi-control', operation: 'delete', sources: ['config.process[*].datasets[*].control_path'], payload: { kind: 'undefined' } },
    },
    {
      symbol: 'handleModelArchChange::datasets::single-control::control_path::initialize',
      path: 'config.process[*].datasets[*].control_path',
      behavior: { guard: 'single-control', operation: 'write', sources: ['config.process[*].datasets[*].control_path'], payload: { kind: 'copy', source_path: 'config.process[*].datasets[*].control_path', fallback: { kind: 'null' } } },
    },
    {
      symbol: 'handleModelArchChange::datasets::single-control::control_path_1-to-control_path::copy',
      path: 'config.process[*].datasets[*].control_path',
      behavior: { guard: 'source-nonempty', operation: 'write', sources: ['config.process[*].datasets[*].control_path_1'], payload: { kind: 'copy', source_path: 'config.process[*].datasets[*].control_path_1' } },
    },
    ...['control_path_1', 'control_path_2', 'control_path_3'].map(path => ({
      symbol: `handleModelArchChange::datasets::single-control::${path}::delete`,
      path: `config.process[*].datasets[*].${path}`,
      behavior: { guard: 'single-control', operation: 'delete', sources: [`config.process[*].datasets[*].${path}`], payload: { kind: 'undefined' } },
    })),
    ...['control_path', 'control_path_1', 'control_path_2', 'control_path_3'].map(path => ({
      symbol: `handleModelArchChange::datasets::no-control::${path}::delete`,
      path: `config.process[*].datasets[*].${path}`,
      behavior: { guard: 'no-control', operation: 'delete', sources: [`config.process[*].datasets[*].${path}`], payload: { kind: 'undefined' } },
    })),
    {
      symbol: 'handleModelArchChange::datasets::num_frames::section-unsupported::write',
      path: 'config.process[*].datasets[*].num_frames',
      behavior: { guard: 'frame-count-unsupported', operation: 'write', sources: [], payload: { kind: 'literal', value: { kind: 'number', value: 1 } } },
    },
    {
      symbol: 'handleModelArchChange::datasets::auto_frame_count::section-unsupported::delete',
      path: 'config.process[*].datasets[*].auto_frame_count',
      behavior: { guard: 'auto-frame-count-unsupported', operation: 'delete', sources: [], payload: { kind: 'undefined' } },
    },
    {
      symbol: 'handleModelArchChange::samples::ctrl_img::section-unsupported::delete',
      path: 'config.process[*].sample.samples[*].ctrl_img',
      behavior: { guard: 'sample-control-unsupported', operation: 'delete', sources: [], payload: { kind: 'undefined' } },
    },
    {
      symbol: 'handleModelArchChange::defaults::current::revert',
      path: 'config.process[*].model.arch',
      behavior: { guard: 'revert-current-defaults', operation: 'write', sources: ['config.process[*].model.arch'], payload: { kind: 'architecture-default', phase: 'revert', value_index: 1 } },
    },
    {
      symbol: 'handleModelArchChange::defaults::next::apply',
      path: 'config.process[*].model.arch',
      behavior: { guard: 'apply-next-defaults', operation: 'write', sources: ['config.process[*].model.arch'], payload: { kind: 'architecture-default', phase: 'apply', value_index: 0 } },
    },
  ].sort((left, right) => left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0);
  assert.equal(architectureExpected.length, 30, 'architecture behavior inventory is exact');
  assert.deepEqual(
    architectureSummary,
    architectureExpected,
    'handleModelArchChange emits one exact semantic fact per reachable transition mutation',
  );
  const expectedProductionBehaviorClaims = [...migrateClaims, ...architectureClaims]
    .sort((left, right) => {
      const leftKey = `${left.source_path}\0${left.symbol}\0${left.path}\0${left.kind}`;
      const rightKey = `${right.source_path}\0${right.symbol}\0${right.path}\0${right.kind}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
  const productionBehaviorClaims = liveFacts.config_claims.filter(
    claim => claim.behavior_contract !== undefined,
  );
  assert.equal(productionBehaviorClaims.length, 37, 'production facts contain all 37 exact config behaviors');
  assert.deepEqual(
    productionBehaviorClaims,
    expectedProductionBehaviorClaims,
    'production behavior facts are the exact focused collector output',
  );
  for (const [label, mutatedSource, mutatedHelper = animaPathSource] of [
    ['low-vram section guard', modelArchChangeSource.replace("includes('model.low_vram')", "includes('model.other')")],
    ['low-vram value', modelArchChangeSource.replace("setJobConfig(false, 'config.process[0].model.low_vram')", "setJobConfig(true, 'config.process[0].model.low_vram')")],
    ['layer delete target', modelArchChangeSource.replace('delete newModel.layer_offloading_transformer_percent', 'delete newModel.other_percent')],
    ['layer initialization value', modelArchChangeSource.replace("setJobConfig(1.0, 'config.process[0].model.layer_offloading_text_encoder_percent')", "setJobConfig(0.5, 'config.process[0].model.layer_offloading_text_encoder_percent')")],
    ['selected architecture binding', modelArchChangeSource.replace("setJobConfig(newArchName, 'config.process[0].model.arch')", "setJobConfig(currentArchName, 'config.process[0].model.arch')")],
    ['architecture controls source', modelArchChangeSource.replace('const controls = newArch?.controls ?? []', 'const controls = currentArch?.controls ?? []')],
    ['multi-control copy source', modelArchChangeSource.replace('newDataset.control_path_1 = newDataset.control_path;', 'newDataset.control_path_1 = newDataset.control_path_2;')],
    ['dataset aggregate commit', modelArchChangeSource.replace("setJobConfig(datasets, 'config.process[0].datasets')", "setJobConfig(otherDatasets, 'config.process[0].datasets')")],
    ['frame reset value', modelArchChangeSource.replace('newDataset.num_frames = 1;', 'newDataset.num_frames = 2;')],
    ['sample cleanup target', modelArchChangeSource.replace('delete newSample.ctrl_img;', 'delete newSample.prompt;')],
    ['current default index', modelArchChangeSource.replace('setJobConfig(currentDefaults[key][1], key);', 'setJobConfig(currentDefaults[key][0], key);')],
    ['next default index', modelArchChangeSource.replace('setJobConfig(newDefaults[key][0], key);', 'setJobConfig(newDefaults[key][1], key);')],
    ['added reachable setter', modelArchChangeSource.replace(
      "  // update samples",
      "  setJobConfig(99, 'config.process[0].train.steps');\n\n  // update samples",
    )],
    ['export binding', modelArchChangeSource.replace('export const handleModelArchChange', 'const handleModelArchChange')],
    ['architecture import binding', modelArchChangeSource.replace("from './options'", "from './otherOptions'")],
    ['cleanup import binding', modelArchChangeSource.replace("from '@/helpers/animaModelPaths'", "from '@/helpers/otherAnimaPaths'")],
    ['shadowed setter', modelArchChangeSource.replace(
      "    setJobConfig(false, 'config.process[0].model.low_vram');",
      "    const setJobConfig = otherSetter;\n    setJobConfig(false, 'config.process[0].model.low_vram');",
    )],
    ['helper section guard', modelArchChangeSource, animaPathSource.replace("'model.te_name_or_path'", "'model.other_path'")],
    ['helper delete target', modelArchChangeSource, animaPathSource.replace('delete cleaned.vae_path', 'delete cleaned.te_name_or_path')],
    ['helper early-return removal', modelArchChangeSource, animaPathSource.replace('  if (supportsTextEncoderPath && supportsVaePath) return model;\n', '')],
    ['helper early-return copy', modelArchChangeSource, animaPathSource.replace('return model;', 'return { ...model };')],
    ['helper early-return guard', modelArchChangeSource, animaPathSource.replace('supportsTextEncoderPath && supportsVaePath', 'supportsTextEncoderPath || supportsVaePath')],
    ['helper live extra return', modelArchChangeSource, animaPathSource.replace(
      '  const cleaned = { ...model };',
      '  if (additionalSections) return model;\n  const cleaned = { ...model };',
    )],
    ['helper statically dead required delete', modelArchChangeSource, animaPathSource.replace(
      '  if (!supportsVaePath) delete cleaned.vae_path;',
      '  if (false) delete cleaned.vae_path;',
    )],
    ['helper conditional final identity', modelArchChangeSource, animaPathSource.replace(
      '  return cleaned;',
      '  if (additionalSections) return cleaned;\n  return model;',
    )],
    ['cleanup selected-section argument', modelArchChangeSource.replace('clearUnsupportedAnimaPaths(currentModel, newArch?.additionalSections)', 'clearUnsupportedAnimaPaths(currentModel, currentArch?.additionalSections)')],
    ['cleanup changed-model left operand', modelArchChangeSource.replace('cleanedModel !== currentModel', 'newArch !== currentModel')],
    ['cleanup changed-model right operand', modelArchChangeSource.replace('cleanedModel !== currentModel', 'cleanedModel !== newArch')],
    ['setter value alias', modelArchChangeSource.replace(
      '  // update samples',
      "  const commit = setJobConfig;\n  commit(99, 'config.process[0].train.steps');\n\n  // update samples",
    )],
    ['setter value alias rebound', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "let commit = setJobConfig;\n    commit = otherSetter;\n    commit(false, 'config.process[0].model.low_vram');",
    )],
    ['synchronous forEach setter', modelArchChangeSource.replace(
      '  // update samples',
      "  [1].forEach(() => setJobConfig(99, 'config.process[0].train.steps'));\n\n  // update samples",
    )],
    ['bound synchronous forEach setter', modelArchChangeSource.replace(
      '  // update samples',
      "  const mutateEach = () => setJobConfig(99, 'config.process[0].train.steps');\n  [1].forEach(mutateEach);\n\n  // update samples",
    )],
    ['unmodeled callback setter', modelArchChangeSource.replace(
      '  // update samples',
      "  scheduleLater(() => setJobConfig(99, 'config.process[0].train.steps'));\n\n  // update samples",
    )],
    ['invoked setter callback through local helper', modelArchChangeSource.replace(
      '  // update samples',
      "  function invokeCallback(callback) { callback(); }\n  invokeCallback(() => setJobConfig(99, 'config.process[0].train.steps'));\n\n  // update samples",
    )],
    ['setter alias before declaration', modelArchChangeSource.replace(
      "    setJobConfig(false, 'config.process[0].model.low_vram');",
      "    commit(false, 'config.process[0].model.low_vram');\n    const commit = setJobConfig;",
    )],
    ['setter alias unknown-branch rebind', modelArchChangeSource.replace(
      "    setJobConfig(false, 'config.process[0].model.low_vram');",
      "    let commit = setJobConfig;\n    if (runtimeCondition) commit = otherSetter;\n    commit(false, 'config.process[0].model.low_vram');",
    )],
    ['setter call invocation', modelArchChangeSource.replace(
      '  // update samples',
      "  setJobConfig.call(null, 99, 'config.process[0].train.steps');\n\n  // update samples",
    )],
    ['setter finite apply invocation', modelArchChangeSource.replace(
      '  // update samples',
      "  setJobConfig.apply(null, [99, 'config.process[0].train.steps']);\n\n  // update samples",
    )],
    ['setter immediate bind invocation', modelArchChangeSource.replace(
      '  // update samples',
      "  setJobConfig.bind(null, 99)('config.process[0].train.steps');\n\n  // update samples",
    )],
    ['setter dynamic apply invocation', modelArchChangeSource.replace(
      '  // update samples',
      '  setJobConfig.apply(null, runtimeArgs);\n\n  // update samples',
    )],
    ['setter own call override', modelArchChangeSource.replace(
      "    setJobConfig(false, 'config.process[0].model.low_vram');",
      "    setJobConfig.call = otherCall;\n    setJobConfig.call(null, false, 'config.process[0].model.low_vram');",
    )],
    ['setter own apply override', modelArchChangeSource.replace(
      "    setJobConfig(false, 'config.process[0].model.low_vram');",
      "    setJobConfig.apply = otherApply;\n    setJobConfig.apply(null, [false, 'config.process[0].model.low_vram']);",
    )],
    ['setter own bind override', modelArchChangeSource.replace(
      "    setJobConfig(false, 'config.process[0].model.low_vram');",
      "    setJobConfig.bind = otherBind;\n    setJobConfig.bind(null, false)('config.process[0].model.low_vram');",
    )],
    ['lost-receiver extracted call method', modelArchChangeSource.replace(
      "    setJobConfig(false, 'config.process[0].model.low_vram');",
      "    const invoke = setJobConfig.call;\n    invoke(null, false, 'config.process[0].model.low_vram');",
    )],
    ['Object.assign architecture config mutation', modelArchChangeSource.replace(
      '  // update samples',
      '  Object.assign(jobConfig.config.process[0].train, { steps: 99 });\n\n  // update samples',
    )],
    ['Reflect.set architecture config mutation', modelArchChangeSource.replace(
      '  // update samples',
      "  Reflect.set(jobConfig.config.process[0].train, 'steps', 99);\n\n  // update samples",
    )],
    ['destructured Reflect.set architecture config mutation', modelArchChangeSource.replace(
      '  // update samples',
      "  const { set: reflectSet } = Reflect;\n  reflectSet(jobConfig.config.process[0].train, 'steps', 99);\n\n  // update samples",
    )],
    ['computed Reflect.set architecture config mutation', modelArchChangeSource.replace(
      '  // update samples',
      "  Reflect['set'](jobConfig.config.process[0].train, 'steps', 99);\n\n  // update samples",
    )],
    ['arrow IIFE setter', modelArchChangeSource.replace(
      '  // update samples',
      "  (() => setJobConfig(99, 'config.process[0].train.steps'))();\n\n  // update samples",
    )],
    ['function-expression IIFE setter', modelArchChangeSource.replace(
      '  // update samples',
      "  (function () { setJobConfig(99, 'config.process[0].train.steps'); })();\n\n  // update samples",
    )],
    ['invoked local function setter', modelArchChangeSource.replace(
      '  // update samples',
      "  function mutateConfig() { setJobConfig(99, 'config.process[0].train.steps'); }\n  mutateConfig();\n\n  // update samples",
    )],
    ['invoked local arrow setter', modelArchChangeSource.replace(
      '  // update samples',
      "  const mutateConfig = () => setJobConfig(99, 'config.process[0].train.steps');\n  mutateConfig();\n\n  // update samples",
    )],
    ['compound config assignment', modelArchChangeSource.replace(
      '  // update samples',
      "  jobConfig.config.process[0].train.steps += 1;\n\n  // update samples",
    )],
    ['postfix config update', modelArchChangeSource.replace(
      '  // update samples',
      "  jobConfig.config.process[0].train.steps++;\n\n  // update samples",
    )],
    ['local config alias mutation', modelArchChangeSource.replace(
      '  // update samples',
      "  const processConfig = jobConfig.config.process[0];\n  processConfig.train.steps = 99;\n\n  // update samples",
    )],
    ['destructuring config mutation', modelArchChangeSource.replace(
      '  // update samples',
      "  [jobConfig.config.process[0].train.steps] = [99];\n\n  // update samples",
    )],
    ['objectCopy import source', modelArchChangeSource.replace("from '@/utils/basic'", "from '@/utils/other'")],
    ['shadowed objectCopy helper', modelArchChangeSource.replace(
      '  // handle layer offloading setting',
      '  const objectCopy = value => value;\n\n  // handle layer offloading setting',
    )],
    ['shadowed expandDatasetDefaults helper', modelArchChangeSource.replace(
      '  // update the defaults when a model is selected',
      '  const expandDatasetDefaults = () => ({});\n\n  // update the defaults when a model is selected',
    )],
    ['layer presence decoy', modelArchChangeSource.replace(
      "    if ('layer_offloading' in jobConfig.config.process[0].model) {\n      const newModel = objectCopy(cleanedModel);",
      "    if ('layer_offloading' in jobConfig.config.process[0].model) {}\n    {\n      const newModel = objectCopy(cleanedModel);",
    )],
    ['helper cleaned alias extra mutation', modelArchChangeSource, animaPathSource.replace(
      '  return cleaned;',
      "  const target = cleaned;\n  target.other_path = 'changed';\n  return cleaned;",
    )],
    ['helper model alias mutation', modelArchChangeSource, animaPathSource.replace(
      '  const cleaned = { ...model };',
      "  const sourceModel = model;\n  sourceModel.other_path = 'changed';\n  const cleaned = { ...model };",
    )],
    ['helper destructured model alias mutation', modelArchChangeSource, animaPathSource.replace(
      '  const cleaned = { ...model };',
      "  const { sourceModel } = { sourceModel: model };\n  sourceModel.other_path = 'changed';\n  const cleaned = { ...model };",
    )],
    ['helper cleaned API mutation', modelArchChangeSource, animaPathSource.replace(
      '  return cleaned;',
      "  Object.defineProperty(cleaned, 'other_path', { value: 'changed' });\n  return cleaned;",
    )],
    ['helper required delete runtime wrapper', modelArchChangeSource, animaPathSource.replace(
      '  if (!supportsVaePath) delete cleaned.vae_path;',
      '  if (additionalSections) {\n    if (!supportsVaePath) delete cleaned.vae_path;\n  }',
    )],
  ] as const) {
    assert.throws(
      () => collectHandleModelArchChangeBehaviorClaimsFromSource(
        mutatedSource,
        mutatedHelper,
        'ui/src/app/jobs/new/utils.ts',
        'ui/src/helpers/animaModelPaths.ts',
      ),
      /handleModelArchChange.*behavior|unsupported reachable mutation|unsupported local invocation|Anima path behavior/,
      `handleModelArchChange rejects changed ${label}`,
    );
  }
  const defaultLoops = `  // revert defaults from previous model
  for (const key in currentDefaults) {
    setJobConfig(currentDefaults[key][1], key);
  }

  for (const key in newDefaults) {
    setJobConfig(newDefaults[key][0], key);
  }`;
  const reversedDefaultLoops = `  for (const key in newDefaults) {
    setJobConfig(newDefaults[key][0], key);
  }

  // revert defaults from previous model
  for (const key in currentDefaults) {
    setJobConfig(currentDefaults[key][1], key);
  }`;
  assert.throws(
    () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      modelArchChangeSource.replace(defaultLoops, reversedDefaultLoops),
      animaPathSource,
    ),
    /handleModelArchChange.*behavior/,
    'previous defaults must be reverted before new defaults are applied',
  );
  assert.throws(
    () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      modelArchChangeSource.replace(
        `      if (newDataset.control_path && newDataset.control_path !== '') {
        // only set if not overwriting
        if (!newDataset.control_path_1) {
          newDataset.control_path_1 = newDataset.control_path;
        }
      }
      delete newDataset.control_path; // remove single control path`,
        `      delete newDataset.control_path; // remove single control path
      if (newDataset.control_path && newDataset.control_path !== '') {
        // only set if not overwriting
        if (!newDataset.control_path_1) {
          newDataset.control_path_1 = newDataset.control_path;
        }
      }`,
      ),
      animaPathSource,
    ),
    /handleModelArchChange.*behavior/,
    'multi-control copy must precede deletion of its source',
  );
  assert.throws(
    () => collectHandleModelArchChangeBehaviorClaimsFromSource(
      modelArchChangeSource.replace(
        `      if (newDataset.control_path_1 && newDataset.control_path_1 !== '') {
        newDataset.control_path = newDataset.control_path_1;
      }
      if ('control_path_1' in newDataset) {
        delete newDataset.control_path_1;
      }`,
        `      if ('control_path_1' in newDataset) {
        delete newDataset.control_path_1;
      }
      if (newDataset.control_path_1 && newDataset.control_path_1 !== '') {
        newDataset.control_path = newDataset.control_path_1;
      }`,
      ),
      animaPathSource,
    ),
    /handleModelArchChange.*behavior/,
    'single-control copy must precede deletion of its source',
  );
  assert.deepEqual(
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      `${modelArchChangeSource}\nfunction sibling(setJobConfig) { setJobConfig(3, 'config.process[0].train.steps'); }`,
      animaPathSource,
    ),
    architectureClaims,
    'sibling-function setters do not cross the exact architecture handler boundary',
  );
  assert.deepEqual(
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      modelArchChangeSource.replace(
        '  // update samples',
        "  if (false) setJobConfig(3, 'config.process[0].train.steps');\n\n  // update samples",
      ),
      animaPathSource,
    ),
    architectureClaims,
    'statically dead setters do not alter architecture behavior facts',
  );
  assert.deepEqual(
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      modelArchChangeSource,
      animaPathSource.replace(
        '  const cleaned = { ...model };',
        '  if (false) return model;\n  const cleaned = { ...model };',
      ),
    ),
    architectureClaims,
    'statically dead Anima returns do not alter helper behavior',
  );
  for (const [label, transformed] of [
    ['call', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "setJobConfig.call(null, false, 'config.process[0].model.low_vram');",
    )],
    ['literal apply', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "setJobConfig.apply(null, [false, 'config.process[0].model.low_vram']);",
    )],
    ['tuple apply', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "const lowVramArgs = [false, 'config.process[0].model.low_vram'] as const;\n    setJobConfig.apply(null, lowVramArgs);",
    )],
    ['immediate bind', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "setJobConfig.bind(null, false)('config.process[0].model.low_vram');",
    )],
    ['later assignment', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "let commit;\n    commit = setJobConfig;\n    commit(false, 'config.process[0].model.low_vram');",
    )],
    ['array destructure', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "const [commit] = [setJobConfig];\n    commit(false, 'config.process[0].model.low_vram');",
    )],
    ['array assignment destructure', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "let commit;\n    [commit] = [setJobConfig];\n    commit(false, 'config.process[0].model.low_vram');",
    )],
    ['statically dead rebind', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "let commit = setJobConfig;\n    if (false) commit = otherSetter;\n    commit(false, 'config.process[0].model.low_vram');",
    )],
    ['object method named call', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "const wrapper = { call(value, path) { setJobConfig(value, path); } };\n    wrapper.call(false, 'config.process[0].model.low_vram');",
    )],
    ['receiver-preserving call through setter alias', modelArchChangeSource.replace(
      "setJobConfig(false, 'config.process[0].model.low_vram');",
      "const commit = setJobConfig;\n    commit.call(null, false, 'config.process[0].model.low_vram');",
    )],
  ] as const) {
    assert.deepEqual(
      collectHandleModelArchChangeBehaviorClaimsFromSource(transformed, animaPathSource),
      architectureClaims,
      `finite setter ${label} invocation preserves architecture facts`,
    );
  }
  assert.deepEqual(
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      modelArchChangeSource,
      animaPathSource
        .replace('  const cleaned = { ...model };', '  const cleaned = { ...model };\n  const target = cleaned;')
        .replaceAll('delete cleaned.', 'delete target.'),
    ),
    architectureClaims,
    'exact cleaned-model aliases preserve required Anima deletions',
  );
  for (const [label, insertion] of [
    ['uninvoked local function', "  function dormant() { setJobConfig(99, 'config.process[0].train.steps'); }\n"],
    ['uninvoked local arrow', "  const dormant = () => setJobConfig(99, 'config.process[0].train.steps');\n"],
    ['dead IIFE', "  if (false) (() => setJobConfig(99, 'config.process[0].train.steps'))();\n"],
    ['dead synchronous callback', "  if (false) [1].forEach(() => setJobConfig(99, 'config.process[0].train.steps'));\n"],
    ['harmless unmodeled callback', "  scheduleLater(() => 42);\n"],
    ['unused callback in invoked local helper', "  function ignoreCallback(callback) {}\n  ignoreCallback(() => setJobConfig(99, 'config.process[0].train.steps'));\n"],
    ['recursive no-op helper', "  function recurse() { recurse(); }\n  recurse();\n"],
  ] as const) {
    assert.deepEqual(
      collectHandleModelArchChangeBehaviorClaimsFromSource(
        modelArchChangeSource.replace('  // update samples', `${insertion}\n  // update samples`),
        animaPathSource,
      ),
      architectureClaims,
      `${label} is not an executable architecture mutation boundary`,
    );
  }
  const aliasedArchitectureHelpers = modelArchChangeSource
    .replace("import { objectCopy } from '@/utils/basic';", "import { objectCopy } from '@/utils/basic';\nconst copyValue = objectCopy;")
    .replace("import { clearUnsupportedAnimaPaths } from '@/helpers/animaModelPaths';", "import { clearUnsupportedAnimaPaths } from '@/helpers/animaModelPaths';\nconst cleanupPaths = clearUnsupportedAnimaPaths;")
    .replace('export const handleModelArchChange', 'const expandDefaults = expandDatasetDefaults;\n\nexport const handleModelArchChange')
    .replaceAll('objectCopy(', 'copyValue(')
    .replace('clearUnsupportedAnimaPaths(currentModel, newArch?.additionalSections)', 'cleanupPaths(currentModel, newArch?.additionalSections)')
    .replaceAll('expandDatasetDefaults(', 'expandDefaults(')
    .replace('  setJobConfig: (value: any, key: string) => void,\n) => {', '  setJobConfig: (value: any, key: string) => void,\n) => {\n  const commit = setJobConfig;')
    .replaceAll('setJobConfig(', 'commit(');
  assert.deepEqual(
    collectHandleModelArchChangeBehaviorClaimsFromSource(aliasedArchitectureHelpers, animaPathSource),
    architectureClaims,
    'source-ordered aliases of exact setters and approved helpers preserve architecture behavior',
  );
  assert.deepEqual(
    collectHandleModelArchChangeBehaviorClaimsFromSource(
      modelArchChangeSource
        .replaceAll('currentModel', 'priorModel')
        .replaceAll('cleanedModel', 'sanitizedModel')
        .replace('const controls =', 'const archControls =')
        .replace('newDataset.controls = controls;', 'newDataset.controls = archControls;')
        .replace('const datasets =', 'const updatedDatasets =')
        .replace("setJobConfig(datasets, 'config.process[0].datasets')", "setJobConfig(updatedDatasets, 'config.process[0].datasets')")
        .replace('const samples =', 'const updatedSamples =')
        .replace("setJobConfig(samples, 'config.process[0].sample.samples')", "setJobConfig(updatedSamples, 'config.process[0].sample.samples')"),
      animaPathSource,
    ),
    architectureClaims,
    'harmless local binding renames preserve semantic architecture identities',
  );

  const replaceBehaviorFixture = (source: string, needle: string, replacement: string): string => {
    assert.ok(source.includes(needle), `behavior-semantics fixture contains ${needle}`);
    return source.replace(needle, replacement);
  };
  const expandHelperStart = modelArchChangeSource.indexOf('const expandDatasetDefaults =');
  const expandHelperEnd = modelArchChangeSource.indexOf('\n\nexport const handleModelArchChange');
  assert.ok(expandHelperStart >= 0 && expandHelperEnd > expandHelperStart, 'expandDatasetDefaults fixture is bounded');
  const expandHelperSource = modelArchChangeSource.slice(expandHelperStart, expandHelperEnd);
  const mutateExpandHelper = (mutate: (helper: string) => string): string => {
    const mutated = mutate(expandHelperSource);
    assert.notEqual(mutated, expandHelperSource, 'expandDatasetDefaults mutation changes the helper');
    return `${modelArchChangeSource.slice(0, expandHelperStart)}${mutated}${modelArchChangeSource.slice(expandHelperEnd)}`;
  };
  const behaviorSemanticsMissingRejects: string[] = [];
  const expectMigrateBehaviorRejection = (label: string, mutated: string): void => {
    try {
      collectMigrateJobConfigBehaviorClaimsFromSource(mutated);
      behaviorSemanticsMissingRejects.push(label);
    } catch {}
  };
  const expectArchitectureBehaviorRejection = (label: string, mutated: string): void => {
    try {
      collectHandleModelArchChangeBehaviorClaimsFromSource(mutated, animaPathSource);
      behaviorSemanticsMissingRejects.push(label);
    } catch {}
  };

  const canonicalTypeBlock = `  if (jobConfig?.config?.process && jobConfig.config.process[0]?.type === 'ui_trainer') {
    jobConfig.config.process[0].type = 'diffusion_trainer';
  }`;
  expectMigrateBehaviorRejection(
    'migration exact type guard nested under runtime guard',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      canonicalTypeBlock,
      `  if (runtimeCondition) {
    if (jobConfig?.config?.process && jobConfig.config.process[0]?.type === 'ui_trainer') {
      jobConfig.config.process[0].type = 'diffusion_trainer';
    }
  }`,
    ),
  );
  expectMigrateBehaviorRejection(
    'migration helper call runtime-guards exact type write',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      "    jobConfig.config.process[0].type = 'diffusion_trainer';",
      "    function commitType() { jobConfig.config.process[0].type = 'diffusion_trainer'; }\n    if (runtimeCondition) commitType();",
    ),
  );
  expectArchitectureBehaviorRejection(
    'architecture-name helper commit runtime-guarded at call site',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  function commitArchitecture() { setJobConfig(newArchName, 'config.process[0].model.arch'); }\n  if (runtimeCondition) commitArchitecture();",
    ),
  );
  expectArchitectureBehaviorRejection(
    'dataset aggregate helper commit runtime-guarded at call site',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(datasets, 'config.process[0].datasets');",
      "  function commitDatasets() { setJobConfig(datasets, 'config.process[0].datasets'); }\n  if (runtimeCondition) commitDatasets();",
    ),
  );
  expectArchitectureBehaviorRejection(
    'sample aggregate callback commit runtime-guarded at call site',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(samples, 'config.process[0].sample.samples');",
      "  if (runtimeCondition) [samples].forEach(value => setJobConfig(value, 'config.process[0].sample.samples'));",
    ),
  );
  expectArchitectureBehaviorRejection(
    'current-default commits wrapped in runtime guard',
    replaceBehaviorFixture(
      modelArchChangeSource,
      `  // revert defaults from previous model
  for (const key in currentDefaults) {
    setJobConfig(currentDefaults[key][1], key);
  }`,
      `  // revert defaults from previous model
  if (runtimeCondition) {
    for (const key in currentDefaults) {
      setJobConfig(currentDefaults[key][1], key);
      }
  }`,
    ),
  );
  expectMigrateBehaviorRejection(
    'migration exact type guard nested in runtime loop',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      canonicalTypeBlock,
      `  for (; runtimeCondition;) {
    if (jobConfig?.config?.process && jobConfig.config.process[0]?.type === 'ui_trainer') {
      jobConfig.config.process[0].type = 'diffusion_trainer';
    }
    break;
  }`,
    ),
  );
  expectArchitectureBehaviorRejection(
    'architecture-name commit wrapped in runtime loop',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  while (runtimeCondition) { setJobConfig(newArchName, 'config.process[0].model.arch'); break; }",
    ),
  );
  expectArchitectureBehaviorRejection(
    'architecture-name commit behind runtime logical guard',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  runtimeCondition && setJobConfig(newArchName, 'config.process[0].model.arch');",
    ),
  );
  expectArchitectureBehaviorRejection(
    'architecture-name commit behind runtime switch guard',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  switch (runtimeMode) { case 'commit': setJobConfig(newArchName, 'config.process[0].model.arch'); break; }",
    ),
  );
  expectMigrateBehaviorRejection(
    'migration required write follows potentially throwing try evaluation',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      canonicalTypeBlock,
      `  try {
    JSON.parse('not json');
    if (jobConfig?.config?.process && jobConfig.config.process[0]?.type === 'ui_trainer') {
      jobConfig.config.process[0].type = 'diffusion_trainer';
    }
  } catch {}`,
    ),
  );
  expectArchitectureBehaviorRejection(
    'architecture-name commit follows potentially throwing try evaluation',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  try { JSON.parse(newArchName); setJobConfig(newArchName, 'config.process[0].model.arch'); } catch {}",
    ),
  );
  expectArchitectureBehaviorRejection(
    'optional architecture-name setter invocation',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  setJobConfig?.(newArchName, 'config.process[0].model.arch');",
    ),
  );
  expectArchitectureBehaviorRejection(
    'optional layer objectCopy invocation',
    replaceBehaviorFixture(modelArchChangeSource, 'objectCopy(cleanedModel)', 'objectCopy?.(cleanedModel)'),
  );
  expectArchitectureBehaviorRejection(
    'optional dataset objectCopy invocation',
    replaceBehaviorFixture(modelArchChangeSource, 'objectCopy(dataset)', 'objectCopy?.(dataset)'),
  );
  expectArchitectureBehaviorRejection(
    'optional sample objectCopy invocation',
    replaceBehaviorFixture(modelArchChangeSource, 'objectCopy(sample)', 'objectCopy?.(sample)'),
  );
  expectArchitectureBehaviorRejection(
    'optional defaults-expansion invocation',
    replaceBehaviorFixture(
      modelArchChangeSource,
      'expandDatasetDefaults(currentArch.defaults || {}, numDatasets)',
      'expandDatasetDefaults?.(currentArch.defaults || {}, numDatasets)',
    ),
  );

  expectArchitectureBehaviorRejection(
    'layer aggregate copies current model instead of cleaned model',
    replaceBehaviorFixture(modelArchChangeSource, 'const newModel = objectCopy(cleanedModel);', 'const newModel = objectCopy(currentModel);'),
  );
  expectArchitectureBehaviorRejection(
    'layer aggregate mutates cleaned model without defensive copy',
    replaceBehaviorFixture(modelArchChangeSource, 'const newModel = objectCopy(cleanedModel);', 'const newModel = cleanedModel;'),
  );
  expectArchitectureBehaviorRejection(
    'layer aggregate copy occurs after deletions',
    replaceBehaviorFixture(
      modelArchChangeSource,
      `      const newModel = objectCopy(cleanedModel);
      delete newModel.layer_offloading;
      delete newModel.layer_offloading_text_encoder_percent;
      delete newModel.layer_offloading_transformer_percent;
      setJobConfig(newModel, 'config.process[0].model');`,
      `      const newModel = cleanedModel;
      delete newModel.layer_offloading;
      delete newModel.layer_offloading_text_encoder_percent;
      delete newModel.layer_offloading_transformer_percent;
      const copiedModel = objectCopy(newModel);
      setJobConfig(copiedModel, 'config.process[0].model');`,
    ),
  );
  expectArchitectureBehaviorRejection(
    'dataset mapper mutates source without defensive copy',
    replaceBehaviorFixture(modelArchChangeSource, 'const newDataset = objectCopy(dataset);', 'const newDataset = dataset;'),
  );
  expectArchitectureBehaviorRejection(
    'dataset mapper copies only after mutation',
    replaceBehaviorFixture(
      modelArchChangeSource,
      '    const newDataset = objectCopy(dataset);',
      '    const newDataset = dataset;',
    ).replace('    return newDataset;\n  });\n  setJobConfig(datasets', '    return objectCopy(newDataset);\n  });\n  setJobConfig(datasets'),
  );
  expectArchitectureBehaviorRejection(
    'sample mapper mutates source without defensive copy',
    replaceBehaviorFixture(modelArchChangeSource, 'const newSample = objectCopy(sample);', 'const newSample = sample;'),
  );
  expectArchitectureBehaviorRejection(
    'sample mapper copies only after mutation',
    replaceBehaviorFixture(
      modelArchChangeSource,
      '    const newSample = objectCopy(sample);',
      '    const newSample = sample;',
    ).replace('    return newSample;\n  });\n  setJobConfig(samples', '    return objectCopy(newSample);\n  });\n  setJobConfig(samples'),
  );

  for (const [label, mutate] of [
    ['expand helper clone seed', (helper: string) => helper.replace('{ ...defaults }', '{}')],
    ['expand helper placeholder predicate', (helper: string) => helper.replace("key.includes('datasets[x].')", "key.startsWith('datasets[x].')")],
    ['expand helper dataset bound', (helper: string) => helper.replace('i < numDatasets', 'i <= numDatasets')],
    ['expand helper projected key', (helper: string) => helper.replace("key.replace('datasets[x].', `datasets[${i}].`)", "key.replace('datasets[x].', `items[${i}].`)")],
    ['expand helper value defensive copy', (helper: string) => helper.replace('Array.isArray(v) ? [...v] : objectCopy(v)', 'v')],
    ['expand helper source-key deletion', (helper: string) => helper.replace('      delete expandedDefaults[key];\n', '')],
    ['expand helper return identity', (helper: string) => helper.replace('  return expandedDefaults;', '  return defaults;')],
    ['expand helper exact parameters', (helper: string) => helper.replace('numDatasets: number,\n)', 'numDatasets: number,\n  extra?: unknown,\n)')],
    ['expand helper synchronous result', (helper: string) => helper.replace('const expandDatasetDefaults = (', 'const expandDatasetDefaults = async (')],
  ] as const) {
    expectArchitectureBehaviorRejection(label, mutateExpandHelper(mutate));
  }

  expectArchitectureBehaviorRejection(
    'async dataset mapper feeds promise elements to setter',
    replaceBehaviorFixture(modelArchChangeSource, '.datasets.map(dataset => {', '.datasets.map(async dataset => {'),
  );
  expectArchitectureBehaviorRejection(
    'async sample mapper feeds promise elements to setter',
    replaceBehaviorFixture(modelArchChangeSource, '.sample.samples.map(sample => {', '.sample.samples.map(async sample => {'),
  );
  expectArchitectureBehaviorRejection(
    'generator sample mapper feeds iterator elements to setter',
    replaceBehaviorFixture(modelArchChangeSource, '.sample.samples.map(sample => {', '.sample.samples.map(function* (sample) {'),
  );

  const behaviorSemanticsPositiveFailures: string[] = [];
  const expectMigrateBehaviorPositive = (label: string, mutated: string): void => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(mutated), migrateClaims); } catch { behaviorSemanticsPositiveFailures.push(label); }
  };
  const expectArchitectureBehaviorPositive = (label: string, mutated: string): void => {
    try { assert.deepEqual(collectHandleModelArchChangeBehaviorClaimsFromSource(mutated, animaPathSource), architectureClaims); } catch { behaviorSemanticsPositiveFailures.push(label); }
  };
  expectMigrateBehaviorPositive('canonical migration guards', migrateJobConfigSource);
  expectMigrateBehaviorPositive(
    'unconditional helper inside exact type guard',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      "    jobConfig.config.process[0].type = 'diffusion_trainer';",
      "    function commitType() { jobConfig.config.process[0].type = 'diffusion_trainer'; }\n    commitType();",
    ),
  );
  expectArchitectureBehaviorPositive('canonical architecture guards and defensive copies', modelArchChangeSource);
  expectArchitectureBehaviorPositive(
    'statically true architecture commit wrapper',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  if (true) setJobConfig(newArchName, 'config.process[0].model.arch');",
    ),
  );
  expectArchitectureBehaviorPositive(
    'statically selected logical architecture commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  true && setJobConfig(newArchName, 'config.process[0].model.arch');",
    ),
  );
  expectArchitectureBehaviorPositive(
    'nonthrowing try prefix preserves required architecture commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  try { 1; setJobConfig(newArchName, 'config.process[0].model.arch'); } catch {}",
    ),
  );
  expectArchitectureBehaviorPositive(
    'required architecture commit in finally remains unconditional',
    replaceBehaviorFixture(
      modelArchChangeSource,
      "  setJobConfig(newArchName, 'config.process[0].model.arch');",
      "  try { JSON.parse(newArchName); } finally { setJobConfig(newArchName, 'config.process[0].model.arch'); }",
    ),
  );
  expectArchitectureBehaviorPositive(
    'unrelated optional invocation is harmless',
    replaceBehaviorFixture(modelArchChangeSource, '  // update samples', '  harmless?.();\n\n  // update samples'),
  );
  expectArchitectureBehaviorPositive(
    'exact defensive-copy input aliases',
    modelArchChangeSource
      .replace('const newModel = objectCopy(cleanedModel);', 'const modelCopySource = cleanedModel;\n      const newModel = objectCopy(modelCopySource);')
      .replace('const newDataset = objectCopy(dataset);', 'const datasetCopySource = dataset;\n    const newDataset = objectCopy(datasetCopySource);')
      .replace('const newSample = objectCopy(sample);', 'const sampleCopySource = sample;\n    const newSample = objectCopy(sampleCopySource);'),
  );
  expectArchitectureBehaviorPositive(
    'expand helper harmless binding renames',
    mutateExpandHelper(helper => helper
      .replaceAll('expandedDefaults', 'result')
      .replaceAll('numDatasets', 'datasetCount')
      .replaceAll('defaults', 'sourceDefaults')),
  );
  expectArchitectureBehaviorPositive(
    'uninvoked async and generator helpers are harmless',
    replaceBehaviorFixture(
      modelArchChangeSource,
      '  // update samples',
      '  const dormantAsync = async () => 42;\n  function* dormantGenerator() { yield 1; }\n\n  // update samples',
    ),
  );
  assert.deepEqual(
    {
      missingRejectCount: behaviorSemanticsMissingRejects.length,
      missingRejects: behaviorSemanticsMissingRejects,
      positiveFailureCount: behaviorSemanticsPositiveFailures.length,
      positiveFailures: behaviorSemanticsPositiveFailures,
    },
    { missingRejectCount: 0, missingRejects: [], positiveFailureCount: 0, positiveFailures: [] },
    'behavior-semantics guard/copy/expand/async matrix',
  );

  const behaviorAcceptanceMissingRejects: string[] = [];
  const behaviorAcceptancePositiveFailures: string[] = [];
  const expectAcceptanceMigrateRejection = (label: string, mutated: string): void => {
    try {
      collectMigrateJobConfigBehaviorClaimsFromSource(mutated);
      behaviorAcceptanceMissingRejects.push(label);
    } catch {}
  };
  const expectAcceptanceArchitectureRejection = (label: string, mutated: string): void => {
    try {
      collectHandleModelArchChangeBehaviorClaimsFromSource(mutated, animaPathSource);
      behaviorAcceptanceMissingRejects.push(label);
    } catch {}
  };
  const expectAcceptanceMigratePositive = (label: string, mutated: string): void => {
    try { assert.deepEqual(collectMigrateJobConfigBehaviorClaimsFromSource(mutated), migrateClaims); } catch { behaviorAcceptancePositiveFailures.push(label); }
  };
  const expectAcceptanceArchitecturePositive = (label: string, mutated: string): void => {
    try { assert.deepEqual(collectHandleModelArchChangeBehaviorClaimsFromSource(mutated, animaPathSource), architectureClaims); } catch { behaviorAcceptancePositiveFailures.push(label); }
  };
  const architectureCommit = "  setJobConfig(newArchName, 'config.process[0].model.arch');";
  const currentDefaultsLoop = `  for (const key in currentDefaults) {
    setJobConfig(currentDefaults[key][1], key);
  }`;
  const newDefaultsLoop = `  for (const key in newDefaults) {
    setJobConfig(newDefaults[key][0], key);
  }`;

  expectAcceptanceArchitectureRejection(
    'architecture commit follows conditional return in enclosing block',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  { if (runtimeCondition) return; }
${architectureCommit}`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture helper conditionally returns before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  function commitArchitecture() {
    if (runtimeCondition) return;
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }
  commitArchitecture();`,
    ),
  );
  expectAcceptanceMigrateRejection(
    'migration type write follows conditional throw',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      "    jobConfig.config.process[0].type = 'diffusion_trainer';",
      "    if (runtimeCondition) throw new Error('stop');\n    jobConfig.config.process[0].type = 'diffusion_trainer';",
    ),
  );
  for (const [label, prefix] of [
    ['while-true', '  while (true) {}\n'],
    ['do-while-true', '  do {} while (true);\n'],
    ['for-ever', '  for (;;) {}\n'],
  ] as const) {
    expectAcceptanceArchitectureRejection(
      `architecture commit follows non-completing ${label} loop`,
      replaceBehaviorFixture(modelArchChangeSource, architectureCommit, `${prefix}${architectureCommit}`),
    );
  }
  for (const [label, wrapped] of [
    ['while-true', `  while (true) {\n${architectureCommit}\n  }`],
    ['do-while-true', `  do {\n${architectureCommit}\n  } while (true);`],
    ['for-ever', `  for (;;) {\n${architectureCommit}\n  }`],
  ] as const) {
    expectAcceptanceArchitectureRejection(
      `architecture commit repeats in ${label} loop`,
      replaceBehaviorFixture(modelArchChangeSource, architectureCommit, wrapped),
    );
  }
  for (const [label, wrapped] of [
    ['while conditional break', `  while (true) {
    if (runtimeCondition) break;
${architectureCommit}
    break;
  }`],
    ['do-while-false conditional break', `  do {
    if (runtimeCondition) break;
${architectureCommit}
  } while (false);`],
    ['do-while-false conditional continue', `  do {
    if (runtimeCondition) continue;
${architectureCommit}
  } while (false);`],
    ['for-ever conditional break', `  for (;;) {
    if (runtimeCondition) break;
${architectureCommit}
    break;
  }`],
  ] as const) {
    expectAcceptanceArchitectureRejection(
      `architecture commit is bypassed by ${label}`,
      replaceBehaviorFixture(modelArchChangeSource, architectureCommit, wrapped),
    );
  }

  expectAcceptanceArchitectureRejection(
    'architecture finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    JSON.parse(newArchName);
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceMigrateRejection(
    'migration finally prefix may throw before exact type write',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      canonicalTypeBlock,
      `  try {} finally {
    JSON.parse('runtime');
    if (jobConfig?.config?.process && jobConfig.config.process[0]?.type === 'ui_trainer') {
      jobConfig.config.process[0].type = 'diffusion_trainer';
    }
      }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture nested finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    {
      JSON.parse(newArchName);
      setJobConfig(newArchName, 'config.process[0].model.arch');
    }
  }`,
    ),
  );

  expectAcceptanceArchitectureRejection(
    'current-default loop iterates an alias instead of exact container',
    replaceBehaviorFixture(
      modelArchChangeSource,
      currentDefaultsLoop,
      `  const defaultsAlias = currentDefaults;
  for (const key in defaultsAlias) {
    setJobConfig(currentDefaults[key][1], key);
  }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'current-default loop setter does not use loop key binding',
    replaceBehaviorFixture(
      modelArchChangeSource,
      currentDefaultsLoop,
      `  const key = 'fixed';
  for (const otherKey in currentDefaults) {
    setJobConfig(currentDefaults[key][1], key);
  }`,
    ),
  );
  for (const [label, body] of [
    ['break after setter', `    setJobConfig(currentDefaults[key][1], key);\n    break;`],
    ['conditional continue before setter', `    if (runtimeCondition) continue;\n    setJobConfig(currentDefaults[key][1], key);`],
    ['conditional break before setter', `    if (runtimeCondition) break;\n    setJobConfig(currentDefaults[key][1], key);`],
    ['return after setter', `    setJobConfig(currentDefaults[key][1], key);\n    return;`],
    ['throw after setter', `    setJobConfig(currentDefaults[key][1], key);\n    throw new Error('stop');`],
  ] as const) {
    expectAcceptanceArchitectureRejection(
      `current-default loop has ${label}`,
      replaceBehaviorFixture(
        modelArchChangeSource,
        currentDefaultsLoop,
        `  for (const key in currentDefaults) {\n${body}\n  }`,
      ),
    );
  }
  for (const [label, loop, replacement] of [
    [
      'current-default invoked throw before setter',
      currentDefaultsLoop,
      `  function stopCurrent() { throw new Error('stop'); }
  for (const key in currentDefaults) {
    stopCurrent();
    setJobConfig(currentDefaults[key][1], key);
  }`,
    ],
    [
      'current-default invoked throw after setter',
      currentDefaultsLoop,
      `  function stopCurrent() { throw new Error('stop'); }
  for (const key in currentDefaults) {
    setJobConfig(currentDefaults[key][1], key);
    stopCurrent();
  }`,
    ],
    [
      'next-default invoked throw before setter',
      newDefaultsLoop,
      `  function stopNext() { throw new Error('stop'); }
  for (const key in newDefaults) {
    stopNext();
    setJobConfig(newDefaults[key][0], key);
  }`,
    ],
    [
      'next-default invoked throw after setter',
      newDefaultsLoop,
      `  function stopNext() { throw new Error('stop'); }
  for (const key in newDefaults) {
    setJobConfig(newDefaults[key][0], key);
    stopNext();
  }`,
    ],
  ] as const) {
    expectAcceptanceArchitectureRejection(
      `${label} prevents exhaustive commits`,
      replaceBehaviorFixture(modelArchChangeSource, loop, replacement),
    );
  }

  expectAcceptanceArchitectureRejection(
    'architecture setter callee contains optional-chain segment',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      "  setJobConfig?.call(null, newArchName, 'config.process[0].model.arch');",
    ),
  );
  expectAcceptanceArchitectureRejection(
    'layer objectCopy callee contains optional-chain segment',
    replaceBehaviorFixture(modelArchChangeSource, 'objectCopy(cleanedModel)', 'objectCopy?.call(null, cleanedModel)'),
  );
  expectAcceptanceArchitectureRejection(
    'cleanup callee contains optional-chain segment',
    replaceBehaviorFixture(
      modelArchChangeSource,
      'clearUnsupportedAnimaPaths(currentModel, newArch?.additionalSections)',
      'clearUnsupportedAnimaPaths?.call(null, currentModel, newArch?.additionalSections)',
    ),
  );
  expectAcceptanceMigrateRejection(
    'prompt delete has optional config receiver',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      'delete jobConfig.config.process[0].sample.prompts;',
      'delete jobConfig?.config.process[0].sample.prompts;',
    ),
  );
  expectAcceptanceMigrateRejection(
    'type assignment has optional config receiver',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      "jobConfig.config.process[0].type = 'diffusion_trainer';",
      "(jobConfig?.config.process[0]).type = 'diffusion_trainer';",
    ),
  );
  expectAcceptanceArchitectureRejection(
    'layer delete has optional copied-model receiver',
    replaceBehaviorFixture(modelArchChangeSource, 'delete newModel.layer_offloading;', 'delete newModel?.layer_offloading;'),
  );
  expectAcceptanceMigrateRejection(
    'type assignment has aliased optional config receiver',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      "    jobConfig.config.process[0].type = 'diffusion_trainer';",
      `    const typeTarget = jobConfig?.config.process[0];
    typeTarget.type = 'diffusion_trainer';`,
    ),
  );
  expectAcceptanceMigrateRejection(
    'prompt delete has aliased optional config receiver',
    replaceBehaviorFixture(
      migrateJobConfigSource,
      '    delete jobConfig.config.process[0].sample.prompts;',
      `    const sampleTarget = jobConfig?.config.process[0].sample;
    delete sampleTarget.prompts;`,
    ),
  );

  expectAcceptanceArchitecturePositive(
    'statically dead preceding conditional exit is harmless',
    replaceBehaviorFixture(modelArchChangeSource, architectureCommit, `  { if (false) return; }\n${architectureCommit}`),
  );
  expectAcceptanceArchitecturePositive(
    'statically dead preceding loops are harmless',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  while (false) {}
  for (; false;) {}
${architectureCommit}`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'preceding loop with exact break completes finitely',
    replaceBehaviorFixture(modelArchChangeSource, architectureCommit, `  while (true) { break; }\n${architectureCommit}`),
  );
  expectAcceptanceArchitecturePositive(
    'preceding labeled loop with exact break completes finitely',
    replaceBehaviorFixture(modelArchChangeSource, architectureCommit, `  outer: while (true) { break outer; }\n${architectureCommit}`),
  );
  expectAcceptanceArchitecturePositive(
    'do-while-false required commit executes exactly once',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  do {
${architectureCommit}
  } while (false);`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'nonthrowing finally prefix preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    const harmless = 1;
    setJobConfig(newArchName, 'config.process[0].model.arch');
      }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture same-expression finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    (JSON.parse(newArchName), setJobConfig(newArchName, 'config.process[0].model.arch'));
  }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture same-declaration finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    const parsed = JSON.parse(newArchName), committed = setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture invoked-helper finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  function commitArchitecture() {
    JSON.parse(newArchName);
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }
  try {} finally {
    commitArchitecture();
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'statically selected nonthrowing finally prefix preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    if (true) { 1; }
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'statically dead throwing finally prefix preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    if (false) JSON.parse(newArchName);
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'nested nonthrowing finally prefix preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    {
      const harmless = 1;
      setJobConfig(newArchName, 'config.process[0].model.arch');
    }
      }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture object-literal finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    ({ first: JSON.parse(newArchName), commit: setJobConfig(newArchName, 'config.process[0].model.arch') });
  }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture template finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      [
        '  try {} finally {',
        "    `${JSON.parse(newArchName)}${setJobConfig(newArchName, 'config.process[0].model.arch')}`;",
        '  }',
      ].join('\n'),
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture TDZ identifier finally prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    value;
    const value = 1;
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'statically dead loop prefixes in finally preserve required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    while (false) JSON.parse(newArchName);
    for (; false;) JSON.parse(newArchName);
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'statically selected nonthrowing switch in finally preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    switch (1) {
      case 1: 1; break;
      default: JSON.parse(newArchName);
    }
    setJobConfig(newArchName, 'config.process[0].model.arch');
      }`,
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture tagged-template callable prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      [
        '  try {} finally {',
        "    JSON.parse(newArchName)`${setJobConfig(newArchName, 'config.process[0].model.arch')}`;",
        '  }',
      ].join('\n'),
    ),
  );
  expectAcceptanceArchitectureRejection(
    'architecture tagged-template getter prefix may throw before required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      [
        "  const tags = { get selected() { throw new Error('stop'); } };",
        '  try {} finally {',
        "    tags.selected`${setJobConfig(newArchName, 'config.process[0].model.arch')}`;",
        '  }',
      ].join('\n'),
    ),
  );
  expectAcceptanceArchitectureRejection(
    'selected switch inner-label break still falls through to throwing default',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    switch (1) {
      case 1:
        inner: { break inner; }
      default:
        JSON.parse(newArchName);
    }
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'statically selected nested switch break in finally preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    switch (1) {
      case 1: { 1; break; }
      default: JSON.parse(newArchName);
    }
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'statically selected switch fallthrough in finally preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    switch (1) {
      case 1: 1;
      case 2: 2; break;
      default: JSON.parse(newArchName);
    }
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'preceding labeled block with exact break completes finitely',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  outer: {
    while (true) { break outer; }
  }
${architectureCommit}`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'preceding loop break through nonthrowing finally completes finitely',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  while (true) {
    try { break; } finally {}
  }
${architectureCommit}`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'preceding loop break through try-catch-finally completes finitely',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  while (true) {
    try { break; } catch {} finally {}
  }
${architectureCommit}`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'default loop key binding may be consistently renamed',
    replaceBehaviorFixture(
      modelArchChangeSource,
      currentDefaultsLoop,
      `  for (const defaultKey in currentDefaults) {
    setJobConfig(currentDefaults[defaultKey][1], defaultKey);
      }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'selected switch inner-label then direct break in finally preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    switch (1) {
      case 1:
        inner: { break inner; }
        break;
      default:
        JSON.parse(newArchName);
    }
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'preceding caught throw with exact catch break completes finitely',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  while (true) {
    try { throw new Error('stop'); } catch { break; } finally {}
  }
${architectureCommit}`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'selected switch enclosing-label break in finally preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    outer: {
      switch (1) {
        case 1: break outer;
        default: JSON.parse(newArchName);
      }
    }
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'selected switch try-finally break in finally preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      `  try {} finally {
    switch (1) {
      case 1: try { break; } finally {}
      default: JSON.parse(newArchName);
    }
    setJobConfig(newArchName, 'config.process[0].model.arch');
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'nonthrowing tagged-template helper preserves required commit',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      [
        '  const tag = (_strings, ...values) => values;',
        '  try {} finally {',
        "    tag`${setJobConfig(newArchName, 'config.process[0].model.arch')}`;",
        '  }',
      ].join('\n'),
    ),
  );
  expectAcceptanceArchitecturePositive(
    'nonthrowing default-loop helper preserves exhaustive commits',
    replaceBehaviorFixture(
      modelArchChangeSource,
      currentDefaultsLoop,
      `  function observeCurrent() { 1; }
  for (const key in currentDefaults) {
    observeCurrent();
    setJobConfig(currentDefaults[key][1], key);
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'default loop permits harmless nonthrowing statements',
    replaceBehaviorFixture(
      modelArchChangeSource,
      currentDefaultsLoop,
      `  for (const key in currentDefaults) {
    0;
    setJobConfig(currentDefaults[key][1], key);
  }`,
    ),
  );
  expectAcceptanceArchitecturePositive(
    'nonoptional native call wrapper remains exact',
    replaceBehaviorFixture(
      modelArchChangeSource,
      architectureCommit,
      "  setJobConfig.call(null, newArchName, 'config.process[0].model.arch');",
    ),
  );
  expectAcceptanceArchitecturePositive(
    'unrelated optional callee chain remains harmless',
    replaceBehaviorFixture(modelArchChangeSource, architectureCommit, `  harmless?.call(null);\n${architectureCommit}`),
  );
  expectAcceptanceMigratePositive('canonical optional presence guards remain exact', migrateJobConfigSource);

  assert.deepEqual(
    {
      missingRejectCount: behaviorAcceptanceMissingRejects.length,
      missingRejects: behaviorAcceptanceMissingRejects,
      positiveFailureCount: behaviorAcceptancePositiveFailures.length,
      positiveFailures: behaviorAcceptancePositiveFailures,
    },
    { missingRejectCount: 0, missingRejects: [], positiveFailureCount: 0, positiveFailures: [] },
    'behavior acceptance exact-once/default-loop/optional-chain matrix',
  );
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
  assert.deepEqual(names, runtimeModelArchs.map(item => item.name), 'emitted architecture order must equal the executed live modelArchs export');
  assert.deepEqual(names, manifest.full_architectures, 'live modelArchs order must equal the 51-architecture edition manifest');
  const knownModelArchKeys = new Set(Object.keys(modelArchProjectionBoundary));
  for (const [index, runtimeArchitecture] of runtimeModelArchs.entries()) {
    const emitted = liveFacts.model_architectures[index];
    assert.deepEqual(
      Object.keys(runtimeArchitecture).filter(key => !knownModelArchKeys.has(key)),
      [],
      `${runtimeArchitecture.name} runtime object has an unprojected ModelArch key`,
    );
    assert.equal(emitted.name, runtimeArchitecture.name);
    assert.equal(emitted.label, runtimeArchitecture.label);
    assert.equal(emitted.group, runtimeArchitecture.group);
    assert.deepEqual(emitted.controls, runtimeArchitecture.controls ?? []);
    assert.deepEqual(emitted.disable_sections, runtimeArchitecture.disableSections ?? []);
    assert.deepEqual(emitted.additional_sections, runtimeArchitecture.additionalSections ?? []);
    assert.deepEqual(emitted.gate_url, runtimePresence(runtimeArchitecture, 'gateUrl'));
    assert.deepEqual(emitted.is_video_model, runtimePresence(runtimeArchitecture, 'isVideoModel'));
    assert.deepEqual(emitted.has_multiline_prompts, runtimePresence(runtimeArchitecture, 'hasMultiLinePrompts'));
    assert.deepEqual(emitted.accuracy_recovery_adapters, runtimePresence(runtimeArchitecture, 'accuracyRecoveryAdapters'));
    assert.deepEqual(emitted.sample_tags, runtimePresence(runtimeArchitecture, 'sampleTags'));
    const runtimeDefaults = runtimeArchitectureDefaults(runtimeArchitecture.defaults);
    assert.deepEqual(emitted.defaults, runtimeDefaults.leaves, `${runtimeArchitecture.name} defaults must equal executed runtime data`);
    assert.deepEqual(emitted.default_containers, runtimeDefaults.containers, `${runtimeArchitecture.name} containers must equal executed runtime data`);
    const modelPathPair = runtimeArchitecture.defaults?.['config.process[0].model.name_or_path'];
    assert.deepEqual(
      emitted.model_path,
      Array.isArray(modelPathPair) ? { present: true, value: runtimeValue(modelPathPair[0]) } : { present: false },
    );
    assert.deepEqual(
      emitted.model_notes,
      Object.prototype.hasOwnProperty.call(runtimeArchitecture, 'modelNotes')
        ? runtimeJsxFact(runtimeArchitecture.modelNotes)
        : { present: false },
      `${runtimeArchitecture.name} notes must equal the executed React-node projection`,
    );
    assert.equal(emitted.custom_model_select_options.present, Object.prototype.hasOwnProperty.call(runtimeArchitecture, 'customModelSelectOptions'));
    if (runtimeArchitecture.customModelSelectOptions !== undefined) {
      assert.deepEqual(
        emitted.custom_model_select_options.value?.map(option => ({ label: option.label, options: option.options })),
        runtimeArchitecture.customModelSelectOptions.map(option => ({ label: option.label, options: option.options })),
        `${runtimeArchitecture.name} custom option order and shape must equal executed runtime data`,
      );
      assert.ok(runtimeArchitecture.customModelSelectOptions.every(option => typeof option.getValue === 'function' && typeof option.onChange === 'function'));
      for (const [optionIndex, runtimeOption] of runtimeArchitecture.customModelSelectOptions.entries()) {
        const emittedOption: CustomModelSelectOptionFact | undefined = emitted.custom_model_select_options.value?.[optionIndex];
        assert.ok(emittedOption !== undefined);
        const runtimeDoc = runtimeOption.doc === undefined
          ? { present: false as const }
          : runtimeJsxFact(runtimeOption.doc.description);
        if (runtimeOption.doc?.title !== undefined) {
          assert.equal(typeof runtimeOption.doc.title, 'string', 'runtime custom option doc titles must remain strings');
          runtimeDoc.text_literals = [runtimeOption.doc.title as string, ...(runtimeDoc.text_literals ?? [])];
        }
        assert.deepEqual(emittedOption!.doc, runtimeDoc, `${runtimeArchitecture.name}.${runtimeOption.label} doc must equal executed runtime JSX`);
        for (const hasAssistantPath of [false, true]) {
          for (const hasGuidance of [false, true]) {
            for (const hasGuidanceTarget of [false, true]) {
              const config = {
                config: {
                  process: [{
                    model: { assistant_lora_path: hasAssistantPath ? 'adapter.safetensors' : undefined },
                    train: {
                      do_guidance_loss: hasGuidance || undefined,
                      guidance_loss_target: hasGuidanceTarget ? 3.5 : undefined,
                    },
                  }],
                },
              };
              const expectedCase: CustomModelSelectOptionFact['get_value_cases'][number] | undefined = emittedOption!.get_value_cases.find(item => runtimePredicate(item.condition, config));
              assert.ok(expectedCase !== undefined, `${runtimeArchitecture.name}.${runtimeOption.label} getter facts must be exhaustive`);
              assert.deepEqual(
                runtimeValue(runtimeOption.getValue(config as unknown as JobConfig)),
                expectedCase.return_value,
                `${runtimeArchitecture.name}.${runtimeOption.label} getter runtime/fact mismatch`,
              );
              for (const selected of runtimeOption.options.map(item => String(item.value))) {
                const writes: Array<{ selected_value: string; path: string; value: TrainingBookValueFact; guard: ModelOptionPredicateFact }> = [];
                runtimeOption.onChange(selected, config as unknown as JobConfig, (value, path) => {
                  writes.push({ selected_value: selected, path: normalizeTrainingBookPath(path), value: runtimeValue(value), guard: { kind: 'always' } });
                });
                const expectedWrites: Array<{ selected_value: string; path: string; value: TrainingBookValueFact; guard: { kind: 'always' } }> = emittedOption!.writes
                  .filter(write => write.selected_value === selected && runtimePredicate(write.guard, config))
                  .map(write => ({ ...write, guard: { kind: 'always' as const } }));
                assert.deepEqual(
                  writes,
                  expectedWrites,
                  `${runtimeArchitecture.name}.${runtimeOption.label}.${selected} setter runtime/fact mismatch`,
                );
              }
            }
          }
        }
      }
    }
  }
  const runtimeDefaults = [
    ...runtimeDefaultFacts(defaultJobConfig, 'defaultJobConfig', 'ui/src/app/jobs/new/jobConfig.ts', ''),
    ...runtimeDefaultFacts(defaultDatasetConfig, 'defaultDatasetConfig', 'ui/src/app/jobs/new/jobConfig.ts', 'config.process[*].datasets[*]'),
    ...runtimeDefaultFacts(defaultSampleConfig, 'defaultSampleConfig', 'ui/src/helpers/defaultSamples.ts', 'config.process[*].sample'),
    ...runtimeDefaultFacts(defaultAudioSampleConfig, 'defaultAudioSampleConfig', 'ui/src/helpers/defaultSamples.ts', 'config.process[*].sample'),
    ...runtimeDefaultFacts(defaultIdeogramSamplesConfig, 'defaultIdeogramSamplesConfig', 'ui/src/helpers/defaultSamples.ts', 'config.process[*].sample'),
  ].sort((left, right) => compareCodePoint(`${left.path}\0${left.source_path}\0${left.symbol}`, `${right.path}\0${right.source_path}\0${right.symbol}`));
  assert.deepEqual(liveFacts.defaults, runtimeDefaults, 'emitted defaults must equal all executed live default exports');
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
  const settingClaims = liveFacts.config_claims.filter(
    item => item.kind === 'setting' && item.behavior_contract === undefined,
  );
  assert.equal(settingClaims.length, 316, 'every current directly bound or architecture-projected config control must emit');
  assert.ok(settingClaims.every(item => item.ui_label.present), 'all current visible config controls must resolve an exact label');
  assert.deepEqual(
    settingClaims
      .filter(item => item.path === 'config.process[*].datasets[*].resolution')
      .map(item => item.ui_label.value?.kind === 'string' ? item.ui_label.value.value : null),
    ['1024', '1280', '1328', '1536', '2048', '256', '512', '768'],
    'finite nested resolution maps must expand to exact labels',
  );
  assert.ok(liveFacts.global_settings.length > 91, 'structural discovery includes the formerly omitted persisted and derived settings');
  for (const [symbol, path, uiType] of [
    ['JobLossGraph::persist::useLogScale', 'browser.localStorage.jobLossGraph.useLogScale', 'boolean'],
    ['JobLossGraph::persist::showTrend', 'browser.localStorage.jobLossGraph.showTrend', 'boolean'],
    ['JobLossGraph::persist::smoothing', 'browser.localStorage.jobLossGraph.smoothing', 'number'],
    ['JobLossGraph::persist::plotStride', 'browser.localStorage.jobLossGraph.plotStride', 'number'],
    ['JobLossGraph::persist::clipOutliers', 'browser.localStorage.jobLossGraph.clipOutliers', 'boolean'],
    ['JobLossGraph::persist::enabled', 'browser.localStorage.jobLossGraph.enabled', 'object'],
    ['startJob::spawn.env.AITK_JOB_ID', 'spawn.env.AITK_JOB_ID', 'string'],
    ['startJob::spawn.env.CUDA_DEVICE_ORDER', 'spawn.env.CUDA_DEVICE_ORDER', 'string'],
    ['startJob::spawn.env.CUDA_VISIBLE_DEVICES', 'spawn.env.CUDA_VISIBLE_DEVICES', 'string'],
    ['startJob::spawn.env.IS_AI_TOOLKIT_UI', 'spawn.env.IS_AI_TOOLKIT_UI', 'string'],
    ['startJob::spawn.env.PYTHONUNBUFFERED', 'spawn.env.PYTHONUNBUFFERED', 'string'],
  ] as const) {
    assert.ok(
      liveFacts.global_settings.some(item => item.symbol === symbol && item.path === path && item.value_contract.ui_type === uiType),
      `missing formerly omitted structural setting ${symbol}`,
    );
  }
  assert.deepEqual(
    liveFacts.global_settings
      .filter(item => item.source_path === 'ui/src/app/settings/page.tsx' && item.kind === 'setting')
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
    if (path === 'ui/src/app/settings/page.tsx') {
      assert.throws(
        () => collectDeclaredServerGlobalClaimsFromSource(path, sourceText.replace(before, after)),
        message,
      );
    } else {
      assert.notDeepEqual(
        collectDeclaredServerGlobalClaimsFromSource(path, sourceText.replace(before, after)),
        collectDeclaredServerGlobalClaimsFromSource(path, sourceText),
        `${path} mutation must change a structural fact`,
      );
    }
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
      'ui/src/app/api/audio/art/[...audioPath]/route.ts',
      'ui/src/app/api/caption/get/route.ts',
      'ui/src/app/api/caption/getBatch/route.ts',
      'ui/src/app/api/cpu/route.ts',
      'ui/src/app/api/datasets/[datasetName]/masks/route.ts',
      'ui/src/app/api/datasets/list/route.ts',
      'ui/src/app/api/datasets/listImages/route.ts',
      'ui/src/app/api/datasets/upload/route.ts',
      'ui/src/app/api/files/[...filePath]/route.ts',
      'ui/src/app/api/files/delete/route.ts',
      'ui/src/app/api/gpu/route.ts',
      'ui/src/app/api/img/[...imagePath]/route.ts',
      'ui/src/app/api/img/caption/route.ts',
      'ui/src/app/api/img/delete/route.ts',
      'ui/src/app/api/img/upload/route.ts',
      'ui/src/app/api/jobs/[jobID]/delete/route.ts',
      'ui/src/app/api/jobs/[jobID]/files/route.ts',
      'ui/src/app/api/jobs/[jobID]/log/route.ts',
      'ui/src/app/api/jobs/[jobID]/loss/route.ts',
      'ui/src/app/api/jobs/[jobID]/mark_stopped/route.ts',
      'ui/src/app/api/jobs/[jobID]/plugin/route.ts',
      'ui/src/app/api/jobs/[jobID]/sample_now/route.ts',
      'ui/src/app/api/jobs/[jobID]/samples/route.ts',
      'ui/src/app/api/jobs/[jobID]/save_now/route.ts',
      'ui/src/app/api/jobs/[jobID]/start/route.ts',
      'ui/src/app/api/jobs/[jobID]/stop/route.ts',
      'ui/src/app/api/jobs/route.ts',
      'ui/src/app/api/ostris_cloud/route.ts',
      'ui/src/app/api/queue/[queueID]/start/route.ts',
      'ui/src/app/api/queue/[queueID]/stop/route.ts',
      'ui/src/app/api/scripts/route.ts',
      'ui/src/app/api/settings/route.ts',
      'ui/src/app/api/zip/route.ts',
      'ui/src/app/jobs/new/SimpleJob.tsx',
      'ui/src/app/jobs/new/page.tsx',
      'ui/src/app/layout.tsx',
      'ui/src/app/settings/page.tsx',
      'ui/src/components/AuthWrapper.tsx',
      'ui/src/components/CaptionDatasetModal.tsx',
      'ui/src/components/JobLossGraph.tsx',
      'ui/src/components/Sidebar.tsx',
      'ui/src/components/ThemeProvider.tsx',
      'ui/src/hooks/useSettings.tsx',
      'ui/src/middleware.ts',
      'ui/src/server/datasetPresetRouteHandlers.ts',
      'ui/src/server/jobDatasetPresetPrismaStore.ts',
      'ui/src/server/macstats.ts',
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
  const textEncoderQuantization = settingClaims.filter(item => item.path === 'config.process[*].model.qtype_te');
  assert.equal(textEncoderQuantization.length, 48, 'the nested Text Encoder selector must honor both quantization guards');
  assert.ok(textEncoderQuantization.every(item => item.value_contract.accepted_values?.length === 18));
  const transformerQuantization = settingClaims.filter(item => item.path === 'config.process[*].model.qtype');
  assert.equal(transformerQuantization.length, 49, 'architectures hiding model.quantize must not emit a Transformer control');
  assert.ok(transformerQuantization.every(item =>
    item.value_contract.accepted_values?.every(value => value.kind !== 'string' || value.value !== '')),
  'empty Transformer selection writes the default qtype, not an empty string');
  const transformerQuantizeToggles = settingClaims.filter(item => item.path === 'config.process[*].model.quantize');
  const textEncoderQuantizeToggles = settingClaims.filter(item => item.path === 'config.process[*].model.quantize_te');
  assert.equal(transformerQuantizeToggles.length, 49);
  assert.equal(textEncoderQuantizeToggles.length, 48);
  for (const claim of [...transformerQuantizeToggles, ...textEncoderQuantizeToggles]) {
    assert.equal(claim.value_contract.ui_type, 'boolean');
    assert.deepEqual(claim.value_contract.accepted_values, [
      { kind: 'boolean', value: false },
      { kind: 'boolean', value: true },
    ], 'boolean quantization claims must not inherit qtype string options');
  }
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
