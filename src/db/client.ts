import { drizzle, type NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { Pool } from 'pg';

import { requireDatabaseUrl } from '@/env';
import * as schema from './schema';

// Existing isolated transaction fixtures also use Drizzle's postgres.js adapter.
export type AppDatabase = PgDatabase<
  NodePgQueryResultHKT | PostgresJsQueryResultHKT,
  typeof schema
>;

declare global {
  var __toarAcademicGuideDb__: AppDatabase | undefined;
  var __toarAcademicGuidePool__: Pool | undefined;
}

export function getDb(): AppDatabase {
  if (!globalThis.__toarAcademicGuideDb__) {
    const pool = new Pool({
      connectionString: requireDatabaseUrl(),
      // Queue overlapping requests: postgres.js pipelining can hang on Supavisor.
      max: 1,
      pipeline: false,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 20000,
    });
    pool.on('error', () =>
      console.error('[database] Idle connection failed; pool will replace it.'),
    );
    globalThis.__toarAcademicGuidePool__ = pool;
    globalThis.__toarAcademicGuideDb__ = drizzle(pool, { schema });
  }

  return globalThis.__toarAcademicGuideDb__;
}

/** Close the process-local pool used by one-off scripts and test runners. */
export async function closeDb() {
  const pool = globalThis.__toarAcademicGuidePool__;
  if (!pool) {
    return;
  }

  await pool.end();
  globalThis.__toarAcademicGuidePool__ = undefined;
  globalThis.__toarAcademicGuideDb__ = undefined;
}
