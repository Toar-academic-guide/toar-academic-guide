import { describe, expect, it } from 'vitest';
import official from '../../../docs/admissions-verification/2026-09-27-bgu-social-sciences-official.json';
import { runBguAdmissionsProof } from '../ingestion/adapters/bguAdmissions';
import { getBguProgramVerificationMetadata } from '@/data/admissions/bguProgramVerification';
import { resolveBguSocialScienceAdmission } from './bguSocialSciencePolicy';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import { runBguSocialScienceProof } from '../ingestion/adapters/bguSocialScience';

const common = {
  bguSocialScienceRequirementsConfirmed: true,
  bguSocialScienceLanguageConfirmed: true,
  bguReturningFromStudyBreak: false,
  bguSocialWorkAcademicBackground: 'none' as const,
};

describe('published BGU social science routes', () => {
  for (const programme of official.programmes) {
    for (const capture of programme.calculatorCaptures) {
      it(`${capture.pairId} P${capture.input.psychometric} obeys the published score/psychometric operator`, async () => {
        const artifact = getBguProgramVerificationMetadata(capture.pairId)!;
        const extraInputs = {
          bguBagrutAverage: capture.input.bguBagrutAverage,
          bguSocialScienceRoute: 'score' as const,
          bguSocialScienceRequirementsConfirmed: true,
          bguSocialScienceLanguageConfirmed: true,
          bguReturningFromStudyBreak: false,
          bguSocialWorkAcademicBackground: 'none' as const,
        };
        const proof = await runBguAdmissionsProof({
          program: {
            id: artifact.contract.programId,
            pairId: capture.pairId,
            name: programme.programme,
            externalId: artifact.contract.officialProgramId,
            searchText: artifact.contract.source.url,
          },
          applicant: {
            psychometric: capture.input.psychometric,
            bagrutAverage: capture.input.bguBagrutAverage,
            extraInputs,
          },
          fetcher: async (url) =>
            String(url).includes('GetRdpData')
              ? new Response(JSON.stringify(programme.payload))
              : new Response(capture.rawResponse),
        });
        expect(proof.normalizedPayload.derivedVerdict).toBe(capture.expectedNumericRouteVerdict);
      });
    }
  }
});

it.each([
  ['social_work', 108, 90],
  ['bgu_socialwork', 108, 90],
  ['communication', 98, 70],
  ['education', 96, 70],
  ['political_science', 100, 70],
] as const)('checks %s direct Bagrut and completed prep boundaries', (degreeId, bagrut, prep) => {
  for (const [average, kind] of [
    [bagrut, 'eligible'],
    [bagrut - 0.01, 'below'],
  ] as const)
    expect(
      resolveBguSocialScienceAdmission({
        degreeId,
        extraInputs: { ...common, bguSocialScienceRoute: 'bagrut', bguBagrutAverage: average },
      }).kind,
    ).toBe(kind);
  for (const [average, completed, kind] of [
    [prep, true, 'eligible'],
    [prep - 0.01, true, 'below'],
    [prep, false, 'below'],
  ] as const)
    expect(
      resolveBguSocialScienceAdmission({
        degreeId,
        extraInputs: {
          ...common,
          bguSocialScienceRoute: 'bagrut',
          bguPreparatoryTrack: 'natural_life_sciences',
          bguPreparatoryAverage: average,
          bguPreparatoryCompleted: completed,
        },
      }).kind,
    ).toBe(kind);
});

it.each(['education', 'political_science'])(
  'checks %s age 44/45 without dummy scores',
  (degreeId) => {
    for (const [age, kind] of [
      [44, 'below'],
      [45, 'eligible'],
    ] as const)
      expect(
        resolveBguSocialScienceAdmission({
          degreeId,
          extraInputs: { ...common, bguSocialScienceRoute: 'age45', bguApplicantAge: age },
        }),
      ).toMatchObject({ kind, route: 'age45', score: age });
  },
);

