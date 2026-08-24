import {
  BASELINE_PRODUCTION_MIGRATIONS,
  FORWARD_PRODUCTION_MIGRATIONS,
  type MigrationHistoryEntry,
  type MigrationId,
} from './productionMigrationContract';

export {
  BASELINE_PRODUCTION_MIGRATIONS,
  FORWARD_PRODUCTION_MIGRATIONS,
} from './productionMigrationContract';
export type { MigrationHistoryEntry, MigrationId } from './productionMigrationContract';

export type DatabaseRoleSnapshot = {
  name: string;
  canLogin: boolean;
  bypassRls: boolean;
  isSuperuser: boolean;
  canCreateDatabases: boolean;
  canCreateRoles: boolean;
  inheritsPrivileges: boolean;
  canReplicate: boolean;
  memberOf: string[];
  ownedPublicObjects: string[];
};

export type TableSnapshot = {
  columns: string[];
  columnTypes: Record<string, string>;
  constraints: string[];
  indexes: string[];
  rowLevelSecurity: boolean;
  policies: string[];
  grants: Record<string, string[]>;
};

export type ProductionSchemaSnapshot = {
  migrationHistory: MigrationHistoryEntry[];
  roles: DatabaseRoleSnapshot[];
  tables: Record<string, TableSnapshot>;
  enums: Record<string, string[]>;
  triggers: string[];
  functions: Record<string, string[]>;
};

type TableContract = {
  createdBy?: MigrationId;
  securedBy?: MigrationId;
  private: boolean;
  columns: string[];
  columnTypes: Record<string, string>;
  constraints: string[];
  indexes: string[];
  policies: string[];
  grants: Record<string, string[]>;
};

type EnumContract = {
  createdBy: MigrationId;
  values: string[];
};

export type ProductionSchemaIssue = {
  code:
    | 'migration_history_diverged'
    | 'unexpected_migration'
    | 'missing_role'
    | 'role_bypasses_rls'
    | 'role_not_least_privileged'
    | 'role_has_memberships'
    | 'role_owns_public_objects'
    | 'role_cannot_login'
    | 'missing_table'
    | 'unexpected_pending_object'
    | 'missing_column'
    | 'column_type_mismatch'
    | 'missing_constraint'
    | 'missing_index'
    | 'missing_enum'
    | 'enum_values_mismatch'
    | 'missing_trigger'
    | 'missing_function'
    | 'function_config_mismatch'
    | 'rls_disabled'
    | 'missing_policy'
    | 'grant_mismatch'
    | 'public_role_grant';
  object: string;
  detail: string;
};

export type ProductionSchemaReport = {
  status: 'current' | 'migration_required' | 'drift';
  safeToMigrate: boolean;
  appliedThrough: MigrationId | null;
  pendingMigrations: MigrationId[];
  issues: ProductionSchemaIssue[];
};

const browserRoles = ['anon', 'authenticated'];
const runtimeRoles = ['app_runtime', 'ops_readonly'];
const admissionsAutomationRole = 'admissions_automation';

function privateTable(
  options: Omit<TableContract, 'private' | 'policies' | 'grants' | 'columnTypes'> & {
    appRuntime: string[];
    columnTypes?: Record<string, string>;
  },
): TableContract {
  return {
    ...options,
    private: true,
    columnTypes: options.columnTypes ?? {},
    policies: [],
    grants: {
      anon: [],
      authenticated: [],
      app_runtime: options.appRuntime,
      ops_readonly: ['SELECT'],
    },
  };
}

function addPolicies(tableName: string, table: TableContract): TableContract {
  const policies = [`${tableName}_private_deny_all`];
  for (const privilege of table.grants.app_runtime ?? []) {
    const suffix =
      privilege === 'SELECT'
        ? 'read'
        : privilege === 'INSERT'
          ? 'insert'
          : privilege === 'UPDATE'
            ? 'update'
            : privilege.toLowerCase();
    policies.push(`${tableName}_app_runtime_${suffix}`);
  }
  policies.push(`${tableName}_ops_readonly_read`);
  return { ...table, policies: [...new Set(policies)] };
}

