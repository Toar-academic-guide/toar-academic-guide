import { evaluateAfekaPublishedRoutes } from './afekaPublishedRoutesEvaluation';
import { isBatchCUnsupportedProgramId } from '@/data/admissions/batchCUnsupportedProgramIds';
import { isBiuPublishedRoutePair } from '@/data/admissions/biuPublishedRoutes';
import { evaluateBiuPublishedRoutes } from './biuPublishedRoutesEvaluation';
import { evaluateBatchCUnsupportedPath } from './batchCUnsupportedPathEvaluation';
import { evaluateBatchBManualPath, isBatchBManualProgram } from './batchBManualPathEvaluation';
import { evaluateTelhaiPublishedRoutes } from './telhaiPublishedRoutesEvaluation';
import { evaluateOnoPublishedRoutes } from './onoPublishedRoutesEvaluation';
import { evaluateRuppinComputerScience } from './ruppinComputerScienceEvaluation';
import {
  confirmationCondition,
  withScoreAssessment,
  type AdditionalCondition,
} from './scoreAssessment';
import { evaluateTauPhysiotherapyResult } from './tauPhysiotherapyEvaluation';
import { evaluateMtaComputerScience } from './mtaComputerScienceEvaluation';
import { evaluateMtaPublishedRoutes } from './mtaPublishedRoutesEvaluation';
import { evaluateColmanPublishedRoutes } from './colmanPublishedRoutesEvaluation';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { evaluateReichmanPublishedRoutes } from './reichmanPublishedRoutesEvaluation';
import { evaluateColmanBagrutResult } from './colmanBagrutEvaluation';
import { DANON_PROGRAM_URLS } from '@/data/admissions/danon';
import catalogueContentRepair from '@/data/admissions/catalogueContentRepair.json';
import { isHujiMedicineProgram } from '@/lib/hujiMedicineInputs';
import {
  resolveHujiMedicineAdmission,
  HUJI_MEDICINE_REQUIREMENTS_URL,
  HUJI_MEDICINE_CALCULATOR_URL,
} from './hujiMedicinePolicy';
import { isBguHealthProgram } from '@/lib/bguHealthInputs';
import { BGU_HEALTH_CONFIG } from '@/data/admissions/bguHealthVerification';
import { resolveBguHealthAdmission } from './bguHealthPolicy';
import { runBguHealthProof } from '@/server/ingestion/adapters/bguHealth';
import { isBguQuantitativeRouteProgram } from '@/lib/calculatorInputRequirements';
import {
  resolveBguQuantitativeRoute,
  bguQuantitativeProgramme,
} from './bguQuantitativeRoutesPolicy';
import { runBguQuantitativeRoutesProof } from '@/server/ingestion/adapters/bguQuantitativeRoutes';
import { isBguPsychologyProgram } from '@/lib/bguPsychologyInputs';
import { bguSocialScienceProgram } from '@/lib/bguSocialScienceInputs';
import { resolveBguSocialScienceAdmission } from './bguSocialSciencePolicy';
import { runBguSocialScienceProof } from '@/server/ingestion/adapters/bguSocialScience';
import { bguSocialScienceSource } from '@/data/admissions/bguSocialScienceVerification';
import { resolveBguPsychologyScores } from './bguPsychologyPolicy';
import { runBguPsychologyProof } from '@/server/ingestion/adapters/bguPsychology';
import { BGU_PSYCHOLOGY_SOURCE_URL } from '@/data/admissions/bguPsychologyVerification';
import 'server-only';

