import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMP_PREFIX = 'ai-toolkit-dinov3-tagger-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
let outputDirectory;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: uiRoot, stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(command)} exited with status ${result.status}`);
}

function assertSafe(directory) {
  const realTemp = realpathSync(tmpdir());
  const realOutput = realpathSync(directory);
  const child = relative(realTemp, realOutput);
  if (
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
  run(process.execPath, [
    tsc,
    '--project',
    'testing/tsconfig.dinov3TaggerTypeChange.json',
    '--outDir',
    outputDirectory,
  ]);
  const aliasScope = join(outputDirectory, 'node_modules', '@');
  mkdirSync(aliasScope, { recursive: true });
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  symlinkSync(join(outputDirectory, 'src', 'helpers'), join(aliasScope, 'helpers'), linkType);
  symlinkSync(join(outputDirectory, 'src', 'utils'), join(aliasScope, 'utils'), linkType);
  const nodePath = [join(uiRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter);
  run(process.execPath, [join(outputDirectory, 'testing', 'dinov3TaggerOptions.test.js')], {
    env: { ...process.env, NODE_PATH: nodePath },
  });
  run(process.execPath, [join(outputDirectory, 'testing', 'dinov3TaggerTypeChange.test.js')], {
    env: { ...process.env, NODE_PATH: nodePath },
  });
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