const tables: Record<string, TableContract> = {
  institutions: baseTable(),
  programs: baseTable(),
  program_institutions: baseTable(),
  admission_requirements: baseTable(),
  admission_thresholds: baseTable(),
  source_urls: baseTable(),
  university_calculator_configs: baseTable(),
  user_profiles: baseTable(),
  requirement_versions: baseTable(),
  admission_alternative_paths: securedExistingTable('admission_alternative_paths'),
  admission_facts: securedExistingTable('admission_facts'),
  admissions_source_candidates: securedExistingTable('admissions_source_candidates'),
  source_freshness_checks: securedExistingTable('source_freshness_checks', ['SELECT', 'INSERT']),
  source_freshness_states: securedExistingTable('source_freshness_states', [
    'SELECT',
    'INSERT',
    'UPDATE',
  ]),
};

Object.assign(tables, {
  bagrut_profile_versions: addPolicies(
    'bagrut_profile_versions',
    privateTable({
      createdBy: '0010',
      securedBy: '0010',
      columns: [
        'id',
        'user_id',
        'schema_version',
        'content_hash',
        'sector',
        'subjects',
        'created_at',
      ],
      constraints: [],
      indexes: [
        'bagrut_profile_versions_user_hash_unique',
        'bagrut_profile_versions_user_created_at_idx',
      ],
      appRuntime: ['SELECT', 'INSERT'],
    }),
  ),
  admission_publication_attempts: createdPrivateTable(
    'admission_publication_attempts',
    '0012',
    ['id', 'release_id', 'status', 'error_message', 'started_at', 'completed_at'],
    ['admission_publication_attempts_release_id_admission_releases_id_fk'],
    ['admission_publication_attempts_release_started_at_idx'],
    ['SELECT', 'INSERT', 'UPDATE'],
  ),
  admission_release_items: createdPrivateTable(
    'admission_release_items',
    '0012',
    [
      'id',
      'transition_id',
      'rule_kind',
      'before_value',
      'after_value',
      'effective_from',
      'source_proofs',
      'created_at',
    ],
    ['admission_release_items_transition_id_admission_target_transitions_id_fk'],
    ['admission_release_items_transition_rule_kind_unique'],
    ['SELECT', 'INSERT'],
  ),
  admission_releases: createdPrivateTable(
    'admission_releases',
    '0012',
    ['id', 'manifest_digest', 'repository_commit', 'status', 'published_at', 'created_at'],
    [],
    ['admission_releases_manifest_digest_unique', 'admission_releases_published_at_idx'],
    ['SELECT', 'INSERT', 'UPDATE'],
  ),
  admission_target_transitions: createdPrivateTable(
    'admission_target_transitions',
    '0012',
    [
      'id',
      'release_id',
      'institution_id',
      'program_id',
      'cycle',
      'before_version',
      'after_version',
      'created_at',
    ],
    [
      'admission_target_transitions_release_id_admission_releases_id_fk',
      'admission_target_transitions_institution_id_institutions_id_fk',
      'admission_target_transitions_program_id_programs_id_fk',
    ],
    [
      'admission_target_transitions_release_target_unique',
      'admission_target_transitions_target_lookup_idx',
    ],
    ['SELECT', 'INSERT'],
  ),
});

