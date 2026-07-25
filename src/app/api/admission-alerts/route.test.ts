import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUserId: vi.fn(),
  listAdmissionAlertSubscriptions: vi.fn(),
  createDrizzleAdmissionAlertAccountRepository: vi.fn(),
  createAdmissionAlertSubscription: vi.fn(),
  createDrizzleAdmissionAlertSubscriptionRepository: vi.fn(),
  evaluateTauComputerScienceAlertBaseline: vi.fn(),
}));

vi.mock('@/app/api/_lib/auth', () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
vi.mock('@/server/admission-alerts/accountService', () => ({
  listAdmissionAlertSubscriptions: mocks.listAdmissionAlertSubscriptions,
  createDrizzleAdmissionAlertAccountRepository: mocks.createDrizzleAdmissionAlertAccountRepository,
}));
vi.mock('@/server/admission-alerts/subscriptionService', () => ({
  createAdmissionAlertSubscription: mocks.createAdmissionAlertSubscription,
  createDrizzleAdmissionAlertSubscriptionRepository:
    mocks.createDrizzleAdmissionAlertSubscriptionRepository,
}));
vi.mock('@/server/admission-alerts/tauBaselineEvaluator', () => ({
  evaluateTauComputerScienceAlertBaseline: mocks.evaluateTauComputerScienceAlertBaseline,
}));

import { GET, POST } from './route';

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

  it('creates a subscription only for the authenticated user through the server verifier', async () => {
    mocks.requireAuthenticatedUserId.mockResolvedValue('user-1');
    mocks.createDrizzleAdmissionAlertSubscriptionRepository.mockReturnValue('repository');
    mocks.createAdmissionAlertSubscription.mockResolvedValue({
      status: 'created',
      subscriptionId: 'subscription-1',
    });

    const response = await POST(
      new Request('http://localhost/api/admission-alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ institutionId: 'tau', programId: 'tau_cs' }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { status: 'created', subscriptionId: 'subscription-1' },
    });
    expect(mocks.createAdmissionAlertSubscription).toHaveBeenCalledWith(
      { institutionId: 'tau', programId: 'tau_cs' },
      {
        userId: 'user-1',
        repository: 'repository',
        evaluate: mocks.evaluateTauComputerScienceAlertBaseline,
      },
    );
  });
});
