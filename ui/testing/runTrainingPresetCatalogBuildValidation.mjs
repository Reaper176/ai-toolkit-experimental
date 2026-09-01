import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PREFIX = 'ai-toolkit-training-preset-build-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const repositoryRoot = resolve(uiRoot, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const args = process.argv.slice(2);
if (!((args.length === 1 && ['--check', '--write-recipes'].includes(args[0])) || (args.length === 2 && args[0] === '--emit-book-facts'))) {
  throw new Error('expected exactly one of --write-recipes, --check, or --emit-book-facts <owned-path>');
}
let temporary;
function run(command, commandArgs, cwd = uiRoot) {
  const result = spawnSync(command, commandArgs, { cwd, env: { ...process.env, NODE_PATH: join(uiRoot, 'node_modules') }, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(command)} exited with status ${result.status}`);
}
function safe(directory) {
  const realTemp = realpathSync(tmpdir());
  const realOutput = realpathSync(directory);
  const child = relative(realTemp, realOutput);
  if (realpathSync(dirname(realOutput)) !== realTemp || child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child) || !basename(realOutput).startsWith(PREFIX)) throw new Error(`refusing unsafe temporary directory: ${realOutput}`);
}
try {
  temporary = mkdtempSync(join(tmpdir(), PREFIX));
  safe(temporary);
  run(process.execPath, [tsc, '--project', 'testing/tsconfig.trainingPresets.json', '--outDir', temporary]);
  const alias = join(temporary, 'node_modules', '@');
  mkdirSync(dirname(alias), { recursive: true });
  symlinkSync(join(temporary, 'src'), alias, process.platform === 'win32' ? 'junction' : 'dir');
  const backendPath = join(temporary, 'backend.json');
  const uiFactsPath = join(temporary, 'ui-facts.json');
  run('python', [join(testingDirectory, 'trainingPresetBackendMapping.test.py'), '--emit', backendPath], repositoryRoot);
  const collector = join(temporary, 'testing', 'trainingBookFacts.js');
  if (!existsSync(collector)) throw new Error('canonical training book UI collector was not compiled');
  run(process.execPath, ['-e', `require(${JSON.stringify(collector)}).writeTrainingBookUiFacts(${JSON.stringify(repositoryRoot)}, ${JSON.stringify(uiFactsPath)})`]);
  run('python', [join(repositoryRoot, 'scripts/generate_training_book_reference.py'), '--check'], repositoryRoot);
  const cli = join(temporary, 'testing', 'trainingPresetCatalogBuildValidationCli.js');
  const operationArgs = args[0] === '--emit-book-facts'
    ? ['--emit-book-facts', resolve(args[1]), '--repository-root', repositoryRoot, '--backend-report', backendPath, '--ui-facts', uiFactsPath]
    : [args[0], '--repository-root', repositoryRoot, '--backend-report', backendPath, '--ui-facts', uiFactsPath];
  run(process.execPath, [cli, ...operationArgs]);
} finally {
  if (temporary !== undefined && existsSync(temporary)) { safe(temporary); rmSync(temporary, { recursive: true }); }
}
