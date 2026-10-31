import type { BagrutSubjectRecordV2 } from '@/types';

// Synthetic certificates replayed in the institutions' calculators on 2026-10-31.
// Expected results are captures, not outputs derived from our implementation.
// Reproduction details: docs/admissions-verification/2026-10-31-medicine-academic-source-notes.md.
function certificate(entries: Array<[string, number, number]>): BagrutSubjectRecordV2 {
  return {
    schemaVersion: 2,
    sector: 'jewish',
    certificateType: 'internal',
    complete: true,
    subjects: entries.map(([subjectId, units, grade]) => ({
      subjectId,
      units,
      grade,
      assessmentKind: 'exam',
    })),
  };
}

export const MEDICINE_ACADEMIC_REFERENCE_CASES = {
  tau: {
    cycle: '2026-2027',
    averageUrl: 'https://ims.tau.ac.il/Md/calc/Bagrut.aspx',
    scoreUrl: 'https://go.tau.ac.il/he/calculator',
    record: certificate([
      ['civics', 2, 100],
      ['english', 5, 100],
      ['mathematics', 5, 100],
      ['history', 2, 100],
      ['hebrew_expression', 2, 100],
      ['literature', 2, 100],
      ['bible', 2, 100],
      ['physics', 5, 100],
      ['chemistry', 5, 100],
    ]),
    uncappedAverage: 121.15384615384616,
    average: 117,
    psychometric: 750,
    score: 750.23,
    threshold: 726.44,
  },
  bgu: {
    cycle: '2026-2027',
    averageUrl: 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=1',
    scoreUrl: 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem',
    record: certificate([
      ['english', 5, 90],
      ['mathematics', 5, 90],
      ['history', 2, 90],
      ['hebrew_expression', 2, 90],
      ['civics', 2, 90],
      ['physics', 5, 90],
      ['chemistry', 5, 90],
    ]),
    average: 111.15,
    psychometric: 750,
    score: 791,
    threshold: 735,
    boundaries: [
      { average: 120, psychometric: 679, score: 799, meetsPsychometricFloor: false },
      { average: 120, psychometric: 680, score: 800, meetsPsychometricFloor: true },
    ],
  },
  huji: {
    cycle: '2026-2027',
    averageUrl: 'https://bagrut-calculator.huji.ac.il/calculator/',
    scoreUrl: 'https://www.huji.ac.il/documents/medicine_calc.htm',
    record: certificate([
      ['bible', 2, 90],
      ['literature', 2, 90],
      ['hebrew_expression', 2, 90],
      ['english', 5, 90],
      ['history', 2, 90],
      ['civics', 2, 90],
      ['mathematics', 5, 90],
    ]),
    average: 105,
    psychometric: 750,
    score: 24.366,
    threshold: 25.186,
    threeUnitBibleAverage: 104.3,
    mathematics91Average: 105.3,
  },
} as const;
