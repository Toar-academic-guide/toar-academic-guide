import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  listAdmissionAlertSubscriptions: vi.fn(),
  createDrizzleAdmissionAlertAccountRepository: vi.fn(),
}));

vi.mock('@/app/api/_lib/auth', () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
vi.mock('@/server/admission-alerts/accountService', () => ({
  listAdmissionAlertSubscriptions: mocks.listAdmissionAlertSubscriptions,
  createDrizzleAdmissionAlertAccountRepository: mocks.createDrizzleAdmissionAlertAccountRepository,
}));

import { GET } from './route';

describe('admission alerts API', () => {
  it('returns only the authenticated account subscriptions', async () => {
    mocks.requireAuthenticatedUserId.mockResolvedValue('user-1');
    mocks.createDrizzleAdmissionAlertAccountRepository.mockReturnValue('repository');
    mocks.listAdmissionAlertSubscriptions.mockResolvedValue([{ id: 'subscription-1' }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: 'subscription-1' }] });
    expect(mocks.listAdmissionAlertSubscriptions).toHaveBeenCalledWith({
      userId: 'user-1',
      repository: 'repository',
    });
  });
});
