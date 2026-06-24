import type { ApiEnvelope, ApiErrorPayload, ApiMetaPayload } from '@/types/catalogue';

type CatalogueCollectionKind = 'programs' | 'institutions';

interface CatalogueResponseMetricSummary {
  durationMs: number;
  responseBytes: number;
  status: number;
  resultCount?: number;
}

function buildMeasuredMeta(
  baseMeta: ApiMetaPayload | undefined,
  durationMs: number,
  responseBytes: number,
  kind?: CatalogueCollectionKind,
  resultCount?: number
): ApiMetaPayload {
  return {
    ...(baseMeta ?? {}),
    durationMs,
    responseBytes,
    ...(kind === 'programs' ? { programCount: resultCount } : {}),
    ...(kind === 'institutions' ? { institutionCount: resultCount } : {}),
  };
}

function measureEnvelope<T>(
  buildEnvelope: (responseBytes: number) => ApiEnvelope<T>
): {
  envelope: ApiEnvelope<T>;
  responseBytes: number;
} {
  let responseBytes = 0;

  while (true) {
    const envelope = buildEnvelope(responseBytes);
    const nextResponseBytes = Buffer.byteLength(JSON.stringify(envelope));

    if (nextResponseBytes === responseBytes) {
      return {
        envelope,
        responseBytes,
      };
    }

    responseBytes = nextResponseBytes;
  }
}

export function buildCatalogueSuccessResponse<T>(
  kind: CatalogueCollectionKind,
  data: T,
  meta: ApiMetaPayload,
  startedAtMs: number
): {
  envelope: ApiEnvelope<T>;
  summary: CatalogueResponseMetricSummary;
} {
  const durationMs = Math.max(0, Date.now() - startedAtMs);
  const resultCount = Array.isArray(data) ? data.length : undefined;
  const { envelope, responseBytes } = measureEnvelope((responseBytesValue) => ({
    data,
    meta: buildMeasuredMeta(meta, durationMs, responseBytesValue, kind, resultCount),
  }));

  return {
    envelope,
    summary: {
      durationMs,
      responseBytes,
      resultCount,
      status: 200,
    },
  };
}

export function buildCatalogueErrorResponse(
  error: ApiErrorPayload,
  meta: ApiMetaPayload | undefined,
  startedAtMs: number,
  status: number
): {
  envelope: ApiEnvelope<never>;
  summary: CatalogueResponseMetricSummary;
} {
  const durationMs = Math.max(0, Date.now() - startedAtMs);
  const { envelope, responseBytes } = measureEnvelope<never>((responseBytesValue) => ({
    error,
    ...(meta || durationMs >= 0
      ? {
          meta: buildMeasuredMeta(meta, durationMs, responseBytesValue),
        }
      : {}),
  }));

  return {
    envelope,
    summary: {
      durationMs,
      responseBytes,
      status,
    },
  };
}

export function logCatalogueResponse(
  kind: CatalogueCollectionKind,
  meta: ApiMetaPayload | undefined,
  summary: CatalogueResponseMetricSummary
) {
  console.info(
    '[catalogue-api]',
    JSON.stringify({
      kind,
      status: summary.status,
      durationMs: summary.durationMs,
      responseBytes: summary.responseBytes,
      resultCount: summary.resultCount,
      catalogueSourceMode: meta?.catalogueSourceMode,
      catalogueSource: meta?.catalogueSource,
      catalogueSnapshotCacheStatus: meta?.catalogueSnapshotCacheStatus,
      fallbackReason: meta?.fallbackReason,
    })
  );
}
