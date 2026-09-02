import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMP_PREFIX = 'ai-toolkit-training-guide-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const repositoryRoot = resolve(uiRoot, '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const tsconfigPath = join(testingDirectory, 'tsconfig.trainingGuide.json');
const testSourcePattern = /^trainingGuide.*\.test\.tsx?$/u;
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
const testSources = (tsconfig.include ?? [])
  .filter(source => dirname(source) === '.' && testSourcePattern.test(source))
  .sort();
let outputDirectory;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: uiRoot,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(command)} exited with status ${result.status}`);
}

function assertCommittedTestSources() {
  if (testSources.length === 0) {
    throw new Error('No trainingGuide*.test.ts or trainingGuide*.test.tsx sources are configured');
  }
  for (const source of testSources) {
    const repositoryPath = `ui/testing/${source}`;
    const result = spawnSync('git', ['cat-file', '-e', `HEAD:${repositoryPath}`], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Required committed training-guide test source is missing: ${repositoryPath}`);
    }
  }
}

function assertSafeOutputDirectory(directory) {
  const realTempDirectory = realpathSync(tmpdir());
  const realOutputDirectory = realpathSync(directory);
  const relativeOutput = relative(realTempDirectory, realOutputDirectory);
  const isDirectChild =
    realpathSync(dirname(realOutputDirectory)) === realTempDirectory &&
    relativeOutput !== '' &&
    relativeOutput !== '..' &&
    !relativeOutput.startsWith(`..${sep}`) &&
    !isAbsolute(relativeOutput) &&
    !relativeOutput.includes(sep);
  if (!isDirectChild || !basename(realOutputDirectory).startsWith(TEMP_PREFIX)) {
    throw new Error(`Refusing unsafe training-guide test directory: ${realOutputDirectory}`);
  }
}

function findCompiledTests(directory) {
  const compiledTestingDirectory = join(directory, 'testing');
  if (!existsSync(compiledTestingDirectory)) return [];
  return readdirSync(compiledTestingDirectory)
    .filter(name => /^trainingGuide.*\.test\.js$/u.test(name))
    .sort()
    .map(name => join(compiledTestingDirectory, name));
}

assertCommittedTestSources();

try {
  outputDirectory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  assertSafeOutputDirectory(outputDirectory);

  run(process.execPath, [
    tsc,
    '--project',
    'testing/tsconfig.trainingGuide.json',
    '--outDir',
    outputDirectory,
  ]);

  const compiledTests = findCompiledTests(outputDirectory);
  const expectedTests = testSources.map(source =>
    join(outputDirectory, 'testing', source.replace(/\.tsx?$/u, '.js')),
  );
  if (
    compiledTests.length !== expectedTests.length ||
    compiledTests.some((compiledTest, index) => compiledTest !== expectedTests[index])
  ) {
    throw new Error(
      `Compiled training-guide tests do not match committed configured sources: ${compiledTests.join(', ')}`,
    );
  }
  for (const compiledTest of compiledTests) run(process.execPath, [compiledTest]);
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafeOutputDirectory(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
