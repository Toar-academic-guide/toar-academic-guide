import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { academicPrograms } from '@/data/degrees/academicPrograms';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { BATCH_B_PROGRAM_IDS } from './batchBManualPathEvaluation';
import { BATCH_C_PROGRAMS, evaluateBatchCUnsupportedPath } from './batchCUnsupportedPathEvaluation';
import {
  BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS,
  isBatchCUnsupportedProgramId,
} from '@/data/admissions/batchCUnsupportedProgramIds';
import { evaluateAdmissionsForProgram } from './evaluator';
import { resultExplanation, resultLabel } from '@/lib/studyJourney';

const programs = getStaticCataloguePrograms();
const institutions = getStaticCatalogueInstitutions();

describe('Batch C unsupported admission paths', () => {
  it('covers all 19 explicit academic Ariel programmes', () => {
    const arielIds = academicPrograms
      .filter((p) => p.id.startsWith('ariel_'))
      .map((p) => p.id)
      .sort();
    expect(arielIds).toHaveLength(19);
    expect(
      Object.keys(BATCH_C_PROGRAMS)
        .filter((id) => id.startsWith('ariel_'))
        .sort(),
    ).toEqual(arielIds);
  });

  it('keeps client pair map in sync and never shadows Batch B', () => {
    expect(BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS).toEqual(
      Object.fromEntries(
        Object.entries(BATCH_C_PROGRAMS).map(([id, config]) => [id, config.institutionId]),
      ),
    );
    expect(Object.keys(BATCH_C_PROGRAMS).filter((id) => BATCH_B_PROGRAM_IDS.includes(id))).toEqual(
      [],
    );
    for (const [id, config] of Object.entries(BATCH_C_PROGRAMS)) {
      expect(programs.find((p) => p.id === id)?.linkedInstitutionIds).toContain(
        config.institutionId,
      );
      expect(isBatchCUnsupportedProgramId(id, config.institutionId)).toBe(true);
      expect(isBatchCUnsupportedProgramId(id, 'different_institution')).toBe(false);
    }
  });

  it.each(Object.entries(BATCH_C_PROGRAMS))(
    '%s stays honest through evaluator and client for empty, weak and strong profiles',
    async (degreeId, config) => {
      const program = programs.find((p) => p.id === degreeId)!;
      for (const scores of [
        {},
        { bagrut: 60, psychometric: 200 },
        { bagrut: 120, psychometric: 800 },
      ]) {
        const report = await evaluateAdmissionsForProgram({
          input: { degreeId, ...scores },
          program,
          institutions: institutions.filter((i) => i.id === config.institutionId),
          freshnessStatesBySourceId: new Map(),
          fetcher: vi.fn().mockRejectedValue(new Error('No network permitted')),
        });
        const result = report.results[0];
        if (degreeId === 'haifa_engineering' && !('bagrut' in scores)) {
          // Approved test update, Jorje 2026-10-28
          expect(result).toMatchObject({
            capability: 'tracked_missing_rule',
            kind: 'tracked_missing_rule',
            decision: 'unknown',
            explanation: 'עדיין לא מחשבים את הסכם של חיפה כאן',
            nextAction: 'בדקו במחשבון הרשמי של אוניברסיטת חיפה.',
          });
        } else {
          expect(result).toMatchObject({
            kind: 'unsupported',
            capability: 'unsupported',
            decision: 'unknown',
          });
        }
        expect(result.requiredInputs).toBeUndefined();
        expect(result.scoreAssessment).toBeUndefined();
        expect(result.score).toBeUndefined();
        expect(result.threshold).toBeUndefined();
        if (degreeId === 'haifa_engineering' && !('bagrut' in scores)) {
          // Approved test update, Jorje 2026-10-28
          expect(result.explanation).toBe('עדיין לא מחשבים את הסכם של חיפה כאן');
        } else {
          expect(result.explanation).not.toMatch(/מתואם|סכם|מצרף|[a-zA-Z]|מוחרג|פרויקט אימות/);
        }
        // Approved test update, Jorje 2026-10-28
        expect(result.nextAction).toBe(
          degreeId === 'haifa_engineering' && !('bagrut' in scores)
            ? 'בדקו במחשבון הרשמי של אוניברסיטת חיפה.'
            : config.nextActionHe,
        );
        if (['itc_data_science', 'mon_12220696299_certificate'].includes(degreeId)) {
          expect(result.officialUrls).toBeUndefined();
          expect(result.nextAction).toContain('פנו למוסד');
        } else {
          expect(result.officialUrls?.length).toBeGreaterThan(0);
        }
        for (const url of result.officialUrls ?? []) expect(url).not.toMatch(/yoram|walla/);
        // Approved test update, Jorje 2026-10-28
        expect(resultExplanation(result, degreeId)).toBe(
          degreeId === 'haifa_engineering' && !('bagrut' in scores)
            ? 'עדיין לא מחשבים את הסכם של חיפה כאן'
            : config.explanationHe,
        );
        expect(resultLabel(result).group).toBe('explore');
      }
    },
  );

  it('does not match supported peers or encode follow-ups', () => {
    const program = programs.find((p) => p.id === 'cs')!;
    for (const institutionId of ['tau', 'biu', 'bgu']) {
      expect(
        evaluateBatchCUnsupportedPath({
          program,
          institution: institutions.find((i) => i.id === institutionId)!,
        }),
      ).toBeUndefined();
    }
    for (const id of [
      'colman_law',
      'colman_business',
      'tau_medicine',
      'nutrition',
      'ono_socialwork',
      'tlvyaffo_socialwork',
      'biu_cs',
      'ono_cs',
      'ruppin_cs',
    ])
      expect(BATCH_C_PROGRAMS[id]).toBeUndefined();
  });
});

it('retains the unwired Braude engineering shell and mechina in Batch C', () => {
  for (const id of ['braude_engineering', 'braude_prep']) {
    expect(BATCH_C_PROGRAMS[id].institutionId).toBe('braude');
    expect(isBatchCUnsupportedProgramId(id, 'braude')).toBe(true);
  }
});
