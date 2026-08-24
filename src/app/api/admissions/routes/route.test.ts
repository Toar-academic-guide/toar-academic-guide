import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAdmissionsRouteRateLimitForTests } from '@/server/admissions/routes/rateLimit';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
  getUserProfileSnapshot: vi.fn(),
  runTauComputerScienceRouteSimulation: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('@/app/api/_lib/auth', () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
vi.mock('@/server/user/profile', () => ({ getUserProfileSnapshot: mocks.getUserProfileSnapshot }));
vi.mock('@/server/admissions/routes/tauRouteSimulation', () => ({
  runTauComputerScienceRouteSimulation: mocks.runTauComputerScienceRouteSimulation,
}));
vi.mock('server-only', () => ({}));

import { POST } from './route';

const profile = {
  psychometric: 660,
  bagrutAverage: 108,
  subjectRecord: {
    schemaVersion: 1,
    sector: 'jewish',
    subjects: [
      { subjectId: 'mathematics', units: 5, grade: 80 },
      { subjectId: 'physics', units: 5, grade: 80 },
    ],
  },
};

describe('admissions routes API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAdmissionsRouteRateLimitForTests();
    mocks.requireAuthenticatedUserId.mockReset();
    mocks.getUserProfileSnapshot.mockReset();
    mocks.runTauComputerScienceRouteSimulation.mockReset();
    mocks.headers.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.10' }));
    mocks.runTauComputerScienceRouteSimulation.mockResolvedValue({
      status: 'no_route',
      pareto: [],
      evaluatedCandidateCount: 7,
      unavailableFinalistCount: 0,
    });
  });

  it('accepts a complete anonymous TAU profile without a user identifier', async () => {
    const response = await POST(request({ degreeId: 'tau_cs', source: 'input', profile }));

    expect(response.status).toBe(200);
    expect(mocks.runTauComputerScienceRouteSimulation).toHaveBeenCalledWith({ profile });
  });

  it('rejects unreviewed targets and client-supplied rule versions', async () => {
    const response = await POST(
      request({ degreeId: 'bgu_cs', source: 'input', profile, ruleVersion: 'untrusted' }),
    );

    expect(response.status).toBe(400);
    expect(mocks.runTauComputerScienceRouteSimulation).not.toHaveBeenCalled();
  });

  it('loads only the authenticated caller profile for a saved-profile request', async () => {
    mocks.requireAuthenticatedUserId.mockResolvedValue('user-1');
    mocks.getUserProfileSnapshot.mockResolvedValue({
      academicScores: {
        psychometric: { overall: 660 },
        bagrut: { weightedAverage: 108, subjectRecord: profile.subjectRecord },
      },
    });

    const response = await POST(request({ degreeId: 'tau_cs', source: 'saved_profile' }));

    expect(response.status).toBe(200);
    expect(mocks.getUserProfileSnapshot).toHaveBeenCalledWith('user-1');
  });

  it('returns Retry-After when the route quota is exhausted', async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect((await POST(request({ degreeId: 'tau_cs', source: 'input', profile }))).status).toBe(
        200,
      );
    }

    const response = await POST(request({ degreeId: 'tau_cs', source: 'input', profile }));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });
});

function request(body: unknown) {
  return new Request('http://localhost/api/admissions/routes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
