import type { PoolConfig } from 'pg';

import { SUPABASE_ROOT_CA } from './supabaseRootCa';

export function supabaseConnectionOptions(connectionString: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    // pg also accepts connection strings outside the URL parser's syntax.
    return { connectionString };
  }
  const mode = url.searchParams.get('sslmode');
  if (
    (/^db\.[a-z0-9]+\.supabase\.co$/.test(url.hostname) ||
      /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)) &&
    mode &&
    ['require', 'prefer', 'verify-ca', 'verify-full'].includes(mode) &&
    !['sslrootcert', 'sslcert', 'sslkey', 'ssl'].some((key) => url.searchParams.has(key))
  ) {
    // pg's URL parser otherwise replaces the explicit CA below with an empty
    // ssl object. Keep certificate AND hostname verification enabled.
    url.searchParams.delete('sslmode');
    return {
      connectionString: url.toString(),
      ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
    };
  }
  return { connectionString };
}
