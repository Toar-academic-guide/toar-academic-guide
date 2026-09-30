import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { runAdmissionAlertProcessing, createRateLimitedOfficialFetcher } from './processingRuntime';
import { parseAlertProcessingArguments } from '../../../scripts/process-admission-alerts.mjs';

afterEach(() => vi.useRealTimers());
describe('protected alert processing', () => {
  it('does not process an unpublished, bootstrap or proof release', async () => {
    const process = vi.fn();
    const enqueueMissed = vi.fn();
    expect(
      await runAdmissionAlertProcessing(
        { releaseId: 'release' },
        { enqueue: async () => ({ status: 'not_processable' }), process, enqueueMissed },
      ),
    ).toMatchObject({ status: 'not_processable' });
    expect(process).not.toHaveBeenCalled();
    expect(enqueueMissed).not.toHaveBeenCalled();
  });
  it('recovers missed work and stops at the batch limit for a later invocation', async () => {
    const process = vi
      .fn()
      .mockResolvedValue({ status: 'pending', processedSubscriptionCount: 100 });
    const enqueue = vi.fn().mockResolvedValue({ status: 'enqueued' });
    const enqueueMissed = vi.fn();
    expect(
      await runAdmissionAlertProcessing(
        { releaseId: 'release', maxBatches: 2 },
        { enqueue, enqueueMissed, process },
      ),
    ).toEqual({ status: 'batch_limit', batches: 2, processed: 200 });
    expect(enqueue).toHaveBeenCalledWith('release');
    expect(enqueueMissed).toHaveBeenCalledOnce();
    expect(process).toHaveBeenCalledTimes(2);
  });
  it('handles an empty or replayed release without extra work', async () => {
    expect(
      await runAdmissionAlertProcessing(
        {},
        { enqueueMissed: async () => {}, process: async () => ({ status: 'idle' }) },
      ),
    ).toEqual({ status: 'idle', batches: 0, processed: 0 });
  });
  it('stops on a lost lease and rejects unbounded runs', async () => {
    expect(
      await runAdmissionAlertProcessing(
        {},
        {
          enqueueMissed: async () => {},
          process: async () => ({ status: 'lease_lost', processedSubscriptionCount: 1 }),
        },
      ),
    ).toMatchObject({ status: 'lease_lost', batches: 1 });
    await expect(runAdmissionAlertProcessing({ maxBatches: 11 })).rejects.toThrow('maxBatches');
  });
  it('spaces official requests by at least two seconds', async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const fetcher = createRateLimitedOfficialFetcher(
      vi.fn(async () => {
        starts.push(Date.now());
        return new Response('{}');
      }),
    );
    const requests = [
      fetcher('https://example.test/1'),
      fetcher('https://example.test/2'),
      fetcher('https://example.test/3'),
    ];
    await vi.runAllTimersAsync();
    await Promise.all(requests);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(2000);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(2000);
  });
  it('validates CLI release identifiers and keeps processing protected and non-sending', () => {
    expect(parseAlertProcessingArguments([])).toEqual({});
    expect(() => parseAlertProcessingArguments(['--release-id', 'not-a-uuid'])).toThrow();
    const workflow = readFileSync('.github/workflows/admission-alert-processing.yml', 'utf8');
    expect(workflow).toContain('environment: admissions-publication');
    expect(workflow).toContain('ADMISSION_ALERT_DATABASE_URL');
    expect(workflow).toContain('admission-alert-release-${{ inputs.release_id');
    expect(workflow).toContain('group: admission-alert-official-source-budget');
    expect(workflow).toContain('ref: main');
    expect(workflow).not.toMatch(/RESEND|deliveryWorker/);
    const publication = readFileSync('.github/workflows/admissions-publication.yml', 'utf8');
    expect(publication).toContain("needs.publish-reviewed-release.result == 'success'");
    expect(publication).toContain('needs.publish-reviewed-release.outputs.release_id');
  });
});
