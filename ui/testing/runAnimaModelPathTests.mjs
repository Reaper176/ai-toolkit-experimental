import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMP_PREFIX = 'ai-toolkit-anima-model-paths-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const tscScript = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
let outputDirectory;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: uiRoot,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${basename(command)} exited with status ${result.status}`);
  }
}

function assertSafeOutputDirectory(directory) {
  const realTempDirectory = realpathSync(tmpdir());
  const realOutputDirectory = realpathSync(directory);
  const relativeOutput = relative(realTempDirectory, realOutputDirectory);
  const isBeneathTemp =
    relativeOutput !== '' &&
    relativeOutput !== '..' &&
    !relativeOutput.startsWith(`..${sep}`) &&
    !isAbsolute(relativeOutput);
  if (!isBeneathTemp || !basename(realOutputDirectory).startsWith(TEMP_PREFIX)) {
    throw new Error(`Refusing to use unsafe test output directory: ${realOutputDirectory}`);
  }
}

try {
  outputDirectory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  assertSafeOutputDirectory(outputDirectory);

  run(process.execPath, [
    tscScript,
    '--module',
    'commonjs',
    '--moduleResolution',
    'node',
    '--target',
    'es2020',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir',
    outputDirectory,
    'src/helpers/animaModelPaths.ts',
    'testing/animaModelPaths.test.ts',
  ]);
  run(process.execPath, [join(outputDirectory, 'testing', 'animaModelPaths.test.js')]);

  run(process.execPath, [
    tscScript,
    '--project',
    'testing/tsconfig.animaModelArchChange.json',
    '--outDir',
    outputDirectory,
  ]);

  const aliasScope = join(outputDirectory, 'node_modules', '@');
  mkdirSync(aliasScope, { recursive: true });
  const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
  symlinkSync(join(outputDirectory, 'src', 'helpers'), join(aliasScope, 'helpers'), symlinkType);
  symlinkSync(join(outputDirectory, 'src', 'utils'), join(aliasScope, 'utils'), symlinkType);

  const nodePath = [join(uiRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter);
  run(process.execPath, [join(outputDirectory, 'testing', 'animaModelArchChange.test.js')], {
    env: { ...process.env, NODE_PATH: nodePath },
  });
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafeOutputDirectory(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
