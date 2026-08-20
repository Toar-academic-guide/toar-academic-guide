import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { admissionReleaseItems, admissionReleases, admissionTargetTransitions } from '@/db/schema';
import {
  runAdmissionsSourceFreshness,
  type AdmissionsSourceFreshnessRunResult,
  type AdmissionsSourceFreshnessRunnerOptions,
} from '@/server/ingestion/admissionsSourceFreshnessRunner';

import {
  buildAdmissionsReviewRun,
  type AdmissionsReviewRun,
  type PublishedAdmissionRule,
} from './weeklyReviewRun';
import type { FormulaPairVerificationLedgerEntry } from '@/data/admissions/formulaBackedVerificationLedger';

export interface PublishedAdmissionRuleRepository {
  listPublishedRules(input: { cycle: string }): Promise<PublishedAdmissionRule[]>;
}

export interface AdmissionsWeeklyReviewPreparerDependencies {
  sourceRunner?: (
    options: AdmissionsSourceFreshnessRunnerOptions,
  ) => Promise<AdmissionsSourceFreshnessRunResult>;
  baselineRepository?: PublishedAdmissionRuleRepository;
  verificationLedger?: readonly FormulaPairVerificationLedgerEntry[];
}

export interface AdmissionsWeeklyReviewPreparationInput extends Omit<
  AdmissionsSourceFreshnessRunnerOptions,
  'checkedAt'
> {
  runKey: string;
  cycle: string;
  checkedAt?: Date;
  excludedCandidateIds?: string[];
}

export interface AdmissionsWeeklyReviewPreparationResult {
  run: AdmissionsReviewRun;
  persistence: AdmissionsSourceFreshnessRunResult['persistence'];
}

export function createAdmissionsWeeklyReviewPreparer(
  dependencies: AdmissionsWeeklyReviewPreparerDependencies = {},
) {
  const sourceRunner = dependencies.sourceRunner ?? runAdmissionsSourceFreshness;
  const baselineRepository =
    dependencies.baselineRepository ?? createDrizzlePublishedAdmissionRuleRepository();

  return {
    async prepare(
      input: AdmissionsWeeklyReviewPreparationInput,
    ): Promise<AdmissionsWeeklyReviewPreparationResult> {
      const checkedAt = input.checkedAt ?? new Date();
      const freshness = await sourceRunner({
        applicant: input.applicant,
        fetcher: input.fetcher,
        targetIds: input.targetIds,
        includeCapabilityMatrix: input.includeCapabilityMatrix,
        repository: input.repository,
        proofRunner: input.proofRunner,
        dryRun: input.dryRun,
        checkedAt,
      });
      const baseline = await baselineRepository.listPublishedRules({ cycle: input.cycle });

      return {
        run: buildAdmissionsReviewRun({
          runKey: input.runKey,
          checkedAt,
          cycle: input.cycle,
          baseline,
          proofs: freshness.report.results.map((result) => result.proof),
          excludedCandidateIds: input.excludedCandidateIds,
          verificationLedger: dependencies.verificationLedger,
        }),
        persistence: freshness.persistence,
      };
    },
  };
}

export function createDrizzlePublishedAdmissionRuleRepository(
  db = getDb(),
): PublishedAdmissionRuleRepository {
  return {
    async listPublishedRules({ cycle }) {
      const rows = await db
        .select({
          institutionId: admissionTargetTransitions.institutionId,
          programId: admissionTargetTransitions.programId,
          cycle: admissionTargetTransitions.cycle,
          ruleKind: admissionReleaseItems.ruleKind,
          afterValue: admissionReleaseItems.afterValue,
          publishedAt: admissionReleases.publishedAt,
        })
        .from(admissionReleaseItems)
        .innerJoin(
          admissionTargetTransitions,
          eq(admissionReleaseItems.transitionId, admissionTargetTransitions.id),
        )
        .innerJoin(
          admissionReleases,
          eq(admissionTargetTransitions.releaseId, admissionReleases.id),
        )
        .where(
          and(
            eq(admissionReleases.status, 'published'),
            eq(admissionTargetTransitions.cycle, cycle),
          ),
        )
        .orderBy(desc(admissionReleases.publishedAt));

      const latestByRule = new Map<string, PublishedAdmissionRule>();
      for (const row of rows) {
        if (row.ruleKind !== 'admission_cutoff') {
          continue;
        }
        const value = numericRuleValue(row.afterValue);
        if (value === undefined) {
          continue;
        }
        const rule: PublishedAdmissionRule = {
          target: {
            institutionId: row.institutionId,
            programId: row.programId,
            cycle: row.cycle,
          },
          ruleKind: 'admission_cutoff',
          value,
        };
        const key = `${rule.target.institutionId}:${rule.target.programId}:${rule.target.cycle}:${rule.ruleKind}`;
        if (!latestByRule.has(key)) {
          latestByRule.set(key, rule);
        }
      }
      return [...latestByRule.values()].sort((left, right) =>
        `${left.target.institutionId}:${left.target.programId}`.localeCompare(
          `${right.target.institutionId}:${right.target.programId}`,
        ),
      );
    },
  };
}

function numericRuleValue(value: { value: number | string }): number | undefined {
  return typeof value.value === 'number' && Number.isFinite(value.value) ? value.value : undefined;
}
