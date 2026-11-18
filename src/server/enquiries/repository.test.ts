import { ENQUIRY_CONSENT, ENQUIRY_PREP_CONSENT } from '@/lib/enquiries';
vi.mock('server-only', () => ({}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { execute, transaction, getDb } = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
  getDb: vi.fn(),
}));
vi.mock('@/db/client', () => ({ getDb }));
import { saveEnquiryBackup } from './repository';
import { PgDialect } from 'drizzle-orm/pg-core';

const enquiry = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  name: 'בדיקת MyWay',
  phone: '0501234567',
  programId: 'bgu_cs',
  institutionId: 'bgu',
  programName: 'מדעי המחשב',
  institutionName: 'בן גוריון',
  sourcePath: '/',
  consent: true as const,
  resultStatus: 'accepted' as const,
  bagrut: 105.5,
  psychometric: 680,
  evaluationInput: {
    degreeId: 'bgu_cs',
    bagrut: 105.5,
    psychometric: 680,
    extraInputs: { bguBagrutAverage: 112.75, psychometricMath: 135 },
  },
  attribution: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'fall_2026',
    referrer: 'https://example.com/article',
  },
  createdAt: new Date('2026-10-24T12:00:00Z'),
};
describe('private enquiry backup', () => {
  beforeEach(() => {
    execute.mockReset().mockResolvedValue({ rows: [] });
    transaction.mockReset().mockImplementation((fn) => fn({ execute }));
    getDb.mockReturnValue({ transaction });
  });
  it('stores the full consented lead through a parameterized insert-only function with a bounded transaction', async () => {
    await saveEnquiryBackup(enquiry);
    const queries = execute.mock.calls.map(([query]) => new PgDialect().sqlToQuery(query));
    expect(queries[0].sql).toMatch(/statement_timeout/);
    expect(queries[1].sql).toContain('public.store_enquiry');
    const payload = JSON.parse(queries[1].params[0] as string);
    expect(payload).toMatchObject({
      ...enquiry,
      attribution: { ...enquiry.attribution, referrer: 'https://example.com' },
      createdAt: '2026-10-24T12:00:00.000Z',
    });
    expect(payload.bagrut).toBe(105.5);
    expect(payload.psychometric).toBe(680);
    expect(payload.evaluationInput).toEqual(enquiry.evaluationInput);
    expect(payload).not.toHaveProperty('bagrut_band');
    expect(payload).not.toHaveProperty('psychometric_band');
    expect(payload.consentText).toContain('MyWay');
    expect(queries[1].sql).not.toContain(enquiry.phone);
  });
  it.each([
    ['/680?bagrut=105.5#what_if_750', '/'],
    ['/680', '/'],
    ['/programs/cs?psychometric=680#score_680', '/programs/cs'],
    ['/programs/cs', '/programs/cs'],
  ])(
    'stores only a known pathname from %s while retaining exact evaluation inputs',
    async (sourcePath, expected) => {
      const attribution = {
        utm_source: '105.5',
        utm_medium: 'paid search',
        utm_campaign: 'psy750',
        unsupported_score: 750,
      };
      await saveEnquiryBackup({ ...enquiry, sourcePath, name: 'Dana 720', attribution });
      const query = new PgDialect().sqlToQuery(execute.mock.calls[1][0]);
      const payload = JSON.parse(query.params[0] as string);
      expect(payload.sourcePath).toBe(expected);
      expect(payload.name).toBe('Dana 720');
      expect(payload.bagrut).toBe(105.5);
      expect(payload.psychometric).toBe(680);
      expect(payload.evaluationInput).toEqual(enquiry.evaluationInput);
      expect(payload.attribution).toEqual({
        utm_source: '105.5',
        utm_medium: 'paid search',
        utm_campaign: 'psy750',
      });
    },
  );
  it('propagates missing-table failure to the independent delivery coordinator', async () => {
    execute.mockRejectedValue(new Error('42P01'));
    await expect(saveEnquiryBackup(enquiry)).rejects.toThrow('42P01');
  });
});

it.each([undefined, false, true])(
  'writes server-owned separate prep consent for %s, retaining institution evidence',
  async (prepConsent) => {
    execute.mockReset().mockResolvedValue({ rows: [] });
    transaction.mockImplementation((fn) => fn({ execute }));
    getDb.mockReturnValue({ transaction });
    const before = Date.now();
    await saveEnquiryBackup({
      ...enquiry,
      prepConsent,
      prepConsentText: 'forged text',
      prepConsentAt: new Date('2000-01-01'),
    });
    const query = new PgDialect().sqlToQuery(execute.mock.calls[1][0]);
    const payload = JSON.parse(query.params[0] as string);
    expect(payload.consent).toBe(true);
    expect(payload.consentText).toBe(ENQUIRY_CONSENT);
    expect(payload.prepConsent).toBe(prepConsent === true);
    expect(payload.prepConsentText).toBe(prepConsent ? ENQUIRY_PREP_CONSENT : null);
    if (prepConsent) {
      expect(Date.parse(payload.prepConsentAt)).toBeGreaterThanOrEqual(before);
      expect(Date.parse(payload.prepConsentAt)).toBeLessThanOrEqual(Date.now());
    } else expect(payload.prepConsentAt).toBeNull();
  },
);

it.each([
  ['unticked', { prepConsent: false }],
  [
    'unticked with forged current evidence',
    {
      prepConsent: false,
      prepConsentText: ENQUIRY_PREP_CONSENT,
      prepConsentAt: new Date('2000-01-01'),
    },
  ],
  [
    'missing attestation with forged evidence',
    { prepConsentText: 'obsolete attestation', prepConsentAt: new Date('2000-01-01') },
  ],
])('stores no prep age attestation for %s', async (_label, evidence) => {
  execute.mockReset().mockResolvedValue({ rows: [] });
  transaction.mockImplementation((fn) => fn({ execute }));
  getDb.mockReturnValue({ transaction });
  await saveEnquiryBackup({
    ...enquiry,
    programId: 'psychometric-preparation',
    institutionId: '',
    ...evidence,
  });
  const query = new PgDialect().sqlToQuery(execute.mock.calls[1][0]);
  const payload = JSON.parse(query.params[0] as string);
  expect(payload).toMatchObject({
    consent: true,
    consentText: ENQUIRY_CONSENT,
    prepConsent: false,
    prepConsentText: null,
    prepConsentAt: null,
  });
});

it.each([null, 'obsolete attestation'])(
  'creates current server evidence for a new affirmative prep consent instead of text %s',
  async (prepConsentText) => {
    execute.mockReset().mockResolvedValue({ rows: [] });
    transaction.mockImplementation((fn) => fn({ execute }));
    getDb.mockReturnValue({ transaction });
    const before = Date.now();
    await saveEnquiryBackup({
      ...enquiry,
      programId: 'psychometric-preparation',
      institutionId: '',
      prepConsent: true,
      prepConsentText,
      prepConsentAt: new Date('2000-01-01'),
    });
    const query = new PgDialect().sqlToQuery(execute.mock.calls[1][0]);
    const payload = JSON.parse(query.params[0] as string);
    expect(payload.prepConsent).toBe(true);
    expect(payload.prepConsentText).toBe(ENQUIRY_PREP_CONSENT);
    expect(Date.parse(payload.prepConsentAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(payload.prepConsentAt)).toBeLessThanOrEqual(Date.now());
  },
);
