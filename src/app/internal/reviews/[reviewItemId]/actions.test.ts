import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  getInternalAdminAuthorization: vi.fn(),
  rejectReviewItem: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/server/internal/adminAuth', () => ({
  getInternalAdminAuthorization: hoistedMocks.getInternalAdminAuthorization,
}));

vi.mock('@/server/ingestion/reviewResolution', () => ({
  rejectReviewItem: hoistedMocks.rejectReviewItem,
}));

vi.mock('next/cache', () => ({
  revalidatePath: hoistedMocks.revalidatePath,
}));

import { resolveReviewItemNoChangeAction } from './actions';

describe('review item server actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.rejectReviewItem.mockReset();
    hoistedMocks.getInternalAdminAuthorization.mockReset();
    hoistedMocks.revalidatePath.mockReset();
  });

  it('does not resolve investigations for unauthenticated users', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'unauthenticated',
      isAdmin: false,
    });

    await expect(resolveReviewItemNoChangeAction('review-source-1')).resolves.toEqual({
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can resolve review investigations.',
    });
    expect(hoistedMocks.rejectReviewItem).not.toHaveBeenCalled();
    expect(hoistedMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('does not resolve investigations for non-admin users', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'non_admin',
      isAdmin: false,
      user: { id: 'user-123', email: 'user@example.com' },
    });

    await expect(resolveReviewItemNoChangeAction('review-source-1')).resolves.toEqual({
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can resolve review investigations.',
    });
    expect(hoistedMocks.rejectReviewItem).not.toHaveBeenCalled();
  });

  it('resolves a no-change investigation for admins and revalidates internal routes', async () => {
    hoistedMocks.getInternalAdminAuthorization.mockResolvedValue({
      status: 'admin',
      isAdmin: true,
      user: { id: 'admin-123', email: 'operator@example.com' },
    });
    hoistedMocks.rejectReviewItem.mockResolvedValue({ status: 'rejected' });

    await expect(resolveReviewItemNoChangeAction('review-source-1')).resolves.toEqual({
      status: 'rejected',
      message:
        'Investigation resolved with no canonical catalogue change. GitHub merge is required to publish admissions data.',
    });
    expect(hoistedMocks.rejectReviewItem).toHaveBeenCalledWith('review-source-1');
    expect(hoistedMocks.revalidatePath).toHaveBeenCalledWith('/internal/reviews/review-source-1');
    expect(hoistedMocks.revalidatePath).toHaveBeenCalledWith('/internal/data-health');
  });
});
