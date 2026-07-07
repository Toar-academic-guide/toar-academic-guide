import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const geographicRegionEnum = pgEnum('geographic_region', [
  'center',
  'north',
  'south',
  'any',
]);
export const programTypeEnum = pgEnum('program_type', ['academic', 'certificate', 'vocational']);
export const admissionTypeEnum = pgEnum('admission_type', ['sekhem', 'requirements']);
export const calculatorFormulaTypeEnum = pgEnum('calculator_formula_type', [
  'weighted_scaled',
  'technion_linear',
  'minimum_floors',
]);
export const thresholdKindEnum = pgEnum('threshold_kind', ['sekhem', 'direct_psychometric']);
export const sourceUrlKindEnum = pgEnum('source_url_kind', [
  'program',
  'calculator',
  'institution',
]);
export const reviewStatusEnum = pgEnum('review_status', ['seeded', 'reviewed', 'published']);
export const admissionsSourceOriginEnum = pgEnum('admissions_source_origin', [
  'board_column',
  'item_update',
  'catalogue_url',
  'manual',
]);
export const admissionsSourceSpecificityEnum = pgEnum('admissions_source_specificity', [
  'program_admissions',
  'program',
  'calculator',
  'institution_admissions',
  'institution',
  'generic',
]);
export const admissionsConfidenceEnum = pgEnum('admissions_confidence', ['high', 'medium', 'low']);
export const admissionFactKindEnum = pgEnum('admission_fact_kind', [
  'numeric_gate',
  'manual_gate',
  'open_admission',
  'explicit_absence',
  'unknown',
]);
export const admissionFactFieldEnum = pgEnum('admission_fact_field', [
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
]);
export const admissionComparisonEnum = pgEnum('admission_comparison', [
  'gte',
  'lte',
  'eq',
  'present',
  'not_required',
  'unknown',
]);
export const admissionFactUnitEnum = pgEnum('admission_fact_unit', [
  'points',
  'average',
  'units',
  'boolean',
  'text',
]);
export const alternativePathKindEnum = pgEnum('alternative_path_kind', [
  'prep_program',
  'transfer_path',
  'prior_studies',
  'exceptions_committee',
  'special_population',
  'similar_program',
  'lower_threshold_institution',
  'online_or_abroad',
  'manual_check',
]);
export const sourceDifficultyEnum = pgEnum('source_difficulty', [
  'easy',
  'browser_required',
  'hard_manual',
]);
export const ingestionJobStatusEnum = pgEnum('ingestion_job_status', [
  'pending',
  'running',
  'succeeded',
  'failed',
  'needs_review',
]);
export const reviewItemStatusEnum = pgEnum('review_item_status', [
  'pending',
  'approved',
  'rejected',
]);
export const documentKindEnum = pgEnum('document_kind', ['psychometric', 'bagrut', 'other']);
export const storageProviderEnum = pgEnum('storage_provider', [
  'local',
  'supabase_storage',
  's3',
  'other',
]);
export const freshnessSourceClassEnum = pgEnum('freshness_source_class', [
  'api_static_json',
  'browser_required',
  'official_html',
  'pdf_text',
  'score_only_calculator',
]);
export const freshnessCapabilityEnum = pgEnum('freshness_capability', [
  'blocked',
  'decision_capable',
  'score_only',
]);
export const sourceFreshnessStatusEnum = pgEnum('source_freshness_status', [
  'blocked',
  'changed_needs_review',
  'failed',
  'fresh',
]);

export const institutions = pgTable('institutions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  region: geographicRegionEnum('region').notNull(),
  domain: text('domain'),
  logoUrl: text('logo_url'),
  programUrl: text('program_url'),
  calculatorUrl: text('calculator_url'),
  universityId: text('university_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const universityCalculatorConfigs = pgTable('university_calculator_configs', {
  institutionId: text('institution_id')
    .primaryKey()
    .references(() => institutions.id, { onDelete: 'cascade' }),
  formulaType: calculatorFormulaTypeEnum('formula_type').notNull(),
  psyWeight: real('psy_weight'),
  bagrutWeight: real('bagrut_weight'),
  minPsychometric: integer('min_psychometric'),
  minBagrut: integer('min_bagrut'),
  scaleDescription: text('scale_description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const programs = pgTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  institutionName: text('institution_name').notNull(),
  institutionId: text('institution_id').references(() => institutions.id),
  type: programTypeEnum('type').notNull(),
  category: text('category').notNull(),
  admissionType: admissionTypeEnum('admission_type').notNull(),
  riasecR: integer('riasec_r').notNull(),
  riasecI: integer('riasec_i').notNull(),
  riasecA: integer('riasec_a').notNull(),
  riasecS: integer('riasec_s').notNull(),
  riasecE: integer('riasec_e').notNull(),
  riasecC: integer('riasec_c').notNull(),
  isTauEngineering: boolean('is_tau_engineering').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const programInstitutions = pgTable(
  'program_institutions',
  {
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    institutionId: text('institution_id')
      .notNull()
      .references(() => institutions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.programId, table.institutionId] }),
  }),
);

