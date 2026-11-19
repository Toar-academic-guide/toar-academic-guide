import { describe, expect, it, vi } from 'vitest';
import { MEDICINE_ACADEMIC_REFERENCE_CASES as references } from '@/data/admissions/medicineAcademicVerification';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from './evaluator';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';

vi.mock('server-only', () => ({}));

const languages: AdmissionsExtraInputs = {
  medicineStage: 'academic',
  psychometricEnglish: 130,
  medicineHebrewBasis: 'hebrew_school',
  medicinePsychometricDate: '2025-12-01',
};
async function evaluate(
  id: 'tau' | 'bgu' | 'huji',
  psychometric = 750,
  extra: AdmissionsExtraInputs = {},
  fetcher = vi.fn<typeof fetch>(),
) {
  const program = getStaticCataloguePrograms().find((p) => p.id === `${id}_medicine`)!;
  const report = await evaluateAdmissionsForProgram({
    input: {
      degreeId: program.id,
      psychometric,
      extraInputs: { ...languages, bagrutSubjectRecord: references[id].record, ...extra },
    },
    program,
    institutions: getStaticCatalogueInstitutions(),
    freshnessStatesBySourceId: new Map(),
    fetcher,
  });
  return report.results.find((result) => result.linkedInstitutionId === id)!;
}
describe('medicine academic stage', () => {
  it('derives HUJI cognitive score from subjects, with no assessment input', async () => {
    const result = await evaluate('huji');
    expect(result).toMatchObject({
      stage: 'academic',
      admissionCycle: '2026-2027',
      score: 24.366,
      threshold: 25.186,
      decision: 'below',
      registrationStatus: 'closed',
    });
    expect(result.requiredInputs ?? []).not.toContain('huji_medicine_assessment_score');
  });
  it('keeps a calculable HUJI score when the language or exam date is missing', async () => {
    const result = await evaluate('huji', 800, {
      medicineHebrewBasis: undefined,
      medicinePsychometricDate: undefined,
    });
    expect(result.score).toBeTypeOf('number');
    expect(result.requiredInputs).toEqual(
      expect.arrayContaining(['medicine_hebrew_basis', 'medicine_psychometric_date']),
    );
  });
  it('requests actual subjects instead of using an entered HUJI average', async () => {
    const result = await evaluate('huji', 750, {
      bagrutSubjectRecord: undefined,
      hujiBagrutAverage: 120,
    });
    expect(result).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bagrut_subject_record'],
    });
    expect(result.score).toBeUndefined();
  });
  it('replays the capped TAU average through the medicine score field', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ data: { getLastScore: { body: { hatama_refua: 750.23 } } } }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            getProgramByIdAndLang: {
              nid: '8215',
              field_plain_id_programs: ['011167010000'],
              field_registration_comments: 'ציון התאמה רפואה ראשוני - 726.44',
              receipt_threshol: null,
              rejection_thresh: null,
            },
          },
        }),
      );
    const result = await evaluate('tau', 750, {}, fetcher);
    expect(result).toMatchObject({
      stage: 'academic',
      score: 750.23,
      threshold: 726.44,
      scoreAssessment: 'meets_threshold',
    });
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).variables.scoresData.bagrut).toBe(
      '117',
    );
  });
  it.each(references.bgu.boundaries)(
    'preserves BGU score $score and the independent floor at $psychometric',
    async ({ psychometric, score, meetsPsychometricFloor }) => {
      const record = structuredClone(references.bgu.record);
      record.subjects.forEach((s) => {
        s.grade = 100;
      });
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({
            items: [
              {
                psycho_sekem: 735,
                psycho_value: 680,
                psycho_and_or: 'ובנוסף',
                reg_status: 'סגורה',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          new Response(`parent.document.forms[0].on_final_sekem.value='${score}';`),
        );
      const result = await evaluate('bgu', psychometric, { bagrutSubjectRecord: record }, fetcher);
      expect(result).toMatchObject({
        stage: 'academic',
        score,
        threshold: 735,
        scoreAssessment: 'meets_threshold',
      });
      expect(result.additionalConditions).toContainEqual({
        id: 'psychometric_overall',
        label: 'פסיכומטרי 680 לפחות',
        status: meetsPsychometricFloor ? 'confirmed' : 'unmet',
      });
      expect(result.decision).toBe(meetsPsychometricFloor ? 'eligible_to_apply' : 'below');
    },
  );
  it('returns unavailable when official score replay fails', async () => {
    const result = await evaluate(
      'tau',
      750,
      {},
      vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
    );
    expect(result.kind).toBe('authority_unavailable');
    expect(result.score).toBeUndefined();
  });
});

it('requires the certificate language instead of assuming it from a non-Jewish sector', async () => {
  const record = structuredClone(references.huji.record);
  record.sector = 'samaritan';
  const missing = await evaluate('huji', 750, { bagrutSubjectRecord: record });
  expect(missing.requiredInputs).toEqual(['medicine_certificate_language']);
  expect(missing.score).toBeUndefined();
  const completed = await evaluate('huji', 750, {
    bagrutSubjectRecord: record,
    medicineCertificateLanguage: 'hebrew',
  });
  expect(completed.score).toBe(24.366);
});

it('does not invent a bonus for an unresolved legacy subject name', async () => {
  const { subjectIdForWizardLabel } = await import('@/utils/bagrutSubjectRecord');
  const record = structuredClone(references.huji.record);
  record.subjects.push({
    subjectId: subjectIdForWizardLabel('מערכות תקשורת'),
    units: 5,
    grade: 100,
    assessmentKind: 'exam',
  });
  const result = await evaluate('huji', 750, { bagrutSubjectRecord: record });
  expect(result.kind).toBe('authority_unavailable');
  expect(result.score).toBeUndefined();
});

it('requests a specific required subject and calculates after it is restored', async () => {
  const record = structuredClone(references.huji.record);
  record.subjects = record.subjects.filter((subject) => subject.subjectId !== 'civics');
  const result = await evaluate('huji', 750, { bagrutSubjectRecord: record });
  expect(result.requiredInputs).toEqual(['bagrut_subject:civics']);
  expect(result.score).toBeUndefined();
  expect((await evaluate('huji')).score).toBe(24.366);
});
