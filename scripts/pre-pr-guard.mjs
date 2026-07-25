#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findProductionSensitivePaths } from './production-sensitive-paths.mjs';

const rootDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

const highRiskPathPatterns = [
  /^AGENTS\.md$/,
  /^vercel\.json$/,
  /^\.codex\//,
  /^\.githooks\//,
  /^\.github\/workflows\//,
  /^scripts\/seed-catalogue\.mjs$/,
  /^scripts\/derive-monday-admissions-evidence\.mjs$/,
  /^docs\/admissions-coverage\//,
  /^src\/app\/api\/catalog\//,
  /^src\/app\/internal\//,
  /^src\/components\/CalculatorResults\./,
  /^src\/components\/LandingPage\./,
  /^src\/data\/admissions\//,
  /^src\/data\/degrees\//,
  /^src\/db\//,
  /^src\/env(\.test)?\.ts$/,
  /^src\/lib\/calculatorInstitutions\./,
  /^src\/lib\/catalogueStatic\./,
  /^src\/server\/admissions\//,
  /^src\/server\/catalogue\//,
  /^src\/server\/data-health\//,
  /^src\/types\/admissionsEvaluation\.ts$/,
];

const operationalReadGrants = {
  app_runtime: [
    'admission_alternative_paths',
    'admission_facts',
    'admissions_source_candidates',
    'source_freshness_checks',
    'source_freshness_states',
    'bagrut_profile_versions',
    'admission_publication_attempts',
    'admission_release_items',
    'admission_releases',
    'admission_target_transitions',
    'admission_alert_baseline_history',
    'admission_alert_email_preferences',
    'admission_alert_outbox',
    'admission_alert_subscriptions',
    'admission_alert_transition_work',
    'admission_alert_webhook_events',
    'admission_review_runs',
  ],
  ops_readonly: [
    'admission_alternative_paths',
    'admission_facts',
    'admissions_source_candidates',
    'source_freshness_checks',
    'source_freshness_states',
    'bagrut_profile_versions',
    'admission_publication_attempts',
    'admission_release_items',
    'admission_releases',
    'admission_target_transitions',
    'admission_alert_baseline_history',
    'admission_alert_email_preferences',
    'admission_alert_outbox',
    'admission_alert_subscriptions',
    'admission_alert_transition_work',
    'admission_alert_webhook_events',
    'admission_review_runs',
  ],
};

const targetedTests = [
  'src/data/admissions/mondayEvidence.test.ts',
  'src/data/admissions/formulaBackedPairInventory.test.ts',
  'src/data/admissions/formulaBackedVerificationLedger.test.ts',
  'src/server/admissions/catalogueEvidenceCoverage.test.ts',
  'src/server/admissions/calculatorCoverage.test.ts',
  'src/server/admissions/capabilityMatrix.test.ts',
  'src/server/admissions/evaluator.test.ts',
  'src/server/admissions/verification/programVerification.test.ts',
  'src/server/admissions/admissionsReleasePublisher.test.ts',
  'src/server/admissions/productionSchemaPreflight.test.ts',
  'src/server/admissions/productionSensitivePaths.test.ts',
  'src/server/catalogue/queries.test.ts',
  'src/server/data-health/queries.test.ts',
  'src/db/seeds/catalogueSeed.test.ts',
  'src/components/CalculatorResults.test.tsx',
  'src/components/LandingPage.test.tsx',
  'src/app/internal/data-health/page.test.tsx',
  'src/app/internal/data-health/DataHealthDashboard.test.tsx',
  'src/app/api/catalog/programs/route.test.ts',
  'src/app/api/catalog/institutions/route.test.ts',
  'src/app/api/admissions/evaluate/route.test.ts',
];

