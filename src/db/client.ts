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
      max: 1,
      prepare: false,
    });
    globalThis.__toarAcademicGuideDb__ = drizzle(sql, { schema });
  }

  return globalThis.__toarAcademicGuideDb__;
}
