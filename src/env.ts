import type { CatalogueSourceMode } from '@/types/catalogue';

const DATABASE_URL_KEY = 'DATABASE_URL';
const CATALOGUE_SOURCE_MODE_KEY = 'CATALOGUE_SOURCE_MODE';
const VERCEL_ENV_KEY = 'VERCEL_ENV';
const CATALOGUE_SOURCE_MODES = ['auto', 'database', 'static'] as const;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(readEnv(DATABASE_URL_KEY));
}

export function requireDatabaseUrl(): string {
  const value = readEnv(DATABASE_URL_KEY);
  if (!value) {
    throw new Error(
      'Missing DATABASE_URL. Set DATABASE_URL in your environment before using DB-backed catalogue features.'
    );
  }

  return value;
}

export function getCatalogueSourceMode(): CatalogueSourceMode {
  const value = readEnv(CATALOGUE_SOURCE_MODE_KEY);
  if (!value) {
    return 'auto';
  }

  if ((CATALOGUE_SOURCE_MODES as readonly string[]).includes(value)) {
    return value as CatalogueSourceMode;
  }

  throw new Error(
    `Invalid CATALOGUE_SOURCE_MODE "${value}". Expected one of: ${CATALOGUE_SOURCE_MODES.join(', ')}.`
  );
}

export function isProductionRuntime(): boolean {
  const vercelEnv = readEnv(VERCEL_ENV_KEY);
  if (vercelEnv) {
    return vercelEnv === 'production';
  }

  return process.env.NODE_ENV === 'production';
}
