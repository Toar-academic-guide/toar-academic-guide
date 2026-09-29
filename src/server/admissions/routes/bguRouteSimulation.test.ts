import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { BagrutSubjectRecordV2 } from '@/types';

import {
  runBguComputerScienceProfileRouteSimulation,
  runBguComputerScienceRouteSimulation,
} from './bguRouteSimulation';
import type { BguFinalist } from './bguFinalistVerifier';

const subjectRecord: BagrutSubjectRecordV2 = {
  schemaVersion: 2,
  sector: 'jewish',
  certificateType: 'internal',
  complete: true,
  subjects: [{ subjectId: 'mathematics', units: 5, grade: 85, assessmentKind: 'exam' }],
};

const finalist = (id: string): BguFinalist => ({
  id,
  psychometric: 700,
  bagrutAverage: 110,
  quantitativeSubscore: 140,
  verbalSubscore: 130,
  englishSubscore: 130,
  languageRequirementsConfirmed: true,
  subjectRecord,
});

describe('runBguComputerScienceRouteSimulation', () => {
  it('ranks only exact eligible finalists when availability is mixed', async () => {
    const candidates = [candidate('fast'), candidate('easy')];

    const result = await runBguComputerScienceRouteSimulation({
      candidates,
      verifyFinalists: async (finalists) =>
        finalists.map((item) =>
          item.id === 'fast'
            ? {
                id: item.id,
                status: 'verified' as const,
                eligible: true,
                score: 721,
                cutoff: 720,
                sourceUrl: 'https://example.com/bgu',
                ruleFingerprint: 'sha256:current',
                unmetRequirements: [],
              }
            : {
                id: item.id,
                status: 'unavailable' as const,
                sourceUrl: 'https://example.com/bgu',
                reason: 'official_source_unavailable' as const,
              },
        ),
    });

    expect(result).toMatchObject({
      status: 'complete',
      fastest: { id: 'fast', verification: { score: 721, cutoff: 720 } },
      unavailableFinalistCount: 1,
    });
  });

  it('preserves an authority-unavailable result when no finalist has exact proof', async () => {
    const result = await runBguComputerScienceRouteSimulation({
      candidates: [candidate('only')],
      verifyFinalists: async (finalists) =>
        finalists.map((item) => ({
          id: item.id,
          status: 'unavailable' as const,
          sourceUrl: 'https://example.com/bgu',
          reason: 'official_source_unavailable' as const,
        })),
    });

    expect(result).toMatchObject({ status: 'authority_unavailable', pareto: [] });
    expect(result.fastest).toBeUndefined();
  });

  it('recomputes BGU averages and components before verifying bounded profile candidates', async () => {
    const completeRecord: BagrutSubjectRecordV2 = {
      schemaVersion: 2,
      sector: 'jewish',
      certificateType: 'internal',
      complete: true,
      subjects: [
        { subjectId: 'mathematics', units: 4, grade: 90, assessmentKind: 'exam' },
        { subjectId: 'english', units: 5, grade: 90, assessmentKind: 'exam' },
        { subjectId: 'history', units: 2, grade: 80, assessmentKind: 'exam' },
        { subjectId: 'civics', units: 2, grade: 80, assessmentKind: 'exam' },
        { subjectId: 'hebrew_expression', units: 2, grade: 80, assessmentKind: 'exam' },
        { subjectId: 'physics', units: 5, grade: 80, assessmentKind: 'exam' },
      ],
    };
    const seen: BguFinalist[] = [];
    const result = await runBguComputerScienceProfileRouteSimulation({
      profile: {
        psychometric: 610,
        bguBagrutAverage: 100,
        quantitativeSubscore: 125,
        verbalSubscore: 110,
        englishSubscore: 115,
        languageRequirementsConfirmed: true,
        subjectRecord: completeRecord,
      },
      verifyFinalists: async (finalists) => {
        seen.push(...finalists);
        return finalists.map((item, index) => ({
          id: item.id,
          status: 'verified' as const,
          eligible: index === 0,
          score: index === 0 ? 682 : 670,
          cutoff: 681,
          sourceUrl: 'https://example.com/bgu',
          ruleFingerprint: 'sha256:current',
          unmetRequirements: [],
        }));
      },
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.length).toBeLessThanOrEqual(8);
    expect(seen.every((item) => item.bagrutAverage !== 100)).toBe(true);
    expect(result.status).toBe('complete');
  });
});

function candidate(id: string) {
  const routeFinalist = finalist(id);
  return {
    id,
    actions: [
      {
        id: `${id}-grade`,
        kind: 'improve_grade' as const,
        subjectId: 'mathematics',
        fromGrade: 80,
        toGrade: 85,
      },
    ],
    afterProfile: { psychometric: 700, subjectRecord },
    finalist: routeFinalist,
  };
}
