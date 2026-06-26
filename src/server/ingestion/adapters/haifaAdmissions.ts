import {
  hasDecisionThresholds,
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

const HAIFA_INDEX_URL = 'https://applicants.haifa.ac.il/enrollmentChances/index.html';
const HAIFA_API_URL = 'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet';

export async function runHaifaAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];

  try {
    const connectionResponse = await fetcher(`${HAIFA_API_URL}?action=checkConnection`, {
      headers: { accept: 'application/json,text/plain,*/*' },
    });
    metadata.push(readOfficialResponseMetadata(HAIFA_API_URL, connectionResponse));

    if (!connectionResponse.ok) {
      return failedHaifaProof(
        `Haifa checkConnection returned ${connectionResponse.status}`,
        metadata,
      );
    }

    const url = new URL(HAIFA_API_URL);
    url.searchParams.set('action', 'calculateChances');
    url.searchParams.set('psychometric', String(context.applicant.psychometric));
    url.searchParams.set('bagrut', String(context.applicant.bagrutAverage));
    if (context.program?.externalId) {
      url.searchParams.set('programId', context.program.externalId);
    }

    const chancesResponse = await fetcher(url, {
      headers: {
        accept: 'application/json,text/plain,*/*',
        referer: HAIFA_INDEX_URL,
      },
    });
    metadata.push(readOfficialResponseMetadata(HAIFA_API_URL, chancesResponse));

    if (!chancesResponse.ok) {
      return failedHaifaProof(
        `Haifa calculateChances returned ${chancesResponse.status}`,
        metadata,
      );
    }

    const payload = await chancesResponse.json();
    const normalizedPayload = normalizeHaifaPayload(payload);
    const decisionCapable = hasDecisionThresholds(normalizedPayload);

    return {
      id: 'haifa-cs-live',
      institutionId: 'haifa',
      institutionName: 'University of Haifa',
      officialUrl: HAIFA_INDEX_URL,
      adapterId: 'haifa',
      capability: decisionCapable ? 'decision_capable' : 'score_only',
      proofLevel: decisionCapable ? 'exact_official' : 'partial_official',
      status: decisionCapable ? 'succeeded' : 'partial',
      sourceClass: decisionCapable ? 'api_static_json' : 'score_only_calculator',
      reproducedFields: Object.keys(normalizedPayload),
      normalizedPayload,
      limitations: ['Representative program only; broad Haifa program coverage is deferred'],
      nextAction: decisionCapable
        ? 'Use as a scheduled exact freshness adapter'
        : 'Pair score output with an official threshold source before product decisions',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedHaifaProof(
      error instanceof Error ? error.message : 'Unknown Haifa adapter error',
      metadata,
    );
  }
}

export function normalizeHaifaPayload(payload: unknown): Record<string, unknown> {
  const root = asRecord(payload);
  const candidates = flattenObject(root);

  const weightedScore = readFirstNumeric(candidates, [
    'weightedScore',
    'weighted_score',
    'score',
    'sekhem',
    'sachem',
    'mark',
  ]);
  const acceptanceCutoff = readFirstNumeric(candidates, [
    'acceptanceCutoff',
    'acceptance_cutoff',
    'acceptanceThreshold',
    'acceptance_threshold',
    'minAccepted',
    'min_accept',
  ]);
  const rejectionCutoff = readFirstNumeric(candidates, [
    'rejectionCutoff',
    'rejection_cutoff',
    'rejectionThreshold',
    'rejection_threshold',
    'maxRejected',
    'max_reject',
  ]);
  const status = readFirstString(candidates, ['status', 'decision', 'result']);

  return compactObject({
    weightedScore,
    acceptanceCutoff,
    rejectionCutoff,
    status,
  });
}

function failedHaifaProof(
  errorReason: string,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
): AdmissionsSourceProof {
  return {
    id: 'haifa-cs-live',
    institutionId: 'haifa',
    institutionName: 'University of Haifa',
    officialUrl: HAIFA_INDEX_URL,
    adapterId: 'haifa',
    capability: 'decision_capable',
    proofLevel: 'exact_official',
    status: 'failed',
    sourceClass: 'api_static_json',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: ['Representative program only; broad Haifa program coverage is deferred'],
    nextAction: 'Inspect official Haifa response shape before the next scheduled run',
    errorReason,
    rawResponseMetadata: metadata,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function flattenObject(value: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.entries(value).reduce<Record<string, unknown>>((flattened, [key, entry]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return { ...flattened, ...flattenObject(entry as Record<string, unknown>, nextKey) };
    }

    flattened[nextKey] = entry;
    return flattened;
  }, {});
}

function readFirstNumeric(candidates: Record<string, unknown>, keys: string[]): number | undefined {
  for (const [key, value] of Object.entries(candidates)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (
      keys.some((candidate) =>
        normalizedKey.includes(candidate.toLowerCase().replace(/[^a-z]/g, '')),
      )
    ) {
      const parsed = parseOfficialNumeric(value);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

function readFirstString(candidates: Record<string, unknown>, keys: string[]): string | undefined {
  for (const [key, value] of Object.entries(candidates)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (
      typeof value === 'string' &&
      keys.some((candidate) =>
        normalizedKey.includes(candidate.toLowerCase().replace(/[^a-z]/g, '')),
      )
    ) {
      return value;
    }
  }

  return undefined;
}

function compactObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== undefined && entry !== null && entry !== '',
    ),
  );
}
