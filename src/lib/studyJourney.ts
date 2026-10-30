import type { AcademicScores } from '@/types';
import { admissionScoreGap } from './admissionScoreGap';
import { formatSekhemNumber } from './sekhemResultPresentation';
import { institutionLink } from '@/lib/institutionLinks';
import { HAIFA_NO_CALCULATION_NOTE } from '@/data/admissions/haifaNoCalculationNote';
import { isBatchCUnsupportedProgramId } from '@/data/admissions/batchCUnsupportedProgramIds';
import { FIELD_ENRICHMENT, PROGRAM_FIELD_MAP } from '@/data/degrees/fieldEnrichment';
import { DANON_PROGRAM_NAMES } from '@/data/admissions/danon';
import { INSTITUTION_BY_NAME } from '@/data/institutions';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';
import { canonicalProgramId, PROGRAM_CANONICAL_ALIASES } from '@/lib/seo/programAliases';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import { isBatchBManualProgramId } from '@/data/admissions/batchBManualProgramIds';

/** Select the journey's committed Bagrut path without changing an imported account profile. */
export function bagrutScoresForMode(
  scores: AcademicScores,
  gradeMode: 'quick' | 'exact' | 'none' | undefined,
): AcademicScores {
  if (gradeMode === undefined || !scores.bagrut) return scores;
  const { weightedAverage, subjectRecord } = scores.bagrut;
  return {
    ...scores,
    bagrut:
      gradeMode === 'quick'
        ? { weightedAverage }
        : gradeMode === 'exact'
          ? { subjectRecord }
          : undefined,
  };
}

export const LOCATIONS = {
  all: 'כל הארץ',
  north: 'צפון',
  center: 'מרכז',
  jerusalem: 'ירושלים',
  south: 'דרום',
  online: 'בינלאומי (אונליין)',
} as const;
export type JourneyLocation = keyof typeof LOCATIONS;
export type InstitutionType = 'all' | 'university' | 'college' | 'course';
export const INSTITUTION_TYPES: Record<InstitutionType, string> = {
  all: 'הכול',
  university: 'אוניברסיטאות',
  college: 'מכללות',
  course: 'קורסים',
};
export interface StudyField {
  id: string;
  name: string;
  category: string;
  programs: CatalogueProgram[];
  memberFieldIds?: string[];
}

const normalizeSubjectSearch = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/הנדסת(?=\s|$)/g, 'הנדסה')
    .toLowerCase();

export function matchesStudyField(field: Pick<StudyField, 'name'>, query: string): boolean {
  return normalizeSubjectSearch(field.name).includes(normalizeSubjectSearch(query));
}
export interface JourneyRow {
  id: string;
  fieldId: string;
  fieldName: string;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  result?: AdmissionsEvaluationResult;
  failed?: boolean;
}

export function toggleLocation(
  current: JourneyLocation[],
  value: JourneyLocation,
): JourneyLocation[] {
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (value === 'online') return [...current, value];
  if (value === 'all') return [...current.filter((item) => item === 'online'), value];
  return [...current.filter((item) => item !== 'all'), value];
}

const directory = new Map(getInstitutionDirectoryItems().map((item) => [item.id, item]));
export function institutionLocations(institution: CatalogueInstitution): JourneyLocation[] {
  const areas = directory.get(institution.id)?.areas;
  if (areas?.length && !areas.includes('all')) {
    return [
      ...new Set(
        areas
          .map((area) => (area === 'haifa' ? 'north' : area === 'tel_aviv' ? 'center' : area))
          .filter(
            (area): area is Exclude<JourneyLocation, 'all'> => area in LOCATIONS && area !== 'all',
          ),
      ),
    ];
  }
  return institution.region === 'any'
    ? ['north', 'center', 'jerusalem', 'south']
    : [institution.region];
}
export function matchesLocation(institution: CatalogueInstitution, locations: JourneyLocation[]) {
  const areas = institutionLocations(institution);
  return areas.some(
    (area) => locations.includes(area) || (area !== 'online' && locations.includes('all')),
  );
}
export function matchesInstitutionType(
  institution: CatalogueInstitution,
  program: CatalogueProgram,
  types: InstitutionType[],
) {
  if (types.includes('all')) return true;
  if (program.type !== 'academic') return types.includes('course');
  const categories = directory.get(institution.id)?.categories ?? [];
  const university =
    categories.includes('universities') || /אוניברסיט|טכניון|ויצמן/.test(institution.name);
  return types.includes(university ? 'university' : 'college');
}

