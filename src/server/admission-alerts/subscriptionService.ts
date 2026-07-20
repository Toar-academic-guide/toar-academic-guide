import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  admissionAlertBaselineHistory,
  admissionAlertSubscriptions,
  bagrutProfileVersions,
  userProfiles,
} from '@/db/schema';
import { admissionCycleFor } from './cycle';

export interface AdmissionAlertSubscriptionRepository {
  getProfile(userId: string): Promise<{
    profileVersionId: string;
    profileHash: string;
    psychometric: number;
    bagrutAverage: number;
    hasStructuredBagrut: boolean;
  } | null>;
  findActiveSubscription(input: {
    userId: string;
    institutionId: string;
    programId: string;
    cycle: string;
  }): Promise<{ id: string } | null>;
  createSubscription(input: {
    userId: string;
    institutionId: string;
    programId: string;
    cycle: string;
    profileVersionId: string;
    profileHash: string;
    baselineRuleVersion: string;
    baselineVerdict: Record<string, unknown>;
  }): Promise<{ id: string }>;
}

export type AdmissionAlertBaselineEvaluator = (input: {
  institutionId: string;
  programId: string;
  profile: NonNullable<Awaited<ReturnType<AdmissionAlertSubscriptionRepository['getProfile']>>>;
}) => Promise<{ decision: 'below' | 'eligible' | 'unavailable'; ruleVersion: string }>;

export async function createAdmissionAlertSubscription(
  target: { institutionId: string; programId: string },
  options: {
    userId: string;
    repository: AdmissionAlertSubscriptionRepository;
    evaluate: AdmissionAlertBaselineEvaluator;
    now?: Date;
  },
): Promise<
  | { status: 'created'; subscriptionId: string }
  | { status: 'existing'; subscriptionId: string }
  | { status: 'unsupported' | 'profile_incomplete' | 'already_eligible' | 'evaluation_unavailable' }
> {
  if (!isSupportedTarget(target)) {
    return { status: 'unsupported' };
  }

  const cycle = admissionCycleFor(options.now);
  const existing = await options.repository.findActiveSubscription({
    userId: options.userId,
    institutionId: target.institutionId,
    programId: target.programId,
    cycle,
  });
  if (existing) {
    return { status: 'existing', subscriptionId: existing.id };
  }

  const profile = await options.repository.getProfile(options.userId);
  if (!profile || !profile.hasStructuredBagrut) {
    return { status: 'profile_incomplete' };
  }

  const evaluation = await options.evaluate({ ...target, profile });
  if (evaluation.decision === 'eligible') {
    return { status: 'already_eligible' };
  }
  if (evaluation.decision !== 'below') {
    return { status: 'evaluation_unavailable' };
  }

  const created = await options.repository.createSubscription({
    userId: options.userId,
    institutionId: target.institutionId,
    programId: target.programId,
    cycle,
    profileVersionId: profile.profileVersionId,
    profileHash: profile.profileHash,
    baselineRuleVersion: evaluation.ruleVersion,
    baselineVerdict: { decision: 'below' },
  });
  return { status: 'created', subscriptionId: created.id };
}

export function createDrizzleAdmissionAlertSubscriptionRepository(
  db = getDb(),
): AdmissionAlertSubscriptionRepository {
  return {
    async getProfile(userId) {
      const [profile] = await db
        .select({
          psychometric: userProfiles.psychometricOverall,
          bagrutAverage: userProfiles.bagrutWeightedAverage,
          profileVersionId: userProfiles.bagrutProfileVersionId,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      if (
        !profile ||
        profile.psychometric === null ||
        profile.bagrutAverage === null ||
        !profile.profileVersionId
      ) {
        return null;
      }

      const [profileVersion] = await db
        .select({ id: bagrutProfileVersions.id, profileHash: bagrutProfileVersions.contentHash })
        .from(bagrutProfileVersions)
        .where(eq(bagrutProfileVersions.id, profile.profileVersionId))
        .limit(1);
      if (!profileVersion) {
        return null;
      }

      return {
        profileVersionId: profileVersion.id,
        profileHash: profileVersion.profileHash,
        psychometric: profile.psychometric,
        bagrutAverage: profile.bagrutAverage,
        hasStructuredBagrut: true,
      };
    },
    async findActiveSubscription(input) {
      const [subscription] = await db
        .select({ id: admissionAlertSubscriptions.id })
        .from(admissionAlertSubscriptions)
        .where(
          and(
            eq(admissionAlertSubscriptions.userId, input.userId),
            eq(admissionAlertSubscriptions.institutionId, input.institutionId),
            eq(admissionAlertSubscriptions.programId, input.programId),
            eq(admissionAlertSubscriptions.cycle, input.cycle),
            inArray(admissionAlertSubscriptions.status, [
              'active',
              'needs_profile_refresh',
              'pending_delivery',
            ]),
          ),
        )
        .limit(1);
      return subscription ?? null;
    },
    async createSubscription(input) {
      return db.transaction(async (tx) => {
        const [subscription] = await tx
          .insert(admissionAlertSubscriptions)
          .values({
            userId: input.userId,
            institutionId: input.institutionId,
            programId: input.programId,
            cycle: input.cycle,
            profileVersionId: input.profileVersionId,
            profileHash: input.profileHash,
            baselineRuleVersion: input.baselineRuleVersion,
            baselineVerdict: input.baselineVerdict,
          })
          .returning({ id: admissionAlertSubscriptions.id });
        if (!subscription) {
          throw new Error('Unable to create admission alert subscription.');
        }
        await tx.insert(admissionAlertBaselineHistory).values({
          subscriptionId: subscription.id,
          profileVersionId: input.profileVersionId,
          profileHash: input.profileHash,
          ruleVersion: input.baselineRuleVersion,
          verdict: input.baselineVerdict,
        });
        return subscription;
      });
    },
  };
}

function isSupportedTarget(target: { institutionId: string; programId: string }): boolean {
  return target.institutionId === 'tau' && target.programId === 'tau_cs';
}