export const admissionRequirements = pgTable('admission_requirements', {
  id: text('id').primaryKey(),
  programId: text('program_id')
    .notNull()
    .references(() => programs.id, { onDelete: 'cascade' }),
  institutionId: text('institution_id')
    .notNull()
    .references(() => institutions.id, { onDelete: 'cascade' }),
  durationYears: integer('duration_years'),
  estimatedStudentsPerYear: text('estimated_students_per_year'),
  quantitativeMinRequirement: integer('quantitative_min_requirement'),
  englishMinRequirement: integer('english_min_requirement'),
  admissionRequirements: text('admission_requirements').array().default([]).notNull(),
  specificAdmissionNotes: text('specific_admission_notes').array().default([]).notNull(),
  programDescription: text('program_description'),
  reviewStatus: reviewStatusEnum('review_status').default('seeded').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const admissionThresholds = pgTable(
  'admission_thresholds',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    institutionId: text('institution_id')
      .notNull()
      .references(() => institutions.id, { onDelete: 'cascade' }),
    universityId: text('university_id').notNull(),
    thresholdKind: thresholdKindEnum('threshold_kind').notNull(),
    thresholdValue: integer('threshold_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scopeUnique: uniqueIndex('admission_thresholds_scope_unique').on(
      table.programId,
      table.institutionId,
      table.universityId,
      table.thresholdKind,
    ),
  }),
);

