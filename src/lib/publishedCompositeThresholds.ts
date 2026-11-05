import type {
  PublicProgramPageData,
  getPublicProgramRequirementSources,
} from './publicCataloguePages';
import { canLinkToSekhemCalculator } from './sekhemCalculatorSupport';
import type { CalculatorOffering } from './sekhemCalculator';
import { canonicalProgramId } from './seo/programAliases';

type RequirementSources = Awaited<ReturnType<typeof getPublicProgramRequirementSources>>;

export function hasPublishedCompositeThreshold(requirements: readonly string[]): boolean {
  // Match an attached published cutoff, not formula coefficients, years or a
  // psychometric floor elsewhere in the same requirement. Institution and route
  // wording are checked separately from evaluator support for calculator links.
  const metric =
    '(?:באפיק\\s+המשולב\\s+נדרש\\s+ציון|סכם|(?:ציון\\s+)?מתואם|(?:ציון\\s+)?מתאם|מצרף|ציון\\s+(?:משולב|התאמה|קבלה(?:\\s+משולב)?))';
  const cutoff = new RegExp(
    `${metric}\\s*(?:(?:כמותי|הנדסי|הנדסה|ארכיטקטורה|לניהול|ניהול|מעל|לפחות|מינימלי|נדרש|קבלה|של)[:–-]?\\s+){0,3}[:–-]?\\s*(\\d{2,4}(?:\\.\\d+)?)`,
    'g',
  );
  return requirements.some((requirement) =>
    Array.from(requirement.matchAll(cutoff)).some((match) => Number(match[1]) < 1900),
  );
}

export function hasPublishedCompositeThresholds(
  { program, institutions }: PublicProgramPageData,
  sources: RequirementSources,
  offerings?: readonly CalculatorOffering[],
): boolean {
  if (
    program.type !== 'academic' ||
    program.isListed === false ||
    program.id.startsWith('mon_') ||
    canonicalProgramId(program.id) !== program.id
  )
    return false;
  return institutions.some(
    (institution) =>
      !!sources[institution.id] &&
      canLinkToSekhemCalculator(sources[institution.id].program, institution.id, offerings) &&
      hasPublishedCompositeThreshold(sources[institution.id].requirements),
  );
}