for (const [tableName, columns, constraints, indexes] of [
  [
    'admission_alert_baseline_history',
    [
      'id',
      'subscription_id',
      'profile_version_id',
      'profile_hash',
      'rule_version',
      'verdict',
      'recorded_at',
    ],
    [
      'admission_alert_baseline_history_subscription_id_admission_alert_subscriptions_id_fk',
      'admission_alert_baseline_history_profile_version_id_bagrut_profile_versions_id_fk',
    ],
    ['admission_alert_baseline_history_subscription_recorded_idx'],
  ],
  [
    'admission_alert_email_preferences',
    ['user_id', 'opted_in', 'unsubscribed_at', 'updated_at'],
    [],
    [],
  ],
  [
    'admission_alert_outbox',
    [
      'id',
      'subscription_id',
      'transition_id',
      'idempotency_key',
      'status',
      'provider_message_id',
      'provider_accepted_at',
      'last_attempt_at',
      'next_attempt_at',
      'acceptance_unknown_at',
      'failure_reason',
      'created_at',
      'updated_at',
    ],
    [
      'admission_alert_outbox_subscription_id_admission_alert_subscriptions_id_fk',
      'admission_alert_outbox_transition_id_admission_target_transitions_id_fk',
    ],
    [
      'admission_alert_outbox_logical_delivery_unique',
      'admission_alert_outbox_idempotency_key_unique',
      'admission_alert_outbox_subscription_unique',
      'admission_alert_outbox_queue_idx',
    ],
  ],
  [
    'admission_alert_subscriptions',
    [
      'id',
      'user_id',
      'institution_id',
      'program_id',
      'cycle',
      'status',
      'profile_version_id',
      'profile_hash',
      'baseline_rule_version',
      'baseline_verdict',
      'activated_at',
      'cancelled_at',
      'expired_at',
      'notified_at',
      'refreshed_at',
      'created_at',
      'updated_at',
    ],
    [
      'admission_alert_subscriptions_institution_id_institutions_id_fk',
      'admission_alert_subscriptions_program_id_programs_id_fk',
      'admission_alert_subscriptions_profile_version_id_bagrut_profile_versions_id_fk',
    ],
    [
      'admission_alert_subscriptions_active_target_unique',
      'admission_alert_subscriptions_user_lifecycle_idx',
      'admission_alert_subscriptions_target_lifecycle_idx',
    ],
  ],
  [
    'admission_alert_transition_work',
    [
      'id',
      'transition_id',
      'status',
      'cursor',
      'claimed_at',
      'completed_at',
      'failure_reason',
      'created_at',
      'updated_at',
    ],
    ['admission_alert_transition_work_transition_id_admission_target_transitions_id_fk'],
    [
      'admission_alert_transition_work_transition_unique',
      'admission_alert_transition_work_status_idx',
    ],
  ],
  [
    'admission_alert_webhook_events',
    [
      'id',
      'outbox_id',
      'provider_event_type',
      'provider_message_id',
      'received_at',
      'payload_metadata',
    ],
    ['admission_alert_webhook_events_outbox_id_admission_alert_outbox_id_fk'],
    [],
  ],
] as Array<[string, string[], string[], string[]]>) {
  tables[tableName] = createdPrivateTable(tableName, '0013', columns, constraints, indexes, [
    'SELECT',
    'INSERT',
    'UPDATE',
  ]);
}

tables.admission_review_runs = createdPrivateTable(
  'admission_review_runs',
  '0016',
  [
    'run_key',
    'source_digest',
    'status',
    'candidate_count',
    'exclusion_count',
    'pull_request_number',
    'pull_request_url',
    'slack_status',
    'slack_error',
    'created_at',
    'updated_at',
  ],
  [],
  ['admission_review_runs_status_idx', 'admission_review_runs_slack_status_idx'],
  ['SELECT', 'INSERT', 'UPDATE'],
);

tables.admission_operational_proof_values = {
  createdBy: '0021',
  securedBy: '0021',
  private: true,
  columns: [
    'id',
    'release_id',
    'institution_id',
    'program_id',
    'cycle',
    'rule_kind',
    'current_value',
    'updated_at',
  ],
  columnTypes: {},
  constraints: [
    'admission_operational_proof_values_release_id_admission_releases_id_fk',
    'admission_operational_proof_values_institution_id_institutions_id_fk',
    'admission_operational_proof_values_program_id_programs_id_fk',
  ],
  indexes: [
    'admission_operational_proof_values_target_rule_unique',
    'admission_operational_proof_values_release_idx',
  ],
  policies: [
    'admission_operational_proof_values_admissions_automation_read',
    'admission_operational_proof_values_admissions_automation_insert',
    'admission_operational_proof_values_admissions_automation_update',
  ],
  grants: {
    anon: [],
    authenticated: [],
    app_runtime: [],
    ops_readonly: [],
    admissions_automation: ['SELECT', 'INSERT', 'UPDATE'],
  },
};

