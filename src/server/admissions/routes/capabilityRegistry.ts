import 'server-only';

import { getFormulaPairVerificationEntry } from '@/data/admissions/formulaBackedVerificationLedger';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { AdmissionsEvaluationCapability } from '@/types/admissionsEvaluation';
import { evaluateProgramVerification } from '@/server/admissions/verification/programVerification';

export type AdmissionRouteCapabilityStatus = 'enabled' | 'disabled' | 'unsupported';
export type AdmissionRouteActionKind =
  'psychometric' | 'improve_grade' | 'expand_units' | 'add_subject';

export interface AdmissionRouteActionCapability {
  programId: string;
  pairId: string;
  status: 'ready' | 'incomplete';
  verificationMode: 'official_finalist_replay' | 'fixture_backed_local_formula';
  supportedActionKinds: AdmissionRouteActionKind[];
  requiredInputs: string[];
  missingCapabilities: string[];
  sourceUrls: string[];
}

export interface AdmissionRouteCapability {
  programId: string;
  pairId?: string;
  status: AdmissionRouteCapabilityStatus;
  evaluatorCapability: AdmissionsEvaluationCapability;
  actionCapabilityStatus: AdmissionRouteActionCapability['status'];
  verificationMode?: 'official_finalist_replay' | 'fixture_backed_local_formula';
  supportedActionKinds: AdmissionRouteActionKind[];
  requiredInputs: string[];
  missingCapabilities: string[];
  sourceUrls: string[];
}

const ROUTE_ACTION_CAPABILITIES: Record<string, AdmissionRouteActionCapability> = {
  tau_cs: {
    programId: 'tau_cs',
    pairId: 'tau_cs__tau',
    status: 'ready',
    verificationMode: 'official_finalist_replay',
    supportedActionKinds: ['psychometric'],
    requiredInputs: ['psychometric', 'tau_bagrut_average', 'structured_bagrut_subjects'],
    missingCapabilities: ['academic_action_bagrut_recomputation'],
    sourceUrls: ['https://go.tau.ac.il/graphql', 'https://go.tau.ac.il/he/exact/ba/computer'],
  },
  bgu_cs: {
    programId: 'bgu_cs',
    pairId: 'bgu_cs__bgu',
    status: 'ready',
    verificationMode: 'official_finalist_replay',
    supportedActionKinds: ['psychometric', 'improve_grade', 'expand_units', 'add_subject'],
    requiredInputs: [
      'psychometric',
      'psychometric_component_scores',
      'bgu_bagrut_average',
      'structured_bagrut_subjects',
      'language_classifications',
    ],
    missingCapabilities: [],
    sourceUrls: [
      'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=4',
      'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1',
    ],
  },
};

export function getAdmissionRouteCapability(programId: string): AdmissionRouteCapability {
  const actionCapability = ROUTE_ACTION_CAPABILITIES[programId];
  if (!actionCapability) {
    return {
      programId,
      status: 'unsupported',
      evaluatorCapability: 'unsupported',
      actionCapabilityStatus: 'incomplete',
      supportedActionKinds: [],
      requiredInputs: [],
      missingCapabilities: ['reviewed_route_capability'],
      sourceUrls: [],
    };
  }

  const evaluator = resolveEvaluatorCapability(actionCapability.pairId);
  return composeAdmissionRouteCapability({
    actionCapability,
    evaluatorCapability: evaluator.capability,
    evaluatorSourceUrl: evaluator.sourceUrl,
  });
}

export function listAdmissionRouteCapabilities() {
  return Object.keys(ROUTE_ACTION_CAPABILITIES).map(getAdmissionRouteCapability);
}

export function composeAdmissionRouteCapability(args: {
  actionCapability: AdmissionRouteActionCapability;
  evaluatorCapability: AdmissionsEvaluationCapability;
  evaluatorSourceUrl?: string;
}): AdmissionRouteCapability {
  const { actionCapability, evaluatorCapability, evaluatorSourceUrl } = args;
  const hasSupportedActions = actionCapability.supportedActionKinds.length > 0;
  const actionModelReady = actionCapability.status === 'ready' && hasSupportedActions;
  const evaluatorReady = evaluatorCapability === 'exact';
  const missingCapabilities = new Set(actionCapability.missingCapabilities);

  if (!evaluatorReady) {
    missingCapabilities.add('exact_evaluator');
  }
  if (!actionModelReady) {
    missingCapabilities.add('reviewed_route_action_model');
  }

  return {
    programId: actionCapability.programId,
    pairId: actionCapability.pairId,
    status: evaluatorReady && actionModelReady ? 'enabled' : 'disabled',
    evaluatorCapability,
    actionCapabilityStatus: actionCapability.status,
    verificationMode: actionCapability.verificationMode,
    supportedActionKinds: actionCapability.supportedActionKinds,
    requiredInputs: actionCapability.requiredInputs,
    missingCapabilities: [...missingCapabilities],
    sourceUrls: [
      ...new Set(
        evaluatorSourceUrl
          ? [evaluatorSourceUrl, ...actionCapability.sourceUrls]
          : actionCapability.sourceUrls,
      ),
    ],
  };
}

function resolveEvaluatorCapability(pairId: string): {
  capability: AdmissionsEvaluationCapability;
  sourceUrl?: string;
} {
  const pairVerification = getFormulaPairVerificationEntry(pairId);
  if (!pairVerification) {
    return { capability: 'missing' };
  }

  if (pairVerification.state !== 'exact') {
    return {
      capability:
        pairVerification.state === 'blocked'
          ? 'blocked'
          : pairVerification.state === 'stale'
            ? 'stale'
            : 'missing',
      sourceUrl: pairVerification.sourceUrl,
    };
  }

  const artifact = getProgramVerificationArtifact(pairId);
  if (!artifact) {
    return { capability: 'authority_unavailable', sourceUrl: pairVerification.sourceUrl };
  }

  return {
    capability: evaluateProgramVerification({
      contract: artifact.contract,
      fixtures: artifact.fixtures,
      currentAdmissionCycle: pairVerification.admissionCycle,
      currentSourceFingerprint: pairVerification.liveProof.sourceFingerprint,
    }).capability,
    sourceUrl: pairVerification.sourceUrl,
  };
}