export const sourceUrls = pgTable('source_urls', {
  id: text('id').primaryKey(),
  admissionRequirementId: text('admission_requirement_id')
    .notNull()
    .references(() => admissionRequirements.id, { onDelete: 'cascade' }),
  institutionId: text('institution_id')
    .notNull()
    .references(() => institutions.id, { onDelete: 'cascade' }),
  programId: text('program_id')
    .notNull()
    .references(() => programs.id, { onDelete: 'cascade' }),
  kind: sourceUrlKindEnum('kind').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const requirementVersions = pgTable('requirement_versions', {
  id: text('id').primaryKey(),
  admissionRequirementId: text('admission_requirement_id')
    .notNull()
    .references(() => admissionRequirements.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  durationYears: integer('duration_years'),
  estimatedStudentsPerYear: text('estimated_students_per_year'),
  quantitativeMinRequirement: integer('quantitative_min_requirement'),
  englishMinRequirement: integer('english_min_requirement'),
  admissionRequirements: text('admission_requirements').array().default([]).notNull(),
  specificAdmissionNotes: text('specific_admission_notes').array().default([]).notNull(),
  programDescription: text('program_description'),
  sourceSnapshot: jsonb('source_snapshot')
    .$type<Record<string, string | null>>()
    .default({})
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const admissionsSourceCandidates = pgTable('admissions_source_candidates', {
  id: text('id').primaryKey(),
  admissionRequirementId: text('admission_requirement_id')
    .notNull()
    .references(() => admissionRequirements.id, { onDelete: 'cascade' }),
  institutionId: text('institution_id')
    .notNull()
    .references(() => institutions.id, { onDelete: 'cascade' }),
  programId: text('program_id')
    .notNull()
    .references(() => programs.id, { onDelete: 'cascade' }),
  origin: admissionsSourceOriginEnum('origin').notNull(),
  specificity: admissionsSourceSpecificityEnum('specificity').notNull(),
  confidence: admissionsConfidenceEnum('confidence').notNull(),
  url: text('url').notNull(),
  title: text('title'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const admissionFacts = pgTable('admission_facts', {
  id: text('id').primaryKey(),
  admissionRequirementId: text('admission_requirement_id')
    .notNull()
    .references(() => admissionRequirements.id, { onDelete: 'cascade' }),
  institutionId: text('institution_id')
    .notNull()
    .references(() => institutions.id, { onDelete: 'cascade' }),
  programId: text('program_id')
    .notNull()
    .references(() => programs.id, { onDelete: 'cascade' }),
  sourceCandidateId: text('source_candidate_id').references(() => admissionsSourceCandidates.id, {
    onDelete: 'set null',
  }),
  kind: admissionFactKindEnum('kind').notNull(),
  field: admissionFactFieldEnum('field').notNull(),
  comparison: admissionComparisonEnum('comparison').notNull(),
  valueNumber: real('value_number'),
  valueText: text('value_text'),
  unit: admissionFactUnitEnum('unit').notNull(),
  description: text('description').notNull(),
  confidence: admissionsConfidenceEnum('confidence').notNull(),
  isRequired: boolean('is_required').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const admissionAlternativePaths = pgTable('admission_alternative_paths', {
  id: text('id').primaryKey(),
  admissionRequirementId: text('admission_requirement_id')
    .notNull()
    .references(() => admissionRequirements.id, { onDelete: 'cascade' }),
  institutionId: text('institution_id')
    .notNull()
    .references(() => institutions.id, { onDelete: 'cascade' }),
  programId: text('program_id')
    .notNull()
    .references(() => programs.id, { onDelete: 'cascade' }),
  sourceCandidateId: text('source_candidate_id').references(() => admissionsSourceCandidates.id, {
    onDelete: 'set null',
  }),
  kind: alternativePathKindEnum('kind').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  url: text('url'),
  priority: integer('priority').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  geographicPreference: geographicRegionEnum('geographic_preference').default('any').notNull(),
  psychometricOverall: integer('psychometric_overall'),
  psychometricQuantitative: integer('psychometric_quantitative'),
  psychometricVerbal: integer('psychometric_verbal'),
  psychometricEnglish: integer('psychometric_english'),
  bagrutWeightedAverage: integer('bagrut_weighted_average'),
  riasecR: integer('riasec_r'),
  riasecI: integer('riasec_i'),
  riasecA: integer('riasec_a'),
  riasecS: integer('riasec_s'),
  riasecE: integer('riasec_e'),
  riasecC: integer('riasec_c'),
  avoidanceTags: text('avoidance_tags').array().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const savedPrograms = pgTable(
  'saved_programs',
  {
    userId: uuid('user_id').notNull(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.programId] }),
  }),
);

export const uploadedDocuments = pgTable('uploaded_documents', {
  id: text('id').primaryKey(),
  userId: uuid('user_id'),
  kind: documentKindEnum('kind').notNull(),
  storageProvider: storageProviderEnum('storage_provider').notNull(),
  storagePath: text('storage_path').notNull(),
  originalFileName: text('original_file_name').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ingestionSources = pgTable('ingestion_sources', {
  id: text('id').primaryKey(),
  institutionId: text('institution_id').references(() => institutions.id, { onDelete: 'set null' }),
  programId: text('program_id').references(() => programs.id, { onDelete: 'set null' }),
  difficulty: sourceDifficultyEnum('difficulty').notNull(),
  sourceUrl: text('source_url').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ingestionJobs = pgTable('ingestion_jobs', {
  id: text('id').primaryKey(),
  sourceId: text('source_id')
    .notNull()
    .references(() => ingestionSources.id, { onDelete: 'cascade' }),
  status: ingestionJobStatusEnum('status').default('pending').notNull(),
  difficulty: sourceDifficultyEnum('difficulty').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorText: text('error_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ingestionPayloads = pgTable('ingestion_payloads', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => ingestionJobs.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reviewItems = pgTable('review_items', {
  id: text('id').primaryKey(),
  payloadId: text('payload_id')
    .notNull()
    .references(() => ingestionPayloads.id, { onDelete: 'cascade' }),
  admissionRequirementId: text('admission_requirement_id').references(
    () => admissionRequirements.id,
    {
      onDelete: 'set null',
    },
  ),
  targetField: text('target_field').notNull(),
  proposedValue: jsonb('proposed_value').$type<unknown>().notNull(),
  status: reviewItemStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
});

export const sourceFreshnessStates = pgTable(
  'source_freshness_states',
  {
    sourceId: text('source_id')
      .primaryKey()
      .references(() => ingestionSources.id, { onDelete: 'cascade' }),
    sourceClass: freshnessSourceClassEnum('source_class').notNull(),
    capability: freshnessCapabilityEnum('capability').notNull(),
    status: sourceFreshnessStatusEnum('status').notNull(),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    lastSuccessfulCheckAt: timestamp('last_successful_check_at', { withTimezone: true }),
    lastChangedAt: timestamp('last_changed_at', { withTimezone: true }),
    latestFailureReason: text('latest_failure_reason'),
    blockedReason: text('blocked_reason'),
    rawFingerprint: text('raw_fingerprint'),
    normalizedFingerprint: text('normalized_fingerprint'),
    normalizedDecisionPayload: jsonb('normalized_decision_payload')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    latestReviewItemId: text('latest_review_item_id').references(() => reviewItems.id, {
      onDelete: 'set null',
    }),
    nextAction: text('next_action'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('source_freshness_states_status_idx').on(table.status),
    latestReviewItemIdx: index('source_freshness_states_latest_review_item_idx').on(
      table.latestReviewItemId,
    ),
  }),
);

export const sourceFreshnessChecks = pgTable(
  'source_freshness_checks',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => ingestionSources.id, { onDelete: 'cascade' }),
    sourceClass: freshnessSourceClassEnum('source_class').notNull(),
    capability: freshnessCapabilityEnum('capability').notNull(),
    status: sourceFreshnessStatusEnum('status').notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
    successful: boolean('successful').notNull(),
    failureReason: text('failure_reason'),
    blockedReason: text('blocked_reason'),
    rawFingerprint: text('raw_fingerprint'),
    normalizedFingerprint: text('normalized_fingerprint'),
    normalizedDecisionPayload: jsonb('normalized_decision_payload')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    reviewWorthy: boolean('review_worthy').default(false).notNull(),
    reviewItemId: text('review_item_id').references(() => reviewItems.id, {
      onDelete: 'set null',
    }),
    nextAction: text('next_action'),
  },
  (table) => ({
    sourceCheckedAtIdx: index('source_freshness_checks_source_checked_at_idx').on(
      table.sourceId,
      table.checkedAt,
    ),
    statusIdx: index('source_freshness_checks_status_idx').on(table.status),
    reviewItemIdx: index('source_freshness_checks_review_item_idx').on(table.reviewItemId),
  }),
);
