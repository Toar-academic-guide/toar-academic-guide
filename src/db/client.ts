import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { requireDatabaseUrl } from '@/env';
import * as schema from './schema';

declare global {
  var __toarAcademicGuideDb__: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var __toarAcademicGuideSql__: postgres.Sql | undefined;
}

export function getDb() {
  if (!globalThis.__toarAcademicGuideDb__) {
    const sql = postgres(requireDatabaseUrl(), {
      // Keep the app-side pool intentionally small for request-scoped/serverless traffic.
      // `prepare: false` stays compatible with transaction-pooling URLs used by transient runtimes.
      max: 1,
      prepare: false,
    });
    globalThis.__toarAcademicGuideSql__ = sql;
    globalThis.__toarAcademicGuideDb__ = drizzle(sql, { schema });
  }

  return globalThis.__toarAcademicGuideDb__;
}

/** Close the process-local pool used by one-off scripts and test runners. */
export async function closeDb() {
  const sql = globalThis.__toarAcademicGuideSql__;
  if (!sql) {
    return;
  }

  await sql.end({ timeout: 5 });
  globalThis.__toarAcademicGuideSql__ = undefined;
  globalThis.__toarAcademicGuideDb__ = undefined;
}
