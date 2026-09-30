import { describe, expect, it, vi } from 'vitest';
const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));
import { requireVerifiedEmailUser } from './auth';
describe('verified recipient activation', () => {
  it.each([
    { id: 'user', email: 'test@example.org' },
    { id: 'user', email: 'test@example.org', email_confirmed_at: '2026-09-29', is_anonymous: true },
  ])('blocks an unverified or anonymous account', async (user) => {
    getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(requireVerifiedEmailUser()).rejects.toMatchObject({
      status: 403,
      code: 'VERIFIED_EMAIL_REQUIRED',
    });
  });
  it('uses a server-verified account', async () => {
    const user = { id: 'user', email: 'test@example.org', email_confirmed_at: '2026-09-29' };
    getUser.mockResolvedValue({ data: { user }, error: null });
    expect(await requireVerifiedEmailUser()).toBe(user);
  });
});