it('uses the September Education English exception only for its published inputs', () => {
  const extraInputs: AdmissionsExtraInputs = {
    ...common,
    bguSocialScienceRoute: 'education_conditional',
    bguBagrutAverage: 96,
    bguHebrewRequirementsConfirmed: true,
    bguEnglishClassificationMissing: true,
    bguEducationEnglishConditionAcknowledged: true,
    bguEducationSecondDepartment: 'art',
    englishUnits: 5,
    englishGrade: 80,
  };
  expect(resolveBguSocialScienceAdmission({ degreeId: 'education', extraInputs }).kind).toBe(
    'eligible',
  );
  for (const extra of [
    { englishGrade: 79 },
    { englishUnits: 4 },
    { bguEducationSecondDepartment: 'other' as const },
    { bguHebrewRequirementsConfirmed: false },
    { bguEducationEnglishConditionAcknowledged: false },
    { bguEnglishClassificationMissing: false },
  ])
    expect(
      resolveBguSocialScienceAdmission({
        degreeId: 'education',
        extraInputs: { ...extraInputs, ...extra },
      }).kind,
    ).toBe('below');
  expect(
    resolveBguSocialScienceAdmission({ degreeId: 'political_science', extraInputs }).kind,
  ).toBe('below');
  expect(
    resolveBguSocialScienceAdmission({
      degreeId: 'education',
      extraInputs: { ...extraInputs, englishUnits: undefined },
    }),
  ).toMatchObject({ kind: 'needs_input', requiredInputs: ['english_units'] });
});

it('asks for unknown gates and preserves academic committee decisions', () => {
  expect(
    resolveBguSocialScienceAdmission({ degreeId: 'social_work', psychometric: 800 }).kind,
  ).toBe('needs_input');
  expect(
    resolveBguSocialScienceAdmission({
      degreeId: 'social_work',
      psychometric: 800,
      extraInputs: { ...common, bguSocialScienceLanguageConfirmed: false },
    }),
  ).toMatchObject({ kind: 'below', reason: expect.stringContaining('ו׳') });
  for (const background of ['other', 'social_work'] as const)
    expect(
      resolveBguSocialScienceAdmission({
        degreeId: 'social_work',
        psychometric: 800,
        extraInputs: {
          ...common,
          bguSocialWorkAcademicBackground: background,
          bguSocialWorkAcademicAverage: 85,
          bguSocialWorkTranscriptProvided: false,
        },
      }).kind,
    ).toBe('manual_gate');
  expect(
    resolveBguSocialScienceAdmission({
      degreeId: 'social_work',
      psychometric: 800,
      extraInputs: {
        ...common,
        bguSocialWorkAcademicBackground: 'social_work',
        bguSocialWorkAcademicAverage: 84.99,
      },
    }).kind,
  ).toBe('below');
  expect(
    resolveBguSocialScienceAdmission({
      degreeId: 'communication',
      psychometric: 800,
      extraInputs: { ...common, bguReturningFromStudyBreak: true },
    }).kind,
  ).toBe('manual_gate');
  expect(
    resolveBguSocialScienceAdmission({
      degreeId: 'education',
      extraInputs: {
        ...common,
        bguSocialScienceRoute: 'bagrut',
        bguPreparatoryAverage: 70,
        bguPreparatoryCompleted: true,
      },
    }),
  ).toMatchObject({ kind: 'needs_input', requiredInputs: ['bgu_preparatory_track'] });
});

it('blocks duplicate or changed programme conditions and ambiguous scores', async () => {
  const source = official.programmes[0];
  const artifact = getBguProgramVerificationMetadata('social_work__bgu')!;
  for (const [payload, scoreResponse] of [
    [{ ...source.payload, items: [source.payload.items[0], source.payload.items[0]] }, ''],
    [{ ...source.payload, items: [{ ...source.payload.items[0], psycho_value: 551 }] }, ''],
    [source.payload, 'mainForm.on_final_sekem.value = 601; mainForm.on_final_sekem.value = 600;'],
    [source.payload, `mainForm.on_final_sekem.value = ${'9'.repeat(400)};`],
  ] as const) {
    const proof = await runBguSocialScienceProof({
      program: {
        id: 'social_work',
        pairId: 'social_work__bgu',
        name: 'Social Work',
        externalId: artifact.contract.officialProgramId,
        searchText: artifact.contract.source.url,
      },
      applicant: {
        psychometric: 550,
        extraInputs: { ...common, bguSocialScienceRoute: 'score', bguBagrutAverage: 100 },
      },
      fetcher: async (url) =>
        new Response(String(url).includes('GetRdpData') ? JSON.stringify(payload) : scoreResponse),
    });
    expect(proof.capability).toBe('blocked');
  }
});
