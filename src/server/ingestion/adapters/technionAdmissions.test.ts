import { describe, expect, it, vi } from 'vitest';

import {
  hasTechnionRequiredSubjectRecord,
  parseTechnionOfficialThreshold,
  runTechnionAdmissionsProof,
} from './technionAdmissions';

const record = {
  schemaVersion: 1 as const,
  sector: 'jewish' as const,
  subjects: [
    { subjectId: 'english', units: 5, grade: 91 },
    { subjectId: 'literature', units: 2, grade: 82 },
    { subjectId: 'mathematics', units: 5, grade: 93 },
    { subjectId: 'bible', units: 2, grade: 84 },
    { subjectId: 'civics', units: 2, grade: 85 },
    { subjectId: 'hebrew_expression', units: 2, grade: 86 },
    { subjectId: 'history', units: 2, grade: 87 },
    { subjectId: 'hebrew', units: 2, grade: 88 },
  ],
};

describe('runTechnionAdmissionsProof', () => {
  it('requires the full transcript that the official calculator asks for', () => {
    expect(hasTechnionRequiredSubjectRecord(record)).toBe(true);
    expect(
      hasTechnionRequiredSubjectRecord({ ...record, subjects: record.subjects.slice(1) }),
    ).toBe(false);
  });

  it('submits actual structured subject units and grades to the official calculator', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('הסכם לדיוני הקבלה הוא:92.3', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('<tr><td class="column-1">מדעי המחשב</td><td class="column-2">91</td></tr>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      );

    const proof = await runTechnionAdmissionsProof({
      fetcher,
      applicant: { bagrutAverage: 110, bagrutSubjectRecord: record, psychometric: 700 },
      program: { id: 'cs', name: 'Computer Science', externalId: '91' },
    });

    const body = Object.fromEntries(
      new URLSearchParams(String(fetcher.mock.calls[0]?.[1]?.body)).entries(),
    );
    expect(body).toMatchObject({
      english: '91',
      hebrew_lit: '82',
      mathematic: '93',
      bible: '84',
      ezrahut: '85',
      habaa: '86',
      history: '87',
      hebrew: '88',
    });
    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: 92.3,
      derivedVerdict: 'accepted',
      decisionProvenance: 'verified_derivation',
    });
  });

  it('reads the current cutoff from the official programme table rather than local metadata', () => {
    expect(
      parseTechnionOfficialThreshold(
        '<tr><td class="column-1">הנדסת חשמל</td><td class="column-2">94</td></tr>',
        'technion_ee',
      ),
    ).toBe(94);
  });
});