export const PRODUCTION_SCHEMA_CONTRACT: {
  tables: Record<string, TableContract>;
  enums: Record<string, EnumContract>;
} = {
  tables,
  enums: {
    admission_fact_field: {
      createdBy: '0010',
      values: [
        'sekhem',
        'psychometric',
        'bagrut_average',
        'psychometric_quantitative',
        'psychometric_english',
        'math_units',
        'math_grade',
        'english_units',
        'english_grade',
        'physics_units',
        'physics_grade',
        'cs_units',
        'cs_grade',
        'required_subject',
        'interview',
        'exam',
        'committee',
        'portfolio',
        'document_check',
        'prior_studies',
        'open_admission',
        'other',
      ],
    },
    admission_publication_attempt_status: {
      createdBy: '0012',
      values: ['started', 'succeeded', 'failed'],
    },
    admission_release_status: {
      createdBy: '0012',
      values: ['pending', 'published', 'failed'],
    },
    admission_alert_outbox_status: {
      createdBy: '0013',
      values: [
        'pending',
        'processing',
        'accepted',
        'acceptance_unknown',
        'retryable',
        'failed',
        'suppressed',
      ],
    },
    admission_alert_subscription_status: {
      createdBy: '0013',
      values: [
        'active',
        'needs_profile_refresh',
        'pending_delivery',
        'notified',
        'cancelled',
        'expired',
        'delivery_failed',
      ],
    },
    admission_alert_transition_work_status: {
      createdBy: '0013',
      values: ['pending', 'processing', 'completed', 'failed'],
    },
    admission_review_run_status: {
      createdBy: '0016',
      values: ['prepared', 'reviewable', 'no_changes', 'validation_failed'],
    },
    admission_review_slack_status: {
      createdBy: '0016',
      values: ['pending', 'sent', 'failed'],
    },
    admission_release_kind: {
      createdBy: '0021',
      values: ['canonical_bootstrap', 'canonical_change', 'operational_proof'],
    },
  },
};

export function assessProductionSchema(snapshot: ProductionSchemaSnapshot): ProductionSchemaReport {
  const issues: ProductionSchemaIssue[] = [];
  const appliedCount = assessMigrationHistory(snapshot.migrationHistory, issues);
  const applied = new Set(
    FORWARD_PRODUCTION_MIGRATIONS.slice(0, appliedCount).map((migration) => migration.id),
  );

  assessRoles(snapshot.roles, applied, issues);
  assessTables(snapshot, applied, issues);
  assessEnums(snapshot, applied, issues);
  assessChangedObjects(snapshot, applied, issues);
  assessAdmissionsAutomationAccess(snapshot, applied, issues);

  const appliedThrough =
    appliedCount > 0 ? (FORWARD_PRODUCTION_MIGRATIONS[appliedCount - 1]?.id ?? null) : null;
  const pendingMigrations = FORWARD_PRODUCTION_MIGRATIONS.slice(appliedCount).map(
    (migration) => migration.id,
  );

  if (issues.length > 0) {
    return {
      status: 'drift',
      safeToMigrate: false,
      appliedThrough,
      pendingMigrations,
      issues,
    };
  }

  if (pendingMigrations.length > 0) {
    return {
      status: 'migration_required',
      safeToMigrate: true,
      appliedThrough,
      pendingMigrations,
      issues,
    };
  }

  return {
    status: 'current',
    safeToMigrate: false,
    appliedThrough,
    pendingMigrations,
    issues,
  };
}

function assessMigrationHistory(
  history: MigrationHistoryEntry[],
  issues: ProductionSchemaIssue[],
): number {
  for (const [index, expected] of BASELINE_PRODUCTION_MIGRATIONS.entries()) {
    const actual = history[index];
    if (
      !actual ||
      actual.version !== expected.version ||
      actual.name !== expected.name ||
      actual.statementFingerprint !== expected.statementFingerprint
    ) {
      issues.push({
        code: 'migration_history_diverged',
        object: `migration:${expected.version}`,
        detail: `Expected ${expected.name} with fingerprint ${expected.statementFingerprint}.`,
      });
    }
  }

  const suffix = history.slice(BASELINE_PRODUCTION_MIGRATIONS.length);
  let appliedCount = 0;
  for (const [index, actual] of suffix.entries()) {
    const expected = FORWARD_PRODUCTION_MIGRATIONS[index];
    if (
      !expected ||
      actual.name !== expected.remoteName ||
      ![expected.statementFingerprint, ...(expected.legacyStatementFingerprints ?? [])].includes(
        actual.statementFingerprint,
      )
    ) {
      issues.push({
        code: 'unexpected_migration',
        object: `migration:${actual.version}`,
        detail: `Unexpected migration ${actual.name} (${actual.statementFingerprint}).`,
      });
      continue;
    }
    appliedCount += 1;
  }
  return appliedCount;
}

