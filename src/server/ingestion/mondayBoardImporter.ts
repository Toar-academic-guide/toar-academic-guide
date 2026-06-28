import fs from 'fs';
import type {
  AdmissionsSourceCandidateRow,
  AdmissionFactRow,
  AdmissionAlternativePathRow,
} from '@/db/types';

export interface MondayRawItem {
  id: string;
  name: string;
  column_values: Array<{
    id: string;
    text: string;
    value: string | null;
  }>;
  updates?: Array<{
    id: string;
    body: string;
    created_at: string;
  }>;
}

export interface ImportedAdmissionsData {
  sourceCandidates: Array<Partial<AdmissionsSourceCandidateRow>>;
  facts: Array<Partial<AdmissionFactRow>>;
  alternativePaths: Array<Partial<AdmissionAlternativePathRow>>;
}

const INSTITUTION_MAP: Record<string, string> = {
  'האוניברסיטה העברית': 'huji',
  'אוניברסיטת תל אביב': 'tau',
  הטכניון: 'technion',
  'בן-גוריון': 'bgu',
  'בר-אילן': 'biu',
  חיפה: 'haifa',
  הפתוחה: 'open_university',
  אריאל: 'ariel',
  ספיר: 'sapir',
  רופין: 'ruppin',
  כנרת: 'kinneret',
  'תל-חי': 'telhai',
  אפקה: 'afeka',
  'תל אביב-יפו': 'mta',
  רייכמן: 'reichman',
  שנקר: 'shenkar',
  HIT: 'hit',
  'סמי שמעון': 'sce',
  עזריאלי: 'azrieli',
  בראודה: 'ort_braude',
  בצלאל: 'bezalel',
  הדסה: 'hadassah',
  ויצו: 'wizo',
  'מוסיקה ולמחול': 'jerusalem_academy',
  'בוכמן-מהטה': 'rubin',
  'בית ברל': 'beit_berl',
  'המכללה למנהל': 'colman',
  אונו: 'ono',
  דנון: 'danon',
  בישולים: 'bishulim',
};

const PROGRAM_MAP: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /מדעי המחשב|הנדסת תוכנה/i, id: 'cs' },
  { pattern: /הנדסת חשמל/i, id: 'ee' },
  { pattern: /פסיכולוגיה/i, id: 'psychology' },
  { pattern: /הנדסת מכונות/i, id: 'me' },
  { pattern: /רפואה/i, id: 'medicine' },
  { pattern: /משפטים/i, id: 'law' },
  { pattern: /מנהל עסקים/i, id: 'business' },
  { pattern: /כלכלה/i, id: 'economics' },
  { pattern: /תקשורת חזותית/i, id: 'graphic_design' },
  { pattern: /עיצוב תעשייתי/i, id: 'industrial_design' },
];

