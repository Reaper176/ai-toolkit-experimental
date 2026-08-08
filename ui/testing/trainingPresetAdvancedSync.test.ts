import assert from 'node:assert/strict';
import YAML from 'yaml';
import {
  applyAdvancedEditorChange,
  syncAdvancedEditorConfig,
  type AdvancedEditorLike,
  type SerializedConfigRef,
} from '../src/components/AdvancedConfigEditor';

const config = {
  config: {
    process: [
      {
        training_folder: '/custom/output',
        sqlite_db_path: '/custom/jobs.sqlite',
        device: 'mps',
        train: { steps: 100 },
      },
    ],
  },
};
const lastConfigUpdate: SerializedConfigRef = { current: JSON.stringify({ stale: true }) };
let transformCalls = 0;
let setConfigCalls = 0;
let latestConfig: unknown;
const transform = (parsed: any) => {
  transformCalls += 1;
  parsed.config.process[0].training_folder = '/transformed/output';
  parsed.config.process[0].sqlite_db_path = '/transformed/jobs.sqlite';
  parsed.config.process[0].device = 'cuda';
  return parsed;
};
const setConfig = (next: unknown) => {
  setConfigCalls += 1;
  latestConfig = next;
};

let editorValue = '';
const model = {
  setValue(value: string) {
    editorValue = value;
    applyAdvancedEditorChange(value, lastConfigUpdate, setConfig, transform);
  },
};
const editor: AdvancedEditorLike = {
  getValue: () => editorValue,
  getModel: () => model,
  getPosition: () => ({ lineNumber: 1, column: 1 }),
  getSelection: () => null,
  getScrollTop: () => 0,
  setPosition: () => undefined,
  setSelection: () => undefined,
  setScrollTop: () => undefined,
};

syncAdvancedEditorConfig(config, editor, lastConfigUpdate);
assert.equal(transformCalls, 0, 'programmatic synchronization must not transform parsed YAML');
assert.equal(setConfigCalls, 0, 'programmatic synchronization must not write config back');
const synchronized = YAML.parse(editorValue);
assert.equal(synchronized.config.process[0].training_folder, '/custom/output');
assert.equal(synchronized.config.process[0].sqlite_db_path, '/custom/jobs.sqlite');
assert.equal(synchronized.config.process[0].device, 'mps');

lastConfigUpdate.current = JSON.stringify({ staleAgain: true });
syncAdvancedEditorConfig(config, editor, lastConfigUpdate);
assert.equal(
  lastConfigUpdate.current,
  JSON.stringify(config),
  'equal YAML must still advance the synchronization guard',
);
assert.equal(transformCalls, 0);
assert.equal(setConfigCalls, 0);

const userEdited = YAML.parse(editorValue);
userEdited.config.process[0].train.steps = 250;
applyAdvancedEditorChange(YAML.stringify(userEdited), lastConfigUpdate, setConfig, transform);
assert.equal(transformCalls, 1, 'genuine user edits must still use transformOnParse');
assert.equal(setConfigCalls, 1, 'genuine user edits must still update config');
assert.equal((latestConfig as any).config.process[0].train.steps, 250);
assert.equal((latestConfig as any).config.process[0].training_folder, '/transformed/output');

console.log('advanced config synchronization tests passed');
