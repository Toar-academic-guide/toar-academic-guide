import { describe, expect, it } from 'vitest';

import {
  createCapabilityOnlyProof,
  evaluateAdmissionsSourceProof,
  hasDecisionThresholds,
  type AdmissionsSourceProof,
} from './admissionsSourceAdapters';

const decisionCapableProof: AdmissionsSourceProof = {
  id: 'haifa-cs',
  institutionId: 'haifa',
  institutionName: 'University of Haifa',
  officialUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
  adapterId: 'haifa',
  capability: 'decision_capable',
  proofLevel: 'exact_official',
  status: 'succeeded',
  sourceClass: 'api_static_json',
  reproducedFields: ['weightedScore', 'acceptanceCutoff', 'rejectionCutoff'],
  normalizedPayload: {
    weightedScore: 706,
    acceptanceCutoff: 705,
    rejectionCutoff: 680,
  },
  limitations: [],
  nextAction: 'Use as first weekly freshness adapter candidate',
};

describe('evaluateAdmissionsSourceProof', () => {
  it('keeps decision-capable proof payloads compatible with freshness evaluation', () => {
    const result = evaluateAdmissionsSourceProof(decisionCapableProof);

    expect(result.freshness).toMatchObject({
      id: 'haifa-cs',
      capability: 'decision_capable',
      status: 'fresh',
      reviewWorthy: false,
    });
    expect(result.freshness?.normalizedDecisionPayload).toEqual({
      fields: {
        acceptanceCutoff: 705,
        rejectionCutoff: 680,
        weightedScore: 706,
      },
    });
  });

  it('marks changed official thresholds as review-worthy through the existing evaluator', () => {
    const previous = evaluateAdmissionsSourceProof(decisionCapableProof);
    const changed = evaluateAdmissionsSourceProof(
      {
        ...decisionCapableProof,
        normalizedPayload: {
          ...decisionCapableProof.normalizedPayload,
          acceptanceCutoff: 712,
        },
      },
      previous.freshness?.normalizedFingerprint,
    );

    expect(changed.freshness).toMatchObject({
      capability: 'decision_capable',
      status: 'changed_needs_review',
      reviewWorthy: true,
    });
  });

  it('keeps score-only evidence from becoming decision-capable review evidence', () => {
    const scoreOnly = evaluateAdmissionsSourceProof({
      ...decisionCapableProof,
      id: 'technion-score',
      institutionId: 'technion',
      institutionName: 'Technion',
      adapterId: 'capability_matrix',
      capability: 'score_only',
      proofLevel: 'partial_official',
      status: 'partial',
      sourceClass: 'score_only_calculator',
      reproducedFields: ['sekhemScore'],
      normalizedPayload: { sekhemScore: 91.2 },
      limitations: ['No official threshold or status returned by this proof'],
      nextAction: 'Pair with official threshold source before product decisions',
    });

    const changed = evaluateAdmissionsSourceProof(
      {
        ...scoreOnly.proof,
        normalizedPayload: { sekhemScore: 92.1 },
      },
      scoreOnly.freshness?.normalizedFingerprint,
    );

    expect(changed.freshness).toMatchObject({
      capability: 'score_only',
      status: 'changed_needs_review',
      reviewWorthy: false,
    });
  });

  it('returns blocked proof without throwing the whole report flow', () => {
    const result = evaluateAdmissionsSourceProof(
      createCapabilityOnlyProof({
        id: 'biu',
        institutionId: 'biu',
        institutionName: 'Bar-Ilan University',
        officialUrl: 'https://in.biu.ac.il/Pages/Psychometric.aspx',
        capability: 'blocked',
        proofLevel: 'blocked',
        status: 'blocked',
        reproducedFields: [],
        normalizedPayload: { reason: 'Radware browser cookies required' },
        limitations: ['ASP.NET view state and browser cookies are required'],
        nextAction: 'Move to Hermes/VPS browser lane',
        blockedReason: 'Radware browser cookies required',
      }),
    );

    expect(result.freshness).toMatchObject({
      capability: 'blocked',
      status: 'blocked',
      reviewWorthy: false,
      blockedReason: 'Radware browser cookies required',
    });
  });

  it('does not evaluate failed live attempts as freshness facts', () => {
    const result = evaluateAdmissionsSourceProof({
      ...decisionCapableProof,
      status: 'failed',
      errorReason: 'GraphQL response was not JSON',
    });

    expect(result.freshness).toBeNull();
  });
});

describe('hasDecisionThresholds', () => {
  it('requires an official threshold-shaped field for accepted/rejected support', () => {
    expect(hasDecisionThresholds({ weightedScore: 706 })).toBe(false);
    expect(hasDecisionThresholds({ weightedScore: 706, acceptanceCutoff: 705 })).toBe(true);
  });
});
