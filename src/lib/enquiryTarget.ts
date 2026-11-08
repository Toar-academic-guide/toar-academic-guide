import 'server-only';
import { canonicalInstitutionId } from '@/data/institutionAliases';

import { getPublicProgramPageData } from '@/lib/publicCataloguePages';
import { canonicalProgramId } from '@/lib/seo/programAliases';

/** Use the same provider registry as programme pages, including legacy URLs. */
export async function getEnquiryTarget(programId: string, institutionId: string) {
  const canonicalId = canonicalProgramId(programId);
  // Preserve enquiry links emitted before these schools received distinct IDs.
  // Scope the legacy institution lookup to its programme: `tiltan` is also a
  // separate design college and must not become a global institution alias.
  const resolvedInstitutionId =
    programId === 'givat_washington_medicine' && institutionId === 'givat_washington'
      ? 'mon_12341128804'
      : programId === 'tiltan_medicine' && institutionId === 'tiltan'
        ? 'mon_12341137918'
        : canonicalInstitutionId(institutionId);
  const page =
    (await getPublicProgramPageData(canonicalId)) ??
    (canonicalId !== programId ? await getPublicProgramPageData(programId) : null);
  const institution = page?.institutions.find((entry) => entry.id === resolvedInstitutionId);
  return page && institution ? { program: page.program, institution } : null;
}
