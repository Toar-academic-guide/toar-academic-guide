import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import {
  bguQuantitativeProgramme,
  resolveBguQuantitativeRoute,
} from '@/server/admissions/bguQuantitativeRoutesPolicy';
import {
  BGU_QUANTITATIVE_METADATA_BY_PAIR_ID,
  BGU_QUANTITATIVE_ROUTES_CALCULATOR_URL,
  BGU_QUANTITATIVE_ROUTES_SCORE_URL,
  fingerprintBguQuantitativeRouteRule,
  normalizeBguQuantitativeRouteRule,
} from '@/data/admissions/bguQuantitativeRoutesVerification';
import {
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsProgramInput,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

export async function runBguQuantitativeRoutesProof(context: {
  program: AdmissionsProgramInput;
  applicant: { psychometric?: number; bagrutAverage?: number; extraInputs?: AdmissionsExtraInputs };
  fetcher?: typeof fetch;
}): Promise<AdmissionsSourceProof> {
  const { program, applicant } = context;
  const config = bguQuantitativeProgramme(program.id);
  const artifact = BGU_QUANTITATIVE_METADATA_BY_PAIR_ID[`${program.id}__bgu`];
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const base = {
    id: program.targetId ?? `bgu-${program.id}-live`,
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: config?.sourceUrl ?? '',
    adapterId: 'bgu' as const,
    rawResponseMetadata: metadata,
  };
  const blocked = (reason: string): AdmissionsSourceProof => ({
    ...base,
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'blocked',
    sourceClass: sourceClassForCapability('blocked'),
    reproducedFields: [],
    normalizedPayload: { pairId: program.pairId, proofStatus: 'blocked', reason },
    limitations: [reason],
    nextAction: 'Complete the published route inputs or verify the official programme mapping.',
  });
  const resolution = resolveBguQuantitativeRoute(program.id, applicant);
  if (
    !config ||
    !artifact ||
    program.pairId !== `${program.id}__bgu` ||
    program.externalId !== config.officialProgramId ||
    program.searchText !== config.sourceUrl
  )
    return blocked('The BGU quantitative programme mapping does not match the reviewed contract.');
  if (resolution.kind === 'needs_input' || resolution.kind === 'below')
    return blocked(
      resolution.kind === 'below'
        ? resolution.reason
        : `Missing route inputs: ${resolution.requiredInputs.join(', ')}.`,
    );
  try {
    const fetcher = context.fetcher ?? fetch;
    const response = await fetcher(config.sourceUrl);
    metadata.push(readOfficialResponseMetadata(config.sourceUrl, response));
    if (!response.ok) throw new Error(`BGU programme response HTTP ${response.status}`);
    const rule = normalizeBguQuantitativeRouteRule(await response.json(), config);
    if (!rule) throw new Error('BGU programme response does not contain one complete mapped rule.');
    const fingerprint = fingerprintBguQuantitativeRouteRule(rule);
    if (fingerprint !== artifact.contract.sourceFingerprint)
      return {
        ...base,
        capability: 'score_only',
        proofLevel: 'partial_official',
        status: 'partial',
        sourceClass: sourceClassForCapability('score_only'),
        reproducedFields: ['sourceFingerprint'],
        normalizedPayload: {
          proofStatus: 'partial',
          sourceFingerprint: fingerprint,
          reason: 'Current programme conditions changed; review is required.',
        },
        limitations: ['Current programme conditions changed; review is required.'],
        nextAction: 'Review the changed conditions before resuming exact decisions.',
      };
    let score: number;
    if (resolution.kind === 'direct') score = resolution.score;
    else {
      const scoreResponse = await fetcher(BGU_QUANTITATIVE_ROUTES_SCORE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: BGU_QUANTITATIVE_ROUTES_CALCULATOR_URL,
        },
        body: resolution.fields.toString(),
      });
      metadata.push(readOfficialResponseMetadata(BGU_QUANTITATIVE_ROUTES_SCORE_URL, scoreResponse));
      if (!scoreResponse.ok)
        throw new Error(`BGU quantitative calculator HTTP ${scoreResponse.status}`);
      const matches = [
        ...(await scoreResponse.text()).matchAll(
          /on_c_val["']\)\.innerHTML\s*=\s*["']?(\d+(?:\.\d+)?)/g,
        ),
      ];
      if (matches.length !== 1)
        throw new Error('BGU quantitative calculator did not return one on_c_val result.');
      score = Number(matches[0][1]);
      if (!Number.isFinite(score)) throw new Error('BGU returned an invalid quantitative score.');
    }
    const derivedVerdict = score >= resolution.threshold ? 'eligible_to_apply' : 'below';
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
        'routeConditions',
      ],
      normalizedPayload: {
        pairId: program.pairId,
        programId: program.id,
        officialProgramId: config.officialProgramId,
        source: 'bgu_quantitative_routes',
        selectedScore: score,
        acceptanceThreshold: resolution.threshold,
        rejectionThreshold: resolution.threshold,
        derivedVerdict,
        route: resolution.kind === 'direct' ? resolution.route : 'quantitative',
        priorAcademicReview: resolution.priorAcademicReview,
        mathematicsCourseRequired: resolution.mathematicsCourseRequired,
        waitingList: rule.comments.includes('מכסת המתקבלים') && rule.comments.includes('מלאה'),
        sourceFingerprint: fingerprint,
        reviewedSourceFingerprint: fingerprint,
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
      },
      limitations: [
        'Published route eligibility does not guarantee an available place or final institutional approval.',
      ],
      nextAction:
        'Follow the current registration, mathematics-course and academic-review conditions.',
    };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : 'BGU quantitative replay failed.');
  }
}
