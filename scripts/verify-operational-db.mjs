import postgres from 'postgres';
import 'tsx';

const [
  { PRODUCTION_SCHEMA_CONTRACT, assessProductionSchema },
  { assessPublicationDatabaseState },
  { requireOpsDatabaseUrl },
] = await Promise.all([
  import('../src/server/admissions/productionSchemaPreflight.ts'),
  import('../src/server/admissions/operationalDatabaseGate.ts'),
  import('../src/env.ts'),
]);

const mode = resolveMode(process.argv);
const representativeTables = [
  'institutions',
  'programs',
  'program_institutions',
  'admission_requirements',
  'admission_thresholds',
  'source_urls',
  'university_calculator_configs',
];

function resolveMode(argv) {
  if (argv.includes('--preflight')) return 'preflight';
  if (argv.includes('--publication')) return 'publication';
  return 'verify';
}

async function loadSnapshot(sql) {
  const [
    migrationRows,
    roleRows,
    tableRows,
    columnRows,
    constraintRows,
    indexRows,
    policyRows,
    privilegeRows,
    enumRows,
    triggerRows,
    functionRows,
  ] = await Promise.all([
    sql`
      select
        version,
        name,
        md5(array_to_string(statements, E'\n')) as statement_fingerprint
      from supabase_migrations.schema_migrations
      order by version
    `,
    sql`
      select
        rolname as name,
        rolcanlogin as can_login,
        rolbypassrls as bypass_rls
      from pg_roles
      where rolname = any(${['anon', 'authenticated', 'app_runtime', 'ops_readonly']})
      order by rolname
    `,
    sql`
      select c.relname as table_name, c.relrowsecurity as row_level_security
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      order by c.relname
    `,
    sql`
      select
        table_name,
        column_name,
        case
          when data_type = 'USER-DEFINED' then udt_name
          else data_type
        end as column_type
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `,
    sql`
      select c.relname as table_name, con.conname as constraint_name
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
      order by c.relname, con.conname
    `,
    sql`
      select tablename as table_name, indexname as index_name
      from pg_indexes
      where schemaname = 'public'
      order by tablename, indexname
    `,
    sql`
      select tablename as table_name, policyname as policy_name
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname
    `,
    sql`
      select
        c.relname as table_name,
        database_role.rolname as role_name,
        privilege,
        has_table_privilege(
          database_role.oid,
          format('%I.%I', n.nspname, c.relname),
          privilege
        ) as allowed
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join unnest(${[
        'anon',
        'authenticated',
        'app_runtime',
        'ops_readonly',
      ]}::text[]) as expected_role(role_name)
      join pg_roles database_role on database_role.rolname = expected_role.role_name
      cross join unnest(${[
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER',
      ]}::text[]) as privilege
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      order by c.relname, role_name, privilege
    `,
    sql`
      select
        t.typname as enum_name,
        e.enumlabel as enum_value
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      order by t.typname, e.enumsortorder
    `,
    sql`
      select distinct trigger_name
      from information_schema.triggers
      where trigger_schema = 'public'
      order by trigger_name
    `,
    sql`
      select
        p.proname as function_name,
        coalesce(p.proconfig, array[]::text[]) as function_config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
      order by p.proname, p.oid
    `,
  ]);

  const tables = {};
  for (const row of tableRows) {
    tables[row.table_name] = {
      columns: [],
      columnTypes: {},
      constraints: [],
      indexes: [],
      rowLevelSecurity: row.row_level_security,
      policies: [],
      grants: {},
    };
  }
  for (const row of columnRows) {
    const table = tables[row.table_name];
    if (!table) continue;
    table.columns.push(row.column_name);
    table.columnTypes[row.column_name] = row.column_type;
  }
  for (const row of constraintRows) {
    tables[row.table_name]?.constraints.push(row.constraint_name);
  }
  for (const row of indexRows) {
    tables[row.table_name]?.indexes.push(row.index_name);
  }
  for (const row of policyRows) {
    tables[row.table_name]?.policies.push(row.policy_name);
  }
  for (const row of privilegeRows) {
    if (!row.allowed || !tables[row.table_name]) continue;
    const roleGrants = (tables[row.table_name].grants[row.role_name] ??= []);
    roleGrants.push(row.privilege);
  }

  const enums = {};
  for (const row of enumRows) {
    (enums[row.enum_name] ??= []).push(row.enum_value);
  }

  return {
    migrationHistory: migrationRows.map((row) => ({
      version: row.version,
      name: row.name,
      statementFingerprint: row.statement_fingerprint,
    })),
    roles: roleRows.map((row) => ({
      name: row.name,
      canLogin: row.can_login,
      bypassRls: row.bypass_rls,
    })),
    tables,
    enums,
    triggers: triggerRows.map((row) => row.trigger_name),
    functions: Object.fromEntries(
      functionRows.map((row) => [row.function_name, row.function_config]),
    ),
  };
}

async function loadCatalogueEvidence(sql) {
  const countRows = await sql.unsafe(
    representativeTables
      .map(
        (tableName, ordinal) =>
          `select ${ordinal} as ordinal, '${tableName}' as table_name, count(*)::int as row_count from public.${tableName}`,
      )
      .join(' union all ') + ' order by ordinal',
  );
  const counts = countRows.map((row) => ({
    tableName: row.table_name,
    rowCount: Number(row.row_count),
  }));
  const emptyTable = counts.find((item) => item.rowCount <= 0);
  if (emptyTable) {
    throw new Error(
      `Expected public.${emptyTable.tableName} to contain rows, found ${emptyTable.rowCount}.`,
    );
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
  return { counts, representativePairs };
}

async function loadPublicationDatabaseState(sql) {
  const [state] = await sql`
    select
      count(*) filter (where status = 'pending')::int as pending_release_count,
      (
        select count(*)::int
        from public.admission_publication_attempts
        where status = 'started'
      ) as started_attempt_count,
      count(*) filter (
        where status = 'published'
          and (
            published_at is null
            or repository_commit !~ '^[0-9a-f]{7,64}$'
            or manifest_digest !~ '^sha256:[0-9a-f]{64}$'
          )
      )::int as malformed_published_release_count
    from public.admission_releases
  `;
  return assessPublicationDatabaseState({
    pendingReleaseCount: Number(state.pending_release_count),
    startedAttemptCount: Number(state.started_attempt_count),
    malformedPublishedReleaseCount: Number(state.malformed_published_release_count),
  });
}

async function main() {
  const sql = postgres(requireOpsDatabaseUrl(), {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false,
  });

  try {
    const snapshot = await loadSnapshot(sql);
    const report = assessProductionSchema(snapshot);
    const catalogue = report.status === 'current' ? await loadCatalogueEvidence(sql) : null;
    const publication =
      mode === 'publication' && report.status === 'current'
        ? await loadPublicationDatabaseState(sql)
        : null;
    const output = {
      verified: report.status === 'current' && (publication === null || publication.ready),
      mode,
      ...report,
      requiredTables: Object.keys(PRODUCTION_SCHEMA_CONTRACT.tables).sort(),
      catalogue,
      publication,
    };

    console.log(JSON.stringify(output, null, 2));

    const accepted =
      (report.status === 'current' && (publication === null || publication.ready)) ||
      (mode === 'preflight' && report.status === 'migration_required' && report.safeToMigrate);
    if (!accepted) process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        verified: false,
        mode,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
