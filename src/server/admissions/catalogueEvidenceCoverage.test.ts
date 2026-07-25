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

  it('publishes exact Technion threshold coverage after pair verification', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'technion_cs',
          institutionId: 'technion',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
        expect.objectContaining({
          programId: 'technion_datascience',
          institutionId: 'technion',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
      ]),
    );
  });

  it('publishes exact Technion medicine invitation coverage after pair verification', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'technion_medicine',
          institutionId: 'technion',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
      ]),
    );
  });

  it('withholds the formula-backed Colman pair while preserving other requirements-only programs', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'colmgmt_cs',
          institutionId: 'colman',
          capability: 'authority_unavailable',
          status: 'verification_incomplete',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'colmgmt_business',
          institutionId: 'colman',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'colmgmt_economics',
          institutionId: 'colman',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'colmgmt_law',
          institutionId: 'colman',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'colmgmt_accounting',
          institutionId: 'colman',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'colmgmt_infosystems',
          institutionId: 'colman',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
      ]),
    );
  });

  it('treats current Ono catalogue programs as covered manual-or-eligible work once official programme pages are verified', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'ono_law',
          institutionId: 'ono',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'ono_business',
          institutionId: 'ono',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'ono_cs',
          institutionId: 'ono',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
        expect.objectContaining({
          programId: 'ono_nursing',
          institutionId: 'ono',
          capability: 'manual_gate',
          status: 'manual_or_eligible',
          trackingSource: 'monday_evidence',
        }),
      ]),
    );
  });

  it('drops stale Ono psychology and social-work mappings when the current official curriculum no longer exposes exact undergraduate pages for them', () => {
    expect(staticPrograms.some((program) => program.id === 'ono_socialwork')).toBe(false);
    expect(staticPrograms.some((program) => program.id === 'ono_psychology')).toBe(false);
  });

  it('publishes BGU formula pairs after score-and-verdict proof is complete', () => {
    const entries = reconcileCatalogueAdmissionsEvidence({
      programs: staticPrograms,
      institutions: staticInstitutions,
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'bgu_cs',
          institutionId: 'bgu',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
        expect.objectContaining({
          programId: 'bgu_ee',
          institutionId: 'bgu',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
        expect.objectContaining({
          programId: 'bgu_biology',
          institutionId: 'bgu',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
        expect.objectContaining({
          programId: 'bgu_socialwork',
          institutionId: 'bgu',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
        expect.objectContaining({
          programId: 'bgu_nursing',
          institutionId: 'bgu',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
        expect.objectContaining({
          programId: 'bgu_medicine',
          institutionId: 'bgu',
          capability: 'exact',
          status: 'decision_rule_available',
          trackingSource: 'monday_evidence',
          missingData: [],
        }),
      ]),
    );
  });

  it('drops stale BGU law from the visible static catalogue when the current official degree catalogue no longer exposes it', () => {
    expect(staticPrograms.some((program) => program.id === 'bgu_law')).toBe(false);
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
