import { CatalogueQueryError, listCatalogueInstitutions } from '@/server/catalogue/queries';
import {
  buildCatalogueErrorResponse,
  buildCatalogueSuccessResponse,
  logCatalogueResponse,
} from '@/server/catalogue/routeMetrics';
import type { ApiEnvelope, CatalogueInstitution } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAtMs = Date.now();

  try {
    const { data, meta } = await listCatalogueInstitutions();
    const { envelope, summary } = buildCatalogueSuccessResponse(
      'institutions',
      data,
      meta,
      startedAtMs,
    );

    logCatalogueResponse('institutions', envelope.meta, summary);

    return Response.json(envelope satisfies ApiEnvelope<CatalogueInstitution[]>);
  } catch (error) {
    const code =
      error instanceof CatalogueQueryError ? error.code : 'CATALOGUE_INSTITUTIONS_INTERNAL_ERROR';
    const message =
      error instanceof Error ? error.message : 'Unable to load catalogue institutions.';
    const details = error instanceof CatalogueQueryError ? error.details : undefined;
    const meta = error instanceof CatalogueQueryError ? error.meta : undefined;
    const status = error instanceof CatalogueQueryError ? error.status : 503;
    const { envelope, summary } = buildCatalogueErrorResponse(
      {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
      meta,
      startedAtMs,
      status,
    );

    logCatalogueResponse('institutions', envelope.meta, summary);

    return Response.json(envelope satisfies ApiEnvelope<CatalogueInstitution[]>, { status });
  }
}
