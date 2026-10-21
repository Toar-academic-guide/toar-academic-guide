import { FIELD_ENRICHMENT, PROGRAM_FIELD_MAP } from '@/data/degrees/fieldEnrichment';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

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
    const name = program.name.endsWith(suffix)
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
  return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'));
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
                fieldName: field.name,
                program,
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
  const aliases: Record<string, string> = {
    mta_cs: 'tlvyaffo_cs',
    colman_cs: 'colmgmt_cs',
  };
  return rows.filter((row) => {
    const canonicalId = aliases[row.program.id];
    return (
      !canonicalId ||
      !rows.some(
        (other) => other.program.id === canonicalId && other.institution.id === row.institution.id,
      )
    );
  });
}

export function resultLabel(
  result?: AdmissionsEvaluationResult,
  failed = false,
  loading = false,
): {
  label: string;
  group: JourneyResultGroup;
} {
  if (failed) return { label: 'החישוב לא נטען', group: 'explore' };
  if (loading) return { label: 'החישוב מתבצע…', group: 'explore' };
  if (result?.linkedInstitutionId === 'danon' && result.kind === 'requirements_only')
    return { label: 'הרשמה מול בית הספר', group: 'explore' };
  if (result?.kind === 'open_admission') return { label: 'הרשמה פתוחה', group: 'match' };
  if (['exact', 'estimated'].includes(result?.kind ?? '') && result?.decision === 'accepted') {
    return { label: result.kind === 'exact' ? 'עומד/ת בסף שחושב' : 'התאמה משוערת', group: 'match' };
  }
  if (result?.decision === 'below') return { label: 'אפשר לשפר את הסיכוי', group: 'improve' };
  if (result?.decision === 'eligible_to_apply')
    return { label: 'אפשר להגיש מועמדות', group: 'match' };
  const labels: Partial<Record<AdmissionsEvaluationResult['kind'], string>> = {
    needs_input: 'חסרים פרטים לחישוב',
    manual_gate: 'נדרש מיון נוסף',
    requirements_only: 'תנאי קבלה ללא חישוב',
    unsupported: 'אין חישוב למסלול זה',
    authority_unavailable: 'הנתונים הרשמיים אינם זמינים',
    tracked_missing_rule: 'חסרים נתוני קבלה רשמיים',
    degraded: 'החישוב אינו זמין כרגע',
    exact: 'אין הכרעת קבלה',
    estimated: 'אין הכרעת קבלה',
  };
  return {
    label: result ? (labels[result.kind] ?? 'טרם חושבה התאמה') : 'טרם חושבה התאמה',
    group: 'explore',
  };
}

export function resultExplanation(result?: AdmissionsEvaluationResult): string | undefined {
  if (!result) return undefined;
  if (result.linkedInstitutionId === 'danon' && result.kind === 'requirements_only')
    return undefined;
  switch (result.kind) {
    case 'requirements_only':
    case 'tracked_missing_rule':
    case 'unsupported':
      return 'אין כרגע חישוב קבלה מאומת למסלול הזה. אפשר לבדוק את התנאים העדכניים באתר המוסד.';
    case 'authority_unavailable':
    case 'degraded':
      return 'נתוני הקבלה הדרושים לחישוב אינם זמינים כרגע. אפשר לבדוק ישירות באתר המוסד.';
    case 'manual_gate':
      return 'בנוסף לציונים, צריך לבדוק את שלבי המיון ותנאי ההגשה של המוסד.';
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

export function officialUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
