import { describe, expect, it, vi } from 'vitest';
import { createEvaluationSourceContext } from './evaluationSources';

it('allows eight simultaneous calls per host and keeps separate hosts independent', async () => {
  const active = new Map<string, number>(); const peaks = new Map<string, number>();
  const release: Array<() => void> = [];
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const host = new URL(String(input)).host;
    const count = (active.get(host) ?? 0) + 1; active.set(host, count); peaks.set(host, Math.max(peaks.get(host) ?? 0, count));
    await new Promise<void>((done) => release.push(done)); active.set(host, active.get(host)! - 1); return new Response('ok');
  });
  const context = createEvaluationSourceContext(fetcher);
  const calls = Array.from({ length: 20 }, (_, i) => context.fetcher(`https://scores.example/submit/${i}`, { method: 'POST', body: 'synthetic' }));
  calls.push(context.fetcher('https://another.example/submit', { method: 'POST' }));
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(9));
  expect(peaks.get('scores.example')).toBe(8); expect(peaks.get('another.example')).toBe(1);
  for (let i = 0; i < 4; i++) { release.splice(0).forEach((done) => done()); await new Promise((done) => setTimeout(done, 5)); }
  await Promise.all(calls); expect(peaks.get('scores.example')).toBe(8);
  expect(context.sourcesDurationMs()).toBeGreaterThan(0);
});
