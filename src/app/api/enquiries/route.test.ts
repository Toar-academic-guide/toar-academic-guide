vi.mock('server-only', () => ({}));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const {
  listCataloguePrograms,
  listCatalogueInstitutions,
  capture,
  flush,
  after,
  evaluate,
  backup,
  notify,
} = vi.hoisted(() => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
  capture: vi.fn(),
  flush: vi.fn(),
  after: vi.fn(),
  evaluate: vi.fn(),
  backup: vi.fn(),
  notify: vi.fn(),
}));
vi.mock('@/server/catalogue/queries', () => ({ listCataloguePrograms, listCatalogueInstitutions }));
vi.mock('next/server', () => ({ after }));
vi.mock('posthog-node', () => ({
  PostHog: class {
    capture = capture;
    flush = flush;
  },
}));
vi.mock('@/server/admissions/evaluator', () => ({ evaluateAdmissionsForProgram: evaluate }));
vi.mock('@/server/enquiries/repository', () => ({ saveEnquiryBackup: backup }));
vi.mock('@/server/enquiries/notifications', () => ({ notifyEnquiry: notify }));
import { POST } from './route';

const enquiry = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  name: 'בדיקת MyWay',
  phone: '0501234567',
  programId: 'physiotherapy',
  institutionId: 'tau',
  sourcePath: '/?step=results',
  consent: true,
};
function request(overrides = {}, origin = 'https://myway.example') {
  return new Request('https://myway.example/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ ...enquiry, ...overrides }),
  });
}

