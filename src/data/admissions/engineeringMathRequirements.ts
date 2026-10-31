import type { AdmissionFact, InstitutionDetail, Program } from '@/data/degrees/types';
import { INSTITUTION_BY_ID, INSTITUTION_BY_NAME, type InstitutionId } from '@/data/institutions';

// Official sources captured 2026-10-28; hashes and the programme sweep are recorded in
// docs/admissions-verification/2026-10-29-admissions-bugs-first.md, Item 6.
const TAU_ROOT = 'https://go.tau.ac.il/he/engineering/ba/';
const TECHNION_MATH_URL = 'https://admissions.technion.ac.il/math-knowledge/';
const TAU_ME_INDUSTRIAL_MATH_NOTES = [
  'מתמטיקה: 5 יחידות בציון 75 לפחות, או 4 יחידות בציון 85 לפחות עם בחינת סיווג במתמטיקה.',
  'חלופה במתמטיקה: ציון 75 לפחות בכל אחד משני קורסים באותה אוניברסיטה מהרשימה הרשמית — חדו״א 1א, 1ב, 2א, 2ב או אלגברה בתל אביב; אינפי 1, אינפי 2, חדו״א ב או אלגברה ליניארית 1 או 2 באוניברסיטה הפתוחה. חלופה זו פוטרת מבחינת הסיווג.',
] as const;
const POLICIES = {
  tau_me: {
    sourceUrl: `${TAU_ROOT}mechanical?v=admission-requirements`,
    five: 75,
    four: 85,
    notes: TAU_ME_INDUSTRIAL_MATH_NOTES,
  },
  tau_ee: {
    sourceUrl: `${TAU_ROOT}electrical?v=admission-requirements`,
    five: 80,
    four: 90,
    notes: [
      'מתמטיקה: 5 יחידות בציון 80 לפחות, או 4 יחידות בציון 90 לפחות עם בחינת סיווג במתמטיקה.',
      'חלופה במתמטיקה: ציון 75 לפחות בקורס מהרשימה הרשמית — חדו״א 1א, חדו״א 1ב או אלגברה ליניארית בתל אביב; אינפי 1, אינפי 2 או אלגברה ליניארית 1 באוניברסיטה הפתוחה.',
    ],
  },
  tau_industrial: {
    sourceUrl: `${TAU_ROOT}industrial-engineering?v=admission-requirements`,
    five: 75,
    four: 85,
    notes: TAU_ME_INDUSTRIAL_MATH_NOTES,
  },
  tau_datascience: {
    sourceUrl: `${TAU_ROOT}high-tech-plus?v=admission-requirements`,
    five: 75,
    four: 85,
    notes: [
      'מתמטיקה: 5 יחידות בציון 75 לפחות, או 4 יחידות בציון 85 לפחות עם בחינת סיווג במתמטיקה או ציון 70 לפחות בכל אחד מהקורסים המקוונים גשר למתמטיקה אקדמית 1 ו־2.',
    ],
  },
  tau_cs: {
    sourceUrl: 'https://go.tau.ac.il/he/exact/ba/computer?v=requirements',
    five: 80,
    four: 88,
    notes: [
      'מתמטיקה: 5 יחידות בציון 80 לפחות או 4 יחידות בציון 88 לפחות.',
      'אפשר גם 5 יחידות בציון 70–79 או 4 יחידות בציון 75–87 עם ציון 75 לפחות בבחינת הסיווג במתמטיקה.',
    ],
  },
  technion: {
    sourceUrl: TECHNION_MATH_URL,
    five: 70,
    four: undefined,
    notes: [
      'מתמטיקה: 5 יחידות בציון 70 לפחות; בעלי 4 יחידות או ציון נמוך מ־70 ב־5 יחידות נדרשים לבחינת סיווג במתמטיקה בציון 70 לפחות.',
      'פטור מבחינת הסיווג במתמטיקה: קורס חדו״א א׳ (20406) באוניברסיטה הפתוחה בציון 65 לפחות.',
    ],
  },
} as const;
type PolicyId = keyof typeof POLICIES;
const PAIRS: readonly (readonly [string, InstitutionId, PolicyId])[] = [
  ...(['tau_me', 'me'] as const).map((id) => [id, 'tau', 'tau_me'] as const),
  ...(['tau_ee', 'ee'] as const).map((id) => [id, 'tau', 'tau_ee'] as const),
  ['tau_industrial', 'tau', 'tau_industrial'],
  ...(['tau_datascience', 'datascience'] as const).map(
    (id) => [id, 'tau', 'tau_datascience'] as const,
  ),
  ...(['tau_cs', 'cs'] as const).map((id) => [id, 'tau', 'tau_cs'] as const),
  ...[
    'technion_cs',
    'technion_datascience',
    'technion_ee',
    'technion_me',
    'technion_civil',
    'technion_industrial',
    'technion_biomedical',
    'cs',
    'ee',
    'me',
    'datascience',
  ].map((id) => [id, 'technion', 'technion'] as const),
];
export const ENGINEERING_MATH_PROGRAM_IDS = new Set(PAIRS.map(([id]) => id));

