import { describe, expect, it } from 'vitest';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import {
  evaluateProgramVerification,
  fingerprintVerificationFixtures,
  parseProgramVerificationRegistry,
} from './programVerification';

const SOURCE_FINGERPRINT = `sha256:${'a'.repeat(64)}`;

function makeFixtures(
  pairId = 'tau_datascience__tau',
): [AdmissionsVerificationFixture, AdmissionsVerificationFixture] {
  return [
    {
      id: `${pairId}:eligible`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'accepted',
      input: {
        psychometric: 700,
        bagrut: 110,
      },
      expected: {
        score: 712,
        verdict: 'accepted',
      },
      sourceFingerprint: SOURCE_FINGERPRINT,
      capturedAt: '2026-07-25T10:00:00.000Z',
    },
    {
      id: `${pairId}:below`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: {
        psychometric: 620,
        bagrut: 95,
      },
      expected: {
        score: 660,
        verdict: 'below',
      },
      sourceFingerprint: SOURCE_FINGERPRINT,
      capturedAt: '2026-07-25T10:00:00.000Z',
    },
  ];
}

function makeContract(
  overrides: Partial<AdmissionsProgramVerificationContract> = {},
): AdmissionsProgramVerificationContract {
  const fixtures = makeFixtures();

  return {
    pairId: 'tau_datascience__tau',
    programId: 'tau_datascience',
    institutionId: 'tau',
    officialProgramId: '056011050000',
    admissionCycle: '2026-2027',
    source: {
      targetId: 'tau-digital-sciences-live',
      url: 'https://go.tau.ac.il/graphql',
    },
    calculation: {
      adapterId: 'tau',
      mode: 'official_replay',
      formulaFamily: 'tau_engineering',
      requiredInputs: [],
      cutoff: {
        acceptance: 700,
        rejection: 680,
      },
      gates: [],
    },
    fixtureIds: fixtures.map((fixture) => fixture.id),
    fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
    sourceFingerprint: SOURCE_FINGERPRINT,
    proof: {
      state: 'verified',
      comparedScore: true,
      comparedVerdict: true,
      liveComparedAt: '2026-07-25T10:00:00.000Z',
      sourceFingerprint: SOURCE_FINGERPRINT,
    },
    ...overrides,
  };
}

