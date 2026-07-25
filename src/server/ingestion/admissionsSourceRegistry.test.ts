import { describe, expect, it } from 'vitest';

import {
  admissionsSourceTargets,
  buildCapabilityMatrixProof,
  selectAdmissionsSourceTargets,
} from './admissionsSourceRegistry';

describe('admissionsSourceRegistry', () => {
  it('selects the verified HUJI, BGU, Technion, Haifa, and TAU programs as default exact live proof targets', () => {
    expect(selectAdmissionsSourceTargets().map((target) => target.id)).toEqual([
      'huji-accounting-live',
      'huji-biology-live',
      'huji-business-live',
      'huji-communication-live',
      'huji-cs-live',
      'huji-datascience-live',
      'huji-economics-live',
      'huji-education-live',
      'huji-huji_accounting-live',
      'huji-huji_biology-live',
      'huji-huji_business-live',
      'huji-huji_cs-live',
      'huji-huji_datascience-live',
      'huji-huji_economics-live',
      'huji-huji_law-live',
      'huji-huji_medicine-live',
      'huji-huji_occupational_therapy-live',
      'huji-huji_psychology-live',
      'huji-huji_socialwork-live',
      'huji-law-live',
      'huji-medicine-live',
      'huji-nursing-live',
      'huji-nutrition-live',
      'huji-occupational_therapy-live',
      'huji-pharmacy-live',
      'huji-political_science-live',
      'huji-psychology-live',
      'huji-social_work-live',
      'bgu-accounting-live',
      'bgu-bgu_accounting-live',
      'bgu-biology-live',
      'bgu-bgu_biology-live',
      'bgu-business-live',
      'bgu-bgu_business-live',
      'bgu-cs-live',
      'bgu-bgu_cs-live',
      'bgu-datascience-live',
      'bgu-bgu_datascience-live',
      'bgu-economics-live',
      'bgu-bgu_economics-live',
      'bgu-ee-live',
      'bgu-bgu_ee-live',
      'bgu-me-live',
      'bgu-bgu_me-live',
      'bgu-bgu_industrial-live',
      'bgu-bgu_medicine-live',
      'bgu-bgu_nursing-live',
      'bgu-psychology-live',
      'bgu-bgu_psychology-live',
      'bgu-social_work-live',
      'bgu-bgu_socialwork-live',
      'technion-cs-live',
      'technion-technion_cs-live',
      'technion-datascience-live',
      'technion-technion_datascience-live',
      'technion-ee-live',
      'technion-technion_ee-live',
      'technion-me-live',
      'technion-technion_me-live',
      'technion-medicine-live',
      'technion-technion_medicine-live',
      'technion-technion_biomedical-live',
      'technion-technion_civil-live',
      'technion-technion_industrial-live',
      'haifa-cs-live',
      'tau-digital-sciences-live',
      'tau-nursing-live',
      'tau-psychology-live',
      'tau-social-work-live',
      'tau-social-work-legacy-live',
      'tau-psychology-legacy-live',
      'tau-digital-sciences-legacy-live',
      'tau-law-live',
      'tau-law-legacy-live',
      'tau-accounting-live',
      'tau-accounting-legacy-live',
      'tau-business-live',
      'tau-business-legacy-live',
      'tau-architecture-live',
      'tau-biology-live',
      'tau-communication-live',
      'tau-political-science-live',
      'tau-education-live',
      'tau-economics-live',
      'tau-economics-legacy-live',
      'tau-cs-live',
      'tau-cs-legacy-live',
      'tau-ee-live',
      'tau-ee-legacy-live',
      'tau-me-live',
      'tau-me-legacy-live',
      'tau-occupational-live',
      'tau-occupational-legacy-live',
      'tau-industrial-live',
      'tau-biology-legacy-live',
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
