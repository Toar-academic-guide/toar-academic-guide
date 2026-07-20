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
    decisionReadiness: {
      decisionReadyRequirementCount: 2,
      missingFactCount: 1,
      weakSourceCount: 1,
      manualGateCount: 1,
      alternativePathCount: 1,
      requirementsMissingFacts: [
        {
          admissionRequirementId: 'req-missing-facts',
          institutionId: 'tau',
          programId: 'tau_psychology',
        },
      ],
      weakSources: [
        {
          sourceCandidateId: 'candidate-weak',
          admissionRequirementId: 'req-tau-law',
          institutionId: 'tau',
          programId: 'tau_law',
          confidence: 'low',
          origin: 'board_column',
          specificity: 'generic',
        },
      ],
      manualGateRequirements: [
        {
          admissionRequirementId: 'req-tau-law',
          institutionId: 'tau',
          programId: 'tau_law',
        },
      ],
    },
    decisionEvidence: {
      rows: [
        {
          programId: 'tau_datascience',
          programName: 'Digital Sciences for High-Tech',
          institutionId: 'tau',
          institutionName: 'Tel Aviv University',
          evidenceMode: 'exact',
          severity: 'normal',
          sourceTargetId: 'tau-digital-sciences-live',
          officialSourceUrl: 'https://go.tau.ac.il/graphql',
          adapterId: 'tau',
          externalProgramId: '056011050000',
          freshnessStatus: 'fresh',
          blockedReason: null,
          requiredInputs: [],
        },
        {
          programId: 'haifa_cs',
          programName: 'Computer Science',
          institutionId: 'haifa',
          institutionName: 'University of Haifa',
          evidenceMode: 'needs_input',
          severity: 'normal',
          sourceTargetId: 'haifa-cs-live',
          officialSourceUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
          adapterId: 'haifa',
          externalProgramId: '52258372',
          freshnessStatus: 'fresh',
          blockedReason: null,
          requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
        },
        {
          programId: 'tau_law',
          programName: 'Law',
          institutionId: 'tau',
          institutionName: 'Tel Aviv University',
          evidenceMode: 'missing',
          severity: 'informational',
          sourceTargetId: null,
          officialSourceUrl: null,
          adapterId: null,
          externalProgramId: null,
          freshnessStatus: null,
          blockedReason: null,
          requiredInputs: [],
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
    publication: {
      activeRelease: {
        id: 'release-1',
        manifestDigest: 'sha256:release-manifest',
        repositoryCommit: '0123456789abcdef',
        publishedAt: '2026-06-24T17:00:00.000Z',
      },
      pendingReleaseCount: 1,
      failedReleaseCount: 2,
    },
    mondayEvidence: {
      totalItems: 212,
      catalogueMatched: 34,
      nonCatalogueEvidence: 178,
      decisionCapable: 5,
      trackedMissingRule: 4,
      blocked: 2,
      openAdmission: 1,
      manualOrEligible: 178,
      nonCatalogueBucketCounts: {
        eligible_no_formal_grade_gate: 120,
        manual_gate: 58,
      },
      nonCatalogueGroups: [
        {
          bucket: 'eligible_no_formal_grade_gate',
          count: 120,
          rows: [
            {
              itemId: '12341102997',
              itemName: '57. המרכז האקדמי שערי מדע ומשפט',
              publicBucket: 'eligible_no_formal_grade_gate',
              nextAction:
                'Find the official admissions URL before this item can be treated as product-complete.',
              officialUrl: 'https://mishpat.ac.il',
            },
          ],
        },
        {
          bucket: 'manual_gate',
          count: 58,
          rows: [
            {
              itemId: '12220697938',
              itemName: '28. מעלה - לקולנוע ואמנויות',
              publicBucket: 'manual_gate',
              nextAction:
                'Represent as eligible/apply/register unless the official source names a formal grade gate.',
              officialUrl: 'https://www.maale.co.il',
            },
          ],
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
    expect(screen.getByRole('heading', { name: /admissions decision readiness/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^admissions evidence$/i })).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /monday admissions evidence coverage/i }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: /source coverage/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /source freshness/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /admissions publication/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /ingestion pipeline/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /review queue/i })).toBeTruthy();
    expect(screen.getByText('Non-catalogue evidence')).toBeTruthy();
    expect(screen.getByText('Non-catalogue evidence queue')).toBeTruthy();
  });

  it('renders exact, needs-input, and informational admissions evidence rows', () => {
    render(<DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />);

    expect(screen.getByText('Digital Sciences for High-Tech')).toBeTruthy();
    expect(screen.getByText('Exact official')).toBeTruthy();
    expect(
      screen.getByText(/requires psychometric_math, psychometric_verbal, psychometric_english/i),
    ).toBeTruthy();
    expect(screen.getByText('Missing')).toBeTruthy();
    expect(
      screen.getByText(/No official-source metadata is currently linked to this pair/i),
    ).toBeTruthy();
  });

  it('prioritizes critical operational risks before lower-priority totals', () => {
    const { container } = render(
      <DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />,
    );

    const text = container.textContent ?? '';
    expect(text.indexOf('Immediate attention')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Immediate attention')).toBeLessThan(text.indexOf('Catalogue totals'));
    expect(text.indexOf('job-failed')).toBeLessThan(text.indexOf('Total ingestion jobs'));
    expect(text).not.toContain('Missing official target');
  });

  it('does not render raw proposed review values or ingestion payloads', () => {
    render(<DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />);

    expect(screen.queryByText(/proposedValue/i)).toBeNull();
    expect(screen.queryByText(/payload json/i)).toBeNull();
    expect(screen.queryByText(/normalizedDecisionPayload/i)).toBeNull();
  });

  it('renders a compact non-catalogue Monday evidence backlog for operators', () => {
    render(<DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />);

    expect(screen.getByText('57. המרכז האקדמי שערי מדע ומשפט')).toBeTruthy();
    expect(screen.getAllByText('Eligible with no formal grade gate').length).toBeGreaterThan(0);
    expect(screen.getByText(/https:\/\/mishpat\.ac\.il/i)).toBeTruthy();
    expect(screen.getAllByText('Manual gate').length).toBeGreaterThan(0);
    expect(screen.getByText('28. מעלה - לקולנוע ואמנויות')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /eligible with no formal grade gate/i })
        .getAttribute('href'),
    ).toBe('#non-catalogue-eligible-no-formal-grade-gate');
    expect(screen.getByRole('link', { name: /manual gate/i }).getAttribute('href')).toBe(
      '#non-catalogue-manual-gate',
    );
  });

  it('links the oldest pending review item without rendering mutation controls', () => {
    render(<DataHealthDashboard report={reportWithRisks()} adminEmail="operator@example.com" />);

    expect(screen.getByRole('link', { name: 'review-old' }).getAttribute('href')).toBe(
      '/internal/reviews/review-old',
    );
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
  });
});
