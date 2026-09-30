#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = 'src/data/admissions/reviewedManifest.json';
const releaseKinds = new Set(['canonical_bootstrap', 'canonical_change', 'operational_proof']);
const branchBase = process.env.ADMISSIONS_REVIEW_BASE_REF || 'origin/main';
const weeklyRunKeyPattern = /^20\d{2}-W\d{2}$/;
const stableProofRunKeyPattern = /^[a-z0-9]+([_-][a-z0-9]+)*$/;

export function resolveAdmissionsReviewWorktree(worktree) {
  return worktree ? resolve(worktree) : scriptRoot;
}

const root = resolveAdmissionsReviewWorktree(process.env.ADMISSIONS_REVIEW_WORKTREE);

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== '--run-key') {
    throw new Error('Usage: validate-admissions-review-pr --run-key YYYY-Www or stable-proof-id');
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

function branchFiles() {
  return execFileSync('git', ['diff', '--name-only', `${branchBase}...HEAD`], {
    cwd: root,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
}

function validateManifest() {
  const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
  validateManifestValue(manifest);
  return manifest;
}

export function validateManifestValue(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    value.version !== 2 ||
    !releaseKinds.has(value.releaseKind) ||
    !Array.isArray(value.changes)
  ) {
    throw new Error(
      'Generated reviewed manifest must have version 2, a supported release kind, and a changes array.',
    );
  }
  if (value.changes.length === 0)
    throw new Error('Generated review PR cannot contain an empty manifest.');
}

export function validateRunKey(runKey, manifest) {
  if (
    weeklyRunKeyPattern.test(runKey) ||
    (manifest.releaseKind === 'operational_proof' && stableProofRunKeyPattern.test(runKey))
  ) {
    return;
  }
  throw new Error('Usage: validate-admissions-review-pr --run-key YYYY-Www or stable-proof-id');
}

export function validateGeneratedReviewFiles({ branch, staged, required }) {
  const allowed = new Set(required);
  const present = new Set([...branch, ...staged]);
  const unexpected = [...present].filter((path) => !allowed.has(path));
  if (unexpected.length > 0) {
    throw new Error(
      `Generated review branch changed non-allowlisted paths: ${unexpected.join(', ')}`,
    );
  }
  const missing = required.filter((path) => !present.has(path));
  if (missing.length > 0) {
    throw new Error(
      `Generated review branch must stage or retain the manifest, run report, and exclusion metadata: ${missing.join(', ')}`,
    );
  }
}

function validateReviewMetadata(path, runKey) {
  const value = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  if (
    !value ||
    value.version !== 1 ||
    value.runKey !== runKey ||
    !Array.isArray(value.excludedCandidateIds) ||
    value.excludedCandidateIds.some(
      (id) => typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]*:admission_cutoff$/.test(id),
    )
  ) {
    throw new Error('Generated review metadata must contain valid candidate exclusion ids.');
  }
}

function main() {
  const runKey = parseArguments(process.argv.slice(2));
  const reportPath = `docs/admissions-review-runs/${runKey}.md`;
  const metadataPath = `docs/admissions-review-runs/${runKey}.json`;
  const required = [manifestPath, reportPath, metadataPath];
  const changed = stagedFiles();
  validateGeneratedReviewFiles({ branch: branchFiles(), staged: changed, required });
  const manifest = validateManifest();
  validateRunKey(runKey, manifest);
  validateReviewMetadata(metadataPath, runKey);
  console.info(
    JSON.stringify({
      valid: true,
      changed: changed.map((path) => relative(root, resolve(root, path))),
    }),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
