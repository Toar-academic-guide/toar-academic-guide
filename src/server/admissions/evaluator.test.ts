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
  {
    id: 'afeka',
    name: 'מכללת אפקה',
    region: 'center',
    domain: 'afeka.ac.il',
    universityId: 'afeka',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'ציון התאמה אפקה',
      sekhemWeight: { psy: 0.5, bag: 0.5 },
    },
  },
  {
    id: 'hit',
    name: 'המכון הטכנולוגי חולון',
    region: 'center',
    domain: 'hit.ac.il',
    universityId: 'hit',
    calculatorConfig: {
      formulaType: 'minimum_floors',
      scaleDescription: 'תנאי סף',
      minPsychometric: 550,
      minBagrut: 85,
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

const afekaEngineering: CatalogueProgram = {
  id: 'afeka_engineering',
  name: 'הנדסת תוכנה',
  institution: 'מכללת אפקה',
  institutionId: 'afeka',
  type: 'academic',
  category: 'הנדסה וטכנולוגיה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { afeka: 250 },
  linkedInstitutionIds: ['afeka'],
};

const hitEngineering: CatalogueProgram = {
  id: 'hit_cs',
  name: 'מדעי המחשב',
  institution: 'המכון הטכנולוגי חולון',
  institutionId: 'hit',
  type: 'academic',
  category: 'הנדסה וטכנולוגיה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { hit: 550 },
  linkedInstitutionIds: ['hit'],
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

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'haifa',
        kind: 'needs_input',
        capability: 'needs_input',
        requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
      }),
    );
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

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'technion',
        kind: 'estimated',
        capability: 'score_only',
        decision: 'below',
        sourceLabel: 'הערכה עם מקור חלקי',
      }),
    );
  });

  it('returns needs-input for Afeka when subject gates are missing', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'afeka_engineering',
        psychometric: 700,
        bagrut: 110,
      },
      program: afekaEngineering,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'afeka',
        kind: 'needs_input',
        capability: 'needs_input',
        requiredInputs: ['math_units', 'math_grade', 'english_units', 'english_grade'],
      }),
    );
  });

  it('returns an Afeka estimate when required subject gates are present', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'afeka_engineering',
        psychometric: 700,
        bagrut: 110,
        extraInputs: {
          mathUnits: 5,
          mathGrade: 90,
          englishUnits: 5,
          englishGrade: 90,
        },
      },
      program: afekaEngineering,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'afeka',
        kind: 'estimated',
        capability: 'estimated',
        decision: 'accepted',
      }),
    );
  });

  it('returns needs-input for technical HIT programs when math gates are missing', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'hit_cs',
        psychometric: 700,
        bagrut: 110,
      },
      program: hitEngineering,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'hit',
        kind: 'needs_input',
        capability: 'needs_input',
        requiredInputs: ['math_units', 'math_grade'],
      }),
    );
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

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        kind: 'exact',
        capability: 'exact',
        decision: 'accepted',
        confidence: 'high',
        score: 712,
        threshold: 700,
      }),
    );
  });

  it('correctly returns open_admission for Open University and other open institutions', async () => {
    const openProgram: CatalogueProgram = {
      id: 'open_cs',
      name: 'מדעי המחשב',
      institution: 'האוניברסיטה הפתוחה',
      institutionId: 'open_university',
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['open_university'],
    };

    const openInstitutions: CatalogueInstitution[] = [
      {
        id: 'open_university',
        name: 'האוניברסיטה הפתוחה',
        region: 'center',
        domain: 'openu.ac.il',
        universityId: 'open_university',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'open_cs',
        psychometric: 500,
        bagrut: 80,
      },
      program: openProgram,
      institutions: openInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'open_university',
        kind: 'open_admission',
        capability: 'open_admission',
        decision: 'accepted',
        confidence: 'high',
      }),
    );
  });

  it('correctly returns manual_gate for design programs at non-calculator colleges', async () => {
    const designProgram: CatalogueProgram = {
      id: 'bezalel_design',
      name: 'עיצוב גרפי',
      institution: 'בצלאל',
      institutionId: 'bezalel',
      type: 'academic',
      category: 'עיצוב',
      profileScore: { AN: 1, TE: 1, CR: 5, SO: 2, LE: 1, OR: 2, DI: 5, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: ['תיק עבודות', 'ראיון'],
      linkedInstitutionIds: ['bezalel'],
      institutionDetails: [
        {
          institutionName: 'בצלאל',
          durationYears: 4,
          estimatedStudentsPerYear: 'כ-100',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: ['תיק עבודות יצירתי', 'מבחן מעשי'],
          officialCalculatorUrl: '',
        },
      ],
    };

    const designInstitutions: CatalogueInstitution[] = [
      {
        id: 'bezalel',
        name: 'בצלאל',
        region: 'center',
        domain: 'bezalel.ac.il',
        universityId: 'bezalel',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bezalel_design',
        psychometric: 450,
        bagrut: 90,
      },
      program: designProgram,
      institutions: designInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'bezalel',
        kind: 'manual_gate',
        capability: 'manual_gate',
        decision: 'unknown',
        explanation: expect.stringContaining('תיק עבודות יצירתי'),
      }),
    );
  });

  it('ensures TAU exact proofs still run and are not starved when multiple score_only institutions are evaluated', async () => {
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
      program: {
        ...tauDataScience,
        linkedInstitutionIds: ['technion', 'tau'],
      },
      institutions: institutions,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        kind: 'exact',
        capability: 'exact',
      }),
    );
  });
});
