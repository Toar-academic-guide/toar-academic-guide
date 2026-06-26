import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsProgramInput,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

const TAU_GRAPHQL_URL = 'https://go.tau.ac.il/graphql';

export async function runTauAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program ?? {
    id: 'tau-digital-sciences',
    name: 'Digital Sciences for High-Tech',
    externalId: '056011050000',
    searchText: 'מדעים דיגיטליים',
    scoreField: 'hatama_handasa',
  };
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];

  try {
    const scoreResponse = await postTauGraphql(fetcher, buildLastScoreRequest(context));
    metadata.push(readOfficialResponseMetadata(TAU_GRAPHQL_URL, scoreResponse));
    const scoreJson = await readJson(scoreResponse);
    const scores = parseGraphqlBody(readPath(scoreJson, ['data', 'getLastScore', 'body']));
    const scoreField = chooseScoreField(scores, program);
    const selectedScore = parseOfficialNumeric(readUnknownRecord(scores)[scoreField]);

    const programResponse = await postTauGraphql(fetcher, buildProgramThresholdRequest(program));
    metadata.push(readOfficialResponseMetadata(TAU_GRAPHQL_URL, programResponse));
    const programJson = await readJson(programResponse);
    const thresholds = parseTauProgramThresholds(programJson, program.externalId);

    const hasDecision =
      selectedScore !== undefined &&
      (thresholds.acceptanceThreshold !== undefined || thresholds.rejectionThreshold !== undefined);
    const capability = hasDecision ? 'decision_capable' : 'score_only';

    return {
      id: 'tau-digital-sciences-live',
      institutionId: 'tau',
      institutionName: 'Tel Aviv University',
      officialUrl: TAU_GRAPHQL_URL,
      adapterId: 'tau',
      capability,
      proofLevel: hasDecision ? 'exact_official' : 'partial_official',
      status: hasDecision ? 'succeeded' : 'partial',
      sourceClass: sourceClassForCapability(capability),
      reproducedFields: reproducedFieldsFor(selectedScore, thresholds),
      normalizedPayload: {
        programId: program.id,
        programName: program.name,
        source: 'tau_graphql',
        selectedScoreField: scoreField,
        selectedScore,
        ...thresholds,
      },
      limitations: hasDecision
        ? ['Representative TAU program only; broad faculty score-field mapping is deferred']
        : ['Official response produced score evidence but not enough official threshold data'],
      nextAction: hasDecision
        ? 'Promote TAU to the second weekly GitHub Action adapter candidate'
        : 'Complete TAU program threshold lookup before product decisions',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedTauProof(error, metadata);
  }
}

export function parseTauScoresBody(value: unknown): Record<string, unknown> {
  return readUnknownRecord(parseGraphqlBody(value));
}

export function parseTauProgramThresholds(
  value: unknown,
  programExternalId?: string,
): {
  acceptanceThreshold?: number;
  rejectionThreshold?: number;
} {
  const thresholdObject = findThresholdObject(parseGraphqlBody(value), programExternalId);

  return {
    acceptanceThreshold: parseOfficialNumeric(
      thresholdObject.field_this_year_receipt_threshol ??
        thresholdObject.receipt_threshol ??
        thresholdObject.acceptanceThreshold ??
        thresholdObject.acceptance_cutoff,
    ),
    rejectionThreshold: parseOfficialNumeric(
      thresholdObject.field_this_year_rejection_thresh ??
        thresholdObject.rejection_thresh ??
        thresholdObject.rejectionThreshold ??
        thresholdObject.rejection_cutoff,
    ),
  };
}

function buildLastScoreRequest(context: AdmissionsAdapterContext) {
  return {
    operationName: 'getLastScore',
    variables: {
      scoresData: {
        prog: 'calctziun',
        out: 'json',
        reali10: 0,
        psicho: String(context.applicant.psychometric),
        bagrut: String(context.applicant.bagrutAverage),
      },
    },
    query:
      'query getLastScore($scoresData: JSON!) { getLastScore(scoresData: $scoresData) { body __typename } }',
  };
}

