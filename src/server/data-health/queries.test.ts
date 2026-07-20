import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  getOpsDb: vi.fn(),
}));

vi.mock('@/db/opsClient', () => ({
  getOpsDb: hoistedMocks.getOpsDb,
}));

vi.mock('server-only', () => ({}));

import {
  buildReviewItemDetail,
  getDataHealthReport,
  summarizeDataHealthRows,
  type DataHealthRows,
} from './queries';
import { mondayAdmissionsEvidence } from '@/data/admissions/mondayEvidence';

const now = new Date('2026-06-24T18:00:00.000Z');

function baseRows(overrides: Partial<DataHealthRows> = {}): DataHealthRows {
  return {
    institutions: [
      {
        id: 'tau',
        name: 'Tel Aviv University',
        region: 'center',
        domain: 'tau.ac.il',
        logoUrl: null,
        programUrl: null,
        calculatorUrl: 'https://go.tau.ac.il/graphql',
        universityId: 'tau',
      },
      {
        id: 'technion',
        name: 'Technion',
        region: 'north',
        domain: 'technion.ac.il',
        logoUrl: null,
        programUrl: null,
        calculatorUrl: null,
        universityId: 'technion',
      },
      {
        id: 'haifa',
        name: 'University of Haifa',
        region: 'north',
        domain: 'haifa.ac.il',
        logoUrl: null,
        programUrl: null,
        calculatorUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
        universityId: 'haifa',
      },
    ],
    programs: [
      {
        id: 'tau_datascience',
        name: 'Digital Sciences for High-Tech',
        institutionName: 'Tel Aviv University',
        institutionId: 'tau',
        type: 'academic',
        category: 'Computer Science',
        admissionType: 'sekhem',
      },
      {
        id: 'haifa_cs',
        name: 'Computer Science',
        institutionName: 'University of Haifa',
        institutionId: 'haifa',
        type: 'academic',
        category: 'Computer Science',
        admissionType: 'sekhem',
      },
      {
        id: 'tau_law',
        name: 'Law',
        institutionName: 'Tel Aviv University',
        institutionId: 'tau',
        type: 'academic',
        category: 'Law',
        admissionType: 'requirements',
      },
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
        thresholdValue: 710,
      },
      {
        id: 'threshold-haifa-cs',
        programId: 'haifa_cs',
        institutionId: 'haifa',
        universityId: 'haifa',
        thresholdValue: 705,
      },
    ],
    sourceUrls: [
      {
        id: 'source-tau-ds',
        admissionRequirementId: 'req-tau-ds',
        programId: 'tau_datascience',
        institutionId: 'tau',
        url: 'https://example.com/tau-ds',
      },
      {
        id: 'source-haifa-cs',
        admissionRequirementId: 'req-haifa-cs',
        programId: 'haifa_cs',
        institutionId: 'haifa',
        url: 'https://example.com/haifa-cs',
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
        psyWeight: 0.5,
        bagrutWeight: 0.5,
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
        formulaType: 'minimum_floors',
        psyWeight: null,
        bagrutWeight: null,
        minPsychometric: 550,
        minBagrut: 85,
        scaleDescription: 'minimum floors',
      },
      {
        institutionId: 'ariel',
        formulaType: 'minimum_floors',
        psyWeight: null,
        bagrutWeight: null,
        minPsychometric: 500,
        minBagrut: 80,
        scaleDescription: 'minimum floors',
      },
      {
        institutionId: 'reichman',
        formulaType: 'weighted_scaled',
        psyWeight: 0.5,
        bagrutWeight: 0.5,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: 'Weighted scale',
      },
      {
        institutionId: 'afeka',
        formulaType: 'weighted_scaled',
        psyWeight: 0.5,
        bagrutWeight: 0.5,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: 'Weighted scale',
      },
      {
        institutionId: 'hit',
        formulaType: 'minimum_floors',
        psyWeight: null,
        bagrutWeight: null,
        minPsychometric: null,
        minBagrut: null,
        scaleDescription: 'minimum floors',
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
    admissionsSourceCandidates: [
      {
        id: 'candidate-tau-ds',
        admissionRequirementId: 'req-tau-ds',
        programId: 'tau_datascience',
        institutionId: 'tau',
        origin: 'catalogue_url',
        specificity: 'calculator',
        confidence: 'high',
      },
      {
        id: 'candidate-haifa-cs',
        admissionRequirementId: 'req-haifa-cs',
        programId: 'haifa_cs',
        institutionId: 'haifa',
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
        id: 'fact-tau-ds-sekhem',
        admissionRequirementId: 'req-tau-ds',
        programId: 'tau_datascience',
        institutionId: 'tau',
        kind: 'numeric_gate',
        field: 'sekhem',
        confidence: 'high',
      },
      {
        id: 'fact-haifa-cs-sekhem',
        admissionRequirementId: 'req-haifa-cs',
        programId: 'haifa_cs',
        institutionId: 'haifa',
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
    sourceFreshnessStates: [],
    admissionReleases: [],
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
      sourceUrls: 3,
      universityCalculatorConfigs: 10,
    });
    expect(report.readiness.isReady).toBe(true);
    expect(report.readiness.issues).toEqual([]);
  });

  it('reports the latest published admissions release separately from failed publication attempts', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        admissionReleases: [
          {
            id: 'release-old',
            manifestDigest: 'sha256:old',
            repositoryCommit: 'oldcommit',
            status: 'published',
            publishedAt: new Date('2026-06-23T17:00:00.000Z'),
          },
          {
            id: 'release-new',
            manifestDigest: 'sha256:new',
            repositoryCommit: 'newcommit',
            status: 'published',
            publishedAt: new Date('2026-06-24T17:00:00.000Z'),
          },
          {
            id: 'release-pending',
            manifestDigest: 'sha256:pending',
            repositoryCommit: 'pendingcommit',
            status: 'pending',
            publishedAt: null,
          },
          {
            id: 'release-failed',
            manifestDigest: 'sha256:failed',
            repositoryCommit: 'failedcommit',
            status: 'failed',
            publishedAt: null,
          },
        ],
      }),
      now,
    );

    expect(report.publication).toEqual({
      activeRelease: {
        id: 'release-new',
        manifestDigest: 'sha256:new',
        repositoryCommit: 'newcommit',
        publishedAt: '2026-06-24T17:00:00.000Z',
      },
      failedReleaseCount: 1,
      pendingReleaseCount: 1,
    });
  });

  it('includes admission requirements with no source URL in missing coverage', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        sourceUrls: [
          {
            id: 'source-tau-cs',
            admissionRequirementId: 'req-tau-ds',
            programId: 'tau_datascience',
            institutionId: 'tau',
            url: 'https://example.com/tau-ds',
          },
          {
            id: 'source-haifa-cs',
            admissionRequirementId: 'req-haifa-cs',
            programId: 'haifa_cs',
            institutionId: 'haifa',
            url: 'https://example.com/haifa-cs',
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
            id: 'fact-tau-ds-sekhem',
            admissionRequirementId: 'req-tau-ds',
            programId: 'tau_datascience',
            institutionId: 'tau',
            kind: 'numeric_gate',
            field: 'sekhem',
            confidence: 'high',
          },
          {
            id: 'fact-haifa-cs-sekhem',
            admissionRequirementId: 'req-haifa-cs',
            programId: 'haifa_cs',
            institutionId: 'haifa',
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

    expect(report.decisionReadiness.decisionReadyRequirementCount).toBe(3);
    expect(report.decisionReadiness.weakSourceCount).toBe(1);
    expect(report.decisionReadiness.manualGateCount).toBe(1);
    expect(report.decisionReadiness.alternativePathCount).toBe(1);
    expect(report.decisionReadiness.weakSources[0]).toMatchObject({
      sourceCandidateId: 'candidate-tau-law',
      specificity: 'generic',
    });
  });

  it('builds pair-level admissions evidence rows from runtime capability metadata', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        sourceFreshnessStates: [
          freshnessState('tau-digital-sciences-live', {
            sourceId: 'tau-digital-sciences-live',
            sourceClass: 'api_static_json',
            capability: 'decision_capable',
            status: 'fresh',
            lastCheckedAt: new Date('2026-06-24T17:00:00.000Z'),
            lastSuccessfulCheckAt: new Date('2026-06-24T17:00:00.000Z'),
            lastChangedAt: null,
            latestFailureReason: null,
            blockedReason: null,
            latestReviewItemId: null,
            nextAction: null,
          }),
          freshnessState('haifa-cs-live', {
            sourceId: 'haifa-cs-live',
            sourceClass: 'official_html',
            capability: 'decision_capable',
            status: 'fresh',
            lastCheckedAt: new Date('2026-06-24T17:00:00.000Z'),
            lastSuccessfulCheckAt: new Date('2026-06-24T01:00:00.000Z'),
            lastChangedAt: null,
            latestFailureReason: null,
            blockedReason: null,
            latestReviewItemId: null,
            nextAction: null,
          }),
        ],
      }),
      now,
    );

    expect(report.decisionEvidence.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programId: 'tau_datascience',
          institutionId: 'tau',
          institutionName: 'Tel Aviv University',
          evidenceMode: 'exact',
          severity: 'normal',
          sourceTargetId: 'tau-digital-sciences-live',
          officialSourceUrl: 'https://go.tau.ac.il/graphql',
          externalProgramId: '056011050000',
          freshnessStatus: 'fresh',
          requiredInputs: [],
        }),
        expect.objectContaining({
          programId: 'haifa_cs',
          institutionId: 'haifa',
          institutionName: 'University of Haifa',
          evidenceMode: 'needs_input',
          severity: 'normal',
          sourceTargetId: 'haifa-cs-live',
          officialSourceUrl: 'https://applicants.haifa.ac.il/enrollmentChances/index.html',
          externalProgramId: '52258372',
          requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
        }),
        expect.objectContaining({
          programId: 'tau_law',
          institutionId: 'tau',
          evidenceMode: 'unsupported',
          severity: 'informational',
          sourceTargetId: null,
        }),
      ]),
    );
  });

  it('surfaces a deterministic non-catalogue Monday evidence backlog slice for operators', () => {
    const report = summarizeDataHealthRows(baseRows(), now);
    const expectedNonCatalogueCount = mondayAdmissionsEvidence.filter(
      (record) => record.catalogueVisibility === 'evidence_only',
    ).length;

    expect(report.mondayEvidence.nonCatalogueEvidence).toBe(expectedNonCatalogueCount);
    expect(report.mondayEvidence.nonCatalogueGroups.length).toBeGreaterThan(0);
    expect(report.mondayEvidence.nonCatalogueBucketCounts).toMatchObject({
      eligible_no_formal_grade_gate: expect.any(Number),
      eligible_with_manual_gate: expect.any(Number),
      manual_gate: expect.any(Number),
      requirements_review: expect.any(Number),
    });
    expect(report.mondayEvidence.nonCatalogueGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bucket: expect.any(String),
          count: expect.any(Number),
          rows: expect.arrayContaining([
            expect.objectContaining({
              publicBucket: expect.any(String),
              itemId: expect.any(String),
              itemName: expect.stringMatching(/^\d+\./),
              nextAction: expect.any(String),
            }),
          ]),
        }),
      ]),
    );
  });

  it('flags requirements that have source URLs but no structured admissions facts', () => {
    const report = summarizeDataHealthRows(
      baseRows({
        admissionFacts: [],
      }),
      now,
    );

    expect(report.decisionReadiness.missingFactCount).toBe(3);
    expect(report.decisionReadiness.requirementsMissingFacts).toEqual([
      {
        admissionRequirementId: 'req-tau-ds',
        institutionId: 'tau',
        programId: 'tau_datascience',
      },
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
      now,
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

describe('buildReviewItemDetail', () => {
  const reviewCreatedAt = new Date('2026-06-24T11:00:00.000Z');

  it('returns bounded evidence and action eligibility for a pending source freshness item', () => {
    const detail = buildReviewItemDetail({
      reviewItem: reviewItemRow({
        proposedValue: sourceFreshnessProposedValue({
          normalizedDecisionPayload: Object.fromEntries(
            Array.from({ length: 10 }, (_, index) => [`field-${index}`, `value-${index}`]),
          ),
        }),
      }),
      payload: {
        createdAt: new Date('2026-06-24T10:59:00.000Z'),
      },
      source: sourceDetailRow(),
      freshness: freshnessDetailRow(),
    });

    expect(detail).toMatchObject({
      id: 'review-source-1',
      payloadId: 'payload-source-1',
      payloadCreatedAt: '2026-06-24T10:59:00.000Z',
      targetField: 'sourceFreshness',
      status: 'pending',
      actionEligibility: {
        canReject: true,
      },
      evidence: {
        sourceId: 'tau-live',
        institutionId: 'tau',
        programId: 'tau_cs',
        sourceUrl: 'https://go.tau.ac.il/graphql',
        sourceClass: 'api_static_json',
        capability: 'decision_capable',
        freshnessStatus: 'changed_needs_review',
        latestReviewItemId: 'review-source-1',
        normalizedFingerprint: 'fingerprint-v2',
        reproducedFields: ['sekhem'],
        limitations: ['does not cover manual exceptions'],
        nextAction: 'Review changed threshold before publication',
      },
    });
    expect(detail.evidence.normalizedDecisionPayload).toHaveLength(8);
    expect(JSON.stringify(detail)).not.toContain('rawHtml');
  });

  it('keeps historical resolved items visible but ineligible for action', () => {
    const detail = buildReviewItemDetail({
      reviewItem: reviewItemRow({
        status: 'approved',
        reviewedAt: new Date('2026-06-24T12:00:00.000Z'),
      }),
      payload: null,
      source: sourceDetailRow(),
      freshness: freshnessDetailRow({ latestReviewItemId: null, status: 'fresh' }),
    });

    expect(detail.status).toBe('approved');
    expect(detail.reviewedAt).toBe('2026-06-24T12:00:00.000Z');
    expect(detail.actionEligibility).toEqual({
      canReject: false,
    });
  });

  it('keeps a pending investigation resolvable even when a newer source check exists', () => {
    const detail = buildReviewItemDetail({
      reviewItem: reviewItemRow(),
      payload: null,
      source: sourceDetailRow(),
      freshness: freshnessDetailRow({ latestReviewItemId: 'newer-review-item' }),
    });

    expect(detail.actionEligibility).toEqual({
      canReject: true,
    });
  });

  it('allows no-change resolution for unsupported target fields', () => {
    const detail = buildReviewItemDetail({
      reviewItem: reviewItemRow({
        targetField: 'programDescription',
        proposedValue: { programDescription: 'Updated description' },
      }),
      payload: null,
      source: null,
      freshness: null,
    });

    expect(detail.actionEligibility).toEqual({
      canReject: true,
    });
    expect(detail.evidence.normalizedDecisionPayload).toEqual([]);
  });

  function reviewItemRow(
    overrides: Partial<Parameters<typeof buildReviewItemDetail>[0]['reviewItem']> = {},
  ): Parameters<typeof buildReviewItemDetail>[0]['reviewItem'] {
    return {
      id: 'review-source-1',
      payloadId: 'payload-source-1',
      admissionRequirementId: null,
      targetField: 'sourceFreshness',
      proposedValue: sourceFreshnessProposedValue(),
      status: 'pending',
      createdAt: reviewCreatedAt,
      reviewedAt: null,
      ...overrides,
    };
  }

  function sourceFreshnessProposedValue(
    overrides: Partial<{
      sourceId: string;
      normalizedFingerprint: string;
      normalizedDecisionPayload: Record<string, unknown>;
      reproducedFields: string[];
      limitations: string[];
      nextAction: string;
      rawHtml: string;
    }> = {},
  ): Record<string, unknown> {
    return {
      sourceId: 'tau-live',
      normalizedFingerprint: 'fingerprint-v2',
      normalizedDecisionPayload: { sekhem: 715 },
      reproducedFields: ['sekhem'],
      limitations: ['does not cover manual exceptions'],
      nextAction: 'Review changed threshold before publication',
      rawHtml: '<html>large scraped body must not leak</html>',
      ...overrides,
    };
  }

  function sourceDetailRow(
    overrides: Partial<Parameters<typeof buildReviewItemDetail>[0]['source']> = {},
  ): NonNullable<Parameters<typeof buildReviewItemDetail>[0]['source']> {
    return {
      id: 'tau-live',
      institutionId: 'tau',
      programId: 'tau_cs',
      sourceUrl: 'https://go.tau.ac.il/graphql',
      ...overrides,
    };
  }

  function freshnessDetailRow(
    overrides: Partial<Parameters<typeof buildReviewItemDetail>[0]['freshness']> = {},
  ): NonNullable<Parameters<typeof buildReviewItemDetail>[0]['freshness']> {
    return {
      sourceId: 'tau-live',
      sourceClass: 'api_static_json',
      capability: 'decision_capable',
      status: 'changed_needs_review',
      lastCheckedAt: new Date('2026-06-24T10:58:00.000Z'),
      lastSuccessfulCheckAt: new Date('2026-06-24T10:58:00.000Z'),
      lastChangedAt: new Date('2026-06-24T10:58:00.000Z'),
      latestReviewItemId: 'review-source-1',
      nextAction: 'Review changed threshold before publication',
      ...overrides,
    };
  }
});

function sourceRow(id: string): DataHealthRows['ingestionSources'][number] {
  return {
    id,
    institutionId: 'tau',
    programId: null,
    difficulty: 'easy',
    sourceUrl: `https://example.com/${id}`,
  };
}

function freshnessState(
  sourceId: string,
  overrides: Partial<DataHealthRows['sourceFreshnessStates'][number]> = {},
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
    rawFingerprint: null,
    normalizedFingerprint: null,
    normalizedDecisionPayload: {},
    latestReviewItemId: null,
    nextAction: null,
    createdAt: new Date('2026-06-23T18:00:00.000Z'),
    updatedAt: new Date('2026-06-23T18:00:00.000Z'),
    ...overrides,
  };
}

describe('getDataHealthReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.getOpsDb.mockReset();
  });

  it('loads report tables sequentially to stay within the ops role connection limit', async () => {
    let activeQueries = 0;
    let maxActiveQueries = 0;
    const from = vi.fn(async () => {
      activeQueries += 1;
      maxActiveQueries = Math.max(maxActiveQueries, activeQueries);
      await Promise.resolve();
      activeQueries -= 1;
      return [];
    });

    hoistedMocks.getOpsDb.mockReturnValue({
      select: vi.fn(() => ({ from })),
    });

    const report = await getDataHealthReport(now);

    expect(report.status).toBe('ready');
    expect(from).toHaveBeenCalledTimes(15);
    expect(maxActiveQueries).toBe(1);
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
