import { BATCH_C_PROGRAMS } from '@/server/admissions/batchCUnsupportedPathEvaluation';
import qa from '../../../../../docs/admissions-verification/evidence/2026-10-29-haifa-qa-replay.json';
import { normalizeEvaluationInputs } from '@/server/admissions/evaluationInputs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TechnionMedicineComparison from '@/components/TechnionMedicineComparison';
import { expect, it, vi } from 'vitest';
import captures from '../../../../../docs/admissions-verification/evidence/2026-10-29-bugs-first-official.json';
import { TAU_ACCOUNTING_CONTRACT } from '@/data/admissions/tauProgramVerification';
import { calculateTauBagrutAverage } from '@/server/admissions/bagrutPolicies';
import { admissionsExtraInputsFromAcademicScores } from '@/lib/admissionsEvaluationProfile';
import { buildBagrutSubjectRecord } from '@/utils/bagrutSubjectRecord';
import {
  gapApplicant,
  gapEvaluate,
  gapPrograms,
  programsFor,
  savedGapPrograms,
} from './sekhemCalculatorGap.fixture';

vi.mock('server-only', () => ({}));

it('A/F every Haifa programme has the exact honest official-source note and never asks for its average', async () => {
  const failures = [];
  for (const [catalogue, programs] of [
    ['static', gapPrograms],
    ['saved_audit', savedGapPrograms],
  ] as const) {
    for (const program of programsFor('haifa', programs)) {
      const { result } = await gapEvaluate(program, 'haifa', gapApplicant());
      const honest =
        result.kind ===
        (['psychology', 'haifa_psychology'].includes(program.id)
          ? 'authority_unavailable'
          : 'tracked_missing_rule');
      const officialLink = result.officialUrls?.some((url) => {
        const host = new URL(url).hostname;
        return host === 'admissions.haifa.ac.il' || host === 'applicants.haifa.ac.il';
      });
      if (
        !honest ||
        !officialLink ||
        // Approved test update, Jorje 2026-10-29
        result.explanation !== 'עדיין לא מחשבים כאן את ציון הקבלה של חיפה' ||
        result.explanation.includes('ממוצע בגרות רשמי של חיפה') ||
        result.requiredInputs?.includes('haifa_bagrut_average')
      )
        failures.push({
          catalogue,
          id: program.id,
          kind: result.kind,
          requiredInputs: result.requiredInputs ?? [],
          officialUrls: result.officialUrls ?? [],
          explanation: result.explanation,
        });
    }
  }
  expect(failures, JSON.stringify(failures)).toEqual([]);
});

it('uses student terminology in the three admission-copy strings introduced by PR318', async () => {
  const medicine = renderToStaticMarkup(createElement(TechnionMedicineComparison, { score: 92 }));
  const { result: psychology } = await gapEvaluate(
    gapPrograms.find((program) => program.id === 'haifa_psychology')!,
    'haifa',
    gapApplicant({ haifaBagrutAverage: 102 }),
  );
  const { result: haifa } = await gapEvaluate(
    gapPrograms.find((program) => program.id === 'haifa_cs')!,
    'haifa',
    gapApplicant(),
  );
  expect(psychology.kind).toBe('authority_unavailable');
  expect(psychology.explanation).toContain('650');
  expect(haifa.explanation).toBe('עדיין לא מחשבים כאן את ציון הקבלה של חיפה');
  expect(
    [medicine, psychology.explanation, haifa.explanation].filter((text) =>
      /מתואם|סכם|מצרף/.test(text),
    ),
  ).toEqual([]);
});

const record = buildBagrutSubjectRecord({
  sectorLabel: 'יהודי',
  certificateType: 'external_1977_or_later',
  complete: true,
  subjects: [
    { label: 'מתמטיקה', units: 5, grade: 90 },
    { label: 'אנגלית', units: 5, grade: 85 },
    { label: 'פיזיקה', units: 5, grade: 80 },
    { label: 'מדעי המחשב', units: 5, grade: 95 },
    { label: 'הבעה עברית', units: 2, grade: 85 },
    { label: 'היסטוריה', units: 2, grade: 80 },
    { label: 'אזרחות', units: 2, grade: 85 },
    { label: 'ספרות', units: 2, grade: 85 },
    { label: 'תנ״ך', units: 2, grade: 80 },
  ],
});
const applicant = {
  bagrut: 92.1,
  psychometric: 700,
  extraInputs: admissionsExtraInputsFromAcademicScores({
    bagrut: { subjectRecord: record },
    psychometric: { overall: 700, quantitative: 140, verbal: 130, english: 135 },
  })!,
};