function buildProgramThresholdRequest(program: AdmissionsProgramInput) {
  return {
    operationName: 'getPrograms',
    variables: {
      search: {
        langcode: 'he',
        text: program.searchText ?? program.name,
      },
    },
    query:
      'query getPrograms($search: JSON) { getPrograms(search: $search) { total results { nid title receipt_threshol rejection_thresh field_plain_id_programs field_faculty_mamta } } }',
  };
}

async function postTauGraphql(fetcher: typeof fetch, body: Record<string, unknown>) {
  return fetcher(TAU_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`TAU GraphQL returned HTTP ${response.status}`);
  }

  const json = await response.json();
  const errors = readPath(json, ['errors']);
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error('TAU GraphQL returned errors');
  }

  return json;
}

function parseGraphqlBody(value: unknown): unknown {
  if (typeof value === 'string') {
    return JSON.parse(value);
  }

  return value;
}

function chooseScoreField(scores: unknown, program: AdmissionsProgramInput): string {
  const record = readUnknownRecord(scores);
  const candidates = [
    program.scoreField,
    program.facultyCode ? `hatama_${program.facultyCode}` : undefined,
    'hatama',
  ].filter(Boolean) as string[];

  return candidates.find((field) => parseOfficialNumeric(record[field]) !== undefined) ?? 'hatama';
}

function findThresholdObject(value: unknown, programExternalId?: string): Record<string, unknown> {
  if (Array.isArray(value)) {
    if (programExternalId) {
      const exact = value
        .map((entry) => findThresholdObject(entry, programExternalId))
        .find((entry) => Object.keys(entry).length > 0 && matchesProgram(entry, programExternalId));

      if (exact) {
        return exact;
      }
    }

    for (const entry of value) {
      const found = findThresholdObject(entry, programExternalId);
      if (Object.keys(found).length > 0) {
        return found;
      }
    }
    return {};
  }

  if (!value || typeof value !== 'object') {
    return {};
  }

  const record = value as Record<string, unknown>;
  if (
    'field_this_year_receipt_threshol' in record ||
    'field_this_year_rejection_thresh' in record ||
    'receipt_threshol' in record ||
    'rejection_thresh' in record ||
    'acceptanceThreshold' in record ||
    'rejectionThreshold' in record
  ) {
    return record;
  }

  for (const entry of Object.values(record)) {
    const found = findThresholdObject(parseGraphqlBody(entry), programExternalId);
    if (Object.keys(found).length > 0) {
      return found;
    }
  }

  return {};
}

function readPath(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, value);
}

function readUnknownRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function matchesProgram(record: Record<string, unknown>, programExternalId: string): boolean {
  const ids = record.field_plain_id_programs;
  return Array.isArray(ids) && ids.includes(programExternalId);
}

function reproducedFieldsFor(
  selectedScore: number | undefined,
  thresholds: ReturnType<typeof parseTauProgramThresholds>,
) {
  return [
    selectedScore !== undefined ? 'selectedScore' : undefined,
    thresholds.acceptanceThreshold !== undefined ? 'acceptanceThreshold' : undefined,
    thresholds.rejectionThreshold !== undefined ? 'rejectionThreshold' : undefined,
  ].filter(Boolean) as string[];
}

function failedTauProof(
  error: unknown,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
): AdmissionsSourceProof {
  return {
    id: 'tau-digital-sciences-live',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: TAU_GRAPHQL_URL,
    adapterId: 'tau',
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'failed',
    sourceClass: 'browser_required',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: ['Live TAU GraphQL request failed during proof run'],
    nextAction: 'Retry live proof and inspect GraphQL response shape before promoting adapter',
    errorReason: error instanceof Error ? error.message : String(error),
    rawResponseMetadata: metadata,
  };
}
