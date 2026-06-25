// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DataHealthDashboard from './DataHealthDashboard';
import type { DataHealthReadyReport } from '@/server/data-health/queries';

function reportWithRisks(): DataHealthReadyReport {
  return {
    status: 'ready',
    generatedAt: '2026-06-24T18:00:00.000Z',
    readiness: {
      isReady: false,
      issues: ['Programs missing institution links: tau_law'],
      counts: {
        institutions: 2,
        programs: 4,
        programInstitutions: 3,
        admissionRequirements: 3,
        admissionThresholds: 1,
        sourceUrls: 2,
        universityCalculatorConfigs: 7,
      },
    },
    coverage: {
      missingRequirementSourceCount: 1,
      missingProgramSourceCount: 1,
      missingRequirementSources: [
        {
          admissionRequirementId: 'req-tau-law',
          institutionId: 'tau',
          programId: 'tau_law',
        },
      ],
      missingProgramSources: [
        {
          institutionId: 'tau',
          programId: 'tau_law',
          programName: 'Law',
        },
      ],
    },
    ingestion: {
      totalJobs: 3,
      jobsByStatus: { failed: 1, pending: 1, running: 1 },
      jobsByDifficulty: { easy: 1, browser_required: 1, hard_manual: 1 },
      oldestActiveJobs: [
        {
          id: 'job-old',
          sourceId: 'source-1',
          status: 'pending',
          difficulty: 'hard_manual',
          createdAt: '2026-06-24T09:00:00.000Z',
          startedAt: null,
          completedAt: null,
          errorText: null,
        },
      ],
      recentFailures: [
        {
          id: 'job-failed',
          sourceId: 'source-2',
          status: 'failed',
          difficulty: 'browser_required',
          createdAt: '2026-06-24T10:00:00.000Z',
          startedAt: '2026-06-24T10:00:00.000Z',
          completedAt: '2026-06-24T10:02:00.000Z',
          errorText: 'Selector not found',
        },
      ],
    },
    reviewQueue: {
      pendingCount: 2,
      pendingByTargetField: { programDescription: 2 },
      oldestPendingItem: {
        id: 'review-old',
        payloadId: 'payload-1',
        admissionRequirementId: 'req-tau-law',
        targetField: 'programDescription',
        status: 'pending',
        createdAt: '2026-06-23T09:00:00.000Z',
        reviewedAt: null,
      },
      recentReviewedItems: [],
    },
    freshness: {
      staleAfterDays: 8,
      totalsByStatus: {
        blocked: 1,
        changed_needs_review: 1,
        failed: 1,
        fresh: 2,
        stale: 1,
      },
      rows: [
        {
          sourceId: 'tau-live',
          institutionId: 'tau',
          programId: 'tau_cs',
          sourceUrl: 'https://go.tau.ac.il/graphql',
          status: 'changed_needs_review',
          sourceClass: 'api_static_json',
          capability: 'decision_capable',
          lastCheckedAt: '2026-06-24T17:00:00.000Z',
          lastSuccessfulCheckAt: '2026-06-24T17:00:00.000Z',
          lastChangedAt: '2026-06-24T17:00:00.000Z',
          reason: null,
          latestReviewItemId: 'review-source-1',
          nextAction: 'Review changed threshold before publication',
        },
        {
          sourceId: 'biu-browser-required',
          institutionId: 'biu',
          programId: null,
          sourceUrl: 'https://in.biu.ac.il/Pages/Psychometric.aspx',
          status: 'blocked',
          sourceClass: 'browser_required',
          capability: 'blocked',
          lastCheckedAt: '2026-06-24T17:00:00.000Z',
          lastSuccessfulCheckAt: null,
          lastChangedAt: null,
          reason: 'Radware/browser session required',
          latestReviewItemId: null,
          nextAction: 'Move to Hermes/VPS browser automation lane',
        },
      ],
    },
  };
}

describe('DataHealthDashboard', () => {
  it('renders all dashboard signal groups', () => {
    render(<DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />);

    expect(screen.getByRole('heading', { name: /data health/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /catalogue readiness/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /source coverage/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /source freshness/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /ingestion pipeline/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /review queue/i })).toBeTruthy();
  });

  it('prioritizes critical operational risks before lower-priority totals', () => {
    const { container } = render(
      <DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />,
    );

    const text = container.textContent ?? '';
    expect(text.indexOf('Immediate attention')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Immediate attention')).toBeLessThan(text.indexOf('Catalogue totals'));
    expect(text.indexOf('job-failed')).toBeLessThan(text.indexOf('Total ingestion jobs'));
  });

  it('does not render raw proposed review values or ingestion payloads', () => {
    render(<DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />);

    expect(screen.queryByText(/proposedValue/i)).toBeNull();
    expect(screen.queryByText(/payload json/i)).toBeNull();
    expect(screen.queryByText(/normalizedDecisionPayload/i)).toBeNull();
  });
});
