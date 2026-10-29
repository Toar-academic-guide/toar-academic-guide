import { describe, expect, it, vi } from 'vitest';
import vectors from '../../../docs/admissions-verification/evidence/2026-10-29-haifa-formula/test_vectors.json';
import {
  calculateHaifaAdmissionScore,
  calculateHaifaBagrutAverage,
  calculateHaifaBagrutAverageFromCourses,
  type HaifaCourse,
} from './haifaAdmissionFormula';
import {
  gapApplicant,
  gapEvaluate,
  gapPrograms,
} from '@/app/api/admissions/evaluate/sekhemCalculatorGap.fixture';

vi.mock('server-only', () => ({}));

describe('Haifa official calculator formula replay, 2026-10-29', () => {
  const matched = vectors.composite_vectors.filter((row) => row.match === true);
  it('contains all 130 independently matched composite observations', () => {
    expect(matched).toHaveLength(130);
  });
  it.each(matched)('$source', (row) => {
    const input = row.inputs!;
    expect(
      calculateHaifaAdmissionScore({
        programme: row.programme!,
        bagrutAverage: Number(input.bag_avg),
        bagrutYear: Number(input.bag_year),
        psychometricYear: Number(input.psy_year),
        psychometric: input.pc_used!,
        quantitative: input.Q,
        verbal: input.V,
        english: input.E,
      }),
    ).toMatchObject({ kind: 'calculated', score: row.haifa.weighted });
  });
  it.each(vectors.bagrut_average_vectors)('$label average matches calculateBagrutAvg', (row) => {
    const courses = row.subjects.map(([code, units, grade]) => ({
      code: String(code),
      units: Number(units),
      grade: Number(grade),
    }));
    expect(calculateHaifaBagrutAverageFromCourses(courses)).toBe(Number(row.haifa));
  });
  it('keeps the error-242 expired psychometric case non-exact', () => {
    const request = vectors.composite_vectors.find((row) => row.match === null)!.request!;
    expect(
      calculateHaifaAdmissionScore({
        programme: 'psychology',
        bagrutAverage: Number(request.bag_avg),
        bagrutYear: Number(request.bag_year),
        psychometricYear: Number(request.psy_year),
        psychometric: 699,
      }),
    ).toEqual({ kind: 'expired_psychometric' });
  });
  it('does not round the supplied average before BT', () => {
    expect(
      calculateHaifaAdmissionScore({
        programme: 'psychology',
        bagrutAverage: 100.05,
        bagrutYear: 2026,
        psychometricYear: 2026,
        psychometric: 501,
      }),
    ).toMatchObject({ score: 543 });
  });
  it('maps the complete gap certificate and never substitutes a generic average', () => {
    expect(calculateHaifaBagrutAverage(gapApplicant().extraInputs.bagrutSubjectRecord)).toBe(
      105.12,
    );
    expect(calculateHaifaBagrutAverage(undefined)).toBeUndefined();
  });
  it('rejects unknown subject IDs instead of silently omitting them', () => {
    const record = gapApplicant().extraInputs.bagrutSubjectRecord!;
    if (record.schemaVersion !== 2) throw new Error('Expected the v2 gap certificate fixture');
    expect(
      calculateHaifaBagrutAverage({
        ...record,
        subjects: [
          ...record.subjects,
          { subjectId: 'unmapped_subject', grade: 90, units: 5, assessmentKind: 'exam' },
        ],
      }),
    ).toBeUndefined();
  });
  it('keeps every mandatory subject and at least 20 units', () => {
    const rows: HaifaCourse[] = [
      { code: '35', units: 5, grade: 90 },
      { code: '16', units: 5, grade: 85 },
    ];
    expect(calculateHaifaBagrutAverageFromCourses(rows)).toBeUndefined();
  });
});

describe('Haifa local evaluator input and mapping boundaries', () => {
  const program = (id: string) => gapPrograms.find((row) => row.id === id)!;
  it('keeps a generic average without subjects non-exact', async () => {
    const proxy = { ...gapApplicant({ bagrutSubjectRecord: undefined }), bagrut: 104 };
    const { result, fetcher } = await gapEvaluate(program('haifa_cs'), 'haifa', proxy);
    expect(result).toMatchObject({ kind: 'tracked_missing_rule', decision: 'unknown' });
    expect(result.score).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps unresolved single-major IS blocked with derivable subjects', async () => {
    const { result } = await gapEvaluate(
      program('haifa_infosystems'),
      'haifa',
      gapApplicant({
        haifaInformationSystemsTrack: 'single_major',
      }),
    );
    expect(result).toMatchObject({ capability: 'blocked', sourceLabel: 'מיפוי המסלול טרם אומת' });
  });
  it('uses NITE total for a general programme without demanding Q/V/E', async () => {
    const { result, fetcher } = await gapEvaluate(program('haifa_psychology'), 'haifa', {
      psychometric: 699,
      extraInputs: {
        haifaBagrutAverage: 103.5,
        haifaBagrutYear: 2025,
        haifaPsychometricYear: 2026,
        haifaPsychometricMonth: 4,
        haifaEnglishLevel: 'advanced_a',
        haifaHebrewQualification: 'hebrew_school',
      },
    });
    expect(result.requiredInputs).toBeUndefined();
    expect(result).toMatchObject({ capability: 'exact', score: 701, threshold: 650 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('asks for the missing PM components on maths programmes', async () => {
    const { result, fetcher } = await gapEvaluate(
      program('haifa_cs'),
      'haifa',
      gapApplicant({
        haifaBagrutAverage: 103.5,
        psychometricMath: undefined,
        psychometricVerbal: undefined,
      }),
    );
    expect(result).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['psychometric_math', 'psychometric_verbal'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps an expired psychometric non-exact even when all other inputs suffice', async () => {
    const { result, fetcher } = await gapEvaluate(
      program('haifa_cs'),
      'haifa',
      gapApplicant({
        haifaBagrutAverage: 103.5,
        haifaPsychometricYear: 2012,
        haifaHebrewQualification: 'hebrew_school',
      }),
    );
    expect(result).toMatchObject({ kind: 'tracked_missing_rule', decision: 'unknown' });
    expect(result.score).toBeUndefined();
    expect(result.explanation).toContain('10');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('routes engineering without an average to unsupported', async () => {
    const { result } = await gapEvaluate(program('haifa_engineering'), 'haifa', {
      psychometric: 590,
      extraInputs: {},
    });
    expect(result).toMatchObject({ kind: 'unsupported', decision: 'unknown' });
    expect(result.institution.programUrl ?? result.officialUrls?.[0]).toBeTruthy();
  });
});