function assessRoles(
  roles: DatabaseRoleSnapshot[],
  applied: Set<MigrationId>,
  issues: ProductionSchemaIssue[],
) {
  const requiredRoles = [
    ...browserRoles,
    ...runtimeRoles,
    ...(applied.has('0021') ? [admissionsAutomationRole] : []),
  ];
  for (const roleName of requiredRoles) {
    const role = roles.find((candidate) => candidate.name === roleName);
    if (!role) {
      issues.push({
        code: 'missing_role',
        object: `role:${roleName}`,
        detail: `Required database role ${roleName} is absent.`,
      });
      continue;
    }
    if (role.bypassRls) {
      issues.push({
        code: 'role_bypasses_rls',
        object: `role:${roleName}`,
        detail: `Role ${roleName} must not bypass row-level security.`,
      });
    }
    if (
      roleName === admissionsAutomationRole &&
      (role.isSuperuser ||
        role.canCreateDatabases ||
        role.canCreateRoles ||
        role.inheritsPrivileges ||
        role.canReplicate)
    ) {
      issues.push({
        code: 'role_not_least_privileged',
        object: `role:${roleName}`,
        detail: `Role ${roleName} must not hold elevated database attributes.`,
      });
    }
    if (roleName === admissionsAutomationRole && role.memberOf.length > 0) {
      issues.push({
        code: 'role_has_memberships',
        object: `role:${roleName}`,
        detail: `Role ${roleName} must not inherit or assume privileges through memberships.`,
      });
    }
    if (roleName === admissionsAutomationRole && role.ownedPublicObjects.length > 0) {
      issues.push({
        code: 'role_owns_public_objects',
        object: `role:${roleName}`,
        detail: `Role ${roleName} must not own public database objects.`,
      });
    }
    if (
      (runtimeRoles.includes(roleName) || roleName === admissionsAutomationRole) &&
      !role.canLogin
    ) {
      issues.push({
        code: 'role_cannot_login',
        object: `role:${roleName}`,
        detail: `Runtime role ${roleName} must be able to authenticate.`,
      });
    }
  }
}

function assessTables(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  issues: ProductionSchemaIssue[],
) {
  for (const [tableName, contract] of Object.entries(PRODUCTION_SCHEMA_CONTRACT.tables)) {
    const table = snapshot.tables[tableName];
    const shouldExist = !contract.createdBy || applied.has(contract.createdBy);
    if (!shouldExist) {
      if (table) {
        issues.push({
          code: 'unexpected_pending_object',
          object: `table:${tableName}`,
          detail: `Table belongs to pending migration ${contract.createdBy}.`,
        });
      }
      continue;
    }
    if (!table) {
      issues.push({
        code: 'missing_table',
        object: `table:${tableName}`,
        detail: 'Required public table is absent.',
      });
      continue;
    }

    for (const column of contract.columns) {
      if (!table.columns.includes(column)) {
        issues.push({
          code: 'missing_column',
          object: `table:${tableName}.column:${column}`,
          detail: 'Required column is absent.',
        });
      }
    }
    for (const [column, expectedType] of Object.entries(contract.columnTypes)) {
      if (table.columnTypes[column] !== expectedType) {
        issues.push({
          code: 'column_type_mismatch',
          object: `table:${tableName}.column:${column}`,
          detail: `Expected ${expectedType}, found ${table.columnTypes[column] ?? 'absent'}.`,
        });
      }
    }
    for (const constraint of contract.constraints) {
      if (!includesPostgresIdentifier(table.constraints, constraint)) {
        issues.push({
          code: 'missing_constraint',
          object: `constraint:${constraint}`,
          detail: `Required constraint on public.${tableName} is absent.`,
        });
      }
    }
    for (const index of contract.indexes) {
      if (!table.indexes.includes(index)) {
        issues.push({
          code: 'missing_index',
          object: `index:${index}`,
          detail: `Required index on public.${tableName} is absent.`,
        });
      }
    }

    const securityApplies =
      contract.private && (!contract.securedBy || applied.has(contract.securedBy));
    if (securityApplies) {
      assessTableSecurity(tableName, table, contract, applied, issues);
    }
  }
}

