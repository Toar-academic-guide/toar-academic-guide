import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listCataloguePrograms, listCatalogueInstitutions } = vi.hoisted(() => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
vi.mock('@/server/catalogue/queries', () => ({ listCataloguePrograms, listCatalogueInstitutions }));
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
  });

  it('rejects an unrelated institution and cross-site submissions', async () => {
    expect((await POST(request({ institutionId: 'unrelated' }))).status).toBe(400);
    expect((await POST(request({}, 'https://unrelated.example'))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never reports success when Monday rejects an item or the credential is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ errors: [{ message: 'private details' }] }));
    const failure = await POST(request());
    expect(failure.status).toBe(502);
    expect(await failure.text()).not.toContain('private details');
    vi.stubEnv('MONDAY_API_TOKEN', '');
    expect((await POST(request())).status).toBe(503);
  });

  it('uses the same idempotency key when the same enquiry is retried', async () => {
    await POST(request());
    await POST(request());
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][1]?.headers).toEqual(calls[1][1]?.headers);
  });
});
