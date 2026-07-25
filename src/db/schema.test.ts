import { describe, expect, it } from 'vitest';

import { admissionRequirements, requirementVersions } from './schema';

describe('catalogue duration columns', () => {
  it('supports fractional programme durations', () => {
    expect(admissionRequirements.durationYears.getSQLType()).toBe('real');
    expect(requirementVersions.durationYears.getSQLType()).toBe('real');
  });
});