function assessTableSecurity(
  tableName: string,
  table: TableSnapshot,
  contract: TableContract,
  applied: Set<MigrationId>,
  issues: ProductionSchemaIssue[],
) {
  if (!table.rowLevelSecurity) {
    issues.push({
      code: 'rls_disabled',
      object: `table:${tableName}`,
      detail: 'Row-level security must be enabled.',
    });
  }
  const requiredPolicies =
    tableName === 'bagrut_profile_versions' && !applied.has('0017')
      ? contract.policies.filter((policy) => policy !== 'bagrut_profile_versions_ops_readonly_read')
      : contract.policies;
  for (const policy of requiredPolicies) {
    if (!table.policies.includes(policy)) {
      issues.push({
        code: 'missing_policy',
        object: `policy:${policy}`,
        detail: `Required policy on public.${tableName} is absent.`,
      });
    }
  }
  for (const role of browserRoles) {
    const actual = normalizedPrivileges(table.grants[role] ?? []);
    if (actual.length > 0) {
      issues.push({
        code: 'public_role_grant',
        object: `grant:${role}:${tableName}`,
        detail: `Browser role has unintended privileges: ${actual.join(', ')}.`,
      });
    }
  }
  for (const role of runtimeRoles) {
    const actual = normalizedPrivileges(table.grants[role] ?? []);
    const expected = normalizedPrivileges(
      tableName === 'bagrut_profile_versions' && role === 'ops_readonly' && !applied.has('0017')
        ? []
        : (contract.grants[role] ?? []),
    );
    if (actual.join(',') !== expected.join(',')) {
      issues.push({
        code: 'grant_mismatch',
        object: `grant:${role}:${tableName}`,
        detail: `Expected [${expected.join(', ')}], found [${actual.join(', ')}].`,
      });
    }
  }
}

function assessEnums(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  issues: ProductionSchemaIssue[],
) {
  for (const [name, contract] of Object.entries(PRODUCTION_SCHEMA_CONTRACT.enums)) {
    const actual = snapshot.enums[name];
    if (!applied.has(contract.createdBy)) {
      const pendingEnumPresent =
        name === 'admission_fact_field'
          ? actual?.some((value) =>
              [
                'math_grade',
                'english_grade',
                'physics_units',
                'physics_grade',
                'cs_units',
                'cs_grade',
              ].includes(value),
            )
          : Boolean(actual);
      if (pendingEnumPresent) {
        issues.push({
          code: 'unexpected_pending_object',
          object: `enum:${name}`,
          detail: `Enum belongs to pending migration ${contract.createdBy}.`,
        });
      }
      continue;
    }
    if (!actual) {
      issues.push({
        code: 'missing_enum',
        object: `enum:${name}`,
        detail: 'Required enum is absent.',
      });
      continue;
    }
    if (actual.join('\u0000') !== contract.values.join('\u0000')) {
      issues.push({
        code: 'enum_values_mismatch',
        object: `enum:${name}`,
        detail: 'Enum values or ordering differ from the repository contract.',
      });
    }
  }
}

