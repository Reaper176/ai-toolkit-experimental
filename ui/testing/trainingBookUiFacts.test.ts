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
      behavior: { guard: 'cleaned-model-changed', operation: 'delete', sources: ['config.process[*].model.te_name_or_path'], payload: { kind: 'undefined' } },
    },
    {
      symbol: 'handleModelArchChange::anima-paths::vae_path::delete',
      path: 'config.process[*].model.vae_path',
      behavior: { guard: 'cleaned-model-changed', operation: 'delete', sources: ['config.process[*].model.vae_path'], payload: { kind: 'undefined' } },
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
      symbol: `handleModelArchChange::layer-offloading::section-unsupported::${path}::delete`,
      path: `config.process[*].model.${path}`,
      behavior: {
        guard: 'section-unsupported', operation: 'delete',
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
  assert.equal(settingClaims.length, 172, 'every current directly bound or architecture-projected config control must emit');
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
