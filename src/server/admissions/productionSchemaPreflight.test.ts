import { describe, expect, it } from 'vitest';

import {
  BASELINE_PRODUCTION_MIGRATIONS,
  FORWARD_PRODUCTION_MIGRATIONS,
  PRODUCTION_SCHEMA_CONTRACT,
  assessProductionSchema,
  type ProductionSchemaSnapshot,
} from './productionSchemaPreflight';

describe('production admissions schema preflight', () => {
  it('accepts a fully current schema', () => {
    const report = assessProductionSchema(makeSnapshot());

    expect(report).toMatchObject({
      status: 'current',
      safeToMigrate: false,
      appliedThrough: '0016',
      pendingMigrations: [],
      issues: [],
    });
  });

  it('recognizes an intact production baseline that needs the forward migrations', () => {
    const report = assessProductionSchema(makeSnapshot({ appliedCount: 0 }));

    expect(report.status).toBe('migration_required');
    expect(report.safeToMigrate).toBe(true);
    expect(report.pendingMigrations).toEqual([
      '0010',
      '0011',
      '0012',
      '0013',
      '0014',
      '0015',
      '0016',
    ]);
  });

  it('allows a safe rerun from a verified forward-migration prefix', () => {
    const report = assessProductionSchema(makeSnapshot({ appliedCount: 3 }));

    expect(report.status).toBe('migration_required');
    expect(report.safeToMigrate).toBe(true);
    expect(report.appliedThrough).toBe('0012');
    expect(report.pendingMigrations).toEqual(['0013', '0014', '0015', '0016']);
  });

  it('stops when a pending migration is partially present', () => {
    const snapshot = makeSnapshot({ appliedCount: 0 });
    snapshot.tables.bagrut_profile_versions = makeSnapshot().tables.bagrut_profile_versions;

    const report = assessProductionSchema(snapshot);

    expect(report.status).toBe('drift');
    expect(report.safeToMigrate).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: 'unexpected_pending_object',
        object: 'table:bagrut_profile_versions',
      }),
    );
  });

  it('stops when a required column, constraint, or index is missing', () => {
    const snapshot = makeSnapshot();
    snapshot.tables.admission_releases.columns = snapshot.tables.admission_releases.columns.filter(
      (column) => column !== 'repository_commit',
    );
    snapshot.tables.admission_releases.indexes = [];
    snapshot.tables.admission_target_transitions.constraints = [];

    const report = assessProductionSchema(snapshot);

    expect(report.status).toBe('drift');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_column',
          object: 'table:admission_releases.column:repository_commit',
        }),
        expect.objectContaining({
          code: 'missing_index',
          object: 'index:admission_releases_manifest_digest_unique',
        }),
        expect.objectContaining({
          code: 'missing_constraint',
          object: 'constraint:admission_target_transitions_release_id_admission_releases_id_fk',
        }),
      ]),
    );
  });

  it('stops when RLS is disabled or a required policy is missing', () => {
    const snapshot = makeSnapshot();
    snapshot.tables.admission_facts.rowLevelSecurity = false;
    snapshot.tables.admission_review_runs.policies =
      snapshot.tables.admission_review_runs.policies.filter(
        (policy) => policy !== 'admission_review_runs_private_deny_all',
      );

    const report = assessProductionSchema(snapshot);

    expect(report.status).toBe('drift');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'rls_disabled',
          object: 'table:admission_facts',
        }),
        expect.objectContaining({
          code: 'missing_policy',
          object: 'policy:admission_review_runs_private_deny_all',
        }),
      ]),
    );
  });

  it('stops on missing or excessive role grants', () => {
    const snapshot = makeSnapshot();
    snapshot.tables.admission_releases.grants.app_runtime = ['SELECT'];
    snapshot.tables.admission_facts.grants.anon = ['SELECT'];

    const report = assessProductionSchema(snapshot);

    expect(report.status).toBe('drift');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'grant_mismatch',
          object: 'grant:app_runtime:admission_releases',
        }),
        expect.objectContaining({
          code: 'public_role_grant',
          object: 'grant:anon:admission_facts',
        }),
      ]),
    );
  });

  it('stops when an effective runtime role is absent or can bypass RLS', () => {
    const snapshot = makeSnapshot();
    snapshot.roles = snapshot.roles.filter((role) => role.name !== 'ops_readonly');
    const runtime = snapshot.roles.find((role) => role.name === 'app_runtime');
    if (runtime) runtime.bypassRls = true;

    const report = assessProductionSchema(snapshot);

    expect(report.status).toBe('drift');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_role',
          object: 'role:ops_readonly',
        }),
        expect.objectContaining({
          code: 'role_bypasses_rls',
          object: 'role:app_runtime',
        }),
      ]),
    );
  });

  it('stops on a divergent baseline fingerprint or unexpected history entry', () => {
    const divergent = makeSnapshot();
    divergent.migrationHistory[2] = {
      ...divergent.migrationHistory[2],
      statementFingerprint: 'different',
    };

    expect(assessProductionSchema(divergent).issues).toContainEqual(
      expect.objectContaining({
        code: 'migration_history_diverged',
        object: `migration:${BASELINE_PRODUCTION_MIGRATIONS[2]?.version}`,
      }),
    );

    const unexpected = makeSnapshot();
    unexpected.migrationHistory.push({
      version: '20990101000000',
      name: 'manual_dashboard_hotfix',
      statementFingerprint: 'unknown',
    });

    expect(assessProductionSchema(unexpected).issues).toContainEqual(
      expect.objectContaining({
        code: 'unexpected_migration',
        object: 'migration:20990101000000',
      }),
    );
  });
});

