import { describe, expect, it, vi } from 'vitest';

import { normalizeStructuredBagrutRecord } from './structuredBagrut';

vi.mock('server-only', () => ({}));

describe('normalizeStructuredBagrutRecord', () => {
  it('canonicalizes subject ordering and derives the same hash for the same academic record', () => {
    const first = normalizeStructuredBagrutRecord({
      schemaVersion: 1,
      sector: 'jewish',
      profileHash: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      subjects: [
        { subjectId: 'mathematics', units: 5, grade: 92 },
        { subjectId: 'history', units: 2, grade: 88 },
      ],
    });
    const reordered = normalizeStructuredBagrutRecord({
      schemaVersion: 1,
      sector: 'jewish',
      subjects: [
        { subjectId: 'history', units: 2, grade: 88 },
        { subjectId: 'mathematics', units: 5, grade: 92 },
      ],
    });

    expect(first.subjects).toEqual([
      { subjectId: 'history', units: 2, grade: 88 },
      { subjectId: 'mathematics', units: 5, grade: 92 },
    ]);
    expect(first.profileHash).toEqual(reordered.profileHash);
    expect(first.profileHash).not.toContain('f'.repeat(64));
  });
});
