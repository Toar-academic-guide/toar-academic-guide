import { createHash } from 'node:crypto';

import type { AdmissionsSourceProof } from '@/server/ingestion/admissionsSourceAdapters';
import {
  FORMULA_BACKED_VERIFICATION_LEDGER,
  type FormulaPairVerificationLedgerEntry,
} from '@/data/admissions/formulaBackedVerificationLedger';

import type { ReviewedAdmissionsManifest } from './reviewedManifest';

export interface PublishedAdmissionRule {
  target: { institutionId: string; programId: string; cycle: string };
  ruleKind: 'admission_cutoff';
  value: number;
}

export type AdmissionsReviewExclusionReason =
  | 'proof_not_decision_capable'
  | 'missing_program_or_cutoff'
  | 'pair_verification_incomplete'
  | 'no_reviewed_baseline'
  | 'unchanged'
  | 'reviewer_excluded';

export interface AdmissionsReviewExclusion {
  sourceProofId: string;
  institutionName: string;
  reason: AdmissionsReviewExclusionReason;
  detail: string;
  sourceUrl: string;
}

export interface AdmissionsReviewCandidate {
  id: string;
  target: PublishedAdmissionRule['target'];
  ruleKind: 'admission_cutoff';
  before: number;
  after: number;
  sourceProof: ReviewedAdmissionsManifest['changes'][number]['sourceProofs'][number];
  institutionName: string;
}

export interface AdmissionsReviewRun {
  runKey: string;
  checkedAt: string;
  releaseKind: ReviewedAdmissionsManifest['releaseKind'];
  proofScenario: string | null;
  summary: {
    status: 'no_changes' | 'reviewable';
    candidateCount: number;
    excludedCount: number;
    freshCount: number;
    blockedCount: number;
    failedCount: number;
  };
  candidates: AdmissionsReviewCandidate[];
  excluded: AdmissionsReviewExclusion[];
  reviewMetadata: AdmissionsReviewRunMetadata;
  manifest: ReviewedAdmissionsManifest;
  markdown: string;
}

export interface AdmissionsReviewRunMetadata {
  version: 1;
  runKey: string;
  excludedCandidateIds: string[];
}

export interface AdmissionsReviewSlackMessage {
  text: string;
  blocks: Array<Record<string, unknown>>;
}

