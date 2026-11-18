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
  expect(updates).toHaveLength(12);
  expect(precheck).not.toMatch(/\b(?:name|domain|program_url|institution_name) IN\s*\(/);
});

it('omits the absent Hadassah programme and all duplicate-institution rows from the packet', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  expect(sql).not.toContain('hadassah_general_academic');
  expect(sql).not.toMatch(/UPDATE public\.programs|programs_before|programs_after/);
  expect(sql).not.toContain('mon_12220685569');
  expect(sql).not.toContain('bgu_medicine:');
});

it('preserves existing matching BGU 735 as a no-op and rolls back only newly inserted BGU rows', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  const precheck = sql.match(/DO \$precheck\$[\s\S]*?END \$precheck\$;/)![0];
  expect(precheck).toMatch(
    /AND ROW\(t\.id, t\.program_id, t\.institution_id, t\.university_id, t\.threshold_kind, t\.threshold_value\)\s+IS DISTINCT FROM ROW\('medicine:bgu:bgu:sekhem', 'medicine', 'bgu', 'bgu', 'sekhem', 735::numeric\)\) THEN\s+RAISE EXCEPTION/,
  );
  expect(precheck).not.toContain('must be absent');
  expect(precheck).not.toMatch(/IF EXISTS \(SELECT 1 FROM public\.program_institutions/);
  expect(sql).toMatch(
    /INSERT INTO public\.admission_thresholds[^;]+WHERE NOT EXISTS \([^;]+ON CONFLICT DO NOTHING\s+RETURNING \*/,
  );
  expect(sql).toMatch(
    /INSERT INTO public\.program_institutions[^;]+WHERE NOT EXISTS \([^;]+ON CONFLICT DO NOTHING\s+RETURNING \*/,
  );
  expect(sql).toMatch(
    /DELETE FROM public\.admission_thresholds t[^;]+NOT EXISTS \(SELECT 1 FROM hadassah_huji_20261031\.thresholds_before b WHERE b\.id = t\.id\)/,
  );
  expect(sql).toMatch(
    /DELETE FROM public\.program_institutions t[^;]+NOT EXISTS \(SELECT 1 FROM hadassah_huji_20261031\.links_before\)/,
  );
  expect(sql).toMatch(
    /UPDATE public\.admission_thresholds t SET threshold_value = b\.threshold_value[^;]+AND t\.id <> 'medicine:bgu:bgu:sekhem';/,
  );
});

it('tracks actual inserted rows and restores changed rows only at the packet-written values', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  expect(sql).toContain('CREATE TABLE hadassah_huji_20261031.inserted_rows');
  expect(sql.match(/INSERT INTO hadassah_huji_20261031\.inserted_rows/g)).toHaveLength(2);
  expect(sql.match(/SELECT '[^']+', '[^']+', to_jsonb\(inserted\) FROM inserted;/g)).toHaveLength(
    2,
  );
  const restore = sql.slice(sql.indexOf('DO $rollback_guard$'));
  expect(restore).toContain("RAISE EXCEPTION 'Post-application drift in %");
  expect(restore).toMatch(
    /UPDATE public\.admission_thresholds t[^;]+WHERE t\.id = b\.id AND t\.id = a\.id\s+AND t\.threshold_value IS NOT DISTINCT FROM a\.threshold_value/,
  );
  expect(restore).toMatch(
    /UPDATE public\.institutions t[^;]+WHERE t\.id = b\.id AND t\.id = a\.id\s+AND t\.name IS NOT DISTINCT FROM a\.name\s+AND t\.domain IS NOT DISTINCT FROM a\.domain\s+AND t\.program_url IS NOT DISTINCT FROM a\.program_url/,
  );
  for (const table of ['admission_thresholds', 'program_institutions']) {
    const deletion = restore.match(new RegExp(`DELETE FROM public\\.${table} t[^;]+;`))![0];
    expect(deletion).toContain('hadassah_huji_20261031.inserted_rows i');
    expect(deletion).toContain('to_jsonb(t) = i.row_data');
    expect(deletion).toContain(`i.table_name = '${table}'`);
  }
});

it('refuses deleting an inserted BGU link while any medicine BGU threshold remains', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  const guard = sql.match(/DO \$restore_link_guard\$[\s\S]*?END \$restore_link_guard\$;/)?.[0];
  expect(guard).toBeDefined();
  expect(guard).toMatch(/inserted_rows[^;]+table_name = 'program_institutions'/);
  expect(guard).toMatch(
    /EXISTS \(SELECT 1 FROM public\.admission_thresholds\s+WHERE program_id = 'medicine' AND institution_id = 'bgu'\) THEN\s+RAISE EXCEPTION/,
  );
  expect(sql.indexOf(guard!)).toBeLessThan(sql.indexOf('DELETE FROM public.program_institutions'));
});

it('verifies every main-path target and its row counts before the default ROLLBACK', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');
  const verify = sql.match(/DO \$verify\$[\s\S]*?END \$verify\$;/)![0];
  expect(verify).toMatch(/count\(\*\)[\s\S]+<> 8 THEN\s+RAISE EXCEPTION/);
  expect(verify).toMatch(/count\(\*\) FROM public\.institutions[^;]+<> 2 THEN\s+RAISE EXCEPTION/);
  expect(verify).toMatch(
    /count\(\*\) FROM public\.program_institutions[^;]+<> 1 THEN\s+RAISE EXCEPTION/,
  );
  expect(verify).toContain("name = 'המרכז האקדמי הרב תחומי ירושלים'");
  expect(verify).toContain("program_url = 'https://www.jmc.ac.il/'");
  expect(sql.indexOf(verify)).toBeLessThan(sql.indexOf('ROLLBACK;'));
  expect(sql.indexOf(verify)).toBeGreaterThan(sql.lastIndexOf('UPDATE public.'));
});

it('verifies restored backups, deleted inserts and untouched existing BGU rows before restore COMMIT', () => {
  const sql = readFileSync(
    new URL('../../../supabase/packets/2026-10-31-hadassah-huji-thresholds.sql', import.meta.url),
    'utf8',
  );
  const verify = sql.match(/DO \$verify_restore\$[\s\S]*?END \$verify_restore\$;/)?.[0];
  expect(verify).toBeDefined();
  expect(verify).toContain('thresholds_before');
  expect(verify).toContain('institutions_before');
  expect(verify).toContain('links_before');
  expect(verify).toContain('inserted_rows');
  expect(verify).toMatch(/IS DISTINCT FROM[^;]+THEN\s+RAISE EXCEPTION/);
  expect(verify).toMatch(/RAISE EXCEPTION 'Inserted row remains/);
  expect(sql.indexOf(verify!)).toBeGreaterThan(sql.lastIndexOf('UPDATE public.'));
  expect(sql.slice(sql.indexOf(verify!))).toMatch(/END \$verify_restore\$;\s+COMMIT;/);
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
  expect(executable).toContain("WHERE id = 'hadassah' AND name = 'המרכז האקדמי הרב-תחומי ירושלים'");
  expect(sql).toContain('Mario runs after merge and prod READY');
});
