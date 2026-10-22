import type { Program } from '@/data/degrees/types';
import { INSTITUTION_BY_ID } from '@/data/institutions';

// These ingestion diagnostics are stored alongside catalogue copy. Keep the source
// untouched for admissions processing; only adapt text at the UI boundary.
const INTERNAL_DESCRIPTIONS = new Set([
  'Admission depends on manual review such as interview, portfolio, exam, or committee.',
  'Evidence points to manual admissions gates rather than a numeric formula.',
  'Update evidence contains a decision-bearing status or both score formula and cutoff/threshold evidence.',
  'No decisive admissions evidence was derived automatically.',
  'Evidence says there is no formal Bagrut/psychometric gate, but manual fit checks may remain.',
]);

export function catalogueDescription(text?: string): string | undefined {
  return text && !INTERNAL_DESCRIPTIONS.has(text.trim()) ? text : undefined;
}

export function catalogueAdmissionRequirements(
  notes: readonly string[] = [],
  fallback: readonly string[] = [],
): string[] {
  const display = (items: readonly string[]) =>
    items.flatMap((text) => {
      if (
        text.trim() ===
        'Admission depends on manual review such as interview, portfolio, exam, or committee.'
      ) {
        return ['הקבלה כוללת מיון נוסף, כמו ריאיון, תיק עבודות, מבחן או ועדת קבלה.'];
      }
      if (
        text.trim() ===
        'Evidence says there is no formal Bagrut/psychometric gate, but manual fit checks may remain.'
      ) {
        return ['אין דרישה לבגרות או לפסיכומטרי. ייתכנו שלבי מיון נוספים.'];
      }
      return catalogueDescription(text) ? [text] : [];
    });
  const requirements = display(notes);
  if (requirements.length) return requirements;
  const fallbackRequirements = display(fallback);
  return fallbackRequirements.length
    ? fallbackRequirements
    : ['לפרטים על תנאי הקבלה, יש לבדוק באתר המוסד.'];
}

/** Keep institution-specific copy; use a shared programme only when that copy is absent. */
export function catalogueInstitutionDetail(
  programs: readonly Program[],
  program: Program,
  canonicalProgramId?: string,
) {
  const current = programs.find((item) => item.id === canonicalProgramId);
  const institutionName = program.institutionId
    ? (INSTITUTION_BY_ID[program.institutionId]?.name ?? program.institution)
    : program.institution;
  const own = program.institutionDetails?.find(
    (detail) =>
      detail.institutionName === institutionName || detail.institutionName === program.institution,
  );
  const shared = current?.institutionDetails?.find(
    (detail) =>
      detail.institutionName === institutionName || detail.institutionName === program.institution,
  );
  return own?.specificAdmissionNotes.length
    ? own
    : shared?.specificAdmissionNotes.length
      ? shared
      : (own ?? shared);
}
