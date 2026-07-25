export type MigrationId = '0010' | '0011' | '0012' | '0013' | '0014' | '0015' | '0016';

export type MigrationHistoryEntry = {
  version: string;
  name: string;
  statementFingerprint: string;
};

export type DatabaseRoleSnapshot = {
  name: string;
  canLogin: boolean;
  bypassRls: boolean;
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
  functions: string[];
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

export const BASELINE_PRODUCTION_MIGRATIONS: MigrationHistoryEntry[] = [
  {
    version: '20260621214319',
    name: 'apply_great_sage_calculator_config_columns',
    statementFingerprint: '10305f4385c59d754ee75844eb8ba3d2',
  },
  {
    version: '20260622152857',
    name: 'rls_public_access_hardening',
    statementFingerprint: 'b326b876eb3d76cee2e85093d6890980',
  },
  {
    version: '20260622170754',
    name: 'explicit_private_table_deny_policies',
    statementFingerprint: 'ad243016247efd08fdf9c1a5da56d032',
  },
  {
    version: '20260627100736',
    name: 'admissions_source_contracts',
    statementFingerprint: '128d3383150f07ad7871531866b6c75e',
  },
  {
    version: '20260627100757',
    name: 'source_freshness_operational_tables',
    statementFingerprint: '270037a9723b8a13cc5c50aaa173561e',
  },
  {
    version: '20260627100924',
    name: 'grant_runtime_roles_for_operational_catalogue_tables',
    statementFingerprint: '5ff32ef22448785aded8539b5c7e5225',
  },
];

export const FORWARD_PRODUCTION_MIGRATIONS: Array<{
  id: MigrationId;
  remoteName: string;
  repositoryPath: string;
  statementFingerprint: string;
}> = [
  {
    id: '0010',
    remoteName: 'bagrut_profile_versions',
    repositoryPath: 'src/db/migrations/0010_fearless_maverick.sql',
    statementFingerprint: '0cac45dfc4eeb4cf407fb2349a669be0',
  },
  {
    id: '0011',
    remoteName: 'private_admission_operations_rls',
    repositoryPath: 'src/db/migrations/0011_private_admission_operations_rls.sql',
    statementFingerprint: '837fb73e8ecb1a3013f6ed118a5a48af',
  },
  {
    id: '0012',
    remoteName: 'admission_release_ledger',
    repositoryPath: 'src/db/migrations/0012_greedy_meteorite.sql',
    statementFingerprint: '7a35bc07dae60ed050766e785578ba86',
  },
  {
    id: '0013',
    remoteName: 'admission_alert_persistence',
    repositoryPath: 'src/db/migrations/0013_funny_multiple_man.sql',
    statementFingerprint: '71f89ca7de70dd3aed10a8e0231ef1ee',
  },
  {
    id: '0014',
    remoteName: 'admission_threshold_scope_invariant',
    repositoryPath: 'src/db/migrations/0014_admission_threshold_scope_invariant.sql',
    statementFingerprint: '35c394d645a819f810502297e0092e17',
  },
  {
    id: '0015',
    remoteName: 'fractional_program_durations',
    repositoryPath: 'src/db/migrations/0015_support_fractional_program_durations.sql',
    statementFingerprint: '495834f5ff8e0413da2d3b32298311b3',
  },
  {
    id: '0016',
    remoteName: 'admission_review_runs',
    repositoryPath: 'src/db/migrations/0016_admission_review_runs.sql',
    statementFingerprint: '29936695ecbcd9a8905c3187615cc2f7',
  },
];

const browserRoles = ['anon', 'authenticated'];
const runtimeRoles = ['app_runtime', 'ops_readonly'];

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
  },
};

export function assessProductionSchema(snapshot: ProductionSchemaSnapshot): ProductionSchemaReport {
  const issues: ProductionSchemaIssue[] = [];
  const appliedCount = assessMigrationHistory(snapshot.migrationHistory, issues);
  const applied = new Set(
    FORWARD_PRODUCTION_MIGRATIONS.slice(0, appliedCount).map((migration) => migration.id),
  );

  assessRoles(snapshot.roles, issues);
  assessTables(snapshot, applied, issues);
  assessEnums(snapshot, applied, issues);
  assessChangedObjects(snapshot, applied, issues);

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
      actual.statementFingerprint !== expected.statementFingerprint
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

function assessRoles(roles: DatabaseRoleSnapshot[], issues: ProductionSchemaIssue[]) {
  for (const roleName of [...browserRoles, ...runtimeRoles]) {
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
      if (!table.constraints.includes(constraint)) {
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
    if (securityApplies) assessTableSecurity(tableName, table, contract, issues);
  }
}

function assessTableSecurity(
  tableName: string,
  table: TableSnapshot,
  contract: TableContract,
  issues: ProductionSchemaIssue[],
) {
  if (!table.rowLevelSecurity) {
    issues.push({
      code: 'rls_disabled',
      object: `table:${tableName}`,
      detail: 'Row-level security must be enabled.',
    });
  }
  for (const policy of contract.policies) {
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
    const expected = normalizedPrivileges(contract.grants[role] ?? []);
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
    if (!snapshot.functions.includes(fn)) {
      issues.push({
        code: 'missing_function',
        object: `function:${fn}`,
        detail: 'Threshold scope invariant function is absent.',
      });
    }
  } else {
    for (const [kind, name, present] of [
      ['trigger', trigger, snapshot.triggers.includes(trigger)],
      ['function', fn, snapshot.functions.includes(fn)],
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
  const present = snapshot.tables[tableName]?.constraints.includes(constraint) ?? false;
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
