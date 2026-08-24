import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

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
      appliedThrough: '0022',
      pendingMigrations: [],
      issues: [],
    });
  });

  it('records both Drizzle and Supabase payload fingerprints for applied migrations', () => {
    for (const migrationId of ['0020', '0021', '0022'] as const) {
      const migration = FORWARD_PRODUCTION_MIGRATIONS.find(({ id }) => id === migrationId);
      const source = readFileSync(migration?.repositoryPath ?? '', 'utf8');
      const statements = source
        .split(/-->\s*statement-breakpoint/)
        .map((statement) => statement.trim())
        .filter(Boolean);

      expect(migration?.statementFingerprint).toBe(
        createHash('md5').update(statements.join('\n')).digest('hex'),
      );
      expect(migration?.legacyStatementFingerprints).toContain(
        createHash('md5').update(source).digest('hex'),
      );
    }
  });

  it('accepts PostgreSQL-truncated constraint identifiers', () => {
    const snapshot = makeSnapshot();
    snapshot.tables.admission_alert_baseline_history.constraints =
      snapshot.tables.admission_alert_baseline_history.constraints.map((constraint) =>
        constraint.slice(0, 63),
      );

    expect(assessProductionSchema(snapshot)).toMatchObject({
      status: 'current',
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
      '0017',
      '0018',
      '0019',
      '0020',
      '0021',
      '0022',
    ]);
  });

  it('allows a safe rerun from a verified forward-migration prefix', () => {
    const report = assessProductionSchema(makeSnapshot({ appliedCount: 3 }));

    expect(report.status).toBe('migration_required');
    expect(report.safeToMigrate).toBe(true);
    expect(report.appliedThrough).toBe('0012');
    expect(report.pendingMigrations).toEqual([
      '0013',
      '0014',
      '0015',
      '0016',
      '0017',
      '0018',
      '0019',
      '0020',
      '0021',
      '0022',
    ]);
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
    snapshot.tables.admission_operational_proof_values.grants.admissions_automation = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
    ];

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
        expect.objectContaining({
          code: 'grant_mismatch',
          object: 'grant:admissions_automation:admission_operational_proof_values',
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

  it('stops when a runtime role cannot authenticate', () => {
    const snapshot = makeSnapshot();
    const operationsRole = snapshot.roles.find((role) => role.name === 'ops_readonly');
    if (operationsRole) operationsRole.canLogin = false;

    expect(assessProductionSchema(snapshot).issues).toContainEqual(
      expect.objectContaining({
        code: 'role_cannot_login',
        object: 'role:ops_readonly',
      }),
    );
  });

  it('accepts the original 0021 fingerprint as a reviewed legacy equivalent', () => {
    const snapshot = makeSnapshot();
    const migration = snapshot.migrationHistory.find(
      ({ name }) => name === 'operational_proof_release_lane',
    );
    if (migration) {
      migration.statementFingerprint = 'ba89e5847ef10fa529545c0120fb0f1f';
    }

    expect(assessProductionSchema(snapshot)).toMatchObject({
      status: 'current',
      issues: [],
    });
  });

  it('stops when admissions automation gains elevated attributes or memberships', () => {
    const snapshot = makeSnapshot();
    const automation = snapshot.roles.find((role) => role.name === 'admissions_automation');
    if (automation) {
      automation.isSuperuser = true;
      automation.memberOf = ['postgres'];
      automation.ownedPublicObjects = ['routine:public.unsafe_helper'];
    }

    expect(assessProductionSchema(snapshot).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'role_not_least_privileged',
          object: 'role:admissions_automation',
        }),
        expect.objectContaining({
          code: 'role_has_memberships',
          object: 'role:admissions_automation',
        }),
        expect.objectContaining({
          code: 'role_owns_public_objects',
          object: 'role:admissions_automation',
        }),
      ]),
    );
  });

  it('stops when the threshold trigger function loses its trusted search path', () => {
    const snapshot = makeSnapshot();
    snapshot.functions.enforce_admission_threshold_scope = [];

    expect(assessProductionSchema(snapshot).issues).toContainEqual(
      expect.objectContaining({
        code: 'function_config_mismatch',
        object: 'function:enforce_admission_threshold_scope.config:search_path',
      }),
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
  if (!appliedIds.has('0017') && tables.bagrut_profile_versions) {
    tables.bagrut_profile_versions.policies = tables.bagrut_profile_versions.policies.filter(
      (policy) => policy !== 'bagrut_profile_versions_ops_readonly_read',
    );
    tables.bagrut_profile_versions.grants.ops_readonly = [];
  }
  if (appliedIds.has('0020')) {
    for (const column of [
      'proof_level',
      'decision_provenance',
      'reviewed_source_fingerprint',
      'exact_qualified',
    ]) {
      tables.source_freshness_checks?.columns.push(column);
    }
    for (const column of [
      'proof_level',
      'decision_provenance',
      'reviewed_source_fingerprint',
      'last_exact_check_at',
    ]) {
      tables.source_freshness_states?.columns.push(column);
    }
  }
  if (appliedIds.has('0021')) {
    for (const tableName of ['admission_releases', 'admission_review_runs'] as const) {
      tables[tableName]?.columns.push('release_kind', 'proof_scenario');
    }
    tables.admission_releases?.constraints.push('admission_releases_proof_scenario_kind_check');
    tables.admission_review_runs?.constraints.push(
      'admission_review_runs_proof_scenario_kind_check',
    );
    tables.admission_releases?.indexes.push('admission_releases_kind_published_at_idx');
    tables.admission_review_runs?.indexes.push('admission_review_runs_kind_status_idx');

    const automationAccess: Record<string, { grants: string[]; policies?: string[] }> = {
      institutions: { grants: ['SELECT'], policies: ['institutions_admissions_automation_read'] },
      programs: { grants: ['SELECT'], policies: ['programs_admissions_automation_read'] },
      program_institutions: {
        grants: ['SELECT'],
        policies: ['program_institutions_admissions_automation_read'],
      },
      ingestion_sources: {
        grants: ['SELECT'],
        policies: ['ingestion_sources_admissions_automation_read'],
      },
      admission_thresholds: {
        grants: ['SELECT', 'UPDATE'],
        policies: [
          'admission_thresholds_admissions_automation_read',
          'admission_thresholds_admissions_automation_update',
        ],
      },
      source_freshness_checks: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
        policies: [
          'source_freshness_checks_admissions_automation_read',
          'source_freshness_checks_admissions_automation_insert',
          'source_freshness_checks_admissions_automation_update',
        ],
      },
      source_freshness_states: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
        policies: [
          'source_freshness_states_admissions_automation_read',
          'source_freshness_states_admissions_automation_insert',
          'source_freshness_states_admissions_automation_update',
        ],
      },
      admission_review_runs: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
        policies: [
          'admission_review_runs_admissions_automation_read',
          'admission_review_runs_admissions_automation_insert',
          'admission_review_runs_admissions_automation_update',
        ],
      },
      admission_releases: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
        policies: [
          'admission_releases_admissions_automation_read',
          'admission_releases_admissions_automation_insert',
          'admission_releases_admissions_automation_update',
        ],
      },
      admission_target_transitions: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
        policies: [
          'admission_target_transitions_admissions_automation_read',
          'admission_target_transitions_admissions_automation_insert',
          'admission_target_transitions_admissions_automation_update',
        ],
      },
      admission_release_items: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
        policies: [
          'admission_release_items_admissions_automation_read',
          'admission_release_items_admissions_automation_insert',
          'admission_release_items_admissions_automation_update',
        ],
      },
      admission_publication_attempts: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
        policies: [
          'admission_publication_attempts_admissions_automation_read',
          'admission_publication_attempts_admissions_automation_insert',
          'admission_publication_attempts_admissions_automation_update',
        ],
      },
      admission_operational_proof_values: {
        grants: ['SELECT', 'INSERT', 'UPDATE'],
      },
      user_profiles: { grants: [] },
      saved_programs: { grants: [] },
      uploaded_documents: { grants: [] },
      bagrut_profile_versions: { grants: [] },
    };
    for (const [tableName, access] of Object.entries(automationAccess)) {
      const table = tables[tableName];
      if (!table) continue;
      table.grants.admissions_automation = access.grants;
      table.policies.push(...(access.policies ?? []));
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
      {
        name: 'anon',
        canLogin: false,
        bypassRls: false,
        isSuperuser: false,
        canCreateDatabases: false,
        canCreateRoles: false,
        inheritsPrivileges: false,
        canReplicate: false,
        memberOf: [],
        ownedPublicObjects: [],
      },
      {
        name: 'authenticated',
        canLogin: false,
        bypassRls: false,
        isSuperuser: false,
        canCreateDatabases: false,
        canCreateRoles: false,
        inheritsPrivileges: false,
        canReplicate: false,
        memberOf: [],
        ownedPublicObjects: [],
      },
      {
        name: 'app_runtime',
        canLogin: true,
        bypassRls: false,
        isSuperuser: false,
        canCreateDatabases: false,
        canCreateRoles: false,
        inheritsPrivileges: false,
        canReplicate: false,
        memberOf: [],
        ownedPublicObjects: [],
      },
      {
        name: 'ops_readonly',
        canLogin: true,
        bypassRls: false,
        isSuperuser: false,
        canCreateDatabases: false,
        canCreateRoles: false,
        inheritsPrivileges: false,
        canReplicate: false,
        memberOf: [],
        ownedPublicObjects: [],
      },
      ...(appliedIds.has('0021')
        ? [
            {
              name: 'admissions_automation',
              canLogin: true,
              bypassRls: false,
              isSuperuser: false,
              canCreateDatabases: false,
              canCreateRoles: false,
              inheritsPrivileges: false,
              canReplicate: false,
              memberOf: [],
              ownedPublicObjects: [],
            },
          ]
        : []),
    ],
    tables,
    enums: Object.fromEntries(
      Object.entries(PRODUCTION_SCHEMA_CONTRACT.enums)
        .filter(([, contract]) => appliedIds.has(contract.createdBy))
        .map(([name, contract]) => [name, [...contract.values]]),
    ),
    triggers: appliedIds.has('0014') ? ['admission_threshold_scope_invariant'] : [],
    functions: appliedIds.has('0014')
      ? {
          enforce_admission_threshold_scope: appliedIds.has('0018')
            ? ['search_path=pg_catalog, public']
            : [],
        }
      : {},
  };
}
