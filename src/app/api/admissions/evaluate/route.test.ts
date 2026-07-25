import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';

const hoistedMocks = vi.hoisted(() => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
  evaluateAdmissionsForProgram: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: hoistedMocks.headers,
}));

vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: hoistedMocks.listCataloguePrograms,
  listCatalogueInstitutions: hoistedMocks.listCatalogueInstitutions,
}));

vi.mock('@/server/admissions/evaluator', () => ({
  evaluateAdmissionsForProgram: hoistedMocks.evaluateAdmissionsForProgram,
}));

vi.mock('server-only', () => ({}));

import { POST } from './route';

describe('admissions evaluate route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAdmissionsEvaluationRateLimitForTests();
    hoistedMocks.listCataloguePrograms.mockReset();
    hoistedMocks.listCatalogueInstitutions.mockReset();
    hoistedMocks.evaluateAdmissionsForProgram.mockReset();
    hoistedMocks.headers.mockReset();

    hoistedMocks.headers.mockResolvedValue(
      new Headers({
        'x-forwarded-for': '203.0.113.10',
      }),
    );
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [
        {
          id: 'tau_datascience',
          name: 'מדעי הנתונים',
          linkedInstitutionIds: ['tau'],
        },
      ],
    });
    hoistedMocks.listCatalogueInstitutions.mockResolvedValue({
      data: [
        {
          id: 'tau',
          name: 'אוניברסיטת תל אביב',
          region: 'center',
        },
      ],
    });
    hoistedMocks.evaluateAdmissionsForProgram.mockResolvedValue({
      generatedAt: '2026-06-27T00:00:00.000Z',
      input: {
        degreeId: 'tau_datascience',
        psychometric: 700,
        bagrut: 110,
      },
      program: {
        id: 'tau_datascience',
        name: 'מדעי הנתונים',
      },
      results: [],
    });
  });

  it('returns the admissions evaluation report for a valid request', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        program: { id: 'tau_datascience' },
      },
    });
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
        },
      }),
    );
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ADMISSIONS_EVALUATION_PAYLOAD_INVALID' },
    });
    expect(hoistedMocks.evaluateAdmissionsForProgram).not.toHaveBeenCalled();
  });

  it('returns 400 for out-of-range scores', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 900,
          bagrut: 110,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ADMISSIONS_EVALUATION_PAYLOAD_INVALID' },
    });
  });

  it('accepts a replayable structured Bagrut subject record', async () => {
    const extraInputs = {
      psychometricMath: 130,
      psychometricVerbal: 125,
      psychometricEnglish: 120,
      bagrutProfileSchemaVersion: 1,
      bagrutSector: 'jewish',
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 95 },
          { subjectId: 'history', units: 2, grade: 88 },
          { subjectId: 'bible', units: 2, grade: 90 },
        ],
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
          extraInputs,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ extraInputs }),
      }),
    );
  });

  it('returns 404 when the programme does not exist in the catalogue', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          degreeId: 'missing-program',
          psychometric: 700,
          bagrut: 110,
        }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ADMISSIONS_PROGRAM_NOT_FOUND' },
    });
  });

  it('returns 413 for oversized payloads before parsing', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'content-length': '32768',
        },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
        }),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ADMISSIONS_EVALUATION_PAYLOAD_TOO_LARGE' },
    });
  });

  it('returns 429 when the caller exceeds the in-memory rate limit', async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await POST(
        new Request('http://localhost/api/admissions/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            degreeId: 'tau_datascience',
            psychometric: 700,
            bagrut: 110,
          }),
        }),
      );

      expect(response.status).toBe(200);
    }

    const blocked = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
        }),
      }),
    );

    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toMatchObject({
      error: { code: 'ADMISSIONS_EVALUATION_RATE_LIMITED' },
    });
  });
});
