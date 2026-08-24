import { admissionsSourceTargets, type AdmissionsSourceTarget } from './admissionsSourceRegistry';
import type {
  IngestionSourceDescriptor,
  IngestionSourceDifficulty,
  MondayAdmissionsContractFieldEvidence,
  MondayAdmissionsContractInput,
  MondayAdmissionsContractProvenance,
  MondayAdmissionsReproducedField,
  MondayAdmissionsSourceContract,
  MondayAdmissionsSourceContractParseResult,
  MondayAdmissionsSourceReviewableEvidence,
} from './types';

const TAU_ENDPOINT = 'https://go.tau.ac.il/graphql';
const HAIFA_ENDPOINT = 'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet';
const HAIFA_PAGE = 'https://applicants.haifa.ac.il/enrollmentChances/index.html';
const REICHMAN_PAGE = 'https://www.runi.ac.il/admissions/undergraduate/calculator';
const AFEKA_PAGE = 'https://www.afeka.ac.il/candidate/candidate-information-bsc/calculator/';
const HIT_PAGE = 'https://calc.hit.ac.il/';
const SHENKAR_PAGE = 'https://www.shenkar.ac.il/he/pages/calc/';
const MTA_PAGE = 'https://www.mta.ac.il/conditions_for_applying';

export interface MondayAdmissionsSourceMapping {
  target: AdmissionsSourceTarget;
  sourceDescriptor: IngestionSourceDescriptor;
  reviewableEvidence: MondayAdmissionsSourceReviewableEvidence;
  publicationBoundary: 'reviewable_evidence_only';
  canonicalPublicationTables: [];
}

export type MondayAdmissionsSourceMappingResult =
  | { ok: true; mapping: MondayAdmissionsSourceMapping }
  | { ok: false; error: { code: 'target_mismatch'; message: string } };

export function parseMondayAdmissionsSourceContract(
  input: MondayAdmissionsContractInput,
): MondayAdmissionsSourceContractParseResult {
  const normalizedBody = normalizeMondayUpdateBody(input.body);

  if (looksLikeTauReport(normalizedBody)) {
    return buildTauContract(input.provenance, input.body, normalizedBody);
  }

  if (looksLikeHaifaReport(normalizedBody)) {
    return buildHaifaContract(input.provenance, input.body, normalizedBody);
  }

  if (looksLikeReichmanReport(normalizedBody)) {
    return buildReviewedPartialContract({
      provenance: input.provenance,
      rawBody: input.body,
      institutionId: 'reichman',
      institutionName: 'Reichman University',
      officialUrl: REICHMAN_PAGE,
      reproducedFields: ['adaptedScore'],
      fieldEvidence: [
        {
          contractField: 'adaptedScore',
          sourceField: '4.812 * bagrut + 0.5131 * psychometric - 163.19',
        },
      ],
      limitations: [
        'Client-side adapted-score formula was reviewed, but no live threshold endpoint was reproduced.',
      ],
      nextAction:
        'Pair reviewed adapted-score formula with reviewed program thresholds for estimated results.',
    });
  }

  if (looksLikeAfekaReport(normalizedBody)) {
    return buildReviewedPartialContract({
      provenance: input.provenance,
      rawBody: input.body,
      institutionId: 'afeka',
      institutionName: 'Afeka College of Engineering',
      officialUrl: AFEKA_PAGE,
      reproducedFields: ['sekhemScore', 'subjectGates'],
      fieldEvidence: [
        {
          contractField: 'sekhemScore',
          notes:
            'Subject-weighted formula combines bagrut with math, English, physics, and CS subjects.',
        },
        {
          contractField: 'subjectGates',
          notes: 'Reviewed math, English, and psychometric gate requirements.',
        },
      ],
      limitations: [
        'Subject gates require landing-page inputs that may be missing from the generic calculator flow.',
      ],
      nextAction:
        'Collect missing subject inputs or emit needs-input when required fields are absent.',
    });
  }

  if (looksLikeHitReport(normalizedBody)) {
    return buildReviewedPartialContract({
      provenance: input.provenance,
      rawBody: input.body,
      institutionId: 'hit',
      institutionName: 'HIT - Holon Institute of Technology',
      officialUrl: HIT_PAGE,
      reproducedFields: ['bagrutAverage', 'departmentGates'],
      fieldEvidence: [
        {
          contractField: 'bagrutAverage',
          notes: 'Reviewed client-side Bagrut-average optimizer output.',
        },
        {
          contractField: 'departmentGates',
          notes: 'Reviewed department-specific math and psychometric gates for technical programs.',
        },
      ],
      limitations: [
        'Engineering programs can be estimated with minimum floors; design programs remain manual-gate.',
      ],
      nextAction:
        'Use minimum-floor estimation for technical programs and manual-gate evidence for design programs.',
    });
  }

  if (looksLikeShenkarReport(normalizedBody)) {
    return buildReviewedPartialContract({
      provenance: input.provenance,
      rawBody: input.body,
      institutionId: 'shenkar',
      institutionName: 'Shenkar - Engineering. Design. Art',
      officialUrl: SHENKAR_PAGE,
      reproducedFields: ['bagrutAverage'],
      fieldEvidence: [
        {
          contractField: 'bagrutAverage',
          notes: 'Calculator evidence is limited to Bagrut-average helper behavior.',
        },
      ],
      limitations: [
        'No combined psychometric formula exists; design/art departments require portfolio, exam, and interview gates.',
      ],
      nextAction: 'Represent as manual-gate evidence; do not model as a normal sekhem calculator.',
    });
  }

  if (looksLikeMtaReport(normalizedBody)) {
    return buildReviewedPartialContract({
      provenance: input.provenance,
      rawBody: input.body,
      institutionId: 'mta',
      institutionName: 'MTA - Academic College of Tel Aviv-Yaffo',
      officialUrl: MTA_PAGE,
      reproducedFields: [],
      fieldEvidence: [],
      limitations: [
        'Only requirements enrichment data is available; no reverse-engineered calculator formula was parsed.',
      ],
      nextAction:
        'Reverse-engineer the secondary calculator link or represent as requirements-only.',
    });
  }

  return {
    ok: false,
    error: {
      code: 'unsupported_report',
      message: 'Only the reviewed admissions reverse-engineering report formats are supported.',
    },
  };
}