import { catalogueAdmissionRequirements, catalogueDescription } from '@/lib/catalogueDisplayText';
import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import type { University } from '@/types';
import type {
  AdmissionsEvaluationInput as AdmissionsEvaluationRequest,
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { SourceFreshnessStateRow } from '@/db/types';
import { admissionsInputValue } from './admissionsInputValue';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import {
  buildAdmissionsCapabilityMatrix,
  exactSourceIdsForProgram,
  loadFreshnessStatesBySourceIds,
  type AdmissionsCapabilityEntry,
} from './capabilityMatrix';
import { runHaifaAdmissionsProof } from '@/server/ingestion/adapters/haifaAdmissions';
import { evaluateHaifaProgrammePolicy, getHaifaProgrammePolicy } from './haifaProgrammePolicy';
import { getHaifaInformationSystemsTrack } from '@/lib/haifaAdmissionsInputs';
import { HAIFA_REQUIRED_INPUT_LABELS } from '@/lib/haifaAdmissionsInputs';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';
import { runHujiAdmissionsProof } from '@/server/ingestion/adapters/hujiAdmissions';
import {
  hasTechnionRequiredSubjectRecord,
  runTechnionAdmissionsProof,
} from '@/server/ingestion/adapters/technionAdmissions';
import { TECHNION_ARCHITECTURE_REQUIREMENTS_URL } from './technionArchitecturePolicy';
import { runBguAdmissionsProof } from '@/server/ingestion/adapters/bguAdmissions';
import {
  getMondayAdmissionEvidenceByCatalogueInstitutionId,
  type MondayAdmissionEvidenceRecord,
} from '@/data/admissions/mondayEvidence';
import {
  ADMISSIONS_EVALUATOR_VERSION,
  createAdmissionsInputDigest,
  createAdmissionsEvaluationSnapshot,
} from './evaluationSnapshot';
import { evaluateTauManagementResult } from './tauManagementEvaluation';
import { evaluateTauDigitalSciencesGates } from './tauDigitalSciencesPolicy';
import { evaluateTauNursingGates } from './tauNursingPolicy';
import { evaluateTauPsychologyGates, TAU_PSYCHOLOGY_REQUIREMENTS_URL } from './tauPsychologyPolicy';
import { evaluateTauLawGates, TAU_LAW_REQUIREMENTS_URL } from './tauLawPolicy';
import { evaluateTauEngineeringExactSciencesBonus } from './bagrutPolicies';
import { evaluateTauComputerScienceGates } from './tauComputerSciencePolicy';
import {
  evaluateBguComputerScienceGates,
  BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY,
} from './bguComputerSciencePolicy';
import { withBoundedOfficialResponse } from '@/server/ingestion/boundedOfficialFetch';
import {
  isBguEngineeringProgram,
  resolveBguEngineeringInputs,
  BGU_ENGINEERING_GUIDE_URL,
} from './bguEngineeringPolicy';
import { runBguEngineeringAdmissionsProof } from '@/server/ingestion/adapters/bguEngineeringAdmissions';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { getHaifaInformationSystemsTrackArtifact } from '@/data/admissions/haifaInformationSystemsVerification';
import { getCodeReviewedTechnionWinterVerification } from '@/data/admissions/technionProgramVerification';

type AdmissionsEvaluationInput = AdmissionsEvaluationRequest & {
  psychometric: number;
  bagrut: number;
};

const MAX_CONCURRENT_EXACT_SOURCE_CALLS = 2;
const OFFICIAL_SOURCE_TIMEOUT_MS = 5000;
// Missing published conditions cannot be replaced by legacy claims of open admission.
const incompleteRequirements = new Map(
  catalogueContentRepair.requirements
    .filter((row) => row.coverage === 'incomplete_published_requirements')
    .map((row) => [`${row.programId}:${row.institutionId}`, row]),
);

export async function evaluateAdmissionsForProgram(args: {
  input: AdmissionsEvaluationRequest;
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  fetcher?: typeof fetch;
  now?: Date;
  freshnessStatesBySourceId?: Map<string, SourceFreshnessStateRow>;
}): Promise<AdmissionsEvaluationReport> {
  const {
    input,
    program,
    institutions,
    fetcher,
    now = new Date(),
    freshnessStatesBySourceId: suppliedFreshnessStates,
  } = args;

  const codeReviewedWinter = getCodeReviewedTechnionWinterVerification(`${program.id}__technion`);
  const exactSourceIds = exactSourceIdsForProgram(program, input.extraInputs).filter(
    (sourceId) => sourceId !== codeReviewedWinter?.contract.source.targetId,
  );

  const freshnessLoad = suppliedFreshnessStates
    ? { status: 'loaded' as const, states: suppliedFreshnessStates }
    : await loadFreshnessStatesBySourceIds(exactSourceIds);
  const capabilityEntries = buildAdmissionsCapabilityMatrix({
    program,
    institutions,
    deferredRequiredInputs: new Map(
      institutions.map((institution) => [
        institution.id,
        independentAdmissionConditions(input, program, institution).map(
          (condition) => condition.id,
        ),
      ]),
    ),
    input: input.extraInputs,
    freshnessStatesBySourceId: freshnessLoad.states,
    freshnessAuthorityUnavailable: freshnessLoad.status === 'unavailable',
    now,
  });

  const results = await evaluateCapabilityEntries({
    input,
    program,
    institutions,
    capabilityEntries,
    fetcher,
    now,
  });

  const versionedResults = results.map((result) => {
    const entry = capabilityEntries.find(
      (item) => item.institutionId === result.linkedInstitutionId,
    );
    const displayedResult = withVerifiedAdmissionInformation(result, entry, input);
    return {
      ...displayedResult,
      snapshot: createAdmissionsEvaluationSnapshot({ input, result: displayedResult }),
    };
  });

  return {
    generatedAt: now.toISOString(),
    evaluatorVersion: ADMISSIONS_EVALUATOR_VERSION,
    inputDigest: createAdmissionsInputDigest(input),
    input,
    program: {
      id: program.id,
      name: program.name,
    },
    results: versionedResults,
  };
}

function withVerifiedAdmissionInformation(
  result: AdmissionsEvaluationResult,
  entry: AdmissionsCapabilityEntry | undefined,
  input: AdmissionsEvaluationRequest,
): AdmissionsEvaluationResult {
  if (entry?.formulaPairScope === 'excluded' || entry?.pairVerification?.state !== 'exact')
    return result;

  const artifact =
    input.degreeId === 'haifa_infosystems' && result.linkedInstitutionId === 'haifa'
      ? getHaifaInformationSystemsTrackArtifact(input.extraInputs?.haifaInformationSystemsTrack)
      : getProgramVerificationArtifact(`${input.degreeId}__${result.linkedInstitutionId}`);
  const contract = artifact?.contract;
  if (!contract || contract.proof.state !== 'verified' || !contract.proof.liveComparedAt)
    return result;

  const checkedAt =
    entry.freshnessState?.reviewedSourceFingerprint === contract.sourceFingerprint &&
    entry.freshnessState.lastExactCheckAt
      ? entry.freshnessState.lastExactCheckAt
      : new Date(contract.proof.liveComparedAt);
  const verificationNote = `נתוני הבסיס אומתו ב־${new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeZone: 'Asia/Jerusalem',
  }).format(checkedAt)}, למחזור ${contract.admissionCycle}.`;

  if (result.capability === 'exact') {
    return result.scoreAssessment
      ? result
      : { ...result, explanation: `${result.explanation} ${verificationNote}` };
  }
  if (
    !['degraded', 'authority_unavailable', 'unsupported'].includes(result.kind) ||
    !Number.isFinite(contract.calculation.cutoff.acceptance) ||
    contract.calculation.cutoff.acceptance <= 0
  )
    return result;

  return {
    ...result,
    explanation: `${result.explanation} סף הקבלה השמור למסלול הוא ${contract.calculation.cutoff.acceptance} בציון המוסדי. ${verificationNote}`,
    nextAction:
      'המידע השמור זמין לעיון, אך אין כרגע החלטת קבלה עדכנית. בדקו באתר המוסד את הסף ואת יתר תנאי הקבלה.',
    officialUrls: [
      result.institution.calculatorUrl ??
        result.institution.programUrl ??
        result.officialUrls?.[0] ??
        contract.source.url,
    ],
    degradationReason: result.degradationReason,
  };
}

async function evaluateCapabilityEntries(args: {
  input: AdmissionsEvaluationRequest;
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  capabilityEntries: AdmissionsCapabilityEntry[];
  fetcher?: typeof fetch;
  now: Date;
}): Promise<AdmissionsEvaluationResult[]> {
  const { input, program, institutions, capabilityEntries, fetcher, now } = args;
  const results = new Array<AdmissionsEvaluationResult | undefined>(capabilityEntries.length);
  const exactTasks: Array<() => Promise<void>> = [];

  for (const [index, entry] of capabilityEntries.entries()) {
    const institution = institutions.find((item) => item.id === entry.institutionId);
    if (!institution) {
      continue;
    }

    if (isBiuPublishedRoutePair(program.id, institution.id)) {
      results[index] = evaluateBiuPublishedRoutes({ input, institution });
      continue;
    }

    const incomplete = incompleteRequirements.get(`${program.id}:${institution.id}`);
    if (incomplete && !isBatchCUnsupportedProgramId(program.id, institution.id)) {
      results[index] = {
        institution: publicInstitutionShape(institution),
        linkedInstitutionId: institution.id,
        capability: 'requirements_only',
        kind: 'requirements_only',
        decision: 'unknown',
        confidence: 'low',
        sourceLabel: 'תנאי קבלה',
        explanation: 'תנאי הקבלה המלאים אינם מפורסמים באתר המוסד, ולכן עדיין אי אפשר לקבוע התאמה.',
        nextAction: 'בררו את תנאי הקבלה עם המוסד לפני ההרשמה.',
        officialUrls: [incomplete.programUrl ?? incomplete.sourceUrl],
        degradationReason: 'incomplete_published_requirements',
      };
      continue;
    }

    if (isBatchBManualProgram(program.id, institution.id)) {
      const batchB = evaluateBatchBManualPath({ input, institution });
      if (batchB) {
        results[index] = batchB;
        continue;
      }
    }

    if (['telhai_cs', 'telhai_biology'].includes(program.id) && institution.id === 'telhai') {
      results[index] = evaluateTelhaiPublishedRoutes({ input, institution });
      continue;
    }
    if (['ono_cs', 'ono_business'].includes(program.id) && institution.id === 'ono') {
      results[index] = evaluateOnoPublishedRoutes({ input, institution });
      continue;
    }
    if (program.id === 'ruppin_cs' && institution.id === 'ruppin') {
      results[index] = evaluateRuppinComputerScience({ input, institution });
      continue;
    }

    if (
      [
        'reichman_cs',
        'reichman_law',
        'reichman_psychology',
        'reichman_business',
        'reichman_economics',
      ].includes(program.id) &&
      institution.id === 'reichman'
    ) {
      results[index] = evaluateReichmanPublishedRoutes({ input, institution });
      continue;
    }

    if (
      [
        'colmgmt_law',
        'colmgmt_business',
        'colmgmt_economics',
        'colmgmt_accounting',
        'colmgmt_infosystems',
      ].includes(canonicalProgramId(program.id)) &&
      institution.id === 'colman'
    ) {
      results[index] = evaluateColmanPublishedRoutes({
        input: { ...input, degreeId: canonicalProgramId(input.degreeId) },
        institution,
      });
      continue;
    }

    if (['tlvyaffo_cs', 'mta_cs'].includes(program.id) && institution.id === 'mta') {
      results[index] = evaluateMtaComputerScience({ input, institution });
      continue;
    }

    if (
      ['tlvyaffo_nursing', 'tlvyaffo_business'].includes(program.id) &&
      institution.id === 'mta'
    ) {
      results[index] = evaluateMtaPublishedRoutes({ input, institution });
      continue;
    }

    if (program.id === 'colmgmt_cs' && institution.id === 'colman') {
      results[index] = evaluateColmanBagrutResult({ input, institution });
      continue;
    }

    if (
      ['afeka_ee', 'afeka_softwareeng', 'afeka_cs'].includes(program.id) &&
      institution.id === 'afeka'
    ) {
      results[index] = evaluateAfekaPublishedRoutes({ input, institution });
      continue;
    }

    const batchC = evaluateBatchCUnsupportedPath({
      program,
      institution: publicInstitutionShape(institution),
    });
    if (batchC) {
      results[index] = batchC;
      continue;
    }

    if (program.id === 'physiotherapy' && institution.id === 'tau') {
      exactTasks.push(async () => {
        results[index] = await evaluateTauPhysiotherapyResult({ input, institution, fetcher });
      });
      continue;
    }

    if (entry.capability === 'exact' && entry.exactTarget) {
      const exactTarget = entry.exactTarget;
      exactTasks.push(async () => {
        results[index] = await evaluateExactResult({
          input,
          program,
          institution,
          exactTarget,
          fetcher,
          now,
        });
      });
      continue;
    }

    results[index] = evaluateNonExactResult({
      input,
      program,
      institution,
      entry,
    });
  }

  await runWithConcurrency(exactTasks, MAX_CONCURRENT_EXACT_SOURCE_CALLS);
  return results.filter((result): result is AdmissionsEvaluationResult => result !== undefined);
}

async function runWithConcurrency(tasks: Array<() => Promise<void>>, limit: number): Promise<void> {
  let nextTask = 0;
  const worker = async () => {
    while (nextTask < tasks.length) {
      const task = tasks[nextTask];
      nextTask += 1;
      await task();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

function socialScienceScoreAssessment(input: AdmissionsEvaluationRequest): 'scores' | undefined {
  const extra = input.extraInputs;
  const route = extra?.bguSocialScienceRoute ?? 'auto';
  const ageRoute =
    route === 'age45' ||
    (route === 'auto' &&
      (extra?.bguApplicantAge ?? 0) >= 45 &&
      bguSocialScienceSource(input.degreeId).rule.age45);
  return ageRoute || route === 'education_conditional' ? undefined : 'scores';
}

function independentAdmissionConditions(
  input: AdmissionsEvaluationRequest,
  program: CatalogueProgram,
  institution: CatalogueInstitution,
): AdditionalCondition[] {
  const extra = input.extraInputs ?? {};
  const conditions: AdditionalCondition[] = [];
  if (institution.id === 'tau' && ['cs', 'tau_cs'].includes(program.id))
    conditions.push(
      confirmationCondition(
        'tau_application_requirements',
        'זכאות לבגרות, אנגלית מתקדמים א׳, עברית ועדיפות ראשונה למדעי המחשב',
        extra.tauApplicationRequirementsConfirmed,
      ),
    );
  if (
    institution.id === 'bgu' &&
    ['cs', 'bgu_cs', 'datascience', 'bgu_datascience'].includes(program.id)
  )
    conditions.push(
      confirmationCondition(
        'bgu_language_requirements',
        'אנגלית ברמת בסיסי ועברית ברמה ה׳ או פטור תקף',
        extra.bguLanguageRequirementsConfirmed,
      ),
    );
  if (institution.id === 'bgu') {
    if (isBguEngineeringProgram(program.id) || isBguQuantitativeRouteProgram(program.id)) {
      conditions.push(
        confirmationCondition(
          'bgu_language_requirements',
          'אנגלית ברמת בסיסי ועברית ברמה ה׳ או פטור תקף',
          extra.bguLanguageRequirementsConfirmed,
        ),
      );
    }
    if (isBguHealthProgram(program.id)) {
      const ot = program.id === 'occupational_therapy';
      conditions.push(
        confirmationCondition(
          ot ? 'bgu_occupational_therapy_requirements' : 'bgu_physiotherapy_requirements',
          ot
            ? 'תעודת קבלה מוכרת, דרישות שפה, עדיפות הרשמה והגשת מסמכים במועד לריפוי בעיסוק'
            : 'תעודת קבלה מוכרת, דרישות שפה, עדיפות ראשונה והגשת מסמכים במועד לפיזיותרפיה',
          ot
            ? extra.bguOccupationalTherapyRequirementsConfirmed
            : extra.bguPhysiotherapyRequirementsConfirmed,
        ),
      );
      if (ot && extra.bguOccupationalTherapyRoute !== 'academic')
        conditions.push(
          confirmationCondition(
            'bgu_occupational_therapy_exam_session',
            'מועד הבחינה מתאים למסלול ההרשמה; במועד המאוחר הזימון על בסיס מקום פנוי',
            extra.bguOccupationalTherapyExamSession === undefined ? undefined : true,
          ),
        );
    }
    const social = bguSocialScienceProgram(program.id);
    if (social && socialScienceScoreAssessment({ ...input, degreeId: program.id }) === 'scores') {
      conditions.push(
        confirmationCondition(
          'bgu_social_science_requirements',
          'תעודת קבלה מוכרת, תנאי החוג הנוסף ועדיפות הרשמה כנדרש',
          extra.bguSocialScienceRequirementsConfirmed,
        ),
        confirmationCondition(
          'bgu_social_science_language',
          `אנגלית ברמת בסיסי ועברית ברמה ${social === 'social_work' ? 'ו׳' : 'ה׳'} או פטור תקף`,
          extra.bguSocialScienceLanguageConfirmed,
        ),
        confirmationCondition(
          'bgu_returning_from_study_break',
          'בחזרה מהפסקת לימודים נדרש אישור המחלקה',
          extra.bguReturningFromStudyBreak === false ? true : undefined,
        ),
      );
      if (social === 'social_work')
        conditions.push(
          confirmationCondition(
            'bgu_social_work_academic_background',
            'ברקע אקדמי קודם נדרשת בדיקת גיליון ציונים ואישור ועדת הקבלה',
            extra.bguSocialWorkAcademicBackground === 'none' ? true : undefined,
          ),
        );
    }
    if (isBguQuantitativeRouteProgram(program.id)) {
      conditions.push(
        confirmationCondition(
          'bgu_certificate_requirements',
          'תעודת קבלה מוכרת',
          extra.bguCertificateRequirementsConfirmed,
        ),
        confirmationCondition(
          'bgu_second_track_requirements',
          'עמידה בתנאי החוג או החטיבה הנוספים, אם נבחרו',
          extra.bguSecondTrackRequirementsConfirmed,
        ),
        confirmationCondition(
          'bgu_prior_academic_studies',
          'בדיקת לימודים קודמים, חזרה מהפסקה או שינוי מסלול לפי דרישות המחלקה',
          extra.bguPriorAcademicStudies === false ? true : undefined,
        ),
      );
      if (bguQuantitativeProgramme(program.id).family === 'biology')
        conditions.push(
          confirmationCondition(
            'bgu_application_priority',
            'הרשמה בעדיפות ראשונה, שנייה או שלישית',
            extra.bguApplicationPriority === undefined
              ? undefined
              : [1, 2, 3].includes(extra.bguApplicationPriority),
          ),
        );
    }
  }
  if (institution.id === 'technion' && program.id === 'architecture')
    conditions.push(
      confirmationCondition(
        'technion_architecture_exam_passed',
        'תוצאה רשמית של עובר בבחינת הכניסה',
        extra.technionArchitectureExamPassed,
      ),
      confirmationCondition(
        'technion_architecture_requirements',
        'תנאי ההגשה, השפות, ההרשמה ותוקף הציונים',
        extra.technionArchitectureRequirementsConfirmed,
      ),
    );
  if (
    institution.id === 'haifa' &&
    program.id === 'haifa_infosystems' &&
    getHaifaInformationSystemsTrack(extra.haifaInformationSystemsTrack)?.partnerRequired
  ) {
    conditions.push(
      confirmationCondition(
        'haifa_information_systems_partner_requirements',
        'עמידה בתנאי החוג השני',
        extra.haifaInformationSystemsPartnerRequirementsConfirmed,
      ),
    );
  }
  if (institution.id === 'tau' && ['business', 'tau_business'].includes(program.id))
    conditions.push(
      confirmationCondition(
        'tau_management_requirements',
        'תנאי הרישום הכלליים והשפות',
        extra.tauManagementRequirementsConfirmed,
      ),
    );
  return conditions;
}

async function evaluateExactResult(
  args: Parameters<typeof evaluateExactScores>[0],
): Promise<AdmissionsEvaluationResult> {
  const conditions = independentAdmissionConditions(args.input, args.program, args.institution);
  const result = await evaluateExactScores(args);
  return conditions.length ? withScoreAssessment(result, conditions) : result;
}

async function evaluateExactScores(args: {
  input: AdmissionsEvaluationRequest;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  exactTarget: NonNullable<AdmissionsCapabilityEntry['exactTarget']>;
  fetcher?: typeof fetch;
  now: Date;
}): Promise<AdmissionsEvaluationResult> {
  const { input: requestedInput, program, institution, exactTarget, fetcher, now } = args;

  const timedFetcher = withBoundedOfficialResponse(fetcher ?? fetch, {
    timeoutMs: OFFICIAL_SOURCE_TIMEOUT_MS,
  });

  try {
    if (exactTarget.sourceTarget.adapterId === 'bgu' && isBguEngineeringProgram(program.id)) {
      const resolution = resolveBguEngineeringInputs(program.id, requestedInput, now, 'scores');
      if (resolution.kind === 'needs_input')
        return requiredInputsResult(institution, resolution.requiredInputs);
      if (resolution.kind === 'below')
        return exactGateFailureResult({
          institution,
          unmetRequirements: [resolution.reason],
          requirementsUrl: exactTarget.program.searchText!,
        });
      const proof = await runBguEngineeringAdmissionsProof({
        assessment: 'scores',
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: requestedInput.bagrut,
          psychometric: requestedInput.psychometric,
          extraInputs: requestedInput.extraInputs,
        },
      });
      const result = normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'סכם ההנדסה ותנאי הקבלה הרשמיים של בן־גוריון',
      });
      if (result.capability !== 'exact') return result;
      return {
        ...result,
        scoreLabel:
          resolution.kind === 'direct'
            ? resolution.basis === 'preparatory'
              ? 'ממוצע מכינה'
              : 'ממוצע בגרות רשמי'
            : 'סכם הנדסה',
        ...(result.scoreAssessment === 'meets_threshold'
          ? {
              sourceLabel:
                proof.normalizedPayload.waitingList === true
                  ? 'עמידה בתנאים — רשימת המתנה'
                  : 'עמידה בתנאים — בכפוף לאישור בן־גוריון',
              explanation: [
                proof.normalizedPayload.waitingList === true
                  ? 'הנתונים עומדים בסף הרשמי. בן־גוריון מודיעה שמכסת המקומות מלאה וניתן להירשם לרשימת המתנה.'
                  : 'הנתונים עומדים בתנאי האפיק הרשמי; הקבלה הסופית תלויה במקום פנוי ובאישור בן־גוריון.',
                proof.normalizedPayload.physicsConditionOutstanding === true
                  ? 'נדרשת השלמת קורס מוכר בפיזיקה לפני תחילת הלימודים.'
                  : '',
              ]
                .filter(Boolean)
                .join(' '),
              nextAction: 'בדקו את מצב ההרשמה ואת דרישות קורס הפיזיקה באתר בן־גוריון.',
            }
          : {}),
        officialUrls: [exactTarget.program.searchText!, BGU_ENGINEERING_GUIDE_URL],
      };
    }
    if (
      exactTarget.program.pairId === 'business__tau' ||
      exactTarget.program.pairId === 'tau_business__tau'
    ) {
      return await evaluateTauManagementResult({
        input: requestedInput,
        institution,
        program: exactTarget.program,
        fetcher: timedFetcher,
      });
    }
    if (exactTarget.sourceTarget.adapterId === 'bgu' && isBguHealthProgram(program.id)) {
      const route = resolveBguHealthAdmission(requestedInput, undefined, 'scores');
      const config = BGU_HEALTH_CONFIG[program.id];
      if (route.kind === 'needs_input')
        return requiredInputsResult(institution, route.requiredInputs);
      if (route.kind === 'below')
        return exactGateFailureResult({
          institution,
          unmetRequirements: [route.reason],
          requirementsUrl: config.url,
        });
      const proof = await runBguHealthProof({
        assessment: 'scores',
        program: exactTarget.program,
        applicant: {
          psychometric: requestedInput.psychometric,
          bagrutAverage: requestedInput.bagrut,
          extraInputs: requestedInput.extraInputs,
        },
        fetcher: timedFetcher,
      });
      const result = normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'תנאי מדעי הבריאות בקמפוס באר שבע',
        positiveDecision: 'eligible_to_apply',
      });
      if (result.capability !== 'exact') return result;
      return {
        ...result,
        scoreLabel: proof.normalizedPayload.route === 'academic' ? 'ממוצע תואר ראשון' : 'סכם',
        officialUrls: [config.url, 'https://www.bgu.ac.il/welcome/contents/admissions-forms/'],
        explanation: String(proof.normalizedPayload.reason),
        nextAction:
          'ההרשמה למחזור הנוכחי סגורה. לנרשמים בזמן נדרש המשך טיפול מוסדי בראיון או בדיון במחלקה; אין הבטחת זימון או קבלה.',
      };
    }
    if (exactTarget.sourceTarget.adapterId === 'bgu' && isBguPsychologyProgram(program.id)) {
      const additionalConditions: NonNullable<AdmissionsEvaluationResult['additionalConditions']> =
        [
          {
            id: 'bgu_language_requirements',
            label: 'אנגלית ברמת בסיסי ועברית ברמה ה׳ או פטור תקף',
            value: requestedInput.extraInputs?.bguLanguageRequirementsConfirmed,
          },
          {
            id: 'bgu_psychology_requirements',
            label: 'תעודת קבלה מוכרת ועמידה בתנאי החוג הנוסף',
            value: requestedInput.extraInputs?.bguPsychologyRequirementsConfirmed,
          },
        ].map(({ id, label, value }) => ({
          id: id as 'bgu_language_requirements' | 'bgu_psychology_requirements',
          label,
          status: value === true ? 'confirmed' : value === false ? 'unmet' : 'unconfirmed',
        }));
      const route = resolveBguPsychologyScores(requestedInput);
      if (route.kind === 'needs_input')
        return { ...requiredInputsResult(institution, route.requiredInputs), additionalConditions };
      const proof = await runBguPsychologyProof({
        assessment: 'scores',
        program: exactTarget.program,
        applicant: {
          psychometric: requestedInput.psychometric,
          bagrutAverage: requestedInput.bagrut,
          extraInputs: requestedInput.extraInputs,
        },
        fetcher: timedFetcher,
      });
      const result = normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'תנאי פסיכולוגיה בקמפוס באר שבע',
        positiveDecision: 'eligible_to_apply',
      });
      if (result.capability !== 'exact') return result;
      const labels = {
        score: 'סכם',
        psychometric: 'פסיכומטרי',
        bagrut: 'ממוצע בגרות רשמי בבן־גוריון',
        preparatory: 'ממוצע מכינה מוכרת בבן־גוריון',
      };
      const selectedRoute = proof.normalizedPayload.route as keyof typeof labels;
      const meetsScore = proof.normalizedPayload.scoreAssessment === 'meets_threshold';
      const hasUnmetCondition = additionalConditions.some(
        (condition) => condition.status === 'unmet',
      );
      const allConfirmed = additionalConditions.every(
        (condition) => condition.status === 'confirmed',
      );
      return {
        ...result,
        kind: 'exact',
        decision:
          !meetsScore || hasUnmetCondition
            ? 'below'
            : allConfirmed
              ? 'eligible_to_apply'
              : 'pending',
        scoreAssessment: meetsScore ? 'meets_threshold' : 'below_threshold',
        additionalConditions,
        sourceLabel: 'התאמה לפי הציונים',
        scoreLabel: labels[selectedRoute],
        officialUrls: [BGU_PSYCHOLOGY_SOURCE_URL],
        explanation: String(proof.normalizedPayload.reason),
        nextAction: !meetsScore
          ? 'בדקו אפיק חלופי לפי התנאים הרשמיים. אין זכאות אוטומטית לדיון בחריגים.'
          : hasUnmetCondition
            ? 'לפי הנתונים שהוזנו, תנאים נוספים אינם מתקיימים. אפשר לברר מול המוסד.'
            : !allConfirmed
              ? 'יש לבדוק גם את תנאי השפה ותנאי החוג הנוסף. העמידה בסף הציונים אינה אישור קבלה.'
              : 'מכסת המתקבלים מלאה כרגע; הזכאים יכולים להירשם ולעקוב אחר מקום פנוי. נדרש אישור מוסדי.',
      };
    }
    if (exactTarget.sourceTarget.adapterId === 'huji' && isHujiMedicineProgram(program.id)) {
      const route = resolveHujiMedicineAdmission(
        requestedInput.psychometric,
        requestedInput.extraInputs,
      );
      const details = {
        score: route.score,
        threshold: route.threshold,
        scoreLabel:
          route.stage === 'final'
            ? 'ציון התאמה סופי לרפואה'
            : route.stage === 'assessment'
              ? 'ציון מו״ר/מרק״ם'
              : 'ציון קוגניטיבי לרפואה',
        officialUrls: [HUJI_MEDICINE_CALCULATOR_URL, HUJI_MEDICINE_REQUIREMENTS_URL],
      };
      if (route.status === 'needs_input')
        return {
          ...requiredInputsResult(institution, route.missing),
          ...details,
          explanation:
            'נדרשים נתונים נוספים לרפואה בעברית. ציון קוגניטיבי לבדו אינו החלטת קבלה סופית.',
          nextAction: 'השלימו את הנתונים הידועים לכם באזור רפואה בעברית בפרופיל האקדמי.',
        };
      if (route.status === 'manual')
        return {
          institution: publicInstitutionShape(institution),
          linkedInstitutionId: institution.id,
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'נדרש אישור מדור הקבלה',
          explanation: route.reasons.join(' '),
          nextAction: 'פנו למדור הקבלה וקבלו אישור לאפיק או לנתון המסוים.',
          ...details,
        };
      const proof = await runHujiAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          psychometric: requestedInput.psychometric!,
          bagrutAverage: requestedInput.bagrut ?? 0,
          extraInputs: requestedInput.extraInputs,
        },
      });
      const normalized = normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'תנאי רפואה בעברית',
        positiveDecision: 'eligible_to_apply',
      });
      if (normalized.capability !== 'exact') return normalized;
      return {
        ...normalized,
        ...details,
        explanation: route.reasons.join(' '),
        nextAction:
          route.decision === 'below'
            ? 'בדקו את האפיק ותנאי המחזור הרשמי.'
            : 'עקבו אחר החלטת האוניברסיטה ודירוג המועמדים; עמידה בספים אינה אישור קבלה סופי.',
      };
    }
    if (exactTarget.sourceTarget.adapterId === 'haifa') {
      if (requestedInput.psychometric === undefined)
        return requiredInputsResult(institution, ['psychometric_overall']);
      const average = requestedInput.extraInputs?.haifaBagrutAverage;
      if (average === undefined) return requiredInputsResult(institution, ['haifa_bagrut_average']);
      const missingScoreInputs: AdmissionsRequiredInput[] = [];
      for (const [key, id] of [
        ['haifaBagrutYear', 'haifa_bagrut_year'],
        ['haifaPsychometricYear', 'haifa_psychometric_year'],
        ['psychometricMath', 'psychometric_math'],
        ['psychometricVerbal', 'psychometric_verbal'],
        ['psychometricEnglish', 'psychometric_english'],
      ] as const)
        if (requestedInput.extraInputs?.[key] === undefined) missingScoreInputs.push(id);
      if (missingScoreInputs.length) return requiredInputsResult(institution, missingScoreInputs);
      const policy = getHaifaProgrammePolicy(
        program.id,
        requestedInput.extraInputs?.haifaInformationSystemsTrack,
      );
      const track =
        program.id === 'haifa_infosystems'
          ? getHaifaInformationSystemsTrack(
              requestedInput.extraInputs?.haifaInformationSystemsTrack,
            )
          : undefined;
      const gates = evaluateHaifaProgrammePolicy({
        assessment: 'scores',
        programId: program.id,
        input: requestedInput,
        now,
      });
      if (gates.kind === 'needs_input')
        return requiredInputsResult(institution, gates.requiredInputs);
      if (gates.kind === 'below')
        return exactGateFailureResult({
          institution,
          unmetRequirements: gates.reasons,
          requirementsUrl: policy!.source.url,
        });
      if (gates.kind === 'unavailable' || !policy)
        return {
          institution: publicInstitutionShape(institution),
          linkedInstitutionId: institution.id,
          capability: 'tracked_missing_rule',
          kind: 'tracked_missing_rule',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'מיפוי רשמי חסר',
          explanation: gates.kind === 'unavailable' ? gates.reason : 'חסרים תנאי המסלול.',
          nextAction: 'בדקו את מסלול ההרשמה מול החוג.',
          officialUrls: policy ? [policy.source.url] : [],
        };
      const proof = await runHaifaAdmissionsProof({
        assessment: 'scores',
        fetcher: timedFetcher,
        now,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: average,
          extraInputs: requestedInput.extraInputs,
          bagrutYear: requestedInput.extraInputs?.haifaBagrutYear?.toString(),
          psychometric: requestedInput.psychometric,
          psychometricYear: requestedInput.extraInputs?.haifaPsychometricYear?.toString(),
          psychometricSubscores: {
            english: requestedInput.extraInputs?.psychometricEnglish ?? 0,
            math: requestedInput.extraInputs?.psychometricMath ?? 0,
            verbal: requestedInput.extraInputs?.psychometricVerbal ?? 0,
          },
        },
      });
      const baseResult = normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: track
          ? `מערכות מידע בחיפה — ${track.label}`
          : 'מקור רשמי של אוניברסיטת חיפה',
      });
      if (baseResult.capability !== 'exact' || baseResult.score === undefined) return baseResult;
      if (baseResult.threshold !== policy.score.acceptance)
        return {
          ...baseResult,
          capability: 'authority_unavailable',
          kind: 'authority_unavailable',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'הסף הרשמי השתנה',
          explanation: 'סף המחשבון אינו תואם את תנאי החוג שנבדקו. נדרש עדכון לפני קביעת זכאות.',
          nextAction: 'בדקו את הסף בעמוד החוג הרשמי.',
          officialUrls: [policy.source.url],
        };
      const eligibility = evaluateHaifaProgrammePolicy({
        assessment: 'scores',
        programId: program.id,
        input: requestedInput,
        score: baseResult.score,
        now,
      });
      if (eligibility.kind === 'below')
        return {
          ...baseResult,
          ...exactGateFailureResult({
            institution,
            unmetRequirements: eligibility.reasons,
            requirementsUrl: policy.source.url,
          }),
        };
      if (eligibility.kind !== 'eligible' && eligibility.kind !== 'pending') return baseResult;
      return {
        ...baseResult,
        decision: eligibility.kind === 'eligible' ? 'eligible_to_apply' : 'pending',
        kind: eligibility.kind === 'eligible' ? 'manual_gate' : 'exact',
        sourceLabel:
          eligibility.kind === 'pending'
            ? 'טווח המתנה רשמי'
            : eligibility.conditional
              ? 'עמידה מותנית בתנאי סף'
              : 'עמידה בתנאי סף',
        explanation: track ? `${track.label}: ${eligibility.reason}` : eligibility.reason,
        nextAction:
          eligibility.steps.join(' ') || 'בדקו את מצב ההרשמה ואת תנאי המסמכים בעמוד החוג הרשמי.',
        officialUrls: [
          policy.source.url,
          'https://admissions.haifa.ac.il/hebrew-language-proficiency/',
          'https://admissions.haifa.ac.il/english-language-proficiency/',
          ...(policy.deadlines ? [policy.deadlines.sourceUrl] : []),
        ],
      };
    }
    if (exactTarget.sourceTarget.adapterId === 'bgu' && bguSocialScienceProgram(program.id)) {
      const assessment = socialScienceScoreAssessment(requestedInput);
      const route = resolveBguSocialScienceAdmission(requestedInput, undefined, assessment);
      const { source, rule } = bguSocialScienceSource(program.id);
      if (route.kind === 'needs_input')
        return requiredInputsResult(institution, route.requiredInputs);
      if (route.kind === 'below')
        return exactGateFailureResult({
          institution,
          unmetRequirements: [route.reason],
          requirementsUrl: source.url,
        });
      if (route.kind === 'manual_gate')
        return {
          institution: publicInstitutionShape(institution),
          linkedInstitutionId: institution.id,
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'unknown',
          confidence: 'high',
          sourceLabel: 'נדרש דיון במחלקה',
          explanation: route.reason,
          nextAction: 'פנו למחלקה והגישו את המסמכים הנדרשים לקבלת החלטה מוסדית.',
          officialUrls: [source.url],
        };
      const proof = await runBguSocialScienceProof({
        assessment,
        program: exactTarget.program,
        applicant: {
          psychometric: requestedInput.psychometric,
          bagrutAverage: requestedInput.bagrut,
          extraInputs: requestedInput.extraInputs,
        },
        fetcher: timedFetcher,
      });
      const result = normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: `תנאי ${rule.name} בקמפוס באר שבע`,
        positiveDecision: 'eligible_to_apply',
      });
      if (result.capability !== 'exact') return result;
      const labels = {
        score: rule.operator === 'or' ? 'סכם (או אפיק פסיכומטרי)' : 'סכם ופסיכומטרי',
        psychometric: 'פסיכומטרי',
        bagrut: 'ממוצע בגרות רשמי בבן־גוריון',
        preparatory: 'ממוצע מכינה מוכרת בבן־גוריון',
        age45: 'גיל באפיק 45 ומעלה',
      };
      return {
        ...result,
        sourceLabel: 'תנאי קבלה רשמיים',
        scoreLabel: labels[proof.normalizedPayload.route as keyof typeof labels],
        officialUrls: [source.url],
        explanation: String(proof.normalizedPayload.reason),
        nextAction:
          result.decision === 'below'
            ? 'בדקו אפיק חלופי לפי התנאים הרשמיים. דיון בחריגים דורש החלטה מוסדית.'
            : rule.waitingList
              ? 'מכסת המקומות מלאה; הזכאים יכולים להירשם לרשימת המתנה. נדרש אישור מוסדי.'
              : 'השלימו את ההרשמה ועמידה בתנאי החוג הנוסף. הזכאות להגשת מועמדות טעונה אישור מוסדי.',
      };
    }
    if (exactTarget.sourceTarget.adapterId === 'bgu' && isBguQuantitativeRouteProgram(program.id)) {
      const config = bguQuantitativeProgramme(program.id);
      const route = resolveBguQuantitativeRoute(program.id, requestedInput, 'scores');
      if (route.kind === 'needs_input')
        return requiredInputsResult(institution, route.requiredInputs);
      if (route.kind === 'below')
        return exactGateFailureResult({
          institution,
          unmetRequirements: [route.reason],
          requirementsUrl: config.sourceUrl,
        });
      const proof = await runBguQuantitativeRoutesProof({
        assessment: 'scores',
        program: exactTarget.program,
        applicant: {
          psychometric: requestedInput.psychometric,
          extraInputs: requestedInput.extraInputs,
        },
        fetcher: timedFetcher,
      });
      const result = normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'המקור הרשמי של בן־גוריון',
        positiveDecision: 'eligible_to_apply',
      });
      if (result.capability !== 'exact') return result;
      const label =
        route.kind === 'quantitative'
          ? 'סכם כמותי'
          : {
              psychometric: 'פסיכומטרי',
              preparatory: 'ממוצע מכינה מוכרת בבן־גוריון',
              bagrut: 'ממוצע בגרות רשמי בבן־גוריון',
            }[route.route];
      const conditions = [
        proof.normalizedPayload.waitingList
          ? 'מכסת המתקבלים מלאה כרגע; המוסד ממליץ לזכאים להירשם ולעקוב אחר מקום פנוי.'
          : 'יש להשלים הרשמה ואישור מוסדי.',
        route.priorAcademicReview
          ? 'נדרש דיון מחלקתי על רקע לימודים קודמים, חזרה מהפסקה או שינוי מסלול.'
          : '',
        route.mathematicsCourseRequired ? 'נדרש קורס מבוא למתמטיקה בסמסטר א׳.' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return {
        ...result,
        scoreLabel: label,
        sourceLabel: 'תנאי קבלה רשמיים בבן־גוריון',
        officialUrls: [config.sourceUrl],
        explanation:
          result.decision === 'below'
            ? `ה${label} נמוך מהסף הנדרש באפיק שנבדק. אפשר לפנות לדיון בחריגים לפי התנאים שבאתר; זו אינה זכאות אוטומטית.`
            : `עומדים בתנאים המספריים באפיק שנבדק. ${conditions}`,
        nextAction: `בדקו את דף ההרשמה והשלימו את תנאי התוכנית, החוג או החטיבה הנוספים, אם נבחרו. ${conditions}`,
      };
    }
    if (requestedInput.psychometric === undefined || requestedInput.bagrut === undefined) {
      return requiredInputsResult(institution, [
        ...(requestedInput.psychometric === undefined ? ['psychometric_overall' as const] : []),
        ...(requestedInput.bagrut === undefined ? ['bagrut_average' as const] : []),
      ]);
    }
    const input = {
      ...requestedInput,
      psychometric: requestedInput.psychometric,
      bagrut: requestedInput.bagrut,
    };
    if (exactTarget.sourceTarget.adapterId === 'technion') {
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (program.id !== 'architecture' && !hasTechnionRequiredSubjectRecord(bagrutSubjectRecord)) {
        return requiredInputsResult(institution, ['bagrut_subject_record']);
      }
      const proof = await runTechnionAdmissionsProof({
        assessment: 'scores',
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          bagrutSubjectRecord,
          psychometric: input.psychometric,
          extraInputs: input.extraInputs,
        },
      });

      if (program.id === 'architecture') {
        const result = normalizeExactProofResult({
          institution,
          proof: proof.normalizedPayload,
          explanationPrefix: 'הנוסחה והסף הרשמיים של הטכניון',
        });
        if (result.scoreAssessment === 'meets_threshold') {
          return {
            ...result,
            sourceLabel: 'התאמה לפי הציונים',
            explanation:
              'הציון עומד בסף הרשמי לארכיטקטורה. הקבלה תלויה במקום פנוי ובהחלטה הסופית של הטכניון.',
            nextAction: 'בדקו מול מדור הקבלה בטכניון אם יש מקום פנוי ומהי החלטת הקבלה הסופית.',
            officialUrls: [TECHNION_ARCHITECTURE_REQUIREMENTS_URL],
          };
        }
        return result;
      }

      return applyStructuredRequirementsToAcceptedScoreResult({
        input,
        program,
        institution,
        baseResult: normalizeExactProofResult({
          institution,
          proof: proof.normalizedPayload,
          explanationPrefix: 'מקור רשמי של הטכניון',
        }),
      });
    }

    if (exactTarget.sourceTarget.adapterId === 'bgu') {
      if (['cs', 'bgu_cs', 'datascience', 'bgu_datascience'].includes(program.id)) {
        const subjects = bagrutExamSubjects(input.extraInputs?.bagrutSubjectRecord);
        if (!subjects.some((subject) => subject.subjectId === 'mathematics')) {
          return requiredInputsResult(institution, ['bagrut_subject_record']);
        }
        const gates = evaluateBguComputerScienceGates(
          {
            psychometric: input.psychometric,
            quantitativeSubscore: input.extraInputs?.psychometricMath,
            subjects,
            languageRequirementsConfirmed:
              input.extraInputs?.bguLanguageRequirementsConfirmed === true,
          },
          'scores',
        );
        if (!gates.eligibleForScoreComparison) {
          const descriptions = {
            psychometric_600: 'פסיכומטרי 600 ומעלה',
            psychometric_quantitative_125: 'ציון כמותי 125 ומעלה',
            mathematics_90_at_4_or_80_at_5: 'מתמטיקה: 4 יחידות בציון 90 או 5 יחידות בציון 80',
            language_classifications: 'אנגלית ברמה בסיסית ועברית ברמה ה׳ לנדרשים',
          };
          return exactGateFailureResult({
            institution,
            unmetRequirements: gates.unmetRequirements.map((gate) => descriptions[gate]),
            requirementsUrl:
              exactTarget.program.searchText ?? BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY.sourceUrl,
          });
        }
      }
      const proof = await runBguAdmissionsProof({
        assessment: 'scores',
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
          extraInputs: input.extraInputs,
        },
      });

      return applyStructuredRequirementsToAcceptedScoreResult({
        input,
        program,
        institution,
        baseResult: normalizeExactProofResult({
          institution,
          proof: proof.normalizedPayload,
          explanationPrefix: 'מקור רשמי של אוניברסיטת בן-גוריון',
        }),
      });
    }

    if (exactTarget.sourceTarget.adapterId === 'huji') {
      const proof = await runHujiAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של האוניברסיטה העברית',
      });
    }

    if (
      exactTarget.targetId === 'tau-medicine-live' ||
      exactTarget.targetId === 'tau-medicine-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const mathUnits = input.extraInputs?.mathUnits;
      const mathGrade = input.extraInputs?.mathGrade;
      if (
        typeof psychometricEnglish !== 'number' ||
        typeof mathUnits !== 'number' ||
        typeof mathGrade !== 'number'
      ) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(typeof mathUnits !== 'number' ? ['math_units' as const] : []),
          ...(typeof mathGrade !== 'number' ? ['math_grade' as const] : []),
        ]);
      }
      if (input.psychometric < 700 || psychometricEnglish < 120 || mathUnits < 4) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: [
            ...(input.psychometric < 700 ? ['פסיכומטרי 700 ומעלה'] : []),
            ...(psychometricEnglish < 120 ? ['אנגלית בפסיכומטרי ברמת 120 ומעלה'] : []),
            ...(mathUnits < 4 ? ['מתמטיקה ברמת 4 יחידות ומעלה'] : []),
          ],
          requirementsUrl: 'https://go.tau.ac.il/he/med/ba/med-doc?v=important-info',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
        positiveDecision: 'eligible_to_apply',
      });
    }

    if (exactTarget.targetId === 'tau-nursing-live') {
      const gateResult = evaluateTauNursingGates(input);
      if (gateResult.state === 'needs_input') {
        return requiredInputsResult(institution, gateResult.requiredInputs);
      }
      if (gateResult.state === 'below') {
        return exactGateFailureResult({
          institution,
          unmetRequirements: gateResult.unmetRequirements,
          requirementsUrl: 'https://go.tau.ac.il/he/med/ba/nursing?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
        positiveDecision: 'eligible_to_apply',
      });
    }

    if (
      exactTarget.targetId === 'tau-psychology-live' ||
      exactTarget.targetId === 'tau-psychology-legacy-live'
    ) {
      const gateResult = evaluateTauPsychologyGates(input);
      if (gateResult.state === 'needs_input') {
        return requiredInputsResult(institution, gateResult.requiredInputs);
      }
      if (gateResult.state === 'below') {
        return exactGateFailureResult({
          institution,
          unmetRequirements: gateResult.unmetRequirements,
          requirementsUrl: TAU_PSYCHOLOGY_REQUIREMENTS_URL,
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-social-work-live' ||
      exactTarget.targetId === 'tau-social-work-legacy-live'
    ) {
      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-law-live' || exactTarget.targetId === 'tau-law-legacy-live') {
      const gateResult = evaluateTauLawGates(input);
      if (gateResult.state === 'needs_input') {
        return requiredInputsResult(institution, gateResult.requiredInputs);
      }
      if (gateResult.state === 'below') {
        return exactGateFailureResult({
          institution,
          unmetRequirements: gateResult.unmetRequirements,
          requirementsUrl: TAU_LAW_REQUIREMENTS_URL,
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-accounting-live' ||
      exactTarget.targetId === 'tau-accounting-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/management/ba/accounting?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-architecture-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/architecture?v=admission-requirements',
        });
      }
      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-biology-live' ||
      exactTarget.targetId === 'tau-biology-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/life-sciences/ba/biology?v=admission-requirements',
        });
      }
      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-communication-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/social-sciences/ba/communication?v=admission-requirements',
        });
      }
      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-political-science-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/social-sciences/ba/political-science?v=admission-requirements',
        });
      }
      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-education-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/social-sciences/ba/education?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-economics-live' ||
      exactTarget.targetId === 'tau-economics-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/management/ba/economics?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-cs-live' || exactTarget.targetId === 'tau-cs-legacy-live') {
      const gates = evaluateTauComputerScienceGates(input, 'scores');
      if (gates.requiredInputs.length > 0) {
        return requiredInputsResult(institution, gates.requiredInputs);
      }
      if (gates.unmetRequirements.length > 0) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: gates.unmetRequirements,
          requirementsUrl: 'https://go.tau.ac.il/he/exact/ba/computer?v=requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          exactSciencesBonusEligible: gates.exactSciencesBonusEligible,
          psychometric: input.psychometric,
          extraInputs: input.extraInputs,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-ee-live' || exactTarget.targetId === 'tau-ee-legacy-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (typeof psychometricEnglish !== 'number' || !bagrutSubjectRecord) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(!bagrutSubjectRecord ? ['bagrut_subject_record' as const] : []),
        ]);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/electrical-engineering?v=admission-requirements',
        });
      }
      const exactSciencesBonusEligible = tauEngineeringBonusEligibility(bagrutSubjectRecord);
      if (exactSciencesBonusEligible === undefined) {
        return requiredInputsResult(institution, ['bagrut_subject_record']);
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          exactSciencesBonusEligible,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-me-live' || exactTarget.targetId === 'tau-me-legacy-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (typeof psychometricEnglish !== 'number' || !bagrutSubjectRecord) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(!bagrutSubjectRecord ? ['bagrut_subject_record' as const] : []),
        ]);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/mechanical-engineering?v=admission-requirements',
        });
      }
      const exactSciencesBonusEligible = tauEngineeringBonusEligibility(bagrutSubjectRecord);
      if (exactSciencesBonusEligible === undefined) {
        return requiredInputsResult(institution, ['bagrut_subject_record']);
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          exactSciencesBonusEligible,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (
      exactTarget.targetId === 'tau-occupational-live' ||
      exactTarget.targetId === 'tau-occupational-legacy-live'
    ) {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      if (typeof psychometricEnglish !== 'number') {
        return requiredInputsResult(institution, ['psychometric_english']);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/med/ba/occupational-therapy?v=admission-requirements',
        });
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: { bagrutAverage: input.bagrut, psychometric: input.psychometric },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    if (exactTarget.targetId === 'tau-industrial-live') {
      const psychometricEnglish = input.extraInputs?.psychometricEnglish;
      const bagrutSubjectRecord = input.extraInputs?.bagrutSubjectRecord;
      if (typeof psychometricEnglish !== 'number' || !bagrutSubjectRecord) {
        return requiredInputsResult(institution, [
          ...(typeof psychometricEnglish !== 'number' ? ['psychometric_english' as const] : []),
          ...(!bagrutSubjectRecord ? ['bagrut_subject_record' as const] : []),
        ]);
      }
      if (psychometricEnglish < 100) {
        return exactGateFailureResult({
          institution,
          unmetRequirements: ['אנגלית בפסיכומטרי ברמת 100 ומעלה'],
          requirementsUrl:
            'https://go.tau.ac.il/he/engineering/ba/industrial-engineering?v=admission-requirements',
        });
      }
      const exactSciencesBonusEligible = tauEngineeringBonusEligibility(bagrutSubjectRecord);
      if (exactSciencesBonusEligible === undefined) {
        return requiredInputsResult(institution, ['bagrut_subject_record']);
      }

      const proof = await runTauAdmissionsProof({
        fetcher: timedFetcher,
        program: exactTarget.program,
        applicant: {
          bagrutAverage: input.bagrut,
          exactSciencesBonusEligible,
          psychometric: input.psychometric,
        },
      });

      return normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      });
    }

    const gateResult = evaluateTauDigitalSciencesGates(input);
    if (gateResult.state === 'needs_input') {
      return requiredInputsResult(institution, gateResult.requiredInputs);
    }
    if (gateResult.state === 'below') {
      return exactGateFailureResult({
        institution,
        unmetRequirements: gateResult.unmetRequirements,
        requirementsUrl:
          'https://go.tau.ac.il/he/engineering/ba/high-tech-plus?v=admission-requirements',
      });
    }

    const proof = await runTauAdmissionsProof({
      fetcher: timedFetcher,
      program: exactTarget.program,
      applicant: {
        bagrutAverage: input.bagrut,
        psychometric: input.psychometric,
        exactSciencesBonusEligible: gateResult.exactSciencesBonusEligible,
      },
    });

    return applyStructuredRequirementsToAcceptedScoreResult({
      input,
      program,
      institution,
      baseResult: normalizeExactProofResult({
        institution,
        proof: proof.normalizedPayload,
        explanationPrefix: 'מקור רשמי של אוניברסיטת תל אביב',
      }),
    });
  } catch (error) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'stale',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי לא זמין',
      explanation:
        error instanceof Error
          ? `לא הצלחנו לקבל אימות רשמי כרגע: ${error.message}`
          : 'לא הצלחנו לקבל אימות רשמי כרגע.',
      nextAction: institution.calculatorUrl
        ? 'נסו שוב מאוחר יותר או בדקו ישירות במחשבון הרשמי.'
        : 'נסו שוב מאוחר יותר.',
      degradationReason: 'official_source_unavailable',
    };
  }
}

