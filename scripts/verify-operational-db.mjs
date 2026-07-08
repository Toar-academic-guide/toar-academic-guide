import postgres from 'postgres';

const REQUIRED_TABLES = [
  'institutions',
  'programs',
  'program_institutions',
  'admission_requirements',
  'admission_thresholds',
  'source_urls',
  'university_calculator_configs',
  'admission_facts',
  'admissions_source_candidates',
  'source_freshness_states',
];

function requireConnectionUrl() {
  const value = process.env.OPS_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error('A database connection URL is required for operational DB verification.');
  }
  return value;
}

async function main() {
  const sql = postgres(requireConnectionUrl(), {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false,
  });

  try {
    const rows = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any(${REQUIRED_TABLES})
      order by table_name
    `;
    const present = new Set(rows.map((row) => row.table_name));
    const missing = REQUIRED_TABLES.filter((tableName) => !present.has(tableName));

    if (missing.length > 0) {
      throw new Error(`Missing required public tables: ${missing.join(', ')}`);
    }

    const counts = [];
    for (const tableName of REQUIRED_TABLES.slice(0, 7)) {
      const [row] = await sql.unsafe(
        `select count(*)::int as row_count from public.${tableName}`,
      );
      const rowCount = Number(row.row_count);
      counts.push({ tableName, rowCount });
      if (rowCount <= 0) {
        throw new Error(`Expected public.${tableName} to contain rows, found ${rowCount}.`);
      }
    }

    const representativePairs = await sql`
      select pi.program_id, pi.institution_id
      from public.program_institutions pi
      where (pi.program_id, pi.institution_id) in (
        ('haifa_cs', 'haifa'),
        ('tau_datascience', 'tau')
      )
      order by pi.program_id, pi.institution_id
    `;

    if (representativePairs.length === 0) {
      throw new Error('Expected at least one representative admissions pair to exist.');
    }

    console.log(
      JSON.stringify(
        {
          verified: true,
          tables: [...present].sort(),
          counts,
          representativePairs,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