function assessChangedObjects(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  issues: ProductionSchemaIssue[],
) {
  assessAddedColumn(
    snapshot,
    applied,
    '0010',
    'user_profiles',
    'bagrut_profile_version_id',
    issues,
  );
  assessAddedConstraint(
    snapshot,
    applied,
    '0010',
    'user_profiles',
    'user_profiles_bagrut_profile_version_id_bagrut_profile_versions_id_fk',
    issues,
  );
  assessColumnType(
    snapshot,
    applied,
    '0015',
    'admission_requirements',
    'duration_years',
    'real',
    issues,
  );
  for (const [tableName, column] of [
    ['source_freshness_checks', 'proof_level'],
    ['source_freshness_checks', 'decision_provenance'],
    ['source_freshness_checks', 'reviewed_source_fingerprint'],
    ['source_freshness_checks', 'exact_qualified'],
    ['source_freshness_states', 'proof_level'],
    ['source_freshness_states', 'decision_provenance'],
    ['source_freshness_states', 'reviewed_source_fingerprint'],
    ['source_freshness_states', 'last_exact_check_at'],
  ] as const) {
    assessAddedColumn(snapshot, applied, '0020', tableName, column, issues);
  }
  for (const [tableName, column] of [
    ['admission_releases', 'release_kind'],
    ['admission_releases', 'proof_scenario'],
    ['admission_review_runs', 'release_kind'],
    ['admission_review_runs', 'proof_scenario'],
  ] as const) {
    assessAddedColumn(snapshot, applied, '0021', tableName, column, issues);
  }
  for (const [tableName, constraint] of [
    ['admission_releases', 'admission_releases_proof_scenario_kind_check'],
    ['admission_review_runs', 'admission_review_runs_proof_scenario_kind_check'],
  ] as const) {
    assessAddedConstraint(snapshot, applied, '0021', tableName, constraint, issues);
  }
  for (const [tableName, index] of [
    ['admission_releases', 'admission_releases_kind_published_at_idx'],
    ['admission_review_runs', 'admission_review_runs_kind_status_idx'],
  ] as const) {
    assessAddedIndex(snapshot, applied, '0021', tableName, index, issues);
  }
  assessColumnType(
    snapshot,
    applied,
    '0015',
    'requirement_versions',
    'duration_years',
    'real',
    issues,
  );

  const trigger = 'admission_threshold_scope_invariant';
  const fn = 'enforce_admission_threshold_scope';
  if (applied.has('0014')) {
    if (!snapshot.triggers.includes(trigger)) {
      issues.push({
        code: 'missing_trigger',
        object: `trigger:${trigger}`,
        detail: 'Threshold scope invariant trigger is absent.',
      });
    }
    if (!snapshot.functions[fn]) {
      issues.push({
        code: 'missing_function',
        object: `function:${fn}`,
        detail: 'Threshold scope invariant function is absent.',
      });
    }
    const trustedSearchPath = 'search_path=pg_catalog, public';
    const hasTrustedSearchPath = snapshot.functions[fn]?.includes(trustedSearchPath) ?? false;
    if (applied.has('0018') && !hasTrustedSearchPath) {
      issues.push({
        code: 'function_config_mismatch',
        object: `function:${fn}.config:search_path`,
        detail: `Expected ${trustedSearchPath}.`,
      });
    } else if (!applied.has('0018') && hasTrustedSearchPath) {
      issues.push({
        code: 'unexpected_pending_object',
        object: `function:${fn}.config:search_path`,
        detail: 'Function search path belongs to pending migration 0018.',
      });
    }
  } else {
    for (const [kind, name, present] of [
      ['trigger', trigger, snapshot.triggers.includes(trigger)],
      ['function', fn, Boolean(snapshot.functions[fn])],
    ] as const) {
      if (present) {
        issues.push({
          code: 'unexpected_pending_object',
          object: `${kind}:${name}`,
          detail: `${kind} belongs to pending migration 0014.`,
        });
      }
    }
  }
}

function assessAddedColumn(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  migration: MigrationId,
  tableName: string,
  column: string,
  issues: ProductionSchemaIssue[],
) {
  const present = snapshot.tables[tableName]?.columns.includes(column) ?? false;
  if (applied.has(migration) && !present) {
    issues.push({
      code: 'missing_column',
      object: `table:${tableName}.column:${column}`,
      detail: `Column required by migration ${migration} is absent.`,
    });
  } else if (!applied.has(migration) && present) {
    issues.push({
      code: 'unexpected_pending_object',
      object: `table:${tableName}.column:${column}`,
      detail: `Column belongs to pending migration ${migration}.`,
    });
  }
}

function assessAddedConstraint(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  migration: MigrationId,
  tableName: string,
  constraint: string,
  issues: ProductionSchemaIssue[],
) {
  const present = includesPostgresIdentifier(
    snapshot.tables[tableName]?.constraints ?? [],
    constraint,
  );
  if (applied.has(migration) && !present) {
    issues.push({
      code: 'missing_constraint',
      object: `constraint:${constraint}`,
      detail: `Constraint required by migration ${migration} is absent.`,
    });
  } else if (!applied.has(migration) && present) {
    issues.push({
      code: 'unexpected_pending_object',
      object: `constraint:${constraint}`,
      detail: `Constraint belongs to pending migration ${migration}.`,
    });
  }
}

