import postgres from 'postgres';

const REQUIRED_TABLES = [
  'admission_alternative_paths',
  'admission_facts',
  'admission_requirements',
  'admission_thresholds',
  'admissions_source_candidates',
  'institutions',
  'program_institutions',
  'programs',
  'source_freshness_checks',
  'source_freshness_states',
  'source_urls',
  'university_calculator_configs',
];

const REQUIRED_ROW_COUNT_TABLES = [
  'institutions',
  'programs',
  'program_institutions',
  'admission_requirements',
  'admission_thresholds',
  'source_urls',
  'university_calculator_configs',
];

const OPERATIONAL_READ_GRANTS = {
  app_runtime: [
    'admission_alternative_paths',
    'admission_facts',
    'admissions_source_candidates',
    'source_freshness_checks',
    'source_freshness_states',
  ],
  ops_readonly: [
    'admission_alternative_paths',
    'admission_facts',
    'admissions_source_candidates',
    'source_freshness_checks',
    'source_freshness_states',
  ],
};

function requireConnectionUrl() {
  const value = process.env.OPS_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      'DATABASE_URL or OPS_DATABASE_URL is required for operational DB verification. Configure the CI secret instead of skipping this check.',
    );
  }

  return value;
}

async function assertRequiredTables(sql) {
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

  return [...present].sort();
}

async function assertRequiredRowCounts(sql) {
  const counts = [];

  for (const tableName of REQUIRED_ROW_COUNT_TABLES) {
    const [row] = await sql.unsafe(
      `select count(*)::int as row_count from public.${tableName}`,
    );
    const rowCount = Number(row.row_count);
    counts.push({ tableName, rowCount });

    if (rowCount <= 0) {
      throw new Error(`Expected public.${tableName} to contain rows, found ${rowCount}.`);
    }
  }

  return counts;
}

async function assertOperationalReadGrants(sql) {
  const requiredRoles = Object.keys(OPERATIONAL_READ_GRANTS);
  const requiredTables = [...new Set(Object.values(OPERATIONAL_READ_GRANTS).flat())];
  const rows = await sql`
    select grantee, table_name, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = any(${requiredRoles})
      and table_name = any(${requiredTables})
      and privilege_type = 'SELECT'
    order by grantee, table_name
  `;
  const present = new Set(rows.map((row) => `${row.grantee}:${row.table_name}`));
  const missing = [];

  for (const [role, tables] of Object.entries(OPERATIONAL_READ_GRANTS)) {
    for (const tableName of tables) {
      if (!present.has(`${role}:${tableName}`)) {
        missing.push(`${tableName} -> ${role}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing operational SELECT grants: ${missing.join(', ')}`);
  }

  return rows.map((row) => ({
    grantee: row.grantee,
    tableName: row.table_name,
    privilegeType: row.privilege_type,
  }));
}

async function assertRepresentativeAdmissionsRows(sql) {
  const rows = await sql`
    select
      pi.program_id,
      pi.institution_id,
      p.name as program_name,
      i.name as institution_name
    from public.program_institutions pi
    join public.programs p on p.id = pi.program_id
    join public.institutions i on i.id = pi.institution_id
    where (pi.program_id, pi.institution_id) in (
      ('haifa_cs', 'haifa'),
      ('tau_datascience', 'tau')
    )
    order by pi.program_id, pi.institution_id
  `;
  const present = new Set(rows.map((row) => `${row.program_id}:${row.institution_id}`));
  const expected = ['haifa_cs:haifa', 'tau_datascience:tau'];
  const missing = expected.filter((pair) => !present.has(pair));

  if (missing.length > 0) {
    throw new Error(`Missing representative admissions pairs: ${missing.join(', ')}`);
  }

  return rows.map((row) => ({
    programId: row.program_id,
    institutionId: row.institution_id,
    programName: row.program_name,
    institutionName: row.institution_name,
  }));
}

async function main() {
  const connectionUrl = requireConnectionUrl();
  const sql = postgres(connectionUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false,
  });

  try {
    const [tables, rowCounts, grants, representativePairs] = await Promise.all([
      assertRequiredTables(sql),
      assertRequiredRowCounts(sql),
      assertOperationalReadGrants(sql),
      assertRepresentativeAdmissionsRows(sql),
    ]);

    console.log(
      JSON.stringify(
        {
          verified: true,
          tables,
          rowCounts,
          operationalGrantCount: grants.length,
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
