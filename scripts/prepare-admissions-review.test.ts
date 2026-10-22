import { describe, expect, it, vi } from 'vitest';

import { runAdmissionsReviewPreparationCli } from './prepare-admissions-review.mjs';

const argv = ['--run-key', '2026-W42', '--cycle', '2026', '--output', 'scratch/review.json'];

describe('admissions review preparation CLI errors', () => {
  it('prints nested TLS causes and redacts connection credentials from every level', async () => {
    const tlsError = Object.assign(
      new Error('self-signed chain for postgres://tls:tls-secret@db.example.supabase.co/postgres'),
      { code: 'SELF_SIGNED_CERT_IN_CHAIN' },
    );
    tlsError.name = 'TlsError';
    const queryError = new Error('Failed query: select "id" from "institutions"', {
      cause: tlsError,
    });
    const error = new Error(
      'Cannot prepare postgresql://app_runtime:p%40ssword@db.example.supabase.co/postgres',
      { cause: queryError },
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.fn();

    await runAdmissionsReviewPreparationCli(
      argv,
      { createViteServer: vi.fn().mockRejectedValue(error) },
      exit,
    );

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(log).toHaveBeenCalledWith(
      'Cannot prepare postgresql://***@db.example.supabase.co/postgres',
    );
    expect(log).toHaveBeenCalledWith(
      'Caused by: Error: Failed query: select "id" from "institutions"',
    );
    expect(log).toHaveBeenCalledWith(
      'Caused by: TlsError [SELF_SIGNED_CERT_IN_CHAIN]: self-signed chain for postgres://***@db.example.supabase.co/postgres',
    );
    const output = log.mock.calls.flat().join('\n');
    for (const credential of ['app_runtime', 'p%40ssword', 'tls-secret', 'tls:']) {
      expect(output).not.toContain(credential);
    }
  });

  it('limits cause logging to five levels', async () => {
    let error = new Error('hidden sixth cause');
    for (let depth = 5; depth >= 0; depth -= 1) {
      error = new Error(`level ${depth}`, { cause: error });
    }
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.fn();

    await runAdmissionsReviewPreparationCli(
      argv,
      { createViteServer: vi.fn().mockRejectedValue(error) },
      exit,
    );

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(log).toHaveBeenCalledTimes(6);
    expect(log).toHaveBeenLastCalledWith('Caused by: Error: level 5');
  });

  it('handles circular causes and non-Error failures', async () => {
    const circular = new Error('circular', { cause: undefined as unknown });
    circular.cause = circular;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.fn();

    for (const error of [
      circular,
      'postgresql://user:secret/with?#delimiters@localhost/db',
      null,
    ]) {
      await runAdmissionsReviewPreparationCli(
        argv,
        { createViteServer: vi.fn().mockRejectedValue(error) },
        exit,
      );
    }

    expect(exit.mock.calls).toEqual([[1], [1], [1]]);
    expect(log.mock.calls).toEqual([['circular'], ['postgresql://***@localhost/db'], ['null']]);
  });
});
