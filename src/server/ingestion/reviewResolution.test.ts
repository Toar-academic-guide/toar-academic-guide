import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  approveReviewItem,
  rejectReviewItem,
  type ReviewResolutionItem,
  type ReviewResolutionRepository,
} from './reviewResolution';

const reviewedAt = new Date('2026-06-24T12:00:00.000Z');

function sourceFreshnessValue(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sourceId: 'tau-live',
    normalizedFingerprint: 'fingerprint-v2',
    normalizedDecisionPayload: { sekhem: 715 },
    reproducedFields: ['sekhem'],
    limitations: ['manual exceptions not reproduced'],
    nextAction: 'Review changed threshold before publication',
    ...overrides,
  };
}

function reviewItem(overrides: Partial<ReviewResolutionItem> = {}): ReviewResolutionItem {
  return {
    id: 'review-source-1',
    targetField: 'sourceFreshness',
    proposedValue: sourceFreshnessValue(),
    status: 'pending',
    ...overrides,
  };
}

function fakeRepository(
  item: ReviewResolutionItem | null,
  overrides: Partial<ReviewResolutionRepository> = {},
): ReviewResolutionRepository {
  return {
    getReviewItem: vi.fn(async () => item),
    markReviewItemRejected: vi.fn(async () => {}),
    markSourceFreshnessReviewApproved: vi.fn(async (): Promise<'approved'> => 'approved'),
    ...overrides,
  };
}

describe('rejectReviewItem', () => {
  it('rejects a pending review item without publishing source freshness', async () => {
    const repository = fakeRepository(reviewItem());

    await expect(rejectReviewItem('review-source-1', { repository, reviewedAt })).resolves.toEqual({
      status: 'rejected',
    });

    expect(repository.markReviewItemRejected).toHaveBeenCalledWith({
      reviewItemId: 'review-source-1',
      reviewedAt,
    });
    expect(repository.markSourceFreshnessReviewApproved).not.toHaveBeenCalled();
  });

  it('does not reject missing or already resolved items', async () => {
    const missingRepository = fakeRepository(null);
    const approvedRepository = fakeRepository(reviewItem({ status: 'approved' }));

    await expect(
      rejectReviewItem('missing', { repository: missingRepository, reviewedAt }),
    ).resolves.toEqual({
      status: 'not_found',
    });
    await expect(
      rejectReviewItem('review-source-1', { repository: approvedRepository, reviewedAt }),
    ).resolves.toEqual({
      status: 'already_resolved',
      reviewItemStatus: 'approved',
    });

    expect(missingRepository.markReviewItemRejected).not.toHaveBeenCalled();
    expect(approvedRepository.markReviewItemRejected).not.toHaveBeenCalled();
  });
});

describe('approveReviewItem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('approves a pending source freshness review through the publication repository', async () => {
    const repository = fakeRepository(reviewItem());

    await expect(approveReviewItem('review-source-1', { repository, reviewedAt })).resolves.toEqual(
      {
        status: 'approved',
      },
    );

    expect(repository.markSourceFreshnessReviewApproved).toHaveBeenCalledWith({
      reviewItemId: 'review-source-1',
      sourceId: 'tau-live',
      reviewedAt,
    });
  });

  it('fails closed for unsupported target fields', async () => {
    const repository = fakeRepository(
      reviewItem({
        targetField: 'programDescription',
        proposedValue: { programDescription: 'Updated description' },
      }),
    );

    await expect(approveReviewItem('review-source-1', { repository, reviewedAt })).resolves.toEqual(
      {
        status: 'unsupported_target',
        targetField: 'programDescription',
      },
    );

    expect(repository.markSourceFreshnessReviewApproved).not.toHaveBeenCalled();
  });

  it('fails closed for invalid source freshness proposed values', async () => {
    const repository = fakeRepository(
      reviewItem({
        proposedValue: { normalizedFingerprint: 'missing source id' },
      }),
    );

    await expect(approveReviewItem('review-source-1', { repository, reviewedAt })).resolves.toEqual(
      {
        status: 'invalid_proposed_value',
      },
    );

    expect(repository.markSourceFreshnessReviewApproved).not.toHaveBeenCalled();
  });

  it('returns stale_review when source freshness state no longer points at the item', async () => {
    const repository = fakeRepository(reviewItem(), {
      markSourceFreshnessReviewApproved: vi.fn(async (): Promise<'stale_review'> => 'stale_review'),
    });

    await expect(approveReviewItem('review-source-1', { repository, reviewedAt })).resolves.toEqual(
      {
        status: 'stale_review',
      },
    );
  });

  it('does not publish missing or already resolved review items', async () => {
    const missingRepository = fakeRepository(null);
    const rejectedRepository = fakeRepository(reviewItem({ status: 'rejected' }));

    await expect(
      approveReviewItem('missing', { repository: missingRepository, reviewedAt }),
    ).resolves.toEqual({
      status: 'not_found',
    });
    await expect(
      approveReviewItem('review-source-1', { repository: rejectedRepository, reviewedAt }),
    ).resolves.toEqual({
      status: 'already_resolved',
      reviewItemStatus: 'rejected',
    });

    expect(missingRepository.markSourceFreshnessReviewApproved).not.toHaveBeenCalled();
    expect(rejectedRepository.markSourceFreshnessReviewApproved).not.toHaveBeenCalled();
  });

  it('reports publication failure without returning a false approved state', async () => {
    const repository = fakeRepository(reviewItem(), {
      markSourceFreshnessReviewApproved: vi.fn(async () => {
        throw new Error('database write failed');
      }),
    });

    await expect(approveReviewItem('review-source-1', { repository, reviewedAt })).resolves.toEqual(
      {
        status: 'publication_failed',
      },
    );
  });
});
