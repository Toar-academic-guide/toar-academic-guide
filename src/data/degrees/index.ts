export type { Program } from './types';
export { ACADEMIC_PROGRAMS } from './academic';
export { academicPrograms } from './academicPrograms';
export { vocationalPrograms } from './vocationalPrograms';

import { ACADEMIC_PROGRAMS } from './academic';
import { academicPrograms } from './academicPrograms';
import { vocationalPrograms } from './vocationalPrograms';
import {
  mondayAdmissionsEvidence,
  type MondayAdmissionAlternativePath,
  type MondayAdmissionStructuredFact,
} from '../admissions/mondayEvidence';
import { INSTITUTION_BY_NAME, type InstitutionId, resolveUrl } from '../institutions';
import type {
  Program,
  AdmissionAlternativePath,
  AdmissionFact,
  AdmissionsSourceCandidate,
} from './types';

type ProgramInstitutionDetail = NonNullable<Program['institutionDetails']>[number];

const DYNAMIC_PROGRAM_MAP = [
  {
    keywords: [
      /מדעי המחשב|computer science|תוכנה|סייבר|coding|code|web|תוכניתן|פיתוח|דאטה|חומרה|הייטק|סיסטם|cyber|קודינג|bootcamp|בוטקאמפ/i,
    ],
    id: 'cs',
    name: 'מדעי המחשב',
    category: 'מדעי המחשב',
  },
  { keywords: [/הנדסת חשמל/i], id: 'ee', name: 'הנדסת חשמל', category: 'הנדסה' },
  { keywords: [/פסיכולוגיה/i], id: 'psychology', name: 'פסיכולוגיה', category: 'פסיכולוגיה' },
  { keywords: [/הנדסת מכונות/i], id: 'me', name: 'הנדסת מכונות', category: 'הנדסה' },
  {
    keywords: [
      /רפואה|medicine|סיעוד|nursing|קלינאות|ריפוי|פיזיותרפיה|רפואה משלימה|נטורופתיה|רפלקסולוגיה|עיסוי|טיפולי גוף/i,
    ],
    id: 'medicine',
    name: 'רפואה ומקצועות הבריאות',
    category: 'רפואה',
  },
  { keywords: [/משפטים|משפט|law|llb/i], id: 'law', name: 'משפטים', category: 'משפטים' },
  {
    keywords: [/מנהל עסקים|עסקים|ניהול|חשבונאות|רואה חשבון|business|finance|account/i],
    id: 'business',
    name: 'מנהל עסקים',
    category: 'מנהל עסקים',
  },
  { keywords: [/כלכלה|economics/i], id: 'economics', name: 'כלכלה', category: 'כלכלה' },
  {
    keywords: [/חינוך|הוראה|education|teaching|teachers|pedagog|הורות|parent/i],
    id: 'education',
    name: 'חינוך והוראה',
    category: 'חינוך',
  },
  {
    keywords: [/קולינריה|קונדיטוריה|culinary|pastry|chef|בישול|שוקולד/i],
    id: 'culinary',
    name: 'קולינריה',
    category: 'קולינריה',
  },
  {
    keywords: [/איפור|יופי|beauty|makeup|cosmetic/i],
    id: 'beauty',
    name: 'מקצועות היופי',
    category: 'מקצועות היופי',
  },
  {
    keywords: [/הנדסה|engineering|הנדסאים|technological|טכנולוגי|טכנולוגית/i],
    id: 'engineering',
    name: 'הנדסה וטכנולוגיה',
    category: 'הנדסה',
  },
  {
    keywords: [/מכינה|pre-academic|preparatory|mechina/i],
    id: 'prep',
    name: 'מכינה קדם-אקדמית',
    category: 'מכינות',
  },
  {
    keywords: [
      /עיצוב|אמנות|תקשורת חזותית|משחק|קולנוע|מוסיקה|מוזיקה|מחול|תיאטרון|צילום|מיוזיק|music/i,
    ],
    id: 'graphic_design',
    name: 'עיצוב ואומנויות',
    category: 'עיצוב',
  },
];

const dynamicPrograms: Program[] = [];

