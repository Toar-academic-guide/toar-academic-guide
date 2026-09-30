import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsProgramInput,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';
import {
  extractTauComputerScienceCriticalRequirements,
  extractTauGeneralEnglishRequirement,
  fingerprintTauComputerScienceSource,
  TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF,
  TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENTS_URL,
  TAU_COMPUTER_SCIENCE_NODE_ID,
  TAU_COMPUTER_SCIENCE_PROGRAM_IDS,
  TAU_COMPUTER_SCIENCE_REJECTION_CUTOFF,
  TAU_COMPUTER_SCIENCE_REGISTRATION_COMMENTS,
  TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL,
  TAU_COMPUTER_SCIENCE_REVIEWED_ENGLISH_REQUIREMENT_TEXT,
  TAU_COMPUTER_SCIENCE_REVIEWED_REQUIREMENTS_TEXT,
  TAU_COMPUTER_SCIENCE_SCORE_FIELD,
  TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
} from '@/data/admissions/tauComputerScienceVerification';

const TAU_GRAPHQL_URL = 'https://go.tau.ac.il/graphql';

export async function runTauAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program ?? {
    targetId: 'tau-digital-sciences-live',
    pairId: 'tau_datascience__tau',
    id: 'tau_datascience',
    name: 'Digital Sciences for High-Tech',
    externalId: '056011050000',
    searchText: 'מדעים דיגיטליים',
    scoreField: 'hatama_handasa',
  };
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const targetId = program.targetId ?? 'tau-digital-sciences-live';
  const isComputerScience = isTauComputerScienceProgram(program);

  if (isComputerScience) {
    const tauBagrutAverage = context.applicant.extraInputs?.tauBagrutAverage;
    if (
      typeof tauBagrutAverage !== 'number' ||
      !Number.isFinite(tauBagrutAverage) ||
      tauBagrutAverage < 50 ||
      tauBagrutAverage > 130
    ) {
      return blockedTauProof(
        'TAU Computer Science requires an explicit TAU Bagrut average from 50 to 130',
        targetId,
      );
    }
    if (
      !Number.isFinite(context.applicant.psychometric) ||
      context.applicant.psychometric < 200 ||
      context.applicant.psychometric > 800
    ) {
      return blockedTauProof(
        'TAU Computer Science requires a psychometric score from 200 to 800',
        targetId,
      );
    }
    if (
      program.nodeId !== TAU_COMPUTER_SCIENCE_NODE_ID ||
      program.externalId !== TAU_COMPUTER_SCIENCE_PROGRAM_IDS[0] ||
      program.scoreField !== TAU_COMPUTER_SCIENCE_SCORE_FIELD
    ) {
      return blockedTauProof(
        'TAU Computer Science request does not match its reviewed node, program ID, and score field',
        targetId,
      );
    }
  }

  try {
    const scoreResponse = await postTauGraphql(
      fetcher,
      buildLastScoreRequest(context, isComputerScience),
    );
    metadata.push(readOfficialResponseMetadata(TAU_GRAPHQL_URL, scoreResponse));
    const scoreJson = await readJson(scoreResponse);
    const scores = parseGraphqlBody(readPath(scoreJson, ['data', 'getLastScore', 'body']));
    const scoreField = isComputerScience
      ? TAU_COMPUTER_SCIENCE_SCORE_FIELD
      : chooseScoreField(scores, program);
    const selectedScore = isComputerScience
      ? parseOfficialNumeric(readUnknownRecord(scores)[TAU_COMPUTER_SCIENCE_SCORE_FIELD])
      : parseOfficialNumeric(readUnknownRecord(scores)[scoreField]);

    const programResponse = await postTauGraphql(fetcher, buildProgramThresholdRequest(program));
    metadata.push(readOfficialResponseMetadata(TAU_GRAPHQL_URL, programResponse));
    const programJson = await readJson(programResponse);
    const thresholdRecord = findThresholdObject(programJson, program.externalId);
    const thresholds = thresholdsFromRecord(
      thresholdRecord,
      isComputerScience ? { externalId: program.externalId } : program,
    );
    const matchedProgramIds = readStringArray(thresholdRecord.field_plain_id_programs);
    const sourceReview = isComputerScience
      ? await reviewTauComputerScienceSource(fetcher, program, thresholdRecord, scores)
      : undefined;
    if (sourceReview) {
      metadata.push(
        ...sourceReview.responses.map(({ url, response }) =>
          readOfficialResponseMetadata(url, response),
        ),
      );
    }
    const derivedVerdict =
      isComputerScience && !sourceReview?.matchesReviewedSource
        ? undefined
        : tauOfficialVerdict(selectedScore, thresholds, program);

    const hasDecision = derivedVerdict !== undefined;
    const capability = hasDecision ? 'decision_capable' : 'score_only';

    return {
      id: targetId,
      institutionId: 'tau',
      institutionName: 'Tel Aviv University',
      officialUrl: TAU_GRAPHQL_URL,
      adapterId: 'tau',
      capability,
      proofLevel: hasDecision ? 'exact_official' : 'partial_official',
      ...(sourceReview?.matchesReviewedSource
        ? { reviewedSourceFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT }
        : {}),
      status: hasDecision ? 'succeeded' : 'partial',
      sourceClass: sourceClassForCapability(capability),
      reproducedFields: reproducedFieldsFor(selectedScore, thresholds, program),
      normalizedPayload: {
        pairId: program.pairId,
        programId: program.id,
        programName: program.name,
        source: 'tau_graphql',
        selectedScoreField: scoreField,
        selectedScore,
        ...(sourceReview
          ? {
              currentSourceFingerprint: sourceReview.currentSourceFingerprint,
              sourceReviewReasons: sourceReview.reasons,
              currentEnglishRequirementText: sourceReview.englishRequirementText,
            }
          : {}),
        exactSciencesBonus: context.applicant.exactSciencesBonusEligible ? 10 : 0,
        matchedProgramIds,
        matchedProgramTitle:
          typeof thresholdRecord.title === 'string' ? thresholdRecord.title : undefined,
        derivedVerdict,
        proofStatus: hasDecision ? 'succeeded' : 'partial',
        proofLevel: hasDecision ? 'exact_official' : 'partial_official',
        decisionProvenance: hasDecision ? 'verified_derivation' : 'none',
        ...thresholds,
      },
      limitations: hasDecision
        ? ['Proof applies only to the explicitly matched TAU program identifier and score field']
        : [
            ...(sourceReview?.reasons.map((reason) => `TAU CS source review: ${reason}`) ?? []),
            'Official response did not reproduce a reviewed TAU decision contract',
          ],
      nextAction: hasDecision
        ? 'Keep the program-specific mapping, gates, fixtures, and source fingerprint under review'
        : isComputerScience
          ? 'Review TAU Computer Science source mapping, score field, cutoffs, and requirements before exact use'
          : 'Complete TAU program threshold lookup before product decisions',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedTauProof(error, metadata, targetId);
  }
}

