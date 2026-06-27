import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  getOpsDb: vi.fn(),
}));

vi.mock('@/db/opsClient', () => ({
  getOpsDb: hoistedMocks.getOpsDb,
}));

vi.mock('server-only', () => ({}));

import {
  getDataHealthReport,
  summarizeDataHealthRows,
  type DataHealthRows,
} from './queries';

const now = new Date('2026-06-24T18:00:00.000Z');

function baseRows(overrides: Partial<DataHealthRows> = {}): DataHealthRows {
  return {
    institutions: [
      {
        id: 'tau',
        name: 'אוניברסיטת תל אביב',
        region: 'center',
        domain: 'tau.ac.il',
        logoUrl: null,
        programUrl: null,
        calculatorUrl: null,
        universityId: 'tau',
      },
      {
        id: 'technion',
        name: 'הטכניון – מכון טכנולוגי לישראל',
        region: 'north',
        domain: 'technion.ac.il',
        logoUrl: null,
        programUrl: null,
        calculatorUrl: null,
        universityId: 'technion',
      },
      {
        id: 'haifa',
        name: 'אוניברסיטת חיפה',
        region: 'north',
        domain: 'haifa.ac.il',
        logoUrl: null,
        programUrl: null,
        calculatorUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
        universityId: 'haifa',
      },
    ],
    programs: [
      { id: 'tau_cs', name: 'Computer Science', admissionType: 'sekhem' },
      { id: 'haifa_cs', name: 'Computer Science', admissionType: 'sekhem' },
      { id: 'tau_law', name: 'Law', admissionType: 'requirements' },
    ],
    programInstitutions: [
      { programId: 'tau_cs', institutionId: 'tau' },
      { programId: 'haifa_cs', institutionId: 'haifa' },
      { programId: 'tau_law', institutionId: 'tau' },
    ],
    admissionRequirements: [
      { id: 'req-tau-cs', programId: 'tau_cs', institutionId: 'tau' },
      { id: 'req-haifa-cs', programId: 'haifa_cs', institutionId: 'haifa' },
      { id: 'req-tau-law', programId: 'tau_law', institutionId: 'tau' },
    ],
    admissionThresholds: [
      {
        id: 'threshold-tau-cs',
        programId: 'tau_cs',
        institutionId: 'tau',
        universityId: 'tau',
        thresholdValue: 710,
        thresholdKind: 'sekhem',
      },
      {
        id: 'threshold-haifa-cs',
        programId: 'haifa_cs',
        institutionId: 'haifa',
        universityId: 'haifa',
        thresholdValue: 700,
        thresholdKind: 'sekhem',
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
      {
        institutionId: 'tau',
        formulaType: 'weighted_scaled',
        psyWeight: 0.6,
        bagrutWeight: 0.4,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: '200-800',
      },
      {
        institutionId: 'huji',
        formulaType: 'weighted_scaled',
        psyWeight: 0.6,
        bagrutWeight: 0.4,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: '200-800',
      },
      {
        institutionId: 'technion',
        formulaType: 'technion_linear',
        psyWeight: null,
        bagrutWeight: null,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: '0-100',
      },
      {
        institutionId: 'bgu',
        formulaType: 'weighted_scaled',
        psyWeight: 0.7,
        bagrutWeight: 0.3,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: '200-800',
      },
      {
        institutionId: 'haifa',
        formulaType: 'weighted_scaled',
        psyWeight: 0.75,
        bagrutWeight: 0.25,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: '200-800',
      },
      {
        institutionId: 'biu',
        formulaType: 'weighted_scaled',
        psyWeight: 0.6,
        bagrutWeight: 0.4,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: '200-800',
      },
      {
        institutionId: 'ariel',
        formulaType: 'weighted_scaled',
        psyWeight: 0.6,
        bagrutWeight: 0.4,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: '200-800',
      },
    ],
    ingestionSources: [
      {
        id: 'tau-live',
        institutionId: 'tau',
        programId: 'tau_cs',
        difficulty: 'easy',
        sourceUrl: 'https://go.tau.ac.il/graphql',
      },
      {
        id: 'haifa-live',
        institutionId: 'haifa',
        programId: null,
        difficulty: 'easy',
        sourceUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
      },
    ],
    ingestionJobs: [],
    reviewItems: [],
    sourceFreshnessStates: [],
    ...overrides,
  };
}

describe('summarizeDataHealthRows', () => {
  it('reports complete catalogue readiness without false missing-link issues', () => {
    const report = summarizeDataHealthRows(baseRows(), now);

    expect(report.status).toBe('ready');
    expect(report.readiness.counts).toEqual({
      institutions: 3,
      programs: 3,
      programInstitutions: 3,
      admissionRequirements: 3,
      admissionThresholds: 2,
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
      now
    );

    expect(report.coverage.missingRequirementSources).toEqual([
      {
        admissionRequirementId: 'req-haifa-cs',
        institutionId: 'haifa',
        programId: 'haifa_cs',
      },
      {
        admissionRequirementId: 'req-tau-law',
        institutionId: 'tau',
        programId: 'tau_law',
      },
    ]);
    expect(report.coverage.missingRequirementSourceCount).toBe(2);
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
      now
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
      now
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

  it('aggregates source freshness totals across live, changed, failed, stale, blocked, and never checked rows', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        ingestionSources: [
          sourceRow('fresh-source'),
          sourceRow('changed-source'),
          sourceRow('failed-source'),
          sourceRow('stale-source'),
          sourceRow('blocked-source'),
          sourceRow('never-source'),
        ],
        sourceFreshnessStates: [
          freshnessState('fresh-source', {
            status: 'fresh',
            lastSuccessfulCheckAt: new Date('2026-06-23T18:00:00.000Z'),
          }),
          freshnessState('changed-source', {
            status: 'changed_needs_review',
            latestReviewItemId: 'review-1',
          }),
          freshnessState('failed-source', {
            status: 'failed',
            latestFailureReason: 'Official endpoint timed out',
          }),
          freshnessState('stale-source', {
            status: 'fresh',
            lastSuccessfulCheckAt: new Date('2026-06-01T18:00:00.000Z'),
          }),
          freshnessState('blocked-source', {
            status: 'blocked',
            blockedReason: 'Radware/browser session required',
          }),
        ],
      }),
      now
    );

    expect(report.freshness.totalsByStatus).toEqual({
      blocked: 1,
      changed_needs_review: 1,
      failed: 1,
      fresh: 1,
      never_checked: 1,
      stale: 1,
    });
    expect(report.freshness.rows[0]).toMatchObject({
      sourceId: 'changed-source',
      status: 'changed_needs_review',
      latestReviewItemId: 'review-1',
    });
    expect(report.freshness.rows).toHaveLength(5);
    expect(report.freshness.rows.find((row) => row.sourceId === 'failed-source')).toMatchObject({
      reason: 'Official endpoint timed out',
    });
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
      }),
      now
    );

    expect(report.readiness.counts.programs).toBe(0);
    expect(report.coverage.missingRequirementSourceCount).toBe(0);
    expect(report.ingestion.totalJobs).toBe(0);
    expect(report.reviewQueue.pendingCount).toBe(0);
  });

  it('summarizes public admissions capability across exact, needs-input, and unsupported-ready states', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        programs: [
          { id: 'tau_datascience', name: 'Digital Sciences', admissionType: 'sekhem' },
          { id: 'haifa_cs', name: 'Computer Science', admissionType: 'sekhem' },
          { id: 'tau_law', name: 'Law', admissionType: 'requirements' },
        ],
        programInstitutions: [
          { programId: 'tau_datascience', institutionId: 'tau' },
          { programId: 'haifa_cs', institutionId: 'haifa' },
          { programId: 'tau_law', institutionId: 'tau' },
        ],
        admissionRequirements: [
          { id: 'req-tau-ds', programId: 'tau_datascience', institutionId: 'tau' },
          { id: 'req-haifa-cs', programId: 'haifa_cs', institutionId: 'haifa' },
          { id: 'req-tau-law', programId: 'tau_law', institutionId: 'tau' },
        ],
        admissionThresholds: [
          {
            id: 'threshold-tau-ds',
            programId: 'tau_datascience',
            institutionId: 'tau',
            universityId: 'tau',
            thresholdValue: 700,
            thresholdKind: 'sekhem',
          },
          {
            id: 'threshold-haifa-cs',
            programId: 'haifa_cs',
            institutionId: 'haifa',
            universityId: 'haifa',
            thresholdValue: 700,
            thresholdKind: 'sekhem',
          },
        ],
        ingestionSources: [
          sourceRow('tau-digital-sciences-live', { institutionId: 'tau', programId: 'tau_datascience' }),
          sourceRow('haifa-cs-live', { institutionId: 'haifa', programId: 'haifa_cs' }),
        ],
        sourceFreshnessStates: [
          freshnessState('tau-digital-sciences-live', {
            status: 'fresh',
            lastSuccessfulCheckAt: new Date('2026-06-24T17:00:00.000Z'),
          }),
          freshnessState('haifa-cs-live', {
            status: 'fresh',
            lastSuccessfulCheckAt: new Date('2026-06-24T17:00:00.000Z'),
          }),
        ],
      }),
      now
    );

    expect(report.publicAdmissions.totalPairs).toBe(3);
    expect(report.publicAdmissions.unclassifiedCount).toBe(0);
    expect(report.publicAdmissions.totalsByCapability).toMatchObject({
      exact: 1,
      needs_input: 1,
      unsupported: 1,
    });
    expect(report.publicAdmissions.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'tau_datascience',
          institutionId: 'tau',
          capability: 'exact',
        }),
        expect.objectContaining({
          programId: 'haifa_cs',
          institutionId: 'haifa',
          capability: 'needs_input',
        }),
      ])
    );
  });
});

function sourceRow(
  id: string,
  overrides: Partial<DataHealthRows['ingestionSources'][number]> = {}
): DataHealthRows['ingestionSources'][number] {
  return {
    id,
    institutionId: 'tau',
    programId: null,
    difficulty: 'easy',
    sourceUrl: `https://example.com/${id}`,
    ...overrides,
  };
}

function freshnessState(
  sourceId: string,
  overrides: Partial<DataHealthRows['sourceFreshnessStates'][number]> = {}
): DataHealthRows['sourceFreshnessStates'][number] {
  return {
    sourceId,
    sourceClass: 'api_static_json',
    capability: 'decision_capable',
    status: 'fresh',
    lastCheckedAt: new Date('2026-06-23T18:00:00.000Z'),
    lastSuccessfulCheckAt: new Date('2026-06-23T18:00:00.000Z'),
    lastChangedAt: null,
    latestFailureReason: null,
    blockedReason: null,
    latestReviewItemId: null,
    nextAction: null,
    ...overrides,
  };
}

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
});