function mergeDynamicProgramDetails(existingProgram: Program, nextProgram: Program): Program {
  const existingDetails = existingProgram.institutionDetails ?? [];
  const nextDetails = nextProgram.institutionDetails ?? [];
  const mergedDetails = [...existingDetails];

  for (const detail of nextDetails) {
    const alreadyPresent = mergedDetails.some(
      (existingDetail) =>
        existingDetail.institutionName === detail.institutionName &&
        existingDetail.programUrl === detail.programUrl &&
        existingDetail.officialCalculatorUrl === detail.officialCalculatorUrl &&
        existingDetail.programDescription === detail.programDescription,
    );

    if (!alreadyPresent) {
      mergedDetails.push(detail);
    }
  }

  return {
    ...existingProgram,
    admissionRequirements: [
      ...new Set([
        ...(existingProgram.admissionRequirements ?? []),
        ...(nextProgram.admissionRequirements ?? []),
      ]),
    ],
    institutionDetails: mergedDetails,
    thresholds: {
      ...(existingProgram.thresholds ?? {}),
      ...(nextProgram.thresholds ?? {}),
    },
  };
}

function getMondayBaseSearchableText(record: (typeof mondayAdmissionsEvidence)[number]) {
  return `${record.itemName} ${record.displayName} ${record.tags.join(' ')} ${record.officialUrls.join(' ')}`.toLowerCase();
}

function getMondaySearchableText(record: (typeof mondayAdmissionsEvidence)[number]) {
  const baseText = getMondayBaseSearchableText(record);

  if (record.publicBucket === 'decision_capable') {
    return baseText;
  }

  return `${baseText} ${record.decisionReason}`.toLowerCase();
}

function fallbackDynamicProgram(record: (typeof mondayAdmissionsEvidence)[number]) {
  const searchable = getMondayBaseSearchableText(record);
  const isCertificate =
    record.diplomaType === 'תעודה מקצועית' ||
    record.diplomaType === 'לימודי תעודה' ||
    record.tags.includes('professional_certificate');

  if (/מכינה|pre-academic|preparatory|mechina/i.test(searchable)) {
    return { id: 'prep', name: 'מכינה קדם-אקדמית', category: 'מכינות' };
  }

  if (/חינוך|הוראה|education|teaching|teachers|pedagog/i.test(searchable)) {
    return { id: 'education', name: 'חינוך והוראה', category: 'חינוך' };
  }

  if (/קולינריה|קונדיטוריה|culinary|pastry|chef|בישול|שוקולד/i.test(searchable)) {
    return { id: 'culinary', name: 'קולינריה', category: 'קולינריה' };
  }

  if (
    /רפואה|medicine|סיעוד|nursing|קלינאות|ריפוי|פיזיותרפיה|רפואה משלימה|נטורופתיה|רפלקסולוגיה|עיסוי|טיפולי גוף/i.test(
      searchable,
    )
  ) {
    return { id: 'medicine', name: 'רפואה ומקצועות הבריאות', category: 'רפואה' };
  }

  if (/איפור|יופי|beauty|makeup|cosmetic/i.test(searchable)) {
    return { id: 'beauty', name: 'מקצועות היופי', category: 'מקצועות היופי' };
  }

  if (/עיצוב|אמנות|משחק|קולנוע|מוסיקה|מוזיקה|מחול|תיאטרון|צילום|arts|design/i.test(searchable)) {
    return { id: 'graphic_design', name: 'עיצוב ואומנויות', category: 'עיצוב' };
  }

  if (/הנדסה|engineering|הנדסאים|technological|טכנולוגי|טכנולוגית/i.test(searchable)) {
    return { id: 'engineering', name: 'הנדסה וטכנולוגיה', category: 'הנדסה' };
  }

  if (isCertificate) {
    return { id: 'certificate', name: 'לימודי תעודה מקצועיים', category: 'לימודי תעודה' };
  }

  return { id: 'general_academic', name: 'לימודים אקדמיים', category: 'לימודים אקדמיים' };
}

function buildStructuredAdmissionFacts(args: {
  detailId: string;
  sourceCandidateId: string | undefined;
  facts: readonly MondayAdmissionStructuredFact[] | undefined;
}) {
  const { detailId, sourceCandidateId, facts } = args;

  return (facts ?? []).map<AdmissionFact>((fact, index) => ({
    id: fact.groupKey
      ? `${detailId}:fact:group:${encodeURIComponent(fact.groupKey)}:structured-${index}`
      : `${detailId}:fact:structured-${index}`,
    ...(sourceCandidateId ? { sourceCandidateId } : {}),
    kind: fact.kind,
    field: fact.field,
    comparison: fact.comparison,
    valueNumber: fact.valueNumber,
    valueText: fact.valueText,
    unit: fact.unit,
    description: fact.description,
    confidence: fact.confidence,
    isRequired: fact.isRequired,
    ...(fact.groupKey ? { groupKey: fact.groupKey } : {}),
  }));
}

