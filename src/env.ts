const DATABASE_URL_KEY = 'DATABASE_URL';

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