export function buildAdmissionsReviewRun(input: {
  runKey: string;
  checkedAt: Date;
  cycle: string;
  baseline: PublishedAdmissionRule[];
  proofs: AdmissionsSourceProof[];
  releaseKind?: ReviewedAdmissionsManifest['releaseKind'];
  proofScenario?: string;
  excludedCandidateIds?: string[];
  verificationLedger?: readonly FormulaPairVerificationLedgerEntry[];
}): AdmissionsReviewRun {
  const releaseKind = input.releaseKind ?? 'canonical_change';
  const baselineByTarget = new Map(
    input.baseline.map((rule) => [ruleKey(rule.target, rule.ruleKind), rule]),
  );
  const candidates: Array<{ candidate: AdmissionsReviewCandidate; proof: AdmissionsSourceProof }> =
    [];
  const excluded: AdmissionsReviewExclusion[] = [];

  for (const proof of input.proofs) {
    const programId = stringValue(proof.normalizedPayload.programId);
    const cutoff = numberValue(
      proof.normalizedPayload.acceptanceThreshold ?? proof.normalizedPayload.acceptanceCutoff,
    );

    if (
      proof.capability !== 'decision_capable' ||
      proof.proofLevel !== 'exact_official' ||
      proof.status !== 'succeeded'
    ) {
      excluded.push(exclusion(proof, 'proof_not_decision_capable'));
      continue;
    }
    if (!programId || cutoff === undefined) {
      excluded.push(exclusion(proof, 'missing_program_or_cutoff'));
      continue;
    }
    const pairId =
      stringValue(proof.normalizedPayload.pairId) ?? `${programId}__${proof.institutionId}`;
    const pairVerification = (input.verificationLedger ?? FORMULA_BACKED_VERIFICATION_LEDGER).find(
      (entry) => entry.pairId === pairId,
    );
    if (pairVerification?.state !== 'exact') {
      excluded.push(exclusion(proof, 'pair_verification_incomplete'));
      continue;
    }

    const target = { institutionId: proof.institutionId, programId, cycle: input.cycle };
    const current = baselineByTarget.get(ruleKey(target, 'admission_cutoff'));
    if (!current) {
      excluded.push(exclusion(proof, 'no_reviewed_baseline'));
      continue;
    }
    if (current.value === cutoff && releaseKind !== 'canonical_bootstrap') {
      excluded.push(exclusion(proof, 'unchanged'));
      continue;
    }

    candidates.push({
      candidate: {
        id: `${proof.id}:admission_cutoff`,
        target,
        ruleKind: 'admission_cutoff',
        before: current.value,
        after: cutoff,
        sourceProof: {
          sourceId: proof.id,
          digest: digest(stableJson(proof.normalizedPayload)),
          excerpt: safeExcerpt(proof, cutoff),
          url: proof.officialUrl,
          proofType: 'exact_official',
        },
        institutionName: proof.institutionName,
      },
      proof,
    });
  }

  candidates.sort((left, right) =>
    candidateKey(left.candidate).localeCompare(candidateKey(right.candidate)),
  );
  const requestedExclusions = new Set(input.excludedCandidateIds ?? []);
  const includedCandidates: AdmissionsReviewCandidate[] = [];
  const acceptedExcludedCandidateIds: string[] = [];
  for (const { candidate, proof } of candidates) {
    if (requestedExclusions.has(candidate.id)) {
      acceptedExcludedCandidateIds.push(candidate.id);
      excluded.push({
        sourceProofId: proof.id,
        institutionName: proof.institutionName,
        reason: 'reviewer_excluded',
        detail: `A reviewer excluded candidate ${candidate.id} from the generated admissions update.`,
        sourceUrl: proof.officialUrl,
      });
      continue;
    }
    includedCandidates.push(candidate);
  }
  excluded.sort((left, right) => left.sourceProofId.localeCompare(right.sourceProofId));

  const manifest: ReviewedAdmissionsManifest = {
    version: 2,
    releaseKind,
    ...(input.proofScenario ? { proofScenario: input.proofScenario } : {}),
    changes: includedCandidates.map((candidate) => ({
      target: candidate.target,
      ruleKind: candidate.ruleKind,
      before: candidate.before,
      after: candidate.after,
      effectiveFrom: input.checkedAt.toISOString().slice(0, 10),
      sourceProofs: [candidate.sourceProof],
    })),
  };
  const summary = {
    status: includedCandidates.length > 0 ? ('reviewable' as const) : ('no_changes' as const),
    candidateCount: includedCandidates.length,
    excludedCount: excluded.length,
    freshCount: excluded.filter((item) => item.reason === 'unchanged').length,
    blockedCount: input.proofs.filter((proof) => proof.status === 'blocked').length,
    failedCount: input.proofs.filter((proof) => proof.status === 'failed').length,
  };
  const reviewMetadata: AdmissionsReviewRunMetadata = {
    version: 1,
    runKey: input.runKey,
    excludedCandidateIds: acceptedExcludedCandidateIds,
  };
  const run = {
    runKey: input.runKey,
    checkedAt: input.checkedAt.toISOString(),
    releaseKind,
    proofScenario: input.proofScenario ?? null,
    summary,
    candidates: includedCandidates,
    excluded,
    reviewMetadata,
    manifest,
    markdown: '',
  } satisfies Omit<AdmissionsReviewRun, 'markdown'> & { markdown: string };

  return { ...run, markdown: buildAdmissionsReviewMarkdown(run) };
}