function buildStructuredAlternativePaths(args: {
  detailId: string;
  sourceCandidateId: string | undefined;
  paths: readonly MondayAdmissionAlternativePath[] | undefined;
}) {
  const { detailId, sourceCandidateId, paths } = args;

  return (paths ?? []).map<AdmissionAlternativePath>((path, index) => ({
    id: `${detailId}:path:structured-${index}`,
    ...(sourceCandidateId ? { sourceCandidateId } : {}),
    kind: path.kind,
    title: path.title,
    description: path.description,
    ...(path.url ? { url: path.url } : {}),
    priority: path.priority,
  }));
}

function createLegacyFact(args: {
  programId: string;
  detailIndex: number;
  factIndex: number;
  kind: AdmissionFact['kind'];
  field: AdmissionFact['field'];
  comparison: AdmissionFact['comparison'];
  valueNumber: number | null;
  valueText: string | null;
  unit: AdmissionFact['unit'];
  description: string;
  isRequired: boolean;
  groupKey?: string;
}): AdmissionFact {
  const {
    programId,
    detailIndex,
    factIndex,
    kind,
    field,
    comparison,
    valueNumber,
    valueText,
    unit,
    description,
    isRequired,
    groupKey,
  } = args;

  return {
    id: `${programId}:detail-${detailIndex}:legacy-fact-${factIndex}`,
    kind,
    field,
    comparison,
    valueNumber,
    valueText,
    unit,
    description,
    confidence: 'high',
    isRequired,
    ...(groupKey ? { groupKey } : {}),
  };
}

function createLegacyAlternativePath(args: {
  programId: string;
  detailIndex: number;
  pathIndex: number;
  kind: AdmissionAlternativePath['kind'];
  title: string;
  description: string;
}): AdmissionAlternativePath {
  const { programId, detailIndex, pathIndex, kind, title, description } = args;

  return {
    id: `${programId}:detail-${detailIndex}:legacy-path-${pathIndex}`,
    kind,
    title,
    description,
    priority: pathIndex + 1,
  };
}