function isTauComputerScienceProgram(program: AdmissionsProgramInput): boolean {
  return (
    program.id === 'cs' ||
    program.id === 'tau_cs' ||
    program.pairId === 'cs__tau' ||
    program.pairId === 'tau_cs__tau' ||
    program.targetId === 'tau-cs-live' ||
    program.targetId === 'tau-cs-legacy-live'
  );
}

async function reviewTauComputerScienceSource(
  fetcher: typeof fetch,
  program: AdmissionsProgramInput,
  thresholdRecord: Record<string, unknown>,
  scores: unknown,
) {
  const [requirementsResponse, englishResponse] = await Promise.all([
    fetcher(TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL),
    fetcher(TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENTS_URL),
  ]);
  if (!requirementsResponse.ok) {
    throw new Error(
      `TAU Computer Science requirements returned HTTP ${requirementsResponse.status}`,
    );
  }
  if (!englishResponse.ok) {
    throw new Error(`TAU general English requirements returned HTTP ${englishResponse.status}`);
  }
  const [requirementsHtml, englishRequirementsHtml] = await Promise.all([
    requirementsResponse.text(),
    englishResponse.text(),
  ]);
  const criticalRequirementsText = extractTauComputerScienceCriticalRequirements(requirementsHtml);
  const englishRequirementText = extractTauGeneralEnglishRequirement(englishRequirementsHtml);
  const programIds = readStringArray(thresholdRecord.field_plain_id_programs).sort();
  const recordNodeId = parseOfficialNumeric(thresholdRecord.nid);
  const scoreRecord = readUnknownRecord(scores);
  const acceptanceCutoff = parseOfficialNumeric(thresholdRecord.receipt_threshol);
  const rejectionCutoff = parseOfficialNumeric(thresholdRecord.rejection_thresh);
  const currentSourceFingerprint =
    criticalRequirementsText &&
    englishRequirementText &&
    recordNodeId !== undefined &&
    acceptanceCutoff !== undefined &&
    rejectionCutoff !== undefined
      ? fingerprintTauComputerScienceSource({
          nodeId: recordNodeId,
          programIds,
          scoreField:
            parseOfficialNumeric(scoreRecord[TAU_COMPUTER_SCIENCE_SCORE_FIELD]) !== undefined
              ? TAU_COMPUTER_SCIENCE_SCORE_FIELD
              : '<missing>',
          acceptanceCutoff,
          rejectionCutoff,
          registrationComments:
            typeof thresholdRecord.field_registration_comments === 'string'
              ? thresholdRecord.field_registration_comments
              : null,
          criticalRequirementsText,
          englishRequirementText,
        })
      : undefined;
  const reasons: string[] = [];
  if (
    program.nodeId !== TAU_COMPUTER_SCIENCE_NODE_ID ||
    recordNodeId !== TAU_COMPUTER_SCIENCE_NODE_ID
  ) {
    reasons.push('TAU Computer Science node mapping changed or is missing');
  }
  if (program.externalId !== TAU_COMPUTER_SCIENCE_PROGRAM_IDS[0]) {
    reasons.push('TAU Computer Science program identifier changed or is missing');
  }
  if (JSON.stringify(programIds) !== JSON.stringify([...TAU_COMPUTER_SCIENCE_PROGRAM_IDS].sort())) {
    reasons.push('TAU Computer Science official program mapping changed or is missing');
  }
  if (parseOfficialNumeric(scoreRecord[TAU_COMPUTER_SCIENCE_SCORE_FIELD]) === undefined) {
    reasons.push(`TAU Computer Science score field ${TAU_COMPUTER_SCIENCE_SCORE_FIELD} is missing`);
  }
  if (acceptanceCutoff !== TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF) {
    reasons.push('TAU Computer Science acceptance cutoff changed');
  }
  if (rejectionCutoff !== TAU_COMPUTER_SCIENCE_REJECTION_CUTOFF) {
    reasons.push('TAU Computer Science rejection cutoff changed');
  }
  const registrationComments =
    typeof thresholdRecord.field_registration_comments === 'string'
      ? thresholdRecord.field_registration_comments
      : null;
  if (
    !Object.hasOwn(thresholdRecord, 'field_registration_comments') ||
    registrationComments !== TAU_COMPUTER_SCIENCE_REGISTRATION_COMMENTS
  ) {
    reasons.push('TAU Computer Science registration comments changed');
  }
  if (!criticalRequirementsText) {
    reasons.push('TAU Computer Science critical requirements could not be extracted');
  } else if (criticalRequirementsText !== TAU_COMPUTER_SCIENCE_REVIEWED_REQUIREMENTS_TEXT) {
    reasons.push('TAU Computer Science critical requirements changed');
  }
  if (!englishRequirementText) {
    reasons.push('TAU general English requirement could not be extracted');
  } else if (englishRequirementText !== TAU_COMPUTER_SCIENCE_REVIEWED_ENGLISH_REQUIREMENT_TEXT) {
    reasons.push('TAU general English requirement changed');
  }
  if (currentSourceFingerprint !== TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT) {
    reasons.push(
      'TAU Computer Science current source fingerprint differs from the reviewed fingerprint',
    );
  }
  return {
    matchesReviewedSource: reasons.length === 0,
    currentSourceFingerprint,
    reasons,
    englishRequirementText,
    responses: [
      { url: TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL, response: requirementsResponse },
      { url: TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENTS_URL, response: englishResponse },
    ],
  };
}

