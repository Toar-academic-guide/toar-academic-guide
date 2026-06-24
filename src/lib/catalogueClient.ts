import type {
  ApiEnvelope,
  ApiMetaPayload,
  CatalogueInstitution,
  CatalogueProgram,
} from '@/types/catalogue';

const JSON_HEADERS = {
  Accept: 'application/json',
};

export class CatalogueApiError extends Error {
  code: string;
  details: string[];
  meta?: ApiMetaPayload;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      code?: string;
      details?: string[];
      meta?: ApiMetaPayload;
    },
  ) {
    super(message);
    this.name = 'CatalogueApiError';
    this.code = options?.code ?? 'CATALOGUE_REQUEST_FAILED';
    this.cause = options?.cause;
    this.details = options?.details ?? [];
    this.meta = options?.meta;
  }
}

async function fetchEnvelope<T>(input: RequestInfo | URL): Promise<ApiEnvelope<T>> {
  try {
    const response = await fetch(input, {
      headers: JSON_HEADERS,
      cache: 'no-store',
    });

    let payload: ApiEnvelope<T> | undefined;
    try {
      payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
      payload = undefined;
    }

    if (!response.ok || payload?.data === undefined) {
      throw new CatalogueApiError(payload?.error?.message ?? 'Catalogue request failed.', {
        code: payload?.error?.code,
        details: payload?.error?.details,
        meta: payload?.meta,
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof CatalogueApiError) {
      throw error;
    }

    throw new CatalogueApiError('Unable to reach the catalogue API.', {
      cause: error,
    });
  }
}

export async function fetchCataloguePrograms(): Promise<CatalogueProgram[]> {
  const payload = await fetchEnvelope<CatalogueProgram[]>('/api/catalog/programs');
  return payload.data ?? [];
}

export async function fetchCatalogueInstitutions(): Promise<CatalogueInstitution[]> {
  const payload = await fetchEnvelope<CatalogueInstitution[]>('/api/catalog/institutions');
  return payload.data ?? [];
}