function normalizeExactProofResult(args: {
  institution: CatalogueInstitution;
  proof: Record<string, unknown>;
  explanationPrefix: string;
  positiveDecision?: 'accepted' | 'eligible_to_apply';
}): AdmissionsEvaluationResult {
  const { institution, proof, explanationPrefix } = args;
  const decisionProvenance = proof.decisionProvenance;
  if (
    proof.proofStatus !== 'succeeded' ||
    proof.proofLevel !== 'exact_official' ||
    (decisionProvenance !== 'official_response' && decisionProvenance !== 'verified_derivation')
  ) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'unsupported',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי חלקי',
      explanation: `${explanationPrefix} לא החזיר הוכחת החלטה מלאה ומאומתת.`,
      nextAction: 'בדקו ישירות במקור הרשמי או נסו שוב מאוחר יותר.',
      degradationReason: 'official_source_partial',
    };
  }
  const positiveDecision =
    args.positiveDecision ??
    (proof.derivedVerdict === 'eligible_to_apply' ? 'eligible_to_apply' : 'accepted');

  const score = numberOrUndefined(proof.selectedScore) ?? numberOrUndefined(proof.weightedScore);
  const threshold =
    numberOrUndefined(proof.acceptanceThreshold) ?? numberOrUndefined(proof.acceptanceCutoff);

  if (score === undefined || threshold === undefined) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'unsupported',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי חלקי',
      explanation: `${explanationPrefix} החזיר נתונים חלקיים ללא סף קבלה מאומת.`,
      nextAction: 'בדקו ישירות במקור הרשמי או נסו שוב מאוחר יותר.',
      degradationReason: 'official_source_partial',
    };
  }

  const derivedVerdict =
    proof.derivedVerdict === 'accepted' ||
    proof.derivedVerdict === 'below' ||
    proof.derivedVerdict === 'eligible_to_apply' ||
    proof.derivedVerdict === 'pending'
      ? proof.derivedVerdict
      : undefined;
  const decision =
    derivedVerdict === 'accepted' || derivedVerdict === 'eligible_to_apply'
      ? positiveDecision
      : derivedVerdict === 'below'
        ? 'below'
        : derivedVerdict === 'pending'
          ? 'pending'
          : score >= threshold
            ? 'accepted'
            : 'below';
  const scoreLabel = proof.selectedScore !== undefined ? 'ציון התאמה' : 'ציון משוקלל';

  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'exact',
    kind: decision === 'eligible_to_apply' ? 'manual_gate' : 'exact',
    decision,
    confidence: 'high',
    ...((proof.scoreAssessment === 'meets_threshold' ||
      proof.scoreAssessment === 'below_threshold') && { scoreAssessment: proof.scoreAssessment }),
    sourceLabel:
      decision === 'eligible_to_apply'
        ? 'כשירות להמשך מיון'
        : derivedVerdict === 'pending'
          ? 'טווח המתנה רשמי'
          : 'אימות רשמי',
    explanation:
      decision === 'eligible_to_apply'
        ? `${explanationPrefix} אישר עמידה בסף המספרי. עדיין נדרשים מבדק התאמה, ולעיתים גם ראיון אישי; זו אינה קבלה סופית.`
        : derivedVerdict === 'pending'
          ? `${explanationPrefix} הציב את הציון בין סף הדחייה לסף הקבלה, ולכן עדיין אין החלטה סופית.`
          : `${explanationPrefix} סיפק ציון וסף קבלה מעודכנים למסלול זה.`,
    nextAction:
      decision === 'accepted'
        ? 'בדקו את דף ההרשמה הרשמי והשלימו את בדיקת העבר האקדמי, העברית ושאר דרישות המסמכים.'
        : decision === 'eligible_to_apply'
          ? 'השלימו את מבדק ההתאמה ועקבו אחר זימון אפשרי לראיון מטעם החוג.'
          : decision === 'below'
            ? 'שמרו את המסלול והשוו מול מוסדות אחרים או שפרו את הנתונים לפני הרשמה.'
            : 'עקבו אחר עדכון הספים באתר הרשמי או פנו למרכז הרישום.',
    score,
    scoreLabel,
    threshold,
  };
}

