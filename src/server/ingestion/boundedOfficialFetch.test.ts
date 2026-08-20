import { describe, expect, it, vi } from 'vitest';

import { withBoundedOfficialResponse } from './boundedOfficialFetch';

describe('withBoundedOfficialResponse', () => {
  it('rejects an oversized response before reading its body', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('ignored', { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } }),
      );

    await expect(
      withBoundedOfficialResponse(fetcher, { timeoutMs: 100 })('https://official.example/large'),
    ).rejects.toThrow('exceeded');
  });

  it('times out while an official response body is still streaming', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
      },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));

    await expect(
      withBoundedOfficialResponse(fetcher, { timeoutMs: 1 })(
        'https://official.example/stalled-body',
      ),
    ).rejects.toThrow('timed out');
  });
});
