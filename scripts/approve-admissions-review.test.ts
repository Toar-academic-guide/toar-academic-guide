import { describe, expect, it, vi } from 'vitest';

const id = '0b38bb88-4c4f-4b4a-a74e-18802ff29961';
const args = [id, '--actor', 'operator'];
// Dynamic loading makes each missing CLI behavior visible in the initial red test count.
async function run(argv: string[], dependencies: Record<string, unknown>, exit: (code: number) => void) {
  const module = await import('./approve-admissions-review.mjs');
  return module.runAdmissionsReviewApprovalCli(argv, dependencies, exit);
}

describe('approve admissions review CLI', () => {
  it.each([[], ['bad-id', '--actor', 'operator'], [id], [id, '--actor', ' '], [id, '--actor'], [...args, '--extra'], [id, '--actor', 'operator', '--actor', 'duplicate']])('rejects invalid arguments %j without loading the database runtime', async (...argv) => {
    const approve = vi.fn(); const createViteServer = vi.fn(); const exit = vi.fn();
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    await run(argv as string[], { approve, createViteServer }, exit);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(approve).not.toHaveBeenCalled(); expect(createViteServer).not.toHaveBeenCalled();
  });
  it.each(['approved', 'not_found', 'already_resolved', 'unsupported_target', 'invalid_proposed_value', 'stale_review', 'publication_failed'])('prints JSON and exits correctly for %s', async (status) => {
    const result = { status }; const approve = vi.fn().mockResolvedValue(result); const exit = vi.fn();
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    await run(args, { approve }, exit);
    expect(approve).toHaveBeenCalledExactlyOnceWith(id, expect.objectContaining({ actor: 'operator', auditLog: expect.any(Function) }));
    expect(stdout).toHaveBeenCalledExactlyOnceWith(JSON.stringify(result));
    expect(exit).toHaveBeenCalledExactlyOnceWith(status === 'approved' ? 0 : 1);
  });
  it('uses the real resolver with an injected repository and emits one audit on stderr', async () => {
    const { approveReviewItem } = await import('../src/server/ingestion/reviewResolution');
    const repository = { getReviewItem: vi.fn(async () => null), markReviewItemRejected: vi.fn(), markSourceFreshnessReviewApproved: vi.fn() };
    const approve = (reviewId: string, options: object) => approveReviewItem(reviewId, { ...options, repository });
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.fn();
    await run(args, { approve }, exit);
    expect(stdout).toHaveBeenCalledExactlyOnceWith('{"status":"not_found"}');
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stderr.mock.calls[0][0])).toEqual({ event: 'admissions_review_item_resolved', action: 'approve', reviewItemId: id, sourceId: null, actor: 'operator', status: 'not_found', previousFreshnessStatus: null, newFreshnessStatus: null });
  });
  it('closes the DB pool and Vite runtime after resolution', async () => {
    const approve = vi.fn().mockResolvedValue({ status: 'approved' });
    const closeDb = vi.fn(); const close = vi.fn(); const exit = vi.fn();
    const ssrLoadModule = vi.fn(async (path: string) => path.includes('reviewResolution') ? { approveReviewItem: approve } : { closeDb });
    const createViteServer = vi.fn(async () => ({ ssrLoadModule, close }));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await run(args, { createViteServer }, exit);
    expect(approve).toHaveBeenCalledOnce(); expect(closeDb).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });
});