export function studyFields(programs: CatalogueProgram[], includeUnlisted = false): StudyField[] {
  const fields = new Map<string, StudyField>();
  const knownNames = new Map(
    programs.flatMap((program) => {
      const key = PROGRAM_FIELD_MAP[program.id];
      return key ? [[program.name, key] as const] : [];
    }),
  );
  for (const program of programs) {
    if (!includeUnlisted && program.isListed === false) continue;
    const suffix = ` - ${program.institution}`;
    const name = DANON_PROGRAM_NAMES[program.id]
      ? 'קולינריה'
      : program.name.endsWith(suffix)
        ? program.name.slice(0, -suffix.length)
        : program.name;
    const mapped =
      PROGRAM_FIELD_MAP[program.id] ??
      knownNames.get(program.name) ??
      (FIELD_ENRICHMENT[program.id] ? program.id : name);
    const displayName = FIELD_ENRICHMENT[mapped]?.name ?? name;
    const id =
      Object.entries(FIELD_ENRICHMENT).find(([, field]) => field.name === displayName)?.[0] ??
      mapped;
    const field = fields.get(id);
    if (field) field.programs.push(program);
    else fields.set(id, { id, name: displayName, category: program.category, programs: [program] });
  }
  const engineeringFields = [...fields.values()].filter((field) =>
    matchesStudyField(field, 'הנדסה'),
  );
  if (engineeringFields.length) {
    const name = 'הנדסה וטכנולוגיה';
    const hub = engineeringFields.find((field) => field.name === name) ?? {
      id: name,
      name,
      category: 'הנדסה',
      programs: [],
    };
    fields.set(hub.id, {
      ...hub,
      memberFieldIds: engineeringFields
        .filter((field) => field.id !== hub.id)
        .map((field) => field.id),
    });
  }
  return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

export function selectedStudyFieldIds(fields: StudyField[], selected: string[]): string[] {
  return [
    ...new Set(
      selected.flatMap((id) => [
        id,
        ...(fields.find((field) => field.id === id)?.memberFieldIds ?? []),
      ]),
    ),
  ];
}

export function journeyRows(
  fields: StudyField[],
  institutions: CatalogueInstitution[],
): JourneyRow[] {
  const byId = new Map<string, CatalogueInstitution>(
    institutions.map((institution) => [institution.id, institution]),
  );
  return fields.flatMap((field) => {
    const rows = field.programs.flatMap((program) =>
      program.linkedInstitutionIds.flatMap((id) => {
        const institution = byId.get(id);
        return institution
          ? [
              {
                id: `${program.id}:${id}`,
                fieldId: field.id,
                fieldName: program.id === 'tlvyaffo_business' ? program.name : field.name,
                // Detail consumers select by the displayed institution name. Preserve
                // alias-owned copy when the public institution uses its curated name.
                program: {
                  ...program,
                  institutionDetails: program.institutionDetails?.map((detail) =>
                    detail.institutionName !== institution.name &&
                    INSTITUTION_BY_NAME[detail.institutionName]?.id === institution.id
                      ? { ...detail, institutionName: institution.name }
                      : detail,
                  ),
                },
                institution,
              },
            ]
          : [];
      }),
    );
    return rows.filter(
      (row) =>
        row.program.linkedInstitutionIds.length <= 1 ||
        !rows.some(
          (other) =>
            other.program.id !== row.program.id &&
            other.program.name === row.program.name &&
            other.program.linkedInstitutionIds.length === 1 &&
            other.institution.id === row.institution.id,
        ),
    );
  });
}

export type JourneyResultGroup = 'match' | 'improve' | 'explore';

// These older imported IDs describe the same institution/programme as an
// existing specific record. Keep them in allRows for saved links, but avoid
// presenting them as additional choices when the specific record is available.
export function distinctRecommendations(rows: JourneyRow[]): JourneyRow[] {
  return rows.filter((row) => {
    const canonicalId = PROGRAM_CANONICAL_ALIASES[row.program.id];
    return (
      !canonicalId ||
      !rows.some(
        (other) => other.program.id === canonicalId && other.institution.id === row.institution.id,
      )
    );
  });
}

export function isTechnionMedicineScore(
  result: AdmissionsEvaluationResult | undefined,
  programId: string | undefined,
): result is AdmissionsEvaluationResult & { score: number } {
  return (
    programId === 'technion_medicine' &&
    result?.linkedInstitutionId === 'technion' &&
    result.decision === 'unknown' &&
    result.score != null
  );
}

export function formatJourneyScore(score: number): string {
  return score.toLocaleString('he-IL', { maximumFractionDigits: 2 });
}

export function resultLabel(
  result?: AdmissionsEvaluationResult,
  failed = false,
  loading = false,
  programId?: string,
): {
  label: string;
  group: JourneyResultGroup;
} {
  const formatScore = (value: number) =>
    result?.linkedInstitutionId === 'reichman'
      ? formatSekhemNumber(value, 'reichman')
      : formatJourneyScore(value);
  if (failed) return { label: 'החישוב לא נטען', group: 'explore' };
  if (loading) return { label: 'החישוב מתבצע…', group: 'explore' };
  if (isTechnionMedicineScore(result, programId))
    return { label: 'קבלה דרך מבחני מו"ר', group: 'explore' };
  if (result?.degradationReason === 'incomplete_published_requirements')
    return { label: 'עדיין לא ניתן לקבוע התאמה', group: 'explore' };
  if (result?.linkedInstitutionId === 'danon' && result.kind === 'requirements_only')
    return { label: 'הרשמה מול בית הספר', group: 'explore' };
  if (
    result?.floorChecks &&
    result.decision === 'below' &&
    (result.linkedInstitutionId === 'biu' ||
      (result.linkedInstitutionId === 'tau' && programId === 'architecture'))
  )
    return { label: 'לא עומד/ת בתנאי הסף', group: 'improve' };
  if (
    result?.decision === 'accepted' &&
    result.kind === 'manual_gate' &&
    result.scoreAssessment === 'meets_threshold'
  )
    return { label: 'מתקבלים', group: 'match' };
  if (result?.scoreAssessment)
    return result.scoreAssessment === 'meets_threshold'
      ? {
          label: 'עוברים את הסף ✓',
          group: result.additionalConditions?.some((condition) => condition.status === 'unmet')
            ? 'explore'
            : 'match',
        }
      : { label: admissionScoreGap(result, formatScore) ?? 'עוד לא בסף', group: 'improve' };
  if (result?.kind === 'open_admission') return { label: 'הרשמה פתוחה', group: 'match' };
  if (['exact', 'estimated'].includes(result?.kind ?? '') && result?.decision === 'accepted') {
    return {
      label: result.kind === 'exact' ? 'עומד/ת בסף שחושב' : 'עוברים את הסף ✓',
      group: 'match',
    };
  }
  if (result?.decision === 'below')
    return {
      label: admissionScoreGap(result, formatScore) ?? 'עוד לא בסף',
      group: 'improve',
    };
  if (result?.decision === 'eligible_to_apply')
    return { label: 'אפשר להגיש מועמדות', group: 'match' };
  const scoreLabel = Number.isFinite(result?.threshold)
    ? 'אין הכרעת קבלה'
    : typeof result?.score === 'number' && Number.isFinite(result.score)
      ? `הסכם שלכם: ${formatScore(result.score)}`
      : 'אין הכרעת קבלה';
  const labels: Partial<Record<AdmissionsEvaluationResult['kind'], string>> = {
    needs_input: 'השלימו פרטים וקבלו תשובה',
    manual_gate: 'השלב הבא: מיון במוסד',
    requirements_only: 'תנאי קבלה ללא חישוב',
    unsupported: 'בדיקה אישית מול המוסד',
    authority_unavailable: 'בדיקה אישית מול המוסד',
    tracked_missing_rule: 'בדיקה אישית מול המוסד',
    degraded: 'בדיקה אישית מול המוסד',
    exact: scoreLabel,
    estimated: scoreLabel,
  };
  return {
    label: result ? (labels[result.kind] ?? 'טרם חושבה התאמה') : 'טרם חושבה התאמה',
    group: 'explore',
  };
}

export function resultExplanation(
  result?: AdmissionsEvaluationResult,
  programId?: string,
): string | undefined {
  if (!result || result.explanation === 'אין כרגע מידע עדכני על המסלול.') return undefined;
  if (result.degradationReason === 'incomplete_published_requirements') return undefined;
  if (result.linkedInstitutionId === 'danon' && result.kind === 'requirements_only')
    return undefined;
  if (result.kind === 'tracked_missing_rule' || result.kind === 'authority_unavailable') {
    if (result.explanation.trim() && !/[a-zA-Z]/.test(result.explanation))
      return result.explanation;
    return result.kind === 'authority_unavailable'
      ? 'נתוני הקבלה הדרושים לחישוב אינם זמינים כרגע. אפשר לבדוק ישירות באתר המוסד.'
      : 'תנאי הקבלה כאן למטה. רוצים תשובה אישית? השאירו פרטים והמוסד יחזור אליכם.';
  }
  switch (result.kind) {
    case 'requirements_only':
    case 'unsupported':
      if (isBatchCUnsupportedProgramId(programId ?? '', result.linkedInstitutionId))
        return result.explanation;
      return 'תנאי הקבלה כאן למטה. רוצים תשובה אישית? השאירו פרטים והמוסד יחזור אליכם.';
    case 'degraded':
      return 'נתוני הקבלה הדרושים לחישוב אינם זמינים כרגע. אפשר לבדוק ישירות באתר המוסד.';
    case 'manual_gate':
      if (
        (programId === 'architecture' && result.linkedInstitutionId === 'tau') ||
        (['tlvyaffo_cs', 'mta_cs', 'tlvyaffo_nursing', 'tlvyaffo_business'].includes(
          programId ?? '',
        ) &&
          result.linkedInstitutionId === 'mta') ||
        ((['colmgmt_law', 'colmgmt_business'].includes(canonicalProgramId(programId ?? '')) ||
          ['colmgmt_economics', 'colmgmt_cs'].includes(programId ?? '')) &&
          result.linkedInstitutionId === 'colman') ||
        isBatchBManualProgramId(programId ?? '', result.linkedInstitutionId)
      )
        return result.explanation;
      return 'השלב הבא הוא המיון. כל הפרטים כאן.';
    default:
      return result.explanation;
  }
}

export function groupJourneyRows(rows: JourneyRow[], groupBy: 'field' | 'institution') {
  const groups = new Map<string, { id: string; name: string; rows: JourneyRow[] }>();
  for (const row of rows) {
    const id = groupBy === 'field' ? row.fieldId : row.institution.id;
    const group = groups.get(id);
    if (group) group.rows.push(row);
    else
      groups.set(id, {
        id,
        name: groupBy === 'field' ? row.fieldName : row.institution.name,
        rows: [row],
      });
  }
  return [...groups.values()];
}

export { institutionLink as officialUrl } from '@/lib/institutionLinks';

export function showsOfficialNoCalculationNote(result?: AdmissionsEvaluationResult): boolean {
  return (
    (result?.kind === 'tracked_missing_rule' || result?.kind === 'authority_unavailable') &&
    result.explanation === HAIFA_NO_CALCULATION_NOTE &&
    Boolean(result.officialUrls?.length && resultSourceLinks(result)?.length)
  );
}

export function resultSourceLinks(result?: AdmissionsEvaluationResult, fallbackUrl?: string) {
  if (result?.kind !== 'tracked_missing_rule' && result?.kind !== 'authority_unavailable')
    return undefined;
  const hasSources = Boolean(result.officialUrls?.length);
  return (hasSources ? result.officialUrls! : [fallbackUrl]).flatMap((source, index) => {
    const href = institutionLink(source, result.linkedInstitutionId);
    return href
      ? [{ href, label: hasSources ? (index === 0 ? 'למקור הרשמי' : 'למקור נוסף') : 'לאתר המוסד' }]
      : [];
  });
}
