import { requireAuthenticatedUserId, requireVerifiedEmailUser } from '@/app/api/_lib/auth';
import { retryFailedAlertDelivery } from '@/server/admission-alerts/retryDelivery';
import { z } from 'zod';
import { ApiRouteError, toErrorResponse } from '@/app/api/_lib/errors';
import {
  cancelAdmissionAlertSubscription,
  createDrizzleAdmissionAlertAccountRepository,
} from '@/server/admission-alerts/accountService';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ subscriptionId: string }> },
) {
  try {
    const userId = await requireAuthenticatedUserId();
    const { subscriptionId } = await context.params;
    if (!z.uuid().safeParse(subscriptionId).success) {
      throw new ApiRouteError(
        400,
        'ADMISSION_ALERT_SUBSCRIPTION_INVALID',
        'Subscription id is invalid.',
      );
    }
    const data = await cancelAdmissionAlertSubscription({
      userId,
      subscriptionId,
      repository: createDrizzleAdmissionAlertAccountRepository(),
    });
    if (data.status === 'not_found') {
      throw new ApiRouteError(
        404,
        'ADMISSION_ALERT_SUBSCRIPTION_NOT_FOUND',
        'Subscription was not found.',
      );
    }
    return Response.json({ data });
  } catch (error) {
    return toErrorResponse(error instanceof ApiRouteError ? error : null, {
      code: 'ADMISSION_ALERT_SUBSCRIPTION_CANCEL_FAILED',
      message: 'Unable to cancel this admission alert subscription.',
    });
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ subscriptionId: string }> },
) {
  try {
    const user = await requireVerifiedEmailUser();
    const { subscriptionId } = await context.params;
    if (!z.uuid().safeParse(subscriptionId).success)
      throw new ApiRouteError(400, 'ADMISSION_ALERT_SUBSCRIPTION_INVALID', 'Invalid subscription.');
    const data = await retryFailedAlertDelivery(user.id, subscriptionId);
    return Response.json({ data }, { status: data.status === 'not_found' ? 404 : 200 });
  } catch (error) {
    return toErrorResponse(error instanceof ApiRouteError ? error : null, {
      code: 'ADMISSION_ALERT_RETRY_FAILED',
      message: 'Unable to retry this alert.',
    });
  }
}
