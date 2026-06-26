import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  getOpsDb: vi.fn(),
}));

vi.mock('@/db/opsClient', () => ({
  getOpsDb: hoistedMocks.getOpsDb,
}));

vi.mock('server-only', () => ({}));

import { getDataHealthReport, summarizeDataHealthRows, type DataHealthRows } from './queries';

const now = new Date('2026-06-24T18:00:00.000Z');

function baseRows(overrides: Partial<DataHealthRows> = {}): DataHealthRows {
  return {
    institutions: [{ id: 'tau' }, { id: 'technion' }],
    programs: [
      { id: 'tau_cs', name: 'Computer Science', admissionType: 'sekhem' },
      { id: 'tau_law', name: 'Law', admissionType: 'requirements' },
    ],
    programInstitutions: [
      { programId: 'tau_cs', institutionId: 'tau' },
      { programId: 'tau_law', institutionId: 'tau' },
    ],
    admissionRequirements: [
      { id: 'req-tau-cs', programId: 'tau_cs', institutionId: 'tau' },
      { id: 'req-tau-law', programId: 'tau_law', institutionId: 'tau' },
    ],
    admissionThresholds: [
      {
        id: 'threshold-tau-cs',
        programId: 'tau_cs',
        institutionId: 'tau',
        universityId: 'tau',
        thresholdValue: 710,
      },
    ],
    sourceUrls: [
      {
        id: 'source-tau-cs',
        admissionRequirementId: 'req-tau-cs',
        programId: 'tau_cs',
        institutionId: 'tau',
        url: 'https://example.com/cs',
      },
      {
        id: 'source-tau-law',
        admissionRequirementId: 'req-tau-law',
        programId: 'tau_law',
        institutionId: 'tau',
        url: 'https://example.com/law',
      },
    ],
    universityCalculatorConfigs: [
      { institutionId: 'tau' },
      { institutionId: 'huji' },
      { institutionId: 'technion' },
      { institutionId: 'bgu' },
      { institutionId: 'haifa' },
      { institutionId: 'biu' },
      { institutionId: 'ariel' },
    ],
    admissionsSourceCandidates: [
      {
        id: 'candidate-tau-cs',
        admissionRequirementId: 'req-tau-cs',
        programId: 'tau_cs',
        institutionId: 'tau',
        origin: 'catalogue_url',
        specificity: 'calculator',
        confidence: 'high',
      },
      {
        id: 'candidate-tau-law',
        admissionRequirementId: 'req-tau-law',
        programId: 'tau_law',
        institutionId: 'tau',
        origin: 'board_column',
        specificity: 'generic',
        confidence: 'low',
      },
    ],
    admissionFacts: [
      {
        id: 'fact-tau-cs-sekhem',
        admissionRequirementId: 'req-tau-cs',
        programId: 'tau_cs',
        institutionId: 'tau',
        kind: 'numeric_gate',
        field: 'sekhem',
        confidence: 'high',
      },
      {
        id: 'fact-tau-law-interview',
        admissionRequirementId: 'req-tau-law',
        programId: 'tau_law',
        institutionId: 'tau',
        kind: 'manual_gate',
        field: 'interview',
        confidence: 'low',
      },
    ],
    admissionAlternativePaths: [
      {
        id: 'alt-tau-law-manual',
        admissionRequirementId: 'req-tau-law',
        programId: 'tau_law',
        institutionId: 'tau',
        kind: 'manual_check',
      },
    ],
    ingestionJobs: [],
    reviewItems: [],
    ...overrides,
  };
}

