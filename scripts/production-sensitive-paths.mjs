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
// The workflow contract reads the WAF Markdown to reject concrete egress IPs.
// Other docs formats (JSON, HTML, PDFs) can be runtime or test inputs.
export function isDocsOnlyChange(filePaths) {
  const paths = filePaths.map((filePath) => filePath.trim()).filter(Boolean);
  return (
    paths.length > 0 &&
    paths.every(
      (filePath) =>
        filePath.endsWith('.md') &&
        filePath !== 'AGENTS.md' &&
        filePath !== 'docs/ops/vercel-waf-rate-limits.md' &&
        !/^(?:docs\/(?:admissions-coverage|admissions-review-runs)|public|src|e2e|scripts|\.github)\//.test(
          filePath,
        ),
    )
  );
}

// Inputs to /internal/data-health, its access check, and the CI browser harness.
const dataHealthSmokePaths = [
  /^src\/app\/(?:internal\/|auth\/|api\/_lib\/auth\.|layout\.|globals\.css$|not-found\.)/,
  /^src\/(?:db\/|data\/|server\/(?:data-health|internal|admissions|admission-alerts|catalogue|ingestion|cache)\/)/,
  /^src\/(?:proxy\.|env\.|context\/AuthContext\.|lib\/(?:supabase\/|routes\.|site\.|footerLinks\.))/,
  /^src\/components\/(?:WayPageShell|WayBackdrop|PublicNavBar|SiteFooter|SkipLink)\./,
  /^(?:package(?:-lock)?\.json|next\.config\.[^/]+|tsconfig\.json|postcss\.config\.[^/]+|playwright\.config\.[^/]+|vercel\.json)$/,
  /^e2e\/(?:internal-data-health\.spec|fixtures)\./,
  /^(?:\.github\/workflows\/ci\.yml|scripts\/production-sensitive-paths\.mjs)$/,
];

function main() {
  if (process.argv.includes('--all')) {
    process.stdout.write('applicable=true\ndocs_only=false\ndata_health_required=true\n');
    return;
  }

  const changedPaths = readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean);
  const applicablePaths = findProductionSensitivePaths(changedPaths);
  process.stdout.write(`applicable=${applicablePaths.length > 0}\n`);
  process.stdout.write(`docs_only=${isDocsOnlyChange(changedPaths)}\n`);
  const dataHealthRequired =
    !changedPaths.length ||
    changedPaths.some((path) => dataHealthSmokePaths.some((pattern) => pattern.test(path)));
  process.stdout.write(`data_health_required=${dataHealthRequired}\n`);
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
