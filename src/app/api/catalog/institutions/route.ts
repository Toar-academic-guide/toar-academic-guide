import { CatalogueQueryError, listCatalogueInstitutions } from '@/server/catalogue/queries';
import type { ApiEnvelope, CatalogueInstitution } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await listCatalogueInstitutions();
    return Response.json({ data } satisfies ApiEnvelope<CatalogueInstitution[]>);
  } catch (error) {
    const code =
      error instanceof CatalogueQueryError ? error.code : 'CATALOGUE_INSTITUTIONS_INTERNAL_ERROR';
    const message =
      error instanceof Error ? error.message : 'Unable to load catalogue institutions.';

    return Response.json(
      {
        error: {
          code,
          message,
        },
      } satisfies ApiEnvelope<CatalogueInstitution[]>,
      { status: 503 }
    );
  }
}
