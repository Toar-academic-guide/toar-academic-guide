// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

async function openPage(status: string, ok = true) {
  history.replaceState(null, '', '/admission-alerts/unsubscribe#token=' + 'a'.repeat(43));
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => ({ data: { status } }) });
  vi.stubGlobal('fetch', fetchMock);
  const html = await GET().text();
  document.documentElement.innerHTML = html;
  const script = document.querySelector('script')!.textContent!;
  new Function(script)();
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  await vi.waitFor(() =>
    expect(document.querySelector('#status')!.textContent).not.toBe('בודקים את מצב ההתראות…'),
  );
  return fetchMock;
}
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});
describe('unsubscribe page saved state', () => {
  it('shows already unsubscribed on every reopening without cancelling again', async () => {
    for (let i = 0; i < 2; i++) {
      const request = await openPage('unsubscribed');
      expect(document.querySelector('#status')!.textContent).toContain('כבר הוסרת');
      expect(document.querySelector<HTMLButtonElement>('#unsubscribe')!.hidden).toBe(true);
      expect(JSON.parse(request.mock.calls[0][1].body).action).toBe('status');
    }
  });
  it('requires an explicit click for a still-active link', async () => {
    const request = await openPage('ready');
    const button = document.querySelector<HTMLButtonElement>('#unsubscribe')!;
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(request).toHaveBeenCalledOnce();
    request.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { status: 'unsubscribed', mayStillArrive: false } }),
    });
    button.click();
    await vi.waitFor(() => expect(button.hidden).toBe(true));
    expect(JSON.parse(request.mock.calls[1][1].body).action).toBeUndefined();
  });
  it('does not offer cancellation when status cannot be checked', async () => {
    await openPage('ready', false);
    expect(document.querySelector('#status')!.textContent).toContain('לא הצלחנו לבדוק');
    expect(document.querySelector<HTMLButtonElement>('#unsubscribe')!.hidden).toBe(true);
  });
});
