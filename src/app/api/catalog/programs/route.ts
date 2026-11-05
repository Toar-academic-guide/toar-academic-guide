import { CatalogueQueryError, listCataloguePrograms } from '@/server/catalogue/queries';
import {
  buildCatalogueErrorResponse,
  buildCatalogueSuccessResponse,
  logCatalogueResponse,
} from '@/server/catalogue/routeMetrics';
import type { ApiEnvelope, CatalogueProgram } from '@/types/catalogue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAtMs = Date.now();

  try {
    const { data, meta } = await listCataloguePrograms({ includeBatchCCodeFallback: true });
    const { envelope, summary } = buildCatalogueSuccessResponse(
      'programs',
      data,
      meta,
      startedAtMs,
    );

    logCatalogueResponse('programs', envelope.meta, summary);

    return Response.json(envelope satisfies ApiEnvelope<CatalogueProgram[]>, {
      headers: {
        'Cache-Control':
          meta.catalogueSource === 'database' && !meta.fallbackReason
            ? 'public, s-maxage=120, stale-while-revalidate=600'
            : 'no-store',
      },
    });
  } catch (error) {
    const code =
      error instanceof CatalogueQueryError ? error.code : 'CATALOGUE_PROGRAMS_INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : 'Unable to load catalogue programs.';
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

    logCatalogueResponse('programs', envelope.meta, summary);

    return Response.json(envelope satisfies ApiEnvelope<CatalogueProgram[]>, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
