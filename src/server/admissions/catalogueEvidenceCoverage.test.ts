import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  findUntrackedCatalogueAdmissionsGaps,
  reconcileCatalogueAdmissionsEvidence,
} from './catalogueEvidenceCoverage';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const staticPrograms = getStaticCataloguePrograms();
const staticInstitutions = getStaticCatalogueInstitutions();

describe('catalogue admissions evidence coverage', () => {
  it('keeps every visible static catalogue program-institution pair covered or explicitly tracked', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    const gaps = findUntrackedCatalogueAdmissionsGaps(entries);

    expect(
      gaps.map((gap) => ({
        programId: gap.programId,
        programName: gap.programName,
        institutionId: gap.institutionId,
        capability: gap.capability,
        nextAction: gap.nextAction,
      })),
    ).toEqual([]);
  });

  it('classifies art and performance programs as manual or eligible when Monday evidence says grades are not the full gate', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bezalel_industrial_design',
          institutionId: 'bezalel',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
          evidenceItemName: '23. בצלאל אקדמיה לאמנות ועיצוב',
        }),
        expect.objectContaining({
          programId: 'beit_zvi_acting',
          institutionId: 'beit_zvi',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
          evidenceItemName: '40. בית צבי בית ספר גבוה לאמנויות הבמה',
        }),
      ]),
    );
  });

  it('turns formula-only calculator evidence into tracked missing-rule work', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'technion_cs',
          institutionId: 'technion',
          capability: 'tracked_missing_rule',
          status: 'tracked_missing_rule',
          trackingSource: 'monday_evidence',
          missingData: ['threshold_or_status'],
        }),
      ]),
    );
  });

  it('names current catalogue institutions whose official evidence still must be fetched', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'broshim_homeopathy',
          institutionId: 'broshim',
          status: 'tracked_missing_rule',
          trackingSource: 'catalogue_gap_inventory',
          missingData: ['monday_item_mapping', 'official_rule'],
        }),
        expect.objectContaining({
          programId: 'itc_data_science',
          institutionId: 'itc',
          status: 'tracked_missing_rule',
          trackingSource: 'catalogue_gap_inventory',
          missingData: ['monday_item_mapping', 'official_rule'],
        }),
      ]),
    );
  });

  it('fails future catalogue additions that have neither Monday evidence nor an explicit tracked gap', () => {
    const futureInstitution = {
      id: 'future_institution',
      name: 'Future Institution',
      region: 'center',
      domain: 'future.example',
    } as unknown as CatalogueInstitution;
    const futureProgram = {
      ...staticPrograms[0],
      id: 'future_program',
      name: 'Future Program',
      institution: futureInstitution.name,
      linkedInstitutionIds: [futureInstitution.id],
    } as CatalogueProgram;

    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: [futureProgram],
      institutions: [...staticInstitutions, futureInstitution],
    });

    expect(findUntrackedCatalogueAdmissionsGaps(entries)).toEqual([
      expect.objectContaining({
        programId: 'future_program',
        institutionId: 'future_institution',
        status: 'untracked_gap',
        trackingSource: 'none',
      }),
    ]);
  });
});
