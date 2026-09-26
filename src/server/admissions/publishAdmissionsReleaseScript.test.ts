import { describe, expect, it, vi } from 'vitest';

import {
  closeAdmissionPublicationResources,
  runAdmissionsReleasePublicationCli,
} from '../../../scripts/publish-admissions-release.mjs';

describe('admissions publication script cleanup', () => {
  it('reports incomplete cleanup within its deadline', async () => {
    const closeDb = vi.fn(() => new Promise<void>(() => undefined));
    const vite = {
      close: vi.fn(() => new Promise<void>(() => undefined)),
      ssrLoadModule: vi.fn().mockResolvedValue({ closeDb }),
    };
    const log = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    const cleanup = await closeAdmissionPublicationResources(vite, { operationTimeoutMs: 1, log });

    expect(cleanup).toEqual({ incomplete: true });
    expect(closeDb).toHaveBeenCalledOnce();
    expect(vite.close).toHaveBeenCalledOnce();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('database_close_incomplete'));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('vite_close_incomplete'));
  });

  it('forces a nonzero CLI exit after a publication failure so active cleanup handles cannot hang the workflow', async () => {
    const exit = vi.fn();
    const error = new Error('publication update failed');

    await runAdmissionsReleasePublicationCli(
      [],
      { runPublication: () => Promise.reject(error) },
      exit,
    );

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});
