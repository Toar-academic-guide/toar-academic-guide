import { describe, expect, it } from 'vitest';

import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getAdmissionRouteCapability } from './capabilityRegistry';

describe('admission route capability registry', () => {
  it('enables only the verified TAU CS psychometric route', () => {
    expect(getAdmissionRouteCapability('tau_cs')).toMatchObject({
      status: 'enabled',
      verificationMode: 'official_finalist_replay',
      supportedActionKinds: ['psychometric'],
      requiredInputs: expect.arrayContaining(['tau_bagrut_average']),
      missingCapabilities: ['academic_action_bagrut_recomputation'],
    });
  });

  it('explains why the BGU pilot remains withheld', () => {
    expect(getAdmissionRouteCapability('bgu_cs')).toMatchObject({
      status: 'disabled',
      verificationMode: 'official_finalist_replay',
      supportedActionKinds: [],
      missingCapabilities: expect.arrayContaining([
        'academic_action_bagrut_recomputation',
        'psychometric_action_component_projection',
      ]),
    });
  });

  it('does not make unsupported programmes route-capable by default', () => {
    expect(getAdmissionRouteCapability('technion_cs')).toMatchObject({
      status: 'unsupported',
    });
  });
});
