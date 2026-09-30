import { colmanBagrutInputsShape } from '@/lib/colmanBagrutInputs';
import { tauPhysiotherapyInputsShape } from '@/lib/tauPhysiotherapyInputs';
import { hujiMedicineInputsShape } from '@/lib/hujiMedicineInputs';
import { bguHealthInputsShape } from '@/lib/bguHealthInputs';
import { bguQuantitativeInputShape } from '@/lib/bguQuantitativeInputs';
import { bguPsychologyInputsShape } from '@/lib/bguPsychologyInputs';
import { haifaAdmissionsInputsShape } from '@/lib/haifaAdmissionsInputs';
import { bguSocialScienceInputsShape } from '@/lib/bguSocialScienceInputs';
import { z } from 'zod';
import { bguEngineeringSchema } from '@/lib/bguEngineeringSchema';
import { bagrutSubjectRecordSchema } from '@/lib/bagrutSubjectRecordSchema';

const geographicRegionSchema = z.enum(['center', 'north', 'south', 'any']);
const avoidanceTagSchema = z.enum(['heavy-math', 'heavy-reading', 'bureaucracy', 'solo-work']);

const trimmedNonEmptyString = z.string().trim().min(1);
const boundedInteger = (min: number, max: number) => z.number().int().min(min).max(max);

const psychometricScoresSchema = z.strictObject({
  overall: boundedInteger(200, 800).optional(),
  quantitative: boundedInteger(50, 150).optional(),
  verbal: boundedInteger(50, 150).optional(),
  english: boundedInteger(50, 150).optional(),
});

const bagrutRecordSchema = z.strictObject({
  weightedAverage: boundedInteger(60, 120).optional(),
  subjectRecord: bagrutSubjectRecordSchema.optional(),
});

const admissionsInputsSchema = z.strictObject({
  ...haifaAdmissionsInputsShape,
  bguEngineering: bguEngineeringSchema.optional(),
  technionArchitectureBagrutAverage: z.number().min(0).max(119).optional(),
  technionArchitectureExamScore: z.number().min(0).max(140).optional(),
  technionArchitectureExamPassed: z.boolean().optional(),
  technionArchitectureRequirementsConfirmed: z.boolean().optional(),
  tauBagrutAverage: z.number().min(50).max(130).optional(),
  ...colmanBagrutInputsShape,
  ...bguPsychologyInputsShape,
  ...hujiMedicineInputsShape,
  ...bguHealthInputsShape,
  ...tauPhysiotherapyInputsShape,
  ...bguSocialScienceInputsShape,
  bguBagrutAverage: z.number().min(50).max(130).optional(),
  tauApplicationRequirementsConfirmed: z.boolean().optional(),
  tauManagementRequirementsConfirmed: z.boolean().optional(),
  tauManagementAcademicRouteConfirmed: z.boolean().optional(),
  tauManagementQualifyingMoocCount: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  tauManagementNoPsychometricMoocsConfirmed: z.boolean().optional(),
  bguLanguageRequirementsConfirmed: z.boolean().optional(),
  ...bguQuantitativeInputShape,
  tauMathPlacementScore: z.number().min(0).max(100).optional(),
});

const academicScoresSchema = z.strictObject({
  psychometric: psychometricScoresSchema.optional(),
  bagrut: bagrutRecordSchema.optional(),
  admissions: admissionsInputsSchema.optional(),
});

const uploadedDocumentSchema = z.strictObject({
  id: trimmedNonEmptyString,
  kind: z.enum(['psychometric', 'bagrut']),
  displayName: trimmedNonEmptyString,
  sizeBytes: z.number().int().nonnegative().nullable(),
});

const careerAssessmentDraftSchema = z.strictObject({
  screenIndex: boundedInteger(0, 100),
  multiSelectAnswers: z.record(z.string().min(1), z.array(trimmedNonEmptyString)),
  quickPickAnswers: z.record(z.string().min(1), z.enum(['yes', 'maybe', 'no'])),
  sliderAnswers: z.record(z.string().min(1), boundedInteger(-2, 2)),
  skippedScreens: z.array(boundedInteger(0, 100)),
});

const profileScoresSchema = z.strictObject({
  AN: z.number().min(0).max(5),
  TE: z.number().min(0).max(5),
  CR: z.number().min(0).max(5),
  SO: z.number().min(0).max(5),
  LE: z.number().min(0).max(5),
  OR: z.number().min(0).max(5),
  DI: z.number().min(0).max(5),
  ER: z.number().min(0).max(5),
});

const valuesProfileSchema = z.strictObject({
  incomeVsImpact: boundedInteger(-2, 2),
  independenceVsTeam: boundedInteger(-2, 2),
  growthVsStability: boundedInteger(-2, 2),
  prestigeVsMeaning: boundedInteger(-2, 2),
});

const assessmentFilterDraftSchema = z.strictObject({
  currentStep: boundedInteger(0, 100),
  answers: z.record(z.string().min(1), z.array(trimmedNonEmptyString)),
});

export const assessmentProgressSchema = z.discriminatedUnion('stage', [
  z.strictObject({
    schemaVersion: z.literal(1),
    stage: z.literal('career-assessment'),
    careerDraft: careerAssessmentDraftSchema,
  }),
  z.strictObject({
    schemaVersion: z.literal(1),
    stage: z.literal('quick-filters'),
    careerDraft: careerAssessmentDraftSchema,
    filterDraft: assessmentFilterDraftSchema,
    scores: profileScoresSchema,
    values: valuesProfileSchema,
  }),
  z.strictObject({
    schemaVersion: z.literal(1),
    stage: z.literal('completed'),
    scores: profileScoresSchema,
    values: valuesProfileSchema,
    geographicPreference: geographicRegionSchema,
    avoidances: z.array(avoidanceTagSchema),
  }),
]);

export const userProfileSchema = z.strictObject({
  firstName: trimmedNonEmptyString.optional(),
  lastName: trimmedNonEmptyString.optional(),
  geographicPreference: geographicRegionSchema,
  academicScores: academicScoresSchema.optional(),
  assessmentProgress: assessmentProgressSchema.optional(),
  savedProgramIds: z.array(trimmedNonEmptyString).optional(),
  uploadedDocuments: z.array(uploadedDocumentSchema).optional(),
});

export const profileRequestBodySchema = z.strictObject({
  profile: userProfileSchema,
  mode: z.enum(['replace', 'merge_local_draft']).optional(),
});

export const savedProgramRequestBodySchema = z.strictObject({
  programId: trimmedNonEmptyString,
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type ProfileRequestBodyInput = z.infer<typeof profileRequestBodySchema>;
export type SavedProgramRequestBodyInput = z.infer<typeof savedProgramRequestBodySchema>;
