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
  ...ACADEMIC_PROGRAMS,
  ...academicPrograms,
  ...vocationalPrograms,
  ...dynamicPrograms,
];
