/** Read-only report. Run with: node --conditions=react-server --import tsx scripts/requirement-tiles-coverage.ts */
import {
  loadPublicCatalogue,
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '../src/lib/publicCataloguePages';
import { canonicalProgramId } from '../src/lib/seo/programAliases';
import { selectRequirementTiles } from '../src/lib/requirementTiles';

async function main() {
  const catalogue = await loadPublicCatalogue();
  const programs = catalogue.programs.filter(
    (p) => p.isListed !== false && canonicalProgramId(p.id) === p.id,
  );
  const rows = [];
  for (const program of programs) {
    const page = (await getPublicProgramPageData(program.id))!;
    const sources = await getPublicProgramRequirementSources(page);
    const selected = Object.entries(sources).map(([institutionId, source]) => ({
      institutionId,
      ...selectRequirementTiles({
        program: source.program,
        institutionId,
        requirements: source.requirements,
      }),
    }));
    rows.push({
      programId: program.id,
      tiled: selected.some((r) => r.model),
      sources: selected.map((r) => ({
        institutionId: r.institutionId,
        semantics: r.model?.semantics,
        reason: r.reason,
      })),
      ...(selected.length ? {} : { reason: 'no_institution_source' }),
    });
  }
  const fallbackGroups: Record<string, string[]> = {};
  for (const row of rows.filter((r) => !r.tiled)) {
    const reasons = [...new Set(row.sources.map((s) => s.reason).filter(Boolean))];
    const reason = reasons.length ? reasons.sort().join(', ') : row.reason!;
    (fallbackGroups[reason] ??= []).push(row.programId);
  }
  console.log(
    JSON.stringify(
      {
        cataloguePrograms: catalogue.programs.length,
        publicPrograms: rows.length,
        tiled: rows.filter((r) => r.tiled).length,
        fallback: rows.filter((r) => !r.tiled).length,
        tiledPrograms: rows.filter((r) => r.tiled),
        fallbackGroups,
        unclearSemantics: rows.flatMap((r) =>
          r.sources
            .filter((s) => s.reason === 'unclear_semantics')
            .map((s) => `${r.programId}:${s.institutionId}`),
        ),
      },
      null,
      2,
    ),
  );
}
void main();
