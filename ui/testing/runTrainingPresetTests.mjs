import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMP_PREFIX = 'ai-toolkit-training-presets-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const repositoryRoot = resolve(uiRoot, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const catalogTestFiles = [
  'trainingPresetCatalog.test.js',
  'trainingPresetCatalogRuntime.test.js',
  'trainingPresetCatalogBuildValidation.test.js',
];
const lifecycleTestFiles = [
  'maskTrainingValidation.test.js',
  'maskTrainingControls.test.js',
  'trainingPresets.test.js',
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
const testFiles = [...catalogTestFiles, ...lifecycleTestFiles];
const committedTrainingPresetTests = readdirSync(testingDirectory)
  .filter(file => /^trainingPreset.*\.test\.tsx?$/.test(file))
  .map(file => file.replace(/\.tsx?$/, '.js'));
for (const testFile of committedTrainingPresetTests) {
  if (!testFiles.includes(testFile)) throw new Error(`Committed training preset test is not mandatory: ${testFile}`);
}

const arguments_ = process.argv.slice(2);
let catalogOnly = false;
let catalogSlice;
for (let index = 0; index < arguments_.length; index += 1) {
  const argument = arguments_[index];
  if (argument === '--catalog-only') {
    if (catalogOnly) throw new Error('--catalog-only may be supplied only once');
    catalogOnly = true;
    continue;
  }
  if (argument === '--catalog-slice' || argument.startsWith('--catalog-slice=')) {
    if (catalogSlice !== undefined) throw new Error('--catalog-slice may be supplied only once');
    catalogSlice = argument === '--catalog-slice' ? arguments_[++index] : argument.slice('--catalog-slice='.length);
    if (!['anima', 'image-modern', 'sd-wan'].includes(catalogSlice)) {
      throw new Error('--catalog-slice requires one of: anima, image-modern, sd-wan');
    }
    continue;
  }
  throw new Error(`Unknown training preset test argument: ${argument}`);
}

const packageScripts = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8')).scripts;
if (packageScripts['validate:training-presets'] !== 'node testing/runTrainingPresetTests.mjs --catalog-only') {
  throw new Error('validate:training-presets must invoke the catalog-only release gate');
}
if (packageScripts.build !== 'npm run validate:training-presets && tsc -p tsconfig.worker.json && next build') {
  throw new Error('build must validate training presets before TypeScript and Next.js compilation');
}
let outputDirectory;

function run(command, args, cwd = uiRoot) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, NODE_PATH: join(uiRoot, 'node_modules'), TRAINING_PRESET_REPOSITORY_ROOT: repositoryRoot, ...(catalogSlice ? { TRAINING_PRESET_CATALOG_SLICE: catalogSlice } : {}) },
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
  let project = 'testing/tsconfig.trainingPresets.json';
  if (catalogOnly) {
    project = join(outputDirectory, 'tsconfig.catalog.json');
    writeFileSync(project, JSON.stringify({
      extends: join(testingDirectory, 'tsconfig.trainingPresets.json'),
      compilerOptions: { typeRoots: [join(uiRoot, 'node_modules', '@types')], types: ['node'] },
      files: [
        ...catalogTestFiles.map(file => join(testingDirectory, file.replace(/\.js$/, '.ts'))),
        join(testingDirectory, 'trainingBookFacts.ts'),
      ],
      include: [],
    }));
  }
  run(process.execPath, [tsc, '--project', project, '--outDir', outputDirectory]);
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
  for (const testFile of catalogOnly ? catalogTestFiles : testFiles) {
    const compiledTest = join(outputDirectory, 'testing', testFile);
    if (!existsSync(compiledTest)) {
      throw new Error(`Required compiled test artifact is missing: ${testFile}`);
    }
  }
  for (const testFile of catalogOnly ? catalogTestFiles : testFiles) {
    const compiledTest = join(outputDirectory, 'testing', testFile);
    run(process.execPath, [compiledTest]);
  }
  run('python', [join(testingDirectory, 'trainingPresetBackendMapping.test.py')]);
  const backendPath = join(outputDirectory, 'backend.json');
  const uiFactsPath = join(outputDirectory, 'ui-facts.json');
  run('python', [join(testingDirectory, 'trainingPresetBackendMapping.test.py'), '--emit', backendPath]);
  const collector = join(outputDirectory, 'testing', 'trainingBookFacts.js');
  if (!existsSync(collector)) throw new Error('Required compiled training book fact collector is missing');
  run(process.execPath, [
    '-e',
    `require(${JSON.stringify(collector)}).writeTrainingBookUiFacts(${JSON.stringify(repositoryRoot)}, ${JSON.stringify(uiFactsPath)})`,
  ]);
  run('python', [join(repositoryRoot, 'scripts', 'generate_training_book_reference.py'), '--check'], repositoryRoot);
  const releaseCheck = join(outputDirectory, 'testing', 'trainingPresetCatalogBuildValidationCli.js');
  if (!existsSync(releaseCheck)) throw new Error('Required compiled training preset release check is missing');
  run(process.execPath, [releaseCheck, '--check', '--repository-root', repositoryRoot, '--backend-report', backendPath, '--ui-facts', uiFactsPath]);
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
