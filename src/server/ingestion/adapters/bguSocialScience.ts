import type { AdmissionsAdapterContext, AdmissionsSourceProof } from '../admissionsSourceAdapters';
import {
  readOfficialResponseMetadata,
  sourceClassForCapability,
} from '../admissionsSourceAdapters';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import {
  bguSocialScienceSource,
  normalizeBguSocialScienceRule,
  fingerprintBguSocialScienceRule,
  BGU_SOCIAL_SCIENCE_METADATA_BY_PAIR_ID,
  BGU_SOCIAL_SCIENCE_SCORE_URL,
  BGU_SOCIAL_SCIENCE_CALCULATOR_URL,
} from '@/data/admissions/bguSocialScienceVerification';
import { resolveBguSocialScienceAdmission } from '@/server/admissions/bguSocialSciencePolicy';

export async function runBguSocialScienceProof(
  context: Omit<AdmissionsAdapterContext, 'applicant'> & {
    applicant: {
      psychometric?: number;
      bagrutAverage?: number;
      extraInputs?: AdmissionsExtraInputs;
    };
  },
): Promise<AdmissionsSourceProof> {
  const program = context.program!;
  const { source, rule, officialProgramId } = bguSocialScienceSource(program.id);
  const artifact = BGU_SOCIAL_SCIENCE_METADATA_BY_PAIR_ID[`${program.id}__bgu`];
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const base = {
    id: program.targetId ?? `bgu-${program.id}-live`,
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: source.url,
    adapterId: 'bgu' as const,
    rawResponseMetadata: metadata,
  };
  try {
    if (
      program.searchText !== source.url ||
      program.externalId !== officialProgramId ||
      program.pairId !== `${program.id}__bgu`
    )
      throw new Error('Social science target differs from its reviewed main-campus mapping');
    const fetcher = context.fetcher ?? fetch;
    const response = await fetcher(source.url);
    metadata.push(readOfficialResponseMetadata(source.url, response));
    if (!response.ok) throw new Error(`Social science source HTTP ${response.status}`);
    const normalized = normalizeBguSocialScienceRule(program.id, await response.json());
    if (!normalized) throw new Error('Missing, duplicate or wrong social science programme source');
    const fingerprint = fingerprintBguSocialScienceRule(normalized);
    if (fingerprint !== artifact.contract.sourceFingerprint)
      return {
        ...base,
        capability: 'blocked',
        proofLevel: 'partial_official',
        status: 'partial',
        sourceClass: 'browser_required',
        reproducedFields: ['sourceFingerprint'],
        normalizedPayload: { sourceFingerprint: fingerprint },
        limitations: ['Critical programme rules changed'],
        nextAction: 'Review changed programme conditions before exact eligibility resumes.',
      };
    const input = {
      degreeId: program.id,
      psychometric: context.applicant.psychometric,
      extraInputs: context.applicant.extraInputs,
    };
    let admission = resolveBguSocialScienceAdmission(input);
    if (admission.kind === 'score') {
      const params = new URLSearchParams({
        rn_include_mitsraf: '0',
        rn_year: '2027',
        on_bagrut_average: admission.average.toFixed(2),
        on_psychometry: String(admission.psychometric),
        on_final_sekem: '',
      });
      const calculated = await fetcher(BGU_SOCIAL_SCIENCE_SCORE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: BGU_SOCIAL_SCIENCE_CALCULATOR_URL,
        },
        body: params.toString(),
      });
      metadata.push(readOfficialResponseMetadata(BGU_SOCIAL_SCIENCE_SCORE_URL, calculated));
      if (!calculated.ok) throw new Error(`Social science score HTTP ${calculated.status}`);
      const html = await calculated.text();
      const matches = [
        ...html.matchAll(/mainForm\.on_final_sekem\.value\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?\s*;/g),
      ];
      if (matches.length !== 1)
        throw new Error('Official calculator returned no unique numeric score');
      const score = Number(matches[0][1]);
      if (!Number.isFinite(score))
        throw new Error('Official calculator returned a non-finite score');
      admission = resolveBguSocialScienceAdmission(input, score);
    }
    if (admission.kind === 'needs_input' || admission.kind === 'score')
      throw new Error('Route-specific applicant inputs are missing');
    if (admission.kind === 'manual_gate')
      return {
        ...base,
        capability: 'blocked',
        proofLevel: 'partial_official',
        status: 'partial',
        sourceClass: 'browser_required',
        reproducedFields: ['sourceFingerprint'],
        normalizedPayload: {
          sourceFingerprint: fingerprint,
          reason: admission.reason,
          manualReviewRequired: true,
        },
        limitations: [admission.reason],
        nextAction:
          'Obtain the departmental decision; numeric thresholds do not replace committee review.',
      };
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
        officialProgramId,
        sourceFingerprint: fingerprint,
        reviewedSourceFingerprint: fingerprint,
        selectedScore: admission.score,
        acceptanceThreshold: admission.threshold,
        rejectionThreshold: admission.threshold,
        derivedVerdict: admission.kind === 'eligible' ? 'eligible_to_apply' : 'below',
        route: admission.route,
        reason: admission.reason,
        waitingList: rule.waitingList,
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
      },
      limitations: [],
      nextAction: rule.waitingList
        ? 'Check waiting-list availability and finish the application.'
        : 'Complete the institution application; eligibility is not final acceptance.',
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
      nextAction: 'Resolve the official programme mapping, source or applicant input issue.',
    };
  }
}
