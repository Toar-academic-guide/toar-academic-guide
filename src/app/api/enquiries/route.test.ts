import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listCataloguePrograms, listCatalogueInstitutions, capture, flush, after } = vi.hoisted(
  () => ({
    listCataloguePrograms: vi.fn(),
    listCatalogueInstitutions: vi.fn(),
    capture: vi.fn(),
    flush: vi.fn(),
    after: vi.fn(),
  }),
);
vi.mock('@/server/catalogue/queries', () => ({ listCataloguePrograms, listCatalogueInstitutions }));
vi.mock('next/server', () => ({ after }));
vi.mock('posthog-node', () => ({
  PostHog: class {
    capture = capture;
    flush = flush;
  },
}));
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
    capture.mockReset();
    flush.mockReset().mockResolvedValue(undefined);
    after.mockReset();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'test-analytics-token');
    vi.stubEnv('MONDAY_API_TOKEN', 'test-server-token');
    listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'physiotherapy', name: 'פיזיותרפיה', linkedInstitutionIds: ['tau'] }],
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
    expect(options?.body).not.toContain('bagrut');
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

  it('skips analytics silently when its token is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
    expect((await POST(request())).status).toBe(201);
    expect(after).not.toHaveBeenCalled();
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
    expect(flush).toHaveBeenCalledTimes(1);
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
