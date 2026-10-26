import { describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import feed from '@/test/fixtures/hujiPsychology2027.json';
import { runHujiAdmissionsProof } from './hujiAdmissions';

async function proofFor(
  values: Record<string, unknown>,
  trackNumber = '300-7000',
  programId = 'huji_psychology',
) {
  const source = structuredClone(feed);
  Object.assign(
    source.currentYearObj.find((row) => row.track_number === trackNumber)!,
    values,
  );
  return runHujiAdmissionsProof({
    fetcher: vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(gzipSync(JSON.stringify(source)))),
    applicant: { bagrutAverage: 90, psychometric: 660 },
    program: { id: programId, name: 'פסיכולוגיה', externalId: trackNumber },
  });
}

describe('HUJI psychology feed direct thresholds', () => {
  it.each(['300-7000', '300-7009'])(
    'parses the captured direct thresholds for %s without changing sekem',
    async (trackNumber) => {
      const proof = await proofFor({}, trackNumber);
      expect(proof).toMatchObject({
        status: 'succeeded',
        normalizedPayload: {
          directPsychometric: 725,
          directPsychometricKidum: 690,
          directPsychometric30Plus: 673,
          acceptanceThreshold: 22.5,
          rejectionThreshold: 22.5,
          derivedVerdict: 'below',
        },
      });
      expect(proof.normalizedPayload.selectedScore).toBeCloseTo(19.71195484, 8);
    },
  );

  it.each(['huji_psychology', 'psychology'])(
    'includes only defined direct fields for %s',
    async (id) => {
      const proof = await proofFor({ direct_30: undefined }, '300-7000', id);
      expect(proof.normalizedPayload).toMatchObject({
        directPsychometric: 725,
        directPsychometricKidum: 690,
      });
      expect(proof.normalizedPayload).not.toHaveProperty('directPsychometric30Plus');
    },
  );

  it('accepts numeric feed values too', async () => {
    expect(
      (await proofFor({ direct_pet: 730, direct_pet_kidum: 695, direct_30: 675 }))
        .normalizedPayload,
    ).toMatchObject({
      directPsychometric: 730,
      directPsychometricKidum: 695,
      directPsychometric30Plus: 675,
    });
  });

  it.each([
    undefined,
    null,
    '',
    '  ',
    'not a score',
    '725 points',
    'Infinity',
    Infinity,
    NaN,
    true,
    {},
    [],
    0,
    -1,
    801,
    724.5,
  ])('omits invalid or missing direct thresholds: %j', async (value) => {
    const proof = await proofFor({ direct_pet: value, direct_pet_kidum: value, direct_30: value });
    expect(proof.status).toBe('succeeded');
    for (const key of [
      'directPsychometric',
      'directPsychometricKidum',
      'directPsychometric30Plus',
    ]) {
      expect(proof.normalizedPayload).not.toHaveProperty(key); // Approved test update, Jorje 2026-10-26
    }
    expect(proof.normalizedPayload.acceptanceThreshold).toBe(22.5);
  });
});
