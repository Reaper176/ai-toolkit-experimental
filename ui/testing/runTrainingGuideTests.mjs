import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
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
const configuredTestSources = (tsconfig.include ?? [])
  .filter(source => dirname(source) === '.' && testSourcePattern.test(source))
  .sort();
let outputDirectory;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: uiRoot,
    stdio: 'inherit',
    ...options,
    env: {
      ...process.env,
      NODE_PATH: [join(uiRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter),
      TRAINING_BOOK_REPOSITORY_ROOT: repositoryRoot,
      ...options.env,
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(command)} exited with status ${result.status}`);
}

function findCommittedTestSources() {
  const result = spawnSync('git', ['cat-file', '-p', 'HEAD:ui/testing'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git cat-file exited with status ${result.status}`);
  return result.stdout
    .split('\n')
    .map(treeEntry => treeEntry.match(/^\d+ blob [0-9a-f]+\t(trainingGuide.*\.test\.tsx?)$/u)?.[1])
    .filter(source => source !== undefined)
    .sort();
}

function findCurrentTestSources() {
  return readdirSync(testingDirectory).filter(source => testSourcePattern.test(source)).sort();
}

function assertTestSourceInventory(currentTestSources, committedTestSources) {
  if (currentTestSources.length === 0) {
    throw new Error('No trainingGuide*.test.ts or trainingGuide*.test.tsx sources are configured');
  }
  const missingFromConfig = currentTestSources.filter(
    source => !configuredTestSources.includes(source),
  );
  const extraInConfig = configuredTestSources.filter(source => !currentTestSources.includes(source));
  const silentlyOmittedCommitted = committedTestSources.filter(
    source => existsSync(join(testingDirectory, source)) && !configuredTestSources.includes(source),
  );
  if (
    currentTestSources.length !== configuredTestSources.length ||
    missingFromConfig.length !== 0 ||
    extraInConfig.length !== 0 ||
    silentlyOmittedCommitted.length !== 0
  ) {
    throw new Error(
      `Training-guide test inventory mismatch: missing=${missingFromConfig.join(', ')}; extra=${extraInConfig.join(', ')}; committed-omissions=${silentlyOmittedCommitted.join(', ')}`,
    );
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

const testSources = findCurrentTestSources();
assertTestSourceInventory(testSources, findCommittedTestSources());

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

  const aliasScope = join(outputDirectory, 'node_modules', '@');
  mkdirSync(dirname(aliasScope), { recursive: true });
  symlinkSync(join(outputDirectory, 'src'), aliasScope, process.platform === 'win32' ? 'junction' : 'dir');
  symlinkSync(
    join(uiRoot, 'node_modules', 'react'),
    join(outputDirectory, 'node_modules', 'react'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const lucideStub = join(outputDirectory, 'node_modules', 'lucide-react');
  mkdirSync(lucideStub, { recursive: true });
  writeFileSync(join(lucideStub, 'package.json'), JSON.stringify({ type: 'commonjs', main: 'index.js' }));
  writeFileSync(
    join(lucideStub, 'index.js'),
    "const React = require('react'); module.exports = new Proxy({}, { get: (_, name) => props => React.createElement('svg', { ...props, 'data-icon': String(name) }) });\n",
  );

  const compiledTests = findCompiledTests(outputDirectory);
  const expectedTests = testSources.map(source =>
    join(outputDirectory, 'testing', source.replace(/\.tsx?$/u, '.js')),
  );
  if (
    compiledTests.length !== expectedTests.length ||
    compiledTests.some((compiledTest, index) => compiledTest !== expectedTests[index])
  ) {
    throw new Error(
      `Compiled training-guide tests do not match current configured sources: ${compiledTests.join(', ')}`,
    );
  }
  for (const compiledTest of compiledTests) run(process.execPath, [compiledTest]);
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafeOutputDirectory(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
