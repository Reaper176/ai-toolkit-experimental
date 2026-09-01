import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMP_PREFIX = 'ai-toolkit-training-presets-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const testFiles = [
  'maskTrainingValidation.test.js',
  'maskTrainingControls.test.js',
  'trainingPresets.test.js',
  'trainingPresetCatalog.test.js',
  'trainingPresetCatalogRuntime.test.js',
  'trainingPresetService.test.js',
  'trainingPresetRouteHandlers.test.js',
  'trainingPresetPrismaIntegration.test.js',
  'trainingPresetSelect.test.js',
  'trainingPresetDetails.test.js',
  'trainingPresetApplicationIntegration.test.js',
  'trainingPresetControl.test.js',
  'trainingPresetPageIntegration.test.js',
  'trainingPresetAdvancedSync.test.js',
  'trainingPresetPageState.test.js',
];
const catalogSliceArguments = process.argv.filter(argument => argument === '--catalog-slice' || argument.startsWith('--catalog-slice='));
if (catalogSliceArguments.length > 1) throw new Error('--catalog-slice may be supplied only once');
const catalogSliceArgument = catalogSliceArguments[0];
let catalogSlice;
if (catalogSliceArgument !== undefined) {
  if (catalogSliceArgument === '--catalog-slice') {
    const position = process.argv.indexOf(catalogSliceArgument);
    catalogSlice = process.argv[position + 1];
  } else {
    catalogSlice = catalogSliceArgument.slice('--catalog-slice='.length);
  }
  if (!['anima', 'image-modern', 'sd-wan'].includes(catalogSlice)) {
    throw new Error('--catalog-slice requires one of: anima, image-modern, sd-wan');
  }
}
let outputDirectory;

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: uiRoot,
    env: { ...process.env, NODE_PATH: join(uiRoot, 'node_modules'), ...(catalogSlice ? { TRAINING_PRESET_CATALOG_SLICE: catalogSlice } : {}) },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(command)} exited with status ${result.status}`);
}

function assertSafe(directory) {
  const realTemp = realpathSync(tmpdir());
  const realOutput = realpathSync(directory);
  const child = relative(realTemp, realOutput);
  if (
    realpathSync(dirname(realOutput)) !== realTemp ||
    child === '' ||
    child === '..' ||
    child.startsWith(`..${sep}`) ||
    isAbsolute(child) ||
    !basename(realOutput).startsWith(TEMP_PREFIX)
  ) {
    throw new Error(`Refusing unsafe test directory: ${realOutput}`);
  }
}

try {
  outputDirectory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  assertSafe(outputDirectory);
  run(process.execPath, [tsc, '--project', 'testing/tsconfig.trainingPresets.json', '--outDir', outputDirectory]);
  const aliasScope = join(outputDirectory, 'node_modules', '@');
  mkdirSync(dirname(aliasScope), { recursive: true });
  symlinkSync(join(outputDirectory, 'src'), aliasScope, process.platform === 'win32' ? 'junction' : 'dir');
  const lucideStub = join(outputDirectory, 'node_modules', 'lucide-react');
  mkdirSync(lucideStub, { recursive: true });
  writeFileSync(join(lucideStub, 'package.json'), JSON.stringify({ type: 'commonjs', main: 'index.js' }));
  writeFileSync(
    join(lucideStub, 'index.js'),
    "const React = require('react'); module.exports = new Proxy({}, { get: (_, name) => props => React.createElement('svg', { ...props, 'data-icon': String(name) }) });",
  );
  for (const testFile of testFiles) {
    const compiledTest = join(outputDirectory, 'testing', testFile);
    if (!existsSync(compiledTest)) {
      throw new Error(`Required compiled test artifact is missing: ${testFile}`);
    }
    run(process.execPath, [compiledTest]);
  }
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
