import type { Program } from '@/data/degrees/types';

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

/** Prefer the current canonical programme's institution row over a legacy alias's notes. */
export function catalogueInstitutionDetail(
  programs: readonly Program[],
  program: Program,
  canonicalProgramId?: string,
) {
  const current = programs.find((item) => item.id === canonicalProgramId);
  return (
    current?.institutionDetails?.find((detail) => detail.institutionName === program.institution) ??
    program.institutionDetails?.find((detail) => detail.institutionName === program.institution)
  );
}