function assessAddedIndex(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  migration: MigrationId,
  tableName: string,
  index: string,
  issues: ProductionSchemaIssue[],
) {
  const present = snapshot.tables[tableName]?.indexes.includes(index) ?? false;
  if (applied.has(migration) && !present) {
    issues.push({
      code: 'missing_index',
      object: `index:${index}`,
      detail: `Index required by migration ${migration} is absent.`,
    });
  } else if (!applied.has(migration) && present) {
    issues.push({
      code: 'unexpected_pending_object',
      object: `index:${index}`,
      detail: `Index belongs to pending migration ${migration}.`,
    });
  }
}

function assessAdmissionsAutomationAccess(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  issues: ProductionSchemaIssue[],
) {
  if (!applied.has('0021')) return;
  const access: Record<string, { grants: string[]; policies?: string[] }> = {
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
      policies: [
        'admission_operational_proof_values_admissions_automation_read',
        'admission_operational_proof_values_admissions_automation_insert',
        'admission_operational_proof_values_admissions_automation_update',
      ],
    },
    user_profiles: { grants: [] },
    saved_programs: { grants: [] },
    uploaded_documents: { grants: [] },
    bagrut_profile_versions: { grants: [] },
  };
  for (const [tableName, expected] of Object.entries(access)) {
    const table = snapshot.tables[tableName];
    if (!table) continue;
    const actualGrants = normalizedPrivileges(table.grants[admissionsAutomationRole] ?? []);
    const expectedGrants = normalizedPrivileges(expected.grants);
    if (actualGrants.join(',') !== expectedGrants.join(',')) {
      issues.push({
        code: 'grant_mismatch',
        object: `grant:${admissionsAutomationRole}:${tableName}`,
        detail: `Expected [${expectedGrants.join(', ')}], found [${actualGrants.join(', ')}].`,
      });
    }
    for (const policy of expected.policies ?? []) {
      if (!table.policies.includes(policy)) {
        issues.push({
          code: 'missing_policy',
          object: `policy:${policy}`,
          detail: `Required admissions automation policy on public.${tableName} is absent.`,
        });
      }
    }
  }
}

function includesPostgresIdentifier(identifiers: string[], expected: string): boolean {
  const postgresIdentifier = expected.slice(0, 63);
  return identifiers.includes(expected) || identifiers.includes(postgresIdentifier);
}

function assessColumnType(
  snapshot: ProductionSchemaSnapshot,
  applied: Set<MigrationId>,
  migration: MigrationId,
  tableName: string,
  column: string,
  expectedType: string,
  issues: ProductionSchemaIssue[],
) {
  const actual = snapshot.tables[tableName]?.columnTypes[column];
  if (!applied.has(migration)) {
    if (actual === expectedType) {
      issues.push({
        code: 'unexpected_pending_object',
        object: `table:${tableName}.column:${column}`,
        detail: `Column type belongs to pending migration ${migration}.`,
      });
    }
    return;
  }
  if (actual !== expectedType) {
    issues.push({
      code: 'column_type_mismatch',
      object: `table:${tableName}.column:${column}`,
      detail: `Expected ${expectedType}, found ${actual ?? 'absent'}.`,
    });
  }
}

function baseTable(): TableContract {
  return {
    private: false,
    columns: [],
    columnTypes: {},
    constraints: [],
    indexes: [],
    policies: [],
    grants: {},
  };
}

function securedExistingTable(tableName: string, appRuntime = ['SELECT']): TableContract {
  return addPolicies(
    tableName,
    privateTable({
      securedBy: '0011',
      columns: [],
      constraints: [],
      indexes: [],
      appRuntime,
    }),
  );
}

function createdPrivateTable(
  tableName: string,
  migration: MigrationId,
  columns: string[],
  constraints: string[],
  indexes: string[],
  appRuntime: string[],
): TableContract {
  return addPolicies(
    tableName,
    privateTable({
      createdBy: migration,
      securedBy: migration,
      columns,
      constraints,
      indexes,
      appRuntime,
    }),
  );
}

function normalizedPrivileges(privileges: string[]) {
  return [...new Set(privileges.map((privilege) => privilege.toUpperCase()))].sort();
}
