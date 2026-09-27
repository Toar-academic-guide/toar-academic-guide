import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import type { AdmissionsProgramInput } from '@/server/ingestion/admissionsSourceAdapters';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';
import { TAU_BUSINESS_CONTRACT } from '@/data/admissions/tauProgramVerification';
import {
  evaluateTauManagementAdmission,
  TAU_MANAGEMENT_REQUIREMENTS_URL,
  type TauManagementApplicant,
} from './tauManagementPolicy';

const fields: Partial<Record<keyof TauManagementApplicant, AdmissionsRequiredInput>> = {
  psychometric: 'psychometric_overall',
  bagrutAverage: 'tau_bagrut_average',
  managementScore: 'tau_bagrut_average',
  mathUnits: 'math_units',
  mathGrade: 'math_grade',
  quantitativeScore: 'psychometric_math',
  englishUnits: 'english_units',
  englishGrade: 'english_grade',
  requirementsConfirmed: 'tau_management_requirements',
  academicRouteConfirmed: 'tau_management_academic_route',
  qualifyingMoocCount: 'tau_management_mooc_count',
  noPsychometricMoocsConfirmed: 'tau_management_no_psychometric_moocs',
};
const routeNames = {
  psychometric_680: 'פסיכומטרי 680 ומעלה',
  psychometric_bagrut: 'פסיכומטרי 640 ומעלה וממוצע בגרות 95 ומעלה',
  academic_study: 'לימודים אקדמיים קודמים ופסיכומטרי 640 ומעלה',
  no_psychometric: 'בגרות וקורסים מקוונים ללא פסיכומטרי',
  management_score: 'ציון התאמה לניהול ופסיכומטרי 620 ומעלה',
  pma: 'PMA של 835 ומעלה וציון התאמה לניהול',
};

export async function evaluateTauManagementResult(args: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
  program: AdmissionsProgramInput;
  fetcher: typeof fetch;
}): Promise<AdmissionsEvaluationResult> {
  const { input, institution, program, fetcher } = args;
  const extra = input.extraInputs;
  const subjects = extra?.bagrutSubjectRecord?.subjects;
  const mathematics = subjects?.find((subject) => subject.subjectId === 'mathematics');
  const english = subjects?.find((subject) => subject.subjectId === 'english');
  const applicant: TauManagementApplicant = {
    psychometric: input.psychometric,
    bagrutAverage: extra?.tauBagrutAverage,
    acceptanceThreshold: TAU_BUSINESS_CONTRACT.calculation.cutoff.acceptance,
    rejectionThreshold: TAU_BUSINESS_CONTRACT.calculation.cutoff.rejection!,
    mathUnits: mathematics?.units ?? extra?.mathUnits,
    mathGrade: mathematics?.grade ?? extra?.mathGrade,
    quantitativeScore: extra?.psychometricMath,
    englishUnits: english?.units ?? extra?.englishUnits,
    englishGrade: english?.grade ?? extra?.englishGrade,
    requirementsConfirmed: extra?.tauManagementRequirementsConfirmed,
    academicRouteConfirmed: extra?.tauManagementAcademicRouteConfirmed,
    qualifyingMoocCount: extra?.tauManagementQualifyingMoocCount,
    noPsychometricMoocsConfirmed: extra?.tauManagementNoPsychometricMoocsConfirmed,
  };
  let admission = evaluateTauManagementAdmission(applicant);
  // Direct routes need no combined score. Replay only when that score can affect the outcome.
  if (
    (admission.missingInputs.includes('managementScore') ||
      (admission.decision === 'below' && admission.unmetRequirements.length === 0)) &&
    applicant.psychometric !== undefined &&
    applicant.bagrutAverage !== undefined
  ) {
    const proof = await runTauAdmissionsProof({
      fetcher,
      program,
      applicant: { psychometric: applicant.psychometric, bagrutAverage: applicant.bagrutAverage },
    });
    const payload = proof.normalizedPayload;
    if (
      proof.status !== 'succeeded' ||
      proof.proofLevel !== 'exact_official' ||
      typeof payload.selectedScore !== 'number' ||
      typeof payload.acceptanceThreshold !== 'number' ||
      typeof payload.rejectionThreshold !== 'number' ||
      !Array.isArray(payload.matchedProgramIds) ||
      !payload.matchedProgramIds.includes('122111050000')
    ) {
      throw new Error('TAU Management did not return its mapped score and current cutoffs');
    }
    applicant.managementScore = payload.selectedScore;
    applicant.acceptanceThreshold = payload.acceptanceThreshold;
    applicant.rejectionThreshold = payload.rejectionThreshold;
    admission = evaluateTauManagementAdmission(applicant);
  }

  const { id, name, region, domain, logoUrl, programUrl, calculatorUrl, universityId } =
    institution;
  const base = {
    institution: { id, name, region, domain, logoUrl, programUrl, calculatorUrl, universityId },
    linkedInstitutionId: id,
    officialUrls: [TAU_MANAGEMENT_REQUIREMENTS_URL],
  };
  if (admission.decision === 'needs_input') {
    const requiredInputs = [
      ...new Set(
        admission.missingInputs.flatMap((field) => (fields[field] ? [fields[field]!] : [])),
      ),
    ];
    return {
      ...base,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'נדרשים נתונים נוספים לניהול',
      explanation: 'נדרשים פרטי תנאי הקבלה ואפיקים חלופיים כדי לבדוק זכאות לניהול.',
      nextAction: 'השלימו את הנתונים החסרים בפרופיל האקדמי ונסו שוב.',
      requiredInputs,
    };
  }
  const scoreRoute =
    admission.route === 'pma' || admission.route === 'management_score' || !admission.route;
  let score = admission.adjustedManagementScore ?? applicant.managementScore;
  let threshold = applicant.acceptanceThreshold;
  let scoreLabel = 'ציון התאמה לניהול';
  if (admission.route === 'no_psychometric') {
    score = applicant.bagrutAverage;
    threshold = 104;
    scoreLabel = 'ממוצע בגרות רשמי';
  } else if (!scoreRoute) {
    score = applicant.psychometric;
    threshold = admission.route === 'psychometric_680' ? 680 : 640;
    scoreLabel = 'פסיכומטרי';
  }
  let explanation = `לא מתקיימים תנאי אפיקי הניהול שנבדקו${admission.pma !== undefined ? ` (PMA ${admission.pma}, נדרש 835)` : ''}.`;
  if (admission.route) {
    explanation = `עומדים בתנאי אפיק ${routeNames[admission.route]}${admission.pma !== undefined ? ` (PMA ${admission.pma})` : ''}. הזכאות מותנית בשאר תנאי האוניברסיטה והחוג השני שאישרתם.`;
  } else if (admission.unmetRequirements.length) {
    explanation = `לא מתקיימים תנאי ${admission.unmetRequirements.includes('mathematics') ? 'מתמטיקה: 4 יח״ל בציון עובר או כמותי 140 ומעלה' : 'האוניברסיטה והחוג השני'}.`;
  } else if (admission.decision === 'pending') {
    explanation = 'הציון בין סף הדחייה לסף הקבלה באפיקי הניהול שנבדקו.';
  }
  return {
    ...base,
    capability: 'exact',
    kind: 'exact',
    confidence: 'high',
    decision: admission.decision === 'accepted' ? 'eligible_to_apply' : admission.decision,
    sourceLabel: 'תנאי קבלה רשמיים לניהול',
    ...(score !== undefined ? { score, threshold, scoreLabel } : {}),
    explanation,
    nextAction: 'בדקו באתר התוכנית את תנאי הרישום והחוג השני.',
  };
}
