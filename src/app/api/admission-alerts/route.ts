import { requireAuthenticatedUserId } from '@/app/api/_lib/auth';
import { toErrorResponse } from '@/app/api/_lib/errors';
import {
  createDrizzleAdmissionAlertAccountRepository,
  listAdmissionAlertSubscriptions,
} from '@/server/admission-alerts/accountService';

export const dynamic = 'force-dynamic';

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
