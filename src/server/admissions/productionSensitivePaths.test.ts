import { describe, expect, it } from 'vitest';

import { findProductionSensitivePaths } from '../../../scripts/production-sensitive-paths.mjs';

describe('production-sensitive path classification', () => {
  it.each([
    'src/db/migrations/0018_secure_admission_threshold_scope_function.sql',
    'src/data/admissions/reviewedManifest.json',
    'src/server/admission-alerts/transitionWork.ts',
    'src/server/admissions/admissionsReleasePublisher.ts',
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
});
