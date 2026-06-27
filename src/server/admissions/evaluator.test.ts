import { describe, expect, it, vi } from 'vitest';

import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import { evaluateAdmissionsForProgram } from './evaluator';

vi.mock('server-only', () => ({}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(() => ({
    select: () => ({
      from: () => ({
        where: async () => [],
      }),
    }),
  })),
}));

const institutions: CatalogueInstitution[] = [
  {
    id: 'tau',
    name: 'אוניברסיטת תל אביב',
    region: 'center',
    domain: 'tau.ac.il',
    universityId: 'tau',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה 200-800',
      sekhemWeight: { psy: 0.6, bag: 0.4 },
    },
  },
  {
    id: 'haifa',
    name: 'אוניברסיטת חיפה',
    region: 'north',
    domain: 'haifa.ac.il',
    universityId: 'haifa',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה 200-800',
      sekhemWeight: { psy: 0.75, bag: 0.25 },
    },
  },
  {
    id: 'technion',
    name: 'הטכניון – מכון טכנולוגי לישראל',
    region: 'north',
    domain: 'technion.ac.il',
    universityId: 'technion',
    calculatorConfig: {
      formulaType: 'technion_linear',
      scaleDescription: 'סקאלה 0-100',
    },
  },
];

const tauDataScience: CatalogueProgram = {
  id: 'tau_datascience',
  name: 'מדעי הנתונים',
  institution: 'אוניברסיטת תל אביב',
  institutionId: 'tau',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 2, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 700 },
  linkedInstitutionIds: ['tau'],
};

const haifaCs: CatalogueProgram = {
  id: 'haifa_cs',
  name: 'מדעי המחשב',
  institution: 'אוניברסיטת חיפה',
  institutionId: 'haifa',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { haifa: 705 },
  linkedInstitutionIds: ['haifa'],
};

const technionCs: CatalogueProgram = {
  id: 'technion_cs',
  name: 'מדעי המחשב',
  institution: 'הטכניון – מכון טכנולוגי לישראל',
  institutionId: 'technion',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { technion: 90 },
  linkedInstitutionIds: ['technion'],
};

describe('evaluateAdmissionsForProgram', () => {
  it('returns needs-input for the Haifa exact path when subscores are missing', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'haifa_cs',
        psychometric: 680,
        bagrut: 105,
      },
      program: haifaCs,
      institutions,
    });

    expect(report.results).toEqual([
      expect.objectContaining({
        linkedInstitutionId: 'haifa',
        kind: 'needs_input',
        capability: 'needs_input',
        requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
      }),
    ]);
  });

  it('returns an estimated result for a reviewed calculator-only institution', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_cs',
        psychometric: 700,
        bagrut: 110,
      },
      program: technionCs,
      institutions,
    });

    expect(report.results).toEqual([
      expect.objectContaining({
        linkedInstitutionId: 'technion',
        kind: 'estimated',
        capability: 'score_only',
        decision: 'below',
        sourceLabel: 'הערכה עם מקור חלקי',
      }),
    ]);
  });

  it('normalizes a successful exact TAU response into a high-confidence result', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getLastScore: {
                body: JSON.stringify({
                  hatama_handasa: 712,
                }),
              },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                total: 1,
                results: [
                  {
                    field_plain_id_programs: ['056011050000'],
                    field_this_year_receipt_threshol: 700,
                    field_this_year_rejection_thresh: 670,
                  },
                ],
              },
            },
          }),
          { status: 200 },
        ),
      );

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 700,
        bagrut: 110,
      },
      program: tauDataScience,
      institutions,
      fetcher,
    });

    expect(report.results).toEqual([
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        kind: 'exact',
        capability: 'exact',
        decision: 'accepted',
        confidence: 'high',
        score: 712,
        threshold: 700,
      }),
    ]);
  });
});
