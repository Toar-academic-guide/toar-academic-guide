import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), approve: vi.fn(), reject: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/server/internal/adminAuth', () => ({ getInternalAdminAuthorization: mocks.auth }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/server/ingestion/reviewResolution', async (importOriginal) => ({
  ...await importOriginal<object>(), approveReviewItem: mocks.approve, rejectReviewItem: mocks.reject,
}));
import { resolveReviewItemApproveAction, resolveReviewItemApproveFormAction, resolveReviewItemNoChangeAction } from './actions';
import type { ApproveReviewItemResult, ReviewResolutionRepository } from '@/server/ingestion/reviewResolution';

const results: [ApproveReviewItemResult, string][] = [
  [{ status: 'approved' }, 'השינוי אושר.'],
  [{ status: 'not_found' }, 'הפריט לא נמצא.'],
  [{ status: 'already_resolved', reviewItemStatus: 'rejected' }, 'הפריט כבר טופל.'],
  [{ status: 'unsupported_target', targetField: 'other' }, 'לא ניתן לאשר שינוי מסוג זה.'],
  [{ status: 'invalid_proposed_value' }, 'פרטי השינוי אינם תקינים.'],
  [{ status: 'stale_review' }, 'הפריט אינו העדכני למקור זה.'],
  [{ status: 'publication_failed' }, 'האישור נכשל. אפשר לנסות שוב.'],
];

describe('approve review actions', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ isAdmin: true, user: { id: 'admin-id', email: 'unused@example.com' } }); });
  it.each(['unauthenticated', 'non_admin'])('denies %s before calling the resolver', async (status) => {
    mocks.auth.mockResolvedValue({ status, isAdmin: false });
    expect(await resolveReviewItemApproveAction('review-id')).toEqual({ status: 'unauthorized', message: 'Only allowlisted internal admins can resolve review investigations.' });
    expect(mocks.approve).not.toHaveBeenCalled(); expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it.each(results)('maps $0.status to its message and revalidates both routes', async (result, message) => {
    mocks.approve.mockResolvedValue(result);
    expect(await resolveReviewItemApproveAction('review-id')).toEqual({ status: result.status, message });
    expect(mocks.approve).toHaveBeenCalledExactlyOnceWith('review-id');
    expect(mocks.revalidate.mock.calls).toEqual([['/internal/reviews/review-id'], ['/internal/data-health']]);
  });
  it('supports the form action', async () => {
    mocks.approve.mockResolvedValue({ status: 'approved' });
    expect(await resolveReviewItemApproveFormAction('review-id', null, new FormData())).toEqual({ status: 'approved', message: 'השינוי אושר.' });
  });
  it.each(['approve', 'reject'] as const)('audits the page %s once with the admin user id', async (action) => {
    const original = await vi.importActual<typeof import('@/server/ingestion/reviewResolution')>('@/server/ingestion/reviewResolution');
    const repository: ReviewResolutionRepository = { getReviewItem: vi.fn(async () => null), markReviewItemRejected: vi.fn(), markSourceFreshnessReviewApproved: vi.fn() };
    const resolver = action === 'approve' ? original.approveReviewItem : original.rejectReviewItem;
    (action === 'approve' ? mocks.approve : mocks.reject).mockImplementation((id: string) => resolver(id, { repository }));
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    await (action === 'approve' ? resolveReviewItemApproveAction : resolveReviewItemNoChangeAction)('missing-id');
    expect(log).toHaveBeenCalledExactlyOnceWith({ event: 'admissions_review_item_resolved', action, reviewItemId: 'missing-id', actor: 'admin-id', sourceId: null, status: 'not_found', previousFreshnessStatus: null, newFreshnessStatus: null });
  });
});
