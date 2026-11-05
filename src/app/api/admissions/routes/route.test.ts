import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAdmissionsRouteRateLimitForTests } from '@/server/admissions/routes/rateLimit';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { admissionsExtraInputsFromAcademicScores } from '@/lib/admissionsEvaluationProfile';
import { bagrutScoresForMode } from '@/lib/studyJourney';
import type { AcademicScores } from '@/types';
import type { SourceFreshnessStateRow } from '@/db/types';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
  getUserProfileSnapshot: vi.fn(),
  getAdmissionRouteCapability: vi.fn(),
  runTauComputerScienceRouteSimulation: vi.fn(),
  runBguComputerScienceProfileRouteSimulation: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('@/app/api/_lib/auth', () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
}));
vi.mock('@/server/user/profile', () => ({ getUserProfileSnapshot: mocks.getUserProfileSnapshot }));
vi.mock('@/server/admissions/routes/tauRouteSimulation', () => ({
  runTauComputerScienceRouteSimulation: mocks.runTauComputerScienceRouteSimulation,
}));
vi.mock('@/server/admissions/routes/bguRouteSimulation', () => ({
  runBguComputerScienceProfileRouteSimulation: mocks.runBguComputerScienceProfileRouteSimulation,
}));
vi.mock('@/server/admissions/routes/capabilityRegistry', () => ({
  getAdmissionRouteCapability: mocks.getAdmissionRouteCapability,
}));
vi.mock('server-only', () => ({}));

import { POST } from './route';

const profile = {
  psychometric: 660,
  tauBagrutAverage: 108,
  subjectRecord: {
    schemaVersion: 1,
    sector: 'jewish',
    subjects: [
      { subjectId: 'mathematics', units: 5, grade: 80 },
      { subjectId: 'physics', units: 5, grade: 80 },
    ],
  },
};

