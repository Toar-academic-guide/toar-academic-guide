import { describe, expect, it } from 'vitest';

import {
  admissionsSourceTargets,
  buildCapabilityMatrixProof,
  selectAdmissionsSourceTargets,
} from './admissionsSourceRegistry';

describe('admissionsSourceRegistry', () => {
  it('selects the verified Haifa and TAU programs as the default exact live proof targets', () => {
    expect(selectAdmissionsSourceTargets().map((target) => target.id)).toEqual([
      'haifa-cs-live',
      'tau-digital-sciences-live',
      'tau-nursing-live',
      'tau-psychology-live',
      'tau-social-work-live',
      'tau-social-work-legacy-live',
      'tau-psychology-legacy-live',
      'tau-digital-sciences-legacy-live',
    ]);
  });

  it('supports running one target at a time', () => {
    expect(
      selectAdmissionsSourceTargets(['tau-digital-sciences-live']).map((target) => target.id),
    ).toEqual(['tau-digital-sciences-live']);
  });

  it('keeps every discussed institution in the capability matrix', () => {
    expect(
      [...new Set(admissionsSourceTargets.map((target) => target.institutionId))].sort(),
    ).toEqual([
      'afeka',
      'ariel',
      'bgu',
      'biu',
      'haifa',
      'hit',
      'huji',
      'mta',
      'open_university',
      'reichman',
      'shenkar',
      'tau',
      'technion',
    ]);
  });

  it('classifies Open University as open admission instead of a failed calculator', () => {
    const target = admissionsSourceTargets.find((entry) => entry.id === 'openu-open-admission');
    expect(target).toBeDefined();

    const proof = buildCapabilityMatrixProof(target!);

    expect(proof).toMatchObject({
      capability: 'decision_capable',
      proofLevel: 'open_admission',
      status: 'succeeded',
      normalizedPayload: {
        openAdmissionPolicy: true,
      },
    });
  });

  it('keeps browser-protected sources blocked for the GitHub Action lane', () => {
    const blocked = admissionsSourceTargets
      .filter((target) => target.category === 'blocked')
      .map(buildCapabilityMatrixProof);

    expect(blocked).toHaveLength(2);
    expect(blocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          institutionId: 'biu',
          capability: 'blocked',
          status: 'blocked',
          nextAction: 'Move to Hermes/VPS browser automation lane',
        }),
        expect.objectContaining({
          institutionId: 'ariel',
          capability: 'blocked',
          status: 'blocked',
          nextAction: 'Move to Hermes/VPS browser automation lane',
        }),
      ]),
    );
  });

  it('separates exact, partial, static-candidate, open-admission, blocked, manual-gate, and requirements-only categories', () => {
    expect(new Set(admissionsSourceTargets.map((target) => target.category))).toEqual(
      new Set([
        'blocked',
        'exact',
        'manual_gate',
        'open_admission',
        'partial',
        'requirements_only',
        'static_candidate',
      ]),
    );
  });
});
