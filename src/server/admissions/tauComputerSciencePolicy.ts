import type { AdmissionsExtraInputs, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';
import { evaluateTauEngineeringExactSciencesBonus } from './bagrutPolicies';

/** Standard Israeli Bagrut route; alternative academic routes require university review. */
export function evaluateTauComputerScienceGates(input: {
  psychometric: number;
  extraInputs?: AdmissionsExtraInputs;
}): {
  requiredInputs: AdmissionsRequiredInput[];
  unmetRequirements: string[];
  exactSciencesBonusEligible: boolean;
} {
  const extra = input.extraInputs;
  const requiredInputs: AdmissionsRequiredInput[] = [];
  const unmetRequirements: string[] = [];
  const record = extra?.bagrutSubjectRecord;
  const mathematics = record?.subjects.find((subject) => subject.subjectId === 'mathematics');

  if (!mathematics) requiredInputs.push('bagrut_subject_record');
  if (extra?.tauApplicationRequirementsConfirmed === undefined) {
    requiredInputs.push('tau_application_requirements');
  } else if (!extra.tauApplicationRequirementsConfirmed) {
    unmetRequirements.push(
      'זכאות לבגרות, אנגלית ברמת מתקדמים א׳, דרישות עברית והרשמה למדעי המחשב בעדיפות ראשונה',
    );
  }
  if (input.psychometric < 660) unmetRequirements.push('פסיכומטרי 660 ומעלה במסלול הרגיל');

  if (mathematics) {
    const { units, grade } = mathematics;
    const direct = (units === 5 && grade >= 80) || (units === 4 && grade >= 88);
    const withPlacement = (units === 5 && grade >= 70) || (units === 4 && grade >= 75);
    if (!direct && withPlacement && extra?.tauMathPlacementScore === undefined) {
      requiredInputs.push('tau_math_placement_score');
    } else if (!direct && (!withPlacement || (extra?.tauMathPlacementScore ?? 0) < 75)) {
      unmetRequirements.push(
        'מתמטיקה: 5 יחידות בציון 80 או 4 יחידות בציון 88; בציונים נמוכים יותר נדרש מבחן סיווג בציון 75',
      );
    }
  }
  return {
    requiredInputs,
    unmetRequirements,
    exactSciencesBonusEligible: record
      ? evaluateTauEngineeringExactSciencesBonus(record).qualifies
      : false,
  };
}
