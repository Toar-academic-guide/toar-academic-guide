import 'server-only';
import { cache } from 'react';

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { catalogueAdmissionRequirements } from '@/lib/catalogueDisplayText';
import { officialUrl } from '@/lib/studyJourney';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { getRequirementsChecked, type RequirementsChecked } from '@/lib/requirementsChecked';
import { getCodeReviewedTechnionWinterVerification } from '@/data/admissions/technionProgramVerification';
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
  const currentProgramIds = new Set(programs.data.map((program) => program.id));
  const currentInstitutionIds = new Set(institutions.data.map((institution) => institution.id));
  const allPrograms = [
    ...programs.data,
    ...PUBLIC_PROGRAMS.filter((legacy) => !currentProgramIds.has(legacy.id)),
  ];
  const allInstitutions = [
    ...institutions.data,
    ...PUBLIC_INSTITUTIONS.filter((legacy) => !currentInstitutionIds.has(legacy.id)),
  ];
  // Seeded DB rows can carry an institutionId inferred from a legacy label.
  // Establish subject identity before resolving providers so subjects cannot
  // supply ownership evidence for themselves or other subjects.
  const institutionSpecificPrograms = allPrograms.filter(
    (program) =>
      program.isListed !== false && program.institutionId && !hasGeneralIdentity(program),
  );
  const institutionSpecificNames = new Set(
    institutionSpecificPrograms.map((program) => program.name),
  );
  const generalProgramIds = new Set(
    allPrograms
      .filter(
        (program) =>
          hasGeneralIdentity(program) &&
          (Object.values(program.thresholds ?? {}).some((threshold) => threshold != null) ||
            !!program.institutionDetails?.length ||
            institutionSpecificNames.has(program.name)),
      )
      .map((program) => program.id),
  );
  const institutionProgramsByName = new Map<string, Map<string, CatalogueProgram>>();
  for (const program of allPrograms) {
    if (
      program.isListed === false ||
      canonicalProgramId(program.id) !== program.id ||
      !program.institutionId ||
      generalProgramIds.has(program.id)
    )
      continue;
    const providers = institutionProgramsByName.get(program.name) ?? new Map();
    // Preserve the first listed match, as the page links did before indexing.
    if (!providers.has(program.institutionId)) providers.set(program.institutionId, program);
    institutionProgramsByName.set(program.name, providers);
  }
  const resolvedPrograms = allPrograms.map((program) => {
    if (!generalProgramIds.has(program.id)) return program;

    const thresholdIds = Object.entries(program.thresholds ?? {})
      .filter(([, threshold]) => threshold != null)
      .map(([id]) => id);
    const detailNames = program.institutionDetails?.map((detail) => detail.institutionName) ?? [];
    const providerIds = new Set([
      ...thresholdIds,
      ...(institutionProgramsByName.get(program.name)?.keys() ?? []),
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
    institutionProgramsByName,
  };
});

/**
 * The institution programme pages a general subject page links to, by
 * institution. A subject with none links to institutions only.
 */
export function subjectProgramPages(
  catalogue: Awaited<ReturnType<typeof loadPublicCatalogue>>,
  program: CatalogueProgram,
): Map<string, CatalogueProgram> {
  const pages = new Map<string, CatalogueProgram>();
  for (const institution of catalogue.institutions) {
    if (!program.linkedInstitutionIds.includes(institution.id)) continue;
    const specific = catalogue.institutionProgramsByName.get(program.name)?.get(institution.id);
    if (specific) pages.set(institution.id, specific);
  }
  return pages;
}

export interface PublicProgramPageData {
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  isGeneral: boolean;
  institutionProgramPaths: Record<string, string>;
}

interface PublicProgramRequirementSource {
  program: CatalogueProgram;
  sourceProgramId: string;
  requirements: string[];
  officialUrl?: string;
  officialCalculatorUrl?: string;
  fullDetailsPath?: string;
  checked?: RequirementsChecked;
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
  const programPages = isGeneral ? subjectProgramPages(catalogue, program) : new Map();
  const institutionProgramPaths: Record<string, string> = {};
  for (const institution of institutions) {
    const specific = programPages.get(institution.id);
    institutionProgramPaths[institution.id] = specific
      ? `/programs/${encodeURIComponent(specific.id)}`
      : `/institutions/${encodeURIComponent(institution.id)}`;
  }
  return {
    program,
    institutions,
    isGeneral,
    institutionProgramPaths,
  };
}

/** Presentation-only summaries; metadata and JSON-LD need only the page's relations. */
export async function getPublicProgramRequirementSources({
  program,
  institutions,
  isGeneral,
  institutionProgramPaths,
}: PublicProgramPageData): Promise<Record<string, PublicProgramRequirementSource>> {
  const catalogue = await loadPublicCatalogue();
  const institutionRequirementSources: Record<string, PublicProgramRequirementSource> = {};
  const genericRequirement = catalogueAdmissionRequirements()[0];
  const hasRequirements = (items: string[]) =>
    !(items.length === 1 && items[0] === genericRequirement);
  for (const institution of institutions) {
    const canonicalId = canonicalProgramId(program.id);
    const requirementsProgram =
      institution.id === 'colman' && ['colmgmt_law', 'colmgmt_business'].includes(canonicalId)
        ? (catalogue.programs.find((candidate) => candidate.id === canonicalId) ?? program)
        : program;
    const specific = isGeneral
      ? catalogue.institutionProgramsByName.get(program.name)?.get(institution.id)
      : undefined;

    const detail = requirementsProgram.institutionDetails?.find(
      (entry) => entry.institutionName === institution.name,
    );
    const requirements = catalogueAdmissionRequirements(
      detail?.specificAdmissionNotes,
      requirementsProgram.admissionRequirements,
      requirementsProgram.id,
    );
    const useSpecific =
      isGeneral && program.isListed !== false && !hasRequirements(requirements) && !!specific;
    const sourceProgram = useSpecific ? specific : requirementsProgram;
    const sourceDetail = useSpecific
      ? specific.institutionDetails?.find((entry) => entry.institutionName === institution.name)
      : detail;
    // Match the source page's calculation exactly; never combine rows' requirements or URLs.
    const sourceRequirements = useSpecific
      ? catalogueAdmissionRequirements(
          sourceDetail?.specificAdmissionNotes,
          sourceProgram.admissionRequirements,
          sourceProgram.id,
        )
      : requirements;
    // The reviewed winter registry also backs evaluator replay. Keep this
    // presentation independent of stale catalogue rows in shared-DB previews.
    const winterCutoff = getCodeReviewedTechnionWinterVerification(
      `${sourceProgram.id}__${institution.id}`,
    )?.contract.calculation.cutoff?.acceptance;
    const displayRequirements =
      winterCutoff == null
        ? sourceRequirements
        : [`בחורף תשפ"ז: סכם ${winterCutoff}`, ...sourceRequirements];
    institutionRequirementSources[institution.id] = {
      program: sourceProgram,
      sourceProgramId: sourceProgram.id,
      requirements:
        isGeneral && program.isListed !== false && !hasRequirements(displayRequirements)
          ? []
          : displayRequirements,
      officialUrl: officialUrl(sourceDetail?.programUrl, institution.id),
      ...([
        'tlvyaffo_cs',
        'mta_cs',
        'tlvyaffo_nursing',
        'tlvyaffo_business',
        'colmgmt_law',
        'colmgmt_business',
        'colmgmt_economics',
        'colmgmt_cs',
      ].includes(sourceProgram.id) && sourceDetail?.officialCalculatorUrl
        ? { officialCalculatorUrl: officialUrl(sourceDetail.officialCalculatorUrl, institution.id) }
        : {}),
      fullDetailsPath: useSpecific ? institutionProgramPaths[institution.id] : undefined,
      checked: getRequirementsChecked(
        sourceProgram.id,
        institution,
        sourceDetail?.specificAdmissionNotes,
      ),
    };
  }
  return institutionRequirementSources;
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
      canonicalProgramId(program.id) === program.id &&
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
    if (
      ownPrograms.some(
        (own) =>
          own.name === program.category &&
          (program.name.startsWith(`${own.name} `) || program.name.startsWith(`${own.name}ו`)),
      )
    )
      return false;
    names.add(program.name);
    return true;
  });
  return {
    institution,
    programs: [...ownPrograms, ...generalPrograms],
  };
}
