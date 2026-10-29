import { BATCH_C_PROGRAMS } from '@/server/admissions/batchCUnsupportedPathEvaluation';
import qa from '../../../../../docs/admissions-verification/evidence/2026-10-29-haifa-qa-replay.json';
import { normalizeEvaluationInputs } from '@/server/admissions/evaluationInputs';
import { HAIFA_NO_CALCULATION_NOTE } from '@/data/admissions/haifaNoCalculationNote';
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
  // Approved test update: Jorje 2026-10-29, option A, ledger-withheld Haifa psychology gets the Haifa note on saved and proxy paths; official-calculator results stay live.
  expect(psychology.explanation).toBe(HAIFA_NO_CALCULATION_NOTE);
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

function haifaAverageApplicants(haifaInformationSystemsTrack?: 'single_major') {
  const qualification = {
    haifaHebrewQualification: 'hebrew_school' as const,
    haifaInformationSystemsTrack,
  };
  const saved = gapApplicant({ haifaBagrutAverage: 104, ...qualification });
  const proxy = {
    ...gapApplicant({ bagrutSubjectRecord: undefined, ...qualification }),
    bagrut: 104,
  };
  return { saved, proxy };
}

function haifaAnswer(result: Awaited<ReturnType<typeof gapEvaluate>>['result']) {
  const { capability, kind, decision, explanation, officialUrls } = result;
  return { capability, kind, decision, explanation, officialUrls };
}

it.each(['haifa_psychology', 'psychology'])(
  'saved Haifa average gives the same honest note as a proxy for %s',
  async (id) => {
    const { saved, proxy } = haifaAverageApplicants();
    expect(
      normalizeEvaluationInputs({ degreeId: id, ...saved }).proxyInstitutions.has('haifa'),
    ).toBe(false);
    expect(
      normalizeEvaluationInputs({ degreeId: id, ...proxy }).proxyInstitutions.has('haifa'),
    ).toBe(true);
    const program = gapPrograms.find((program) => program.id === id)!;
    const { result } = await gapEvaluate(program, 'haifa', saved);
    const { result: proxyResult } = await gapEvaluate(program, 'haifa', proxy);
    expect(haifaAnswer(result)).toEqual(haifaAnswer(proxyResult));
    expect(result).toMatchObject({
      kind: 'authority_unavailable',
      capability: 'authority_unavailable',
      explanation: HAIFA_NO_CALCULATION_NOTE,
      officialUrls: expect.arrayContaining(haifaSources),
    });
    for (const answer of [result, proxyResult]) {
      expect(answer.explanation).toBe(HAIFA_NO_CALCULATION_NOTE);
      expect(answer.officialUrls).toEqual(expect.arrayContaining(haifaSources));
      expect(JSON.stringify(answer)).not.toContain('650');
      expect(answer.degradationReason).toBeUndefined();
    }
  },
);

// Captured on origin/main 56b3a6a with gapApplicant({ haifaBagrutAverage: 104,
// haifaHebrewQualification: 'hebrew_school' }), across both catalogues.
// Only the approved Haifa terminology is changed in these literal expectations.
const mainSavedHaifaAnswers = [
  {
    ids: ['cs', 'haifa_cs'],
    result: {
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      // Approved test update: Jorje 2026-10-29, Haifa local formula; value matches Haifa's calculator output in docs/admissions-verification/evidence/2026-10-29-haifa-formula/
      score: 611,
      threshold: 700,
      requiredInputs: undefined,
      officialUrls: ['https://admissions.haifa.ac.il/computer-information-science/program/3210'],
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 680 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    },
  },
  {
    ids: [
      'accounting',
      'biology',
      'economics',
      'haifa_accounting',
      'haifa_biology',
      'haifa_economics',
      'haifa_law',
      'haifa_physiotherapy',
      'law',
      'physiotherapy',
    ],
    result: {
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      score: undefined,
      threshold: undefined,
      requiredInputs: ['haifa_psychometric_month'],
      officialUrls: undefined,
      explanation: 'לבדיקת חיפה חסרים הנתונים הבאים: חודש הפסיכומטרי.',
    },
  },
  {
    ids: ['haifa_socialwork', 'social_work'],
    result: {
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      score: 493,
      threshold: 615,
      requiredInputs: undefined,
      officialUrls: ['https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3082'],
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 580 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    },
  },
  {
    ids: ['haifa_nursing', 'nursing'],
    result: {
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      score: undefined,
      threshold: undefined,
      requiredInputs: ['haifa_psychometric_month', 'haifa_science_units'],
      officialUrls: undefined,
      explanation: 'לבדיקת חיפה חסרים הנתונים הבאים: חודש הפסיכומטרי, יחידות מדעיות לסיעוד.',
    },
  },
  {
    ids: ['communication', 'haifa_communication'],
    result: {
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      score: 493,
      threshold: 550,
      requiredInputs: undefined,
      officialUrls: ['https://admissions.haifa.ac.il/social-sciences/program/3229'],
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 500 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    },
  },
  {
    ids: ['haifa_politicalscience', 'political_science'],
    result: {
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      score: 493,
      threshold: 580,
      requiredInputs: undefined,
      officialUrls: ['https://admissions.haifa.ac.il/social-sciences/program/3054'],
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 520 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    },
  },
  {
    ids: ['haifa_statistics'],
    result: {
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      // Approved test update: Jorje 2026-10-29, Haifa local formula; value matches Haifa's calculator output in docs/admissions-verification/evidence/2026-10-29-haifa-formula/
      score: 611,
      threshold: 630,
      requiredInputs: undefined,
      officialUrls: ['https://admissions.haifa.ac.il/natural-sciences/program/3167'],
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 600 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    },
  },
  {
    ids: ['haifa_math'],
    result: {
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      // Approved test update: Jorje 2026-10-29, Haifa local formula; value matches Haifa's calculator output in docs/admissions-verification/evidence/2026-10-29-haifa-formula/
      score: 611,
      threshold: 610,
      requiredInputs: undefined,
      officialUrls: ['https://admissions.haifa.ac.il/natural-sciences/program/3161'],
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 580 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    },
  },
  {
    ids: ['haifa_infosystems'],
    result: {
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      score: undefined,
      threshold: undefined,
      requiredInputs: ['haifa_information_systems_track'],
      officialUrls: undefined,
      explanation: 'יש לבחור את מסלול מערכות המידע המדויק בחיפה כדי לחשב סיכויי קבלה.',
    },
  },
  {
    ids: ['haifa_sociology'],
    result: {
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      score: 493,
      threshold: 540,
      requiredInputs: undefined,
      officialUrls: ['https://admissions.haifa.ac.il/social-sciences/program/2968'],
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 520 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    },
  },
  {
    ids: ['haifa_engineering'],
    result: {
      capability: 'unsupported',
      kind: 'unsupported',
      decision: 'unknown',
      score: undefined,
      threshold: undefined,
      requiredInputs: undefined,
      officialUrls: [
        'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?utm_source=myway&utm_medium=referral',
      ],
      explanation:
        'תנאי הקבלה שונים בין המסלולים בתחום הזה, ולכן אין כאן חישוב קבלה שאפשר להסתמך עליו.',
    },
  },
  {
    ids: ['occupational_therapy'],
    result: {
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      score: undefined,
      threshold: undefined,
      requiredInputs: [
        'haifa_psychometric_month',
        'haifa_ot_failed_selection_attempts',
        'haifa_ot_unjustified_absence',
      ],
      officialUrls: undefined,
      explanation:
        'לבדיקת חיפה חסרים הנתונים הבאים: חודש הפסיכומטרי, ניסיונות מיון בריפוי בעיסוק, היעדרות מריאיון בריפוי בעיסוק.',
    },
  },
];

