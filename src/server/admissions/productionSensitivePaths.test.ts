import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

const classifierModuleUrl = pathToFileURL(
  path.join(process.cwd(), 'scripts/production-sensitive-paths.mjs'),
).href;

function findProductionSensitivePaths(filePaths: string[]): string[] {
  const script = `
    import { findProductionSensitivePaths } from ${JSON.stringify(classifierModuleUrl)};
    process.stdout.write(JSON.stringify(findProductionSensitivePaths(${JSON.stringify(filePaths)})));
  `;

  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      encoding: 'utf8',
    }),
  ) as string[];
}

describe('production-sensitive path classification', () => {
  it.each([
    'src/db/migrations/0018_secure_admission_threshold_scope_function.sql',
    'src/data/admissions/reviewedManifest.json',
    'src/server/admission-alerts/transitionWork.ts',
    'src/server/admissions/admissionsReleasePublisher.ts',
    'scripts/production-sensitive-paths.mjs',
    'scripts/pre-pr-guard.mjs',
    'scripts/publish-admissions-release.mjs',
  ])('requires operational verification for %s', (filePath) => {
    expect(findProductionSensitivePaths([filePath])).toEqual([filePath]);
  });

  it('ignores an unrelated presentation-only change', () => {
    expect(findProductionSensitivePaths(['src/components/Header.tsx'])).toEqual([]);
  });

  it('deduplicates and sorts applicable paths for stable CI output', () => {
    expect(
      findProductionSensitivePaths([
        'src/db/schema.ts',
        'src/data/admissions/reviewedManifest.json',
        'src/db/schema.ts',
      ]),
    ).toEqual(['src/data/admissions/reviewedManifest.json', 'src/db/schema.ts']);
  });

  it('pins pull-request classification to the base branch policy', async () => {
    const workflow = await readFile(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

    expect(workflow).toContain('git show "origin/$BASE_REF:$classifier" > "$base_classifier"');
    expect(workflow).toContain('node "$classifier" >> "$GITHUB_OUTPUT"');
  });

  it('runs the protected production preflight only after a sensitive change reaches main', async () => {
    const workflow = await readFile(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

    expect(workflow).toContain(
      "if: ${{ github.ref == 'refs/heads/main' && needs.production-sensitive-paths.outputs.applicable == 'true' }}",
    );
    expect(workflow).toContain(
      "PREFLIGHT_REQUIRED: ${{ github.ref == 'refs/heads/main' && needs.production-sensitive-paths.outputs.applicable == 'true' }}",
    );
    expect(workflow).toContain(
      'if [[ "$PREFLIGHT_REQUIRED" == "true" && "$PREFLIGHT_RESULT" != "success" ]]; then',
    );
  });
});
