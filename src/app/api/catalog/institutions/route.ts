import { CatalogueQueryError, listCatalogueInstitutions } from '@/server/catalogue/queries';
import type { ApiEnvelope, CatalogueInstitution } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, meta } = await listCatalogueInstitutions();
    return Response.json({ data, meta } satisfies ApiEnvelope<CatalogueInstitution[]>);
  } catch (error) {
    const code =
      error instanceof CatalogueQueryError ? error.code : 'CATALOGUE_INSTITUTIONS_INTERNAL_ERROR';
    const message =
      error instanceof Error ? error.message : 'Unable to load catalogue institutions.';
    const details = error instanceof CatalogueQueryError ? error.details : undefined;
    const meta = error instanceof CatalogueQueryError ? error.meta : undefined;
    const status = error instanceof CatalogueQueryError ? error.status : 503;

    return Response.json(
      {
        error: {
          code,
          message,
          ...(details && details.length > 0 ? { details } : {}),
        },
        ...(meta ? { meta } : {}),
      } satisfies ApiEnvelope<CatalogueInstitution[]>,
      { status }
    );
  }
}
