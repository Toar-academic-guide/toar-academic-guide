import type {
  PublicProgramPageData,
  getPublicProgramRequirementSources,
} from './publicCataloguePages';
import { canonicalProgramId } from './seo/programAliases';

type RequirementSources = Awaited<ReturnType<typeof getPublicProgramRequirementSources>>;

export function hasPublishedCompositeThreshold(
  requirements: readonly string[],
  institutionId: string,
  options: { forFaq?: boolean } = {},
): boolean {
  if (institutionId === 'ariel') return false;
  // Match an attached published cutoff, not formula coefficients, years or a
  // psychometric floor elsewhere in the same requirement. TAU adaptation-only
  // FAQ answers are deliberately excluded; the programme links still qualify.
  const metric =
    options.forFaq && institutionId === 'tau'
      ? '(?:סכם|(?:ציון\\s+)?מתואם|(?:ציון\\s+)?מתאם|מצרף|ציון\\s+משולב)'
      : '(?:סכם|(?:ציון\\s+)?מתואם|(?:ציון\\s+)?מתאם|מצרף|ציון\\s+משולב|ציון\\s+התאמה)';
  const cutoff = new RegExp(
    `${metric}\\s*(?:(?:כמותי|הנדסי|הנדסה|ארכיטקטורה|לניהול|ניהול|מעל|לפחות|מינימלי|נדרש|קבלה|של)[:–-]?\\s+){0,3}[:–-]?\\s*(\\d{2,4}(?:\\.\\d+)?)`,
    'g',
  );
  return requirements.some((requirement) => {
    // A prior-degree route is not the Bagrut/psychometric composite offered by
    // this calculator. It does not turn a TAU adaptation answer into a match.
    if (options.forFaq && institutionId === 'tau' && /לבעלי תואר|תואר קודם/.test(requirement))
      return false;
    return Array.from(requirement.matchAll(cutoff)).some((match) => Number(match[1]) < 1900);
  });
}

export function hasPublishedCompositeThresholds(
  { program, institutions }: PublicProgramPageData,
  sources: RequirementSources,
): boolean {
  if (
    program.type !== 'academic' ||
    program.isListed === false ||
    program.id.startsWith('mon_') ||
    canonicalProgramId(program.id) !== program.id
  )
    return false;
  return institutions.some((institution) =>
    hasPublishedCompositeThreshold(sources[institution.id]?.requirements ?? [], institution.id),
  );
}
