import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { requireDatabaseUrl } from '@/env';
import * as schema from './schema';

declare global {
  var __toarAcademicGuideDb__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getDb() {
  if (!globalThis.__toarAcademicGuideDb__) {
    const sql = postgres(requireDatabaseUrl(), {
      // Keep the app-side pool intentionally small for request-scoped/serverless traffic.
      // `prepare: false` stays compatible with transaction-pooling URLs used by transient runtimes.
      max: 1,
      prepare: false,
    });
    globalThis.__toarAcademicGuideDb__ = drizzle(sql, { schema });
  }

  return globalThis.__toarAcademicGuideDb__;
}
