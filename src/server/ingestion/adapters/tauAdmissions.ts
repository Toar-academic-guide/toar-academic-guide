import {
  hasDecisionThresholds,
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

const TAU_GRAPHQL_URL = 'https://go.tau.ac.il/graphql';

export async function runTauAdmissionsProof(
  context: AdmissionsAdapterContext
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];

  try {
    const scoreResponse = await postTauGraphql(fetcher, {
      operationName: 'getLastScore',
      variables: {
        psychometric: context.applicant.psychometric,
        bagrut: context.applicant.bagrutAverage,
      },
      query: 'query getLastScore($psychometric: Int, $bagrut: Float) { getLastScore(psychometric: $psychometric, bagrut: $bagrut) }',
    });
    metadata.push(readOfficialResponseMetadata(TAU_GRAPHQL_URL, scoreResponse));

    if (!scoreResponse.ok) {
      return failedTauProof(`TAU score query returned ${scoreResponse.status}`, metadata);
    }

    const scorePayload = await scoreResponse.json();
    const thresholdResponse = await postTauGraphql(fetcher, {
      operationName: 'getProgramAdmission',
      variables: {
        program: context.program?.externalId,
        search: context.program?.searchText,
      },
      query: 'query getProgramAdmission($program: String, $search: String) { programAdmission(program: $program, search: $search) }',
    });
    metadata.push(readOfficialResponseMetadata(TAU_GRAPHQL_URL, thresholdResponse));

    if (!thresholdResponse.ok) {
      return failedTauProof(`TAU threshold query returned ${thresholdResponse.status}`, metadata);
    }

    const thresholdPayload = await thresholdResponse.json();
    const normalizedPayload = normalizeTauPayload(scorePayload, thresholdPayload, context.program?.scoreField);
    const decisionCapable = hasDecisionThresholds(normalizedPayload);

    return {
      id: 'tau-digital-sciences-live',
      institutionId: 'tau',
      institutionName: 'Tel Aviv University',
      officialUrl: TAU_GRAPHQL_URL,
      adapterId: 'tau',
      capability: decisionCapable ? 'decision_capable' : 'score_only',
      proofLevel: decisionCapable ? 'exact_official' : 'partial_official',
      status: decisionCapable ? 'succeeded' : 'partial',
      sourceClass: decisionCapable ? 'api_static_json' : 'score_only_calculator',
      reproducedFields: Object.keys(normalizedPayload),
      normalizedPayload,
      limitations: ['Representative program only; faculty score-field mapping needs expansion'],
      nextAction: decisionCapable
        ? 'Use as a scheduled exact freshness adapter'
        : 'Pair score output with an official threshold source before product decisions',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedTauProof(error instanceof Error ? error.message : 'Unknown TAU adapter error', metadata);
  }
}

export function normalizeTauPayload(
  scorePayload: unknown,
  thresholdPayload: unknown,
  preferredScoreField?: string
): Record<string, unknown> {
  const scoreFields = flattenObject(asRecord(scorePayload));
  const thresholdFields = flattenObject(asRecord(thresholdPayload));
  const selectedScore = readSelectedScore(scoreFields, preferredScoreField);
  const acceptanceThreshold = readFirstNumeric(thresholdFields, [
    'acceptanceThreshold',
    'acceptance_threshold',
    'acceptanceCutoff',
    'acceptance_cutoff',
    'threshold',
    'min',
  ]);
  const rejectionThreshold = readFirstNumeric(thresholdFields, [
    'rejectionThreshold',
    'rejection_threshold',
    'rejectionCutoff',
    'rejection_cutoff',
    'reject',
  ]);

  return compactObject({
    selectedScore: selectedScore?.value,
    selectedScoreField: selectedScore?.field,
    acceptanceThreshold,
    rejectionThreshold,
  });
}

async function postTauGraphql(fetcher: typeof fetch, body: Record<string, unknown>) {
  return fetcher(TAU_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function failedTauProof(
  errorReason: string,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>
): AdmissionsSourceProof {
  return {
    id: 'tau-digital-sciences-live',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: TAU_GRAPHQL_URL,
    adapterId: 'tau',
    capability: 'decision_capable',
    proofLevel: 'exact_official',
    status: 'failed',
    sourceClass: 'api_static_json',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: ['Representative program only; faculty score-field mapping needs expansion'],
    nextAction: 'Inspect official TAU GraphQL response shape before the next scheduled run',
    errorReason,
    rawResponseMetadata: metadata,
  };
}

function readSelectedScore(
  fields: Record<string, unknown>,
  preferredScoreField?: string
): { field: string; value: number } | undefined {
  const preferred = preferredScoreField
    ? Object.entries(fields).find(([key]) => key.toLowerCase().includes(preferredScoreField.toLowerCase()))
    : undefined;
  const preferredValue = preferred ? parseOfficialNumeric(preferred[1]) : undefined;

  if (preferred && preferredValue !== undefined) {
    return { field: preferred[0], value: preferredValue };
  }

  for (const [key, value] of Object.entries(fields)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes('score') || normalizedKey.includes('hatama')) {
      const parsed = parseOfficialNumeric(value);
      if (parsed !== undefined) {
        return { field: key, value: parsed };
      }
    }
  }

  return undefined;
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
    if (keys.some((candidate) => normalizedKey.includes(candidate.toLowerCase().replace(/[^a-z]/g, '')))) {
      const parsed = parseOfficialNumeric(value);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

function compactObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
  );
}