it.each([
  ['tau_psychology', 'psychology', 685, 0],
  ['tau_law', 'law', 685, 0],
  ['tau_ee', 'electrical_engineering', 695, 1],
  // Official getLastScore capture: hatama_nihul=688 at109.14/PET700,
  // 2026-10-29-bugs-first-official.json tauGraphqlCalls[2], captured2026-10-28T19:00:03.772687+00:00.
  // Accounting maps to hatama_nihul; the engineering-only reali10 flag does not select that field.
  ['tau_accounting', 'accounting', 688, 0],
] as const)(
  'B %s sends the derived 109.14 average and reproduces the captured official score',
  async (id, programme, score, reali10) => {
    expect(calculateTauBagrutAverage(record)).toMatchObject({
      state: 'calculated',
      average: 109.14,
    });
    // Source: docs/admissions-verification/evidence/2026-10-29-bugs-first-official.json
    // https://go.tau.ac.il/graphql, captured 2026-10-28, item5 calls1–6:
    // raw92.1 gives hatama600/engineering610; derived109.14 gives685/695.
    // Serve the independently captured response matching the ACTUAL outbound average;
    // returning685 unconditionally would conceal the serialization defect.
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      if (programme === 'accounting' && body.operationName === 'getProgramByIdAndLang') {
        // Programme-node transport stub uses the unchanged reviewed accounting contract;
        // the score itself is selected independently from the raw official score capture below.
        return Response.json({
          data: {
            getProgramByIdAndLang: {
              nid: '11815',
              field_plain_id_programs: [TAU_ACCOUNTING_CONTRACT.officialProgramId],
              receipt_threshol: [TAU_ACCOUNTING_CONTRACT.calculation.cutoff.acceptance],
              rejection_thresh: [TAU_ACCOUNTING_CONTRACT.calculation.cutoff.rejection],
            },
          },
        });
      }

      const capture =
        body.operationName === 'getLastScore'
          ? captures.tauGraphqlCalls.find(
              (row) =>
                row.request.operationName === 'getLastScore' &&
                row.request.variables.scoresData?.bagrut === body.variables.scoresData.bagrut &&
                (body.variables.scoresData.bagrut === '109.14' ||
                  row.request.variables.scoresData?.reali10 === body.variables.scoresData.reali10),
            )
          : captures.tauGraphqlCalls.find(
              (row) => 'programme' in row && row.programme === programme,
            );
      if (!capture)
        throw new Error(`No captured TAU response for ${JSON.stringify(body.variables)}`);
      return Response.json(capture.response);
    });
    const { result } = await gapEvaluate(
      gapPrograms.find((p) => p.id === id)!,
      'tau',
      applicant,
      fetcher,
    );
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect
      .soft(request.variables.scoresData)
      .toMatchObject({ bagrut: '109.14', psicho: '700', reali10 });
    expect.soft(result.score).toBe(score);
  },
);

const haifaNotice = 'עדיין לא מחשבים כאן את ציון הקבלה של חיפה';
const haifaSources = [
  'https://admissions.haifa.ac.il/score-calculation/',
  'https://applicants.haifa.ac.il/enrollmentChances/index.html',
];

it.each(['1280', '390', '1280-retry', '390-retry'])(
  'H2 uses the real %s average-only CS UI request without asking for inputs',
  async () => {
    // All four QA captures carry this same body; project only the per-degree server input.
    const { degreeIds, ...profile } = qa.h2.csRequest;
    expect(degreeIds).toContain('haifa_cs');
    expect(profile).toEqual({ bagrut: 98, psychometric: 600 });
    const normalized = normalizeEvaluationInputs({ degreeId: 'haifa_cs', ...profile });
    expect(normalized.input.extraInputs?.haifaBagrutAverage).toBe(98);
    expect(normalized.proxyInstitutions.has('haifa')).toBe(true);
    const { result, fetcher } = await gapEvaluate(
      gapPrograms.find((program) => program.id === 'haifa_cs')!,
      'haifa',
      JSON.parse(JSON.stringify(profile)),
    );
    expect(result).toMatchObject({
      kind: 'tracked_missing_rule',
      capability: 'tracked_missing_rule',
      explanation: haifaNotice,
      officialUrls: expect.arrayContaining(haifaSources),
    });
    expect(result.requiredInputs ?? []).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each(qa.h2.allRequest.degreeIds)(
  'H2 returns the honest note for captured average-only Haifa programme %s',
  async (id) => {
    const { degreeIds: _ids, ...profile } = qa.h2.allRequest;
    const kind = ['psychology', 'haifa_psychology'].includes(id)
      ? 'authority_unavailable'
      : 'tracked_missing_rule';
    const program = gapPrograms.find((program) => program.id === id)!;
    expect(program).toBeDefined();
    const { result, fetcher } = await gapEvaluate(
      program,
      'haifa',
      JSON.parse(JSON.stringify(profile)),
    );
    if (id === 'haifa_infosystems') {
      // Approved test update, Jorje 2026-10-29
      expect(result).toMatchObject({
        kind: 'tracked_missing_rule',
        capability: 'blocked',
        explanation:
          'המיפוי של מסלול מערכות המידע החד־חוגי הרגיל למחשבון הרשמי טרם אומת. לא ניתן לקבוע זכאות עבורו.',
        officialUrls: ['https://admissions.haifa.ac.il/computer-information-science/program/3218/'],
      });
    } else if (id === 'haifa_engineering') {
      // Approved test update, Jorje 2026-10-29
      expect(result).toMatchObject({
        kind: 'unsupported',
        capability: 'unsupported',
        explanation: BATCH_C_PROGRAMS.haifa_engineering.explanationHe,
        nextAction: BATCH_C_PROGRAMS.haifa_engineering.nextActionHe,
      });
    } else {
      expect(result).toMatchObject({
        kind,
        capability: kind,
        explanation: haifaNotice,
        officialUrls: expect.arrayContaining(haifaSources),
      });
    }
    expect(result.requiredInputs ?? []).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  },
);
