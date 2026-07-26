import {
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

const ARCHITECTURE_URL = 'https://admissions.technion.ac.il/architecture-info/';
const COLMAN_COMPUTER_SCIENCE_URL =
  'https://www.colman.ac.il/academics/ba/computer-science/';

/**
 * Replays official application-eligibility gates whose next step is a
 * programme-specific manual assessment. A score of 1/0 is intentionally a
 * gate result, not an admission score; the normalized verdict is therefore
 * eligible_to_apply/below rather than accepted.
 */
export async function runManualRequirementsAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const program = context.program;
  if (!program?.manualGateProfile) {
    throw new Error('Manual requirements adapter requires a gate profile');
  }

  const officialUrl =
    program.manualGateProfile === 'technion_architecture'
      ? ARCHITECTURE_URL
      : COLMAN_COMPUTER_SCIENCE_URL;
  const gateResult = evaluateGateProfile(program.manualGateProfile, context);
  const selectedScore = gateResult.passed ? 1 : 0;

  return {
    id: program.targetId ?? `manual-${program.id}-live`,
    institutionId: program.manualGateProfile === 'technion_architecture' ? 'technion' : 'colman',
    institutionName:
      program.manualGateProfile === 'technion_architecture'
        ? 'Technion'
        : 'College of Management Academic Studies',
    officialUrl,
    adapterId: 'manual_requirements',
    capability: 'decision_capable',
    proofLevel: 'exact_official',
    status: 'succeeded',
    sourceClass: sourceClassForCapability('decision_capable'),
    reproducedFields: ['applicationEligibility', 'officialVerdict'],
    normalizedPayload: {
      pairId: program.pairId,
      programId: program.id,
      programName: program.name,
      source: 'official_requirements_manual_gate',
      selectedScore,
      acceptanceThreshold: 1,
      rejectionThreshold: 0,
      officialVerdict: gateResult.passed ? 'eligible_to_apply' : 'below',
      unmetRequirements: gateResult.unmetRequirements,
    },
    limitations: [
      'This proof establishes application eligibility only; the institution’s entrance exam, internal test, interview, or suitability review remains a manual gate.',
    ],
    nextAction: 'Keep the manual assessment and current requirements page visible to the applicant.',
    rawResponseMetadata: [readOfficialResponseMetadata(officialUrl, new Response(null, { status: 200 }))],
  };
}

function evaluateGateProfile(
  profile: NonNullable<NonNullable<AdmissionsAdapterContext['program']>['manualGateProfile']>,
  context: AdmissionsAdapterContext,
): { passed: boolean; unmetRequirements: string[] } {
  const applicant = context.applicant;
  if (profile === 'colman_computer_science') {
    const mathRoute =
      (applicant.mathUnits === 5 && (applicant.mathGrade ?? -1) >= 70) ||
      (applicant.mathUnits === 4 && (applicant.mathGrade ?? -1) >= 80);
    const unmetRequirements = [
      ...(applicant.bagrutAverage < 85 ? ['ממוצע בגרות משוקלל 85 ומעלה'] : []),
      ...(!mathRoute ? ['מתמטיקה: 5 יח״ל בציון 70 ומעלה או 4 יח״ל בציון 80 ומעלה'] : []),
    ];
    return { passed: unmetRequirements.length === 0, unmetRequirements };
  }

  const mathPass =
    (applicant.mathUnits === 5 && (applicant.mathGrade ?? -1) >= 65) ||
    (applicant.mathUnits === 4 && (applicant.mathGrade ?? -1) >= 70);
  const englishPass = (applicant.englishUnits ?? 0) >= 4;
  const completeBagrut = applicant.bagrutAverage > 0;
  const unmetRequirements = [
    ...(!completeBagrut ? ['תעודת בגרות מלאה'] : []),
    ...(!mathPass ? ['מתמטיקה: 4 יח״ל בציון 70 ומעלה או 5 יח״ל בציון 65 ומעלה'] : []),
    ...(!englishPass ? ['אנגלית ברמת 4 יח״ל לפחות'] : []),
  ];
  return { passed: unmetRequirements.length === 0, unmetRequirements };
}