function exactGateFailureResult(args: {
  institution: CatalogueInstitution;
  unmetRequirements: string[];
  requirementsUrl: string;
}): AdmissionsEvaluationResult {
  return {
    institution: publicInstitutionShape(args.institution),
    linkedInstitutionId: args.institution.id,
    capability: 'exact',
    kind: 'exact',
    decision: 'below',
    confidence: 'high',
    sourceLabel: 'תנאי קבלה רשמיים',
    explanation: `לפי תנאי התוכנית הרשמיים, עדיין חסר לעמוד בדרישות הבאות: ${args.unmetRequirements.join('; ')}.`,
    nextAction: 'שפרו את תנאי הסף או בדקו אפיק קבלה חלופי באתר התוכנית.',
    officialUrls: [args.requirementsUrl],
  };
}

function evaluateNonExactResult(args: {
  input: AdmissionsEvaluationRequest;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  entry: AdmissionsCapabilityEntry;
}): AdmissionsEvaluationResult {
  const { input: requestedInput, program, institution, entry } = args;

  if (program.isListed === false) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'requirements_only',
      kind: 'requirements_only',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'מידע על המסלול',
      explanation: 'אין כרגע מידע עדכני על המסלול.',
      nextAction: 'פנו למוסד לבירור המסלולים הזמינים.',
    };
  }

  const danonUrl = institution.id === 'danon' ? DANON_PROGRAM_URLS[program.id] : undefined;
  if (danonUrl) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'requirements_only',
      kind: 'requirements_only',
      decision: 'unknown',
      confidence: 'medium',
      sourceLabel: 'הרשמה מול בית הספר',
      explanation: 'ההרשמה למסלול מתבצעת מול בית הספר, ללא חישוב סכם.',
      nextAction: 'בחרו מסלול ותאמו פגישת ייעוץ עם דנון.',
      officialUrls: [danonUrl],
    };
  }

  if (
    program.id === 'haifa_infosystems' &&
    institution.id === 'haifa' &&
    requestedInput.extraInputs?.haifaInformationSystemsTrack === 'single_major'
  )
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'blocked',
      kind: 'tracked_missing_rule',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'מיפוי המסלול טרם אומת',
      explanation:
        'המיפוי של מסלול מערכות המידע החד־חוגי הרגיל למחשבון הרשמי טרם אומת. לא ניתן לקבוע זכאות עבורו.',
      nextAction:
        'בדקו את המסלול מול החוג. בחרו מסלול אחר רק אם זה המסלול שאליו אתם מתכוונים להירשם.',
      officialUrls: ['https://admissions.haifa.ac.il/computer-information-science/program/3218/'],
    };

  const evidenceRecord =
    entry.evidence ?? getMondayAdmissionEvidenceByCatalogueInstitutionId(institution.id)[0];
  const dynamicRequirements = getDynamicRequirementsFromEvidence(evidenceRecord);

  if (entry.capability === 'needs_input') {
    const copy = missingInputsCopy(entry.requiredInputs ?? []);
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'נדרשים נתונים נוספים',
      explanation: copy.explanation,
      nextAction: copy.nextAction,
      requiredInputs: entry.requiredInputs,
    };
  }

  if (entry.capability === 'tracked_missing_rule') {
    return trackedMissingRuleResult(institution, entry);
  }

  if (entry.capability === 'authority_unavailable') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'authority_unavailable',
      kind: 'authority_unavailable',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'האימות הרשמי טרם הושלם',
      explanation:
        entry.pairVerification?.state === 'exact'
          ? 'תנאי המסלול נבדקו, אך עדיין חסר אימות עדכני של המקור הרשמי. בדקו במוסד לפני הרשמה.'
          : (entry.pairVerification?.reason ??
            'עדיין אין מספיק מידע רשמי מאומת כדי להציג החלטת קבלה למסלול זה.'),
      nextAction: entry.pairVerification?.sourceUrl
        ? 'בדקו בינתיים ישירות במחשבון הרשמי של המוסד.'
        : 'בדקו בינתיים ישירות באתר המוסד.',
      officialUrls: entry.pairVerification?.sourceUrl
        ? [entry.pairVerification.sourceUrl]
        : undefined,
      degradationReason: 'pair_verification_incomplete',
    };
  }

  if (entry.formulaPairScope === 'excluded') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'unsupported',
      kind: 'unsupported',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'מחוץ להיקף האימות',
      explanation:
        'מסלולי אריאל ובר־אילן מוחרגים במפורש מפרויקט אימות המחשבונים הנוכחי, ולכן לא נציג עבורם תוצאת קבלה משוערת.',
      nextAction: 'בדקו את תנאי הקבלה והמחשבון ישירות באתר המוסד.',
    };
  }

  if (entry.capability === 'blocked') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'blocked',
      kind: 'unsupported',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'מקור חסום',
      explanation: entry.sourceTarget?.blockedReason ?? 'המקור הרשמי דורש דפדפן או תהליך ידני.',
      nextAction: entry.sourceTarget?.nextAction ?? 'בדקו ישירות באתר המוסד.',
    };
  }

  if (entry.capability === 'stale') {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'stale',
      kind: 'degraded',
      decision: 'unknown',
      confidence: 'low',
      sourceLabel: 'אימות רשמי לא זמין',
      explanation: 'לא הצלחנו להשלים אימות עדכני של תנאי הקבלה.',
      nextAction: 'נסו שוב מאוחר יותר או בדקו ישירות במקור הרשמי.',
      degradationReason: 'source_stale',
    };
  }

  if (entry.capability === 'open_admission') {
    const defaultText =
      'מוסד זה מציע אפיק קבלה פתוחה ללא צורך בציון פסיכומטרי או ממוצע בגרות מינימלי.';
    const explanation = catalogueDescription(evidenceRecord?.decisionReason) || defaultText;
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'open_admission',
      kind: 'open_admission',
      decision: 'accepted',
      confidence: 'high',
      sourceLabel: 'קבלה פתוחה',
      explanation,
      nextAction: 'הירשמו ישירות למסלול הלימודים באתר הרשמי של המוסד.',
    };
  }

  if (requestedInput.psychometric === undefined || requestedInput.bagrut === undefined) {
    return requiredInputsResult(institution, [
      ...(requestedInput.psychometric === undefined ? ['psychometric_overall' as const] : []),
      ...(requestedInput.bagrut === undefined ? ['bagrut_average' as const] : []),
    ]);
  }
  const input = {
    ...requestedInput,
    psychometric: requestedInput.psychometric,
    bagrut: requestedInput.bagrut,
  };
  const noGradeGate = Boolean(
    entry.evidence?.noBagrutNeeded && entry.evidence.noPsychometricNeeded,
  );

  if (entry.capability === 'manual_gate') {
    const verifiedThreshold = getVerifiedProgramThreshold(entry.evidence, program.id);
    if (
      verifiedThreshold?.thresholdKind === 'invitation_to_manual_gate' &&
      verifiedThreshold.threshold > 0
    ) {
      if (verifiedThreshold.scoreKind === 'psychometric') {
        const thresholdExplanation =
          catalogueDescription(verifiedThreshold.notes) ??
          'הציון הרשמי כאן הוא סף זימון להמשך מיון ידני, ולא קבלה סופית למסלול.';
        const psychometricGap = Math.max(0, verifiedThreshold.threshold - input.psychometric);

        if (psychometricGap > 0) {
          return {
            institution: publicInstitutionShape(institution),
            linkedInstitutionId: institution.id,
            capability: 'manual_gate',
            kind: 'manual_gate',
            decision: 'below',
            confidence: 'high',
            sourceLabel: 'סף זימון נדרש',
            explanation: `לפי המקור הרשמי, צריך להגיע לפחות לפסיכומטרי ${verifiedThreshold.threshold} כדי לעבור לשלב המיון הידני. ${thresholdExplanation}`,
            nextAction:
              'שפרו את ציון הפסיכומטרי או בדקו מול המוסד אם קיים אפיק חריגים. גם מעבר סף הזימון לא מבטיח קבלה סופית.',
            score: input.psychometric,
            scoreLabel: 'פסיכומטרי',
            threshold: verifiedThreshold.threshold,
            deltaNeeded: {
              psychometric: psychometricGap,
              bagrut: 0,
            },
          };
        }

        return {
          institution: publicInstitutionShape(institution),
          linkedInstitutionId: institution.id,
          capability: 'manual_gate',
          kind: 'manual_gate',
          decision: 'eligible_to_apply',
          confidence: 'high',
          sourceLabel: 'נדרש מיון נוסף',
          explanation: `לפי המקור הרשמי, הגעתם לסף הזימון בפסיכומטרי ${verifiedThreshold.threshold}. ${thresholdExplanation}`,
          nextAction: 'הגישו מועמדות והשלימו את שלבי המיון הידניים או המבחנים הנדרשים למסלול.',
          score: input.psychometric,
          scoreLabel: 'פסיכומטרי',
          threshold: verifiedThreshold.threshold,
        };
      }

      const missingRequiredInputs = getMissingRequiredInputsForEstimate(
        input,
        program,
        institution,
      );
      if (missingRequiredInputs.length > 0) {
        return requiredInputsResult(institution, missingRequiredInputs);
      }

      const calculatorInstitution = getCalculatorInstitutionsFromCatalogue([institution])[0];
      if (calculatorInstitution) {
        const [evaluation] = evaluateUniversities(
          [calculatorInstitution as University],
          {
            ...program,
            thresholds: {
              ...(program.thresholds ?? {}),
              [institution.id]: verifiedThreshold.threshold,
            },
          },
          {
            psychometric: input.psychometric,
            bagrut: input.bagrut,
            mathGrade: input.extraInputs?.mathGrade,
            mathUnits: input.extraInputs?.mathUnits,
            englishGrade: input.extraInputs?.englishGrade,
            englishUnits: input.extraInputs?.englishUnits,
            physicsGrade: input.extraInputs?.physicsGrade,
            physicsUnits: input.extraInputs?.physicsUnits,
            csGrade: input.extraInputs?.csGrade,
            csUnits: input.extraInputs?.csUnits,
          },
          { hasMath5: false, hasPhysics5: false },
        );

        if (evaluation && evaluation.status !== 'unavailable') {
          const thresholdExplanation =
            catalogueDescription(verifiedThreshold.notes) ??
            'הסכם הרשמי כאן הוא סף זימון להמשך מיון ידני, ולא קבלה סופית למסלול.';

          if (evaluation.status === 'below') {
            return {
              institution: publicInstitutionShape(institution),
              linkedInstitutionId: institution.id,
              capability: 'manual_gate',
              kind: 'manual_gate',
              decision: 'below',
              confidence: 'high',
              sourceLabel: 'סף זימון נדרש',
              explanation: `לפי המקור הרשמי, צריך להגיע לפחות לסכם ${verifiedThreshold.threshold} כדי לעבור לשלב המיון הידני. ${thresholdExplanation}`,
              nextAction:
                'שפרו את הנתונים שמופיעים בפער לפני הרשמה. גם מעבר סף הזימון לא מבטיח קבלה סופית.',
              score: evaluation.sekhem,
              scoreLabel: 'סכם',
              threshold: verifiedThreshold.threshold,
              deltaNeeded: evaluation.deltaNeeded,
            };
          }

          return {
            institution: publicInstitutionShape(institution),
            linkedInstitutionId: institution.id,
            capability: 'manual_gate',
            kind: 'manual_gate',
            decision: 'eligible_to_apply',
            confidence: 'high',
            sourceLabel: 'נדרש מיון נוסף',
            explanation: `לפי המקור הרשמי, הגעתם לסף הזימון ${verifiedThreshold.threshold}. ${thresholdExplanation}`,
            nextAction: 'הגישו מועמדות והשלימו את שלבי המיון הידניים או הראיונות שנדרשים למסלול.',
            score: evaluation.sekhem,
            scoreLabel: 'סכם',
            threshold: verifiedThreshold.threshold,
          };
        }
      }
    }

    const detail = findInstitutionDetail(program, institution);
    const structuredResult = evaluateStructuredRequirementsResult({
      input,
      institution,
      capability: 'manual_gate',
      detail,
      dynamicRequirements,
      noGradeGate,
      programType: program.type,
    });
    if (structuredResult) {
      return structuredResult;
    }

    const factsList = detail?.admissionFacts?.map((fact) => fact.description) ?? [];
    const notesList = detail?.specificAdmissionNotes ?? [];
    const allRequirements = catalogueAdmissionRequirements([
      ...program.admissionRequirements,
      ...factsList,
      ...notesList,
      ...dynamicRequirements,
    ]);
    if (!noGradeGate) return unverifiedRequirementsResult(institution, allRequirements);

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
      confidence: 'high',
      sourceLabel: 'אפשר להגיש מועמדות',
      explanation: `אין דרישה לבגרות או לפסיכומטרי. עדיין צריך להשלים: ${allRequirements.join('; ')}`,
      nextAction: 'בדקו את מועדי תיק העבודות, המבחנים או הראיונות באתר המוסד.',
    };
  }

  if (entry.capability === 'requirements_only') {
    const detail = findInstitutionDetail(program, institution);
    const structuredResult = evaluateStructuredRequirementsResult({
      input,
      institution,
      capability: 'requirements_only',
      detail,
      dynamicRequirements,
      noGradeGate,
      programType: program.type,
    });
    if (structuredResult) {
      return structuredResult;
    }

    const notesList = detail?.specificAdmissionNotes ?? [];
    const allRequirements = catalogueAdmissionRequirements([
      ...(program.admissionRequirements ?? []),
      ...notesList,
      ...dynamicRequirements,
    ]);

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'requirements_only',
      kind: 'requirements_only',
      decision: 'unknown',
      confidence: 'medium',
      sourceLabel: 'דרישות קבלה',
      explanation:
        allRequirements.length > 0
          ? `תנאי קבלה למסלול זה: ${allRequirements.join('; ')}`
          : 'מוסד זה דורש עמידה בתנאי קבלה שטרם מופו באופן מלא. בדקו את האתר הרשמי לפרטים נוספים.',
      nextAction: 'בדקו את תנאי הקבלה המלאים באתר הרשמי של המוסד.',
    };
  }

  if (entry.capability === 'estimated' || entry.capability === 'score_only') {
    const missingRequiredInputs = getMissingRequiredInputsForEstimate(input, program, institution);
    if (missingRequiredInputs.length > 0) {
      return requiredInputsResult(institution, missingRequiredInputs);
    }

    const calculatorInstitution = getCalculatorInstitutionsFromCatalogue([institution])[0];
    if (!calculatorInstitution) {
      return unsupportedResult(institution, entry);
    }

    const [evaluation] = evaluateUniversities(
      [calculatorInstitution as University],
      program,
      {
        psychometric: input.psychometric,
        bagrut: input.bagrut,
        mathGrade: input.extraInputs?.mathGrade,
        mathUnits: input.extraInputs?.mathUnits,
        englishGrade: input.extraInputs?.englishGrade,
        englishUnits: input.extraInputs?.englishUnits,
        physicsGrade: input.extraInputs?.physicsGrade,
        physicsUnits: input.extraInputs?.physicsUnits,
        csGrade: input.extraInputs?.csGrade,
        csUnits: input.extraInputs?.csUnits,
      },
      { hasMath5: false, hasPhysics5: false },
    );

    if (!evaluation || evaluation.status === 'unavailable') {
      return unsupportedResult(institution, entry);
    }

    const officialUrls = entry.evidence?.officialUrls.length
      ? [...entry.evidence.officialUrls]
      : [];
    const sourceBlocked =
      entry.evidence?.officialVerificationStatus.startsWith('blocked_') ?? false;
    const defaultExplanation = sourceBlocked
      ? 'המקור הרשמי חסום כרגע, לכן התוצאה מבוססת על נוסחת סכם ממופה ועל סף קבלה שנשמר בקטלוג, בלי אימות חי של אתר המוסד.'
      : entry.capability === 'estimated'
        ? 'התוצאה מבוססת על נוסחת סכם וסף קבלה שמופו ממקור מוסדי ונבדקו בקטלוג.'
        : 'התוצאה מבוססת על נוסחת סכם ממופה וסף קבלה שנבדק בקטלוג, כשהמקור הרשמי מספק חלק מהמידע.';
    const defaultNextAction = sourceBlocked
      ? (entry.evidence?.nextAction ??
        'בדקו ישירות באתר המוסד או במחשבון הרשמי כשהוא זמין, לפני קבלת החלטה סופית.')
      : evaluation.status === 'accepted'
        ? 'המשיכו להרשמה ובדקו מועדים, מסמכים ודרישות משלימות באתר המוסד.'
        : 'שפרו את הנתונים שמופיעים בפער או השוו למסלולים אחרים שבהם אתם עומדים בסף.';

    return applyStructuredRequirementsToAcceptedScoreResult({
      input,
      program,
      institution,
      baseResult: {
        institution: publicInstitutionShape(institution),
        linkedInstitutionId: institution.id,
        capability: entry.capability,
        kind: 'estimated',
        decision: evaluation.status === 'accepted' ? 'accepted' : 'below',
        confidence: sourceBlocked ? 'medium' : entry.capability === 'estimated' ? 'high' : 'medium',
        sourceLabel: sourceBlocked
          ? 'כלל קבלה ממופה, מקור רשמי חסום'
          : entry.capability === 'estimated'
            ? 'כלל קבלה ממופה'
            : 'כלל קבלה ממופה ממקור חלקי',
        explanation: evaluation.explanation ?? defaultExplanation,
        nextAction: defaultNextAction,
        score: evaluation.sekhem,
        scoreLabel: 'סכם',
        threshold: evaluation.threshold,
        deltaNeeded: evaluation.deltaNeeded,
        evidenceItemId: entry.evidence?.itemId,
        evidenceItemName: entry.evidence?.itemName,
        officialUrls,
      },
    });
  }

  return unsupportedResult(institution, entry);
}