export function mapMondayAdmissionsSourceContract(
  contract: MondayAdmissionsSourceContract,
): MondayAdmissionsSourceMappingResult {
  const targets =
    contract.institutionId === 'haifa'
      ? admissionsSourceTargets.filter((target) => target.id === 'haifa-cs-live')
      : admissionsSourceTargets;
  const matches = targets.filter(
    (target) =>
      target.institutionId === contract.institutionId &&
      target.expectedCapability === contract.capability &&
      target.reproducedFields.every((field) =>
        contract.reproducedFields.includes(field as MondayAdmissionsReproducedField),
      ),
  );

  if (matches.length !== 1) {
    return {
      ok: false,
      error: {
        code: 'target_mismatch',
        message: `Unable to resolve a unique admissions source target for ${contract.institutionName}.`,
      },
    };
  }

  const [target] = matches;
  const sourceDescriptor: IngestionSourceDescriptor = {
    id: target.id,
    institutionId: target.institutionId,
    programId: target.defaultProgram?.id,
    difficulty: difficultyForTarget(target),
    sourceUrl: contract.sourceCandidateUrl,
    notes: buildDescriptorNotes(contract, target),
  };

  return {
    ok: true,
    mapping: {
      target,
      sourceDescriptor,
      reviewableEvidence: {
        evidenceKind: 'monday_reverse_engineering_report',
        publicationBoundary: 'reviewable_evidence_only',
        targetId: target.id,
        sourceCandidateUrl: contract.sourceCandidateUrl,
        officialUrl: contract.officialUrl,
        requestMethod: contract.requestMethod,
        capability: contract.capability,
        reproducedFields: contract.reproducedFields,
        fieldEvidence: contract.fieldEvidence,
        limitations: contract.limitations,
        nextAction: contract.nextAction,
        provenance: contract.provenance,
      },
      publicationBoundary: 'reviewable_evidence_only',
      canonicalPublicationTables: [],
    },
  };
}