describe('program verification contracts', () => {
  it('accepts sanitized structured Bagrut records in replay fixtures', () => {
    const [eligible, below] = makeFixtures();
    const fixture = {
      ...eligible,
      input: {
        ...eligible.input,
        bagrutSubjectRecord: {
          schemaVersion: 1 as const,
          sector: 'jewish' as const,
          subjects: [
            { subjectId: 'mathematics', units: 5, grade: 80 },
            { subjectId: 'history', units: 2, grade: 90 },
            { subjectId: 'bible', units: 2, grade: 88 },
          ],
        },
      },
    };

    const result = evaluateProgramVerification({
      contract: makeContract({
        fixtureIds: [fixture.id, below.id],
        fixtureSetFingerprint: fingerprintVerificationFixtures([fixture, below]),
      }),
      fixtures: [fixture, below],
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.state).toBe('exact');
  });

  it('treats an officially eligible-to-apply fixture as the positive boundary', () => {
    const [eligible, below] = makeFixtures();
    const eligibleToApply = {
      ...eligible,
      verdict: 'eligible_to_apply' as const,
      expected: {
        ...eligible.expected,
        verdict: 'eligible_to_apply' as const,
      },
    };

    const result = evaluateProgramVerification({
      contract: makeContract({
        fixtureIds: [eligibleToApply.id, below.id],
        fixtureSetFingerprint: fingerprintVerificationFixtures([eligibleToApply, below]),
      }),
      fixtures: [eligibleToApply, below],
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.state).toBe('exact');
  });

  it('activates a complete contract with eligible and below fixtures', () => {
    const fixtures = makeFixtures();
    const result = evaluateProgramVerification({
      contract: makeContract({
        fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      }),
      fixtures,
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result).toEqual({
      state: 'exact',
      capability: 'exact',
      issues: [],
    });
  });

  it('withholds exact capability when the eligible fixture is missing', () => {
    const fixtures = makeFixtures().filter((fixture) => fixture.verdict === 'below');
    const result = evaluateProgramVerification({
      contract: makeContract({
        fixtureIds: fixtures.map((fixture) => fixture.id),
        fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      }),
      fixtures,
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.capability).toBe('authority_unavailable');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'missing_eligible_fixture' }),
    );
  });

  it('withholds exact capability when the below-threshold fixture is missing', () => {
    const fixtures = makeFixtures().filter((fixture) => fixture.verdict === 'accepted');
    const result = evaluateProgramVerification({
      contract: makeContract({
        fixtureIds: fixtures.map((fixture) => fixture.id),
        fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      }),
      fixtures,
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.capability).toBe('authority_unavailable');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'missing_below_fixture' }),
    );
  });

  it('does not activate a score-only proof that never compared the official verdict', () => {
    const result = evaluateProgramVerification({
      contract: makeContract({
        proof: {
          state: 'verified',
          comparedScore: true,
          comparedVerdict: false,
          liveComparedAt: '2026-07-25T10:00:00.000Z',
          sourceFingerprint: SOURCE_FINGERPRINT,
        },
      }),
      fixtures: makeFixtures(),
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.capability).toBe('authority_unavailable');
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'verdict_not_compared' }));
  });

  it('rejects duplicate official targets in the contract registry', () => {
    const first = makeContract();
    const secondFixtures = makeFixtures('tau_cs__tau');
    const second = makeContract({
      pairId: 'tau_cs__tau',
      programId: 'tau_cs',
      fixtureIds: secondFixtures.map((fixture) => fixture.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(secondFixtures),
    });
    const registry = parseProgramVerificationRegistry([first, second]);

    expect(registry.contracts).toEqual([]);
    expect(registry.issues).toContainEqual(
      expect.objectContaining({
        code: 'duplicate_target',
        targetId: 'tau-digital-sciences-live',
      }),
    );
  });

  it('marks a contract stale when its admission cycle is not current', () => {
    const result = evaluateProgramVerification({
      contract: makeContract(),
      fixtures: makeFixtures(),
      currentAdmissionCycle: '2027-2028',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.capability).toBe('stale');
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'stale_cycle' }));
  });

  it('marks a contract stale when the current source fingerprint drifts', () => {
    const result = evaluateProgramVerification({
      contract: makeContract(),
      fixtures: makeFixtures(),
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: `sha256:${'c'.repeat(64)}`,
    });

    expect(result.capability).toBe('stale');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'source_fingerprint_mismatch' }),
    );
  });

  it('marks a contract stale when its fixture fingerprint no longer matches', () => {
    const fixtures = makeFixtures();
    fixtures[0] = {
      ...fixtures[0],
      expected: {
        ...fixtures[0].expected,
        score: 713,
      },
    };
    const result = evaluateProgramVerification({
      contract: makeContract(),
      fixtures,
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.capability).toBe('stale');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'fixture_fingerprint_mismatch' }),
    );
  });

  it('blocks a fixture containing PII-like applicant fields', () => {
    const fixtures = makeFixtures();
    fixtures[0] = {
      ...fixtures[0],
      input: {
        ...fixtures[0].input,
        email: 'applicant@example.com',
      },
    };
    const result = evaluateProgramVerification({
      contract: makeContract({
        fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      }),
      fixtures,
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.capability).toBe('blocked');
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'fixture_contains_pii' }));
  });

  it('blocks PII-like values nested inside a Bagrut subject record', () => {
    const fixtures = makeFixtures();
    fixtures[0] = {
      ...fixtures[0],
      input: {
        ...fixtures[0].input,
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'applicant@example.com', units: 5, grade: 90 }],
        },
      },
    };
    const result = evaluateProgramVerification({
      contract: makeContract({ fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures) }),
      fixtures,
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'fixture_contains_pii' }));
  });

  it('blocks applicant name fields in fixture input', () => {
    const fixtures = makeFixtures();
    fixtures[0] = {
      ...fixtures[0],
      input: {
        ...fixtures[0].input,
        applicantName: 'Dana Levi',
      },
    };

    const result = evaluateProgramVerification({
      contract: makeContract({
        fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      }),
      fixtures,
      currentAdmissionCycle: '2026-2027',
      currentSourceFingerprint: SOURCE_FINGERPRINT,
    });

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'fixture_contains_pii' }));
  });
});
