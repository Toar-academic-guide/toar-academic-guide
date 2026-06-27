// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  getInternalAdminAuthorization: vi.fn(),
  getDataHealthReport: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/server/internal/adminAuth', () => ({
  getInternalAdminAuthorization: hoistedMocks.getInternalAdminAuthorization,
}));

vi.mock('@/server/data-health/queries', () => ({
  getDataHealthReport: hoistedMocks.getDataHealthReport,
}));

vi.mock('next/navigation', () => ({
  notFound: hoistedMocks.notFound,
}));

import DataHealthPage from './page';

describe('/internal/data-health page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.getInternalAdminAuthorization.mockReset();
    hoistedMocks.getDataHealthReport.mockReset();
    hoistedMocks.notFound.mockClear();
  });

  it('does not query operational data for unauthenticated users', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'unauthenticated',
      isAdmin: false,
    });

    await expect(DataHealthPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(hoistedMocks.getDataHealthReport).not.toHaveBeenCalled();
  });

  it('does not query operational data for non-admin users', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'non_admin',
      isAdmin: false,
      user: { id: 'user-123', email: 'user@example.com' },
    });

    await expect(DataHealthPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(hoistedMocks.getDataHealthReport).not.toHaveBeenCalled();
  });

  it('renders dashboard data for allowlisted admins', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'admin',
      isAdmin: true,
      user: { id: 'user-123', email: 'operator@example.com' },
    });
    hoistedMocks.getDataHealthReport.mockResolvedValue({
      status: 'ready',
      generatedAt: '2026-06-24T18:00:00.000Z',
      readiness: {
        isReady: true,
        issues: [],
        counts: {
          institutions: 2,
          programs: 3,
          programInstitutions: 3,
          admissionRequirements: 3,
          admissionThresholds: 1,
          sourceUrls: 3,
          universityCalculatorConfigs: 7,
        },
      },
      coverage: {
        missingRequirementSourceCount: 0,
        missingProgramSourceCount: 0,
        missingRequirementSources: [],
        missingProgramSources: [],
      },
      decisionReadiness: {
        decisionReadyRequirementCount: 0,
        missingFactCount: 0,
        weakSourceCount: 0,
        manualGateCount: 0,
        alternativePathCount: 0,
        requirementsMissingFacts: [],
        weakSources: [],
        manualGateRequirements: [],
      },
      decisionEvidence: {
        rows: [],
      },
      ingestion: {
        totalJobs: 0,
        jobsByStatus: {},
        jobsByDifficulty: {},
        oldestActiveJobs: [],
        recentFailures: [],
      },
      reviewQueue: {
        pendingCount: 0,
        pendingByTargetField: {},
        oldestPendingItem: null,
        recentReviewedItems: [],
      },
      freshness: {
        staleAfterDays: 8,
        totalsByStatus: {},
        rows: [],
      },
    });

    render(await DataHealthPage());

    expect(screen.getByRole('heading', { name: /data health/i })).toBeTruthy();
    expect(screen.getByText('operator@example.com')).toBeTruthy();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(hoistedMocks.getDataHealthReport).toHaveBeenCalledTimes(1);
  });

  it('renders a controlled setup state when operational data is unavailable', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'admin',
      isAdmin: true,
      user: { id: 'user-123', email: 'operator@example.com' },
    });
    hoistedMocks.getDataHealthReport.mockResolvedValue({
      status: 'unavailable',
      message: 'Operational data health is not configured.',
    });

    render(await DataHealthPage());

    expect(screen.getByText(/operational data health is not configured/i)).toBeTruthy();
    expect(screen.queryByText(/postgresql:\/\//i)).toBeNull();
  });
});
