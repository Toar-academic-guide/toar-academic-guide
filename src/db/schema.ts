import {
  boolean,
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
