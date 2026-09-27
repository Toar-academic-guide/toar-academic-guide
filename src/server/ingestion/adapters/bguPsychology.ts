import type { AdmissionsAdapterContext, AdmissionsSourceProof } from '../admissionsSourceAdapters';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import {
  readOfficialResponseMetadata,
  sourceClassForCapability,
} from '../admissionsSourceAdapters';
import {
  BGU_GENERAL_CALCULATOR_URL,
  BGU_GENERAL_SCORE_URL,
  BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID,
  BGU_PSYCHOLOGY_SOURCE_FINGERPRINT,
  BGU_PSYCHOLOGY_SOURCE_URL,
  fingerprintBguPsychologyRule,
  normalizeBguPsychologyRule,
} from '@/data/admissions/bguPsychologyVerification';
import { resolveBguPsychologyAdmission } from '@/server/admissions/bguPsychologyPolicy';

export async function runBguPsychologyProof(
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
    officialUrl: BGU_PSYCHOLOGY_SOURCE_URL,
    adapterId: 'bgu' as const,
    rawResponseMetadata: metadata,
  };
  try {
    if (
      program.searchText !== BGU_PSYCHOLOGY_SOURCE_URL ||
      program.externalId !== BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID ||
      program.pairId !== `${program.id}__bgu`
    )
      throw new Error('Psychology mapping does not match the reviewed main campus.');
    const fetcher = context.fetcher ?? fetch;
    const response = await fetcher(BGU_PSYCHOLOGY_SOURCE_URL);
    metadata.push(readOfficialResponseMetadata(BGU_PSYCHOLOGY_SOURCE_URL, response));
    if (!response.ok) throw new Error(`Psychology conditions HTTP ${response.status}`);
    const rule = normalizeBguPsychologyRule(await response.json());
    if (!rule)
      throw new Error('Psychology source returned missing, duplicate or wrong-campus rules.');
    const fingerprint = fingerprintBguPsychologyRule(rule);
    if (fingerprint !== BGU_PSYCHOLOGY_SOURCE_FINGERPRINT)
      return {
        ...base,
        capability: 'blocked',
        proofLevel: 'partial_official',
        status: 'partial',
        sourceClass: 'browser_required',
        reproducedFields: ['sourceFingerprint'],
        normalizedPayload: { sourceFingerprint: fingerprint },
        limitations: ['Critical Psychology rules changed.'],
        nextAction: 'Review changed programme conditions before exact decisions resume.',
      };
    const input = {
      degreeId: program.id,
      psychometric: context.applicant.psychometric,
      bagrut: context.applicant.bagrutAverage,
      extraInputs: context.applicant.extraInputs,
    };
    let admission = resolveBguPsychologyAdmission(input);
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
      if (!scoreResponse.ok) throw new Error(`Psychology score HTTP ${scoreResponse.status}`);
      const html = await scoreResponse.text();
      const matches = [
        ...html.matchAll(/mainForm\.on_final_sekem\.value\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?\s*;/g),
      ];
      if (matches.length !== 1)
        throw new Error('Psychology calculator returned no unique numeric score.');
      admission = resolveBguPsychologyAdmission(input, Number(matches[0][1]));
    }
    if (admission.kind === 'needs_input' || admission.kind === 'score')
      throw new Error('Psychology requires route-specific applicant inputs.');
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
        officialProgramId: BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID,
        sourceFingerprint: fingerprint,
        reviewedSourceFingerprint: fingerprint,
        selectedScore: admission.score,
        acceptanceThreshold: admission.threshold,
        rejectionThreshold: admission.threshold,
        derivedVerdict: admission.kind === 'eligible' ? 'eligible_to_apply' : 'below',
        route: admission.route,
        reason: admission.reason,
        waitingList: true,
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
      },
      limitations: [],
      nextAction:
        'Check current waiting-list availability and complete the institution application.',
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
      nextAction: 'Resolve the official Psychology mapping, source or applicant input issue.',
    };
  }
}