function mathsFacts(programId: string, institutionId: string, policyId: PolicyId): AdmissionFact[] {
  const policy = POLICIES[policyId];
  const sourceCandidateId = `${programId}:${institutionId}:math-source`;
  function fact(
    group: string,
    field: AdmissionFact['field'],
    value: number | null,
    description: string,
    comparison: AdmissionFact['comparison'] = 'gte',
  ): AdmissionFact {
    return {
      id: `${programId}:${institutionId}:fact:group:${encodeURIComponent(`math_route/${group}`)}:${field}`,
      sourceCandidateId,
      kind: 'numeric_gate',
      field,
      comparison,
      valueNumber: value,
      valueText: null,
      unit: value === null ? 'boolean' : field === 'math_units' ? 'units' : 'points',
      description,
      confidence: 'high',
      isRequired: true,
      groupKey: `math_route/${group}`,
    };
  }
  const units = (group: string, value: number, comparison: AdmissionFact['comparison'] = 'eq') =>
    fact(
      group,
      'math_units',
      value,
      `מתמטיקה: ${value} יחידות${comparison === 'gte' ? ' לפחות' : ''}`,
      comparison,
    );
  const grade = (group: string, value: number) =>
    fact(group, 'math_grade', value, `ציון ${value} לפחות במתמטיקה`);
  const exam = (group: string, value?: number): AdmissionFact => ({
    ...fact(
      group,
      'exam',
      value ?? null,
      `בחינת סיווג במתמטיקה${value ? ` בציון ${value} לפחות` : ''}`,
    ),
    ...(value === undefined ? { valueText: 'מעבר בחינת סיווג במתמטיקה' } : {}),
  });
  const result = [units('5_units', 5), grade('5_units', policy.five)];
  if (policyId === 'technion') {
    result.push(
      units('classification', 4, 'gte'),
      exam('classification', 70),
      units('course_exemption', 4, 'gte'),
      fact('course_exemption', 'required_subject', 65, POLICIES.technion.notes[1]),
    );
  } else if (policyId === 'tau_cs') {
    result.push(
      units('4_units', 4),
      grade('4_units', 88),
      units('5_units_classification', 5),
      grade('5_units_classification', 70),
      exam('5_units_classification', 75),
      units('4_units_classification', 4),
      grade('4_units_classification', 75),
      exam('4_units_classification', 75),
    );
  } else {
    result.push(units('4_units', 4), grade('4_units', POLICIES[policyId].four), exam('4_units'));
    if (policyId === 'tau_datascience') {
      result.push(
        units('4_units_courses', 4),
        grade('4_units_courses', 85),
        fact(
          '4_units_courses',
          'required_subject',
          70,
          'ציון 70 לפחות בכל אחד מהקורסים גשר למתמטיקה אקדמית 1 ו־2',
        ),
      );
    } else result.push(fact('courses', 'required_subject', 75, POLICIES[policyId].notes[1]));
  }
  return result;
}

function isMathFact(fact: AdmissionFact): boolean {
  return (
    fact.field === 'math_units' ||
    fact.field === 'math_grade' ||
    fact.groupKey?.startsWith('math_route/') === true ||
    (fact.field === 'exam' && /מתמטיק/.test(fact.description))
  );
}

/** Replace only reviewed mathematics content after either static normalization or a DB read. */
export function applyEngineeringMathRequirements<T extends Program>(program: T): T {
  const pairs = PAIRS.filter(([id]) => id === program.id);
  if (!pairs.length) return program;
  const details: InstitutionDetail[] = [...(program.institutionDetails ?? [])];
  for (const [, institutionId, policyId] of pairs) {
    const policy = POLICIES[policyId];
    const index = details.findIndex(
      (d) => INSTITUTION_BY_NAME[d.institutionName]?.id === institutionId,
    );
    const detail: InstitutionDetail =
      index < 0
        ? {
            institutionName: INSTITUTION_BY_ID[institutionId].name,
            durationYears: null,
            estimatedStudentsPerYear: '',
            quantitativeMinRequirement: null,
            englishMinRequirement: null,
            specificAdmissionNotes: [],
            officialCalculatorUrl: '',
          }
        : details[index];
    const sourceId = `${program.id}:${institutionId}:math-source`;
    const repaired: InstitutionDetail = {
      ...detail,
      specificAdmissionNotes: [
        ...policy.notes,
        ...detail.specificAdmissionNotes.filter(
          (note) =>
            !/^(?:5 יח["״]ל מתמטיקה|מתמטיקה:|חלופה במתמטיקה:|אפשר גם 5 יחידות|פטור מבחינת הסיווג במתמטיקה:)/.test(
              note,
            ),
        ),
      ],
      admissionFacts: [
        ...(detail.admissionFacts ?? []).filter((f) => !isMathFact(f)),
        ...mathsFacts(program.id, institutionId, policyId),
      ],
      admissionsSourceCandidates: [
        ...(detail.admissionsSourceCandidates ?? []).filter((s) => s.id !== sourceId),
        {
          id: sourceId,
          origin: 'manual',
          specificity: institutionId === 'tau' ? 'program_admissions' : 'institution_admissions',
          confidence: 'high',
          url: policy.sourceUrl,
          title: 'תנאי מתמטיקה',
        },
      ],
    };
    if (index < 0) details.push(repaired);
    else details[index] = repaired;
  }
  return { ...program, institutionDetails: details };
}
