import 'server-only';
import { cache } from 'react';

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { catalogueAdmissionRequirements } from '@/lib/catalogueDisplayText';
import { officialUrl } from '@/lib/studyJourney';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const PUBLIC_PROGRAMS = getStaticCataloguePrograms();
const PUBLIC_INSTITUTIONS = getStaticCatalogueInstitutions();
const STATIC_PROGRAM_BY_ID = new Map(PUBLIC_PROGRAMS.map((program) => [program.id, program]));

function hasGeneralIdentity(program: CatalogueProgram): boolean {
  const legacy = STATIC_PROGRAM_BY_ID.get(program.id);
  return !program.institutionId || (!!legacy && !legacy.institutionId);
}

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
  // Seeded DB rows can carry an institutionId inferred from a legacy label.
  // Establish subject identity before resolving providers so subjects cannot
  // supply ownership evidence for themselves or other subjects.
  const institutionSpecificPrograms = allPrograms.filter(
    (program) =>
      program.isListed !== false && program.institutionId && !hasGeneralIdentity(program),
  );
  const generalProgramIds = new Set(
    allPrograms
      .filter(
        (program) =>
          hasGeneralIdentity(program) &&
          (Object.values(program.thresholds ?? {}).some((threshold) => threshold != null) ||
            !!program.institutionDetails?.length ||
            institutionSpecificPrograms.some((specific) => specific.name === program.name)),
      )
      .map((program) => program.id),
  );
  const resolvedPrograms = allPrograms.map((program) => {
    if (!generalProgramIds.has(program.id)) return program;

    const thresholdIds = Object.entries(program.thresholds ?? {})
      .filter(([, threshold]) => threshold != null)
      .map(([id]) => id);
    const detailNames = program.institutionDetails?.map((detail) => detail.institutionName) ?? [];
    const specificPrograms = allPrograms.filter(
      (specific) =>
        specific.id !== program.id &&
        !generalProgramIds.has(specific.id) &&
        specific.isListed !== false &&
        specific.institutionId &&
        specific.name === program.name,
    );
    const providerIds = new Set([
      ...thresholdIds,
      ...specificPrograms.map((specific) => specific.institutionId!),
    ]);
    return {
      ...program,
      institutionId: undefined,
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
  institutionRequirementSources: Record<string, PublicProgramRequirementSource>;
}

interface PublicProgramRequirementSource {
  sourceProgramId: string;
  requirements: string[];
  officialUrl?: string;
  fullDetailsPath?: string;
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
  const institutionProgramPaths: Record<string, string> = {};
  const institutionRequirementSources: Record<string, PublicProgramRequirementSource> = {};
  const genericRequirement = catalogueAdmissionRequirements()[0];
  const hasRequirements = (items: string[]) =>
    !(items.length === 1 && items[0] === genericRequirement);
  for (const institution of institutions) {
    const specific = isGeneral
      ? catalogue.programs.find(
          (candidate) =>
            candidate.isListed !== false &&
            candidate.id !== program.id &&
            !catalogue.generalProgramIds.has(candidate.id) &&
            candidate.name === program.name &&
            candidate.institutionId === institution.id,
        )
      : undefined;
    const specificPath = specific ? `/programs/${encodeURIComponent(specific.id)}` : undefined;
    institutionProgramPaths[institution.id] =
      specificPath ?? `/institutions/${encodeURIComponent(institution.id)}`;

    const detail = program.institutionDetails?.find(
      (entry) => entry.institutionName === institution.name,
    );
    const requirements = catalogueAdmissionRequirements(
      detail?.specificAdmissionNotes,
      program.admissionRequirements,
    );
    const useSpecific =
      isGeneral && program.isListed !== false && !hasRequirements(requirements) && !!specific;
    const sourceProgram = useSpecific ? specific : program;
    const sourceDetail = useSpecific
      ? specific.institutionDetails?.find((entry) => entry.institutionName === institution.name)
      : detail;
    // Match the source page's calculation exactly; never combine rows' requirements or URLs.
    const sourceRequirements = useSpecific
      ? catalogueAdmissionRequirements(
          sourceDetail?.specificAdmissionNotes,
          sourceProgram.admissionRequirements,
        )
      : requirements;
    institutionRequirementSources[institution.id] = {
      sourceProgramId: sourceProgram.id,
      requirements:
        isGeneral && program.isListed !== false && !hasRequirements(sourceRequirements)
          ? []
          : sourceRequirements,
      officialUrl: officialUrl(sourceDetail?.programUrl, institution.id),
      fullDetailsPath: useSpecific ? specificPath : undefined,
    };
  }
  return {
    program,
    institutions,
    isGeneral,
    institutionProgramPaths,
    institutionRequirementSources,
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
  const ownPrograms = listedPrograms.filter(
    (program) =>
      !catalogue.generalProgramIds.has(program.id) && program.institutionId === institution.id,
  );
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
