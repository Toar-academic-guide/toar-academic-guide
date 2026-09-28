import { BGU_HEALTH_PROFILE_KEYS } from './bguHealthInputs';
import { BGU_QUANTITATIVE_PROFILE_KEYS } from './calculatorInputRequirements';
import type { AcademicScores } from '@/types';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import { BGU_SOCIAL_SCIENCE_PROFILE_KEYS } from './bguSocialScienceInputs';

/**
 * Converts the structured academic profile into the explicit input contract
 * used by admissions evaluators. Unknown Bagrut subjects are deliberately
 * omitted until an evaluator declares that it can use them.
 */
export function admissionsExtraInputsFromAcademicScores(
  academicScores: AcademicScores | undefined,
): AdmissionsExtraInputs | undefined {
  const bagrutSubjectRecord = academicScores?.bagrut?.subjectRecord;
  const subjectsById = new Map(
    bagrutSubjectRecord?.subjects.map((subject) => [subject.subjectId, subject]),
  );
  const mathematics = subjectsById.get('mathematics');
  const english = subjectsById.get('english');
  const physics = subjectsById.get('physics');
  const computerScience = subjectsById.get('computer_science');

  const extraInputs: AdmissionsExtraInputs = {
    ...Object.fromEntries(
      BGU_SOCIAL_SCIENCE_PROFILE_KEYS.map((key) => [key, academicScores?.admissions?.[key]]),
    ),
    ...Object.fromEntries(
      BGU_QUANTITATIVE_PROFILE_KEYS.map((key) => [key, academicScores?.admissions?.[key]]),
    ),
    bguEngineering: academicScores?.admissions?.bguEngineering,
    technionArchitectureBagrutAverage:
      academicScores?.admissions?.technionArchitectureBagrutAverage,
    technionArchitectureExamScore: academicScores?.admissions?.technionArchitectureExamScore,
    technionArchitectureExamPassed: academicScores?.admissions?.technionArchitectureExamPassed,
    technionArchitectureRequirementsConfirmed:
      academicScores?.admissions?.technionArchitectureRequirementsConfirmed,
    psychometricMath: academicScores?.psychometric?.quantitative,
    psychometricVerbal: academicScores?.psychometric?.verbal,
    psychometricEnglish: academicScores?.psychometric?.english,
    tauBagrutAverage: academicScores?.admissions?.tauBagrutAverage,
    ...Object.fromEntries(
      BGU_HEALTH_PROFILE_KEYS.map((key) => [key, academicScores?.admissions?.[key]]),
    ),
    bguPsychologyRoute: academicScores?.admissions?.bguPsychologyRoute,
    bguPsychologyRequirementsConfirmed:
      academicScores?.admissions?.bguPsychologyRequirementsConfirmed,
    bguPreparatoryTrack: academicScores?.admissions?.bguPreparatoryTrack,
    bguPreparatoryAverage: academicScores?.admissions?.bguPreparatoryAverage,
    bguPreparatoryCompleted: academicScores?.admissions?.bguPreparatoryCompleted,
    bguBagrutAverage: academicScores?.admissions?.bguBagrutAverage,
    tauApplicationRequirementsConfirmed:
      academicScores?.admissions?.tauApplicationRequirementsConfirmed,
    bguLanguageRequirementsConfirmed: academicScores?.admissions?.bguLanguageRequirementsConfirmed,
    tauManagementRequirementsConfirmed:
      academicScores?.admissions?.tauManagementRequirementsConfirmed,
    tauManagementAcademicRouteConfirmed:
      academicScores?.admissions?.tauManagementAcademicRouteConfirmed,
    tauManagementQualifyingMoocCount: academicScores?.admissions?.tauManagementQualifyingMoocCount,
    tauManagementNoPsychometricMoocsConfirmed:
      academicScores?.admissions?.tauManagementNoPsychometricMoocsConfirmed,
    tauMathPlacementScore: academicScores?.admissions?.tauMathPlacementScore,
    bagrutSubjectRecord,
    bagrutProfileSchemaVersion: bagrutSubjectRecord?.schemaVersion,
    bagrutSector: bagrutSubjectRecord?.sector,
    mathUnits: mathematics?.units,
    mathGrade: mathematics?.grade,
    englishUnits: english?.units,
    englishGrade: english?.grade,
    physicsUnits: physics?.units,
    physicsGrade: physics?.grade,
    csUnits: computerScience?.units,
    csGrade: computerScience?.grade,
  };

  return Object.values(extraInputs).some((value) => value !== undefined) ? extraInputs : undefined;
}
