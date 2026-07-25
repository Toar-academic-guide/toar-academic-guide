import { z } from 'zod';

import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';
import {
  createDrizzleAdmissionAlertAccountRepository,
  listAdmissionAlertSubscriptions,
} from '@/server/admission-alerts/accountService';
import {
  createAdmissionAlertSubscription,
  createDrizzleAdmissionAlertSubscriptionRepository,
} from '@/server/admission-alerts/subscriptionService';
import { evaluateTauComputerScienceAlertBaseline } from '@/server/admission-alerts/tauBaselineEvaluator';

export const dynamic = 'force-dynamic';

const subscriptionRequestSchema = z.strictObject({
  institutionId: z.string().trim().min(1),
  programId: z.string().trim().min(1),
});

export async function GET() {
  try {
    const userId = await requireAuthenticatedUserId();
    const data = await listAdmissionAlertSubscriptions({
      userId,
      repository: createDrizzleAdmissionAlertAccountRepository(),
    });
    return Response.json({ data });
  } catch (error) {
    return toErrorResponse(error, {
      code: 'ADMISSION_ALERTS_INTERNAL_ERROR',
      message: 'Unable to load admission alert subscriptions.',
    });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId();
    const target = await parseSubscriptionRequest(request);
    const data = await createAdmissionAlertSubscription(target, {
      userId,
      repository: createDrizzleAdmissionAlertSubscriptionRepository(),
      evaluate: evaluateTauComputerScienceAlertBaseline,
    });
    return Response.json({ data });
  } catch (error) {
    return toErrorResponse(error, {
      code: 'ADMISSION_ALERT_SUBSCRIPTION_CREATE_FAILED',
      message: 'Unable to create this admission alert subscription.',
    });
  }
}

async function parseSubscriptionRequest(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiRouteError(
      400,
      'ADMISSION_ALERT_SUBSCRIPTION_PAYLOAD_INVALID',
      'Admission alert subscription payload is invalid.',
    );
  }

  const parsed = subscriptionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiRouteError(
      400,
      'ADMISSION_ALERT_SUBSCRIPTION_PAYLOAD_INVALID',
      'Admission alert subscription payload is invalid.',
    );
  }

  return parsed.data;
}
