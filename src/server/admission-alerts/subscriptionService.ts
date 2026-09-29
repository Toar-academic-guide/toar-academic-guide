import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  admissionAlertBaselineHistory,
  admissionAlertSubscriptions,
  bagrutProfileVersions,
  userProfiles,
} from '@/db/schema';
import type { BagrutSubject, BagrutSector } from '@/types';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import { createAdmissionsInputDigest } from '@/server/admissions/evaluationSnapshot';
import { admissionCycleFor } from './cycle';
import {
  fromStoredBagrutProfileVersion,
  subjectsFromStoredBagrutProfile,
} from '@/lib/storedBagrutProfile';

export interface AdmissionAlertBaselineProfile {
  profileVersionId: string;
  profileHash: string;
  psychometric: number;
  bagrutAverage: number;
  hasStructuredBagrut: boolean;
  subjects: BagrutSubject[];
  extraInputs?: AdmissionsExtraInputs;
}

export interface AdmissionAlertSubscriptionRepository {
  getProfile(userId: string): Promise<AdmissionAlertBaselineProfile | null>;
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
  }): Promise<{ id: string; created: boolean }>;
}

export type AdmissionAlertBaselineEvaluator = (input: {
  institutionId: string;
  programId: string;
  profile: AdmissionAlertBaselineProfile;
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
  return created.created
    ? { status: 'created', subscriptionId: created.id }
    : { status: 'existing', subscriptionId: created.id };
}

export function createDrizzleAdmissionAlertSubscriptionRepository(
  db = getDb(),
): AdmissionAlertSubscriptionRepository {
  return {
    async getProfile(userId) {
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      if (!profile || !profile.bagrutProfileVersionId) {
        return null;
      }

      const [profileVersion] = await db
        .select()
        .from(bagrutProfileVersions)
        .where(
          and(
            eq(bagrutProfileVersions.id, profile.bagrutProfileVersionId),
            eq(bagrutProfileVersions.userId, userId),
          ),
        )
        .limit(1);
      if (!profileVersion) {
        return null;
      }

      return buildSavedAlertProfile(profile, profileVersion);
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
        // Profile writes take this same row lock before pausing subscriptions.
        // Recheck after the network evaluation so a concurrent edit cannot establish a stale baseline.
        const [profile] = await tx
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, input.userId))
          .for('update');
        const [version] = await tx
          .select()
          .from(bagrutProfileVersions)
          .where(
            and(
              eq(bagrutProfileVersions.id, input.profileVersionId),
              eq(bagrutProfileVersions.userId, input.userId),
            ),
          );
        const current = profile && version ? buildSavedAlertProfile(profile, version) : null;
        if (
          !current ||
          profile.bagrutProfileVersionId !== input.profileVersionId ||
          current.profileHash !== input.profileHash
        ) {
          throw new Error('Academic profile changed during alert activation. Please try again.');
        }
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
          .onConflictDoNothing()
          .returning({ id: admissionAlertSubscriptions.id });
        if (!subscription) {
          const [existing] = await tx
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
          if (!existing) {
            throw new Error('Unable to create admission alert subscription.');
          }
          return { ...existing, created: false };
        }
        await tx.insert(admissionAlertBaselineHistory).values({
          subscriptionId: subscription.id,
          profileVersionId: input.profileVersionId,
          profileHash: input.profileHash,
          ruleVersion: input.baselineRuleVersion,
          verdict: input.baselineVerdict,
        });
        return { ...subscription, created: true };
      });
    },
  };
}

export function buildSavedAlertProfile(
  profile: Pick<
    typeof userProfiles.$inferSelect,
    | 'psychometricOverall'
    | 'psychometricQuantitative'
    | 'psychometricVerbal'
    | 'psychometricEnglish'
    | 'bagrutWeightedAverage'
    | 'admissionsInputs'
  >,
  profileVersion: Pick<
    typeof bagrutProfileVersions.$inferSelect,
    'id' | 'schemaVersion' | 'sector' | 'subjects'
  >,
): AdmissionAlertBaselineProfile | null {
  if (profile.psychometricOverall === null || profile.bagrutWeightedAverage === null) return null;
  if (
    !['jewish', 'arab', 'druze', 'circassian', 'bedouin', 'samaritan'].includes(
      profileVersion.sector,
    )
  )
    return null;
  const extraInputs: AdmissionsExtraInputs = {
    ...profile.admissionsInputs,
    psychometricMath: profile.psychometricQuantitative ?? undefined,
    psychometricVerbal: profile.psychometricVerbal ?? undefined,
    psychometricEnglish: profile.psychometricEnglish ?? undefined,
    bagrutSubjectRecord: fromStoredBagrutProfileVersion({
      schemaVersion: profileVersion.schemaVersion,
      sector: profileVersion.sector as BagrutSector,
      payload: profileVersion.subjects,
    }),
  };
  return {
    profileVersionId: profileVersion.id,
    profileHash: createAdmissionsInputDigest({
      degreeId: 'admission-alert-profile',
      psychometric: profile.psychometricOverall,
      bagrut: profile.bagrutWeightedAverage,
      extraInputs,
    }),
    psychometric: profile.psychometricOverall,
    bagrutAverage: profile.bagrutWeightedAverage,
    hasStructuredBagrut: Boolean(extraInputs.bagrutSubjectRecord),
    subjects: subjectsFromStoredBagrutProfile(profileVersion.subjects),
    extraInputs,
  };
}

export function isSupportedTarget(target: { institutionId: string; programId: string }): boolean {
  return (
    (target.institutionId === 'tau' && target.programId === 'tau_cs') ||
    (target.institutionId === 'bgu' && target.programId === 'bgu_cs')
  );
}
