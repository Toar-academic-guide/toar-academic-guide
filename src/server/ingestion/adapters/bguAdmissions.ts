import { isBguQuantitativeRouteProgram } from '@/lib/calculatorInputRequirements';
import { runBguQuantitativeRoutesProof } from './bguQuantitativeRoutes';
import { isBguPsychologyProgram } from '@/lib/bguPsychologyInputs';
import { runBguPsychologyProof } from './bguPsychology';
import { bguSocialScienceProgram } from '@/lib/bguSocialScienceInputs';
import { runBguSocialScienceProof } from './bguSocialScience';
import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';
import type {
  AdmissionsExtraInputs,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import {
  BGU_PROGRAM_VERIFICATION_METADATA,
  BGU_SCORE_URL,
  getBguProgramConfig,
} from '@/data/admissions/bguProgramVerification';
import {
  BGU_COMPUTER_SCIENCE_CALCULATOR_URL,
  BGU_COMPUTER_SCIENCE_SCORE_URL,
  BGU_COMPUTER_SCIENCE_SOURCE_URL,
  fingerprintBguComputerScienceRules,
  normalizeBguComputerScienceRule,
} from '@/data/admissions/bguComputerScienceVerification';
import { evaluateBguComputerScienceGates } from '@/server/admissions/bguComputerSciencePolicy';
import { isBguEngineeringProgram } from '@/server/admissions/bguEngineeringPolicy';
import { runBguEngineeringAdmissionsProof } from './bguEngineeringAdmissions';

const BGU_INDEX_URL = 'https://bgu4u.bgu.ac.il/html/average_calc/index.php';

export async function runBguAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program;
  if (!program) {
    throw new Error('BGU adapter requires a program context');
  }

  if (isBguQuantitativeRouteProgram(program.id)) {
    return runBguQuantitativeRoutesProof({ ...context, program });
  }
  if (isBguEngineeringProgram(program.id)) return runBguEngineeringAdmissionsProof(context);

  if (isBguPsychologyProgram(program.id)) return runBguPsychologyProof(context);
  if (bguSocialScienceProgram(program.id)) return runBguSocialScienceProof(context);
  if (
    BGU_PROGRAM_VERIFICATION_METADATA[`${program.id}__bgu`]?.contract.calculation.formulaFamily ===
    'bgu_quantitative_sekhem'
  ) {
    return runBguComputerScienceProof(context);
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

export interface BguComputerScienceFixtureComparison {
  fixtureId: string;
  expectedScore: number;
  actualScore: number | null;
  expectedVerdict: 'accepted' | 'below' | 'eligible_to_apply';
  actualVerdict: 'accepted' | 'below' | 'eligible_to_apply' | null;
  expectedSourceFingerprint: string;
  actualSourceFingerprint: string | null;
  scoreMatches: boolean;
  verdictMatches: boolean;
  sourceFingerprintMatches: boolean;
}

export interface BguComputerScienceLiveVerificationReport {
  pairId: string;
  checkedAt: string;
  passed: boolean;
  comparisons: BguComputerScienceFixtureComparison[];
}

async function runBguComputerScienceProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const program = context.program!;
  const contract = BGU_PROGRAM_VERIFICATION_METADATA[`${program.id}__bgu`].contract;
  const sourceUrl = contract.source.url;
  const reviewedFingerprint = contract.sourceFingerprint;
  const officialProgramId = contract.officialProgramId;
  const specialization = officialProgramId === 'dep232-pat1-spe13' ? 13 : 3;
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const applicant = context.applicant;
  const extraInputs = applicant.extraInputs;
  const applicantInputs = validateBguComputerScienceInputs(applicant, extraInputs);
  if (!applicantInputs) {
    return failedComputerScienceProof(
      program,
      metadata,
      'BGU quantitative-route requires valid psychometric, component scores, official Bagrut average, mathematics record, and language confirmation.',
    );
  }

  if (program.searchText !== sourceUrl) {
    return failedComputerScienceProof(
      program,
      metadata,
      'BGU quantitative-route target does not match the reviewed quantitative programme mapping.',
    );
  }
  if (program.pairId !== `${program.id}__bgu` || program.externalId !== officialProgramId) {
    return failedComputerScienceProof(
      program,
      metadata,
      'BGU quantitative-route target does not match the reviewed pair and official programme identifier.',
    );
  }

  try {
    const sourceResponse = await (context.fetcher ?? fetch)(sourceUrl);
    metadata.push(readOfficialResponseMetadata(sourceUrl, sourceResponse));
    if (!sourceResponse.ok) {
      throw new Error(`BGU conditions endpoint returned HTTP ${sourceResponse.status}`);
    }

    const sourcePayload = (await sourceResponse.json()) as unknown;
    const ruleSnapshot = normalizeBguComputerScienceRule(sourcePayload, specialization);
    if (!ruleSnapshot) {
      throw new Error(
        'BGU quantitative-route conditions response has an invalid programme mapping or missing rule fields',
      );
    }

    const currentSourceFingerprint = fingerprintBguComputerScienceRules(ruleSnapshot);
    if (currentSourceFingerprint !== reviewedFingerprint) {
      return partialComputerScienceProof({
        program,
        metadata,
        currentSourceFingerprint,
        acceptanceThreshold: ruleSnapshot.acceptanceThreshold,
        reason:
          'BGU quantitative-route critical source rules changed and require review before exact decisions can resume.',
      });
    }

    const params = new URLSearchParams({
      on_grade_psycho_quantity: '',
      rn_count_other_subjects: '0',
      on_grade_other_quantity: String(applicantInputs.quantitative),
      on_grade_other_verbal: String(applicantInputs.verbal),
      on_grade_other_psycho: String(applicantInputs.english),
      on_grade_other_average: String(applicantInputs.bagrutAverage),
      on_grade_prep_average: '',
    });
    const scoreResponse = await (context.fetcher ?? fetch)(BGU_COMPUTER_SCIENCE_SCORE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: BGU_COMPUTER_SCIENCE_CALCULATOR_URL,
      },
      body: params.toString(),
    });
    metadata.push(readOfficialResponseMetadata(BGU_COMPUTER_SCIENCE_SCORE_URL, scoreResponse));
    if (!scoreResponse.ok) {
      throw new Error(`BGU quantitative score endpoint returned HTTP ${scoreResponse.status}`);
    }

    const html = await scoreResponse.text();
    const selectedScore = parseBguComputerScienceScore(html);
    if (selectedScore === undefined) {
      throw new Error('BGU quantitative endpoint did not return a numeric on_c_val score');
    }

    const acceptanceThreshold = ruleSnapshot.acceptanceThreshold;
    const derivedVerdict = selectedScore >= acceptanceThreshold ? 'accepted' : 'below';
    return {
      id: program.targetId ?? `bgu-${program.id}-live`,
      institutionId: 'bgu',
      institutionName: 'Ben-Gurion University',
      officialUrl: sourceUrl,
      adapterId: 'bgu',
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: reviewedFingerprint,
      sourceClass: sourceClassForCapability('decision_capable'),
      reproducedFields: [
        'selectedScore',
        'acceptanceThreshold',
        'derivedVerdict',
        'sourceFingerprint',
      ],
      normalizedPayload: {
        pairId: program.pairId,
        programId: program.id,
        programName: program.name,
        officialProgramId: officialProgramId,
        source: 'bgu_quantitative_rdp_and_TevaSekem',
        selectedScore,
        acceptanceThreshold,
        rejectionThreshold: acceptanceThreshold,
        derivedVerdict,
        sourceFingerprint: currentSourceFingerprint,
        reviewedSourceFingerprint: reviewedFingerprint,
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
      },
      limitations: [],
      nextAction:
        'Keep the current programme mapping, quantitative gates, two verdict fixtures, and live source fingerprint under review.',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedComputerScienceProof(
      program,
      metadata,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function validateBguComputerScienceInputs(
  applicant: AdmissionsAdapterContext['applicant'],
  extraInputs: AdmissionsExtraInputs | undefined,
): { bagrutAverage: number; quantitative: number; verbal: number; english: number } | null {
  const average = extraInputs?.bguBagrutAverage;
  const quantitative = extraInputs?.psychometricMath;
  const verbal = extraInputs?.psychometricVerbal;
  const english = extraInputs?.psychometricEnglish;
  const subjectRecord = extraInputs?.bagrutSubjectRecord;
  const languageRequirementsConfirmed = extraInputs?.bguLanguageRequirementsConfirmed === true;
  const validInteger = (value: unknown, min: number, max: number): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
  const validAverage = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 50 && value <= 130;

  if (
    !validInteger(applicant.psychometric, 200, 800) ||
    !validAverage(average) ||
    !validInteger(quantitative, 50, 150) ||
    !validInteger(verbal, 50, 150) ||
    !validInteger(english, 50, 150) ||
    !isValidBguComputerScienceSubjectRecord(subjectRecord) ||
    !languageRequirementsConfirmed
  ) {
    return null;
  }

  const gateResult = evaluateBguComputerScienceGates({
    psychometric: applicant.psychometric,
    quantitativeSubscore: quantitative,
    subjects: subjectRecord.subjects,
    languageRequirementsConfirmed,
  });
  if (!gateResult.eligibleForScoreComparison) return null;

  return { bagrutAverage: average, quantitative, verbal, english };
}

function isValidBguComputerScienceSubjectRecord(
  value: unknown,
): value is NonNullable<AdmissionsExtraInputs['bagrutSubjectRecord']> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const validSectors = new Set(['jewish', 'arab', 'druze', 'circassian', 'bedouin', 'samaritan']);
  if (
    record.schemaVersion !== 1 ||
    typeof record.sector !== 'string' ||
    !validSectors.has(record.sector) ||
    !Array.isArray(record.subjects)
  ) {
    return false;
  }
  return record.subjects.every((subject) => {
    if (!subject || typeof subject !== 'object') return false;
    const item = subject as Record<string, unknown>;
    return (
      typeof item.subjectId === 'string' &&
      item.subjectId.trim().length > 0 &&
      typeof item.units === 'number' &&
      Number.isInteger(item.units) &&
      item.units >= 1 &&
      item.units <= 5 &&
      typeof item.grade === 'number' &&
      Number.isInteger(item.grade) &&
      item.grade >= 0 &&
      item.grade <= 100
    );
  });
}

function parseBguComputerScienceScore(html: string): number | undefined {
  const matches = Array.from(
    html.matchAll(
      /getElementById\(\s*(["'])on_c_val\1\s*\)\s*\.innerHTML\s*=\s*(["']?)(\d+(?:\.\d+)?)\2\s*;?/g,
    ),
  );
  if (matches.length !== 1) return undefined;
  const value = Number(matches[0][3]);
  return Number.isFinite(value) ? value : undefined;
}

function failedComputerScienceProof(
  program: NonNullable<AdmissionsAdapterContext['program']>,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
  reason: string,
): AdmissionsSourceProof {
  return {
    id: program.targetId ?? `bgu-${program.id}-live`,
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: program.searchText ?? BGU_COMPUTER_SCIENCE_SOURCE_URL,
    adapterId: 'bgu',
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'failed',
    sourceClass: 'browser_required',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: [
      'BGU quantitative-route proof is blocked until all current programme and applicant fields validate.',
    ],
    nextAction:
      'Resolve the BGU quantitative-route input or source rule issue, then repeat the controlled proof.',
    blockedReason: reason,
    errorReason: reason,
    rawResponseMetadata: metadata,
  };
}

function partialComputerScienceProof(args: {
  program: NonNullable<AdmissionsAdapterContext['program']>;
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>;
  currentSourceFingerprint: string;
  acceptanceThreshold: number;
  reason: string;
}): AdmissionsSourceProof {
  return {
    id: args.program.targetId ?? `bgu-${args.program.id}-live`,
    institutionId: 'bgu',
    institutionName: 'Ben-Gurion University',
    officialUrl: args.program.searchText ?? BGU_COMPUTER_SCIENCE_SOURCE_URL,
    adapterId: 'bgu',
    capability: 'score_only',
    proofLevel: 'partial_official',
    status: 'partial',
    sourceClass: sourceClassForCapability('score_only'),
    reproducedFields: ['acceptanceThreshold', 'sourceFingerprint'],
    normalizedPayload: {
      pairId: args.program.pairId,
      programId: args.program.id,
      officialProgramId: args.program.externalId,
      acceptanceThreshold: args.acceptanceThreshold,
      sourceFingerprint: args.currentSourceFingerprint,
      reviewedSourceFingerprint:
        BGU_PROGRAM_VERIFICATION_METADATA[`${args.program.id}__bgu`].contract.sourceFingerprint,
      proofStatus: 'partial',
      proofLevel: 'partial_official',
      decisionProvenance: 'none',
    },
    limitations: [args.reason],
    nextAction:
      'Review the changed official quantitative rule snapshot and capture new fixtures before exact decisions resume.',
    rawResponseMetadata: args.metadata,
  };
}

export async function runBguComputerScienceLiveVerification(
  args: {
    fetcher?: typeof fetch;
    checkedAt?: Date;
    pairId?: 'cs__bgu' | 'bgu_cs__bgu' | 'datascience__bgu' | 'bgu_datascience__bgu';
  } = {},
): Promise<BguComputerScienceLiveVerificationReport> {
  const pairId = args.pairId ?? 'bgu_cs__bgu';
  const artifact = BGU_PROGRAM_VERIFICATION_METADATA[pairId];
  if (!artifact)
    throw new Error(`Missing BGU Computer Science verification artifact for ${pairId}`);
  const comparisons: BguComputerScienceFixtureComparison[] = [];

  for (const fixture of artifact.fixtures as AdmissionsVerificationFixture[]) {
    const { psychometric, bagrut, ...extraInputs } = fixture.input;
    const proof = await runBguComputerScienceProof({
      fetcher: args.fetcher,
      program: {
        targetId: artifact.contract.source.targetId,
        pairId: artifact.contract.pairId,
        id: artifact.contract.programId,
        name: 'Computer Science',
        externalId: artifact.contract.officialProgramId,
        searchText: artifact.contract.source.url,
      },
      applicant: {
        psychometric,
        bagrutAverage: bagrut,
        extraInputs: extraInputs as AdmissionsExtraInputs,
      },
    });
    const payload = proof.normalizedPayload;
    const actualScore = numericValue(payload.selectedScore);
    const actualVerdict =
      payload.derivedVerdict === 'accepted' ||
      payload.derivedVerdict === 'below' ||
      payload.derivedVerdict === 'eligible_to_apply'
        ? payload.derivedVerdict
        : null;
    const actualSourceFingerprint =
      typeof payload.sourceFingerprint === 'string' ? payload.sourceFingerprint : null;
    comparisons.push({
      fixtureId: fixture.id,
      expectedScore: fixture.expected.score,
      actualScore: actualScore ?? null,
      expectedVerdict: fixture.expected.verdict,
      actualVerdict,
      expectedSourceFingerprint: artifact.contract.sourceFingerprint,
      actualSourceFingerprint,
      scoreMatches: actualScore === fixture.expected.score,
      verdictMatches: actualVerdict === fixture.expected.verdict,
      sourceFingerprintMatches: actualSourceFingerprint === artifact.contract.sourceFingerprint,
    });
  }

  return {
    pairId,
    checkedAt: (args.checkedAt ?? new Date()).toISOString(),
    passed: comparisons.every(
      (comparison) =>
        comparison.scoreMatches && comparison.verdictMatches && comparison.sourceFingerprintMatches,
    ),
    comparisons,
  };
}

function numericValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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
