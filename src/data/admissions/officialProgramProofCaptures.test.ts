import { describe, expect, it } from 'vitest';

import { OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID } from './officialProgramProofCaptures';
import { admissionsSourceTargets } from '@/server/ingestion/admissionsSourceRegistry';

describe('official program proof captures', () => {
  it('removes only the unsupported architecture accepted capture', () => {
    const captures = OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID['tau-architecture-live']!;
    expect(captures).toHaveLength(1);
    expect(captures[0]).toMatchObject({
      captureId: 'tau-architecture-live:official-below:2026-07-31T10:11:16.543Z',
      capturedAt: '2026-07-31T10:11:16.543Z',
      officialUrl: 'https://go.tau.ac.il/he/arts/ba/arch?v=admission-requirements',
      applicant: { psychometric: 620, bagrutAverage: 90 },
      expected: { score: 548, verdict: 'below' },
    });
    for (const targetId of [
      'tau-law-live',
      'tau-law-legacy-live',
      'tau-biology-live',
      'tau-biology-legacy-live',
    ]) {
      const unchanged = OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID[targetId]!;
      expect(unchanged).toHaveLength(2);
      expect(unchanged.map((capture) => capture.expected)).toEqual([
        { score: 679, verdict: 'accepted' },
        { score: 548, verdict: 'below' },
      ]);
      expect(
        unchanged.every((capture) => capture.officialUrl === 'https://go.tau.ac.il/graphql'),
      ).toBe(true);
    }
  });

  it('provides independently captured eligible and below fixtures for every exact source target', () => {
    const exactTargetIds = admissionsSourceTargets
      .filter((target) => target.category === 'exact')
      .map((target) => target.id)
      .sort();

    const knownTargetIds = new Set(admissionsSourceTargets.map((target) => target.id));

    expect(Object.keys(OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID)).toEqual(
      expect.arrayContaining(exactTargetIds),
    );
    expect(
      Object.keys(OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID).every((targetId) =>
        knownTargetIds.has(targetId),
      ),
    ).toBe(true);

    for (const targetId of exactTargetIds) {
      const captures = OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID[targetId]!;

      expect(captures).toHaveLength(2);
      expect(new Set(captures.map((capture) => capture.captureId)).size).toBe(2);
      expect(captures.some((capture) => capture.expected.verdict === 'below')).toBe(true);
      expect(
        captures.some(
          (capture) =>
            capture.expected.verdict === 'accepted' ||
            capture.expected.verdict === 'eligible_to_apply',
        ),
      ).toBe(true);
    }
  });
});