function buildTauContract(
  provenance: MondayAdmissionsContractProvenance,
  rawBody: string,
  normalizedBody: string,
): MondayAdmissionsSourceContractParseResult {
  const requestMethod = extractMethod(normalizedBody);
  if (!requestMethod) {
    return missingMethod('TAU');
  }

  const officialUrl = extractPrimaryEndpoint(normalizedBody);
  if (!officialUrl) {
    return missingEndpoint('TAU');
  }

  const sourceCandidateUrl = provenance.sourceCandidateUrl ?? TAU_ENDPOINT;
  if (!sourceCandidateUrl) {
    return missingSourceCandidateUrl('TAU');
  }

  const scoreFields = collectCodeFields(normalizedBody).filter((field) =>
    field.startsWith('hatama'),
  );
  if (!scoreFields.includes('hatama_handasa')) {
    return {
      ok: false,
      error: {
        code: 'ambiguous_report',
        message: 'The TAU report did not preserve the expected engineering score field mapping.',
      },
    };
  }

  return {
    ok: true,
    contract: {
      kind: 'monday_reverse_engineering_report',
      institutionId: 'tau',
      institutionName: 'Tel Aviv University',
      sourceCandidateUrl,
      officialUrl,
      requestMethod,
      capability: 'decision_capable',
      reproducedFields: ['selectedScore', 'acceptanceThreshold', 'rejectionThreshold'],
      fieldEvidence: [
        {
          contractField: 'selectedScore',
          sourceField: 'hatama_handasa',
          notes: `Available score fields: ${scoreFields.join(', ')}`,
        },
        {
          contractField: 'acceptanceThreshold',
          sourceField: 'field_this_year_receipt_threshol',
        },
        {
          contractField: 'rejectionThreshold',
          sourceField: 'field_this_year_rejection_thresh',
        },
      ],
      limitations: ['Representative program only; faculty score-field mapping needs expansion'],
      nextAction:
        'Map the TAU report to the representative Digital Sciences target before review handoff',
      provenance,
      rawBody,
    },
  };
}

function buildHaifaContract(
  provenance: MondayAdmissionsContractProvenance,
  rawBody: string,
  normalizedBody: string,
): MondayAdmissionsSourceContractParseResult {
  const requestMethod = extractMethod(normalizedBody);
  if (!requestMethod) {
    return missingMethod('Haifa');
  }

  const officialUrl = extractPrimaryEndpoint(normalizedBody);
  if (!officialUrl) {
    return missingEndpoint('Haifa');
  }

  const sourceCandidateUrl =
    provenance.sourceCandidateUrl ?? extractCalculatorPage(normalizedBody) ?? HAIFA_PAGE;
  if (!sourceCandidateUrl) {
    return missingSourceCandidateUrl('Haifa');
  }

  return {
    ok: true,
    contract: {
      kind: 'monday_reverse_engineering_report',
      institutionId: 'haifa',
      institutionName: 'University of Haifa',
      sourceCandidateUrl,
      officialUrl,
      requestMethod,
      capability: 'decision_capable',
      reproducedFields: ['weightedScore', 'acceptanceCutoff', 'rejectionCutoff'],
      fieldEvidence: [
        {
          contractField: 'weightedScore',
          sampleValue: extractHaifaSampleValue(normalizedBody, 'הציון המשוקלל שלך'),
        },
        {
          contractField: 'acceptanceCutoff',
          sampleValue: extractHaifaSampleValue(normalizedBody, 'חתך קבלה'),
        },
        {
          contractField: 'rejectionCutoff',
          sampleValue: extractHaifaSampleValue(normalizedBody, 'חתך דחייה'),
        },
      ],
      limitations: ['Representative program only; broad Haifa program coverage is deferred'],
      nextAction:
        'Map the Haifa report to the representative Computer Science target before review handoff',
      provenance,
      rawBody,
    },
  };
}

function buildReviewedPartialContract(args: {
  provenance: MondayAdmissionsContractProvenance;
  rawBody: string;
  institutionId: string;
  institutionName: string;
  officialUrl: string;
  reproducedFields: MondayAdmissionsReproducedField[];
  fieldEvidence: MondayAdmissionsContractFieldEvidence[];
  limitations: string[];
  nextAction: string;
}): MondayAdmissionsSourceContractParseResult {
  return {
    ok: true,
    contract: {
      kind: 'monday_reverse_engineering_report',
      institutionId: args.institutionId,
      institutionName: args.institutionName,
      sourceCandidateUrl: args.provenance.sourceCandidateUrl ?? args.officialUrl,
      officialUrl: args.officialUrl,
      requestMethod: 'GET',
      capability: 'score_only',
      reproducedFields: args.reproducedFields,
      fieldEvidence: args.fieldEvidence,
      limitations: args.limitations,
      nextAction: args.nextAction,
      provenance: args.provenance,
      rawBody: args.rawBody,
    },
  };
}

