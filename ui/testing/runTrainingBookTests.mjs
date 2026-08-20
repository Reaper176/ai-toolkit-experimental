import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testingDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testingDirectory, '..', '..');
const testFile = join(repositoryRoot, 'testing', 'training_book_validation_test.py');
const requiredArtifacts = [
  testFile,
  join(repositoryRoot, 'scripts', 'validate_training_book.py'),
  join(repositoryRoot, 'scripts', 'training_book', '__init__.py'),
  join(repositoryRoot, 'scripts', 'training_book', 'manifest.py'),
  join(repositoryRoot, 'docs', 'book', 'book-manifest.json'),
  join(repositoryRoot, 'docs', 'book', 'README.md'),
];

for (const artifact of requiredArtifacts) {
  if (!existsSync(artifact)) {
    throw new Error(`Required training-book test artifact is missing: ${artifact}`);
  }
}

const result = spawnSync('python', [testFile], {
  cwd: repositoryRoot,
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
