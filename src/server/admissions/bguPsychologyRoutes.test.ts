import { describe, expect, it, vi } from 'vitest';
import official from '../../../docs/admissions-verification/2026-09-27-bgu-psychology-official.json';
import { runBguAdmissionsProof } from '../ingestion/adapters/bguAdmissions';

describe('BGU main-campus Psychology', () => {
  it('does not accept a score of 662 with psychometric 649 using the Eilat cutoff', async () => {
    const proof = await runBguAdmissionsProof({
      program: {
        id: 'bgu_psychology',
        pairId: 'bgu_psychology__bgu',
        externalId: 'inst0-dep101-pat2-degree1',
        name: 'Psychology',
        searchText: official.rulesUrl,
      },
      applicant: {
        psychometric: 649,
        bagrutAverage: 100,
        extraInputs: {
          bguBagrutAverage: 100,
          bguLanguageRequirementsConfirmed: true,
          bguPsychologyRequirementsConfirmed: true,
          bguPsychologyRoute: 'score',
        },
      },
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(JSON.stringify({ items: [official.officialRule] })))
        .mockResolvedValueOnce(
          new Response(
            '<script>parent.main.document.mainForm.on_final_sekem.value = 662;</script>',
          ),
        ),
    });
    expect(proof.normalizedPayload.derivedVerdict).toBe('below');
  });
});

import { runBguPsychologyProof } from '../ingestion/adapters/bguPsychology';
import { resolveBguPsychologyAdmission } from './bguPsychologyPolicy';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';

const common = { bguLanguageRequirementsConfirmed: true, bguPsychologyRequirementsConfirmed: true };
function psychologyFetcher(score = 663) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({ items: [official.officialRule] })))
    .mockResolvedValueOnce(
      new Response(
        `<script>parent.main.document.mainForm.on_final_sekem.value = ${score};</script>`,
      ),
    );
}
const psychologyProgram = {
  id: 'bgu_psychology',
  pairId: 'bgu_psychology__bgu',
  externalId: 'inst0-dep101-pat2-degree1',
  name: 'Psychology',
  searchText: official.rulesUrl,
};

it.each([
  [650, 663, 'eligible'],
  [649, 662, 'below'],
  [649, 680, 'eligible'],
  [650, 649, 'below'],
])('respects combined and score-only boundaries P%s score%s', (psychometric, score, kind) => {
  expect(
    resolveBguPsychologyAdmission(
      {
        degreeId: 'bgu_psychology',
        psychometric,
        extraInputs: { ...common, bguPsychologyRoute: 'score', bguBagrutAverage: 100 },
      },
      score,
    ),
  ).toMatchObject({ kind });
});

it.each<[number | undefined, AdmissionsExtraInputs, string, number]>([
  [680, { ...common, bguPsychologyRoute: 'psychometric' }, 'eligible_to_apply', 680],
  [
    undefined,
    { ...common, bguPsychologyRoute: 'bagrut', bguBagrutAverage: 113 },
    'eligible_to_apply',
    113,
  ],
  [
    undefined,
    {
      ...common,
      bguPsychologyRoute: 'bagrut',
      bguPreparatoryTrack: 'precise_sciences_engineering',
      bguPreparatoryAverage: 94,
      bguPreparatoryCompleted: true,
    },
    'eligible_to_apply',
    94,
  ],
  [
    undefined,
    {
      ...common,
      bguPsychologyRoute: 'bagrut',
      bguPreparatoryTrack: 'natural_life_sciences',
      bguPreparatoryAverage: 93.99,
      bguPreparatoryCompleted: true,
    },
    'below',
    93.99,
  ],
])(
  'does not invent general scores for a valid alternative route %#',
  async (psychometric, extraInputs, verdict, score) => {
    const fetcher = psychologyFetcher();
    const proof = await runBguPsychologyProof({
      program: psychologyProgram,
      applicant: { psychometric, extraInputs },
      fetcher,
    });
    expect(proof.normalizedPayload).toMatchObject({
      derivedVerdict: verdict,
      selectedScore: score,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

it('asks for the missing recognized prep track and completion', () => {
  expect(
    resolveBguPsychologyAdmission({
      degreeId: 'bgu_psychology',
      extraInputs: {
        ...common,
        bguPsychologyRoute: 'bagrut',
        bguPreparatoryAverage: 94,
        bguPreparatoryCompleted: true,
      },
    }),
  ).toMatchObject({ kind: 'needs_input', requiredInputs: ['bgu_preparatory_track'] });
  expect(
    resolveBguPsychologyAdmission({
      degreeId: 'bgu_psychology',
      extraInputs: {
        ...common,
        bguPsychologyRoute: 'bagrut',
        bguPreparatoryTrack: 'natural_life_sciences',
        bguPreparatoryAverage: 94,
      },
    }),
  ).toMatchObject({ kind: 'needs_input', requiredInputs: ['bgu_preparatory_completed'] });
});
it('does not accept incomplete prep or an unmet common language requirement', () => {
  expect(
    resolveBguPsychologyAdmission({
      degreeId: 'bgu_psychology',
      extraInputs: {
        ...common,
        bguPsychologyRoute: 'bagrut',
        bguPreparatoryTrack: 'natural_life_sciences',
        bguPreparatoryAverage: 95,
        bguPreparatoryCompleted: false,
      },
    }).kind,
  ).toBe('below');
  expect(
    resolveBguPsychologyAdmission({
      degreeId: 'bgu_psychology',
      psychometric: 800,
      extraInputs: { ...common, bguLanguageRequirementsConfirmed: false },
    }).kind,
  ).toBe('below');
});
it('blocks duplicate campuses and changed rules before using a score', async () => {
  for (const items of [
    [official.officialRule, official.officialRule],
    [{ ...official.officialRule, psycho_value: 651 }],
  ]) {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items })));
    const proof = await runBguPsychologyProof({
      program: psychologyProgram,
      applicant: {
        psychometric: 650,
        extraInputs: { ...common, bguBagrutAverage: 100, bguPsychologyRoute: 'score' },
      },
      fetcher,
    });
    expect(proof.capability).toBe('blocked');
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});
it('blocks ambiguous score responses', async () => {
  const fetcher = psychologyFetcher();
  // A duplicate assignment cannot be interpreted as the reviewed numeric score.
  fetcher
    .mockReset()
    .mockResolvedValueOnce(new Response(JSON.stringify({ items: [official.officialRule] })))
    .mockResolvedValueOnce(
      new Response('mainForm.on_final_sekem.value = 663; mainForm.on_final_sekem.value = 662;'),
    );
  const proof = await runBguPsychologyProof({
    program: psychologyProgram,
    applicant: {
      psychometric: 650,
      extraInputs: { ...common, bguBagrutAverage: 100, bguPsychologyRoute: 'score' },
    },
    fetcher,
  });
  expect(proof.status).toBe('failed');
});
