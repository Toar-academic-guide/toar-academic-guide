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

    expect(getMondayAdmissionEvidenceByCatalogueInstitutionId('sapir')).toEqual([
      expect.objectContaining({
        itemId: '12220697668',
        catalogueInstitutionId: null,
        displayName: 'המכללה האקדמית ספיר',
      }),
    ]);
  });

  it('keeps partially verified institutions in the tracked missing-rule queue until all programs are closed', () => {
    const technion = getMondayAdmissionEvidenceByItemId('12220699650');
    const bgu = getMondayAdmissionEvidenceByItemId('12220699687');

    expect(technion).toMatchObject({
      catalogueInstitutionId: 'technion',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'tracked_missing_rule',
      ruleStatus: 'needs_official_rule',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: ['unverified_data_science_program_match'],
    });
    expect(technion?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'technion_cs',
          threshold: 91,
          sourceUrl: expect.stringContaining('admissions.technion.ac.il'),
        }),
        expect.objectContaining({
          programId: 'technion_medicine',
          threshold: 92,
          thresholdKind: 'invitation_to_manual_gate',
        }),
      ]),
    );

    expect(getTrackedMissingAdmissionRules()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: '12220699650',
          missingData: ['unverified_data_science_program_match'],
        }),
        expect.objectContaining({
          itemId: '12220699687',
          missingData: ['remaining_program_thresholds'],
        }),
      ]),
    );

    expect(bgu).toMatchObject({
      catalogueInstitutionId: 'bgu',
      catalogueVisibility: 'catalogue_mapped',
      publicBucket: 'tracked_missing_rule',
      ruleStatus: 'needs_official_rule',
      officialVerificationStatus: 'partial_official_rule_verified',
      missingData: ['remaining_program_thresholds'],
    });
    expect(bgu?.verifiedProgramThresholds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bgu_cs',
          threshold: 720,
          sourceUrl: expect.stringContaining('p_spe1=3'),
        }),
        expect.objectContaining({
          programId: 'bgu_datascience',
          threshold: 720,
          sourceUrl: expect.stringContaining('p_spe1=13'),
        }),
        expect.objectContaining({
          programId: 'bgu_ee',
          threshold: 547,
          sourceUrl: expect.stringContaining('p_dep1=361'),
        }),
        expect.objectContaining({
          programId: 'bgu_me',
          threshold: 520,
          sourceUrl: expect.stringContaining('p_dep1=362'),
        }),
        expect.objectContaining({
          programId: 'bgu_industrial',
          threshold: 505,
          sourceUrl: expect.stringContaining('p_dep1=364'),
        }),
        expect.objectContaining({
          programId: 'bgu_psychology',
          threshold: 650,
          sourceUrl: expect.stringContaining('p_dep1=101'),
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
