import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({ appExperience: () => null }));

vi.mock('@/components/AppExperience', () => ({
  default: hoisted.appExperience,
}));

import ProfilePage from './page';

describe('ProfilePage', () => {
  it('passes a validated admission-alert target into the profile experience', async () => {
    const element = await ProfilePage({
      searchParams: Promise.resolve({
        admissionAlertInstitution: 'tau',
        admissionAlertProgram: 'tau_cs',
      }),
    });

    expect(element.type).toBe(hoisted.appExperience);
    expect(element.props).toEqual({
      initialStep: 'academic-profile',
      admissionAlertTarget: { institutionId: 'tau', programId: 'tau_cs' },
    });
  });

  it('does not pass an unknown target through to the profile experience', async () => {
    const element = await ProfilePage({
      searchParams: Promise.resolve({
        admissionAlertInstitution: 'tau',
        admissionAlertProgram: 'other_program',
      }),
    });

    expect(element.type).toBe(hoisted.appExperience);
    expect(element.props).toEqual({
      initialStep: 'academic-profile',
      admissionAlertTarget: null,
    });
  });

  it('rejects repeated target parameters instead of silently taking the first one', async () => {
    const element = await ProfilePage({
      searchParams: Promise.resolve({
        admissionAlertInstitution: ['tau', 'tau'],
        admissionAlertProgram: 'tau_cs',
      }),
    });

    expect(element.props).toEqual({
      initialStep: 'academic-profile',
      admissionAlertTarget: null,
    });
  });
});