describe('summarizeDataHealthRows', () => {
  it('reports complete catalogue readiness without false missing-link issues', () => {
    const report = summarizeDataHealthRows(baseRows(), now);

    expect(report.status).toBe('ready');
    expect(report.readiness.counts).toEqual({
      institutions: 2,
      programs: 2,
      programInstitutions: 2,
      admissionRequirements: 2,
      admissionThresholds: 1,
      sourceUrls: 2,
      universityCalculatorConfigs: 7,
    });
    expect(report.readiness.isReady).toBe(true);
    expect(report.readiness.issues).toEqual([]);
  });

  it('includes admission requirements with no source URL in missing coverage', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        sourceUrls: [
          {
            id: 'source-tau-cs',
            admissionRequirementId: 'req-tau-cs',
            programId: 'tau_cs',
            institutionId: 'tau',
            url: 'https://example.com/cs',
          },
        ],
      }),
      now,
    );

    expect(report.coverage.missingRequirementSources).toEqual([
      {
        admissionRequirementId: 'req-tau-law',
        institutionId: 'tau',
        programId: 'tau_law',
      },
    ]);
    expect(report.coverage.missingRequirementSourceCount).toBe(1);
  });

  it('reports decision readiness from structured admissions facts and source candidates', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        admissionFacts: [
          {
            id: 'fact-tau-cs-sekhem',
            admissionRequirementId: 'req-tau-cs',
            programId: 'tau_cs',
            institutionId: 'tau',
            kind: 'numeric_gate',
            field: 'sekhem',
            confidence: 'high',
          },
          {
            id: 'fact-tau-law-interview',
            admissionRequirementId: 'req-tau-law',
            programId: 'tau_law',
            institutionId: 'tau',
            kind: 'manual_gate',
            field: 'interview',
            confidence: 'low',
          },
        ],
      }),
      now,
    );

    expect(report.decisionReadiness.decisionReadyRequirementCount).toBe(2);
    expect(report.decisionReadiness.weakSourceCount).toBe(1);
    expect(report.decisionReadiness.manualGateCount).toBe(1);
    expect(report.decisionReadiness.alternativePathCount).toBe(1);
    expect(report.decisionReadiness.weakSources[0]).toMatchObject({
      sourceCandidateId: 'candidate-tau-law',
      specificity: 'generic',
    });
  });

  it('flags requirements that have source URLs but no structured admissions facts', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        admissionFacts: [],
      }),
      now,
    );

    expect(report.decisionReadiness.missingFactCount).toBe(2);
    expect(report.decisionReadiness.requirementsMissingFacts).toEqual([
      {
        admissionRequirementId: 'req-tau-cs',
        institutionId: 'tau',
        programId: 'tau_cs',
      },
      {
        admissionRequirementId: 'req-tau-law',
        institutionId: 'tau',
        programId: 'tau_law',
      },
    ]);
  });

  it('groups ingestion jobs by status and difficulty with oldest active work first', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        ingestionJobs: [
          {
            id: 'job-new',
            sourceId: 'source-1',
            status: 'running',
            difficulty: 'easy',
            startedAt: new Date('2026-06-24T17:00:00.000Z'),
            completedAt: null,
            errorText: null,
            createdAt: new Date('2026-06-24T16:00:00.000Z'),
          },
          {
            id: 'job-old',
            sourceId: 'source-2',
            status: 'pending',
            difficulty: 'hard_manual',
            startedAt: null,
            completedAt: null,
            errorText: null,
            createdAt: new Date('2026-06-24T09:00:00.000Z'),
          },
          {
            id: 'job-failed',
            sourceId: 'source-3',
            status: 'failed',
            difficulty: 'browser_required',
            startedAt: new Date('2026-06-24T10:00:00.000Z'),
            completedAt: new Date('2026-06-24T10:02:00.000Z'),
            errorText: 'Selector not found in admissions page',
            createdAt: new Date('2026-06-24T09:59:00.000Z'),
          },
        ],
      }),
      now,
    );

    expect(report.ingestion.jobsByStatus).toMatchObject({
      pending: 1,
      running: 1,
      failed: 1,
    });
    expect(report.ingestion.jobsByDifficulty).toMatchObject({
      easy: 1,
      browser_required: 1,
      hard_manual: 1,
    });
    expect(report.ingestion.oldestActiveJobs[0]).toMatchObject({ id: 'job-old' });
    expect(report.ingestion.recentFailures[0]).toMatchObject({
      id: 'job-failed',
      errorText: 'Selector not found in admissions page',
    });
  });

  it('reports review queue backlog, oldest pending item, and target field distribution', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        reviewItems: [
          {
            id: 'review-old',
            payloadId: 'payload-1',
            admissionRequirementId: 'req-tau-cs',
            targetField: 'programDescription',
            status: 'pending',
            createdAt: new Date('2026-06-23T09:00:00.000Z'),
            reviewedAt: null,
          },
          {
            id: 'review-new',
            payloadId: 'payload-2',
            admissionRequirementId: 'req-tau-law',
            targetField: 'programDescription',
            status: 'pending',
            createdAt: new Date('2026-06-24T09:00:00.000Z'),
            reviewedAt: null,
          },
          {
            id: 'review-approved',
            payloadId: 'payload-3',
            admissionRequirementId: 'req-tau-law',
            targetField: 'specificAdmissionNotes',
            status: 'approved',
            createdAt: new Date('2026-06-22T09:00:00.000Z'),
            reviewedAt: new Date('2026-06-24T10:00:00.000Z'),
          },
        ],
      }),
      now,
    );

    expect(report.reviewQueue.pendingCount).toBe(2);
    expect(report.reviewQueue.oldestPendingItem).toMatchObject({ id: 'review-old' });
    expect(report.reviewQueue.pendingByTargetField).toEqual({
      programDescription: 2,
    });
    expect(report.reviewQueue.recentReviewedItems).toEqual([
      expect.objectContaining({ id: 'review-approved', status: 'approved' }),
    ]);
  });

  it('returns zero-count sections for empty tables', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        institutions: [],
        programs: [],
        programInstitutions: [],
        admissionRequirements: [],
        admissionThresholds: [],
        sourceUrls: [],
        universityCalculatorConfigs: [],
        admissionsSourceCandidates: [],
        admissionFacts: [],
        admissionAlternativePaths: [],
      }),
      now,
    );

    expect(report.readiness.counts.programs).toBe(0);
    expect(report.coverage.missingRequirementSourceCount).toBe(0);
    expect(report.ingestion.totalJobs).toBe(0);
    expect(report.reviewQueue.pendingCount).toBe(0);
  });
});

describe('getDataHealthReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.getOpsDb.mockReset();
  });

  it('returns an unavailable state when the ops database is not configured', async () => {
    hoistedMocks.getOpsDb.mockImplementation(() => {
      throw new Error('Missing OPS_DATABASE_URL');
    });

    await expect(getDataHealthReport()).resolves.toEqual({
      status: 'unavailable',
      message: 'Operational data health is not configured.',
    });
  });

  it('returns an unavailable state when the ops database query stalls', async () => {
    vi.useFakeTimers();
    hoistedMocks.getOpsDb.mockReturnValue({
      select: vi.fn(() => ({
        from: vi.fn(() => new Promise<never>(() => {})),
      })),
    });

    try {
      const reportPromise = getDataHealthReport(now, { timeoutMs: 10 });

      await vi.advanceTimersByTimeAsync(10);

      await expect(reportPromise).resolves.toEqual({
        status: 'unavailable',
        message:
          'Operational data health did not respond in time. Check OPS_DATABASE_URL and Supabase pooler connectivity.',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
