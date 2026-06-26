import { describe, expect, it } from 'vitest';

import {
  admissionsSourceTargets,
  buildCapabilityMatrixProof,
  selectAdmissionsSourceTargets,
} from './admissionsSourceRegistry';

describe('admissionsSourceRegistry', () => {
  it('selects exact Haifa and TAU targets by default', () => {
    expect(selectAdmissionsSourceTargets().map((target) => target.id)).toEqual([
      'haifa-cs-live',
      'tau-digital-sciences-live',
    ]);
  });

  it('filters targets by stable id', () => {
    expect(
      selectAdmissionsSourceTargets(['biu-browser-required']).map((target) => target.id),
    ).toEqual(['biu-browser-required']);
  });

  it('keeps blocked sources blocked without attempting a fetch', () => {
    const target = admissionsSourceTargets.find((entry) => entry.id === 'biu-browser-required');

    expect(target).toBeDefined();
    const proof = buildCapabilityMatrixProof(target!);

    expect(proof.status).toBe('blocked');
    expect(proof.capability).toBe('blocked');
    expect(proof.blockedReason).toBe('Radware/browser session required');
  });

  it('classifies Open University as policy rather than a failed calculator', () => {
    const target = admissionsSourceTargets.find((entry) => entry.id === 'openu-open-admission');

    expect(target).toBeDefined();
    const proof = buildCapabilityMatrixProof(target!);

    expect(proof.status).toBe('succeeded');
    expect(proof.proofLevel).toBe('open_admission');
    expect(proof.normalizedPayload).toMatchObject({ openAdmissionPolicy: true });
  });
});
