import type { AdmissionsExtraInputs, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';

export function admissionsInputValue(
  input: AdmissionsExtraInputs | undefined,
  requiredInput: AdmissionsRequiredInput,
): unknown {
  switch (requiredInput) {
    case 'psychometric_math':
      return input?.psychometricMath;
    case 'psychometric_verbal':
      return input?.psychometricVerbal;
    case 'psychometric_english':
      return input?.psychometricEnglish;
    case 'math_units':
      return input?.mathUnits;
    case 'math_grade':
      return input?.mathGrade;
    case 'english_units':
      return input?.englishUnits;
    case 'english_grade':
      return input?.englishGrade;
    case 'physics_units':
      return input?.physicsUnits;
    case 'physics_grade':
      return input?.physicsGrade;
    case 'cs_units':
      return input?.csUnits;
    case 'cs_grade':
      return input?.csGrade;
    case 'bagrut_subject_record':
      return input?.bagrutSubjectRecord;
    case 'bagrut_profile_version':
      return input?.bagrutProfileSchemaVersion;
    case 'bagrut_sector':
      return input?.bagrutSector;
  }
}
