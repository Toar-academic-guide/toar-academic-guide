import 'server-only';
import { cache } from 'react';

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const PUBLIC_PROGRAMS = getStaticCataloguePrograms();
const PUBLIC_INSTITUTIONS = getStaticCatalogueInstitutions();

export const loadPublicCatalogue = cache(async () => {
  const [programs, institutions] = await Promise.all([
    listCataloguePrograms(),
    listCatalogueInstitutions(),
  ]);

  // The active catalogue owns current IDs. Keep older public URLs available only
  // after a successful read; database failures must not become a static fallback.
  const allPrograms = [
    ...programs.data,
    ...PUBLIC_PROGRAMS.filter(
      (legacy) => !programs.data.some((current) => current.id === legacy.id),
    ),
  ];
  const allInstitutions = [
    ...institutions.data,
    ...PUBLIC_INSTITUTIONS.filter(
      (legacy) => !institutions.data.some((current) => current.id === legacy.id),
    ),
  ];
  const generalProgramIds = new Set<string>();
  const resolvedPrograms = allPrograms.map((program) => {
    if (program.institutionId) return program;

    const thresholdIds = Object.entries(program.thresholds ?? {})
      .filter(([, threshold]) => threshold != null)
      .map(([id]) => id);
    const detailNames = program.institutionDetails?.map((detail) => detail.institutionName) ?? [];
    const specificPrograms = allPrograms.filter(
      (specific) =>
        specific.isListed !== false && specific.institutionId && specific.name === program.name,
    );
    // The legacy institution label alone is not evidence of a subject's providers.
    // Rows without subject-level signals keep their existing vocational/college link.
    if (!thresholdIds.length && !detailNames.length && !specificPrograms.length) return program;

    generalProgramIds.add(program.id);
    const providerIds = new Set([
      ...thresholdIds,
      ...specificPrograms.map((specific) => specific.institutionId!),
    ]);
    return {
      ...program,
      linkedInstitutionIds: allInstitutions
        .filter(
          (institution) =>
            providerIds.has(institution.id) || detailNames.includes(institution.name),
        )
        .map((institution) => institution.id),
    };
  });
  return {
    programs: resolvedPrograms,
    institutions: allInstitutions,
    generalProgramIds,
  };
});

export interface PublicProgramPageData {
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  isGeneral: boolean;
  institutionProgramPaths: Record<string, string>;
}

export interface PublicInstitutionPageData {
  institution: CatalogueInstitution;
  programs: CatalogueProgram[];
}

export async function getPublicProgramPageData(
  programId: string,
): Promise<PublicProgramPageData | null> {
  const catalogue = await loadPublicCatalogue();
  const program = catalogue.programs.find((candidate) => candidate.id === programId);

  if (!program) {
    return null;
  }

  const institutions = catalogue.institutions.filter((institution) =>
    program.linkedInstitutionIds.includes(institution.id),
  );
  const isGeneral = catalogue.generalProgramIds.has(program.id);
  return {
    program,
    institutions,
    isGeneral,
    institutionProgramPaths: Object.fromEntries(
      institutions.map((institution) => {
        const specific =
          isGeneral &&
          catalogue.programs.find(
            (candidate) =>
              candidate.isListed !== false &&
              candidate.name === program.name &&
              candidate.institutionId === institution.id,
          );
        return [
          institution.id,
          specific
            ? `/programs/${encodeURIComponent(specific.id)}`
            : `/institutions/${encodeURIComponent(institution.id)}`,
        ];
      }),
    ),
  };
}

export async function getPublicInstitutionPageData(
  institutionId: string,
): Promise<PublicInstitutionPageData | null> {
  const catalogue = await loadPublicCatalogue();
  const institution = catalogue.institutions.find((candidate) => candidate.id === institutionId);

  if (!institution) {
    return null;
  }

  const listedPrograms = catalogue.programs.filter(
    (program) =>
      program.isListed !== false &&
      (program.institutionId === institution.id ||
        (!program.institutionId && program.linkedInstitutionIds.includes(institution.id))),
  );
  const ownPrograms = listedPrograms.filter((program) => program.institutionId === institution.id);
  const names = new Set(ownPrograms.map((program) => program.name));
  const generalPrograms = listedPrograms.filter((program) => {
    if (program.institutionId || names.has(program.name)) return false;
    names.add(program.name);
    return true;
  });
  return {
    institution,
    programs: [...ownPrograms, ...generalPrograms],
  };
}
