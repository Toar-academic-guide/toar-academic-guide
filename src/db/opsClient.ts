import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

import { requireOpsDatabaseUrl } from '@/env';
import * as schema from './schema';
import { SUPABASE_ROOT_CA } from './supabaseRootCa';

declare global {
  var __toarAcademicGuideOpsDb__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getOpsDb() {
  if (!globalThis.__toarAcademicGuideOpsDb__) {
    const pool = new Pool({
      ...operationalConnectionOptions(requireOpsDatabaseUrl()),
      // Keep this below the production ops_readonly role connection limit.
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 20000,
      pipeline: false,
    });
    pool.on('error', () =>
      console.error('[ops-database] Idle connection failed; pool will replace it.'),
    );
    globalThis.__toarAcademicGuideOpsDb__ = drizzle(pool, { schema });
  }

  return globalThis.__toarAcademicGuideOpsDb__;
}

function operationalConnectionOptions(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const mode = url.searchParams.get('sslmode');
  if (
    /^db\.[a-z0-9]+\.supabase\.co$/.test(url.hostname) &&
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
