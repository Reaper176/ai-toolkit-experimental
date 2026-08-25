import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMP_PREFIX = 'ai-toolkit-training-book-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const repositoryRoot = resolve(testingDirectory, '..', '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const testFile = join(repositoryRoot, 'testing', 'training_book_validation_test.py');
const validator = join(repositoryRoot, 'scripts', 'validate_training_book.py');
const testSourcePattern = /^trainingBook.*\.test\.tsx?$/u;
const testContract = 'trainingBook*.test.tsx?';
const testSources = readdirSync(testingDirectory)
  .filter(name => testSourcePattern.test(name))
  .sort();
const requiredArtifacts = [
  testFile,
  validator,
  join(repositoryRoot, 'scripts', 'training_book', '__init__.py'),
  join(repositoryRoot, 'scripts', 'training_book', 'manifest.py'),
  join(repositoryRoot, 'docs', 'book', 'book-manifest.json'),
  join(repositoryRoot, 'docs', 'book', 'README.md'),
  join(testingDirectory, 'trainingBookFacts.ts'),
  join(testingDirectory, 'trainingBookUiFacts.test.ts'),
  join(testingDirectory, 'tsconfig.trainingBook.json'),
  ...testSources.map(name => join(testingDirectory, name)),
];

for (const artifact of requiredArtifacts) {
  if (!existsSync(artifact)) {
    throw new Error(`Required training-book test artifact is missing: ${artifact}`);
  }
}
if (testSources.length === 0) {
  throw new Error(`No ${testContract} artifacts were found`);
}

const args = process.argv.slice(2);
if (args.some(argument => argument !== '--facts-only') || args.length > 1) {
  throw new Error(`Unknown or incompatible training-book runner flags: ${args.join(' ')}`);
}
const factsOnly = args[0] === '--facts-only';
let outputDirectory;

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: uiRoot,
    env: { ...process.env, NODE_PATH: [join(uiRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter) },
    stdio: 'inherit',
    ...options,
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
    child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child) ||
    !basename(realOutput).startsWith(TEMP_PREFIX)
  ) throw new Error(`Refusing unsafe training-book test directory: ${realOutput}`);
}

try {
  outputDirectory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  assertSafe(outputDirectory);
  run(process.execPath, [tsc, '--project', 'testing/tsconfig.trainingBook.json', '--outDir', outputDirectory]);
  const aliasScope = join(outputDirectory, 'node_modules', '@');
  mkdirSync(dirname(aliasScope), { recursive: true });
  symlinkSync(join(outputDirectory, 'src'), aliasScope, process.platform === 'win32' ? 'junction' : 'dir');
  const nextLinkStub = join(outputDirectory, 'node_modules', 'next');
  mkdirSync(nextLinkStub, { recursive: true });
  writeFileSync(join(nextLinkStub, 'link.js'), "module.exports = function Link() { return null; }; module.exports.default = module.exports;\n");
  const reactStub = join(outputDirectory, 'node_modules', 'react');
  mkdirSync(reactStub, { recursive: true });
  writeFileSync(join(reactStub, 'package.json'), JSON.stringify({ type: 'commonjs', main: 'index.js' }));
  writeFileSync(join(reactStub, 'index.js'), [
    "const createElement = (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length > 0 ? children : props?.children } });",
    "const context = value => ({ value, Provider: props => props.children });",
    "module.exports = { createElement, createContext: context, useContext: item => item.value, useEffect: fn => fn(), useState: value => [value, () => {}], Fragment: Symbol.for('react.fragment') };",
    "module.exports.default = module.exports;",
    '',
  ].join('\n'));
  writeFileSync(join(reactStub, 'jsx-runtime.js'), [
    "const React = require('./index.js');",
    "const jsx = (type, props) => React.createElement(type, props);",
    "module.exports = { jsx, jsxs: jsx, Fragment: React.Fragment };",
    '',
  ].join('\n'));
  const lucideStub = join(outputDirectory, 'node_modules', 'lucide-react');
  mkdirSync(lucideStub, { recursive: true });
  writeFileSync(join(lucideStub, 'package.json'), JSON.stringify({ type: 'commonjs', main: 'index.js' }));
  writeFileSync(
    join(lucideStub, 'index.js'),
    "const React = require('react'); module.exports = new Proxy({}, { get: (_, name) => props => React.createElement('svg', { ...props, 'data-icon': String(name) }) });\n",
  );

  const compiledTests = testSources.map(name => name.replace(/\.tsx?$/u, '.js'));
  if (new Set(compiledTests).size !== compiledTests.length) {
    throw new Error(`Ambiguous ${testContract} compiled artifact names`);
  }
  for (const test of compiledTests) {
    const artifact = join(outputDirectory, 'testing', test);
    if (!existsSync(artifact)) throw new Error(`Required compiled test artifact is missing: ${test}`);
    run(process.execPath, [artifact], {
      env: {
        ...process.env,
        NODE_PATH: [join(uiRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter),
        TRAINING_BOOK_REPOSITORY_ROOT: repositoryRoot,
      },
    });
  }
  const collector = join(outputDirectory, 'testing', 'trainingBookFacts.js');
  const factsPath = join(outputDirectory, 'training-book-ui-facts.json');
  if (!existsSync(collector)) throw new Error('Required compiled collector artifact is missing: trainingBookFacts.js');
  run(process.execPath, ['-e', `require(${JSON.stringify(collector)}).writeTrainingBookUiFacts(${JSON.stringify(repositoryRoot)}, ${JSON.stringify(factsPath)})`]);
  if (!existsSync(factsPath)) throw new Error('Training-book UI facts were not emitted');

  if (!factsOnly) {
    run('python', [validator, '--check-discovery', '--ui-facts', factsPath], { cwd: repositoryRoot });
    run('python', [testFile], { cwd: repositoryRoot });
  }
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
