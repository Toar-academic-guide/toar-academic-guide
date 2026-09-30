import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  admissionAlertSubscriptions,
  admissionReleaseItems,
  admissionTargetTransitions,
} from '@/db/schema';
import { evaluateAdmissionAlertBaseline, alertCutoffRuleVersion } from './baselineEvaluator';
import { createDrizzleAdmissionAlertSubscriptionRepository } from './subscriptionService';
import { processAdmissionAlertTransitionWork } from './transitionProcessor';

type EvaluationInput = Parameters<
  Parameters<typeof processAdmissionAlertTransitionWork>[0]['evaluate']
>[0];

export function createAdmissionAlertTransitionEvaluator(
  options: {
    db?: ReturnType<typeof getDb>;
    fetcher?: typeof fetch;
    evaluate?: typeof evaluateAdmissionAlertBaseline;
  } = {},
) {
  const db = options.db ?? getDb();
  const profiles = createDrizzleAdmissionAlertSubscriptionRepository(db);
  return async (input: EvaluationInput) => {
    const unavailable = {
      decision: 'unavailable' as const,
      isMathematicallyVerified: false,
      ruleVersion: input.ruleVersion,
    };
    const [subscription] = await db
      .select({ userId: admissionAlertSubscriptions.userId })
      .from(admissionAlertSubscriptions)
      .where(eq(admissionAlertSubscriptions.id, input.subscriptionId));
    if (!subscription) return unavailable;
    const profile = await profiles.getProfile(subscription.userId);
    if (
      !profile ||
      profile.profileHash !== input.profileHash ||
      profile.profileVersionId !== input.profileVersionId
    )
      return unavailable;
    const [rule] = await db
      .select({
        afterValue: admissionReleaseItems.afterValue,
        afterVersion: admissionTargetTransitions.afterVersion,
      })
      .from(admissionReleaseItems)
      .innerJoin(
        admissionTargetTransitions,
        eq(admissionTargetTransitions.id, admissionReleaseItems.transitionId),
      )
      .where(
        and(
          eq(admissionReleaseItems.transitionId, input.transitionId),
          eq(admissionReleaseItems.ruleKind, 'admission_cutoff'),
          eq(admissionTargetTransitions.institutionId, input.institutionId),
          eq(admissionTargetTransitions.programId, input.programId),
        ),
      );
    const cutoff = rule?.afterValue.value;
    if (
      typeof cutoff !== 'number' ||
      rule.afterVersion !== input.ruleVersion ||
      alertCutoffRuleVersion(cutoff) !== input.ruleVersion
    )
      return unavailable;
    const result = await (options.evaluate ?? evaluateAdmissionAlertBaseline)(
      { ...input, profile },
      { fetcher: options.fetcher },
    );
    // The live exact authority must still describe this reviewed version.
    // Historical drift is quarantined, never silently evaluated against a different cutoff.
    if (result.decision === 'unavailable' || result.ruleVersion !== input.ruleVersion)
      return unavailable;
    return { ...result, isMathematicallyVerified: true };
  };
}
