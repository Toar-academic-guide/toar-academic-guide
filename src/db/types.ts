import type {
  admissionRequirements,
  admissionThresholds,
  ingestionJobs,
  ingestionPayloads,
  ingestionSources,
  institutions,
  programInstitutions,
  programs,
  requirementVersions,
  reviewItems,
  savedPrograms,
  sourceUrls,
  uploadedDocuments,
  universityCalculatorConfigs,
  userProfiles,
  users,
} from './schema';

export type InstitutionRow = typeof institutions.$inferSelect;
export type UniversityCalculatorConfigRow = typeof universityCalculatorConfigs.$inferSelect;
export type ProgramRow = typeof programs.$inferSelect;
export type ProgramInstitutionRow = typeof programInstitutions.$inferSelect;
export type AdmissionRequirementRow = typeof admissionRequirements.$inferSelect;
export type AdmissionThresholdRow = typeof admissionThresholds.$inferSelect;
export type SourceUrlRow = typeof sourceUrls.$inferSelect;
export type RequirementVersionRow = typeof requirementVersions.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type UserProfileRow = typeof userProfiles.$inferSelect;
export type SavedProgramRow = typeof savedPrograms.$inferSelect;
export type UploadedDocumentRow = typeof uploadedDocuments.$inferSelect;
export type IngestionSourceRow = typeof ingestionSources.$inferSelect;
export type IngestionJobRow = typeof ingestionJobs.$inferSelect;
export type IngestionPayloadRow = typeof ingestionPayloads.$inferSelect;
export type ReviewItemRow = typeof reviewItems.$inferSelect;
