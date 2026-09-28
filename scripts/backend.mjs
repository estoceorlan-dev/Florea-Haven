// Cross-platform npm entry point. All API and database work runs in Python.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const windows = process.platform === 'win32';
const python = path.join(
  backend,
  '.venv',
  windows ? 'Scripts/python.exe' : 'bin/python',
);
const command = process.argv[2];

function run(executable, args) {
  const result = spawnSync(executable, args, {
    cwd: backend,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (command === 'setup') {
  if (!existsSync(python)) {
    run(process.env.PYTHON ?? (windows ? 'python' : 'python3'), [
      '-m',
      'venv',
      '.venv',
    ]);
  }
  run(python, ['-m', 'pip', 'install', '-r', 'requirements-dev.txt']);
} else {
  if (!existsSync(python)) {
    console.error('Python environment is missing. Run npm run backend:setup first.');
    process.exit(1);
  }
  if (command === 'test') {
    run(python, ['-m', 'pytest', ...process.argv.slice(3)]);
  } else if (command === 'lint') {
    run(python, ['-m', 'ruff', 'check', '.']);
    run(python, ['-m', 'ruff', 'format', '--check', '.']);
  } else if (command === 'format') {
    run(python, ['-m', 'ruff', 'format', '.']);
  } else {
    run(python, ['manage.py', command, ...process.argv.slice(3)]);
  }
}
