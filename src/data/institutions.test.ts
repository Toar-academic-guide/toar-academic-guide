import { describe, expect, it } from 'vitest';

import { mondayAdmissionsEvidence } from './admissions/mondayEvidence';
import { INSTITUTIONS, INSTITUTION_BY_ID } from './institutions';

describe('dynamic Monday-derived institutions', () => {
  it('creates an institution row for every Monday evidence record', () => {
    const institutionLookup = INSTITUTION_BY_ID as Record<string, (typeof INSTITUTIONS)[number]>;

    const missingInstitutions = mondayAdmissionsEvidence
      .filter((record) => {
        const institutionId = record.catalogueInstitutionId ?? `mon_${record.itemId}`;
        return !institutionLookup[institutionId];
      })
      .map((record) => ({
        itemId: record.itemId,
        displayName: record.displayName,
        expectedInstitutionId: record.catalogueInstitutionId ?? `mon_${record.itemId}`,
      }));

    expect(missingInstitutions).toEqual([]);
  });

  it('keeps evidence-only Monday institutions addressable under synthetic mon_ ids', () => {
    const evidenceOnlyRows = mondayAdmissionsEvidence
      .filter((record) => record.catalogueVisibility === 'evidence_only')
      .map((record) => ({
        institutionId: `mon_${record.itemId}`,
        displayName: record.displayName,
      }));

    const missingSyntheticRows = evidenceOnlyRows.filter(
      ({ institutionId, displayName }) =>
        !INSTITUTIONS.some(
          (institution) => institution.id === institutionId && institution.name === displayName,
        ),
    );

    expect(missingSyntheticRows).toEqual([]);
  });
});