export function parseTauScoresBody(value: unknown): Record<string, unknown> {
  return readUnknownRecord(parseGraphqlBody(value));
}

export function parseTauProgramThresholds(
  value: unknown,
  programExternalId?: string,
): {
  acceptanceThreshold?: number;
  rejectionThreshold?: number | null;
} {
  const thresholdObject = findThresholdObject(parseGraphqlBody(value), programExternalId);

  return thresholdsFromRecord(thresholdObject, { externalId: programExternalId });
}

function thresholdsFromRecord(
  thresholdObject: Record<string, unknown>,
  program?: Pick<AdmissionsProgramInput, 'externalId' | 'staticThresholds'>,
): {
  acceptanceThreshold?: number;
  rejectionThreshold?: number | null;
} {
  const acceptanceThreshold =
    parseOfficialNumeric(
      thresholdObject.field_this_year_receipt_threshol ??
        thresholdObject.receipt_threshol ??
        thresholdObject.acceptanceThreshold ??
        thresholdObject.acceptance_cutoff,
    ) ??
    program?.staticThresholds?.acceptance ??
    (program?.externalId === '011167010000'
      ? parsePreliminaryMedicineThreshold(thresholdObject.field_registration_comments)
      : undefined);
  const rejectionThreshold =
    parseOfficialNumeric(
      thresholdObject.field_this_year_rejection_thresh ??
        thresholdObject.rejection_thresh ??
        thresholdObject.rejectionThreshold ??
        thresholdObject.rejection_cutoff,
    ) ?? program?.staticThresholds?.rejection;

  return { acceptanceThreshold, rejectionThreshold };
}

function parsePreliminaryMedicineThreshold(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.match(/ציון\s+התאמה\s+רפואה\s+ראשוני\s*-\s*(\d+(?:\.\d+)?)/);
  return match ? parseOfficialNumeric(match[1]) : undefined;
}

