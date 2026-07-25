import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  cancelAdmissionAlertSubscription: vi.fn(),
  createDrizzleAdmissionAlertAccountRepository: vi.fn(),
}));

vi.mock('@/app/api/_lib/auth', () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
vi.mock('@/server/admission-alerts/accountService', () => ({
  cancelAdmissionAlertSubscription: mocks.cancelAdmissionAlertSubscription,
  createDrizzleAdmissionAlertAccountRepository: mocks.createDrizzleAdmissionAlertAccountRepository,
}));

import { DELETE } from './route';

describe('admission alert subscription cancellation API', () => {
  it('uses only the authenticated user id to cancel a subscription', async () => {
    mocks.requireAuthenticatedUserId.mockResolvedValue('user-1');
    mocks.createDrizzleAdmissionAlertAccountRepository.mockReturnValue('repository');
    mocks.cancelAdmissionAlertSubscription.mockResolvedValue({
      status: 'cancelled',
      mayStillArrive: false,
    });

    const response = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ subscriptionId: 'subscription-1' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.cancelAdmissionAlertSubscription).toHaveBeenCalledWith({
      userId: 'user-1',
      subscriptionId: 'subscription-1',
      repository: 'repository',
    });
  });
});
