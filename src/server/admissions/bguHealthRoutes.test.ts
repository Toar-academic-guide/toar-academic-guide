import { expect, it, vi } from 'vitest';
import official from '../../../docs/admissions-verification/2026-09-28-bgu-health-official.json';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import { runBguAdmissionsProof } from '../ingestion/adapters/bguAdmissions';
import { runBguHealthProof } from '../ingestion/adapters/bguHealth';
import { resolveBguHealthAdmission } from './bguHealthPolicy';
import { BGU_HEALTH_CONFIG } from '@/data/admissions/bguHealthVerification';

it.each(['occupational_therapy', 'physiotherapy'] as const)(
  '%s requires the psychometric minimum even when the general score is high',
  async (programId) => {
    const evidence = official.programmes[programId];
    const fixture = official.captures.find(
      (x) => x.pairId === `${programId}__bgu` && x.kind === 'below',
    )!;
    const { psychometric, bagrut, ...extraInputs } = fixture.input;
    const proof = await runBguAdmissionsProof({
      program: {
        id: programId,
        pairId: `${programId}__bgu`,
        externalId: `inst0-dep${evidence.officialRule.department}-pat1-degree1`,
        name: evidence.officialRule.department_dsc,
        searchText: evidence.rulesUrl,
      },
      applicant: {
        psychometric,
        bagrutAverage: bagrut,
        extraInputs: extraInputs as AdmissionsExtraInputs,
      },
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(evidence.rawRuleResponse))
        .mockResolvedValueOnce(new Response(fixture.rawResponse)),
    });
    expect(proof.normalizedPayload.selectedScore).toBe(fixture.score);
    expect(proof.normalizedPayload.derivedVerdict).toBe('below');
  },
);

it.each([...official.captures, ...official.additionalCaptures])(
  'replays $pairId $kind with the official BGU average',
  async (fixture) => {
    const programId = fixture.pairId.split('__')[0] as keyof typeof BGU_HEALTH_CONFIG;
    const config = BGU_HEALTH_CONFIG[programId];
    const { psychometric, bagrut: _bagrut, ...extraInputs } = fixture.input;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(official.programmes[programId].rawRuleResponse))
      .mockResolvedValueOnce(new Response(fixture.rawResponse));
    const proof = await runBguHealthProof({
      program: {
        id: programId,
        pairId: fixture.pairId,
        name: config.name,
        externalId: config.officialProgramId,
        searchText: config.url,
      },
      applicant: {
        psychometric,
        bagrutAverage: 99,
        extraInputs: extraInputs as AdmissionsExtraInputs,
      },
      fetcher,
    });
    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: fixture.score,
      derivedVerdict: fixture.expectedVerdict,
      registrationClosed: true,
      admissionStage: 'interview_consideration',
    });
    expect(
      new URLSearchParams(String(fetcher.mock.calls[1][1]?.body)).get('on_bagrut_average'),
    ).toBe(extraInputs.bguBagrutAverage.toFixed(2));
  },
);

