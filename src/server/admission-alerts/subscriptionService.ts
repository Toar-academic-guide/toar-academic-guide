import 'server-only';

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

function isSupportedTarget(target: { institutionId: string; programId: string }): boolean {
  return target.institutionId === 'tau' && target.programId === 'tau_cs';
}
