import type { InstitutionDetail, Program } from './types';

export const JAMD_REGULATIONS_URL =
  'https://jamd.ac.il/sites/default/files/2026-03/תקנון%20אקדמי%20-%20יוני%202025.pdf';

// 5787 departmental graduation tables, checked 24.10.2026. Null totals are
// unverified; the broad classical row must not inherit a department's 160.
const classicalDepartments: NonNullable<InstitutionDetail['departmentCredits']> = [
  {
    id: 'keyboard',
    name: 'כלי מקלדת',
    creditPoints: 160,
    sourceUrl: 'https://jamd.ac.il/keyboard_department',
  },
  {
    id: 'wind_percussion',
    name: 'כלי נשיפה והקשה',
    creditPoints: 160,
    sourceUrl: 'https://jamd.ac.il/wind_division',
  },
  {
    id: 'vocal',
    name: 'שירה',
    creditPoints: 160,
    sourceUrl: 'https://jamd.ac.il/vocal_department',
  },
  {
    id: 'composition',
    name: 'קומפוזיציה רב־תחומית',
    creditPoints: 160,
    sourceUrl: 'https://jamd.ac.il/cd_composition',
  },
  {
    id: 'strings',
    name: 'כלי קשת',
    creditPoints: null,
    sourceUrl: 'https://jamd.ac.il/strings_division',
  },
  {
    id: 'theory',
    name: 'תורת המוזיקה',
    creditPoints: null,
    sourceUrl: 'https://jamd.ac.il/music_theory_department',
  },
  {
    id: 'eastern_music',
    name: 'מוזיקה מזרחית',
    creditPoints: null,
    sourceUrl: 'https://jamd.ac.il/oriental',
  },
  {
    id: 'cross_disciplinary_performance',
    name: 'ביצוע רב־תחומי',
    creditPoints: null,
    sourceUrl: 'https://jamd.ac.il/cross_disciplinary_performance_instrumental',
  },
];

const curricula: Record<
  string,
  Pick<InstitutionDetail, 'programDescription' | 'departmentCredits'>
> = {
  jerusalem_academy_classical: {
    programDescription:
      'לימודי B.Mus. נמשכים ארבע שנים. במחלקות כלי מקלדת, כלי נשיפה והקשה, שירה וקומפוזיציה רב־תחומית היקף התואר הוא 160 נקודות זכות.',
    departmentCredits: classicalDepartments,
  },
  jerusalem_academy_jazz: {
    programDescription: 'לימודי B.Mus. בג׳אז נמשכים ארבע שנים.',
    departmentCredits: [
      {
        id: 'jazz',
        name: 'ג׳אז',
        creditPoints: null,
        sourceUrl: 'https://jamd.ac.il/jazz_department',
      },
    ],
  },
  jerusalem_academy_dance: {
    programDescription: 'הלימודים לתואר B.Dance נמשכים ארבע שנים. הסטאז׳ מתקיים בשנה החמישית.',
  },
};

/** Verified curriculum only; admission conditions and numeric gates are unchanged. */
export function applyJamdCurriculum<T extends Program>(program: T): T {
  const curriculum = curricula[program.id];
  if (!curriculum) return program;
  return {
    ...program,
    awardedCredential: program.id === 'jerusalem_academy_dance' ? 'B.Dance' : 'B.Mus.',
    institutionDetails: program.institutionDetails?.map((detail) => ({
      ...detail,
      ...curriculum,
      durationYears: 4,
      creditPoints: null,
      curriculumSourceUrl: JAMD_REGULATIONS_URL,
      curriculumCheckedAt: '2026-10-24',
    })),
  };
}
