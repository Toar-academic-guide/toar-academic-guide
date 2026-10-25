import 'server-only';

import { getPublicProgramPageData } from '@/lib/publicCataloguePages';
import { canonicalProgramId } from '@/lib/seo/programAliases';

/** Use the same provider registry as programme pages, including legacy URLs. */
export async function getEnquiryTarget(programId: string, institutionId: string) {
  const canonicalId = canonicalProgramId(programId);
  const page =
    (await getPublicProgramPageData(canonicalId)) ??
    (canonicalId !== programId ? await getPublicProgramPageData(programId) : null);
  const institution = page?.institutions.find((entry) => entry.id === institutionId);
  return page && institution ? { program: page.program, institution } : null;
}
