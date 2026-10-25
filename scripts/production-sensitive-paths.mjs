#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const productionSensitivePathPatterns = [
  /^scripts\/lib\/production-schema-snapshot\.mjs$/,
  /^\.github\/workflows\/(?:admission-alert-delivery|admission-alert-processing|admissions-publication|admissions-freshness|ci)\.yml$/,
  /^scripts\/(?:deliver-admission-alerts|process-admission-alerts|admissions-source-freshness|pre-pr-guard|prepare-admissions-review|production-sensitive-paths|publish-admissions-release|verify-operational-db)\.mjs$/,
  /^src\/app\/api\/admission-alerts\//,
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

// Audit: `rg '\.md' src scripts e2e`. The admissions directories contain
// generated/validated evidence; AGENTS.md is also a pre-PR guard input.
// Other docs formats (JSON, HTML, PDFs) can be runtime or test inputs.
export function isDocsOnlyChange(filePaths) {
  const paths = filePaths.map((filePath) => filePath.trim()).filter(Boolean);
  return (
    paths.length > 0 &&
    paths.every(
      (filePath) =>
        filePath.endsWith('.md') &&
        filePath !== 'AGENTS.md' &&
        !/^(?:docs\/(?:admissions-coverage|admissions-review-runs)|public|src|e2e|scripts|\.github)\//.test(
          filePath,
        ),
    )
  );
}

function main() {
  if (process.argv.includes('--all')) {
    process.stdout.write('applicable=true\ndocs_only=false\n');
    return;
  }

  const changedPaths = readFileSync(0, 'utf8').split(/\r?\n/);
  const applicablePaths = findProductionSensitivePaths(changedPaths);
  process.stdout.write(`applicable=${applicablePaths.length > 0}\n`);
  process.stdout.write(`docs_only=${isDocsOnlyChange(changedPaths)}\n`);
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
