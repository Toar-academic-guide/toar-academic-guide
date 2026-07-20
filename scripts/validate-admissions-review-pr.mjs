#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = 'src/data/admissions/reviewedManifest.json';

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== '--run-key' || !/^20\d{2}-W\d{2}$/.test(argv[1])) {
    throw new Error('Usage: validate-admissions-review-pr --run-key YYYY-Www');
  }
  return argv[1];
}

function stagedFiles() {
  return execFileSync('git', ['diff', '--cached', '--name-only'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
}

function validateManifest() {
  const value = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
  if (!value || value.version !== 1 || !Array.isArray(value.changes)) {
    throw new Error('Generated reviewed manifest must have version 1 and a changes array.');
  }
  if (value.changes.length === 0) throw new Error('Generated review PR cannot contain an empty manifest.');
}

function main() {
  const runKey = parseArguments(process.argv.slice(2));
  const reportPath = `docs/admissions-review-runs/${runKey}.md`;
  const allowed = new Set([manifestPath, reportPath]);
  const changed = stagedFiles();
  const unexpected = changed.filter((path) => !allowed.has(path));
  if (unexpected.length > 0) {
    throw new Error(`Generated review branch changed non-allowlisted paths: ${unexpected.join(', ')}`);
  }
  if (!changed.includes(manifestPath) || !changed.includes(reportPath)) {
    throw new Error('Generated review branch must stage both the manifest and its run report.');
  }
  validateManifest();
  console.info(JSON.stringify({ valid: true, changed: changed.map((path) => relative(root, resolve(root, path))) }));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
