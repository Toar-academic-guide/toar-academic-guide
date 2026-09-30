import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { requireOpsDatabaseUrl } from '@/env';
import * as schema from './schema';

declare global {
  var __toarAcademicGuideOpsDb__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getOpsDb() {
  if (!globalThis.__toarAcademicGuideOpsDb__) {
    const pool = new Pool({
      connectionString: requireOpsDatabaseUrl(),
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
