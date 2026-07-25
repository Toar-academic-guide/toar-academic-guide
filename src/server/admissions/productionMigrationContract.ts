export type MigrationId =
  '0010' | '0011' | '0012' | '0013' | '0014' | '0015' | '0016' | '0017' | '0018';

export type MigrationHistoryEntry = {
  version: string;
  name: string;
  statementFingerprint: string;
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
  {
    id: '0017',
    remoteName: 'grant_ops_readonly_bagrut_profile_versions',
    repositoryPath: 'src/db/migrations/0017_grant_ops_readonly_bagrut_profile_versions.sql',
    statementFingerprint: '085a341c3c58772cb0263c246a135a5b',
  },
  {
    id: '0018',
    remoteName: 'secure_admission_threshold_scope_function',
    repositoryPath: 'src/db/migrations/0018_secure_admission_threshold_scope_function.sql',
    statementFingerprint: '3a81bb66de49ff59004174c4d8d2c9c6',
  },
];
