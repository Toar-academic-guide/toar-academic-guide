// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  getInternalAdminAuthorization: vi.fn(),
  getReviewItemDetail: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/server/internal/adminAuth', () => ({
  getInternalAdminAuthorization: hoistedMocks.getInternalAdminAuthorization,
}));

vi.mock('@/server/data-health/queries', () => ({
  getReviewItemDetail: hoistedMocks.getReviewItemDetail,
}));

vi.mock('next/navigation', () => ({
  notFound: hoistedMocks.notFound,
}));

vi.mock('./ReviewActionPanel', () => ({
  default: ({
    approveBlockedReason,
    canApprove,
    canReject,
    reviewItemId,
  }: {
    approveBlockedReason: string | null;
    canApprove: boolean;
    canReject: boolean;
    reviewItemId: string;
  }) => (
    <div data-testid="review-actions">
      {reviewItemId}:{String(canApprove)}:{String(canReject)}:{approveBlockedReason ?? 'ready'}
    </div>
  ),
}));

import ReviewItemPage from './page';

describe('/internal/reviews/[reviewItemId] page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.getInternalAdminAuthorization.mockReset();
    hoistedMocks.getReviewItemDetail.mockReset();
    hoistedMocks.notFound.mockClear();
  });

  it('does not load review detail for unauthenticated users', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'unauthenticated',
      isAdmin: false,
    });

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(hoistedMocks.getReviewItemDetail).not.toHaveBeenCalled();
  });

  it('renders bounded review evidence for admins', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'admin',
      isAdmin: true,
      user: { id: 'admin-123', email: 'operator@example.com' },
    });
    hoistedMocks.getReviewItemDetail.mockResolvedValue({
      status: 'found',
      item: reviewItemDetail(),
    });

    render(await renderPage());

    expect(hoistedMocks.getReviewItemDetail).toHaveBeenCalledWith('review-source-1');
    expect(screen.getByRole('heading', { name: 'review-source-1' })).toBeTruthy();
    expect(screen.getByText('sourceFreshness')).toBeTruthy();
    expect(screen.getByText('https://go.tau.ac.il/graphql')).toBeTruthy();
    expect(screen.getAllByText('sekhem').length).toBeGreaterThan(0);
    expect(screen.getByText('715')).toBeTruthy();
    expect(screen.getByTestId('review-actions').textContent).toContain('review-source-1:true:true');
    expect(screen.queryByText(/rawHtml/i)).toBeNull();
    expect(screen.queryByText(/payload json/i)).toBeNull();
  });

  it('fails closed for missing review items', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'admin',
      isAdmin: true,
      user: { id: 'admin-123', email: 'operator@example.com' },
    });
    hoistedMocks.getReviewItemDetail.mockResolvedValue({ status: 'not_found' });

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

async function renderPage() {
  return ReviewItemPage({
    params: Promise.resolve({ reviewItemId: 'review-source-1' }),
  });
}

function reviewItemDetail() {
  return {
    id: 'review-source-1',
    payloadId: 'payload-source-1',
    payloadCreatedAt: '2026-06-24T10:59:00.000Z',
    admissionRequirementId: null,
    targetField: 'sourceFreshness',
    status: 'pending',
    createdAt: '2026-06-24T11:00:00.000Z',
    reviewedAt: null,
    actionEligibility: {
      canApprove: true,
      canReject: true,
      approveBlockedReason: null,
    },
    evidence: {
      sourceId: 'tau-live',
      institutionId: 'tau',
      programId: 'tau_cs',
      sourceUrl: 'https://go.tau.ac.il/graphql',
      sourceClass: 'api_static_json',
      capability: 'decision_capable',
      freshnessStatus: 'changed_needs_review',
      latestReviewItemId: 'review-source-1',
      normalizedFingerprint: 'fingerprint-v2',
      normalizedDecisionPayload: [{ key: 'sekhem', value: '715' }],
      reproducedFields: ['sekhem'],
      limitations: ['does not cover manual exceptions'],
      nextAction: 'Review changed threshold before publication',
    },
  };
}