const academic = {
  degreeId: 'occupational_therapy',
  extraInputs: {
    bguOccupationalTherapyRequirementsConfirmed: true,
    bguOccupationalTherapyRoute: 'academic' as const,
    bguBachelorsDegreeCompleted: true,
  },
};
it.each([
  [84.99, 'below'],
  [85, 'eligible'],
  [85.25, 'eligible'],
] as const)(
  'allows only degree-review eligibility at average %s without psychometric',
  async (average, kind) => {
    const input = {
      ...academic,
      extraInputs: { ...academic.extraInputs, bguBachelorsDegreeAverage: average },
    };
    expect(resolveBguHealthAdmission(input)).toMatchObject({
      kind,
      score: average,
      threshold: 85,
      route: 'academic',
    });
    const config = BGU_HEALTH_CONFIG.occupational_therapy;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(official.programmes.occupational_therapy.rawRuleResponse),
      );
    const proof = await runBguHealthProof({
      program: {
        id: 'occupational_therapy',
        pairId: 'occupational_therapy__bgu',
        name: config.name,
        searchText: config.url,
        externalId: config.officialProgramId,
      },
      applicant: { extraInputs: input.extraInputs },
      fetcher,
    });
    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: average,
      derivedVerdict: kind === 'eligible' ? 'eligible_to_apply' : 'below',
      admissionStage: 'department_review',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it('keeps unknown inputs distinct from explicit unmet conditions', () => {
  expect(resolveBguHealthAdmission({ degreeId: 'physiotherapy' })).toMatchObject({
    kind: 'needs_input',
    requiredInputs: ['bgu_physiotherapy_requirements'],
  });
  expect(
    resolveBguHealthAdmission({
      ...academic,
      extraInputs: {
        ...academic.extraInputs,
        bguBachelorsDegreeCompleted: undefined,
        bguBachelorsDegreeAverage: 85,
      },
    }),
  ).toMatchObject({ kind: 'needs_input', requiredInputs: ['bgu_bachelors_degree_completed'] });
  expect(
    resolveBguHealthAdmission({
      ...academic,
      extraInputs: {
        ...academic.extraInputs,
        bguBachelorsDegreeCompleted: false,
        bguBachelorsDegreeAverage: 99,
      },
    }).kind,
  ).toBe('below');
  expect(
    resolveBguHealthAdmission({
      degreeId: 'physiotherapy',
      psychometric: 800,
      extraInputs: { bguPhysiotherapyRequirementsConfirmed: false, bguBagrutAverage: 120 },
    }).kind,
  ).toBe('below');
  expect(
    resolveBguHealthAdmission({
      degreeId: 'occupational_therapy',
      psychometric: 600,
      extraInputs: { bguOccupationalTherapyRequirementsConfirmed: true, bguBagrutAverage: 110 },
    }),
  ).toMatchObject({
    kind: 'needs_input',
    requiredInputs: ['bgu_occupational_therapy_exam_session'],
  });
});
it('keeps late OT exams conditional on available places', () => {
  for (const session of ['july_psychometric', 'spring_nativ'] as const) {
    expect(
      resolveBguHealthAdmission(
        {
          degreeId: 'occupational_therapy',
          psychometric: 600,
          extraInputs: {
            bguOccupationalTherapyRequirementsConfirmed: true,
            bguBagrutAverage: 110,
            bguOccupationalTherapyExamSession: session,
          },
        },
        691,
      ),
    ).toMatchObject({ kind: 'eligible', reason: expect.stringContaining('מקום פנוי בלבד') });
  }
});
it('withholds decisions for changed, duplicate or wrongly mapped official rules and ambiguous scores', async () => {
  const config = BGU_HEALTH_CONFIG.physiotherapy;
  const program = {
    id: 'physiotherapy',
    pairId: 'physiotherapy__bgu',
    name: config.name,
    externalId: config.officialProgramId,
    searchText: config.url,
  };
  const applicant = {
    psychometric: 667,
    extraInputs: { bguPhysiotherapyRequirementsConfirmed: true, bguBagrutAverage: 110 },
  };
  const rule = official.programmes.physiotherapy.officialRule;
  for (const items of [
    [{ ...rule, psycho_value: 668 }],
    [rule, rule],
    [{ ...rule, department: 486 }],
    [{ ...rule, comments: rule.comments + ' changed' }],
  ]) {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items })));
    const proof = await runBguHealthProof({ program, applicant, fetcher });
    expect(proof.capability).toBe('blocked');
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
  const proof = await runBguHealthProof({
    program,
    applicant,
    fetcher: vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(official.programmes.physiotherapy.rawRuleResponse))
      .mockResolvedValueOnce(
        new Response('mainForm.on_final_sekem.value = 733; mainForm.on_final_sekem.value = 732;'),
      ),
  });
  expect(proof.status).toBe('failed');
});
