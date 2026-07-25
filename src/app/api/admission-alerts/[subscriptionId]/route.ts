import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
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
    if (!subscriptionId.trim()) {
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
    return toErrorResponse(error, {
      code: 'ADMISSION_ALERT_SUBSCRIPTION_CANCEL_FAILED',
      message: 'Unable to cancel this admission alert subscription.',
    });
  }
}
