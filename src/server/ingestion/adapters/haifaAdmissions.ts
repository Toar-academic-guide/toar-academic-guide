import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

const HAIFA_INDEX_URL = 'https://applicants.haifa.ac.il/enrollmentChances/index.html';
const HAIFA_SERVLET_URL = 'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet';
const DEFAULT_YEAR = '2026';
const DEFAULT_SEMESTER = '001';
const DEFAULT_HUG = 'SC0001';

export async function runHaifaAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program ?? {
    id: 'haifa-cs',
    name: 'Computer Science',
    externalId: '52258372',
  };
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];

  try {
    const connectionUrl = `${HAIFA_SERVLET_URL}?operation=checkConnection`;
    const connectionResponse = await fetcher(connectionUrl, { headers: defaultHeaders() });
    metadata.push(readOfficialResponseMetadata(connectionUrl, connectionResponse));
    await readJson(connectionResponse);

    const chancesUrl = `${HAIFA_SERVLET_URL}?${buildHaifaParams(context, program.externalId, program.hug).toString()}`;
    const chancesResponse = await fetcher(chancesUrl, { headers: defaultHeaders() });
    metadata.push(readOfficialResponseMetadata(chancesUrl, chancesResponse));
    const chancesJson = await readJson(chancesResponse);
    const parsed = parseHaifaChancesResponse(chancesJson);

    const hasDecision = parsed.weightedScore !== undefined && hasCutoff(parsed);
    const capability = hasDecision ? 'decision_capable' : 'score_only';

    return {
      id: program.targetId ?? `haifa-${program.id}-live`,
      institutionId: 'haifa',
      institutionName: 'University of Haifa',
      officialUrl: HAIFA_INDEX_URL,
      adapterId: 'haifa',
      capability,
      proofLevel: hasDecision ? 'exact_official' : 'partial_official',
      status: hasDecision ? 'succeeded' : 'partial',
      sourceClass: sourceClassForCapability(capability),
      reproducedFields: reproducedFieldsFor(parsed),
      normalizedPayload: {
        programId: program.id,
        programName: program.name,
        source: 'haifa_calculateChances',
        ...parsed,
        officialVerdict:
          parsed.weightedScore !== undefined && parsed.acceptanceCutoff !== undefined
            ? parsed.weightedScore >= parsed.acceptanceCutoff
              ? 'accepted'
              : 'below'
            : undefined,
      },
      limitations: hasDecision
        ? ['Representative Haifa program only; broad program coverage is deferred']
        : ['Official response produced a score but not enough cutoff/status fields for acceptance'],
      nextAction: hasDecision
        ? 'Promote Haifa to the first weekly GitHub Action adapter candidate'
        : 'Find the official Haifa cutoff/status field for this program before product decisions',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedHaifaProof(error, metadata, program.targetId ?? `haifa-${program.id}-live`);
  }
}

export function parseHaifaChancesResponse(value: unknown): Record<string, number | string> {
  const entries = collectLabelValueEntries(value);
  const parsed: Record<string, number | string> = {};

  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const numeric = parseOfficialNumeric(entry.value);

    if (numeric === undefined) {
      continue;
    }

    if (matchesAny(label, ['משוקלל', 'סכם', 'התאמה', 'weighted'])) {
      parsed.weightedScore = numeric;
    } else if (matchesAny(label, ['סף קבלה', 'חתך קבלה', 'acceptance'])) {
      parsed.acceptanceCutoff = numeric;
    } else if (matchesAny(label, ['סף דח', 'דחייה', 'דחיה', 'rejection'])) {
      parsed.rejectionCutoff = numeric;
    } else if (matchesAny(label, ['פסיכומטר', 'psychometric'])) {
      parsed.psychometricScore = numeric;
    }
  }

  return parsed;
}

function buildHaifaParams(
  context: AdmissionsAdapterContext,
  programId = '52258372',
  hug = DEFAULT_HUG,
) {
  const subscores =
    context.applicant.psychometricSubscores ?? defaultSubscores(context.applicant.psychometric);

  return new URLSearchParams({
    operation: 'calculateChances',
    year: DEFAULT_YEAR,
    semester: DEFAULT_SEMESTER,
    hug,
    program: programId,
    bag_year: context.applicant.bagrutYear ?? '2020',
    bag_type: '001',
    bag_avg: context.applicant.bagrutAverage.toFixed(1),
    psy_year: context.applicant.psychometricYear ?? '2021',
    psy_math: String(subscores.math),
    psy_english: String(subscores.english),
    psy_verbal: String(subscores.verbal),
  });
}

function defaultSubscores(psychometric: number) {
  const score = Math.round(psychometric / 5);
  return {
    english: score,
    math: score,
    verbal: score,
  };
}

function defaultHeaders() {
  return {
    referer: HAIFA_INDEX_URL,
    'x-requested-with': 'XMLHttpRequest',
  };
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Haifa endpoint returned HTTP ${response.status}`);
  }

  return response.json();
}

function collectLabelValueEntries(value: unknown): Array<{ label: string; value: unknown }> {
  if (Array.isArray(value)) {
    return value.flatMap(collectLabelValueEntries);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const entries =
    typeof record.label === 'string' && 'value' in record
      ? [{ label: record.label, value: record.value }]
      : [];

  return entries.concat(Object.values(record).flatMap(collectLabelValueEntries));
}

function matchesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function hasCutoff(parsed: Record<string, number | string>) {
  return parsed.acceptanceCutoff !== undefined || parsed.rejectionCutoff !== undefined;
}

function reproducedFieldsFor(parsed: Record<string, number | string>) {
  return ['weightedScore', 'acceptanceCutoff', 'rejectionCutoff', 'psychometricScore'].filter(
    (field) => parsed[field] !== undefined,
  );
}

function failedHaifaProof(
  error: unknown,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
  targetId = 'haifa-cs-live',
): AdmissionsSourceProof {
  return {
    id: targetId,
    institutionId: 'haifa',
    institutionName: 'University of Haifa',
    officialUrl: HAIFA_INDEX_URL,
    adapterId: 'haifa',
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'failed',
    sourceClass: 'browser_required',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: ['Live Haifa request failed during proof run'],
    nextAction: 'Retry live proof and inspect response shape before promoting adapter',
    errorReason: error instanceof Error ? error.message : String(error),
    rawResponseMetadata: metadata,
  };
}
