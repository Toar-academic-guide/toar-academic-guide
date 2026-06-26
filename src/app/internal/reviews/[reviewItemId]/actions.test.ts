import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  approveReviewItem: vi.fn(),
  getInternalAdminAuthorization: vi.fn(),
  rejectReviewItem: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/internal/adminAuth', () => ({
  getInternalAdminAuthorization: hoistedMocks.getInternalAdminAuthorization,
}));

vi.mock('@/server/ingestion/reviewResolution', () => ({
  approveReviewItem: hoistedMocks.approveReviewItem,
  rejectReviewItem: hoistedMocks.rejectReviewItem,
}));

vi.mock('next/cache', () => ({
  revalidatePath: hoistedMocks.revalidatePath,
}));

import { approveReviewItemAction, rejectReviewItemAction } from './actions';

describe('review item server actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.approveReviewItem.mockReset();
    hoistedMocks.rejectReviewItem.mockReset();
    hoistedMocks.getInternalAdminAuthorization.mockReset();
    hoistedMocks.revalidatePath.mockReset();
  });

  it('does not call approve service for unauthenticated users', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'unauthenticated',
      isAdmin: false,
    });

    await expect(approveReviewItemAction('review-source-1')).resolves.toEqual({
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can approve review items.',
    });
    expect(hoistedMocks.approveReviewItem).not.toHaveBeenCalled();
    expect(hoistedMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('does not call reject service for non-admin users', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'non_admin',
      isAdmin: false,
      user: { id: 'user-123', email: 'user@example.com' },
    });

    await expect(rejectReviewItemAction('review-source-1')).resolves.toEqual({
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can reject review items.',
    });
    expect(hoistedMocks.rejectReviewItem).not.toHaveBeenCalled();
  });

  it('returns controlled approve results for admins and revalidates internal routes', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'admin',
      isAdmin: true,
      user: { id: 'admin-123', email: 'operator@example.com' },
    });
    hoistedMocks.approveReviewItem.mockResolvedValue({ status: 'approved' });

    await expect(approveReviewItemAction('review-source-1')).resolves.toEqual({
      status: 'approved',
      message: 'Review item approved and source freshness state resolved.',
    });
    expect(hoistedMocks.approveReviewItem).toHaveBeenCalledWith('review-source-1');
    expect(hoistedMocks.revalidatePath).toHaveBeenCalledWith('/internal/reviews/review-source-1');
    expect(hoistedMocks.revalidatePath).toHaveBeenCalledWith('/internal/data-health');
  });

  it('returns controlled reject results for admins', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'admin',
      isAdmin: true,
      user: { id: 'admin-123', email: 'operator@example.com' },
    });
    hoistedMocks.rejectReviewItem.mockResolvedValue({ status: 'rejected' });

    await expect(rejectReviewItemAction('review-source-1')).resolves.toEqual({
      status: 'rejected',
      message: 'Review item rejected without publishing canonical catalogue changes.',
    });
    expect(hoistedMocks.rejectReviewItem).toHaveBeenCalledWith('review-source-1');
  });
});
