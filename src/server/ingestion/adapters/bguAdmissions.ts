import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';
import { BGU_SCORE_URL, getBguProgramConfig } from '@/data/admissions/bguProgramVerification';

const BGU_INDEX_URL = 'https://bgu4u.bgu.ac.il/html/average_calc/index.php';
const BGU_SUBMIT_URL = 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem';

export async function runBguAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program;
  if (!program) {
    throw new Error('BGU adapter requires a program context');
  }
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];

  try {
    const sourceUrl = program.searchText;
    if (!sourceUrl) throw new Error('BGU target is missing its official acceptance-conditions URL');

    const sourceResponse = await fetcher(sourceUrl);
    metadata.push(readOfficialResponseMetadata(sourceUrl, sourceResponse));
    if (!sourceResponse.ok)
      throw new Error(`BGU conditions endpoint returned HTTP ${sourceResponse.status}`);
    const sourcePayload = (await sourceResponse.json()) as {
      items?: Array<Record<string, unknown>>;
    };
    const sourceItem = sourcePayload.items?.[0];
    if (!sourceItem) throw new Error('BGU conditions endpoint returned no programme rule');

    const config = getBguProgramConfig(program.id);
    const acceptanceThreshold =
      parseOfficialNumeric(sourceItem.psycho_sekem) ??
      parseOfficialNumeric(sourceItem.psycho_value) ??
      thresholdFromComments(sourceItem.comments);
    if (acceptanceThreshold === undefined) {
      throw new Error('BGU conditions endpoint returned no numeric threshold');
    }

    const params = new URLSearchParams({
      rn_include_mitsraf: '0',
      rn_year: '2027',
      on_bagrut_average: context.applicant.bagrutAverage.toFixed(2),
      on_psychometry: String(context.applicant.psychometric),
      on_final_sekem: '',
    });

    const response = await fetcher(BGU_SCORE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: BGU_INDEX_URL,
      },
      body: params.toString(),
    });

    metadata.push(readOfficialResponseMetadata(BGU_SCORE_URL, response));

    if (!response.ok) {
      throw new Error(`BGU endpoint returned HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse BGU weighted score. Check the specific ID script pattern first to avoid false matches.
    const valueMatch =
      html.match(/(?:on_final_sekem|on_final_sekem\)\.value)\.value\s*=\s*['"]?([^'";\s<]+)/i) ||
      html.match(/on_final_sekem\.value\s*=\s*['"]([^'"]+)['"]/i) ||
      html.match(/value\s*=\s*'([^']+)'/i) ||
      html.match(/value\s*=\s*"([^"]+)"/i);

    const scoreVal = valueMatch ? valueMatch[1] : null;
    const weightedScore = scoreVal ? parseOfficialNumeric(scoreVal) : undefined;

    if (weightedScore === undefined) {
      throw new Error('Failed to parse weighted score from BGU response HTML');
    }

    const derivedVerdict = weightedScore >= acceptanceThreshold ? config.verdict : 'below';

    return {
      id: program.targetId ?? `bgu-${program.id}-live`,
      institutionId: 'bgu',
      institutionName: 'Ben-Gurion University',
      officialUrl: sourceUrl,
      adapterId: 'bgu',
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      sourceClass: sourceClassForCapability('decision_capable'),
      reproducedFields: [
        'selectedScore',
        'acceptanceThreshold',
        'rejectionThreshold',
        'derivedVerdict',
      ],
      normalizedPayload: {
        pairId: program.pairId,
        programId: program.id,
        programName: program.name,
        source: 'bgu_rdp_and_SubmitSekem',
        selectedScore: weightedScore,
        acceptanceThreshold,
        rejectionThreshold: acceptanceThreshold,
        derivedVerdict,
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
      },
      limitations: [
        'The official threshold is an eligibility or invitation threshold; programme-specific manual gates remain outside this numeric replay.',
      ],
      nextAction:
        'Keep the official programme endpoint, score replay, threshold, fixtures, and source fingerprint under review',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedBguProof(error, metadata, program);
  }
}

function failedBguProof(
  error: unknown,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
  program?: AdmissionsAdapterContext['program'],
): AdmissionsSourceProof {
  return {
    id: program?.targetId ?? 'bgu-score-only',
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: BGU_INDEX_URL,
    adapterId: 'bgu',
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'failed',
    sourceClass: 'browser_required',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: ['Live BGU request failed during proof run'],
    nextAction: 'Retry live proof and inspect response shape before promoting adapter',
    errorReason: error instanceof Error ? error.message : String(error),
    rawResponseMetadata: metadata,
  };
}

function thresholdFromComments(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/(?:סכם כמותי\s*(\d+)|(\d+)\s*סכם כמותי)/);
  return match ? Number(match[1] ?? match[2]) : undefined;
}
