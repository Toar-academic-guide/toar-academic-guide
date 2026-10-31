import { existsSync, readFileSync } from 'node:fs';

it('sets the Ashkelon website only when its stored URL is NULL and retains URL rollback', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  expect(sql).toMatch(
    /UPDATE public\.institutions SET program_url = 'https:\/\/www\.aac\.ac\.il\/'[^;]*WHERE id = 'ashkelon' AND program_url IS NULL;/,
  );
  expect(sql).toMatch(/SELECT id, name, domain, program_url FROM public\.institutions/);
  expect(sql).toMatch(
    /CREATE TABLE[^;]*institutions_before AS\s+SELECT \* FROM public\.institutions[^;]*'ashkelon'/,
  );
  expect(sql).toContain('program_url = b.program_url');
});

it('keeps the Hadassah/HUJI packet rollback-only with guarded legacy cutoffs and nullable preflight', () => {
  const path = new URL(
    '../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql',
    import.meta.url,
  );
  expect(existsSync(path)).toBe(true);
  const sql = readFileSync(path, 'utf8');
  const executable = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '')
    .trim();
  expect(executable).toMatch(/ROLLBACK;$/);
  expect(executable).not.toMatch(/\bCOMMIT\s*;/);
  expect(executable).toContain('information_schema.columns');
  expect(executable).toContain("is_nullable = 'YES'");
  expect(executable).toContain('RAISE EXCEPTION');
  expect(executable).toMatch(
    /WHERE id = 'huji_biology:huji:huji:sekhem' AND threshold_value = 640/,
  );
  expect(executable).toMatch(/ON CONFLICT DO NOTHING/);
  expect(executable).toContain("domain = 'ac.il'");
  expect(executable).toContain("institution_name = 'המרכז האקדמי הרב-תחומי ירושלים'");
  expect(sql).toContain('Mario runs after merge and prod READY');
});