function getMissingRequiredInputsForEstimate(
  input: AdmissionsEvaluationInput,
  program: CatalogueProgram,
  institution: CatalogueInstitution,
): AdmissionsRequiredInput[] {
  if (institution.id === 'afeka') {
    return missingInputs(input, ['math_units', 'math_grade', 'english_units', 'english_grade']);
  }

  if (institution.id === 'hit' && isHitTechnicalProgram(program)) {
    return missingInputs(input, ['math_units', 'math_grade']);
  }

  return [];
}

function getDynamicRequirementsFromEvidence(
  evidenceRecord: MondayAdmissionEvidenceRecord | undefined,
) {
  const dynamicRequirements: string[] = [];

  if (evidenceRecord?.noBagrutNeeded) {
    dynamicRequirements.push('אין צורך בבגרות');
  }
  if (evidenceRecord?.noPsychometricNeeded) {
    dynamicRequirements.push('אין צורך בפסיכומטרי');
  }
  if (evidenceRecord?.interviewNeeded) {
    dynamicRequirements.push('ראיון קבלה חובה');
  }
  if (evidenceRecord?.portfolioNeeded) {
    dynamicRequirements.push('הגשת תיק עבודות חובה');
  }

  return dynamicRequirements;
}

type ProgramInstitutionDetail = NonNullable<CatalogueProgram['institutionDetails']>[number];

