import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { BagrutSubjectRecordV2 } from '@/types';
import {
  BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT,
  BGU_COMPUTER_SCIENCE_RULE_CAPTURE,
  BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
} from '@/data/admissions/bguComputerScienceVerification';

import {
  createBguFinalistCircuit,
  verifyBguComputerScienceFinalists,
  type BguFinalist,
} from './bguFinalistVerifier';

const subjectRecord: BagrutSubjectRecordV2 = {
  schemaVersion: 2,
  sector: 'jewish',
  certificateType: 'internal',
  complete: true,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 85, assessmentKind: 'exam' },
    { subjectId: 'english', units: 5, grade: 85, assessmentKind: 'exam' },
  ],
};

const finalist: BguFinalist = {
  id: 'candidate-1',
  psychometric: 700,
  bagrutAverage: 110,
  quantitativeSubscore: 140,
  verbalSubscore: 130,
  englishSubscore: 130,
  languageRequirementsConfirmed: true,
  subjectRecord,
};

describe('verifyBguComputerScienceFinalists', () => {
  it.each([
    [721, true],
    [719, false],
  ])('normalizes exact BGU score %s into eligibility %s', async (score, eligible) => {
    const fetcher = successfulFetcher(score);

    const result = await verifyBguComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'candidate-1',
        status: 'verified',
        eligible,
        score,
        cutoff: BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT.acceptanceThreshold,
        ruleFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      }),
    ]);
  });

  it('withholds a score-passing finalist when a current programme gate fails', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await verifyBguComputerScienceFinalists({
      finalists: [
        {
          ...finalist,
          subjectRecord: {
            ...subjectRecord,
            subjects: subjectRecord.subjects.map((subject) =>
              subject.subjectId === 'mathematics' ? { ...subject, grade: 79 } : subject,
            ),
          },
        },
      ],
      fetcher,
    });

    expect(result).toEqual([
      expect.objectContaining({
        status: 'verified',
        eligible: false,
        unmetRequirements: ['mathematics_90_at_4_or_80_at_5'],
      }),
    ]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fails closed on cutoff or source-rule drift', async () => {
    const changedRule = {
      ...BGU_COMPUTER_SCIENCE_RULE_CAPTURE,
      psycho_sekem: BGU_COMPUTER_SCIENCE_RULE_CAPTURE.psycho_sekem + 1,
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ items: [changedRule] }));

    const result = await verifyBguComputerScienceFinalists({ finalists: [finalist], fetcher });

    expect(result).toEqual([
      expect.objectContaining({ status: 'unavailable', reason: 'official_source_drift' }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit after a source timeout and withholds later finalists', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout'));
    const circuit = createBguFinalistCircuit(1);

    const result = await verifyBguComputerScienceFinalists({
      finalists: [finalist, { ...finalist, id: 'candidate-2' }],
      fetcher,
      circuit,
    });

    expect(result).toEqual([
      expect.objectContaining({ id: 'candidate-1', reason: 'official_source_unavailable' }),
      expect.objectContaining({ id: 'candidate-2', reason: 'circuit_open' }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('withholds the batch when its reviewed fixture artifact no longer matches', async () => {
    const fetcher = vi.fn<typeof fetch>();

    const result = await verifyBguComputerScienceFinalists({
      finalists: [finalist],
      fetcher,
      verificationArtifactCurrent: () => false,
    });

    expect(result).toEqual([
      expect.objectContaining({ status: 'unavailable', reason: 'fixture_mismatch' }),
    ]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

function successfulFetcher(score: number) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(jsonResponse({ items: [BGU_COMPUTER_SCIENCE_RULE_CAPTURE] }))
    .mockResolvedValueOnce(
      new Response(
        `<script>parent.main.document.getElementById("on_c_val").innerHTML = ${score};</script>`,
        { status: 200 },
      ),
    );
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
