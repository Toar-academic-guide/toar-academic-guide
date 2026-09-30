import { describe, expect, it, vi } from 'vitest';
import capture from '../../../docs/admissions-verification/2026-09-28-tau-physiotherapy-screening.json';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import {
  evaluateTauPhysiotherapyResult,
  readTauPhysiotherapyThresholds,
} from './tauPhysiotherapyEvaluation';
import { evaluateAdmissionsForProgram } from './evaluator';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({
  getDb: vi.fn(() => {
    throw new Error('No database');
  }),
}));
const institution: CatalogueInstitution = {
  id: 'tau',
  name: 'תל אביב',
  region: 'center',
  domain: 'tau.ac.il',
  universityId: 'tau',
};
const selection = '<p>ציון התאמה (סכם) קבלה - 658.60</p><p>ציון התאמה (סכם) דחייה - 640</p>';
const registration =
  '<p>פסיכומטרי תקף של 630 לכל הפחות. ידע באנגלית: ציון 120 לפחות. מתמטיקה ברמה של 4 יחידות לפחות.</p>';
const input: AdmissionsEvaluationInput = {
  degreeId: 'physiotherapy',
  psychometric: 700,
  bagrut: 110,
  extraInputs: {
    tauBagrutAverage: 110,
    psychometricEnglish: 130,
    mathUnits: 4,
    mathGrade: 80,
    tauPhysiotherapyRoute: 'bagrut',
    tauPhysiotherapyRequirementsConfirmed: true,
    tauPhysiotherapyMoocBonusConfirmed: false,
  },
};
function fetcher(
  score: 'official-high' | 'official-low' = 'official-high',
  matched = true,
): typeof fetch {
  return vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
    if (String(url).includes('important-info')) return new Response(selection);
    if (String(url).includes('curriculum')) return new Response(registration);
    const body = JSON.parse(String(init?.body));
    if (body.operationName === 'getLastScore') return Response.json(capture[score]);
    return Response.json(
      matched
        ? capture.programme
        : {
            data: {
              getProgramByIdAndLang: {
                receipt_threshol: null,
                rejection_thresh: null,
                field_plain_id_programs: ['wrong'],
              },
            },
          },
    );
  });
}
function changed(extra: Partial<NonNullable<AdmissionsEvaluationInput['extraInputs']>>) {
  return { ...input, extraInputs: { ...input.extraInputs, ...extra } };
}
describe('TAU physiotherapy numeric screening', () => {
  it('uses official medical score, current thresholds, and still requires the interview', async () => {
    const report = await evaluateTauPhysiotherapyResult({ input, institution, fetcher: fetcher() });
    expect(report).toMatchObject({
      capability: 'manual_gate',
      decision: 'eligible_to_apply',
      score: 689.22,
      threshold: 658.6,
    });
    expect(report.explanation).toContain('אין כאן אישור זימון או קבלה סופית');
  });
  it('rejects the observed 639.19 example instead of the old generic application claim', async () => {
    const officialFetch = fetcher('official-low');
    const result = await evaluateTauPhysiotherapyResult({
      input: changed({ tauBagrutAverage: 100 }),
      institution,
      fetcher: officialFetch,
    });
    expect(result).toMatchObject({ decision: 'below', score: 639.19, threshold: 640 });
    const scoreRequest = (officialFetch as ReturnType<typeof vi.fn<typeof fetch>>).mock.calls.find(
      ([, init]) => String(init?.body).includes('getLastScore'),
    );
    expect(JSON.parse(String(scoreRequest?.[1]?.body)).variables.scoresData).toMatchObject({
      bagrut: '100',
      reali10: 0,
    });
  });
  it('asks for unknown bonus and official average rather than using the generic average', async () => {
    const result = await evaluateTauPhysiotherapyResult({
      input: changed({
        tauBagrutAverage: undefined,
        tauPhysiotherapyMoocBonusConfirmed: undefined,
      }),
      institution,
      fetcher: fetcher(),
    });
    expect(result).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['tau_bagrut_average', 'tau_physiotherapy_mooc_bonus'],
    });
  });
  it('enforces English 120 and accepts an explicitly approved alternative', async () => {
    const lowEnglish = changed({
      psychometricEnglish: 110,
      tauPhysiotherapyEnglishAlternativeConfirmed: false,
    });
    expect(
      await evaluateTauPhysiotherapyResult({ input: lowEnglish, institution, fetcher: fetcher() }),
    ).toMatchObject({ decision: 'below' });
    expect(
      await evaluateTauPhysiotherapyResult({
        input: changed({
          psychometricEnglish: 110,
          tauPhysiotherapyEnglishAlternativeConfirmed: true,
        }),
        institution,
        fetcher: fetcher(),
      }),
    ).toMatchObject({ decision: 'eligible_to_apply' });
  });
  it('enforces minimum psychometric and actual math record before calculating a score', async () => {
    expect(
      await evaluateTauPhysiotherapyResult({
        input: { ...input, psychometric: 629 },
        institution,
        fetcher: fetcher(),
      }),
    ).toMatchObject({ decision: 'below' });
    const result = await evaluateTauPhysiotherapyResult({
      input: changed({
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'mathematics', units: 3, grade: 100 }],
        },
        tauPhysiotherapyAcademicMathConfirmed: false,
      }),
      institution,
      fetcher: fetcher(),
    });
    expect(result).toMatchObject({ decision: 'below' });
    expect(result.explanation).toContain('מתמטיקה');
  });
  it('adds the confirmed course bonus once and respects the intermediate band', async () => {
    expect(
      await evaluateTauPhysiotherapyResult({
        input: changed({ tauPhysiotherapyMoocBonusConfirmed: true }),
        institution,
        fetcher: fetcher('official-low'),
      }),
    ).toMatchObject({ score: 644.19, decision: 'pending' });
  });
  it('does not fabricate a score or rejection for an academic route', async () => {
    const result = await evaluateTauPhysiotherapyResult({
      input: changed({ tauPhysiotherapyRoute: 'degree', tauBagrutAverage: undefined }),
      institution,
      fetcher: fetcher(),
    });
    expect(result).toMatchObject({ decision: 'unknown', kind: 'manual_gate' });
  });
  it('fails without an official programme match or a reachable authority', async () => {
    expect(
      await evaluateTauPhysiotherapyResult({
        input,
        institution,
        fetcher: fetcher('official-high', false),
      }),
    ).toMatchObject({ kind: 'authority_unavailable', decision: 'unknown' });
    expect(
      await evaluateTauPhysiotherapyResult({
        input,
        institution,
        fetcher: vi.fn().mockRejectedValue(new Error('offline')),
      }),
    ).toMatchObject({ kind: 'authority_unavailable', decision: 'unknown' });
    expect(() =>
      readTauPhysiotherapyThresholds(selection, registration.replace('120', '100')),
    ).toThrow();
  });
  it('takes the numeric screening path even though final admission remains withheld', async () => {
    const catalogue = getStaticCataloguePrograms();
    const program = catalogue.find((item) => item.id === 'physiotherapy')!;
    const report = await evaluateAdmissionsForProgram({
      input,
      program,
      institutions: [institution],
      fetcher: fetcher('official-low'),
      freshnessStatesBySourceId: new Map(),
    });
    expect(report.results[0]).toMatchObject({
      kind: 'manual_gate',
      score: 639.19,
      decision: 'below',
    });
  });
});
