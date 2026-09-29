import { describe, expect, it, vi } from 'vitest';

import { toStoredBagrutProfilePayload } from '@/lib/storedBagrutProfile';
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

  it('includes schema-v2 certificate facts in the normalized record and profile hash', () => {
    const internal = normalizeStructuredBagrutRecord({
      schemaVersion: 2,
      sector: 'jewish',
      certificateType: 'internal',
      complete: true,
      subjects: [
        { subjectId: 'physics', units: 5, grade: 95, assessmentKind: 'final_project' },
        { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'exam' },
      ],
    });
    if (internal.schemaVersion !== 2) {
      throw new Error('Expected schema-v2 record.');
    }
    const external = normalizeStructuredBagrutRecord({
      schemaVersion: 2,
      sector: internal.sector,
      certificateType: 'external_1977_or_later',
      complete: true,
      subjects: internal.subjects,
    });

    expect(internal.subjects).toEqual([
      { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'exam' },
      { subjectId: 'physics', units: 5, grade: 95, assessmentKind: 'final_project' },
    ]);
    expect(internal.profileHash).not.toBe(external.profileHash);
    expect(internal.profileHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(toStoredBagrutProfilePayload(internal)).toEqual({
      certificateType: 'internal',
      complete: true,
      subjects: [
        { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'exam' },
        { subjectId: 'physics', units: 5, grade: 95, assessmentKind: 'final_project' },
      ],
    });
  });
});
