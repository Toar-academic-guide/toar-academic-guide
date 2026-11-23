import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENQUIRY_CONSENT, ENQUIRY_PREP_CONSENT } from '@/lib/enquiries';
import {
  THRESHOLD_ALERT_CONSENT,
  THRESHOLD_ALERT_CYCLE,
  normalizeThresholdAlertEmail,
  normalizeThresholdAlertPhone,
  parseThresholdAlertSignup,
  readThresholdAlertSelection,
  thresholdAlertDegreeForProgram,
  thresholdAlertPath,
} from './thresholdAlerts';

describe('threshold publication alert signup', () => {
  it('keeps the alert consent separate from lead and prep consent', () => {
    expect(THRESHOLD_ALERT_CONSENT).toContain('תנאי הקבלה');
    expect(THRESHOLD_ALERT_CONSENT).toContain('2027');
    expect(THRESHOLD_ALERT_CONSENT).not.toContain('חברת הכנה');
    expect(THRESHOLD_ALERT_CONSENT).not.toBe(ENQUIRY_CONSENT);
    expect(THRESHOLD_ALERT_CONSENT).not.toBe(ENQUIRY_PREP_CONSENT);
    expect(readFileSync('src/lib/enquiries.ts', 'utf8')).not.toContain(THRESHOLD_ALERT_CONSENT);
  });

  it('stores an Israeli mobile as WhatsApp E.164 and rejects other numbers', () => {
    expect(normalizeThresholdAlertPhone('050-123-4567')).toBe('+972501234567');
    expect(normalizeThresholdAlertPhone('+972 50 123 4567')).toBe('+972501234567');
    expect(normalizeThresholdAlertPhone('972501234567')).toBe('+972501234567');
    expect(normalizeThresholdAlertPhone('')).toBeNull();
    expect(normalizeThresholdAlertPhone('03-1234567')).toBeNull();
    expect(normalizeThresholdAlertPhone('050123456')).toBeNull();
  });

  it('accepts a normal email and rejects an empty or broken one', () => {
    expect(normalizeThresholdAlertEmail('  Student@Example.COM ')).toBe('student@example.com');
    expect(normalizeThresholdAlertEmail('')).toBeNull();
    expect(normalizeThresholdAlertEmail('not-an-email')).toBeNull();
  });

  it('requires a known institution or degree, one contact, and explicit consent', () => {
    const parsed = parseThresholdAlertSignup({
      institutions: ['tau', 'technion'],
      degrees: ['cs'],
      email: 'student@example.com',
      phone: '0501234567',
      consent: true,
      sourcePath: '/institutions/tau?from=page',
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        email: 'student@example.com',
        phone: '+972501234567',
        institutions: ['tau', 'technion'],
        degrees: ['cs'],
        cycle: THRESHOLD_ALERT_CYCLE,
        consent: true,
        consentText: THRESHOLD_ALERT_CONSENT,
        sourcePath: '/institutions/tau',
      },
    });
  });

  it.each([
    [{ institutions: [], degrees: [], email: 'a@b.co', consent: true }, 'target'],
    [{ institutions: ['afeka'], degrees: ['cs'], email: 'a@b.co', consent: true }, 'target'],
    [{ institutions: ['tau'], email: '', phone: '', consent: true }, 'contact'],
    [{ institutions: ['tau'], email: 'nope', consent: true }, 'email'],
    [{ institutions: ['tau'], phone: '031234567', consent: true }, 'phone'],
    [{ institutions: ['tau'], email: 'a@b.co', consent: false }, 'consent'],
  ] as const)('rejects %j as %s', (input, field) => {
    expect(parseThresholdAlertSignup(input)).toEqual({ ok: false, field });
  });

  it('allows email alone or WhatsApp alone', () => {
    expect(
      parseThresholdAlertSignup({
        degrees: ['medicine'],
        phone: '0521234567',
        consent: true,
      }).ok,
    ).toBe(true);
    expect(
      parseThresholdAlertSignup({
        institutions: ['huji'],
        email: 'a@b.co',
        consent: true,
      }).ok,
    ).toBe(true);
  });

  it('builds an indexable path and reads only known selections from the query', () => {
    expect(thresholdAlertPath({ institutions: ['tau', 'ono'], degrees: ['law'] })).toBe(
      '/threshold-alerts?institution=tau&degree=law',
    );
    expect(
      readThresholdAlertSelection(
        new URLSearchParams('institution=tau&institution=afeka&degree=cs'),
      ),
    ).toEqual({ institutions: ['tau'], degrees: ['cs'] });
  });

  it('maps a programme page to a tracked degree when one exists', () => {
    expect(thresholdAlertDegreeForProgram('cs')).toBe('cs');
    expect(thresholdAlertDegreeForProgram('softwareeng')).toBe('software_engineering');
    expect(thresholdAlertDegreeForProgram('graphic_design')).toBeNull();
  });
});
