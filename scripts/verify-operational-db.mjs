import { loadProductionSchemaSnapshot } from './lib/production-schema-snapshot.mjs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { require as tsxRequire } from 'tsx/cjs/api';

const { PRODUCTION_SCHEMA_CONTRACT, GUARDED_PRODUCTION_MIGRATIONS, assessProductionSchema } =
  tsxRequire('../src/server/admissions/productionSchemaPreflight.ts', import.meta.url);
const { assessPublicationDatabaseState } = tsxRequire(
  '../src/server/admissions/operationalDatabaseGate.ts',
  import.meta.url,
);
const { requireOpsDatabaseUrl } = tsxRequire('../src/env.ts', import.meta.url);
const { loadAdmissionAlertHealth } = tsxRequire(
  '../src/server/admission-alerts/health.ts',
  import.meta.url,
);

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

  const [colmanTourism] = await sql`
    select admission_type
    from public.programs
    where id = 'colman_tourism'
  `;
  if (!colmanTourism || colmanTourism.admission_type !== 'requirements') {
    throw new Error('Expected public.programs.colman_tourism to use requirements-based admission.');
  }

  return {
    counts,
    representativePairs,
    colmanTourismAdmissionType: colmanTourism.admission_type,
  };
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
    const snapshot = await loadProductionSchemaSnapshot(sql);
    const report = assessProductionSchema(snapshot);
    const catalogue = report.status === 'current' ? await loadCatalogueEvidence(sql) : null;
    const alerts =
      report.status === 'current'
        ? await loadAdmissionAlertHealth((query) => drizzle(sql).execute(query))
        : null;
    const publication =
      mode === 'publication' && report.status === 'current'
        ? await loadPublicationDatabaseState(sql)
        : null;
    const output = {
      verified: report.status === 'current' && (publication === null || publication.ready),
      mode,
      ...report,
      requiredTables: [
        ...Object.keys(PRODUCTION_SCHEMA_CONTRACT.tables),
        ...GUARDED_PRODUCTION_MIGRATIONS.flatMap((migration) =>
          Object.keys(migration.tables ?? {}),
        ),
      ].sort(),
      catalogue,
      alerts,
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