export function buildAdmissionsReviewSlackMessage(
  run: AdmissionsReviewRun,
  options: { pullRequestUrl?: string } = {},
): AdmissionsReviewSlackMessage {
  const headline =
    run.summary.status === 'reviewable'
      ? `Admissions review ${run.runKey}: ${run.summary.candidateCount} change${plural(run.summary.candidateCount)} ready for review`
      : `Admissions review ${run.runKey}: no reviewable changes`;
  const prLine = options.pullRequestUrl
    ? `<${options.pullRequestUrl}|Open the combined admissions review PR>`
    : 'No review PR was created.';
  const detail = [
    `${run.summary.candidateCount} included`,
    `${run.summary.excludedCount} excluded`,
    `${run.summary.freshCount} unchanged`,
    `${run.summary.blockedCount} blocked`,
    `${run.summary.failedCount} failed`,
  ].join(' • ');

  return {
    text: `${headline}. ${options.pullRequestUrl ?? 'No review PR was created.'}`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${escapeSlack(headline)}*\n${prLine}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: escapeSlack(detail) },
      },
    ],
  };
}

export function buildAdmissionsReviewMarkdown(run: Omit<AdmissionsReviewRun, 'markdown'>): string {
  const lines = [
    `# Admissions review run ${run.runKey}`,
    '',
    `Checked at: ${run.checkedAt}`,
    `Status: ${run.summary.status}`,
    '',
    '## Included changes',
    '',
  ];

  if (run.candidates.length === 0) {
    lines.push('No safe, reviewable admissions changes were detected.');
  } else {
    for (const candidate of run.candidates) {
      lines.push(
        `- **${safeText(candidate.institutionName)} / ${candidate.target.programId}** — ${candidate.before} → ${candidate.after}`,
      );
      lines.push(`  - Candidate id: ${candidate.id}`);
      lines.push(`  - Source: ${candidate.sourceProof.url}`);
      lines.push(`  - Evidence: ${candidate.sourceProof.excerpt}`);
    }
  }

  lines.push('', '## Excluded investigation items', '');
  if (run.excluded.length === 0) {
    lines.push('None.');
  } else {
    for (const item of run.excluded) {
      lines.push(
        `- **${safeText(item.institutionName)} / ${item.sourceProofId}** — ${item.reason}: ${safeText(item.detail)}`,
      );
      lines.push(`  - Source: ${item.sourceUrl}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function exclusion(
  proof: AdmissionsSourceProof,
  reason: AdmissionsReviewExclusionReason,
): AdmissionsReviewExclusion {
  const details: Record<AdmissionsReviewExclusionReason, string> = {
    proof_not_decision_capable:
      proof.errorReason ??
      proof.blockedReason ??
      'The official proof is not safe for a canonical rule change.',
    missing_program_or_cutoff:
      'The official proof did not contain a verified program identifier and cutoff.',
    pair_verification_incomplete:
      'The pair has not passed its reviewed mapping, fixture, fingerprint, and live-proof gate.',
    no_reviewed_baseline: 'No reviewed published baseline exists for this target.',
    unchanged: 'The official cutoff matches the current reviewed baseline.',
    reviewer_excluded: 'A reviewer excluded this candidate from the generated admissions update.',
  };
  return {
    sourceProofId: proof.id,
    institutionName: proof.institutionName,
    reason,
    detail: safeText(details[reason]),
    sourceUrl: proof.officialUrl,
  };
}

function ruleKey(target: PublishedAdmissionRule['target'], ruleKind: string): string {
  return `${target.institutionId}:${target.programId}:${target.cycle}:${ruleKind}`;
}

function candidateKey(candidate: AdmissionsReviewCandidate): string {
  return ruleKey(candidate.target, candidate.ruleKind);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(value)
    ? value
    : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function digest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function safeExcerpt(proof: AdmissionsSourceProof, cutoff: number): string {
  const programName = stringValue(proof.normalizedPayload.programName) ?? proof.id;
  return safeText(`Official ${programName} admission cutoff: ${cutoff}.`);
}

function safeText(value: string): string {
  return value
    .replace(/[<>{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

function escapeSlack(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function plural(count: number): string {
  return count === 1 ? '' : 's';
}
