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
      // Dashboard reads are independent. Keep the pool small, but avoid serializing
      // the whole report through a single Supabase pooler connection.
      max: 4,
      connect_timeout: 5,
      idle_timeout: 20,
      prepare: false,
    });
    globalThis.__toarAcademicGuideOpsDb__ = drizzle(sql, { schema });
  }

  return globalThis.__toarAcademicGuideOpsDb__;
}
