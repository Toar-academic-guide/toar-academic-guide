import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  resolveAdmissionsReviewWorktree,
  validateGeneratedReviewFiles,
} from '../../../scripts/validate-admissions-review-pr.mjs';

describe('admissions review PR validation', () => {
  const required = [
    'src/data/admissions/reviewedManifest.json',
    'docs/admissions-review-runs/2026-W40.md',
    'docs/admissions-review-runs/2026-W40.json',
  ];

  it('accepts unchanged generated artifacts already tracked on the stable review branch', () => {
    expect(() =>
      validateGeneratedReviewFiles({ branch: required, staged: [], required }),
    ).not.toThrow();
  });

  it('still rejects missing or non-allowlisted generated artifacts', () => {
    expect(() =>
      validateGeneratedReviewFiles({
        branch: required.slice(0, 2),
        staged: [],
        required,
      }),
    ).toThrow('must stage or retain');
    expect(() =>
      validateGeneratedReviewFiles({
        branch: required,
        staged: ['src/server/admissions/evaluator.ts'],
        required,
      }),
    ).toThrow('non-allowlisted');
  });

  it('uses an explicitly supplied review worktree when validating from a trusted copy', () => {
    expect(resolveAdmissionsReviewWorktree('/tmp/generated-review')).toBe('/tmp/generated-review');
  });

  it('runs a copied validator against the supplied worktree and immutable base commit', () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'admissions-review-validator-'));
    const reviewWorktree = path.join(temporaryDirectory, 'review-worktree');
    const copiedValidator = path.join(
      temporaryDirectory,
      'runner',
      'validate-admissions-review-pr.mjs',
    );

    try {
      mkdirSync(reviewWorktree, { recursive: true });
      mkdirSync(path.dirname(copiedValidator), { recursive: true });
      copyFileSync(
        path.join(process.cwd(), 'scripts/validate-admissions-review-pr.mjs'),
        copiedValidator,
      );
      git(reviewWorktree, 'init', '--initial-branch=main');
      git(reviewWorktree, 'config', 'user.email', 'test@example.com');
      git(reviewWorktree, 'config', 'user.name', 'Test');
      writeFileSync(path.join(reviewWorktree, 'README.md'), 'baseline\n');
      git(reviewWorktree, 'add', 'README.md');
      git(reviewWorktree, 'commit', '-m', 'baseline');
      const baseCommit = git(reviewWorktree, 'rev-parse', 'HEAD').trim();

      writeJson(reviewWorktree, 'src/data/admissions/reviewedManifest.json', {
        version: 2,
        releaseKind: 'canonical_bootstrap',
        changes: [{ candidateId: 'tau:admission_cutoff' }],
      });
      writeText(reviewWorktree, 'docs/admissions-review-runs/2026-W40.md', '# Run\n');
      writeJson(reviewWorktree, 'docs/admissions-review-runs/2026-W40.json', {
        version: 1,
        runKey: '2026-W40',
        excludedCandidateIds: [],
      });
      git(
        reviewWorktree,
        'add',
        'src/data/admissions/reviewedManifest.json',
        'docs/admissions-review-runs/2026-W40.md',
        'docs/admissions-review-runs/2026-W40.json',
      );

      const output = execFileSync(
        process.execPath,
        [realpathSync(copiedValidator), '--run-key', '2026-W40'],
        {
          cwd: temporaryDirectory,
          encoding: 'utf8',
          env: {
            ...process.env,
            ADMISSIONS_REVIEW_WORKTREE: reviewWorktree,
            ADMISSIONS_REVIEW_BASE_REF: baseCommit,
          },
        },
      );

      expect(output).toContain('"valid":true');
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function writeJson(root: string, relativePath: string, value: unknown) {
  writeText(root, relativePath, `${JSON.stringify(value)}\n`);
}

function writeText(root: string, relativePath: string, value: string) {
  const outputPath = path.join(root, relativePath);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, value);
}
