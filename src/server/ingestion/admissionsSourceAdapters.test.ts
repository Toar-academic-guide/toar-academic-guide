import { describe, expect, it } from 'vitest';

import {
  createCapabilityOnlyProof,
  evaluateAdmissionsSourceProof,
  hasDecisionThresholds,
  parseOfficialNumeric,
} from './admissionsSourceAdapters';

describe('admissions source adapter helpers', () => {
  it('evaluates decision-capable proofs through the freshness layer', () => {
    const proof = createCapabilityOnlyProof({
      id: 'proof',
      institutionId: 'tau',
      institutionName: 'Tel Aviv University',
      officialUrl: 'https://example.com',
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      reproducedFields: ['acceptanceThreshold'],
      normalizedPayload: { acceptanceThreshold: 720 },
      limitations: [],
      nextAction: 'schedule',
    });

    const result = evaluateAdmissionsSourceProof(proof);

    expect(result.proof.capability).toBe('decision_capable');
    expect(result.freshness?.capability).toBe('decision_capable');
    expect(result.freshness?.status).toBe('fresh');
  });

  it('keeps failed proofs out of freshness evaluation', () => {
    const proof = createCapabilityOnlyProof({
      id: 'proof',
      institutionId: 'tau',
      institutionName: 'Tel Aviv University',
      officialUrl: 'https://example.com',
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'failed',
      reproducedFields: [],
      normalizedPayload: {},
      limitations: [],
      nextAction: 'inspect',
    });

    expect(evaluateAdmissionsSourceProof(proof).freshness).toBeNull();
  });

  it('detects numeric thresholds in official payloads', () => {
    expect(hasDecisionThresholds({ acceptanceThreshold: '720 points' })).toBe(true);
    expect(hasDecisionThresholds({ selectedScore: 714 })).toBe(false);
  });

  it('parses official numeric values from strings and arrays', () => {
    expect(parseOfficialNumeric('threshold: 712.5')).toBe(712.5);
    expect(parseOfficialNumeric(['680'])).toBe(680);
    expect(parseOfficialNumeric('no value')).toBeUndefined();
  });
});
