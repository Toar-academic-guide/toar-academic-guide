import { createHash } from 'node:crypto';
import {
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsSourceProof,
  type AdmissionsAdapterContext,
} from '../admissionsSourceAdapters';
import {
  BGU_ENGINEERING_METADATA_BY_PAIR_ID,
  fingerprintBguEngineeringRules,
  normalizeBguEngineeringRule,
  normalizeBguEngineeringForm,
} from '@/data/admissions/bguEngineeringVerification';
import {
  BGU_ENGINEERING_PROGRAMS,
  BGU_ENGINEERING_SCORE_URL,
  BGU_ENGINEERING_CALCULATOR_URL,
  BGU_ENGINEERING_GUIDE_URL,
  isBguEngineeringProgram,
  resolveBguEngineeringInputs,
} from '@/server/admissions/bguEngineeringPolicy';

type BguEngineeringAdapterContext = Omit<AdmissionsAdapterContext, 'applicant'> & {
  applicant: Omit<AdmissionsAdapterContext['applicant'], 'psychometric' | 'bagrutAverage'> & {
    psychometric?: number;
    bagrutAverage?: number;
  };
};

export async function runBguEngineeringAdmissionsProof(
  context: BguEngineeringAdapterContext,
): Promise<AdmissionsSourceProof> {
  const program = context.program;
  if (!program || !isBguEngineeringProgram(program.id))
    throw new Error('Missing BGU engineering programme');
  const artifact = BGU_ENGINEERING_METADATA_BY_PAIR_ID[`${program.id}__bgu`];
  const { contract } = artifact;
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const base = {
    id: program.targetId ?? contract.source.targetId,
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: contract.source.url,
    adapterId: 'bgu' as const,
  };
  const failure = (reason: string): AdmissionsSourceProof => ({
    ...base,
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'failed',
    sourceClass: 'browser_required',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: [reason],
    errorReason: reason,
    blockedReason: reason,
    nextAction: 'Resolve the engineering input or official-source issue and repeat verification.',
    rawResponseMetadata: metadata,
  });
  const inputs = resolveBguEngineeringInputs(program.id, {
    degreeId: program.id,
    psychometric: context.applicant.psychometric,
    bagrut: context.applicant.bagrutAverage,
    extraInputs: context.applicant.extraInputs,
  });
  if (inputs.kind === 'needs_input' || inputs.kind === 'below')
    return failure(
      inputs.kind === 'below'
        ? inputs.reason
        : `Missing engineering inputs: ${inputs.requiredInputs.join(', ')}`,
    );
  if (
    program.pairId !== contract.pairId ||
    program.searchText !== contract.source.url ||
    program.externalId !== contract.officialProgramId
  )
    return failure(
      'The engineering programme mapping differs from the reviewed department and route.',
    );
  try {
    const fetcher = context.fetcher ?? fetch;
    const sourceResponse = await fetcher(contract.source.url);
    metadata.push(readOfficialResponseMetadata(contract.source.url, sourceResponse));
    if (!sourceResponse.ok) throw new Error(`BGU programme HTTP ${sourceResponse.status}`);
    const rule = normalizeBguEngineeringRule(
      await sourceResponse.json(),
      BGU_ENGINEERING_PROGRAMS[program.id].department,
    );
    if (!rule) throw new Error('Missing or ambiguous BGU engineering programme rule.');
    const [formResponse, guideResponse] = await Promise.all([
      fetcher(BGU_ENGINEERING_CALCULATOR_URL),
      fetcher(BGU_ENGINEERING_GUIDE_URL),
    ]);
    metadata.push(
      readOfficialResponseMetadata(BGU_ENGINEERING_CALCULATOR_URL, formResponse),
      readOfficialResponseMetadata(BGU_ENGINEERING_GUIDE_URL, guideResponse),
    );
    if (!formResponse.ok || !guideResponse.ok)
      throw new Error('The current engineering form or official guide is unavailable.');
    const form = normalizeBguEngineeringForm(
      new TextDecoder('windows-1255').decode(await formResponse.arrayBuffer()),
    );
    if (!form)
      throw new Error(
        'The current engineering form has an unreviewed action, cycle or input schema.',
      );
    const guideBytes = new Uint8Array(await guideResponse.arrayBuffer());
    const guideFingerprint = createHash('sha256').update(guideBytes).digest('hex');
    const sourceFingerprint = fingerprintBguEngineeringRules(rule, form, guideFingerprint);
    if (sourceFingerprint !== contract.sourceFingerprint)
      return {
        ...base,
        capability: 'score_only',
        proofLevel: 'partial_official',
        status: 'partial',
        sourceClass: 'api_static_json',
        reviewedSourceFingerprint: contract.sourceFingerprint,
        reproducedFields: ['sourceFingerprint', 'acceptanceThreshold'],
        normalizedPayload: {
          pairId: contract.pairId,
          acceptanceThreshold: rule.acceptanceThreshold,
          sourceFingerprint,
          reviewedSourceFingerprint: contract.sourceFingerprint,
          proofStatus: 'partial',
          proofLevel: 'partial_official',
          decisionProvenance: 'none',
        },
        limitations: ['Engineering programme rules, calculator schema or guide changed.'],
        nextAction: 'Review the changed official source before resuming exact engineering results.',
        rawResponseMetadata: metadata,
      };
    let selectedScore: number;
    let acceptanceThreshold: number;
    let derivedVerdict: 'eligible_to_apply' | 'below';
    if (inputs.kind === 'direct') {
      selectedScore = inputs.average;
      acceptanceThreshold = inputs.threshold;
      derivedVerdict = 'eligible_to_apply';
    } else {
      const scoreResponse = await fetcher(BGU_ENGINEERING_SCORE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: BGU_ENGINEERING_CALCULATOR_URL,
        },
        body: inputs.parameters.toString(),
      });
      metadata.push(readOfficialResponseMetadata(BGU_ENGINEERING_SCORE_URL, scoreResponse));
      if (!scoreResponse.ok)
        throw new Error(`BGU engineering calculator HTTP ${scoreResponse.status}`);
      const html = await scoreResponse.text();
      const values = Array.from(
        html.matchAll(
          /getElementById\(\s*(["'])on_c_val\1\s*\)\s*\.innerHTML\s*=\s*(["']?)(\d+(?:\.\d+)?)\2\s*;/g,
        ),
      );
      if (values.length !== 1 || !Number.isFinite(Number(values[0][3])))
        throw new Error('Missing or ambiguous engineering score.');
      selectedScore = Number(values[0][3]);
      acceptanceThreshold = rule.acceptanceThreshold;
      derivedVerdict = selectedScore >= acceptanceThreshold ? 'eligible_to_apply' : 'below';
    }
    return {
      ...base,
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: contract.sourceFingerprint,
      sourceClass: sourceClassForCapability('decision_capable'),
      reproducedFields: [
        'selectedScore',
        'acceptanceThreshold',
        'derivedVerdict',
        'sourceFingerprint',
      ],
      normalizedPayload: {
        pairId: contract.pairId,
        programId: program.id,
        officialProgramId: contract.officialProgramId,
        selectedScore,
        acceptanceThreshold,
        rejectionThreshold: acceptanceThreshold,
        derivedVerdict,
        sourceFingerprint,
        reviewedSourceFingerprint: contract.sourceFingerprint,
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
        engineeringRoute: inputs.kind === 'direct' ? inputs.basis : 'engineering_score',
        physicsConditionOutstanding: inputs.kind === 'score' && inputs.physicsConditionOutstanding,
        waitingList: [361, 362].includes(rule.mapping.department),
      },
      limitations: [
        'Eligibility remains subject to the published physics-course condition, available places and final university approval.',
      ],
      nextAction: 'Confirm the current registration and physics-course requirements with BGU.',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}
