import { describe, expect, it } from 'vitest';

import { OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID } from './officialProgramProofCaptures';
import { admissionsSourceTargets } from '@/server/ingestion/admissionsSourceRegistry';

describe('official program proof captures', () => {
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
