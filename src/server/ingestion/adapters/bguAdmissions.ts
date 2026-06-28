import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

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
    const params = new URLSearchParams({
      rn_include_mitsraf: '0',
      rn_year: '2027',
      on_bagrut_average: context.applicant.bagrutAverage.toFixed(2),
      on_psychometry: String(context.applicant.psychometric),
      on_final_sekem: '',
    });

    const response = await fetcher(BGU_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: BGU_INDEX_URL,
      },
      body: params.toString(),
    });

    metadata.push(readOfficialResponseMetadata(BGU_SUBMIT_URL, response));

    if (!response.ok) {
      throw new Error(`BGU endpoint returned HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse BGU weighted score. Check the specific ID script pattern first to avoid false matches.
    const valueMatch =
      html.match(/'on_final_sekem'\)\.value\s*=\s*'([^']+)'/i) ||
      html.match(/value\s*=\s*'([^']+)'/i) ||
      html.match(/value\s*=\s*"([^"]+)"/i);

    const scoreVal = valueMatch ? valueMatch[1] : null;
    const weightedScore = scoreVal ? parseOfficialNumeric(scoreVal) : undefined;

    if (weightedScore === undefined) {
      throw new Error('Failed to parse weighted score from BGU response HTML');
    }

    return {
      id: 'bgu-score-only',
      institutionId: 'bgu',
      institutionName: 'Ben-Gurion University',
      officialUrl: BGU_INDEX_URL,
      adapterId: 'bgu',
      capability: 'score_only',
      proofLevel: 'partial_official',
      status: 'succeeded',
      sourceClass: sourceClassForCapability('score_only'),
      reproducedFields: ['sekhemScore'],
      normalizedPayload: {
        programId: program.id,
        programName: program.name,
        source: 'bgu_SubmitSekem',
        sekhemScore: weightedScore,
      },
      limitations: [
        'Known endpoints calculate scores, but status and cutoffs were not returned in the proof notes',
      ],
      nextAction: 'Find or review an official cutoff/status source before product decisions',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedBguProof(error, metadata);
  }
}

function failedBguProof(
  error: unknown,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
): AdmissionsSourceProof {
  return {
    id: 'bgu-score-only',
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