function unverifiedRequirementsResult(
  institution: CatalogueInstitution,
  requirements: string[],
): AdmissionsEvaluationResult {
  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'requirements_only',
    kind: 'requirements_only',
    decision: 'unknown',
    confidence: 'low',
    sourceLabel: 'תנאי קבלה',
    explanation:
      'עדיין לא בדקנו את הציונים שלך מול תנאי הקבלה של המסלול הזה.' +
      (requirements.length > 0 ? ` תנאי הקבלה שפורסמו: ${requirements.join('; ')}` : ''),
    nextAction: 'בדקו את התנאים הרשמיים באתר המוסד או צרו קשר לבירור ההתאמה.',
  };
}

interface StructuredRequirementsResultArgs {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
  capability: 'manual_gate' | 'requirements_only';
  detail: ProgramInstitutionDetail | undefined;
  dynamicRequirements: string[];
  noGradeGate: boolean;
  scoreGatePassed?: boolean;
  programType: CatalogueProgram['type'];
}

interface StructuredNumericFactResult {
  description: string;
  field: string;
  comparison: string;
  expected: number;
  actual: number;
}

interface GroupedNumericFactOptionResult {
  descriptions: string[];
  metDescriptions: string[];
  missingRequiredInputs: Set<AdmissionsRequiredInput>;
  unmetFacts: StructuredNumericFactResult[];
  hasUncheckedFacts: boolean;
}

