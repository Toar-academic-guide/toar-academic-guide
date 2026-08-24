import { describe, expect, it, vi } from 'vitest';

import { runHujiAdmissionsProof } from './hujiAdmissions';

describe('runHujiAdmissionsProof', () => {
  it('preserves the official waiting band as pending', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          hogimInfoObj: [{ track_number: '521-3010', hog_regType: 1 }],
          currentYearObj: [{ track_number: '521-3010', safAccept: 23.75, safReject: 23.5 }],
          formulasObj: [{ formula_type: 1, formula_pet: 0, formula_avg: 1, formula_minus: 0 }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const proof = await runHujiAdmissionsProof({
      fetcher,
      applicant: { bagrutAverage: 23.6, psychometric: 680 },
      program: { id: 'cs', name: 'Computer Science', externalId: '521-3010' },
    });

    expect(proof.normalizedPayload).toMatchObject({
      derivedVerdict: 'pending',
      decisionProvenance: 'verified_derivation',
    });
  });

  it('fails closed when the official response exceeds its compressed byte limit', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('x'.repeat(2 * 1024 * 1024 + 1), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const proof = await runHujiAdmissionsProof({
      fetcher,
      applicant: { bagrutAverage: 105, psychometric: 680 },
      program: {
        id: 'cs',
        name: 'Computer Science',
        externalId: '521-3010',
      },
    });

    expect(proof).toMatchObject({
      status: 'failed',
      capability: 'blocked',
      errorReason: expect.stringContaining('compressed limit'),
    });
  });
});
