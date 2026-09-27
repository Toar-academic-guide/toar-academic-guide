import type { AcademicScores } from '@/types';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';

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
    psychometricMath: academicScores?.psychometric?.quantitative,
    psychometricVerbal: academicScores?.psychometric?.verbal,
    psychometricEnglish: academicScores?.psychometric?.english,
    tauBagrutAverage: academicScores?.admissions?.tauBagrutAverage,
    bguBagrutAverage: academicScores?.admissions?.bguBagrutAverage,
    tauApplicationRequirementsConfirmed:
      academicScores?.admissions?.tauApplicationRequirementsConfirmed,
    bguLanguageRequirementsConfirmed: academicScores?.admissions?.bguLanguageRequirementsConfirmed,
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