const admissionsGeneratedFiles = [
  'docs/admissions-coverage/missing-official-rules.md',
  'docs/admissions-coverage/monday-evidence-summary.md',
  'src/data/admissions/mondayEvidence.generated.ts',
];
const mondayAdmissionsRawExportPath = join(rootDir, 'scratch/monday-admissions-updates.json');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (options.capture) {
    return result.status === 0 ? result.stdout.trim() : null;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function git(args) {
  return run('git', args, { capture: true });
}

function splitLines(output) {
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function getBaseRef() {
  const envBaseRef = process.env.BASE_REF?.trim();
  if (envBaseRef) {
    return envBaseRef;
  }

  const remoteMain = git(['rev-parse', '--verify', 'origin/main']);
  if (remoteMain) {
    const mergeBase = git(['merge-base', 'HEAD', 'origin/main']);
    if (mergeBase) {
      return mergeBase;
    }
  }

  return git(['rev-parse', '--verify', 'HEAD~1']);
}

function getChangedFiles() {
  const baseRef = getBaseRef();
  const committed = baseRef ? splitLines(git(['diff', '--name-only', `${baseRef}...HEAD`])) : [];
  const staged = splitLines(git(['diff', '--cached', '--name-only']));
  const unstaged = splitLines(git(['diff', '--name-only']));
  const untracked = splitLines(git(['ls-files', '--others', '--exclude-standard']));

  return [...new Set([...committed, ...staged, ...unstaged, ...untracked])].sort();
}

function isHighRiskPath(filePath) {
  return highRiskPathPatterns.some((pattern) => pattern.test(filePath));
}

function readMigrationStatements() {
  const migrationsDir = join(rootDir, 'src/db/migrations');
  if (!existsSync(migrationsDir)) {
    return [];
  }

  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .flatMap((fileName) => {
      const sql = readFileSync(join(migrationsDir, fileName), 'utf8');
      return sql
        .split(/-->\s*statement-breakpoint/)
        .map((statement) => statement.trim())
        .filter(Boolean);
    });
}

function assertOperationalGrants() {
  const grantStatements = readMigrationStatements().filter((statement) =>
    /\bGRANT\s+[\s\S]*?\bSELECT\b[\s\S]*?\bON\s+TABLE\b/i.test(statement),
  );
  const missing = [];

  for (const [role, tables] of Object.entries(operationalReadGrants)) {
    for (const table of tables) {
      const tablePattern = new RegExp(`"${table}"|\\b${table}\\b`, 'i');
      const rolePattern = new RegExp(`\\bTO\\s+[^;]*\\b${role}\\b`, 'i');
      const hasGrant = grantStatements.some(
        (statement) => tablePattern.test(statement) && rolePattern.test(statement),
      );

      if (!hasGrant) {
        missing.push(`${table} -> ${role}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error('Missing operational SELECT grants in migrations:');
    for (const item of missing) {
      console.error(`  - ${item}`);
    }
    console.error(
      'Add a migration granting runtime read access before pushing catalogue or data-health changes.',
    );
    process.exit(1);
  }
}

function assertAdmissionsEvidenceFresh() {
  console.log('Pre-PR guard: verifying committed Monday admissions evidence.');
  run('npm', ['run', 'monday:verify-admissions-evidence']);

  if (existsSync(mondayAdmissionsRawExportPath)) {
    console.log('Pre-PR guard: regenerating Monday admissions evidence.');
    run('npm', ['run', 'monday:derive-admissions-evidence']);

    console.log('Pre-PR guard: checking generated admissions evidence drift.');
    run('git', ['diff', '--exit-code', '--', ...admissionsGeneratedFiles]);
  } else {
    console.log(
      'Pre-PR guard: raw Monday export not found; skipping local regeneration drift check.',
    );
  }
}

const changedFiles = getChangedFiles();
const highRiskChanges = [
  ...new Set([
    ...changedFiles.filter(isHighRiskPath),
    ...findProductionSensitivePaths(changedFiles),
  ]),
].sort();

console.log('Pre-PR guard: checking migration grants.');
assertOperationalGrants();

console.log('Pre-PR guard: running migration consistency check.');
run('npm', ['run', 'db:migrate:check']);

console.log('Pre-PR guard: running catalogue seed dry-run.');
run('npm', ['run', 'db:seed:dry-run']);

if (highRiskChanges.length > 0) {
  console.log('Pre-PR guard: high-risk production paths changed:');
  for (const filePath of highRiskChanges) {
    console.log(`  - ${filePath}`);
  }

  assertAdmissionsEvidenceFresh();

  console.log('Pre-PR guard: running targeted catalogue/data-health/calculator tests.');
  run('npm', ['test', '--', ...targetedTests]);
} else {
  console.log('Pre-PR guard: no high-risk production paths changed.');
}

console.log('Pre-PR guard passed.');