function uniqueBy<T>(items: readonly T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function buildLegacyStructuredFacts(args: {
  program: Program;
  detail: ProgramInstitutionDetail;
  detailIndex: number;
}) {
  const { program, detail, detailIndex } = args;
  const texts = uniqueBy(
    [...(detail.specificAdmissionNotes ?? []), ...(program.admissionRequirements ?? [])]
      .map((value) => value.trim())
      .filter(Boolean),
    (value) => value,
  );

  const facts: AdmissionFact[] = [];
  let factIndex = 0;
  const pushFact = (fact: Omit<AdmissionFact, 'id' | 'confidence'>) => {
    facts.push(
      createLegacyFact({
        programId: program.id,
        detailIndex,
        factIndex,
        kind: fact.kind,
        field: fact.field,
        comparison: fact.comparison,
        valueNumber: fact.valueNumber,
        valueText: fact.valueText,
        unit: fact.unit,
        description: fact.description,
        isRequired: fact.isRequired,
        ...(fact.groupKey ? { groupKey: fact.groupKey } : {}),
      }),
    );
    factIndex += 1;
  };

  for (const text of texts) {
    const normalizedText = text.replace(/\s+/gu, ' ').trim();

    if (/קבלה פתוחה/u.test(normalizedText)) {
      pushFact({
        kind: 'open_admission',
        field: 'open_admission',
        comparison: 'eq',
        valueNumber: null,
        valueText: 'קבלה פתוחה',
        unit: 'boolean',
        description: normalizedText,
        isRequired: false,
      });
    }

    if (/אין סף פסיכומטרי/u.test(normalizedText)) {
      pushFact({
        kind: 'explicit_absence',
        field: 'psychometric',
        comparison: 'not_required',
        valueNumber: null,
        valueText: 'אין סף פסיכומטרי',
        unit: 'boolean',
        description: normalizedText,
        isRequired: false,
      });
    }

    if (/אין סף .*בגרות/u.test(normalizedText)) {
      pushFact({
        kind: 'explicit_absence',
        field: 'bagrut_average',
        comparison: 'not_required',
        valueNumber: null,
        valueText: 'אין סף בגרות',
        unit: 'boolean',
        description: normalizedText,
        isRequired: false,
      });
    }

    if (
      /5 יח"ל מתמטיקה(?: ו|-)?5 יח"ל פיזיקה/iu.test(normalizedText) ||
      /5 יח"ל מתמטיקה ופיזיקה/iu.test(normalizedText)
    ) {
      pushFact({
        kind: 'numeric_gate',
        field: 'math_units',
        comparison: 'gte',
        valueNumber: 5,
        valueText: null,
        unit: 'units',
        description: 'מתמטיקה ברמת 5 יח"ל',
        isRequired: true,
      });
      pushFact({
        kind: 'numeric_gate',
        field: 'physics_units',
        comparison: 'gte',
        valueNumber: 5,
        valueText: null,
        unit: 'units',
        description: 'פיזיקה ברמת 5 יח"ל',
        isRequired: true,
      });
    } else if (/5 יח"ל מתמטיקה/iu.test(normalizedText) && /חובה/u.test(normalizedText)) {
      pushFact({
        kind: 'numeric_gate',
        field: 'math_units',
        comparison: 'gte',
        valueNumber: 5,
        valueText: null,
        unit: 'units',
        description: 'מתמטיקה ברמת 5 יח"ל',
        isRequired: true,
      });
    } else if (/4 יח"ל מתמטיקה/iu.test(normalizedText) && /חובה/u.test(normalizedText)) {
      pushFact({
        kind: 'numeric_gate',
        field: 'math_units',
        comparison: 'gte',
        valueNumber: 4,
        valueText: null,
        unit: 'units',
        description: 'מתמטיקה ברמת 4 יח"ל לפחות',
        isRequired: true,
      });
    }

    if (/5 יח"ל פיזיקה/iu.test(normalizedText) && /חובה/u.test(normalizedText)) {
      pushFact({
        kind: 'numeric_gate',
        field: 'physics_units',
        comparison: 'gte',
        valueNumber: 5,
        valueText: null,
        unit: 'units',
        description: 'פיזיקה ברמת 5 יח"ל',
        isRequired: true,
      });
    }

    const minPsychometric = normalizedText.match(/ציון פסיכומטרי מינימלי:\s*(\d+)/u);
    if (minPsychometric) {
      pushFact({
        kind: 'numeric_gate',
        field: 'psychometric',
        comparison: 'gte',
        valueNumber: Number(minPsychometric[1]),
        valueText: null,
        unit: 'points',
        description: `פסיכומטרי ${minPsychometric[1]} ומעלה`,
        isRequired: true,
      });
    }

    const minBagrut = normalizedText.match(/ממוצע בגרות מינימלי:\s*(\d+)/u);
    if (minBagrut) {
      pushFact({
        kind: 'numeric_gate',
        field: 'bagrut_average',
        comparison: 'gte',
        valueNumber: Number(minBagrut[1]),
        valueText: null,
        unit: 'average',
        description: `ממוצע בגרות ${minBagrut[1]} ומעלה`,
        isRequired: true,
      });
    }

    const directPsychometric = normalizedText.match(
      /(?:קבלה ישירה\s*)?(?:ב)?פסיכומטרי\s*(?:≥)?\s*(\d+)(?:\+)?/u,
    );
    if (directPsychometric) {
      pushFact({
        kind: 'numeric_gate',
        field: 'psychometric',
        comparison: 'gte',
        valueNumber: Number(directPsychometric[1]),
        valueText: null,
        unit: 'points',
        description: `פסיכומטרי ${directPsychometric[1]} ומעלה`,
        isRequired: true,
      });
    }

    const bagrutAverage = normalizedText.match(/ממוצע בגרות(?: משוקלל)?\s*(\d+)(?:\+| ומעלה)/u);
    if (bagrutAverage) {
      pushFact({
        kind: 'numeric_gate',
        field: 'bagrut_average',
        comparison: 'gte',
        valueNumber: Number(bagrutAverage[1]),
        valueText: null,
        unit: 'average',
        description: `ממוצע בגרות ${bagrutAverage[1]} ומעלה`,
        isRequired: true,
      });
    }

    const quantitativePsychometric = normalizedText.match(/כמותי\s*(\d+)(?:\+| ומעלה)/u);
    if (quantitativePsychometric) {
      pushFact({
        kind: 'numeric_gate',
        field: 'psychometric_quantitative',
        comparison: 'gte',
        valueNumber: Number(quantitativePsychometric[1]),
        valueText: null,
        unit: 'points',
        description: `כמותי ${quantitativePsychometric[1]} ומעלה`,
        isRequired: true,
      });
    }

    const fiveUnitMathRoute = normalizedText.match(/5 יח"ל\s*(\d+)\+/u);
    const fourUnitMathRoute = normalizedText.match(/4 יח"ל\s*(\d+)\+/u);
    if (fiveUnitMathRoute && fourUnitMathRoute && /מתמטיקה/u.test(normalizedText)) {
      pushFact({
        kind: 'numeric_gate',
        field: 'math_units',
        comparison: 'gte',
        valueNumber: 5,
        valueText: null,
        unit: 'units',
        description: 'מתמטיקה ברמת 5 יח"ל',
        isRequired: true,
        groupKey: 'math_route/5_units',
      });
      pushFact({
        kind: 'numeric_gate',
        field: 'math_grade',
        comparison: 'gte',
        valueNumber: Number(fiveUnitMathRoute[1]),
        valueText: null,
        unit: 'points',
        description: `ציון ${fiveUnitMathRoute[1]} ומעלה במתמטיקה 5 יח"ל`,
        isRequired: true,
        groupKey: 'math_route/5_units',
      });
      pushFact({
        kind: 'numeric_gate',
        field: 'math_units',
        comparison: 'gte',
        valueNumber: 4,
        valueText: null,
        unit: 'units',
        description: 'מתמטיקה ברמת 4 יח"ל',
        isRequired: true,
        groupKey: 'math_route/4_units',
      });
      pushFact({
        kind: 'numeric_gate',
        field: 'math_grade',
        comparison: 'gte',
        valueNumber: Number(fourUnitMathRoute[1]),
        valueText: null,
        unit: 'points',
        description: `ציון ${fourUnitMathRoute[1]} ומעלה במתמטיקה 4 יח"ל`,
        isRequired: true,
        groupKey: 'math_route/4_units',
      });
    }

    if (/בגרות מלאה/u.test(normalizedText)) {
      pushFact({
        kind: 'manual_gate',
        field: 'document_check',
        comparison: 'present',
        valueNumber: null,
        valueText: 'בדיקת מסמכי בגרות',
        unit: 'text',
        description: 'נדרשת בדיקת זכאות לתעודת בגרות מלאה או למסמכים חלופיים שהמוסד דורש.',
        isRequired: true,
      });
    }

    if (
      /ביולוגיה .*חובה/u.test(normalizedText) ||
      /כימיה .*חובה/u.test(normalizedText) ||
      /ביולוגיה ו\/או כימיה 5 יח"ל .*חובה/u.test(normalizedText) ||
      /בגרות מלאה עם 5 יח"ל ביולוגיה ו\/או כימיה/u.test(normalizedText) ||
      /בגרות מלאה עם ביולוגיה/u.test(normalizedText)
    ) {
      pushFact({
        kind: 'manual_gate',
        field: 'required_subject',
        comparison: 'present',
        valueNumber: null,
        valueText: normalizedText,
        unit: 'text',
        description: normalizedText,
        isRequired: true,
      });
    }

    if (/תיק עבודות/u.test(normalizedText)) {
      pushFact({
        kind: 'manual_gate',
        field: 'portfolio',
        comparison: 'present',
        valueNumber: null,
        valueText: 'תיק עבודות',
        unit: 'text',
        description: normalizedText,
        isRequired: true,
      });
    }

    if (/ראיון/u.test(normalizedText)) {
      pushFact({
        kind: 'manual_gate',
        field: 'interview',
        comparison: 'present',
        valueNumber: null,
        valueText: 'ראיון קבלה',
        unit: 'text',
        description: normalizedText,
        isRequired: true,
      });
    }

    if (/ועדת קבלה|ועדה מקצועית|ועדה אמנותית/u.test(normalizedText)) {
      pushFact({
        kind: 'manual_gate',
        field: 'committee',
        comparison: 'present',
        valueNumber: null,
        valueText: 'ועדת קבלה',
        unit: 'text',
        description: normalizedText,
        isRequired: true,
      });
    }

    if (/מבחן|אודישן|מבדק/u.test(normalizedText)) {
      pushFact({
        kind: 'manual_gate',
        field: 'exam',
        comparison: 'present',
        valueNumber: null,
        valueText: 'מבחן קבלה',
        unit: 'text',
        description: normalizedText,
        isRequired: true,
      });
    }

    if (/רמת אנגלית|אמיר"ם|אמירם|מתקדמים א/u.test(normalizedText)) {
      pushFact({
        kind: 'manual_gate',
        field: 'other',
        comparison: 'present',
        valueNumber: null,
        valueText: normalizedText,
        unit: 'text',
        description: normalizedText,
        isRequired: true,
      });
    }

    if (/ציון התאמה|ממוצע בגרות בהתאם למסלול/u.test(normalizedText)) {
      pushFact({
        kind: 'manual_gate',
        field: 'other',
        comparison: 'present',
        valueNumber: null,
        valueText: normalizedText,
        unit: 'text',
        description: normalizedText,
        isRequired: true,
      });
    }
  }

  const existingFacts = detail.admissionFacts ?? [];
  return uniqueBy([...existingFacts, ...facts], (fact) =>
    [
      fact.kind,
      fact.field,
      fact.comparison,
      String(fact.valueNumber),
      fact.valueText ?? '',
      fact.description,
      fact.groupKey ?? '',
    ].join('|'),
  );
}

function buildLegacyAlternativePaths(args: {
  program: Program;
  detail: ProgramInstitutionDetail;
  detailIndex: number;
}) {
  const { program, detail, detailIndex } = args;
  const texts = uniqueBy(
    [...(detail.specificAdmissionNotes ?? []), ...(program.admissionRequirements ?? [])]
      .map((value) => value.trim())
      .filter(Boolean),
    (value) => value,
  );

  const paths: AdmissionAlternativePath[] = [];
  let pathIndex = 0;

  for (const text of texts) {
    if (!/חלופ|מכינה/u.test(text)) {
      continue;
    }

    const kind = /מכינה/u.test(text) ? 'prep_program' : 'manual_check';
    const title = /מכינה/u.test(text) ? 'אפיק מכינה' : 'אפיק קבלה חלופי';
    paths.push(
      createLegacyAlternativePath({
        programId: program.id,
        detailIndex,
        pathIndex,
        kind,
        title,
        description: text,
      }),
    );
    pathIndex += 1;
  }

  return uniqueBy([...(detail.admissionAlternativePaths ?? []), ...paths], (path) =>
    [path.kind, path.title, path.description].join('|'),
  );
}

function buildSyntheticInstitutionDetail(program: Program): ProgramInstitutionDetail | undefined {
  if (
    program.admissionType !== 'requirements' ||
    program.admissionRequirements.length === 0 ||
    program.institutionDetails?.length
  ) {
    return undefined;
  }

  return {
    institutionName: program.institution,
    durationYears: null,
    estimatedStudentsPerYear: 'לא ידוע',
    quantitativeMinRequirement: null,
    englishMinRequirement: null,
    specificAdmissionNotes: [],
    officialCalculatorUrl: '',
  };
}

function enrichLegacyProgram(program: Program): Program {
  const existingDetails = program.institutionDetails?.length ? [...program.institutionDetails] : [];
  const syntheticDetail = buildSyntheticInstitutionDetail(program);
  const details = syntheticDetail ? [...existingDetails, syntheticDetail] : existingDetails;

  if (details.length === 0) {
    return program;
  }

  return {
    ...program,
    institutionDetails: details.map((detail, detailIndex) => ({
      ...detail,
      admissionFacts: buildLegacyStructuredFacts({
        program,
        detail,
        detailIndex,
      }),
      admissionAlternativePaths: buildLegacyAlternativePaths({
        program,
        detail,
        detailIndex,
      }),
    })),
  };
}

function normalizeLegacyPrograms(programs: readonly Program[]) {
  return programs.map((program) => enrichLegacyProgram(program));
}

for (const record of mondayAdmissionsEvidence) {
  if (record.ruleStatus === 'not_applicable') {
    continue;
  }

  const programInstitutionKey = (record.catalogueInstitutionId ||
    `mon_${record.itemId}`) as InstitutionId;
  const instId = (record.catalogueInstitutionId ??
    INSTITUTION_BY_NAME[record.displayName]?.id ??
    `mon_${record.itemId}`) as InstitutionId;
  const baseSearchable = getMondayBaseSearchableText(record);

  let matches = DYNAMIC_PROGRAM_MAP.filter((prog) => {
    return prog.keywords.some((keyword) => keyword.test(baseSearchable));
  });

  if (matches.length === 0) {
    const fallback = fallbackDynamicProgram(record);
    matches = [{ keywords: [], ...fallback }];
  }

  for (const prog of matches) {
    const progId = `${programInstitutionKey}_${prog.id}`;

    const existsInStatic =
      ACADEMIC_PROGRAMS.some((p) => p.id === progId) ||
      academicPrograms.some((p) => p.id === progId) ||
      vocationalPrograms.some((p) => p.id === progId);

    if (existsInStatic) {
      continue;
    }

    const isCertificateType =
      record.diplomaType === 'תעודה מקצועית' ||
      record.diplomaType === 'לימודי תעודה' ||
      (record.diplomaType &&
        (record.diplomaType.includes('תעודה') || record.diplomaType.includes('הנדסאי'))) ||
      record.tags.includes('professional_certificate') ||
      (record.institutionType === 'מכללה פרטית' &&
        !record.displayName.includes('אקדמית') &&
        !record.displayName.includes('אקדמי') &&
        !record.displayName.includes('למינהל'));

    const type = isCertificateType ? 'certificate' : 'academic';

    const detailId = `${progId}:${instId}`;
    const primarySourceUrl = resolveUrl(record.displayName, record.officialUrls);
    const sourceCandidateId = primarySourceUrl ? `${detailId}:source:monday-evidence` : undefined;
    const sourceCandidates: AdmissionsSourceCandidate[] =
      sourceCandidateId && primarySourceUrl
        ? [
            {
              id: sourceCandidateId,
              origin: 'board_column' as const,
              specificity:
                record.catalogueVisibility === 'catalogue_mapped'
                  ? ('institution_admissions' as const)
                  : ('generic' as const),
              confidence: record.confidence,
              url: primarySourceUrl,
              title: `מקור מוסדי שנגזר מ-Monday עבור ${record.displayName}`,
              notes: `Derived from Monday admissions evidence item ${record.itemId}. ${record.nextAction}`,
            },
          ]
        : [];

    const admissionFacts: AdmissionFact[] = [];

    if (record.publicBucket === 'open_admission') {
      admissionFacts.push({
        id: `${detailId}:fact:open-admission`,
        ...(sourceCandidateId ? { sourceCandidateId } : {}),
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
        ...(sourceCandidateId ? { sourceCandidateId } : {}),
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
        ...(sourceCandidateId ? { sourceCandidateId } : {}),
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
        ...(sourceCandidateId ? { sourceCandidateId } : {}),
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
        ...(sourceCandidateId ? { sourceCandidateId } : {}),
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

    admissionFacts.push(
      ...buildStructuredAdmissionFacts({
        detailId,
        sourceCandidateId,
        facts: record.structuredAdmissionFacts,
      }),
    );

    const admissionAlternativePaths = buildStructuredAlternativePaths({
      detailId,
      sourceCandidateId,
      paths: record.structuredAlternativePaths,
    });

    const dynamicProgram: Program = {
      id: progId,
      name: `${prog.name} - ${record.displayName}`,
      institution: record.displayName,
      institutionId: instId,
      type,
      category: prog.category,
      profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
      admissionType: 'requirements',
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
          ...(sourceCandidates.length > 0
            ? {
                admissionsSourceCandidates: sourceCandidates,
              }
            : {}),
          admissionFacts,
          ...(admissionAlternativePaths.length > 0
            ? {
                admissionAlternativePaths,
              }
            : {}),
        },
      ],
    };

    const existingDynamicProgramIndex = dynamicPrograms.findIndex(
      (program) => program.id === progId,
    );
    if (existingDynamicProgramIndex >= 0) {
      dynamicPrograms[existingDynamicProgramIndex] = mergeDynamicProgramDetails(
        dynamicPrograms[existingDynamicProgramIndex],
        dynamicProgram,
      );
    } else {
      dynamicPrograms.push(dynamicProgram);
    }
  }
}

// Single combined catalogue.
// Add future sub-modules by spreading their arrays here.
export const allPrograms = [
  ...normalizeLegacyPrograms(ACADEMIC_PROGRAMS),
  ...normalizeLegacyPrograms(academicPrograms),
  ...normalizeLegacyPrograms(vocationalPrograms),
  ...dynamicPrograms,
];
