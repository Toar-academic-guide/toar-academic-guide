import 'server-only';

import { evaluateTauEngineeringExactSciencesBonus } from '@/server/admissions/bagrutPolicies';
import {
  verifyTauComputerScienceFinalists,
  type TauFinalist,
  type TauFinalistVerification,
} from '@/server/admissions/routes/tauFinalistVerifier';
import { TAU_ENGINEERING_EXACT_SCIENCES_POLICY } from '@/server/admissions/bagrutPolicies';

import type {
  AdmissionAlertBaselineEvaluator,
  AdmissionAlertBaselineProfile,
} from './subscriptionService';

const BASELINE_ID = 'alert-baseline';

export async function evaluateTauComputerScienceAlertBaseline(input: {
  institutionId: string;
  programId: string;
  profile: AdmissionAlertBaselineProfile;
  verifyFinalists?: (finalists: TauFinalist[]) => Promise<TauFinalistVerification[]>;
}): ReturnType<AdmissionAlertBaselineEvaluator> {
  if (input.institutionId !== 'tau' || input.programId !== 'tau_cs') {
    return {
      decision: 'unavailable',
      ruleVersion: `${TAU_ENGINEERING_EXACT_SCIENCES_POLICY.version}:unsupported_target`,
    };
  }

  const verifyFinalists =
    input.verifyFinalists ??
    ((finalists: TauFinalist[]) => verifyTauComputerScienceFinalists({ finalists }));
  const [verification] = await verifyFinalists([
    {
      id: BASELINE_ID,
      psychometric: input.profile.psychometric,
      bagrutAverage: input.profile.bagrutAverage,
      hasQualifiedMathAndPhysics: evaluateTauEngineeringExactSciencesBonus({
        subjects: input.profile.subjects,
      }).qualifies,
    },
  ]);

  if (
    !verification ||
    verification.status !== 'verified' ||
    verification.eligible === undefined ||
    verification.cutoff === undefined
  ) {
    return {
      decision: 'unavailable',
      ruleVersion: `${TAU_ENGINEERING_EXACT_SCIENCES_POLICY.version}:tau_cs_unavailable`,
    };
  }

  return {
    decision: verification.eligible ? 'eligible' : 'below',
    ruleVersion: `${TAU_ENGINEERING_EXACT_SCIENCES_POLICY.version}:tau_cs_cutoff:${verification.cutoff}`,
  };
}