function normalizeMondayUpdateBody(body: string): string {
  return decodeHtmlEntities(
    body
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<li>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function looksLikeTauReport(body: string): boolean {
  return body.includes(TAU_ENDPOINT) && body.includes('getLastScore');
}

function looksLikeHaifaReport(body: string): boolean {
  return body.includes(HAIFA_ENDPOINT) && body.includes('University of Haifa');
}

function looksLikeReichmanReport(body: string): boolean {
  return (
    includesAny(body, ['Reichman', 'רייכמן', 'runi.ac.il']) &&
    body.includes('4.812') &&
    body.includes('0.5131')
  );
}

function looksLikeAfekaReport(body: string): boolean {
  return (
    includesAny(body, ['Afeka', 'אפקה', 'afeka.ac.il']) &&
    includesAny(body, ['Subject-weighted', 'subject gates', 'Math Minimum', 'פסיכומטרי לפחות 550'])
  );
}

function looksLikeHitReport(body: string): boolean {
  return (
    includesAny(body, ['HIT', 'Holon', 'calc.hit.ac.il']) &&
    includesAny(body, ['Department', 'department', 'Math Deficit', 'minimum floors'])
  );
}

function looksLikeShenkarReport(body: string): boolean {
  return (
    includesAny(body, ['Shenkar', 'שנקר', 'shenkar.ac.il']) &&
    includesAny(body, ['Bagrut Average', 'ממוצע בגרות']) &&
    includesAny(body, ['no combined psychometric', 'no psychometric score combined formula'])
  );
}

function looksLikeMtaReport(body: string): boolean {
  return includesAny(body, [
    'conditions_for_applying',
    'Academic College of Tel Aviv-Yaffo',
    'mta.ac.il',
  ]);
}

function includesAny(body: string, values: string[]): boolean {
  return values.some((value) => body.includes(value));
}

function extractPrimaryEndpoint(body: string): string | undefined {
  return body.match(/\*\*Primary API Endpoint\*\*:\s*`([^`]+)`/)?.[1];
}

function extractMethod(body: string): 'GET' | 'POST' | undefined {
  const method = body.match(/\*\*Method\*\*:\s*`(GET|POST)`/i)?.[1]?.toUpperCase();
  return method === 'GET' || method === 'POST' ? method : undefined;
}

function extractCalculatorPage(body: string): string | undefined {
  return body.match(/\*\*Calculator Page\*\*:\s*(https?:\/\/\S+)/)?.[1];
}

function collectCodeFields(body: string): string[] {
  return Array.from(new Set(Array.from(body.matchAll(/`([a-z0-9_.-]+)`/gi), (match) => match[1])));
}

function extractHaifaSampleValue(body: string, label: string): number | undefined {
  const escapedLabel = escapeRegExp(label);
  const match = body.match(
    new RegExp(`"label":\\s*"${escapedLabel}"[\\s\\S]*?"value":\\s*"([^"]+)"`, 'u'),
  );
  const value = match?.[1];
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function difficultyForTarget(target: AdmissionsSourceTarget): IngestionSourceDifficulty {
  if (target.category === 'blocked') {
    return 'browser_required';
  }

  if (
    target.category === 'partial' ||
    target.category === 'static_candidate' ||
    target.category === 'manual_gate' ||
    target.category === 'requirements_only'
  ) {
    return 'hard_manual';
  }

  return 'easy';
}

function buildDescriptorNotes(
  contract: MondayAdmissionsSourceContract,
  target: AdmissionsSourceTarget,
): string {
  return [
    contract.institutionName,
    'monday reverse engineering report',
    `target=${target.id}`,
    `update=${contract.provenance.updateId}`,
    contract.limitations.length > 0 ? contract.limitations.join('; ') : undefined,
  ]
    .filter(Boolean)
    .join(' | ');
}

function missingMethod(institution: string): MondayAdmissionsSourceContractParseResult {
  return {
    ok: false,
    error: {
      code: 'missing_method',
      message: `${institution} report is missing the HTTP method.`,
    },
  };
}

function missingEndpoint(institution: string): MondayAdmissionsSourceContractParseResult {
  return {
    ok: false,
    error: {
      code: 'missing_endpoint',
      message: `${institution} report is missing the primary API endpoint.`,
    },
  };
}

function missingSourceCandidateUrl(institution: string): MondayAdmissionsSourceContractParseResult {
  return {
    ok: false,
    error: {
      code: 'missing_source_candidate_url',
      message: `${institution} report is missing a source candidate URL and no fallback was provided.`,
    },
  };
}
