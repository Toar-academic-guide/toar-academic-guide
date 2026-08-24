import { afterEach, describe, expect, it, vi } from 'vitest';

import { requireOpsDatabaseUrl } from '@/env';
import { assessPublicationDatabaseState } from './operationalDatabaseGate';

describe('operational database gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed when no protected database URL is configured', () => {
    vi.stubEnv('OPS_DATABASE_URL', '');
    vi.stubEnv('DATABASE_URL', '');

    expect(() => requireOpsDatabaseUrl()).toThrow('Missing DATABASE_URL');
  });

  it('prefers the readonly operations URL', () => {
    vi.stubEnv('OPS_DATABASE_URL', 'postgresql://ops');
    vi.stubEnv('DATABASE_URL', 'postgresql://runtime');

    expect(requireOpsDatabaseUrl()).toBe('postgresql://ops');
  });

  it('accepts a clean publication ledger, including the first release', () => {
    expect(
      assessPublicationDatabaseState({
        pendingReleaseCount: 0,
        startedAttemptCount: 0,
        malformedPublishedReleaseCount: 0,
      }),
    ).toEqual({ ready: true, issues: [] });
  });

  it('blocks publication when an incomplete or malformed release is present', () => {
    expect(
      assessPublicationDatabaseState({
        pendingReleaseCount: 1,
        startedAttemptCount: 1,
        malformedPublishedReleaseCount: 1,
      }),
    ).toEqual({
      ready: false,
      issues: [
        '1 pending admission release must be reconciled.',
        '1 started publication attempt must be reconciled.',
        '1 published admission release has incomplete identity evidence.',
      ],
    });
  });
});
