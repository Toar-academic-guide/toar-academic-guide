import { describe, expect, it } from 'vitest';

import {
  getMondayAdmissionEvidenceByCatalogueInstitutionId,
  getMondayAdmissionEvidenceByItemId,
  getMondayOfficialVerificationQueue,
  getTrackedMissingAdmissionRules,
  mondayAdmissionsEvidence,
} from './mondayEvidence';

describe('monday admissions evidence', () => {
  it('contains one clean derived record for every exported Monday item', () => {
    expect(mondayAdmissionsEvidence).toHaveLength(212);
  });

  it('does not commit raw Monday update bodies into the generated dataset', () => {
    const serialized = JSON.stringify(mondayAdmissionsEvidence);

    expect(serialized).not.toContain('textBody');
    expect(serialized).not.toContain('Reverse Engineering Summary');
    expect(serialized).not.toContain('<br');
  });

  it('maps known catalogue institutions while preserving all Monday evidence', () => {
    expect(getMondayAdmissionEvidenceByCatalogueInstitutionId('tau')).toEqual([
      expect.objectContaining({
        itemId: '12220699649',
        catalogueVisibility: 'catalogue_mapped',
        publicBucket: 'decision_capable',
        officialVerificationStatus: 'monday_evidence_decision_rule_available',
      }),
    ]);

    expect(getMondayAdmissionEvidenceByCatalogueInstitutionId('hit')).toEqual([
      expect.objectContaining({
        catalogueInstitutionId: 'hit',
        catalogueVisibility: 'catalogue_mapped',
        publicBucket: 'decision_capable',
      }),
    ]);
  });

  it('keeps formula-only institutions in the tracked missing-rule queue', () => {
    const technion = getMondayAdmissionEvidenceByItemId('12220699650');

    expect(technion).toMatchObject({
      catalogueInstitutionId: 'technion',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'tracked_missing_rule',
      ruleStatus: 'needs_threshold_or_status',
      officialVerificationStatus: 'needs_official_threshold',
      missingData: ['threshold_or_status'],
    });

    expect(getTrackedMissingAdmissionRules()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220699650',
          missingData: ['threshold_or_status'],
        }),
      ]),
    );
  });

  it('classifies no-formal-grade evidence separately from missing rules', () => {
    expect(mondayAdmissionsEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemName: '32. אסטלה - קונדיטוריה',
          publicBucket: 'eligible_no_formal_grade_gate',
          ruleStatus: 'manual_or_eligibility_rule_available',
          officialVerificationStatus: 'monday_evidence_manual_or_eligibility_rule_available',
          missingData: [],
        }),
      ]),
    );
  });

  it('exposes an official verification queue for extraction work', () => {
    expect(getMondayOfficialVerificationQueue()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemName: '3. הטכניון - מכון טכנולוגי לישראל',
          officialVerificationStatus: 'needs_official_threshold',
        }),
        expect.objectContaining({
          itemName: '5. אוניברסיטת בר-אילן',
          officialVerificationStatus: 'blocked_needs_alternate_official_source',
        }),
      ]),
    );

    expect(getMondayOfficialVerificationQueue()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemName: '32. אסטלה - קונדיטוריה',
        }),
      ]),
    );
  });
});
