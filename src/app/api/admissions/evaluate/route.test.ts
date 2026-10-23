import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import { PROGRAM_CANONICAL_ALIASES } from '@/lib/seo/programAliases';
import { BATCH_B_PROGRAMS } from '@/server/admissions/batchBManualPathEvaluation';

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
  const batchRequest = (body: unknown) =>
    POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it.each(
    Object.entries(PROGRAM_CANONICAL_ALIASES).filter(([aliasId]) => !BATCH_B_PROGRAMS[aliasId]),
  )(
    'resolves %s to %s for single and batch evaluation even when an alias row exists',
    async (aliasId, canonicalId) => {
      const program = { id: canonicalId, name: 'Canonical programme' };
      hoistedMocks.listCataloguePrograms.mockResolvedValue({
        data: [{ id: aliasId, name: 'Legacy programme' }, program],
      });
      for (const body of [{ degreeId: aliasId }, { degreeIds: [aliasId] }]) {
        expect((await batchRequest(body)).status).toBe(200);
        expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenLastCalledWith({
          input: { degreeId: canonicalId },
          program,
          institutions: expect.any(Array),
        });
      }
    },
  );

  it('reports the requested alias when its canonical evaluator fails', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({ data: [{ id: 'colmgmt_law' }] });
    hoistedMocks.evaluateAdmissionsForProgram.mockRejectedValue(new Error('internal details'));
    const response = await batchRequest({ degreeIds: ['colman_law'] });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { reports: {}, failedDegreeIds: ['colman_law'] },
    });
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input: { degreeId: 'colmgmt_law' } }),
    );
  });

  it('evaluates 24 programmes as one rate-limited request with shared inputs and at most four workers', async () => {
    const degreeIds = Array.from({ length: 24 }, (_, i) => `programme-${i}`);
    hoistedMocks.listCataloguePrograms.mockResolvedValue({ data: degreeIds.map((id) => ({ id })) });
    let active = 0;
    let peak = 0;
    hoistedMocks.evaluateAdmissionsForProgram.mockImplementation(async ({ input }) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return { input, results: [] };
    });
    const applicant = {
      psychometric: 700,
      bagrut: 110,
      extraInputs: {
        tauBagrutAverage: 110.25,
        tauApplicationRequirementsConfirmed: false,
        tauManagementQualifyingMoocCount: 0,
      },
    };
    const response = await batchRequest({ degreeIds, ...applicant });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(Object.keys(data.reports)).toHaveLength(24);
    expect(data.failedDegreeIds).toEqual([]);
    for (const id of degreeIds)
      expect(data.reports[id].input).toEqual({ degreeId: id, ...applicant });
    expect(peak).toBeLessThanOrEqual(4);
    expect(hoistedMocks.listCataloguePrograms).toHaveBeenCalledTimes(1);
    expect(hoistedMocks.listCatalogueInstitutions).toHaveBeenCalledTimes(1);
    // The batch consumed one quota slot, not twenty-four.
    expect((await batchRequest({ degreeId: degreeIds[0], ...applicant })).status).toBe(200);
  });

  it('keeps successful reports when another programme fails or is unknown', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({ data: [{ id: 'good' }, { id: 'bad' }] });
    hoistedMocks.evaluateAdmissionsForProgram.mockImplementation(async ({ input }) => {
      if (input.degreeId === 'bad') throw new Error('internal details');
      return { input, results: [] };
    });
    const response = await batchRequest({ degreeIds: ['good', 'bad', 'missing'] });
    const { data } = await response.json();
    expect(response.status).toBe(200);
    expect(Object.keys(data.reports)).toEqual(['good']);
    expect(data.failedDegreeIds.sort()).toEqual(['bad', 'missing']);
    expect(JSON.stringify(data)).not.toContain('internal details');
  });

  it.each([
    { degreeIds: [] },
    { degreeIds: ['duplicate', 'duplicate'] },
    { degreeIds: Array.from({ length: 51 }, (_, i) => `p${i}`) },
  ])('rejects empty, duplicate and oversized batches before evaluating', async ({ degreeIds }) => {
    expect((await batchRequest({ degreeIds })).status).toBe(400);
    expect(hoistedMocks.evaluateAdmissionsForProgram).not.toHaveBeenCalled();
  });

  it('retains the request rate limit for batches', async () => {
    for (let i = 0; i < 12; i++) {
      expect((await batchRequest({ degreeIds: ['tau_datascience'] })).status).toBe(200);
    }
    expect((await batchRequest({ degreeIds: ['tau_datascience'] })).status).toBe(429);
  });

  it('forwards Colman Bagrut inputs without requiring generic average or psychometric', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'colmgmt_cs', name: 'CS', linkedInstitutionIds: ['colman'] }],
    });
    const input = {
      degreeId: 'colmgmt_cs',
      extraInputs: {
        colmanBagrutAverage: 85.25,
        colmanBagrutCertificateConfirmed: false,
        mathUnits: 4,
        mathGrade: 80,
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input }),
    );
  });
  it('accepts Haifa years and decimal official average without an unused generic Bagrut', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'haifa_cs', name: 'CS', linkedInstitutionIds: ['haifa'] }],
    });
    const extraInputs = {
      haifaBagrutAverage: 102.25,
      haifaBagrutYear: 2015,
      haifaPsychometricYear: 2026,
      haifaAdmissionQualification: 'full_bagrut',
      haifaEnglishLevel: 'advanced_a',
      haifaHebrewQualification: 'exam',
      haifaHebrewScore: 120,
      haifaHebrewExamDate: '2026-04-01',
      haifaPsychometricMonth: 4,
      haifaScienceUnits: 8,
      haifaOtFailedSelectionAttempts: 0,
      haifaOtUnjustifiedAbsence: false,
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ degreeId: 'haifa_cs', psychometric: 680, extraInputs }),
      }),
    );
    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram.mock.calls[0][0].input).toEqual({
      degreeId: 'haifa_cs',
      psychometric: 680,
      extraInputs,
    });
  });
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

  it('forwards Medicine inputs without requiring a generic average', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'huji_medicine', name: 'רפואה', linkedInstitutionIds: ['huji'] }],
    });
    const input = {
      degreeId: 'huji_medicine',
      psychometric: 800,
      extraInputs: {
        hujiBagrutAverage: 120.25,
        hujiMedicineAssessmentScore: 200,
        hujiMedicinePsychometricDate: '2026-04-01',
        hujiMedicineQualificationConfirmed: false,
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input }),
    );
  });
  it('forwards degree-only health inputs without dummy generic scores', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'occupational_therapy', name: 'ריפוי בעיסוק', linkedInstitutionIds: ['bgu'] }],
    });
    const input = {
      degreeId: 'occupational_therapy',
      extraInputs: {
        bguOccupationalTherapyRoute: 'academic',
        bguOccupationalTherapyRequirementsConfirmed: false,
        bguBachelorsDegreeCompleted: true,
        bguBachelorsDegreeAverage: 85.25,
        bguPhysiotherapyRequirementsConfirmed: false,
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input }),
    );
  });
  it('accepts preparatory-only BGU input and preserves false and decimals without invented generic scores', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'bgu_economics', name: 'כלכלה', linkedInstitutionIds: ['bgu'] }],
    });
    const input = {
      degreeId: 'bgu_economics',
      extraInputs: {
        bguQuantitativeRoute: 'bagrut',
        bguPreparatoryTrack: 'natural_life_sciences',
        bguPreparatoryAverage: 87.25,
        bguPreparatoryCompleted: true,
        bguPriorAcademicStudies: false,
        bguReturningOrChangingTrack: false,
        bguCertificateRequirementsConfirmed: true,
        bguSecondTrackRequirementsConfirmed: true,
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input }),
    );
  });
  it('lets the evaluator report missing inputs without blocking catalogue exploration', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'tau_datascience', name: 'מדעי הנתונים', linkedInstitutionIds: ['tau'] }],
    });
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        body: JSON.stringify({ degreeId: 'tau_datascience', psychometric: 700 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input: { degreeId: 'tau_datascience', psychometric: 700 } }),
    );
  });
  it.each(['ee', 'bgu_ee', 'me', 'bgu_me', 'bgu_industrial'])(
    'accepts preparatory-only engineering inputs for %s without a generic Bagrut average',
    async (degreeId) => {
      hoistedMocks.listCataloguePrograms.mockResolvedValue({
        data: [{ id: degreeId, name: 'הנדסה', linkedInstitutionIds: ['bgu'] }],
      });
      const input = {
        degreeId,
        psychometric: 700,
        extraInputs: {
          psychometricMath: 140,
          bguLanguageRequirementsConfirmed: true,
          bguEngineering: {
            detailsConfirmed: true,
            preparatoryInstitution: 'bgu',
            preparatoryCompletionYear: 2026,
            preparatoryMathUnits: 5,
            preparatoryMathGrade: 90,
            preparatoryPhysicsUnits: 5,
            preparatoryPhysicsGrade: 90,
          },
        },
      };
      const response = await POST(
        new Request('http://localhost/api/admissions/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }),
      );
      expect(response.status).toBe(200);
      expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
        expect.objectContaining({ input }),
      );
    },
  );

  it('allows Psychology prep-only requests without inventing generic scores', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'bgu_psychology', name: 'פסיכולוגיה', linkedInstitutionIds: ['bgu'] }],
    });
    const input = {
      degreeId: 'bgu_psychology',
      extraInputs: {
        bguPsychologyRoute: 'bagrut',
        bguPreparatoryTrack: 'natural_life_sciences',
        bguPreparatoryAverage: 94.25,
        bguPreparatoryCompleted: true,
        bguPsychologyRequirementsConfirmed: true,
        bguLanguageRequirementsConfirmed: true,
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input }),
    );
  });

  it.each(['social_work', 'bgu_socialwork', 'communication', 'education', 'political_science'])(
    'allows %s alternate inputs without dummy scores',
    async (degreeId) => {
      hoistedMocks.listCataloguePrograms.mockResolvedValue({
        data: [{ id: degreeId, name: degreeId, linkedInstitutionIds: ['bgu'] }],
      });
      const input = {
        degreeId,
        extraInputs: {
          bguSocialScienceRoute: 'bagrut',
          bguPreparatoryTrack: 'natural_life_sciences',
          bguPreparatoryAverage: 90.25,
          bguPreparatoryCompleted: false,
          bguSocialScienceRequirementsConfirmed: false,
          bguSocialScienceLanguageConfirmed: true,
          bguReturningFromStudyBreak: false,
          bguSocialWorkAcademicBackground: 'none',
        },
      };
      const response = await POST(
        new Request('http://localhost/api/admissions/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }),
      );
      expect(response.status).toBe(200);
      expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
        expect.objectContaining({ input }),
      );
    },
  );

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

  it('accepts a complete schema-v2 Bagrut subject record', async () => {
    const bagrutSubjectRecord = {
      schemaVersion: 2 as const,
      sector: 'jewish' as const,
      certificateType: 'internal' as const,
      complete: true,
      subjects: [
        {
          subjectId: 'mathematics',
          units: 5,
          grade: 95,
          assessmentKind: 'exam' as const,
        },
      ],
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
          extraInputs: {
            bagrutProfileSchemaVersion: 2,
            bagrutSector: 'jewish',
            bagrutSubjectRecord,
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          extraInputs: expect.objectContaining({ bagrutSubjectRecord }),
        }),
      }),
    );
  });

  it('accepts institution-specific inputs and preserves false and zero', async () => {
    const extraInputs = {
      tauBagrutAverage: 112.5,
      bguBagrutAverage: 108.25,
      tauApplicationRequirementsConfirmed: false,
      bguLanguageRequirementsConfirmed: true,
      tauMathPlacementScore: 0,
      technionArchitectureBagrutAverage: 101.9,
      technionArchitectureExamScore: 0,
      technionArchitectureExamPassed: false,
      technionArchitectureRequirementsConfirmed: true,
    };

    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      expect.objectContaining({ input: expect.objectContaining({ extraInputs }) }),
    );
  });

  it('keeps legacy schema-v1 Hebrew subject identifiers compatible', async () => {
    const input = {
      degreeId: 'tau_datascience',
      psychometric: 700,
      bagrut: 110,
      extraInputs: {
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'כימיה', units: 5, grade: 90 }],
        },
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoistedMocks.evaluateAdmissionsForProgram).toHaveBeenCalledWith(
      expect.objectContaining({ input }),
    );
  });

  it('passes structured engineering data and an absent psychometric score for Industrial direct evaluation', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'bgu_industrial', name: 'הנדסת תעשייה וניהול', linkedInstitutionIds: ['bgu'] }],
    });
    const extraInputs = {
      bguBagrutAverage: 109,
      bguLanguageRequirementsConfirmed: true,
      bguEngineering: {
        detailsConfirmed: true,
        route: 'direct',
        physicsCoursePassed: false,
        preparatoryInstitution: 'bgu',
        preparatoryCompletionYear: 2026,
        industrialPreparatoryAverage: 91.25,
      },
    };
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ degreeId: 'bgu_industrial', bagrut: 100, extraInputs }),
      }),
    );
    expect(response.status).toBe(200);
    const input = hoistedMocks.evaluateAdmissionsForProgram.mock.calls[0][0].input;
    expect(input.psychometric).toBeUndefined();
    expect(input.extraInputs).toEqual(extraInputs);
  });

  it('preserves an actual missing psychometric score and leaves route eligibility to the evaluator', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'business', name: 'ניהול', linkedInstitutionIds: ['tau'] }],
    });
    const request = (degreeId: string) =>
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          degreeId,
          bagrut: 100,
          extraInputs: {
            tauManagementRequirementsConfirmed: true,
            tauManagementAcademicRouteConfirmed: false,
            tauManagementQualifyingMoocCount: 0,
            tauManagementNoPsychometricMoocsConfirmed: true,
          },
        }),
      });
    expect((await POST(request('business'))).status).toBe(200);
    const input = hoistedMocks.evaluateAdmissionsForProgram.mock.calls[0][0].input;
    expect(input.psychometric).toBeUndefined();
    expect(input.extraInputs.tauManagementQualifyingMoocCount).toBe(0);
    expect((await POST(request('tau_datascience'))).status).toBe(404);
  });

  it('rejects out-of-range admissions inputs and non-boolean confirmations', async () => {
    const requestWith = (extraInputs: Record<string, unknown>) =>
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
          extraInputs,
        }),
      });

    for (const invalid of [
      { tauBagrutAverage: 49 },
      { bguBagrutAverage: 130.1 },
      { tauApplicationRequirementsConfirmed: 'yes' },
      { tauManagementRequirementsConfirmed: 'yes' },
      { tauManagementQualifyingMoocCount: 3 },
      { tauManagementNoPsychometricMoocsConfirmed: 1 },
      { bguLanguageRequirementsConfirmed: 1 },
      { tauMathPlacementScore: 101 },
      { technionArchitectureBagrutAverage: 119.1 },
      { technionArchitectureExamScore: 140.1 },
      { technionArchitectureExamPassed: 'yes' },
      { technionArchitectureRequirementsConfirmed: 1 },
    ]) {
      expect((await POST(requestWith(invalid))).status).toBe(400);
    }
  });

  it('accepts 64 Bagrut subjects and rejects 65', async () => {
    const requestForSubjectCount = (count: number) =>
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          degreeId: 'tau_datascience',
          psychometric: 700,
          bagrut: 110,
          extraInputs: {
            bagrutSubjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: Array.from({ length: count }, (_, index) => ({
                subjectId: `subject_${index}`,
                units: 5,
                grade: 90,
              })),
            },
          },
        }),
      });

    expect((await POST(requestForSubjectCount(64))).status).toBe(200);
    expect((await POST(requestForSubjectCount(65))).status).toBe(400);
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
