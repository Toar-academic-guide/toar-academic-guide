import { CatalogueQueryError, listCataloguePrograms } from '@/server/catalogue/queries';
import type { ApiEnvelope, CatalogueProgram } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await listCataloguePrograms();
    return Response.json({ data } satisfies ApiEnvelope<CatalogueProgram[]>);
  } catch (error) {
    const code =
      error instanceof CatalogueQueryError ? error.code : 'CATALOGUE_PROGRAMS_INTERNAL_ERROR';
    const message =
      error instanceof Error ? error.message : 'Unable to load catalogue programs.';

    return Response.json(
      {
        error: {
          code,
          message,
        },
      } satisfies ApiEnvelope<CatalogueProgram[]>,
      { status: 503 }
    );
  }
}
