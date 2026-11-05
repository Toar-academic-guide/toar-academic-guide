import { expect, it, vi } from 'vitest';
import { runHujiAdmissionsProof } from './hujiAdmissions';
import { evaluateFreshnessDiscovery } from '../freshnessDiscovery';

// Minimal law extract from the official 2026-10-26 HUJI capture, track 401-4100.
const lawFeed = {
  hogimInfoObj: [{ track_number: '401-4100', hog_regType: 1 }],
  currentYearObj: [
    {
      track_number: '401-4100',
      safAccept: '22.7',
      safReject: '22.7',
      direct_pet: '725',
      direct_pet_kidum: '690',
      direct_30: '',
    },
  ],
  formulasObj: [
    {
      formula_type: 1,
      formula_pet: '0.01992054',
      formula_avg: '0.24614193',
      formula_minus: '16.993402399',
    },
  ],
};

it('preserves the origin/main law normalized fingerprint and payload keys', async () => {
  const proof = await runHujiAdmissionsProof({
    fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(lawFeed))),
    applicant: { bagrutAverage: 90, psychometric: 660 },
    program: { id: 'law', name: 'משפטים', externalId: '401-4100' },
  });
  expect(proof.status).toBe('succeeded');
  const freshness = evaluateFreshnessDiscovery({
    id: proof.id,
    sourceClass: 'api_static_json',
    body: proof.normalizedPayload,
    previousNormalizedFingerprint:
      '5a824c846b2b60579504564b7f029229b4c2a3ce0cc2cb37ee6422b8e9df6ba3',
  });
  // Computed by running this fixture through origin/main (1962d1f), not inferred.
  expect(freshness.normalizedFingerprint).toBe(
    '5a824c846b2b60579504564b7f029229b4c2a3ce0cc2cb37ee6422b8e9df6ba3',
  );
  expect(freshness.status).toBe('fresh');
  expect(freshness.reviewWorthy).toBe(false);
  expect(Object.keys(proof.normalizedPayload).sort()).toEqual([
    'acceptanceThreshold',
    'decisionProvenance',
    'derivedVerdict',
    'formulaType',
    'pairId',
    'programId',
    'programName',
    'proofLevel',
    'proofStatus',
    'publicationMetric',
    'rejectionThreshold',
    'selectedScore',
    'source',
    'sourceFingerprint',
    'trackNumber',
  ]);
});
