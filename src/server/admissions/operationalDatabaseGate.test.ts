import { describe, expect, it } from 'vitest';

import {
  assessPublicationDatabaseState,
  resolveOperationalDatabaseUrl,
} from './operationalDatabaseGate';

describe('operational database gate', () => {
  it('fails closed when no protected database URL is configured', () => {
    expect(() => resolveOperationalDatabaseUrl({})).toThrow(
      'A database connection URL is required',
    );
  });

  it('prefers the readonly operations URL', () => {
    expect(
      resolveOperationalDatabaseUrl({
        OPS_DATABASE_URL: 'postgresql://ops',
        DATABASE_URL: 'postgresql://runtime',
      }),
    ).toBe('postgresql://ops');
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
