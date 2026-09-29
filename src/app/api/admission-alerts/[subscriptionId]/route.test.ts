import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  requireVerifiedEmailUser: vi.fn(),
  retryFailedAlertDelivery: vi.fn(),
  cancelAdmissionAlertSubscription: vi.fn(),
  createDrizzleAdmissionAlertAccountRepository: vi.fn(),
}));

vi.mock('@/app/api/_lib/auth', () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
  requireVerifiedEmailUser: mocks.requireVerifiedEmailUser,
}));
vi.mock('@/server/admission-alerts/retryDelivery', () => ({
  retryFailedAlertDelivery: mocks.retryFailedAlertDelivery,
}));
vi.mock('@/server/admission-alerts/accountService', () => ({
  cancelAdmissionAlertSubscription: mocks.cancelAdmissionAlertSubscription,
  createDrizzleAdmissionAlertAccountRepository: mocks.createDrizzleAdmissionAlertAccountRepository,
}));

import { DELETE, POST } from './route';
const subscriptionId = 'abcdabcd-abcd-4bcd-abcd-abcdabcdabcd';

describe('admission alert subscription cancellation API', () => {
  it('uses only the authenticated user id to cancel a subscription', async () => {
    mocks.requireAuthenticatedUserId.mockResolvedValue('user-1');
    mocks.createDrizzleAdmissionAlertAccountRepository.mockReturnValue('repository');
    mocks.cancelAdmissionAlertSubscription.mockResolvedValue({
      status: 'cancelled',
      mayStillArrive: false,
    });

    const response = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ subscriptionId }),
    });

    expect(response.status).toBe(200);
    expect(mocks.cancelAdmissionAlertSubscription).toHaveBeenCalledWith({
      userId: 'user-1',
      subscriptionId,
      repository: 'repository',
    });
  });
  it('retries only through the verified account and returns not found for another owner', async () => {
    mocks.requireVerifiedEmailUser.mockResolvedValue({ id: 'user-1' });
    mocks.retryFailedAlertDelivery.mockResolvedValue({ status: 'not_found' });
    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ subscriptionId }),
    });
    expect(response.status).toBe(404);
    expect(mocks.retryFailedAlertDelivery).toHaveBeenCalledWith('user-1', subscriptionId);
  });
  it('rejects malformed ids before retrying', async () => {
    mocks.requireVerifiedEmailUser.mockResolvedValue({ id: 'user-1' });
    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ subscriptionId: 'invalid' }),
    });
    expect(response.status).toBe(400);
  });
});
