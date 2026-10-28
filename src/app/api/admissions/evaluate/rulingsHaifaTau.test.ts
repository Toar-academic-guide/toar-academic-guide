import { expect, it, vi } from 'vitest';
import captures from '../../../../../docs/admissions-verification/evidence/2026-10-29-bugs-first-official.json';
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
        result.explanation !== 'עדיין לא מחשבים את הסכם של חיפה כאן' ||
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
