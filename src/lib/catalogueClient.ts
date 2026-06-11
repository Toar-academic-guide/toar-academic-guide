import { allPrograms } from '@/data/degrees';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { ApiEnvelope, CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const JSON_HEADERS = {
  Accept: 'application/json',
};

async function fetchEnvelope<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input, {
    headers: JSON_HEADERS,
    cache: 'no-store',
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Catalogue request failed.');
  }

  return payload.data;
}

export async function fetchCataloguePrograms(): Promise<CatalogueProgram[]> {
  try {
    return await fetchEnvelope<CatalogueProgram[]>('/api/catalog/programs');
  } catch {
    return getStaticCataloguePrograms(allPrograms);
  }
}

export async function fetchCatalogueInstitutions(): Promise<CatalogueInstitution[]> {
  try {
    return await fetchEnvelope<CatalogueInstitution[]>('/api/catalog/institutions');
  } catch {
    return getStaticCatalogueInstitutions();
  }
}
