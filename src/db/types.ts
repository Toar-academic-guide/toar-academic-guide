import type {
  admissionAlternativePaths,
  admissionFacts,
  admissionRequirements,
  admissionThresholds,
  bagrutProfileVersions,
  admissionsSourceCandidates,
  ingestionJobs,
  ingestionPayloads,
  ingestionSources,
  institutions,
  programInstitutions,
  programs,
  requirementVersions,
  reviewItems,
  savedPrograms,
  sourceFreshnessChecks,
  sourceFreshnessStates,
  sourceUrls,
  uploadedDocuments,
  universityCalculatorConfigs,
  userProfiles,
} from './schema';

export type InstitutionRow = typeof institutions.$inferSelect;
export type UniversityCalculatorConfigRow = typeof universityCalculatorConfigs.$inferSelect;
export type ProgramRow = typeof programs.$inferSelect;
export type ProgramInstitutionRow = typeof programInstitutions.$inferSelect;
export type AdmissionRequirementRow = typeof admissionRequirements.$inferSelect;
export type AdmissionThresholdRow = typeof admissionThresholds.$inferSelect;
export type SourceUrlRow = typeof sourceUrls.$inferSelect;
export type RequirementVersionRow = typeof requirementVersions.$inferSelect;
export type AdmissionsSourceCandidateRow = typeof admissionsSourceCandidates.$inferSelect;
export type AdmissionFactRow = typeof admissionFacts.$inferSelect;
export type AdmissionAlternativePathRow = typeof admissionAlternativePaths.$inferSelect;
export type UserProfileRow = typeof userProfiles.$inferSelect;
export type BagrutProfileVersionRow = typeof bagrutProfileVersions.$inferSelect;
export type SavedProgramRow = typeof savedPrograms.$inferSelect;
export type UploadedDocumentRow = typeof uploadedDocuments.$inferSelect;
export type IngestionSourceRow = typeof ingestionSources.$inferSelect;
export type IngestionJobRow = typeof ingestionJobs.$inferSelect;
export type IngestionPayloadRow = typeof ingestionPayloads.$inferSelect;
export type ReviewItemRow = typeof reviewItems.$inferSelect;
export type SourceFreshnessStateRow = typeof sourceFreshnessStates.$inferSelect;
export type SourceFreshnessCheckRow = typeof sourceFreshnessChecks.$inferSelect;
