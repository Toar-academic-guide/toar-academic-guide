import type { AdmissionsAdapterContext, AdmissionsSourceProof } from '../admissionsSourceAdapters';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import {
  readOfficialResponseMetadata,
  sourceClassForCapability,
} from '../admissionsSourceAdapters';
import {
  BGU_GENERAL_CALCULATOR_URL,
  BGU_GENERAL_SCORE_URL,
} from '@/data/admissions/bguPsychologyVerification';
import {
  BGU_HEALTH_CONFIG,
  BGU_HEALTH_FINGERPRINTS,
  fingerprintBguHealthRule,
  normalizeBguHealthRule,
} from '@/data/admissions/bguHealthVerification';
import { isBguHealthProgram } from '@/lib/bguHealthInputs';
import { resolveBguHealthAdmission } from '@/server/admissions/bguHealthPolicy';

export async function runBguHealthProof(
  context: Omit<AdmissionsAdapterContext, 'applicant'> & {
    applicant: {
      psychometric?: number;
      bagrutAverage?: number;
      extraInputs?: AdmissionsExtraInputs;
    };
  },
): Promise<AdmissionsSourceProof> {
  const program = context.program!;
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const base = {
    id: program.targetId ?? `bgu-${program.id}-live`,
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: program.searchText ?? '',
    adapterId: 'bgu' as const,
    rawResponseMetadata: metadata,
  };
  try {
    if (!isBguHealthProgram(program.id)) throw new Error('Unreviewed BGU health programme');
    const config = BGU_HEALTH_CONFIG[program.id];
    if (
      program.searchText !== config.url ||
      program.externalId !== config.officialProgramId ||
      program.pairId !== `${program.id}__bgu`
    )
      throw new Error('BGU health mapping does not match the reviewed main campus.');
    const fetcher = context.fetcher ?? fetch;
    const response = await fetcher(config.url);
    metadata.push(readOfficialResponseMetadata(config.url, response));
    if (!response.ok) throw new Error(`BGU health conditions HTTP ${response.status}`);
    const rule = normalizeBguHealthRule(await response.json(), program.id);
    if (!rule) throw new Error('Missing, duplicate or wrong-campus BGU health rules');
    const fingerprint = fingerprintBguHealthRule(rule);
    if (fingerprint !== BGU_HEALTH_FINGERPRINTS[program.id])
      return {
        ...base,
        capability: 'blocked',
        proofLevel: 'partial_official',
        status: 'partial',
        sourceClass: 'browser_required',
        reproducedFields: ['sourceFingerprint'],
        normalizedPayload: { sourceFingerprint: fingerprint },
        limitations: ['Critical BGU health rules changed.'],
        nextAction: 'Review changed programme conditions before exact decisions resume.',
      };
    const input = {
      degreeId: program.id,
      psychometric: context.applicant.psychometric,
      bagrut: context.applicant.bagrutAverage,
      extraInputs: context.applicant.extraInputs,
    };
    let admission = resolveBguHealthAdmission(input);
    if (admission.kind === 'score') {
      const params = new URLSearchParams({
        rn_include_mitsraf: '0',
        rn_year: '2027',
        on_bagrut_average: admission.average.toFixed(2),
        on_psychometry: String(admission.psychometric),
        on_final_sekem: '',
      });
      const scoreResponse = await fetcher(BGU_GENERAL_SCORE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: BGU_GENERAL_CALCULATOR_URL,
        },
        body: params.toString(),
      });
      metadata.push(readOfficialResponseMetadata(BGU_GENERAL_SCORE_URL, scoreResponse));
      if (!scoreResponse.ok) throw new Error(`BGU health score HTTP ${scoreResponse.status}`);
      const matches = [
        ...(await scoreResponse.text()).matchAll(
          /mainForm\.on_final_sekem\.value\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?\s*;/g,
        ),
      ];
      if (matches.length !== 1)
        throw new Error('BGU health calculator returned no unique numeric score.');
      admission = resolveBguHealthAdmission(input, Number(matches[0][1]));
    }
    if (admission.kind === 'needs_input' || admission.kind === 'score')
      throw new Error('BGU health requires route-specific applicant inputs.');
    return {
      ...base,
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      sourceClass: sourceClassForCapability('decision_capable'),
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: fingerprint,
      reproducedFields: [
        'selectedScore',
        'acceptanceThreshold',
        'derivedVerdict',
        'sourceFingerprint',
      ],
      normalizedPayload: {
        pairId: program.pairId,
        programId: program.id,
        officialProgramId: config.officialProgramId,
        sourceFingerprint: fingerprint,
        reviewedSourceFingerprint: fingerprint,
        selectedScore: admission.score,
        acceptanceThreshold: admission.threshold,
        rejectionThreshold: admission.threshold,
        derivedVerdict: admission.kind === 'eligible' ? 'eligible_to_apply' : 'below',
        route: admission.route,
        reason: admission.reason,
        registrationClosed: true,
        admissionStage:
          admission.route === 'academic' ? 'department_review' : 'interview_consideration',
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
      },
      limitations: [
        'Eligibility for the published preliminary stage; interview selection and final admission are institutional decisions. Registration currently closed.',
      ],
      nextAction:
        'Check registration status and interview/department-review instructions with the institution.',
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      capability: 'blocked',
      proofLevel: 'blocked',
      status: 'failed',
      sourceClass: 'browser_required',
      reproducedFields: [],
      normalizedPayload: {},
      limitations: [reason],
      blockedReason: reason,
      errorReason: reason,
      nextAction: 'Resolve the official BGU health mapping, source or applicant input issue.',
    };
  }
}
