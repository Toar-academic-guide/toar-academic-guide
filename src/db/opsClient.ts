import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { requireOpsDatabaseUrl } from '@/env';
import * as schema from './schema';

declare global {
  var __toarAcademicGuideOpsDb__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getOpsDb() {
  if (!globalThis.__toarAcademicGuideOpsDb__) {
    const sql = postgres(requireOpsDatabaseUrl(), {
      // Internal reporting should stay compatible with Supabase pooler URLs and avoid
      // building a second large app-side pool.
      max: 1,
      prepare: false,
    });
    globalThis.__toarAcademicGuideOpsDb__ = drizzle(sql, { schema });
  }

  return globalThis.__toarAcademicGuideOpsDb__;
}
