import { describe, expect, it } from 'vitest';

import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  composeAdmissionRouteCapability,
  getAdmissionRouteCapability,
  type AdmissionRouteActionCapability,
} from './capabilityRegistry';

const readyActionCapability: AdmissionRouteActionCapability = {
  programId: 'test_program',
  pairId: 'test_program__test_institution',
  status: 'ready',
  verificationMode: 'fixture_backed_local_formula',
  supportedActionKinds: ['psychometric'],
  requiredInputs: ['psychometric'],
  missingCapabilities: [],
  sourceUrls: ['https://example.com/admissions'],
};

describe('admission route capability registry', () => {
  it('enables only the verified TAU CS psychometric route', () => {
    expect(getAdmissionRouteCapability('tau_cs')).toMatchObject({
      pairId: 'tau_cs__tau',
      status: 'enabled',
      evaluatorCapability: 'exact',
      actionCapabilityStatus: 'ready',
      verificationMode: 'official_finalist_replay',
      supportedActionKinds: ['psychometric'],
      requiredInputs: expect.arrayContaining(['tau_bagrut_average']),
      missingCapabilities: ['academic_action_bagrut_recomputation'],
    });
  });

  it('explains why the BGU pilot remains withheld', () => {
    expect(getAdmissionRouteCapability('bgu_cs')).toMatchObject({
      pairId: 'bgu_cs__bgu',
      status: 'disabled',
      evaluatorCapability: 'exact',
      actionCapabilityStatus: 'incomplete',
      verificationMode: 'fixture_backed_local_formula',
      supportedActionKinds: [],
      missingCapabilities: expect.arrayContaining([
        'academic_action_bagrut_recomputation',
        'psychometric_action_component_projection',
        'reviewed_route_action_model',
      ]),
    });
  });

  it('withdraws a ready action model when the exact evaluator becomes stale', () => {
    expect(
      composeAdmissionRouteCapability({
        actionCapability: readyActionCapability,
        evaluatorCapability: 'stale',
      }),
    ).toMatchObject({
      status: 'disabled',
      evaluatorCapability: 'stale',
      actionCapabilityStatus: 'ready',
      missingCapabilities: ['exact_evaluator'],
    });
  });

  it('does not enable an exact evaluator without a reviewed action model', () => {
    expect(
      composeAdmissionRouteCapability({
        actionCapability: {
          ...readyActionCapability,
          status: 'incomplete',
          supportedActionKinds: [],
          missingCapabilities: ['psychometric_action_projection'],
        },
        evaluatorCapability: 'exact',
      }),
    ).toMatchObject({
      status: 'disabled',
      evaluatorCapability: 'exact',
      actionCapabilityStatus: 'incomplete',
      missingCapabilities: ['psychometric_action_projection', 'reviewed_route_action_model'],
    });
  });

  it('does not make unsupported programmes route-capable by default', () => {
    expect(getAdmissionRouteCapability('technion_cs')).toMatchObject({
      status: 'unsupported',
      evaluatorCapability: 'unsupported',
    });
  });
});
