export type MigrationId =
  | '0010'
  | '0011'
  | '0012'
  | '0013'
  | '0014'
  | '0015'
  | '0016'
  | '0017'
  | '0018'
  | '0019'
  | '0020'
  | '0021'
  | '0022';

export type MigrationHistoryEntry = {
  version: string;
  name: string;
  statementFingerprint: string;
};

export type ForwardProductionMigration = {
  id: MigrationId;
  remoteName: string;
  repositoryPath: string;
  statementFingerprint: string;
  legacyStatementFingerprints?: string[];
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

export const FORWARD_PRODUCTION_MIGRATIONS: ForwardProductionMigration[] = [
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
  {
    id: '0019',
    remoteName: 'repair_colman_tourism_admission_type',
    repositoryPath: 'src/db/migrations/0019_repair_colman_tourism_admission_type.sql',
    statementFingerprint: '41ab9ae6c549074f9cd0eceecd35d503',
  },
  {
    id: '0020',
    remoteName: 'source_freshness_exact_authority',
    repositoryPath: 'src/db/migrations/0020_flowery_norman_osborn.sql',
    statementFingerprint: '8c78081e1d3f5b124f4dc39d35220f2a',
    legacyStatementFingerprints: ['d1183bfea0cb69faeaf8c8bada8eab5c'],
  },
  {
    id: '0021',
    remoteName: 'operational_proof_release_lane',
    repositoryPath: 'src/db/migrations/0021_simple_sugar_man.sql',
    statementFingerprint: '86f3daf91908c87fb305292dea29707b',
    legacyStatementFingerprints: [
      'ba89e5847ef10fa529545c0120fb0f1f',
      '7ebd08540af717e6cd9a698c4eb2e453',
    ],
  },
  {
    id: '0022',
    remoteName: 'secure_operational_proof_access',
    repositoryPath: 'src/db/migrations/0022_secure_operational_proof_access.sql',
    statementFingerprint: '8715154ce11095ad8a944eaad84f9185',
    legacyStatementFingerprints: ['a24a67bfd63139cb447637960babe21d'],
  },
];
