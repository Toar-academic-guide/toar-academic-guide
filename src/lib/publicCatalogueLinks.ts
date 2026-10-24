import 'server-only';
import { cache } from 'react';
import { loadPublicCatalogue, subjectProgramPages } from '@/lib/publicCataloguePages';
import {
  canonicalProgramId,
  PROGRAM_CANONICAL_ALIASES,
  PROGRAM_RETIREMENT_REDIRECTS,
} from '@/lib/seo/programAliases';
import { institutionProgramName } from '@/lib/institutionProgramName';
import type { CatalogueProgram } from '@/types/catalogue';

export interface SubjectHub {
  id: string;
  name: string;
  category: string;
  type: CatalogueProgram['type'];
  programs: CatalogueProgram[];
  /** Programme pages the hub page links to; 0 means noindex and unlisted. */
  programLinks: number;
}

type PublicCatalogue = Awaited<ReturnType<typeof loadPublicCatalogue>>;

/**
 * The one source of subject hubs: the /programs index, the hub route and the
 * sitemap all read this, so they always agree.
 */
export function buildSubjectHubs(catalogue: PublicCatalogue) {
  const programs = catalogue.programs.filter(
    (program) =>
      program.isListed !== false &&
      !program.id.startsWith('mon_') &&
      canonicalProgramId(program.id) === program.id &&
      catalogue.institutions.some((institution) =>
        program.linkedInstitutionIds.includes(institution.id),
      ),
  );
  const hubs: SubjectHub[] = programs
    .filter((program) => catalogue.generalProgramIds.has(program.id))
    .map(({ id, name, category, type }) => ({
      id,
      name,
      category,
      type,
      programs: [],
      programLinks: 0,
    }));
  const hubByName = new Map(hubs.map((hub) => [hub.name, hub]));
  const hubByProgram = new Map<string, SubjectHub>();
  const usedIds = new Set(catalogue.programs.map((program) => program.id));
  // Subjects whose slug is already taken by a different subject. Their only
  // possible slug would be built from one institution's programme id (e.g.
  // `<programme>_subject`), so they get no public hub.
  const unpublishedNames = new Set<string>();

  for (const program of programs) {
    if (catalogue.generalProgramIds.has(program.id)) continue;
    const institution = catalogue.institutions.find((i) => i.id === program.institutionId);
    const name = institution ? institutionProgramName(program, institution) : program.name;
    const descriptiveId =
      Object.entries(PROGRAM_CANONICAL_ALIASES).find(
        ([alias, canonical]) => canonical === program.id && !PROGRAM_RETIREMENT_REDIRECTS[alias],
      )?.[0] ?? program.id;
    const prefix = `${program.institutionId}_`;
    const subjectId = descriptiveId.startsWith(prefix)
      ? descriptiveId.slice(prefix.length)
      : descriptiveId.slice(descriptiveId.indexOf('_') + 1);
    if (unpublishedNames.has(name)) continue;
    let hub =
      hubByName.get(name) ??
      hubs.find(
        (candidate) =>
          candidate.id === subjectId &&
          (candidate.category === program.category ||
            (catalogue.generalProgramIds.has(candidate.id) && candidate.type === program.type)),
      );
    if (!hub) {
      if (usedIds.has(subjectId)) {
        unpublishedNames.add(name);
        continue;
      }
      hub = {
        id: subjectId,
        name,
        category: program.category,
        type: program.type,
        programs: [],
        programLinks: 0,
      };
      hubs.push(hub);
      usedIds.add(subjectId);
    }
    hubByName.set(name, hub);
    hub.programs.push(program);
    hubByProgram.set(program.id, hub);
  }

  for (const hub of hubs) {
    const general = catalogue.generalProgramIds.has(hub.id)
      ? catalogue.programs.find((program) => program.id === hub.id)
      : undefined;
    hub.programLinks = general ? subjectProgramPages(catalogue, general).size : hub.programs.length;
  }
  // Hubs with no programme links stay reachable (noindex,follow) but are not
  // listed in the index, the sitemap, the homepage or related-programme blocks.
  const publishedHubs = hubs.filter((hub) => hub.programLinks > 0);

  return { hubs, publishedHubs, hubByProgram, programs };
}

const loadCatalogueLinks = cache(async () => {
  const catalogue = await loadPublicCatalogue();
  return { catalogue, ...buildSubjectHubs(catalogue) };
});

export const HOME_SUBJECT_COUNT = 12;
export const HOME_INSTITUTION_COUNT = 8;

export async function getPublicBrowseLinks() {
  const { catalogue, publishedHubs, programs } = await loadCatalogueLinks();
  return {
    hubs: publishedHubs,
    institutions: catalogue.institutions
      .filter(
        (institution) =>
          !institution.id.startsWith('mon_') &&
          programs.some((program) => program.linkedInstitutionIds.includes(institution.id)),
      )
      .slice(0, HOME_INSTITUTION_COUNT),
  };
}

/** Every published subject hub, alphabetical, for the /programs index. */
export async function getPublicSubjectIndex(): Promise<SubjectHub[]> {
  const { publishedHubs } = await loadCatalogueLinks();
  return [...publishedHubs].sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

export async function getPublicSubjectHub(id: string) {
  const { catalogue, hubs } = await loadCatalogueLinks();
  const hub = hubs.find((hub) => hub.id === id);
  return hub ? { hub, institutions: catalogue.institutions } : null;
}

export async function getPublicRelatedPrograms(programId: string) {
  const { catalogue, hubByProgram } = await loadCatalogueLinks();
  const id = canonicalProgramId(programId);
  const program = catalogue.programs.find((p) => p.id === id);
  const hub = hubByProgram.get(id);
  const seen = new Set<string>();
  const programs =
    hub && program
      ? hub.programs
          .filter((candidate) => {
            if (
              !candidate.institutionId ||
              candidate.institutionId === program.institutionId ||
              candidate.id === id ||
              seen.has(candidate.institutionId)
            )
              return false;
            seen.add(candidate.institutionId);
            return true;
          })
          .slice(0, 8)
      : [];
  return { hub, programs, institutions: catalogue.institutions };
}
