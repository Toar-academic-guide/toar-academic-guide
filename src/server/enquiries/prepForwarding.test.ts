import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { ENQUIRY_PREP_CONSENT } from '@/lib/enquiries';
import { canForwardToPrep } from './prepForwarding';

describe('prep forwarding requires stored explicit consent and exact evidence', () => {
  it.each([
    {},
    { prep_consent: false, prep_consent_text: ENQUIRY_PREP_CONSENT },
    { prep_consent: true },
    { prep_consent: true, prep_consent_text: null },
    { prep_consent: true, prep_consent_text: '' },
    { prep_consent: true, prep_consent_text: '   ' },
    { prep_consent: true, prep_consent_text: 'not the attestation shown' },
  ])('refuses %j', (storedLead) => {
    expect(canForwardToPrep(storedLead)).toBe(false);
  });
  it('allows only a stored record with both the flag and the exact prep sentence', () => {
    expect(canForwardToPrep({ prep_consent: true, prep_consent_text: ENQUIRY_PREP_CONSENT })).toBe(
      true,
    );
  });
});

describe('prep age attestation cannot be supplied by client-shaped evidence', () => {
  it.each([
    [
      'unticked with forged evidence',
      { prep_consent: false, prep_consent_text: ENQUIRY_PREP_CONSENT },
    ],
    ['missing age attestation', { prep_consent: true, prep_consent_text: null }],
    [
      'obsolete age attestation',
      {
        prep_consent: true,
        prep_consent_text: ENQUIRY_PREP_CONSENT.replace('18 ומעלה', '16 ומעלה'),
      },
    ],
    [
      'client-shaped evidence only',
      {
        prep_consent: false,
        prepConsent: true,
        prepConsentText: ENQUIRY_PREP_CONSENT,
        prepConsentAt: '2000-01-01',
      },
    ],
  ])('denies partner eligibility for %s', (_label, evidence) => {
    expect(canForwardToPrep(evidence)).toBe(false);
  });
});
