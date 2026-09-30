import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchComputerScienceRoutes, fetchTauComputerScienceRoutes } from './admissionsRouteClient';

const subjectRecord = {
  schemaVersion: 1 as const,
  sector: 'jewish' as const,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 80 },
    { subjectId: 'physics', units: 5, grade: 80 },
  ],
};

describe('fetchTauComputerScienceRoutes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the official TAU average rather than the generic profile average', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'no_route' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchTauComputerScienceRoutes({
      psychometric: { overall: 660 },
      bagrut: { weightedAverage: 103, subjectRecord },
      admissions: { tauBagrutAverage: 111.5 },
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      degreeId: 'tau_cs',
      source: 'input',
      profile: { psychometric: 660, tauBagrutAverage: 111.5, subjectRecord },
    });
    expect(body.profile).not.toHaveProperty('bagrutAverage');
  });

  it('fails before requesting a route when the official TAU average is missing', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchTauComputerScienceRoutes({
        psychometric: { overall: 660 },
        bagrut: { weightedAverage: 103, subjectRecord },
      }),
    ).rejects.toMatchObject({ code: 'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends only the complete BGU route profile required by the server', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'no_route' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchComputerScienceRoutes('bgu_cs', {
      psychometric: { overall: 610, quantitative: 125, verbal: 110, english: 115 },
      bagrut: { weightedAverage: 103, subjectRecord },
      admissions: { bguBagrutAverage: 105.4, bguLanguageRequirementsConfirmed: true },
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      degreeId: 'bgu_cs',
      source: 'input',
      profile: {
        psychometric: 610,
        bguBagrutAverage: 105.4,
        quantitativeSubscore: 125,
        verbalSubscore: 110,
        englishSubscore: 115,
        languageRequirementsConfirmed: true,
        subjectRecord,
      },
    });
  });
});