function makeSnapshot(options: { appliedCount?: number } = {}): ProductionSchemaSnapshot {
  const appliedCount = options.appliedCount ?? FORWARD_PRODUCTION_MIGRATIONS.length;
  const appliedIds = new Set(
    FORWARD_PRODUCTION_MIGRATIONS.slice(0, appliedCount).map((migration) => migration.id),
  );
  const tables: ProductionSchemaSnapshot['tables'] = {};

  for (const [tableName, contract] of Object.entries(PRODUCTION_SCHEMA_CONTRACT.tables)) {
    if (contract.createdBy && !appliedIds.has(contract.createdBy)) continue;

    const securityApplies = !contract.securedBy || appliedIds.has(contract.securedBy);
    tables[tableName] = {
      columns: [...contract.columns],
      columnTypes: { ...contract.columnTypes },
      constraints: [...contract.constraints],
      indexes: [...contract.indexes],
      rowLevelSecurity: securityApplies && contract.private,
      policies: securityApplies ? [...contract.policies] : [],
      grants: securityApplies
        ? Object.fromEntries(
            Object.entries(contract.grants).map(([role, privileges]) => [role, [...privileges]]),
          )
        : {},
    };
  }

  if (appliedIds.has('0010')) {
    tables.user_profiles?.columns.push('bagrut_profile_version_id');
    tables.user_profiles?.constraints.push(
      'user_profiles_bagrut_profile_version_id_bagrut_profile_versions_id_fk',
    );
  }
  if (appliedIds.has('0015')) {
    if (tables.admission_requirements) {
      tables.admission_requirements.columnTypes.duration_years = 'real';
    }
    if (tables.requirement_versions) {
      tables.requirement_versions.columnTypes.duration_years = 'real';
    }
  }

  return {
    migrationHistory: [
      ...BASELINE_PRODUCTION_MIGRATIONS,
      ...FORWARD_PRODUCTION_MIGRATIONS.slice(0, appliedCount).map((migration, index) => ({
        version: `20260725${String(index).padStart(6, '0')}`,
        name: migration.remoteName,
        statementFingerprint: migration.statementFingerprint,
      })),
    ],
    roles: [
      { name: 'anon', canLogin: false, bypassRls: false },
      { name: 'authenticated', canLogin: false, bypassRls: false },
      { name: 'app_runtime', canLogin: true, bypassRls: false },
      { name: 'ops_readonly', canLogin: true, bypassRls: false },
    ],
    tables,
    enums: Object.fromEntries(
      Object.entries(PRODUCTION_SCHEMA_CONTRACT.enums)
        .filter(([, contract]) => appliedIds.has(contract.createdBy))
        .map(([name, contract]) => [name, [...contract.values]]),
    ),
    triggers: appliedIds.has('0014') ? ['admission_threshold_scope_invariant'] : [],
    functions: appliedIds.has('0014') ? ['enforce_admission_threshold_scope'] : [],
  };
}