function savedHaifaAnswer(result: Awaited<ReturnType<typeof gapEvaluate>>['result']) {
  const {
    capability,
    kind,
    decision,
    score,
    threshold,
    requiredInputs,
    officialUrls,
    explanation,
  } = result;
  return {
    capability,
    kind,
    decision,
    score,
    threshold,
    requiredInputs,
    officialUrls,
    explanation,
  };
}

it.each([
  ['static', gapPrograms],
  ['saved_audit', savedGapPrograms],
] as const)(
  'non-psychology saved Haifa results stay unchanged from main across the %s catalogue',
  async (_catalogue, programs) => {
    const { saved } = haifaAverageApplicants();
    for (const program of programsFor('haifa', programs)) {
      if (['psychology', 'haifa_psychology'].includes(program.id)) continue;
      const baseline = mainSavedHaifaAnswers.find((row) => row.ids.includes(program.id));
      expect(baseline, program.id).toBeDefined();
      const { result } = await gapEvaluate(program, 'haifa', saved);
      expect(savedHaifaAnswer(result), program.id).toStrictEqual(baseline!.result);
    }
  },
);

it.each(['haifa_communication', 'communication'])(
  'saved %s keeps its live exact score and uses student terminology',
  async (id) => {
    const { saved } = haifaAverageApplicants();
    const program = savedGapPrograms.find((program) => program.id === id)!;
    const { result, fetcher } = await gapEvaluate(program, 'haifa', saved);
    expect(result).toMatchObject({
      capability: 'exact',
      kind: 'exact',
      decision: 'below',
      score: 493,
      threshold: 550,
      explanation:
        'לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ציון הקבלה נמוך מסף ההמתנה 500 במסלול הרגיל. ניתן לבדוק אפיקים אחרים בעמוד החוג..',
    });
    expect(fetcher).toHaveBeenCalled();
    expect(result.explanation).not.toMatch(/מתואם|סכם|מצרף/);
  },
);

it.each([
  ['saved', 'single_major'],
  ['proxy', 'single_major'],
  ['proxy', undefined],
] as const)('Haifa infosystems stays blocked for %s average with track %s', async (path, track) => {
  const applicants = haifaAverageApplicants(track);
  const program = gapPrograms.find((program) => program.id === 'haifa_infosystems')!;
  const { result } = await gapEvaluate(program, 'haifa', applicants[path]);
  expect(result).toMatchObject({
    capability: 'blocked',
    kind: 'tracked_missing_rule',
    sourceLabel: 'מיפוי המסלול טרם אומת',
    officialUrls: ['https://admissions.haifa.ac.il/computer-information-science/program/3218/'],
  });
});

it('saved Haifa infosystems without a track still asks for the track', async () => {
  const { saved } = haifaAverageApplicants();
  const program = gapPrograms.find((program) => program.id === 'haifa_infosystems')!;
  const { result } = await gapEvaluate(program, 'haifa', saved);
  expect(result).toMatchObject({
    capability: 'needs_input',
    kind: 'needs_input',
    requiredInputs: ['haifa_information_systems_track'],
  });
});

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