function evaluateStructuredRequirementsResult(
  args: StructuredRequirementsResultArgs,
): AdmissionsEvaluationResult | undefined {
  const {
    input,
    institution,
    capability,
    detail,
    dynamicRequirements,
    noGradeGate,
    scoreGatePassed = false,
    programType,
  } = args;

  if (!detail?.admissionFacts?.length) {
    return undefined;
  }

  const facts = detail.admissionFacts.map((fact) => ({
    ...fact,
    description: catalogueAdmissionRequirements([fact.description]).join('; '),
  }));
  const alternativePathDescriptions =
    detail.admissionAlternativePaths?.flatMap((path) =>
      catalogueAdmissionRequirements([path.title]),
    ) ?? [];
  const notesList = detail.specificAdmissionNotes.length
    ? catalogueAdmissionRequirements(detail.specificAdmissionNotes)
    : [];
  const manualGateDescriptions = facts
    .filter((fact) => fact.kind === 'manual_gate')
    .map((fact) => fact.description);
  const numericFacts = facts.filter((fact) => fact.kind === 'numeric_gate');
  const hasOpenAdmissionFact = facts.some((fact) => fact.kind === 'open_admission');
  const hasNoFormalGradeGate =
    noGradeGate ||
    ['psychometric', 'bagrut_average'].every((field) =>
      facts.some(
        (fact) =>
          fact.kind === 'explicit_absence' &&
          fact.field === field &&
          fact.comparison === 'not_required' &&
          fact.confidence === 'high',
      ),
    );

  const missingRequiredInputs = new Set<AdmissionsRequiredInput>();
  const unmetNumericFacts: StructuredNumericFactResult[] = [];
  const metNumericDescriptions: string[] = [];
  let hasUncheckedNumericFacts = false;
  const commonNumericFacts: typeof numericFacts = [];
  const groupedNumericFacts = new Map<string, Map<string, typeof numericFacts>>();

  for (const fact of numericFacts) {
    const groupKey = getAdmissionFactGroupKey(fact);
    if (!groupKey) {
      commonNumericFacts.push(fact);
      continue;
    }

    const [groupCategory, groupOption = groupKey] = groupKey.split('/', 2);
    const options =
      groupedNumericFacts.get(groupCategory) ?? new Map<string, typeof numericFacts>();
    const factsForOption = options.get(groupOption) ?? [];
    factsForOption.push(fact);
    options.set(groupOption, factsForOption);
    groupedNumericFacts.set(groupCategory, options);
  }

  for (const fact of commonNumericFacts) {
    const evaluation = evaluateStructuredNumericFact(input, fact);
    if (evaluation.kind === 'missing_input') {
      missingRequiredInputs.add(evaluation.requiredInput);
      continue;
    }

    if (evaluation.kind === 'pass') {
      metNumericDescriptions.push(fact.description);
      continue;
    }

    if (evaluation.kind === 'fail') {
      unmetNumericFacts.push(evaluation.result);
    }
    if (evaluation.kind === 'skip') hasUncheckedNumericFacts = true;
  }

  for (const [, optionFactsByKey] of groupedNumericFacts) {
    const optionResults = [...optionFactsByKey.values()].map((optionFacts) =>
      evaluateGroupedNumericFactOption(input, optionFacts),
    );
    const passedOption = optionResults.find(
      (option) =>
        option.unmetFacts.length === 0 &&
        option.missingRequiredInputs.size === 0 &&
        !option.hasUncheckedFacts,
    );

    if (passedOption) {
      metNumericDescriptions.push(...passedOption.metDescriptions);
      continue;
    }

    if (
      optionResults.some((option) => option.unmetFacts.length === 0 && option.hasUncheckedFacts)
    ) {
      hasUncheckedNumericFacts = true;
    }

    const optionsNeedingInputs = optionResults.filter(
      (option) => option.unmetFacts.length === 0 && option.missingRequiredInputs.size > 0,
    );

    if (optionsNeedingInputs.length > 0) {
      for (const option of optionsNeedingInputs) {
        for (const requiredInput of option.missingRequiredInputs) {
          missingRequiredInputs.add(requiredInput);
        }
      }
      continue;
    }

    const firstOptionWithUnmetFacts = optionResults.find((option) => option.unmetFacts.length > 0);
    if (firstOptionWithUnmetFacts) {
      unmetNumericFacts.push(...firstOptionWithUnmetFacts.unmetFacts);
    }
  }

  if (missingRequiredInputs.size > 0) {
    return requiredInputsResult(institution, [...missingRequiredInputs]);
  }

  if (hasOpenAdmissionFact && numericFacts.length === 0 && manualGateDescriptions.length === 0) {
    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'open_admission',
      kind: 'open_admission',
      decision: 'accepted',
      confidence: 'high',
      sourceLabel: 'קבלה פתוחה',
      explanation:
        facts.find((fact) => fact.kind === 'open_admission')?.description ??
        'לפי התנאים שמופו, המסלול פתוח להרשמה ללא סף ציונים פורמלי.',
      nextAction: 'המשיכו לרישום ובדקו באתר המוסד את המסמכים או המועדים הרלוונטיים.',
    };
  }

  const allRequirements = [
    ...metNumericDescriptions,
    ...manualGateDescriptions,
    ...alternativePathDescriptions,
    ...notesList,
    ...dynamicRequirements,
  ];

  if (
    hasUncheckedNumericFacts ||
    (unmetNumericFacts.length === 0 &&
      !scoreGatePassed &&
      metNumericDescriptions.length === 0 &&
      !hasOpenAdmissionFact &&
      !hasNoFormalGradeGate)
  ) {
    return unverifiedRequirementsResult(
      institution,
      catalogueAdmissionRequirements([
        ...facts.map((fact) => fact.description),
        ...alternativePathDescriptions,
        ...notesList,
        ...dynamicRequirements,
      ]),
    );
  }

  if (unmetNumericFacts.length > 0) {
    const firstUnmet = unmetNumericFacts[0];

    if (alternativePathDescriptions.length > 0) {
      return {
        institution: publicInstitutionShape(institution),
        linkedInstitutionId: institution.id,
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'below',
        confidence: 'high',
        sourceLabel: 'קיימים אפיקים חלופיים',
        explanation: `לפי המסלול הישיר שמופה, עדיין חסר לעמוד בדרישות הבאות: ${unmetNumericFacts
          .map((fact) => fact.description)
          .join(
            '; ',
          )}. עדיין קיימים אפיקים חלופיים שאפשר לבדוק מול המוסד: ${alternativePathDescriptions.join('; ')}.`,
        nextAction:
          manualGateDescriptions.length > 0
            ? 'בדקו מול המוסד איזה אפיק חלופי רלוונטי לכם, והשלימו גם את שלבי הבדיקה או המיון הידניים שנדרשים במסלול הזה.'
            : 'בדקו מול המוסד איזה אפיק חלופי רלוונטי לכם והאם הוא מחייב מכינה, מסמכים משלימים או שלב מיון נוסף.',
        ...(singleNumericGateMetrics(firstUnmet) ?? {}),
      };
    }

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability,
      kind: capability === 'requirements_only' ? 'requirements_only' : 'manual_gate',
      decision: 'below',
      confidence: 'high',
      sourceLabel: 'לא עומדים בסף',
      explanation: `לפי התנאים שמופו, עדיין חסר לעמוד בדרישות הבאות: ${unmetNumericFacts
        .map((fact) => fact.description)
        .join('; ')}.`,
      nextAction:
        manualGateDescriptions.length > 0
          ? 'שפרו את תנאי הסף המספריים לפני ההגשה. לאחר מכן עדיין תצטרכו להשלים את שלבי המיון הידניים של המוסד.'
          : 'שפרו את תנאי הסף המספריים או בדקו אפיק חלופי באתר המוסד.',
      ...(singleNumericGateMetrics(firstUnmet) ?? {}),
    };
  }

  if (manualGateDescriptions.length > 0 || alternativePathDescriptions.length > 0) {
    const directEligibilityPrefix =
      metNumericDescriptions.length > 0
        ? 'עמדתם בתנאים המספריים שמופו.'
        : 'אפשר להתקדם עם המועמדות.';
    const remainingManualSteps =
      manualGateDescriptions.length > 0
        ? ` עדיין צריך להשלים את השלבים הבאים: ${manualGateDescriptions.join('; ')}.`
        : '';
    const alternativeRoutesNote =
      alternativePathDescriptions.length > 0
        ? ` קיימים גם אפיקים חלופיים שהמוסד מפרסם: ${alternativePathDescriptions.join('; ')}.`
        : '';
    const notesExplanation =
      notesList.length > 0 || dynamicRequirements.length > 0
        ? ` מידע רלוונטי נוסף: ${[...notesList, ...dynamicRequirements].join('; ')}.`
        : '';

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
      confidence: 'high',
      sourceLabel: manualGateDescriptions.length > 0 ? 'נדרש מיון נוסף' : 'אפשר להגיש מועמדות',
      explanation:
        `${directEligibilityPrefix}${remainingManualSteps}${alternativeRoutesNote}${notesExplanation}`.trim(),
      nextAction:
        alternativePathDescriptions.length > 0
          ? 'בדקו איזה אפיק הגשה או מכינה רלוונטיים לכם באתר המוסד, והשלימו את שלבי המיון הידניים.'
          : 'הגישו מועמדות והשלימו את הראיון, הוועדה, תיק העבודות או שאר שלבי המיון באתר המוסד.',
    };
  }

  if (hasNoFormalGradeGate) {
    const registerLabel =
      programType === 'certificate' ||
      programType === 'vocational' ||
      programType === 'short-course'
        ? 'אפשר להירשם'
        : 'אפשר להגיש מועמדות';

    return {
      institution: publicInstitutionShape(institution),
      linkedInstitutionId: institution.id,
      capability,
      kind: capability === 'requirements_only' ? 'requirements_only' : 'manual_gate',
      decision: 'eligible_to_apply',
      confidence: 'high',
      sourceLabel: registerLabel,
      explanation:
        allRequirements.length > 0
          ? `לפי התנאים שמופו, אין למסלול סף ציונים פורמלי שחוסם הגשה. מידע רלוונטי: ${allRequirements.join('; ')}`
          : 'לפי התנאים שמופו, אין למסלול סף ציונים פורמלי שחוסם הגשה.',
      nextAction:
        programType === 'certificate' ||
        programType === 'vocational' ||
        programType === 'short-course'
          ? 'המשיכו לרישום ובדקו באתר המוסד מסמכי הרשמה, מועדים ודרישות אדמיניסטרטיביות.'
          : 'הגישו מועמדות ובדקו באתר המוסד מסמכי הרשמה, מועדים ודרישות משלימות.',
    };
  }

  return undefined;
}

function applyStructuredRequirementsToAcceptedScoreResult(args: {
  input: AdmissionsEvaluationInput;
  program: CatalogueProgram;
  institution: CatalogueInstitution;
  baseResult: AdmissionsEvaluationResult;
}): AdmissionsEvaluationResult {
  const { input, program, institution, baseResult } = args;

  if (baseResult.decision !== 'accepted' && baseResult.scoreAssessment !== 'meets_threshold') {
    return baseResult;
  }

  const detail = findInstitutionDetail(program, institution);
  if (!detail?.admissionFacts?.length) {
    return baseResult;
  }

  const hasManualStage =
    detail.admissionFacts.some((fact) => fact.kind === 'manual_gate') ||
    Boolean(detail.admissionAlternativePaths?.length);
  const structuredResult = evaluateStructuredRequirementsResult({
    input,
    institution,
    capability: hasManualStage ? 'manual_gate' : 'requirements_only',
    detail,
    dynamicRequirements: [],
    noGradeGate: false,
    scoreGatePassed: baseResult.threshold != null && baseResult.threshold > 0,
    programType: program.type,
  });

  if (!structuredResult) {
    return baseResult;
  }

  return {
    ...structuredResult,
    ...(baseResult.score !== undefined && structuredResult.score === undefined
      ? { score: baseResult.score }
      : {}),
    ...(baseResult.scoreLabel !== undefined && structuredResult.scoreLabel === undefined
      ? { scoreLabel: baseResult.scoreLabel }
      : {}),
    ...(baseResult.threshold !== undefined && structuredResult.threshold === undefined
      ? { threshold: baseResult.threshold }
      : {}),
    ...(baseResult.deltaNeeded !== undefined && structuredResult.deltaNeeded === undefined
      ? { deltaNeeded: baseResult.deltaNeeded }
      : {}),
  };
}

function readNumericAdmissionFactValue(
  input: AdmissionsEvaluationInput,
  field: string,
): { actual: number | undefined; requiredInput?: AdmissionsRequiredInput } {
  switch (field) {
    case 'psychometric':
      return { actual: input.psychometric };
    case 'bagrut_average':
      return { actual: input.bagrut };
    case 'psychometric_quantitative':
      return { actual: input.extraInputs?.psychometricMath, requiredInput: 'psychometric_math' };
    case 'psychometric_english':
      return {
        actual: input.extraInputs?.psychometricEnglish,
        requiredInput: 'psychometric_english',
      };
    case 'math_units':
      return { actual: input.extraInputs?.mathUnits, requiredInput: 'math_units' };
    case 'math_grade':
      return { actual: input.extraInputs?.mathGrade, requiredInput: 'math_grade' };
    case 'english_units':
      return { actual: input.extraInputs?.englishUnits, requiredInput: 'english_units' };
    case 'english_grade':
      return { actual: input.extraInputs?.englishGrade, requiredInput: 'english_grade' };
    case 'physics_units':
      return { actual: input.extraInputs?.physicsUnits, requiredInput: 'physics_units' };
    case 'physics_grade':
      return { actual: input.extraInputs?.physicsGrade, requiredInput: 'physics_grade' };
    case 'cs_units':
      return { actual: input.extraInputs?.csUnits, requiredInput: 'cs_units' };
    case 'cs_grade':
      return { actual: input.extraInputs?.csGrade, requiredInput: 'cs_grade' };
    default:
      return { actual: undefined };
  }
}

function getAdmissionFactGroupKey(
  fact: NonNullable<ProgramInstitutionDetail['admissionFacts']>[number],
) {
  if (fact.groupKey) {
    return fact.groupKey;
  }

  const encodedGroupKey = fact.id.match(/:fact:group:([^:]+):/u)?.[1];
  return encodedGroupKey ? decodeURIComponent(encodedGroupKey) : undefined;
}

