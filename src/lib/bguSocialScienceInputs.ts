import { z } from 'zod';

export const bguSocialScienceInputsShape = {
  bguSocialScienceRoute: z
    .enum(['auto', 'score', 'psychometric', 'bagrut', 'age45', 'education_conditional'])
    .optional(),
  bguSocialScienceRequirementsConfirmed: z.boolean().optional(),
  bguSocialScienceLanguageConfirmed: z.boolean().optional(),
  bguReturningFromStudyBreak: z.boolean().optional(),
  bguSocialWorkAcademicBackground: z.enum(['none', 'other', 'social_work']).optional(),
  bguSocialWorkAcademicAverage: z.number().min(0).max(100).optional(),
  bguSocialWorkTranscriptProvided: z.boolean().optional(),
  bguApplicantAge: z.number().int().min(0).max(120).optional(),
  bguEducationSecondDepartment: z
    .enum(['philosophy', 'middle_east', 'art', 'israel_studies', 'other'])
    .optional(),
  bguEnglishClassificationMissing: z.boolean().optional(),
  bguHebrewRequirementsConfirmed: z.boolean().optional(),
  bguEducationEnglishConditionAcknowledged: z.boolean().optional(),
};

export const bguSocialScienceInputsSchema = z.object(bguSocialScienceInputsShape);
export type BguSocialScienceInputs = z.infer<typeof bguSocialScienceInputsSchema>;
export const BGU_SOCIAL_SCIENCE_PROFILE_KEYS = Object.keys(bguSocialScienceInputsShape) as Array<
  keyof BguSocialScienceInputs
>;

export function bguSocialScienceProgram(programId: string) {
  if (programId === 'bgu_socialwork') return 'social_work';
  return ['social_work', 'communication', 'education', 'political_science'].includes(programId)
    ? (programId as 'social_work' | 'communication' | 'education' | 'political_science')
    : null;
}
