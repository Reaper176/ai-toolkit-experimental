import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMP_PREFIX = 'ai-toolkit-training-presets-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const requiredTestFile = 'trainingPresets.test.js';
const optionalTestFiles = [
  'trainingPresetService.test.js',
  'trainingPresetRouteHandlers.test.js',
  'trainingPresetPrismaIntegration.test.js',
  'trainingPresetSelect.test.js',
  'trainingPresetControl.test.js',
  'trainingPresetPage.test.js',
  'trainingPresetPageIntegration.test.js',
  'trainingPresetAdvancedSync.test.js',
  'trainingPresetPageState.test.js',
];
let outputDirectory;

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: uiRoot,
    env: { ...process.env, NODE_PATH: join(uiRoot, 'node_modules') },
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
  const requiredCompiledTest = join(outputDirectory, 'testing', requiredTestFile);
  if (!existsSync(requiredCompiledTest)) {
    throw new Error(`Required compiled test artifact is missing: ${requiredTestFile}`);
  }
  run(process.execPath, [requiredCompiledTest]);
  for (const testFile of optionalTestFiles) {
    const compiledTest = join(outputDirectory, 'testing', testFile);
    if (existsSync(compiledTest)) run(process.execPath, [compiledTest]);
  }
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
