export type { Program } from './types';
export { ACADEMIC_PROGRAMS } from './academic';
export { academicPrograms } from './academicPrograms';
export { vocationalPrograms } from './vocationalPrograms';

import { ACADEMIC_PROGRAMS } from './academic';
import { academicPrograms } from './academicPrograms';
import { vocationalPrograms } from './vocationalPrograms';
import { mondayAdmissionsEvidence } from '../admissions/mondayEvidence';
import { type InstitutionId, resolveUrl } from '../institutions';
import type { Program, AdmissionFact } from './types';

const DYNAMIC_PROGRAM_MAP = [
  {
    keywords: [
      /מדעי המחשב|תוכנה|סייבר|coding|code|web|תוכניתן|פיתוח|דאטה|חומרה|הייטק|סיסטם|cyber/i,
    ],
    id: 'cs',
    name: 'מדעי המחשב',
    category: 'מדעי המחשב',
  },
  { keywords: [/הנדסת חשמל/i], id: 'ee', name: 'הנדסת חשמל', category: 'הנדסה' },
  { keywords: [/פסיכולוגיה/i], id: 'psychology', name: 'פסיכולוגיה', category: 'פסיכולוגיה' },
  { keywords: [/הנדסת מכונות/i], id: 'me', name: 'הנדסת מכונות', category: 'הנדסה' },
  {
    keywords: [/רפואה|סיעוד|קלינאות|ריפוי|פיזיותרפיה/i],
    id: 'medicine',
    name: 'רפואה ומקצועות הבריאות',
    category: 'רפואה',
  },
  { keywords: [/משפטים|חוק/i], id: 'law', name: 'משפטים', category: 'משפטים' },
  {
    keywords: [/מנהל עסקים|עסקים|ניהול|חשבונאות|רואה חשבון/i],
    id: 'business',
    name: 'מנהל עסקים',
    category: 'מנהל עסקים',
  },
  { keywords: [/כלכלה/i], id: 'economics', name: 'כלכלה', category: 'כלכלה' },
  {
    keywords: [/עיצוב|אמנות|תקשורת חזותית|משחק|קולנוע|מוסיקה|מוזיקה|מחול|תיאטרון|צילום/i],
    id: 'graphic_design',
    name: 'עיצוב ואומנויות',
    category: 'עיצוב',
  },
];

const dynamicPrograms: Program[] = [];

for (const record of mondayAdmissionsEvidence) {
  const instId = (record.catalogueInstitutionId || `mon_${record.itemId}`) as InstitutionId;

  let matches = DYNAMIC_PROGRAM_MAP.filter((prog) => {
    const searchable =
      `${record.itemName} ${record.displayName} ${record.tags.join(' ')} ${record.decisionReason}`.toLowerCase();
    return prog.keywords.some((keyword) => keyword.test(searchable));
  });

  if (matches.length === 0) {
    matches = [{ keywords: [], id: 'cs', name: 'מדעי המחשב', category: 'מדעי המחשב' }];
  }

  for (const prog of matches) {
    const progId = `${instId}_${prog.id}`;

    const existsInStatic =
      ACADEMIC_PROGRAMS.some((p) => p.id === progId) ||
      academicPrograms.some((p) => p.id === progId) ||
      vocationalPrograms.some((p) => p.id === progId);

    if (existsInStatic) {
      continue;
    }

    const type =
      record.diplomaType === 'תעודה מקצועית' || (record.diplomaType as string) === 'לימודי תעודה'
        ? 'certificate'
        : 'academic';

    const admissionFacts: AdmissionFact[] = [];
    const detailId = `${progId}:${instId}`;

    if (record.publicBucket === 'open_admission') {
      admissionFacts.push({
        id: `${detailId}:fact:open-admission`,
        kind: 'open_admission',
        field: 'open_admission',
        comparison: 'eq',
        valueNumber: null,
        valueText: 'קבלה פתוחה',
        unit: 'boolean',
        description: 'קבלה פתוחה ללא תנאי סף פסיכומטרי או בגרות',
        confidence: 'high',
        isRequired: false,
      });
    }

    if (record.noBagrutNeeded) {
      admissionFacts.push({
        id: `${detailId}:fact:no-bagrut`,
        kind: 'explicit_absence',
        field: 'bagrut_average',
        comparison: 'not_required',
        valueNumber: null,
        valueText: 'אין צורך בבגרות',
        unit: 'boolean',
        description: 'אין דרישת זכאות לתעודת בגרות או ממוצע מינימלי',
        confidence: 'high',
        isRequired: false,
      });
    }

    if (record.noPsychometricNeeded) {
      admissionFacts.push({
        id: `${detailId}:fact:no-psychometric`,
        kind: 'explicit_absence',
        field: 'psychometric',
        comparison: 'not_required',
        valueNumber: null,
        valueText: 'אין צורך בפסיכומטרי',
        unit: 'boolean',
        description: 'אין דרישה לבחינה פסיכומטרית',
        confidence: 'high',
        isRequired: false,
      });
    }

    if (record.interviewNeeded) {
      admissionFacts.push({
        id: `${detailId}:fact:interview`,
        kind: 'manual_gate',
        field: 'interview',
        comparison: 'eq',
        valueNumber: null,
        valueText: 'ראיון קבלה',
        unit: 'boolean',
        description: 'ראיון קבלה אישי בפני ועדה',
        confidence: 'high',
        isRequired: true,
      });
    }

    if (record.portfolioNeeded) {
      admissionFacts.push({
        id: `${detailId}:fact:portfolio`,
        kind: 'manual_gate',
        field: 'portfolio',
        comparison: 'eq',
        valueNumber: null,
        valueText: 'תיק עבודות',
        unit: 'boolean',
        description: 'הגשת תיק עבודות יצירתי',
        confidence: 'high',
        isRequired: true,
      });
    }

    dynamicPrograms.push({
      id: progId,
      name: `${prog.name} - ${record.displayName}`,
      institution: record.displayName,
      institutionId: instId,
      type,
      category: prog.category,
      profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
      admissionType:
        record.publicBucket === 'open_admission' ? ('open_admission' as any) : 'requirements',
      admissionRequirements: [],
      thresholds: {},
      institutionDetails: [
        {
          institutionName: record.displayName,
          durationYears: record.diplomaType?.includes('שנה') ? 1 : 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: record.limitations ? [...record.limitations] : [],
          officialCalculatorUrl: resolveUrl(record.displayName, record.officialUrls) || '',
          programUrl: resolveUrl(record.displayName, record.officialUrls),
          calculatorUrl: record.officialUrls.find(
            (url) => url.includes('calculator') && !url.includes('yoram.walla.co.il'),
          ),
          programDescription: record.decisionReason || undefined,
          admissionFacts,
        },
      ],
    });
  }
}

// Single combined catalogue.
// Add future sub-modules by spreading their arrays here.
export const allPrograms = [
  ...ACADEMIC_PROGRAMS,
  ...academicPrograms,
  ...vocationalPrograms,
  ...dynamicPrograms,
];
