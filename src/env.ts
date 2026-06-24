import type { CatalogueSourceMode } from '@/types/catalogue';

const DATABASE_URL_KEY = 'DATABASE_URL';
const OPS_DATABASE_URL_KEY = 'OPS_DATABASE_URL';
const CATALOGUE_SOURCE_MODE_KEY = 'CATALOGUE_SOURCE_MODE';
const CATALOGUE_SOURCE_MODES = ['auto', 'database', 'static'] as const;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(readEnv(DATABASE_URL_KEY));
}

export function requireDatabaseUrl(): string {
  const value = readRequiredDatabaseUrl(DATABASE_URL_KEY);
  if (isProductionRuntime()) {
    assertProductionDatabaseUrlLeastPrivilege(value);
  }

  return value;
}

export function requireOpsDatabaseUrl(): string {
  const value = readRequiredDatabaseUrl(OPS_DATABASE_URL_KEY);
  if (isProductionRuntime()) {
    assertProductionDatabaseUrlLeastPrivilege(value);
  }

  return value;
}

function readRequiredDatabaseUrl(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `Missing ${name}. Set ${name} in your environment before using DB-backed features that require it.`
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
  return process.env.NODE_ENV === 'production';
}

function isSupabaseDatabaseHost(hostname: string): boolean {
  return hostname.endsWith('.supabase.co') || hostname.endsWith('.pooler.supabase.com');
}

function getDatabaseRoleFromUsername(username: string): string {
  return decodeURIComponent(username).split('.')[0] ?? '';
}

export function assertProductionDatabaseUrlLeastPrivilege(databaseUrl: string): void {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    return;
  }

  if (!isSupabaseDatabaseHost(parsed.hostname)) {
    return;
  }

  if (getDatabaseRoleFromUsername(parsed.username) === 'postgres') {
    throw new Error(
      'Unsafe DATABASE_URL for production runtime: Supabase app traffic must not authenticate as postgres. Use a dedicated runtime role such as app_runtime with a pooled connection string.'
    );
  }
}
