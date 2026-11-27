import { INSTITUTION_BY_ID } from '@/data/institutions';
import type { Program } from './types';

// Historical תשפ״ז requirements, re-read 2026-11-27. They are display information,
// not a verified evaluator formula or an assertion about the next intake.
export const dentistrySources = {
  huji: 'https://info.huji.ac.il/bachelor/Dental-Medicine',
  tau: 'https://go.tau.ac.il/he/med/ba/dental?v=important-info',
  tauStages: 'https://go.tau.ac.il/he/med/ba/dental?s=15406&v=specific-info',
} as const;

export const dentistryRows = [
  {
    institutionId: 'huji',
    programId: 'huji_dentistry',
    prerequisites:
      'פסיכומטרי רב־תחומי 640 לפחות ואנגלית 120 לפחות. עברית 105 למי ששפת ההוראה בתיכון אינה עברית; אזרחות ישראלית או תושבות קבע.',
    stages:
      'שלב א׳: שקלול פסיכומטרי והישגים לימודיים; סף המעבר 23.000. אחריו מבחן תפיסה מרחבית; כ־85% בעלי הציונים הגבוהים ממשיכים לראיונות ולשאלון שאו״ל (80% ראיונות, 20% שאלון). הציון הסופי: 75% שלב הראיונות והשאלון, 25% שלב א׳.',
    previousDates: 'תפיסה מרחבית: 12.6.2026. ראיונות ושאלון: 14–16.7.2026.',
  },
  {
    institutionId: 'tau',
    programId: 'tau_dentistry',
    prerequisites:
      'פסיכומטרי 640 לפחות ואנגלית 120 לפחות (או חלופה מוכרת). בגרות או חלופה מוכרת, מתמטיקה 4 יחידות בציון עובר או חלופה מאושרת; עברית 105 לבעלי בגרות שאינה בעברית, עם פטור עד שנה ב׳. אזרחות ישראלית או תושבות קבע.',
    stages:
      'מבחני ידע במתמטיקה ובכימיה או בפיזיקה, ותפיסה מרחבית. נדרש ציון עובר במבחן הידע. 150 בעלי ציוני הידע הגבוהים שבקבוצת 80% העליונים בתפיסה מרחבית מוזמנים להמשך. הציון הסופי: 70% ראיונות, 15% אנימציה ושיפוט מצב, 15% שאלון אישיות. 70 בעלי הציונים הגבוהים מתקבלים.',
    previousDates: 'תפיסה מרחבית: 12.6.2026. מבחן ידע: 19.6.2026.',
  },
] as const;

export const dentistryProgrammes: Program[] = dentistryRows.map((row) => {
  const institution = INSTITUTION_BY_ID[row.institutionId].name;
  return {
    id: row.programId,
    name: 'רפואת שיניים',
    awardedCredential: 'D.M.D.',
    institution,
    institutionId: row.institutionId,
    type: 'academic',
    category: 'רפואת שיניים',
    profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
    admissionType: 'requirements',
    admissionRequirements: [],
    institutionDetails: [
      {
        institutionName: institution,
        durationYears: null,
        estimatedStudentsPerYear: '',
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        specificAdmissionNotes: [
          `תנאי תשפ״ז: ${row.prerequisites}`,
          row.stages,
          `מועדי תשפ״ז: ${row.previousDates}`,
          'מועדי המיון לתשפ״ח: טרם פורסם.',
        ],
        officialCalculatorUrl: '',
        programUrl: dentistrySources[row.institutionId],
        admissionsSourceCandidates: [
          {
            id: `${row.programId}:${row.institutionId}:source:admissions`,
            origin: 'manual',
            specificity: 'program_admissions',
            confidence: 'high',
            url: dentistrySources[row.institutionId],
            notes: 'תשפ״ז; display-only historical requirements. Recheck before publication.',
          },
        ],
        admissionFacts: [],
        admissionAlternativePaths: [],
      },
    ],
  };
});

export function isDentistryProgramme(programId: string): boolean {
  return dentistryRows.some((row) => row.programId === programId);
}

export const dentistryFaq = [
  {
    question: 'איפה לומדים רפואת שיניים בישראל?',
    answer: 'באוניברסיטה העברית בירושלים ובאוניברסיטת תל אביב, לתואר D.M.D.',
  },
  {
    question: 'האם פסיכומטרי 640 מספיק לקבלה?',
    answer:
      'לא. זהו תנאי סף בתנאי תשפ״ז בשני המוסדות; נדרשים גם תנאים נוספים ושלבי מיון, והקבלה נקבעת לפי הדירוג הסופי.',
  },
  {
    question: 'האם פורסמו מועדי המיון לתשפ״ח?',
    answer: 'טרם פורסם. התאריכים בטבלה שייכים לתשפ״ז בלבד ואינם מועדי הרשמה או מיון עתידיים.',
  },
  {
    question: 'האם רפואת שיניים היא אותו מסלול כמו רפואה?',
    answer: 'לא. רפואת שיניים היא מסלול D.M.D. נפרד ממסלולי הרפואה לתואר M.D., עם הליך מיון משלה.',
  },
] as const;
