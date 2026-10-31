import { existsSync, readFileSync } from 'node:fs';

it('guards institution URLs on Mario-confirmed live values and retains URL rollback', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  expect(sql).toMatch(
    /UPDATE public\.institutions SET program_url = 'https:\/\/www\.aac\.ac\.il\/'[^;]*WHERE id = 'ashkelon' AND program_url = 'https:\/\/www\.ac\.il';/,
  );
  expect(sql).toContain("WHERE id = 'hadassah' AND program_url = 'https://www.macam.ac.il'");
  expect(sql).not.toContain('program_url IS NULL');
  expect(sql).toMatch(/SELECT id, name, domain, program_url FROM public\.institutions/);
  expect(sql).toMatch(
    /CREATE TABLE[^;]*institutions_before AS\s+SELECT \* FROM public\.institutions[^;]*'ashkelon'/,
  );
  expect(sql).toContain('program_url = b.program_url');
});

it('leaves every Technion row out of executable SQL because prod already has 92', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  const statements = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
  expect(statements).not.toContain('technion');
});

it('fails closed on the exact old value of each id-scoped UPDATE before any mutation', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  const statements = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
  const precheck = statements.match(/DO \$precheck\$[\s\S]*?END \$precheck\$;/)![0];
  expect(statements.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE;')).toBeLessThan(
    statements.indexOf(precheck),
  );
  expect(statements.indexOf(precheck)).toBeLessThan(statements.indexOf('UPDATE public.'));
  const updates = [...statements.matchAll(/UPDATE public\.(\w+) SET ([\s\S]*?)\s+WHERE ([^;]+);/g)];
  for (const [, table, , predicate] of updates) {
    const id = predicate.match(/^id = '([^']+)'/)?.[1];
    expect(id, predicate).toBeDefined();
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
    const checks = [
      ...precheck.matchAll(
        /IF NOT EXISTS \(SELECT 1 FROM public\.(\w+)\s+WHERE ([\s\S]*?)\) THEN\s+RAISE EXCEPTION '([^']+)'/g,
      ),
    ];
    expect(
      checks.some(
        ([, checkedTable, checkedPredicate, message]) =>
          checkedTable === table &&
          normalize(checkedPredicate) === normalize(predicate) &&
          message.includes(id!),
      ),
      `${table}:${id} needs its own exact-value RAISE`,
    ).toBe(true);
  }
  expect(updates).toHaveLength(14);
  expect(precheck).not.toMatch(/\b(?:name|domain|program_url|institution_name) IN\s*\(/);
  expect(precheck).toContain("RAISE EXCEPTION 'medicine:bgu:bgu:sekhem must be absent");
  expect(precheck).toContain("RAISE EXCEPTION 'medicine:bgu link must be absent");
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
