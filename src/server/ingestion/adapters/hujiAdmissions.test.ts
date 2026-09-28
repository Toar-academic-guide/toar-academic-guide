import { describe, expect, it, vi } from 'vitest';

import { runHujiAdmissionsProof } from './hujiAdmissions';

import official from '../../../../docs/admissions-verification/2026-09-28-huji-medicine-official.json';
import { HUJI_MEDICINE_ELIGIBLE_INPUTS } from '@/data/admissions/hujiMedicineVerification';
const medicineHtml = official.calculatorHtml;

describe('runHujiAdmissionsProof', () => {
  it('replays a confirmed converted external preparatory grade after 2022', async () => {
    const proof = await runHujiAdmissionsProof({
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(medicineHtml)),
      applicant: {
        bagrutAverage: 0,
        psychometric: 800,
        extraInputs: {
          ...HUJI_MEDICINE_ELIGIBLE_INPUTS,
          hujiMedicineRoute: 'other_preparatory',
          hujiMedicinePreparatoryAverage: 110,
          hujiMedicinePreparatoryYear: 2023,
          hujiMedicinePreparatoryEligible: true,
          hujiMedicinePreparatoryConversionConfirmed: true,
        },
      },
      program: { id: 'medicine', name: 'Medicine', externalId: '601-4601' },
    });
    expect(proof).toMatchObject({
      status: 'succeeded',
      normalizedPayload: {
        cognitiveScore: 28.603,
        selectedScore: 26.885,
        derivedVerdict: 'eligible_to_apply',
      },
    });
  });
  it('reproduces the current Medicine final score instead of accepting a generic academic score', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(medicineHtml));
    const extraInputs = {
      hujiMedicineAffirmativeAction: 'standard' as const,
      hujiMedicineRoute: 'bagrut' as const,
      hujiBagrutAverage: 120,
      hujiMedicineAssessmentScore: 200,
      hujiMedicineAssessmentYear: 2026,
      hujiMedicinePsychometricDate: '2026-04-01',
      hujiMedicineEnglishBasis: 'score' as const,
      hujiMedicineEnglishScore: 120,
      hujiMedicineHebrewBasis: 'hebrew_school' as const,
      hujiMedicineResidencyEligible: true,
      hujiMedicineQualificationConfirmed: true,
      hujiMedicinePriorStudyStatus: 'none' as const,
      hujiMedicineRegistrationConfirmed: true,
    };
    const proof = await runHujiAdmissionsProof({
      fetcher,
      applicant: { bagrutAverage: 0, psychometric: 800, extraInputs },
      program: { id: 'medicine', name: 'Medicine', externalId: '601-4601' },
    });
    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: 26.612,
      cognitiveScore: 27.921,
      acceptanceThreshold: 25.783,
      derivedVerdict: 'eligible_to_apply',
      medicineStage: 'final',
    });
    expect(fetcher.mock.calls[0][0]).toBe('https://www.huji.ac.il/documents/medicine_calc.htm');
  });
  it.each(['huji_medicine', 'medicine'])('replays %s with a valid ordinary track', async (id) => {
    const proof = await runHujiAdmissionsProof({
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(medicineHtml)),
      applicant: {
        bagrutAverage: 0,
        psychometric: 800,
        extraInputs: HUJI_MEDICINE_ELIGIBLE_INPUTS,
      },
      program: { id, name: id, externalId: '601-4601' },
    });
    expect(proof).toMatchObject({
      status: 'succeeded',
      sourceClass: 'official_html',
      normalizedPayload: {
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        derivedVerdict: 'eligible_to_apply',
      },
    });
  });
  it.each([
    medicineHtml.replace('0.0290', '0.0286'),
    medicineHtml.replace('2026-2027', '2025-2026'),
    '<html>service error</html>',
  ])('withholds a stale or unavailable source', async (html) => {
    const proof = await runHujiAdmissionsProof({
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(html)),
      applicant: {
        bagrutAverage: 120,
        psychometric: 800,
        extraInputs: HUJI_MEDICINE_ELIGIBLE_INPUTS,
      },
      program: { id: 'medicine', name: 'Medicine', externalId: '601-4601' },
    });
    expect(proof).toMatchObject({ status: 'failed', normalizedPayload: {} });
  });
  it('withholds a changed preparatory coefficient even when the bagrut formula is unchanged', async () => {
    const html = medicineHtml.replace(
      /(function med_meshuklal_func_c[\s\S]*?)0\.032073/,
      '$10.032074',
    );
    expect(html).not.toBe(medicineHtml);
    const proof = await runHujiAdmissionsProof({
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(html)),
      applicant: {
        bagrutAverage: 0,
        psychometric: 800,
        extraInputs: HUJI_MEDICINE_ELIGIBLE_INPUTS,
      },
      program: { id: 'medicine', name: 'Medicine', externalId: '601-4601' },
    });
    expect(proof).toMatchObject({ status: 'failed', normalizedPayload: {} });
  });
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
      publicationMetric: 'formula_score',
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