describe('admissions routes API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAdmissionsRouteRateLimitForTests();
    mocks.requireAuthenticatedUserId.mockReset();
    mocks.getUserProfileSnapshot.mockReset();
    mocks.getAdmissionRouteCapability.mockReset();
    mocks.runTauComputerScienceRouteSimulation.mockReset();
    mocks.runBguComputerScienceProfileRouteSimulation.mockReset();
    mocks.headers.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.10' }));
    mocks.runTauComputerScienceRouteSimulation.mockResolvedValue({
      status: 'no_route',
      pareto: [],
      evaluatedCandidateCount: 7,
      unavailableFinalistCount: 0,
    });
    mocks.runBguComputerScienceProfileRouteSimulation.mockResolvedValue({
      status: 'no_route',
      pareto: [],
      evaluatedCandidateCount: 8,
      unavailableFinalistCount: 0,
    });
    mocks.getAdmissionRouteCapability.mockReturnValue({ status: 'enabled' });
  });

  it('agrees on incomplete active quick inputs between the journey evaluator and TAU/BGU saved simulations', async () => {
    const savedScores: AcademicScores = {
      psychometric: { overall: 700, quantitative: 135, verbal: 120, english: 125 },
      bagrut: {
        weightedAverage: 110,
        subjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: profile.subjectRecord.subjects,
        },
      },
      admissions: {
        activeBagrutPath: 'quick',
        tauBagrutAverage: 110,
        bguBagrutAverage: 110,
        tauApplicationRequirementsConfirmed: true,
        bguLanguageRequirementsConfirmed: true,
      },
    };
    mocks.requireAuthenticatedUserId.mockResolvedValue('test-user');
    mocks.getUserProfileSnapshot.mockResolvedValue({ academicScores: savedScores });
    const activeScores = bagrutScoresForMode(savedScores, 'quick');
    const extraInputs = admissionsExtraInputsFromAcademicScores(activeScores);
    expect(activeScores.bagrut?.weightedAverage).toBe(110);
    expect(extraInputs?.bagrutSubjectRecord).toBeUndefined();
    expect(extraInputs?.mathUnits).toBeUndefined();
    expect(extraInputs?.mathGrade).toBeUndefined();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('No live requests in parity test'));
    const observed = [];
    for (const [degreeId, institutionId] of [
      ['tau_cs', 'tau'],
      ['bgu_cs', 'bgu'],
    ]) {
      const program = getStaticCataloguePrograms().find((row) => row.id === degreeId)!;
      const artifact = getProgramVerificationArtifact(`${degreeId}__${institutionId}`)!;
      const checkedAt = new Date('2026-10-30T12:00:00Z');
      // Isolate input completeness from live source health, as in evaluator.test.ts.
      const freshness: SourceFreshnessStateRow = {
        sourceId: artifact.contract.source.targetId,
        sourceClass: 'api_static_json',
        capability: 'decision_capable',
        status: 'fresh',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
        reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
        lastCheckedAt: checkedAt,
        lastSuccessfulCheckAt: checkedAt,
        lastExactCheckAt: checkedAt,
        lastChangedAt: null,
        latestFailureReason: null,
        blockedReason: null,
        rawFingerprint: null,
        normalizedFingerprint: artifact.contract.sourceFingerprint,
        normalizedDecisionPayload: {},
        latestReviewItemId: null,
        nextAction: null,
        createdAt: checkedAt,
        updatedAt: checkedAt,
      };
      const report = await evaluateAdmissionsForProgram({
        program: { ...program, linkedInstitutionIds: [institutionId] },
        institutions: getStaticCatalogueInstitutions(),
        input: {
          degreeId,
          psychometric: activeScores.psychometric?.overall,
          bagrut: activeScores.bagrut?.weightedAverage,
          extraInputs,
        },
        freshnessStatesBySourceId: new Map([[freshness.sourceId, freshness]]),
        fetcher,
        now: checkedAt,
      });
      const result = report.results.find((row) => row.linkedInstitutionId === institutionId)!;
      const response = await POST(request({ degreeId, source: 'saved_profile' }));
      const body = await response.json();
      observed.push({
        degreeId,
        journeyKind: result.kind,
        journeyDecision: result.decision,
        missingSubjects: result.requiredInputs?.filter((key) =>
          ['bagrut_subject_record', 'math_units', 'math_grade'].includes(key),
        ),
        simulationStatus: response.status,
        simulationError: body.error?.code,
      });
    }
    expect(observed).toEqual([
      {
        degreeId: 'tau_cs',
        journeyKind: 'needs_input',
        journeyDecision: 'unknown',
        missingSubjects: ['bagrut_subject_record'],
        simulationStatus: 422,
        simulationError: 'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
      },
      {
        degreeId: 'bgu_cs',
        journeyKind: 'needs_input',
        journeyDecision: 'unknown',
        missingSubjects: ['bagrut_subject_record'],
        simulationStatus: 422,
        simulationError: 'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
      },
    ]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.runTauComputerScienceRouteSimulation).not.toHaveBeenCalled();
    expect(mocks.runBguComputerScienceProfileRouteSimulation).not.toHaveBeenCalled();
  });

  it.each(
    (['tau_cs', 'bgu_cs'] as const).flatMap((degreeId) =>
      (['quick', 'exact', 'none'] as const).map((activeBagrutPath) => ({
        degreeId,
        activeBagrutPath,
      })),
    ),
  )(
    'uses only active subjects for $degreeId saved-profile simulation ($activeBagrutPath)',
    async ({ degreeId, activeBagrutPath }) => {
      mocks.requireAuthenticatedUserId.mockResolvedValue('test-user');
      mocks.getUserProfileSnapshot.mockResolvedValue({
        academicScores: {
          psychometric: { overall: 660, quantitative: 135, verbal: 120, english: 125 },
          bagrut: { weightedAverage: 110, subjectRecord: profile.subjectRecord },
          admissions: {
            activeBagrutPath,
            tauBagrutAverage: 108,
            bguBagrutAverage: 108,
            bguLanguageRequirementsConfirmed: true,
          },
        },
      });
      const response = await POST(request({ degreeId, source: 'saved_profile' }));
      expect(response.status).toBe(activeBagrutPath === 'exact' ? 200 : 422);
      if (activeBagrutPath !== 'exact') {
        expect(mocks.runTauComputerScienceRouteSimulation).not.toHaveBeenCalled();
        expect(mocks.runBguComputerScienceProfileRouteSimulation).not.toHaveBeenCalled();
      }
    },
  );

  it('accepts a complete anonymous TAU profile without a user identifier', async () => {
    const response = await POST(request({ degreeId: 'tau_cs', source: 'input', profile }));

    expect(response.status).toBe(200);
    expect(mocks.runTauComputerScienceRouteSimulation).toHaveBeenCalledWith({ profile });
  });

  it('accepts a schema-v2 profile while academic actions remain capability-gated', async () => {
    const versionedProfile = {
      ...profile,
      subjectRecord: {
        schemaVersion: 2 as const,
        sector: 'jewish' as const,
        certificateType: 'internal' as const,
        complete: true,
        subjects: profile.subjectRecord.subjects.map((subject) => ({
          ...subject,
          assessmentKind: 'exam' as const,
        })),
      },
    };

    const response = await POST(
      request({ degreeId: 'tau_cs', source: 'input', profile: versionedProfile }),
    );

    expect(response.status).toBe(200);
    expect(mocks.runTauComputerScienceRouteSimulation).toHaveBeenCalledWith({
      profile: versionedProfile,
    });
  });

  it('routes a complete BGU profile through the BGU simulator', async () => {
    const bguProfile = {
      psychometric: 610,
      bguBagrutAverage: 105,
      quantitativeSubscore: 125,
      verbalSubscore: 110,
      englishSubscore: 115,
      languageRequirementsConfirmed: true as const,
      subjectRecord: {
        schemaVersion: 2 as const,
        sector: 'jewish' as const,
        certificateType: 'internal' as const,
        complete: true,
        subjects: [
          { subjectId: 'mathematics', units: 4, grade: 90, assessmentKind: 'exam' as const },
        ],
      },
    };

    const response = await POST(
      request({ degreeId: 'bgu_cs', source: 'input', profile: bguProfile }),
    );

    expect(response.status).toBe(200);
    expect(mocks.runBguComputerScienceProfileRouteSimulation).toHaveBeenCalledWith({
      profile: bguProfile,
    });
    expect(await response.json()).toMatchObject({
      data: {
        status: 'no_route',
        target: { degreeId: 'bgu_cs', institutionId: 'bgu' },
        evidence: { evaluatedCandidateCount: 8 },
      },
    });
  });

  it('rejects unreviewed targets and client-supplied rule versions', async () => {
    const response = await POST(
      request({ degreeId: 'bgu_cs', source: 'input', profile, ruleVersion: 'untrusted' }),
    );

    expect(response.status).toBe(400);
    expect(mocks.runTauComputerScienceRouteSimulation).not.toHaveBeenCalled();
  });

  it('withholds simulation when the composed route capability is disabled', async () => {
    mocks.getAdmissionRouteCapability.mockReturnValue({ status: 'disabled' });

    const response = await POST(request({ degreeId: 'tau_cs', source: 'input', profile }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { code: 'ADMISSIONS_ROUTE_UNSUPPORTED' },
    });
    expect(mocks.runTauComputerScienceRouteSimulation).not.toHaveBeenCalled();
  });

  it('returns authority unavailability as a normalized safe result', async () => {
    mocks.runTauComputerScienceRouteSimulation.mockResolvedValue({
      status: 'authority_unavailable',
      pareto: [],
      evaluatedCandidateCount: 7,
      unavailableFinalistCount: 7,
    });

    const response = await POST(request({ degreeId: 'tau_cs', source: 'input', profile }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        status: 'authority_unavailable',
        evidence: { unavailableFinalistCount: 7 },
      },
    });
  });

  it('loads only the authenticated caller profile for a saved-profile request', async () => {
    mocks.requireAuthenticatedUserId.mockResolvedValue('user-1');
    mocks.getUserProfileSnapshot.mockResolvedValue({
      academicScores: {
        psychometric: { overall: 660 },
        bagrut: { weightedAverage: 108, subjectRecord: profile.subjectRecord },
        admissions: { tauBagrutAverage: 111 },
      },
    });

    const response = await POST(request({ degreeId: 'tau_cs', source: 'saved_profile' }));

    expect(response.status).toBe(200);
    expect(mocks.getUserProfileSnapshot).toHaveBeenCalledWith('user-1');
    expect(mocks.runTauComputerScienceRouteSimulation).toHaveBeenCalledWith({
      profile: {
        psychometric: 660,
        tauBagrutAverage: 111,
        subjectRecord: profile.subjectRecord,
      },
    });
  });

  it('does not substitute the generic Bagrut average for the official TAU average', async () => {
    mocks.requireAuthenticatedUserId.mockResolvedValue('user-1');
    mocks.getUserProfileSnapshot.mockResolvedValue({
      academicScores: {
        psychometric: { overall: 660 },
        bagrut: { weightedAverage: 108, subjectRecord: profile.subjectRecord },
      },
    });

    const response = await POST(request({ degreeId: 'tau_cs', source: 'saved_profile' }));

    expect(response.status).toBe(422);
    expect(mocks.runTauComputerScienceRouteSimulation).not.toHaveBeenCalled();
  });

  it('returns Retry-After when the route quota is exhausted', async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect((await POST(request({ degreeId: 'tau_cs', source: 'input', profile }))).status).toBe(
        200,
      );
    }

    const response = await POST(request({ degreeId: 'tau_cs', source: 'input', profile }));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });
});

function request(body: unknown) {
  return new Request('http://localhost/api/admissions/routes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
