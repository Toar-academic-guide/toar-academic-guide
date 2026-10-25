import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { loadProductionSchemaSnapshot } from './production-schema-snapshot.mjs';

const definition = readFileSync(
  'src/db/migrations/0042_store_enquiry_createdat_default.sql',
  'utf8',
);

describe('operational function body snapshot', () => {
  it('requests pg_get_functiondef and retains the body used by the CLI assessment', async () => {
    const sql = vi.fn(async (parts: TemplateStringsArray) => {
      const query = parts.join('?');
      if (!query.includes('as function_name')) return [];
      expect(query).toContain('pg_get_functiondef(p.oid) end as function_definition');
      return [
        {
          function_name: 'store_enquiry(jsonb)',
          function_config: ['search_path=""'],
          function_definition: definition,
          security_definer: true,
          execute_roles: ['app_runtime'],
        },
      ];
    });
    const snapshot = await loadProductionSchemaSnapshot(sql);
    expect(snapshot.functionDefinitions).toEqual({ 'store_enquiry(jsonb)': definition });
  });
});
