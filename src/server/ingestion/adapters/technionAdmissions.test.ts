import { describe, expect, it, vi } from 'vitest';
import { architectureInputs, architectureSourceResponse } from '@/test/technionArchitecture';
import { technionWinterThresholdsHtml } from '@/test/technionWinterThresholds';

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
  it('fails Architecture when the calculator index returns HTTP 404', async () => {
    const proof = await runTechnionAdmissionsProof({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('missing', { status: 404 })),
      program: { id: 'architecture', name: 'Architecture' },
      applicant: { bagrutAverage: 100, psychometric: 730, extraInputs: architectureInputs },
    });
    expect(proof).toMatchObject({ status: 'failed', capability: 'blocked' });
    expect(proof.publicationCutoff).toBeUndefined();
  });
  it.each([
    ['HTTP 404', new Response('missing', { status: 404 })],
    ['empty body', new Response('')],
    [
      'malformed row',
      new Response(
        '<h2>חורף תשפ״ז</h2><table id="tablepress-485"><tr><td class="column-1">הנדסה אזרחית</td><td class="column-2"></td></tr><tr><td class="column-1">הנדסת חשמל</td><td class="column-2">87</td></tr></table>',
      ),
    ],
    ['calculator only', new Response('הסכם לדיוני הקבלה הוא:87')],
  ])('does not publish civil from %s threshold proof', async (_case, thresholdResponse) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('הסכם לדיוני הקבלה הוא:92.3'))
      .mockResolvedValueOnce(thresholdResponse);
    const proof = await runTechnionAdmissionsProof({
      fetcher,
      applicant: { bagrutAverage: 110, bagrutSubjectRecord: record, psychometric: 700 },
      program: {
        id: 'technion_civil',
        name: 'Civil Engineering',
        targetId: 'technion-technion_civil-live',
      },
    });
    expect(proof.publicationCutoff).toBeUndefined();
    expect(proof.capability).not.toBe('decision_capable');
  });

  it('keeps an unreviewed civil table number out of publication but accepts reviewed winter EE', async () => {
    const civil = await runTechnionAdmissionsProof({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('הסכם לדיוני הקבלה הוא:92.3'))
        .mockResolvedValueOnce(
          new Response(
            technionWinterThresholdsHtml.replace(
              /<\/tbody><\/table>\s*$/,
              '<tr><td class="column-1">הנדסה אזרחית</td><td class="column-2">87</td></tr></tbody></table>',
            ),
          ),
        ),
      applicant: { bagrutAverage: 110, bagrutSubjectRecord: record, psychometric: 700 },
      program: { id: 'technion_civil', name: 'Civil Engineering' },
    });
    expect(civil.capability).toBe('decision_capable');
    expect(civil.publicationCutoff).toBeUndefined();

    const ee = await runTechnionAdmissionsProof({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('הסכם לדיוני הקבלה הוא:92.3'))
        .mockResolvedValueOnce(new Response(technionWinterThresholdsHtml)),
      applicant: { bagrutAverage: 110, bagrutSubjectRecord: record, psychometric: 700 },
      program: { id: 'ee', name: 'Electrical Engineering' },
    });
    expect(ee.publicationCutoff).toMatchObject({
      value: 91.5,
      cycle: '2027',
      route: 'main',
      metric: 'sekhem',
    });
  });
  it('does not publish a numerically unchanged winter row with added route conditions', async () => {
    const proof = await runTechnionAdmissionsProof({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('הסכם לדיוני הקבלה הוא:92.3'))
        .mockResolvedValueOnce(
          new Response(
            technionWinterThresholdsHtml.replace('>91.5</td>', '>91.5 על בסיס ראיון</td>'),
          ),
        ),
      applicant: { bagrutAverage: 110, bagrutSubjectRecord: record, psychometric: 700 },
      program: { id: 'ee', name: 'Electrical Engineering' },
    });
    expect(proof.publicationCutoff).toBeUndefined();
  });
  it.each([
    ['/calculator/', '0.3*', '0.4*'],
    ['/calculator/', '"rounding":"1"', '"rounding":"2"'],
    ['/sechem-for-admission/', '>85 ', '>86 '],
    ['/architecture-info/', 'ציון 65', 'ציון 75'],
    ['/english-exam/', '104', '105'],
  ])(
    'withholds an Architecture result when the official source changes: %s',
    async (path, before, after) => {
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
        const page = architectureSourceResponse(String(url));
        return new Response(String(url).includes(path) ? page.replace(before, after) : page);
      });
      const proof = await runTechnionAdmissionsProof({
        fetcher,
        program: { id: 'architecture', name: 'Architecture' },
        applicant: { bagrutAverage: 100, psychometric: 730, extraInputs: architectureInputs },
      });
      expect(proof).toMatchObject({
        status: 'failed',
        proofLevel: 'blocked',
        normalizedPayload: {},
      });
    },
  );

  it('does not mistake Landscape Architecture for Architecture in the cutoff table', () => {
    expect(
      parseTechnionOfficialThreshold(
        '<table id="tablepress-485"><tr><td class="column-1">ארכיטקטורה נוף</td><td class="column-2">80</td></tr><tr><td class="column-1">ארכיטקטורה*</td><td class="column-2">85</td></tr></table>',
        'architecture',
      ),
    ).toBe(85);
  });
  it.each([
    [115, 730, 110, 97.5, 'eligible_to_apply'],
    [101.9, 650, 80, 82.6, 'below'],
  ])(
    'reproduces the Architecture score and conditional verdict for D=%s',
    async (average, psy, exam, score, verdict) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(async (url) => new Response(architectureSourceResponse(String(url))));
      const proof = await runTechnionAdmissionsProof({
        fetcher,
        program: {
          id: 'architecture',
          name: 'Architecture',
          targetId: 'technion-architecture-live',
        },
        applicant: {
          bagrutAverage: 100,
          psychometric: Number(psy),
          extraInputs: {
            technionArchitectureBagrutAverage: Number(average),
            technionArchitectureExamScore: Number(exam),
            technionArchitectureExamPassed: true,
            technionArchitectureRequirementsConfirmed: true,
          },
        },
      });
      expect(proof.normalizedPayload).toMatchObject({
        selectedScore: score,
        acceptanceThreshold: 85,
        derivedVerdict: verdict,
        decisionProvenance: 'verified_derivation',
        proofLevel: 'exact_official',
      });
    },
  );

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
        new Response(
          '<table id="tablepress-485"><tr><td class="column-1">מדעי המחשב</td><td class="column-2">91</td></tr></table>',
          {
            status: 200,
            headers: { 'content-type': 'text/html' },
          },
        ),
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
    // Changed per Jorje's CEO ruling 2026-10-25 01:46: winter tablepress-485 sets EE to 91.5; spring 94 is place-dependent.
    // Official winter table: https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/
    expect(
      parseTechnionOfficialThreshold(
        '<table id="tablepress-485"><tr><td class="column-1">הנדסת חשמל</td><td class="column-2">91.5</td></tr></table>',
        'technion_ee',
      ),
    ).toBe(91.5);
  });
});
