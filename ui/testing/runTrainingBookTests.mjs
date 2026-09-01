import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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

const TEMP_PREFIX = 'ai-toolkit-training-book-';
const testingDirectory = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(testingDirectory, '..');
const repositoryRoot = resolve(testingDirectory, '..', '..');
const tsc = join(uiRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const testFile = join(repositoryRoot, 'testing', 'training_book_validation_test.py');
const validator = join(repositoryRoot, 'scripts', 'validate_training_book.py');
const referenceGenerator = join(repositoryRoot, 'scripts', 'generate_training_book_reference.py');
const navigationGenerator = join(repositoryRoot, 'scripts', 'generate_training_book_navigation.py');
const presetCatalogRunner = join(testingDirectory, 'runTrainingPresetCatalogBuildValidation.mjs');
const testSourcePattern = /^(?:trainingBook.*|trainingGuideLink)\.test\.tsx?$/u;
const testContract = 'trainingBook*.test.tsx? or trainingGuideLink.test.tsx';
const testSources = readdirSync(testingDirectory)
  .filter(name => testSourcePattern.test(name))
  .sort();
const requiredArtifacts = [
  testFile,
  validator,
  referenceGenerator,
  navigationGenerator,
  join(repositoryRoot, 'scripts', 'training_book', '__init__.py'),
  join(repositoryRoot, 'scripts', 'training_book', 'manifest.py'),
  presetCatalogRunner,
  join(repositoryRoot, 'docs', 'book', 'book-manifest.json'),
  join(repositoryRoot, 'docs', 'book', 'README.md'),
  join(repositoryRoot, 'ui', 'src', 'components', 'TrainingGuideLink.tsx'),
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
const allowedArgs = new Set(['--skip-smoke', '--require-smoke', '--describe-plan']);
const smokeFlags = args.filter(argument => argument !== '--describe-plan');
const describePlan = args.includes('--describe-plan');
if (
  args.some(argument => !allowedArgs.has(argument)) ||
  args.filter(argument => argument === '--describe-plan').length > 1 ||
  smokeFlags.length > 1
) {
  throw new Error(`Unknown or incompatible training-book runner flags: ${args.join(' ')}`);
}
const smokeArgs = smokeFlags[0] === '--require-smoke' ? [] : ['--skip-smoke'];
let outputDirectory;

function run({ command, args: commandArgs, cwd, env }) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: {
      ...process.env,
      NODE_PATH: [join(uiRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter),
      ...env,
    },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(command)} exited with status ${result.status}`);
}

function command(phase, executable, commandArgs, options = {}) {
  return {
    phase,
    command: executable,
    args: commandArgs,
    cwd: options.cwd ?? uiRoot,
    env: options.env ?? {},
    ...(options.source === undefined ? {} : { source: options.source }),
  };
}

function createExecutionPlan(directory) {
  const compiledTests = testSources.map(name => ({
    source: name,
    artifact: join(directory, 'testing', name.replace(/\.tsx?$/u, '.js')),
  }));
  if (new Set(compiledTests.map(test => test.artifact)).size !== compiledTests.length) {
    throw new Error(`Ambiguous ${testContract} compiled artifact names`);
  }

  const collector = join(directory, 'testing', 'trainingBookFacts.js');
  const factsPath = join(directory, 'training-book-ui-facts.json');
  const presetFactsPath = join(directory, 'training-book-preset-facts.json');
  return {
    cleanup_target: directory,
    ui_facts: factsPath,
    preset_facts: presetFactsPath,
    collector,
    commands: [
      command('compile-typescript', process.execPath, [
        tsc,
        '--project',
        'testing/tsconfig.trainingBook.json',
        '--outDir',
        directory,
      ]),
      ...compiledTests.map(test =>
        command('compiled-test', process.execPath, [test.artifact], {
          source: test.source,
          env: { TRAINING_BOOK_REPOSITORY_ROOT: repositoryRoot },
        }),
      ),
      command('emit-ui-facts', process.execPath, [
        '-e',
        `require(${JSON.stringify(collector)}).writeTrainingBookUiFacts(${JSON.stringify(repositoryRoot)}, ${JSON.stringify(factsPath)})`,
      ]),
      command('emit-preset-facts', process.execPath, [presetCatalogRunner, '--emit-book-facts', presetFactsPath]),
      command('reference-check', 'python', [referenceGenerator, '--check'], { cwd: repositoryRoot }),
      command('navigation-check', 'python', [navigationGenerator, '--check'], { cwd: repositoryRoot }),
      command(
        'full-validation',
        'python',
        [validator, '--check-discovery', '--ui-facts', factsPath, ...smokeArgs, '--preset-facts', presetFactsPath],
        { cwd: repositoryRoot },
      ),
      command('python-units', 'python', [testFile], {
        cwd: repositoryRoot,
        env: {
          TRAINING_BOOK_UI_FACTS_PATH: factsPath,
          TRAINING_BOOK_PRESET_FACTS_PATH: presetFactsPath,
        },
      }),
    ],
  };
}

function commandsFor(plan, phase) {
  return plan.commands.filter(planned => planned.phase === phase);
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
  )
    throw new Error(`Refusing unsafe training-book test directory: ${realOutput}`);
}

try {
  outputDirectory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  assertSafe(outputDirectory);
  const plan = createExecutionPlan(outputDirectory);
  if (describePlan) {
    process.stdout.write(
      `${JSON.stringify({
        cleanup_target: plan.cleanup_target,
        ui_facts: plan.ui_facts,
        preset_facts: plan.preset_facts,
        commands: plan.commands,
      })}\n`,
    );
  } else {
    run(commandsFor(plan, 'compile-typescript')[0]);
    const aliasScope = join(outputDirectory, 'node_modules', '@');
    mkdirSync(dirname(aliasScope), { recursive: true });
    symlinkSync(join(outputDirectory, 'src'), aliasScope, process.platform === 'win32' ? 'junction' : 'dir');
    const nextLinkStub = join(outputDirectory, 'node_modules', 'next');
    mkdirSync(nextLinkStub, { recursive: true });
    writeFileSync(
      join(nextLinkStub, 'link.js'),
      'module.exports = function Link() { return null; }; module.exports.default = module.exports;\n',
    );
    const reactStub = join(outputDirectory, 'node_modules', 'react');
    symlinkSync(join(uiRoot, 'node_modules', 'react'), reactStub, process.platform === 'win32' ? 'junction' : 'dir');
    const lucideStub = join(outputDirectory, 'node_modules', 'lucide-react');
    mkdirSync(lucideStub, { recursive: true });
    writeFileSync(join(lucideStub, 'package.json'), JSON.stringify({ type: 'commonjs', main: 'index.js' }));
    writeFileSync(
      join(lucideStub, 'index.js'),
      "const React = require('react'); module.exports = new Proxy({}, { get: (_, name) => props => React.createElement('svg', { ...props, 'data-icon': String(name) }) });\n",
    );

    for (const test of commandsFor(plan, 'compiled-test')) {
      const artifact = test.args[0];
      if (!existsSync(artifact)) {
        throw new Error(`Required compiled test artifact is missing: ${basename(artifact)}`);
      }
      run(test);
    }
    if (!existsSync(plan.collector))
      throw new Error('Required compiled collector artifact is missing: trainingBookFacts.js');
    run(commandsFor(plan, 'emit-ui-facts')[0]);
    if (!existsSync(plan.ui_facts)) throw new Error('Training-book UI facts were not emitted');

    run(commandsFor(plan, 'emit-preset-facts')[0]);
    if (!existsSync(plan.preset_facts)) throw new Error('Training-book preset facts were not emitted');
    run(commandsFor(plan, 'reference-check')[0]);
    run(commandsFor(plan, 'navigation-check')[0]);
    run(commandsFor(plan, 'full-validation')[0]);
    run(commandsFor(plan, 'python-units')[0]);
  }
} finally {
  if (outputDirectory !== undefined && existsSync(outputDirectory)) {
    assertSafe(outputDirectory);
    rmSync(outputDirectory, { recursive: true });
  }
}
