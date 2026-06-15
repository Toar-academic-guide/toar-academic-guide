import { CatalogueQueryError, listCataloguePrograms } from '@/server/catalogue/queries';
import type { ApiEnvelope, CatalogueProgram } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, meta } = await listCataloguePrograms();
    return Response.json({ data, meta } satisfies ApiEnvelope<CatalogueProgram[]>);
  } catch (error) {
    const code =
      error instanceof CatalogueQueryError ? error.code : 'CATALOGUE_PROGRAMS_INTERNAL_ERROR';
    const message =
      error instanceof Error ? error.message : 'Unable to load catalogue programs.';
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
      } satisfies ApiEnvelope<CatalogueProgram[]>,
      { status }
    );
  }
}
