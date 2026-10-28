import { describe, expect, it, vi } from 'vitest';
import { overallBagrutAverage } from '@/lib/bagrutSubjectRecord';
import {
  gapApplicant,
  gapEvaluate,
  gapPrograms,
  programsFor,
  savedGapPrograms,
} from './sekhemCalculatorGap.fixture';

vi.mock('server-only', () => ({}));

const program = (id: string) => gapPrograms.find((row) => row.id === id)!;
const haifaContinuation = {
  haifaBagrutAverage: 102,
  haifaBagrutYear: 2020,
  haifaPsychometricYear: 2025,
  haifaHebrewQualification: 'hebrew_school' as const,
};

describe('#320 request-shape compatibility at 12fd33f', () => {
  it('sends a complete Hebrew-expression certificate and sections without a top-level average', () => {
    const applicant = gapApplicant();
    expect(Object.keys(applicant).sort()).toEqual(['extraInputs', 'psychometric']);
    expect(applicant).toMatchObject({
      psychometric: 590,
      extraInputs: {
        mathUnits: 5,
        mathGrade: 90,
        englishUnits: 5,
        englishGrade: 85,
        physicsUnits: 5,
        physicsGrade: 90,
        psychometricMath: 115,
        psychometricVerbal: 110,
        psychometricEnglish: 120,
        bagrutSubjectRecord: {
          schemaVersion: 2,
          sector: 'jewish',
          certificateType: 'other',
          complete: true,
        },
      },
    });
    expect(overallBagrutAverage(applicant.extraInputs.bagrutSubjectRecord)).toBe(88.1); // Generic helper rounds 88.12 to one decimal.
    expect(
      applicant.extraInputs.bagrutSubjectRecord?.subjects.map((row) => row.subjectId).sort(),
    ).toEqual([
      'bible',
      'civics',
      'english',
      'hebrew_expression',
      'history',
      'literature',
      'mathematics',
      'physics',
    ]);
    for (const key of [
      'haifaBagrutAverage',
      'haifaBagrutYear',
      'haifaPsychometricYear',
      'haifaHebrewQualification',
    ])
      expect(applicant.extraInputs).not.toHaveProperty(key);
  });

  it.each([
    'technion_cs',
    'technion_datascience',
    'technion_ee',
    'technion_me',
    'technion_civil',
    'technion_industrial',
    'technion_biomedical',
    'technion_medicine',
  ])('%s returns the official transport score for the full #320 persona', async (id) => {
    const { result, fetcher } = await gapEvaluate(program(id), 'technion');
    // 84.4 is an official-response mock sentinel, never a live claim for 88.12/590.
    expect(result).toMatchObject({ kind: 'exact', score: 84.4 });
    if (id === 'technion_medicine')
      expect(result).toMatchObject({
        capability: 'score_only',
        decision: 'unknown',
        threshold: undefined,
      });
    const submit = fetcher.mock.calls.find(([url]) =>
      String(url).includes('technion-calculators-sum.php'),
    )!;
    expect(submit).toBeDefined();
    expect(Object.fromEntries(new URLSearchParams(String(submit[1]?.body)))).toMatchObject({
      psychometry: '590',
      yHabaa: '2',
      habaa: '88',
      yHebrew: '0',
      hebrew: '',
      yMathematic: '5',
      mathematic: '90',
      yEnglish: '5',
      english: '85',
    });
  });

  it('does not mistake complete:true on four sample rows for the missing compulsory subjects', async () => {
    const applicant = gapApplicant({}, false);
    expect(applicant.extraInputs.bagrutSubjectRecord).toMatchObject({ complete: true });
    const { result, fetcher } = await gapEvaluate(program('technion_cs'), 'technion', applicant);
    expect(result).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bagrut_subject_record'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('retains the Architecture exam and architecture-average inputs instead of making up a score', async () => {
    const { result, fetcher } = await gapEvaluate(program('architecture'), 'technion');
    expect(result).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['technion_architecture_bagrut_average', 'technion_architecture_exam_score'],
    });
    expect(result.score).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['static', gapPrograms, 20],
    ['saved audit', savedGapPrograms, 27],
  ] as const)(
    'enumerates every %s Haifa pair and returns the honest note without a composite ask',
    async (_label, rows, count) => {
      const haifa = programsFor('haifa', rows);
      expect(haifa).toHaveLength(count);
      for (const row of haifa) {
        const { result, fetcher } = await gapEvaluate(row, 'haifa');
        expect(result.score, row.id).toBeUndefined();
        if (['psychology', 'haifa_psychology'].includes(row.id))
          expect(result.kind, row.id).toBe('authority_unavailable');
        else {
          // Approved test update, Jorje 2026-10-28
          expect(result.kind, row.id).toBe('tracked_missing_rule');
        }
        // Approved test update, Jorje 2026-10-29
        expect(result.explanation, row.id).toBe('עדיין לא מחשבים כאן את ציון הקבלה של חיפה');
        // Approved test update, Jorje 2026-10-28
        expect(result.requiredInputs, row.id).toBeUndefined();
        expect(fetcher, row.id).not.toHaveBeenCalled();
      }
    },
  );

  it('preserves explicit Haifa averages while returning the honest note when they are absent', async () => {
    const first = await gapEvaluate(program('haifa_cs'), 'haifa');
    const second = await gapEvaluate(
      program('haifa_cs'),
      'haifa',
      gapApplicant({ haifaBagrutAverage: 102 }),
    );
    const third = await gapEvaluate(
      program('haifa_cs'),
      'haifa',
      gapApplicant({ haifaHebrewQualification: 'hebrew_school' }),
    );
    // Approved test update, Jorje 2026-10-28
    expect(first.result.requiredInputs).toBeUndefined();
    expect(first.result).toMatchObject({
      kind: 'tracked_missing_rule',
      // Approved test update, Jorje 2026-10-29
      explanation: 'עדיין לא מחשבים כאן את ציון הקבלה של חיפה',
    });
    expect(second.result.requiredInputs).toEqual(['haifa_hebrew_qualification']);
    // Approved test update, Jorje 2026-10-28
    expect(third.result.requiredInputs).toBeUndefined();
    expect(third.result).toMatchObject({
      kind: 'tracked_missing_rule',
      // Approved test update, Jorje 2026-10-29
      explanation: 'עדיין לא מחשבים כאן את ציון הקבלה של חיפה',
    });
    for (const { fetcher } of [first, second, third]) expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends explicit actual exam years and section scores to Haifa once its ordinary inputs are complete', async () => {
    const { result, fetcher } = await gapEvaluate(
      program('haifa_cs'),
      'haifa',
      gapApplicant(haifaContinuation),
    );
    expect(result).toMatchObject({ kind: 'exact', score: 493 });
    const request = fetcher.mock.calls.find(([url]) =>
      String(url).includes('operation=calculateChances'),
    )!;
    expect(request).toBeDefined();
    expect(Object.fromEntries(new URL(String(request[0])).searchParams)).toMatchObject({
      bag_avg: '102',
      bag_year: '2020',
      psy_year: '2025',
      psy_math: '115',
      psy_verbal: '110',
      psy_english: '120',
    });
  });

  it('requests the actual psychometric month when the supplied year reaches a programme deadline', async () => {
    const { result, fetcher } = await gapEvaluate(
      program('haifa_law'),
      'haifa',
      gapApplicant({
        ...haifaContinuation,
        haifaPsychometricYear: 2026,
      }),
    );
    expect(result).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['haifa_psychometric_month'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not infer nursing science-unit qualification from a certificate completeness flag', async () => {
    const { result, fetcher } = await gapEvaluate(
      program('haifa_nursing'),
      'haifa',
      gapApplicant(haifaContinuation),
    );
    expect(result).toMatchObject({ kind: 'needs_input', requiredInputs: ['haifa_science_units'] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requests OT selection history from the saved catalogue pair rather than inventing it', async () => {
    const row = savedGapPrograms.find((p) => p.id === 'occupational_therapy')!;
    const { result, fetcher } = await gapEvaluate(row, 'haifa', gapApplicant(haifaContinuation));
    expect(result).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['haifa_ot_failed_selection_attempts', 'haifa_ot_unjustified_absence'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