describe('website enquiries → Monday', () => {
  beforeEach(() => {
    backup.mockReset().mockRejectedValue(new Error('relation enquiries does not exist'));
    notify.mockReset().mockResolvedValue(undefined);
    evaluate
      .mockReset()
      .mockResolvedValue({ results: [{ linkedInstitutionId: 'tau', decision: 'accepted' }] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    capture.mockReset();
    flush.mockReset().mockResolvedValue(undefined);
    after.mockReset();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'test-analytics-token');
    vi.stubEnv('MONDAY_API_TOKEN', 'test-server-token');
    listCataloguePrograms.mockResolvedValue({
      data: [getStaticCataloguePrograms().find((program) => program.id === 'physiotherapy')!],
    });
    listCatalogueInstitutions.mockResolvedValue({
      data: [{ id: 'tau', name: 'אוניברסיטת תל אביב' }],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: { create_item: { id: '123456' } } })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('passes normalized attribution to Monday, the backup and server analytics', async () => {
    const attribution = {
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: 'fall_2026',
      referrer: 'https://example.com/article?phone=0501234567#private',
    };
    expect((await POST(request({ attribution }))).status).toBe(201);
    const expected = { ...attribution, referrer: 'https://example.com/article' };
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    const context = JSON.parse(
      JSON.parse(body.variables.columns).long_text_mm8ay37r.text.split('\n\nLead context:\n')[1],
    );
    expect(context).toMatchObject(expected);
    expect(backup).toHaveBeenCalledWith(expect.objectContaining({ attribution: expected }));
    await after.mock.calls[0][0]();
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({ properties: expect.objectContaining(expected) }),
    );
  });
  it.each([
    '/programs/cs?psychometric=680#score_680',
    '/programs/cs#score_680?psychometric=680',
    '/programs/cs?psychometric=680',
    '/programs/cs#score_680',
  ])('stores only the pathname from %s in Monday and the private backup', async (sourcePath) => {
    backup.mockResolvedValueOnce(undefined);
    const attribution = { utm_source: 'instagram', utm_campaign: 'fall_2026' };
    expect((await POST(request({ sourcePath, attribution }))).status).toBe(201);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    const columns = JSON.parse(body.variables.columns);
    expect(columns.text_mm8am52m).toBe('/programs/cs');
    expect(JSON.stringify(body)).not.toContain('680');
    expect(backup).toHaveBeenCalledWith(
      expect.objectContaining({ sourcePath: '/programs/cs', attribution }),
    );
    const context = JSON.parse(columns.long_text_mm8ay37r.text.split('\n\nLead context:\n')[1]);
    expect(context).toMatchObject(attribution);
    await after.mock.calls[0][0]();
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ source_path: '/programs/cs', ...attribution }),
      }),
    );
  });
  it.each([
    ['/680', '/'],
    ['/psychometric_680?bagrut=105.5#what_if_750', '/'],
    ['/programs/cs', '/programs/cs'],
    ['/app/calculator?psychometric=680', '/app/calculator'],
  ])('guards the source route %s before either delivery', async (sourcePath, expected) => {
    expect((await POST(request({ sourcePath }))).status).toBe(201);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(JSON.parse(body.variables.columns).text_mm8am52m).toBe(expected);
    expect(backup).toHaveBeenCalledWith(expect.objectContaining({ sourcePath: expected }));
  });
  it('preserves names and bounded campaign strings, storing only supported attribution keys', async () => {
    const attribution = {
      utm_source: '105.5',
      utm_medium: 'paid search',
      utm_campaign: 'psy750 / סתיו',
      unsupported_score: 750,
    };
    expect((await POST(request({ name: 'Dana 720', attribution }))).status).toBe(201);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.variables.name).toBe('Dana 720');
    const context = JSON.parse(
      JSON.parse(body.variables.columns).long_text_mm8ay37r.text.split('\n\nLead context:\n')[1],
    );
    const expected = {
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
    };
    expect(context).toMatchObject(expected);
    expect(context).not.toHaveProperty('unsupported_score');
    expect(backup).toHaveBeenCalledWith(expect.objectContaining({ attribution: expected }));
  });
  it.each([
    { utm_source: 'x'.repeat(101) },
    { utm_medium: 'x'.repeat(101) },
    { utm_campaign: 'x'.repeat(101) },
    { referrer: 'https://example.com/' + 'x'.repeat(256) },
  ])('rejects invalid attribution before either destination: %j', async (attribution) => {
    expect((await POST(request({ attribution }))).status).toBe(400);
    expect(backup).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('delivers only the consented contact fields and server-resolved programme', async () => {
    const result = await POST(request());
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual({ data: { received: true } });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.monday.com/v2');
    expect(options?.headers).toMatchObject({
      Authorization: 'test-server-token',
      'Idempotency-Key': expect.any(String),
    });
    const body = JSON.parse(options?.body as string);
    expect(body.variables.board).toBe('18436300533');
    expect(body.variables.name).toBe(enquiry.name);
    expect(JSON.parse(body.variables.columns)).toMatchObject({
      phone_mm8ar2e2: { phone: '+972501234567', countryShortName: 'IL' },
      text_mm8a6zex: 'פיזיותרפיה',
      text_mm8a4c4w: 'אוניברסיטת תל אביב',
      boolean_mm8abpda: { checked: 'true' },
      color_mm8aqhym: { label: 'חדש' },
    });
    const context = JSON.parse(
      JSON.parse(body.variables.columns).long_text_mm8ay37r.text.split('\n\nLead context:\n')[1],
    );
    expect(context).toMatchObject({
      program_id: 'physiotherapy',
      institution_id: 'tau',
      result_status: 'unknown',
      bagrut_band: null,
      psychometric_band: null,
    });
  });

  it('does not accept unchecked consent or extra academic data', async () => {
    expect((await POST(request({ consent: false }))).status).toBe(400);
    expect((await POST(request({ bagrut: 110 }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it('rejects an unrelated institution and cross-site submissions', async () => {
    expect((await POST(request({ institutionId: 'unrelated' }))).status).toBe(400);
    expect((await POST(request({}, 'https://unrelated.example'))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it.each([
    ['accounting', 'colman'],
    ['cs', 'reichman'],
    ['afeka_engineering', 'afeka'],
    ['colman_law', 'colman'],
  ])(
    'accepts the resolved %s / %s target when the form is submitted',
    async (programId, institutionId) => {
      listCataloguePrograms.mockResolvedValue({
        data: getStaticCataloguePrograms().filter((program) => program.id !== 'afeka_engineering'),
      });
      listCatalogueInstitutions.mockResolvedValue({ data: getStaticCatalogueInstitutions() });
      expect((await POST(request({ programId, institutionId }))).status).toBe(201);
      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(JSON.parse(body.variables.columns)).toMatchObject({
        text_mm8ag00n: programId,
        text_mm8a4c4w: getStaticCatalogueInstitutions().find((entry) => entry.id === institutionId)!
          .name,
      });
    },
  );

  it('does not submit a lead when the database catalogue cannot be read', async () => {
    listCataloguePrograms.mockRejectedValue(new Error('database unavailable'));
    expect((await POST(request())).status).toBe(502);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never reports success when Monday rejects an item or the credential is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ errors: [{ message: 'private details' }] }));
    const failure = await POST(request());
    expect(failure.status).toBe(502);
    expect(await failure.text()).not.toContain('private details');
    vi.stubEnv('MONDAY_API_TOKEN', '');
    expect((await POST(request())).status).toBe(503);
    expect(after).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('captures an anonymous server event only after successful lead delivery, then flushes', async () => {
    expect((await POST(request({ sourcePath: '/enquiry?phone=0501234567#private' }))).status).toBe(
      201,
    );
    expect(capture).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
    await after.mock.calls[0][0]();
    expect(capture.mock.calls).toEqual([
      [
        {
          distinctId: enquiry.requestId,
          event: 'server_enquiry_created',
          properties: {
            program_id: 'physiotherapy',
            institution_id: 'tau',
            source_path: '/enquiry',
            $process_person_profile: false,
          },
        },
      ],
    ]);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('skips analytics while still scheduling notifications when its token is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
    expect((await POST(request())).status).toBe(201);
    expect(after).toHaveBeenCalledOnce();
    await after.mock.calls[0][0]();
    expect(capture).not.toHaveBeenCalled();
  });

  it('does not track a failed Monday request', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('private provider details'));
    expect((await POST(request())).status).toBe(502);
    expect(after).not.toHaveBeenCalled();
  });

  it('does not wait for analytics delivery before responding', async () => {
    flush.mockReturnValue(new Promise(() => {}));
    expect((await POST(request())).status).toBe(201);
    void after.mock.calls[0][0]();
    await vi.waitFor(() => expect(flush).toHaveBeenCalledTimes(1));
  });

  it.each(['capture', 'flush', 'schedule'])('ignores analytics %s errors', async (failure) => {
    if (failure === 'capture')
      capture.mockImplementation(() => {
        throw new Error('analytics unavailable');
      });
    if (failure === 'flush') flush.mockRejectedValue(new Error('analytics unavailable'));
    if (failure === 'schedule')
      after.mockImplementation(() => {
        throw new Error('analytics unavailable');
      });
    expect((await POST(request())).status).toBe(201);
    if (failure !== 'schedule') await expect(after.mock.calls[0][0]()).resolves.toBeUndefined();
  });

  it('uses the same idempotency key when the same enquiry is retried', async () => {
    await POST(request());
    await POST(request());
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][1]?.headers).toEqual(calls[1][1]?.headers);
  });
});

describe('enquiry context and independent delivery', () => {
  beforeEach(() => {
    vi.stubEnv('MONDAY_API_TOKEN', 'token');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    after.mockReset();
    notify.mockReset().mockResolvedValue(undefined);
    backup.mockReset().mockResolvedValue(undefined);
    evaluate
      .mockReset()
      .mockResolvedValue({ results: [{ linkedInstitutionId: 'tau', decision: 'accepted' }] });
    listCataloguePrograms.mockResolvedValue({
      data: [getStaticCataloguePrograms().find((program) => program.id === 'physiotherapy')!],
    });
    listCatalogueInstitutions.mockResolvedValue({ data: [{ id: 'tau', name: 'תל אביב' }] });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: { create_item: { id: '123456' } } })),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const evaluationInput = {
    degreeId: 'physiotherapy',
    bagrut: 105.5,
    psychometric: 680,
    extraInputs: { psychometricMath: 135 },
  };
  it.each(['accepted', 'below', 'eligible_to_apply', 'unknown', 'pending'])(
    'derives %s from the server evaluator',
    async (decision) => {
      evaluate.mockResolvedValue({ results: [{ linkedInstitutionId: 'tau', decision }] });
      expect((await POST(request({ evaluationInput }))).status).toBe(201);
      expect(evaluate).toHaveBeenCalledWith(expect.objectContaining({ input: evaluationInput }));
      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      const context = JSON.parse(
        JSON.parse(body.variables.columns).long_text_mm8ay37r.text.split('\n\nLead context:\n')[1],
      );
      expect(context).toEqual({
        program_id: 'physiotherapy',
        institution_id: 'tau',
        result_status: decision === 'pending' ? 'unknown' : decision,
        bagrut_band: '105–109',
        psychometric_band: '650–699',
      });
      const mondayPayload = JSON.stringify(body);
      for (const score of ['105.5', '680', '135']) expect(mondayPayload).not.toContain(score);
      expect(backup).toHaveBeenCalledWith(
        expect.objectContaining({
          resultStatus: context.result_status,
          evaluationInput,
          bagrut: 105.5,
          psychometric: 680,
        }),
      );
    },
  );
  it.each([
    { resultStatus: 'accepted' },
    { evaluationInput: { ...evaluationInput, bagrut: 999 } },
    { evaluationInput: { ...evaluationInput, psychometric: '680' } },
    { evaluationInput: { ...evaluationInput, degreeId: 'other' } },
    { evaluationInput: { ...evaluationInput, extraInputs: { email: 'private@example.com' } } },
  ])('rejects forged or invalid context %j', async (extra) => {
    expect((await POST(request(extra))).status).toBe(400);
    expect(backup).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts a large valid evaluation record without losing the lead', async () => {
    const largeInput = {
      ...evaluationInput,
      extraInputs: {
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: Array.from({ length: 64 }, (_, i) => ({
            subjectId: `subject_${i}_${'x'.repeat(80)}`,
            units: 5,
            grade: 95,
          })),
        },
      },
    };
    expect((await POST(request({ evaluationInput: largeInput }))).status).toBe(201);
    expect(backup).toHaveBeenCalledWith(expect.objectContaining({ evaluationInput: largeInput }));
  });

  it('keeps delivery working with unknown status when evaluation fails', async () => {
    evaluate.mockRejectedValue(new Error('private failure'));
    expect((await POST(request({ evaluationInput }))).status).toBe(201);
    expect(backup).toHaveBeenCalledWith(
      expect.objectContaining({ resultStatus: 'unknown', bagrut: 105.5 }),
    );
    expect(console.error).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private failure');
  });
  it.each(['graphql', 'network', 'missing token'])(
    'accepts the DB backup despite Monday %s failure',
    async (failure) => {
      if (failure === 'graphql')
        vi.mocked(fetch).mockResolvedValue(
          Response.json({ errors: [{ message: 'private failure' }] }),
        );
      if (failure === 'network') vi.mocked(fetch).mockRejectedValue(new Error('private failure'));
      if (failure === 'missing token') vi.stubEnv('MONDAY_API_TOKEN', '');
      expect((await POST(request())).status).toBe(201);
      expect(backup).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalled();
      await after.mock.calls[0][0]();
      expect(notify).toHaveBeenCalledOnce();
    },
  );
  it('keeps Monday working while the table is absent', async () => {
    backup.mockRejectedValue(new Error('relation enquiries does not exist'));
    expect((await POST(request())).status).toBe(201);
    expect(console.error).toHaveBeenCalledWith(
      '[enquiries] database write failed',
      expect.objectContaining({ requestId: enquiry.requestId }),
    );
  });
  it('starts both destinations before either settles', async () => {
    let finish!: () => void;
    backup.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const pending = POST(request());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(backup).toHaveBeenCalledOnce();
    finish();
    expect((await pending).status).toBe(201);
  });
  it('logs both failures and does not notify if neither destination accepts', async () => {
    backup.mockRejectedValue(new Error('private failure'));
    vi.mocked(fetch).mockRejectedValue(new Error('private failure'));
    expect((await POST(request())).status).toBe(502);
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(after).not.toHaveBeenCalled();
  });
  it('notification failure never changes a successful response', async () => {
    notify.mockRejectedValue(new Error('private notification details'));
    expect((await POST(request())).status).toBe(201);
    await expect(after.mock.calls[0][0]()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