function buildLastScoreRequest(context: AdmissionsAdapterContext, isComputerScience = false) {
  const bagrutAverage = isComputerScience
    ? context.applicant.extraInputs?.tauBagrutAverage
    : context.applicant.bagrutAverage;
  return {
    operationName: 'getLastScore',
    variables: {
      scoresData: {
        prog: 'calctziun',
        out: 'json',
        reali10: context.applicant.exactSciencesBonusEligible ? 1 : 0,
        psicho: String(context.applicant.psychometric),
        bagrut: String(bagrutAverage),
      },
    },
    query:
      'query getLastScore($scoresData: JSON!) { getLastScore(scoresData: $scoresData) { body __typename } }',
  };
}

function blockedTauProof(reason: string, targetId: string): AdmissionsSourceProof {
  return {
    id: targetId,
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: TAU_GRAPHQL_URL,
    adapterId: 'tau',
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'blocked',
    sourceClass: 'browser_required',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: [reason],
    nextAction:
      'Collect the explicit TAU Computer Science applicant inputs and retry the official replay',
    blockedReason: reason,
  };
}

function buildProgramThresholdRequest(program: AdmissionsProgramInput) {
  if (program.nodeId !== undefined) {
    return {
      operationName: 'getProgramByIdAndLang',
      variables: {
        nid: program.nodeId,
        langcode: 'he',
      },
      query:
        'query getProgramByIdAndLang($nid: Int!, $langcode: String!) { getProgramByIdAndLang(nid: $nid, langcode: $langcode) { nid title receipt_threshol rejection_thresh field_registration_comments field_plain_id_programs field_faculty_mamta } }',
    };
  }

  return {
    operationName: 'getPrograms',
    variables: {
      search: {
        langcode: 'he',
        text: program.searchText ?? program.name,
      },
    },
    query:
      'query getPrograms($search: JSON) { getPrograms(search: $search) { total results { nid title receipt_threshol rejection_thresh field_registration_comments field_plain_id_programs field_faculty_mamta } } }',
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
  const candidates = collectThresholdObjects(parseGraphqlBody(value));
  return programExternalId
    ? (candidates.find((candidate) => matchesProgram(candidate, programExternalId)) ?? {})
    : (candidates[0] ?? {});
}

function collectThresholdObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectThresholdObjects(entry));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  if (hasThresholdField(record)) {
    return [record];
  }

  return Object.values(record).flatMap((entry) => collectThresholdObjects(parseGraphqlBody(entry)));
}

function hasThresholdField(record: Record<string, unknown>): boolean {
  return (
    'field_this_year_receipt_threshol' in record ||
    'field_this_year_rejection_thresh' in record ||
    'receipt_threshol' in record ||
    'rejection_thresh' in record ||
    'acceptanceThreshold' in record ||
    'rejectionThreshold' in record
  );
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
  return readStringArray(record.field_plain_id_programs).includes(programExternalId);
}

function reproducedFieldsFor(
  selectedScore: number | undefined,
  thresholds: ReturnType<typeof parseTauProgramThresholds>,
  program?: Pick<AdmissionsProgramInput, 'decisionMode'>,
) {
  return [
    selectedScore !== undefined ? 'selectedScore' : undefined,
    thresholds.acceptanceThreshold !== undefined ? 'acceptanceThreshold' : undefined,
    typeof thresholds.rejectionThreshold === 'number' ? 'rejectionThreshold' : undefined,
    tauOfficialVerdict(selectedScore, thresholds, program) !== undefined
      ? 'derivedVerdict'
      : undefined,
  ].filter(Boolean) as string[];
}

function tauOfficialVerdict(
  selectedScore: number | undefined,
  thresholds: ReturnType<typeof parseTauProgramThresholds>,
  program?: Pick<AdmissionsProgramInput, 'decisionMode'>,
): 'accepted' | 'below' | 'eligible_to_apply' | 'pending' | undefined {
  if (selectedScore === undefined || thresholds.acceptanceThreshold === undefined) {
    return undefined;
  }
  if (selectedScore >= thresholds.acceptanceThreshold) {
    return program?.decisionMode === 'eligible_to_apply' ? 'eligible_to_apply' : 'accepted';
  }
  if (
    typeof thresholds.rejectionThreshold === 'number' &&
    selectedScore <= thresholds.rejectionThreshold
  ) {
    return 'below';
  }
  if (
    program?.decisionMode === 'eligible_to_apply' &&
    typeof thresholds.rejectionThreshold !== 'number'
  ) {
    return 'below';
  }
  return typeof thresholds.rejectionThreshold === 'number' ? 'pending' : undefined;
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return typeof value === 'string' ? [value] : [];
}

function failedTauProof(
  error: unknown,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
  targetId = 'tau-digital-sciences-live',
): AdmissionsSourceProof {
  return {
    id: targetId,
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
