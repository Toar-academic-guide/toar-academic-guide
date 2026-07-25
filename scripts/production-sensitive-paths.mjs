#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const productionSensitivePathPatterns = [
  /^\.github\/workflows\/(?:admissions-publication|admissions-freshness|ci)\.yml$/,
  /^scripts\/(?:admissions-source-freshness|prepare-admissions-review|publish-admissions-release|verify-operational-db)\.mjs$/,
  /^src\/data\/admissions\//,
  /^src\/db\//,
  /^src\/server\/admission-alerts\//,
  /^src\/server\/admissions\//,
  /^src\/server\/data-health\//,
];

export function findProductionSensitivePaths(filePaths) {
  return [
    ...new Set(
      filePaths
        .map((filePath) => filePath.trim())
        .filter(Boolean)
        .filter((filePath) =>
          productionSensitivePathPatterns.some((pattern) => pattern.test(filePath)),
        ),
    ),
  ].sort();
}

function main() {
  if (process.argv.includes('--all')) {
    process.stdout.write('applicable=true\n');
    return;
  }

  const changedPaths = readFileSync(0, 'utf8').split(/\r?\n/);
  const applicablePaths = findProductionSensitivePaths(changedPaths);
  process.stdout.write(`applicable=${applicablePaths.length > 0}\n`);
  if (applicablePaths.length > 0) {
    process.stderr.write(
      `Production-sensitive paths:\n${applicablePaths.map((filePath) => `  - ${filePath}`).join('\n')}\n`,
    );
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  main();
}