export function parseMondayAdmissionsData(dataPath: string): ImportedAdmissionsData {
  if (!fs.existsSync(dataPath)) {
    return { sourceCandidates: [], facts: [], alternativePaths: [] };
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const items: MondayRawItem[] = JSON.parse(raw);

  const sourceCandidates: Array<Partial<AdmissionsSourceCandidateRow>> = [];
  const facts: Array<Partial<AdmissionFactRow>> = [];
  const alternativePaths: Array<Partial<AdmissionAlternativePathRow>> = [];

  for (const item of items) {
    // 1. Resolve Institution ID
    let institutionId: string | null = null;
    for (const [key, val] of Object.entries(INSTITUTION_MAP)) {
      if (item.name.includes(key)) {
        institutionId = val;
        break;
      }
    }

    if (!institutionId) continue;

    // 2. Parse Column Values
    let calculatorUrl = '';
    let initialRequirements = '';
    let mechinaDetails = '';

    for (const col of item.column_values) {
      if (col.id === 'link_mm44f8t0' && col.value) {
        try {
          const parsedLink = JSON.parse(col.value);
          calculatorUrl = parsedLink.url || '';
        } catch (err) {
          console.warn(`Failed to parse BGU/Technion link column: ${err}`);
        }
      } else if (col.id === 'long_text_mm44b0qm' && col.value) {
        try {
          initialRequirements = JSON.parse(col.value).text || '';
        } catch (err) {
          console.warn(`Failed to parse initial requirements column: ${err}`);
        }
      } else if (col.id === 'long_text_mm46nsp6' && col.value) {
        try {
          mechinaDetails = JSON.parse(col.value).text || '';
        } catch (err) {
          console.warn(`Failed to parse mechina details column: ${err}`);
        }
      }
    }

    const latestUpdate = item.updates?.[0]?.body || '';
    const cleanUpdateText = latestUpdate
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // Resolve Program ID dynamically using PROGRAM_MAP
    let programId = 'cs'; // default fallback
    for (const mapping of PROGRAM_MAP) {
      if (
        mapping.pattern.test(item.name) ||
        mapping.pattern.test(cleanUpdateText) ||
        mapping.pattern.test(initialRequirements)
      ) {
        programId = mapping.id;
        break;
      }
    }

    // 3. Create Source Candidate if calculator exists
    const candidateId = `${institutionId}:calculator-source`;
    if (calculatorUrl) {
      sourceCandidates.push({
        id: candidateId,
        admissionRequirementId: `${institutionId}:requirements`, // fallback parent
        institutionId,
        programId,
        origin: 'item_update',
        specificity: 'calculator',
        confidence: 'high',
        url: calculatorUrl,
        title: `מחשבון סכם - ${item.name}`,
        notes: `Imported from Monday Item ${item.id}`,
      });
    }

    // 4. Parse Updates (Enrichment Data or Reverse Engineering Reports)
    // Check if open admissions
    if (
      cleanUpdateText.includes('קבלה פתוחה') ||
      cleanUpdateText.includes('אין דרישת בגרות או פסיכומטרי')
    ) {
      facts.push({
        id: `${institutionId}:fact:open-admission`,
        admissionRequirementId: `${institutionId}:requirements`,
        institutionId,
        programId,
        sourceCandidateId: calculatorUrl ? candidateId : null,
        kind: 'open_admission',
        field: 'open_admission',
        comparison: 'eq',
        valueNumber: 1,
        valueText: 'קבלה פתוחה',
        unit: 'boolean',
        description: 'קבלה פתוחה ללא תנאי סף פסיכומטרי או בגרות',
        confidence: 'high',
        isRequired: false,
      });
    }

    // Process main text for general facts
    const factMatches = [
      {
        pattern: /פסיכומטרי\s*(\d{3})\+/i,
        field: 'psychometric' as const,
        kind: 'numeric_gate' as const,
      },
      {
        pattern: /ממוצע בגרות\s*(\d{2,3})\+/i,
        field: 'bagrut_average' as const,
        kind: 'numeric_gate' as const,
      },
    ];

    for (const match of factMatches) {
      const found = cleanUpdateText.match(match.pattern);
      if (found) {
        const val = parseInt(found[1], 10);
        facts.push({
          id: `${institutionId}:fact:${match.field}`,
          admissionRequirementId: `${institutionId}:requirements`,
          institutionId,
          programId,
          sourceCandidateId: calculatorUrl ? candidateId : null,
          kind: match.kind,
          field: match.field,
          comparison: 'gte',
          valueNumber: val,
          unit: 'points',
          description: `סף מינימלי עבור ${match.field === 'psychometric' ? 'פסיכומטרי' : 'בגרות'}: ${val}`,
          confidence: 'medium',
          isRequired: true,
        });
      }
    }

    // Extract manual requirements
    if (cleanUpdateText.includes('תיק עבודות') || initialRequirements.includes('תיק עבודות')) {
      facts.push({
        id: `${institutionId}:fact:portfolio`,
        admissionRequirementId: `${institutionId}:requirements`,
        institutionId,
        programId,
        sourceCandidateId: calculatorUrl ? candidateId : null,
        kind: 'manual_gate',
        field: 'portfolio',
        comparison: 'eq',
        valueText: 'תיק עבודות',
        unit: 'boolean',
        description: 'הגשת תיק עבודות יצירתי',
        confidence: 'high',
        isRequired: true,
      });
    }

    if (cleanUpdateText.includes('ראיון קבלה') || initialRequirements.includes('ראיון קבלה')) {
      facts.push({
        id: `${institutionId}:fact:interview`,
        admissionRequirementId: `${institutionId}:requirements`,
        institutionId,
        programId,
        sourceCandidateId: calculatorUrl ? candidateId : null,
        kind: 'manual_gate',
        field: 'interview',
        comparison: 'eq',
        valueText: 'ראיון קבלה',
        unit: 'boolean',
        description: 'ראיון קבלה אישי בפני ועדה',
        confidence: 'high',
        isRequired: true,
      });
    }

    // 5. Alternative Paths (Mechina)
    if (mechinaDetails && mechinaDetails.length > 20) {
      alternativePaths.push({
        id: `${institutionId}:alt:mechina`,
        admissionRequirementId: `${institutionId}:requirements`,
        institutionId,
        programId,
        sourceCandidateId: calculatorUrl ? candidateId : null,
        kind: 'prep_program',
        title: 'מכינה קדם-אקדמית',
        description: mechinaDetails.slice(0, 200) + (mechinaDetails.length > 200 ? '...' : ''),
        url: calculatorUrl || null,
        priority: 50,
      });
    }
  }

  return { sourceCandidates, facts, alternativePaths };
}