function evaluateStructuredNumericFact(
  input: AdmissionsEvaluationInput,
  fact: NonNullable<ProgramInstitutionDetail['admissionFacts']>[number],
):
  | { kind: 'pass' }
  | { kind: 'missing_input'; requiredInput: AdmissionsRequiredInput }
  | { kind: 'skip' }
  | { kind: 'fail'; result: StructuredNumericFactResult } {
  const value = readNumericAdmissionFactValue(input, fact.field);

  if (fact.confidence !== 'high') return { kind: 'skip' };

  if (value.requiredInput && value.actual === undefined) {
    return {
      kind: 'missing_input',
      requiredInput: value.requiredInput,
    };
  }

  if (
    value.actual === undefined ||
    fact.valueNumber === null ||
    !Number.isFinite(fact.valueNumber) ||
    fact.valueNumber <= 0
  ) {
    return { kind: 'skip' };
  }

  if (compareAdmissionFactValue(value.actual, fact.comparison, fact.valueNumber)) {
    return { kind: 'pass' };
  }

  return {
    kind: 'fail',
    result: {
      description: fact.description,
      field: fact.field,
      comparison: fact.comparison,
      expected: fact.valueNumber,
      actual: value.actual,
    },
  };
}

function evaluateGroupedNumericFactOption(
  input: AdmissionsEvaluationInput,
  facts: NonNullable<ProgramInstitutionDetail['admissionFacts']>,
): GroupedNumericFactOptionResult {
  const descriptions: string[] = [];
  const metDescriptions: string[] = [];
  const missingRequiredInputs = new Set<AdmissionsRequiredInput>();
  const unmetFacts: StructuredNumericFactResult[] = [];
  let hasUncheckedFacts = false;

  for (const fact of facts) {
    descriptions.push(fact.description);

    const evaluation = evaluateStructuredNumericFact(input, fact);
    if (evaluation.kind === 'pass') {
      metDescriptions.push(fact.description);
      continue;
    }

    if (evaluation.kind === 'missing_input') {
      missingRequiredInputs.add(evaluation.requiredInput);
      continue;
    }

    if (evaluation.kind === 'fail') {
      unmetFacts.push(evaluation.result);
    }
    if (evaluation.kind === 'skip') hasUncheckedFacts = true;
  }

  return {
    descriptions,
    metDescriptions,
    missingRequiredInputs:
      unmetFacts.length > 0 ? new Set<AdmissionsRequiredInput>() : missingRequiredInputs,
    unmetFacts,
    hasUncheckedFacts,
  };
}

function compareAdmissionFactValue(actual: number, comparison: string, expected: number) {
  switch (comparison) {
    case 'gte':
      return actual >= expected;
    case 'lte':
      return actual <= expected;
    case 'eq':
      return actual === expected;
    default:
      return false;
  }
}

function singleNumericGateMetrics(fact: StructuredNumericFactResult) {
  const common = { threshold: fact.expected };

  if (fact.field === 'psychometric') {
    return {
      ...common,
      score: fact.actual,
      scoreLabel: 'פסיכומטרי',
      deltaNeeded: {
        psychometric: Math.max(0, fact.expected - fact.actual),
        bagrut: 0,
      },
    };
  }

  if (fact.field === 'bagrut_average') {
    return {
      ...common,
      score: fact.actual,
      scoreLabel: 'ממוצע בגרות',
      deltaNeeded: {
        psychometric: 0,
        bagrut: Math.max(0, fact.expected - fact.actual),
      },
    };
  }

  return common;
}

function missingInputs(
  input: AdmissionsEvaluationInput,
  requiredInputs: AdmissionsRequiredInput[],
): AdmissionsRequiredInput[] {
  return requiredInputs.filter(
    (requiredInput) => admissionsInputValue(input.extraInputs, requiredInput) === undefined,
  );
}

function findInstitutionDetail(
  program: CatalogueProgram,
  institution: CatalogueInstitution,
): ProgramInstitutionDetail | undefined {
  return program.institutionDetails?.find(
    (detail) =>
      detail.institutionName === institution.name ||
      detail.officialCalculatorUrl?.includes(institution.id) ||
      detail.programUrl?.includes(institution.id),
  );
}

function isHitTechnicalProgram(program: CatalogueProgram): boolean {
  return (
    program.id.includes('cs') ||
    program.id.includes('ee') ||
    program.category === 'הנדסה וטכנולוגיה'
  );
}

function requiredInputsResult(
  institution: CatalogueInstitution,
  requiredInputs: AdmissionsRequiredInput[],
): AdmissionsEvaluationResult {
  const copy = missingInputsCopy(requiredInputs);
  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'needs_input',
    kind: 'needs_input',
    decision: 'unknown',
    confidence: 'low',
    sourceLabel: 'נדרשים נתונים נוספים',
    explanation: copy.explanation,
    nextAction: copy.nextAction,
    requiredInputs,
  };
}

function missingInputsCopy(requiredInputs: AdmissionsRequiredInput[]) {
  const bguInputLabels: Partial<Record<AdmissionsRequiredInput, string>> = {
    bgu_language_requirements: 'אישור עמידה בדרישות האנגלית והעברית או פטור תקף',
    bgu_psychology_requirements: 'אישור תעודת קבלה מוכרת ותנאי החוג הנוסף',
    bgu_bagrut_average: 'ממוצע הבגרות הרשמי של בן־גוריון',
    bgu_preparatory_track: 'מסלול המכינה',
    bgu_preparatory_average: 'ממוצע המכינה',
    bgu_preparatory_completed: 'אישור השלמת המכינה',
    psychometric_overall: 'ציון פסיכומטרי כללי',
  };
  if (
    requiredInputs.some((input) => input.startsWith('bgu_')) &&
    requiredInputs.every((input) => bguInputLabels[input])
  )
    return {
      explanation: `לבדיקת ההתאמה חסרים: ${requiredInputs.map((input) => bguInputLabels[input]).join('; ')}.`,
      nextAction: 'השלימו את הסעיפים האלה בנתוני בן־גוריון בפרופיל האקדמי.',
    };
  if (requiredInputs.length === 1 && requiredInputs[0] === 'haifa_information_systems_track')
    return {
      explanation: 'יש לבחור את מסלול מערכות המידע המדויק בחיפה כדי לחשב סיכויי קבלה.',
      nextAction: 'בחרו מסלול בתיבה שמעל התוצאות.',
    };
  if (
    requiredInputs.length === 1 &&
    requiredInputs[0] === 'haifa_information_systems_partner_requirements'
  )
    return {
      explanation: 'במסלול דו־חוגי נדרשת עמידה גם בתנאי הקבלה של החוג השני.',
      nextAction: 'בדקו את תנאי החוג השני וענו על השאלה שמעל התוצאות.',
    };
  if (requiredInputs.some((input) => input.startsWith('haifa_')))
    return {
      explanation: `לבדיקת חיפה חסרים הנתונים הבאים: ${requiredInputs.map((input) => HAIFA_REQUIRED_INPUT_LABELS[input] ?? 'נתון נוסף').join(', ')}.`,
      nextAction:
        'השלימו את הנתונים החסרים בפרופיל האקדמי, בסעיף ״תנאי החוגים באוניברסיטת חיפה״ ובמקצועות הבגרות.',
    };
  if (requiredInputs.some((input) => input.startsWith('bgu_engineering_')))
    return {
      explanation:
        'לסכם הנדסה בבן־גוריון נדרשים מקצועות הבגרות וכל ציוני המכינה או ההנדסאי הרלוונטיים, וגם מצב השלמת הפיזיקה.',
      nextAction: 'השלימו את סעיף ההנדסה בבן־גוריון בפרופיל האקדמי ונסו שוב.',
    };
  if (requiredInputs.some((input) => input.startsWith('bgu_'))) {
    return {
      explanation:
        'לבדיקת האפיק בבן־גוריון נדרשים נתוני הבגרות הרשמית או המכינה, תנאי ההגשה והנתונים המתאימים לאפיק שנבחר.',
      nextAction: 'השלימו את נתוני בן־גוריון בפרופיל האקדמי ונסו שוב.',
    };
  }
  if (requiredInputs.includes('bagrut_average')) {
    return {
      explanation: 'במוסד זה נדרש ממוצע בגרות לחישוב.',
      nextAction: 'הזינו ממוצע בגרות או בדקו אפיק חלופי באתר המוסד.',
    };
  }
  if (requiredInputs.some((input) => input.startsWith('tau_management_'))) {
    return {
      explanation: 'נדרשים פרטי אפיקי הקבלה לניהול באוניברסיטת תל אביב.',
      nextAction: 'השלימו את נתוני הניהול בפרופיל האקדמי ונסו שוב.',
    };
  }
  if (requiredInputs.includes('psychometric_overall')) {
    return {
      explanation: 'כדי לבדוק אפיק זה נדרש ציון פסיכומטרי.',
      nextAction: 'הזינו ציון פסיכומטרי או בדקו אפיק ללא פסיכומטרי באתר התוכנית.',
    };
  }
  if (requiredInputs.some((input) => input.startsWith('technion_architecture_'))) {
    return {
      explanation:
        'לחישוב ארכיטקטורה בטכניון נדרשים הממוצע הרשמי לארכיטקטורה, ציון בחינת הכניסה, תוצאת ״עובר״ הרשמית ואישור שאר תנאי ההגשה.',
      nextAction: 'השלימו את נתוני הארכיטקטורה בטכניון בפרופיל האקדמי ונסו שוב.',
    };
  }
  if (
    requiredInputs.some((input) =>
      [
        'tau_bagrut_average',
        'bgu_bagrut_average',
        'tau_application_requirements',
        'bgu_language_requirements',
        'tau_math_placement_score',
      ].includes(input),
    )
  ) {
    return {
      explanation:
        'לאימות המסלול נדרשים גם הממוצע ממחשבון הבגרות הרשמי של המוסד ואישור תנאי הקבלה.',
      nextAction: 'השלימו את נתוני הקבלה הרשמיים בפרופיל האקדמי ונסו שוב.',
    };
  }
  const needsOnlyPsychometricSubscores =
    requiredInputs.length > 0 &&
    requiredInputs.every((input) =>
      ['psychometric_math', 'psychometric_verbal', 'psychometric_english'].includes(input),
    );

  return needsOnlyPsychometricSubscores
    ? {
        explanation: 'כדי לחשב מסלול זה דרך המקור הרשמי צריך גם תתי-ציונים בפסיכומטרי.',
        nextAction: 'השלימו ציוני כמותי, מילולי ואנגלית כדי לקבל אימות רשמי.',
      }
    : {
        explanation:
          'כדי לחשב את המסלול במוסד זה צריך נתוני מקצועות בגרות שהמחשבון הרשמי משתמש בהם.',
        nextAction: 'השלימו את יחידות וציון המקצועות החסרים כדי לקבל הערכה למסלול.',
      };
}

function tauEngineeringBonusEligibility(
  record: NonNullable<AdmissionsEvaluationInput['extraInputs']>['bagrutSubjectRecord'],
): boolean | undefined {
  if (!record) return undefined;
  const subjectIds = new Set(bagrutExamSubjects(record).map((subject) => subject.subjectId));
  if (!subjectIds.has('mathematics') || !subjectIds.has('physics')) {
    return undefined;
  }

  return evaluateTauEngineeringExactSciencesBonus(record).qualifies;
}

function unsupportedResult(
  institution: CatalogueInstitution,
  entry: AdmissionsCapabilityEntry,
): AdmissionsEvaluationResult {
  if (entry.evidence?.publicBucket === 'tracked_missing_rule') {
    return trackedMissingRuleResult(institution, entry);
  }

  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: entry.capability,
    kind: 'unsupported',
    decision: 'unknown',
    confidence: 'low',
    sourceLabel: 'אין מספיק מידע',
    explanation:
      entry.sourceTarget?.limitations[0] ??
      'אין כרגע מספיק מידע מאומת כדי לחשב תוצאה אמינה למסלול זה.',
    nextAction: entry.sourceTarget?.nextAction ?? 'בדקו ישירות באתר המוסד.',
  };
}

function trackedMissingRuleResult(
  institution: CatalogueInstitution,
  entry: AdmissionsCapabilityEntry,
): AdmissionsEvaluationResult {
  const evidence = entry.evidence;
  const missingData = evidence?.missingData.length ? [...evidence.missingData] : ['official_rule'];
  const officialUrls = evidence?.officialUrls.length ? [...evidence.officialUrls] : [];
  const readableMissing = missingData.join(', ');

  return {
    institution: publicInstitutionShape(institution),
    linkedInstitutionId: institution.id,
    capability: 'tracked_missing_rule',
    kind: 'tracked_missing_rule',
    decision: 'unknown',
    confidence: evidence?.confidence ?? 'medium',
    sourceLabel: 'חסר כלל רשמי ממופה',
    explanation: evidence
      ? `עדיין חסר כלל רשמי כדי לתת החלטת קבלה: ${readableMissing}. מקור העבודה: ${evidence.itemName}.`
      : `עדיין חסר כלל רשמי כדי לתת החלטת קבלה: ${readableMissing}.`,
    nextAction:
      evidence?.nextAction ??
      entry.sourceTarget?.nextAction ??
      'צריך להשלים אימות רשמי לפני שנציג קבלה או דחייה.',
    evidenceItemId: evidence?.itemId,
    evidenceItemName: evidence?.itemName,
    missingData,
    officialUrls,
  };
}

function publicInstitutionShape(
  institution: CatalogueInstitution,
): AdmissionsEvaluationResult['institution'] {
  return {
    id: institution.id,
    name: institution.name,
    region: institution.region,
    domain: institution.domain,
    logoUrl: institution.logoUrl,
    programUrl: institution.programUrl,
    calculatorUrl: institution.calculatorUrl,
    universityId: institution.universityId,
  };
}

function getVerifiedProgramThreshold(
  evidence: MondayAdmissionEvidenceRecord | undefined,
  programId: string,
) {
  return evidence?.verifiedProgramThresholds?.find((entry) => entry.programId === programId);
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
