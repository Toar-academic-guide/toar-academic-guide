import 'server-only';
import { cache } from 'react';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import { canonicalProgramId, PROGRAM_CANONICAL_ALIASES } from '@/lib/seo/programAliases';
import { institutionProgramName } from '@/lib/institutionProgramName';
import type { CatalogueProgram } from '@/types/catalogue';

export interface SubjectHub {
  id: string;
  name: string;
  category: string;
  type: CatalogueProgram['type'];
  programs: CatalogueProgram[];
}

const loadCatalogueLinks = cache(async () => {
  const catalogue = await loadPublicCatalogue();
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
    .map(({ id, name, category, type }) => ({ id, name, category, type, programs: [] }));
  const hubByName = new Map(hubs.map((hub) => [hub.name, hub]));
  const hubByProgram = new Map<string, SubjectHub>();
  const usedIds = new Set(catalogue.programs.map((program) => program.id));

  for (const program of programs) {
    if (catalogue.generalProgramIds.has(program.id)) continue;
    const institution = catalogue.institutions.find((i) => i.id === program.institutionId);
    const name = institution ? institutionProgramName(program, institution) : program.name;
    const descriptiveId =
      Object.entries(PROGRAM_CANONICAL_ALIASES).find(
        ([, canonical]) => canonical === program.id,
      )?.[0] ?? program.id;
    const prefix = `${program.institutionId}_`;
    const subjectId = descriptiveId.startsWith(prefix)
      ? descriptiveId.slice(prefix.length)
      : descriptiveId.slice(descriptiveId.indexOf('_') + 1);
    let hub =
      hubByName.get(name) ??
      hubs.find(
        (candidate) =>
          candidate.id === subjectId &&
          (candidate.category === program.category ||
            (catalogue.generalProgramIds.has(candidate.id) && candidate.type === program.type)),
      );
    if (!hub) {
      const id = usedIds.has(subjectId) ? `${program.id}_subject` : subjectId;
      hub = { id, name, category: program.category, type: program.type, programs: [] };
      hubs.push(hub);
      usedIds.add(id);
    }
    hubByName.set(name, hub);
    hub.programs.push(program);
    hubByProgram.set(program.id, hub);
  }

  return { catalogue, hubs, hubByProgram, programs };
});

export const HOME_SUBJECT_COUNT = 12;
export const HOME_INSTITUTION_COUNT = 8;

export async function getPublicBrowseLinks() {
  const { catalogue, hubs, programs } = await loadCatalogueLinks();
  return {
    hubs,
    institutions: catalogue.institutions
      .filter(
        (institution) =>
          !institution.id.startsWith('mon_') &&
          programs.some((program) => program.linkedInstitutionIds.includes(institution.id)),
      )
      .slice(0, HOME_INSTITUTION_COUNT),
  };
}

/** Every subject hub, alphabetical, for the /programs index. */
export async function getPublicSubjectIndex(): Promise<SubjectHub[]> {
  const { hubs } = await loadCatalogueLinks();
  return [...hubs].sort((a, b) => a.name.localeCompare(b.name, 'he'));
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
