import { describe, expect, it } from 'vitest';

import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getAdmissionRouteCapability } from './capabilityRegistry';

describe('admission route capability registry', () => {
  it('enables only the TAU CS pilot with all verification requirements present', () => {
    expect(getAdmissionRouteCapability('tau_cs')).toMatchObject({
      status: 'enabled',
      verificationMode: 'official_finalist_replay',
      missingCapabilities: [],
    });
  });

  it('explains why the BGU pilot remains withheld', () => {
    expect(getAdmissionRouteCapability('bgu_cs')).toMatchObject({
      status: 'disabled',
      missingCapabilities: expect.arrayContaining([
        'fixture_backed_local_score_model',
        'route_action_input_model',
      ]),
    });
  });

  it('does not make unsupported programmes route-capable by default', () => {
    expect(getAdmissionRouteCapability('technion_cs')).toMatchObject({
      status: 'unsupported',
    });
  });
});
