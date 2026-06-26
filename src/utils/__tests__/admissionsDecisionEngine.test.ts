import { evaluateAdmissionsDecision } from '@/utils/admissionsDecisionEngine';
import type {
  AdmissionAlternativePath,
  AdmissionFact,
  InstitutionDetail,
  Program,
} from '@/data/degrees/types';
import type { UniversityResult } from '@/types';

const program: Program = {
  id: 'test_program',
  name: 'מסלול בדיקה',
  institution: 'מוסד בדיקה',
  type: 'academic',
  category: 'בדיקה',
  profileScore: { AN: 1, TE: 1, CR: 1, SO: 1, LE: 1, OR: 1, DI: 0, ER: 0 },
  admissionType: 'requirements',
  admissionRequirements: [],
};

function detail(args: {
  facts?: AdmissionFact[];
  alternatives?: AdmissionAlternativePath[];
  confidence?: 'high' | 'medium' | 'low';
}): InstitutionDetail {
  return {
    institutionName: 'מוסד בדיקה',
    durationYears: 3,
    estimatedStudentsPerYear: '',
    quantitativeMinRequirement: null,
    englishMinRequirement: null,
    specificAdmissionNotes: [],
    officialCalculatorUrl: 'https://example.ac.il/admissions',
    admissionsSourceCandidates: [
      {
        id: 'source_1',
        origin: 'catalogue_url',
        specificity: 'program_admissions',
        confidence: args.confidence ?? 'high',
        url: 'https://example.ac.il/admissions',
        title: 'מקור רשמי',
      },
    ],
    admissionFacts: args.facts ?? [],
    admissionAlternativePaths: args.alternatives ?? [],
  };
}

const psychometricFact: AdmissionFact = {
  id: 'fact_psy',
  sourceCandidateId: 'source_1',
  kind: 'numeric_gate',
  field: 'psychometric',
  comparison: 'gte',
  valueNumber: 500,
  valueText: null,
  unit: 'points',
  description: 'פסיכומטרי מינימלי: 500',
  confidence: 'high',
  isRequired: true,
};

const bagrutFact: AdmissionFact = {
  id: 'fact_bagrut',
  sourceCandidateId: 'source_1',
  kind: 'numeric_gate',
  field: 'bagrut_average',
  comparison: 'gte',
  valueNumber: 80,
  valueText: null,
  unit: 'average',
  description: 'ממוצע בגרות מינימלי: 80',
  confidence: 'high',
  isRequired: true,
};

const interviewFact: AdmissionFact = {
  id: 'fact_interview',
  sourceCandidateId: 'source_1',
  kind: 'manual_gate',
  field: 'interview',
  comparison: 'present',
  valueNumber: null,
  valueText: 'ראיון',
  unit: 'text',
  description: 'ראיון קבלה נדרש',
  confidence: 'medium',
  isRequired: true,
};

describe('admissionsDecisionEngine', () => {
  it('returns accepted for trusted calculator-backed acceptance', () => {
    const calculatorResult = {
      university: {
        id: 'tau',
        name: 'TAU',
        formulaType: 'weighted_scaled',
        sekhemWeight: { psy: 0.5, bag: 0.5 },
        scaleDescription: 'Weighted',
      },
      sekhem: 710,
      threshold: 700,
      status: 'accepted',
    } satisfies UniversityResult;

    const decision = evaluateAdmissionsDecision({
      program,
      institutionDetail: detail({ facts: [psychometricFact] }),
      scores: { psychometric: 650, bagrut: 95 },
      calculatorResult,
    });

    expect(decision.status).toBe('accepted');
    expect(decision.statusLabel).toBe('התקבלת');
    expect(decision.confidence).toBe('high');
    expect(decision.explanation[0]).toContain('עומד בסף');
  });

  it('returns accepted with a visible missing manual gate after numeric conditions pass', () => {
    const decision = evaluateAdmissionsDecision({
      program,
      institutionDetail: detail({ facts: [psychometricFact, bagrutFact, interviewFact] }),
      scores: { psychometric: 540, bagrut: 86 },
    });

    expect(decision.status).toBe('accepted');
    expect(decision.confidence).toBe('medium');
    expect(decision.manualGates).toEqual(['ראיון קבלה נדרש']);
    expect(decision.missing).toEqual([]);
  });

  it('returns likely accepted when the source is low confidence but numeric conditions pass', () => {
    const lowConfidenceFact = { ...psychometricFact, confidence: 'low' as const };

    const decision = evaluateAdmissionsDecision({
      program,
      institutionDetail: detail({ facts: [lowConfidenceFact], confidence: 'low' }),
      scores: { psychometric: 540, bagrut: 86 },
    });

    expect(decision.status).toBe('likely_accepted_needs_verification');
    expect(decision.nextAction.kind).toBe('manual_check');
  });

  it('returns close to accepted with the best score improvement gap', () => {
    const decision = evaluateAdmissionsDecision({
      program,
      institutionDetail: detail({ facts: [psychometricFact, bagrutFact] }),
      scores: { psychometric: 470, bagrut: 85 },
    });

    expect(decision.status).toBe('close_to_accepted');
    expect(decision.missing).toEqual([
      expect.objectContaining({ field: 'psychometric', delta: 30 }),
    ]);
    expect(decision.nextAction.kind).toBe('improve_psychometric');
  });

  it('returns not accepted with a path when the gap is real and alternatives exist', () => {
    const decision = evaluateAdmissionsDecision({
      program,
      institutionDetail: detail({
        facts: [psychometricFact, bagrutFact],
        alternatives: [
          {
            id: 'alt_prep',
            kind: 'prep_program',
            title: 'מכינה רלוונטית',
            description: 'נתיב הכנה לפני קבלה',
            priority: 10,
          },
        ],
      }),
      scores: { psychometric: 420, bagrut: 74 },
    });

    expect(decision.status).toBe('not_accepted_has_path');
    expect(decision.nextAction.kind).toBe('prep_program');
  });

  it('returns far from the track for large numeric gaps', () => {
    const decision = evaluateAdmissionsDecision({
      program,
      institutionDetail: detail({ facts: [psychometricFact, bagrutFact] }),
      scores: { psychometric: 340, bagrut: 55 },
    });

    expect(decision.status).toBe('far_from_track');
    expect(decision.nextAction.kind).toBe('manual_check');
  });

  it('returns insufficient data for weak unknown-only facts', () => {
    const decision = evaluateAdmissionsDecision({
      program,
      institutionDetail: detail({
        confidence: 'low',
        facts: [
          {
            id: 'fact_unknown',
            sourceCandidateId: 'source_1',
            kind: 'unknown',
            field: 'bagrut_average',
            comparison: 'unknown',
            valueNumber: null,
            valueText: null,
            unit: 'average',
            description: 'לא נמצא סף בגרות אמין',
            confidence: 'low',
            isRequired: true,
          },
        ],
      }),
      scores: { psychometric: 700, bagrut: 110 },
    });

    expect(decision.status).toBe('insufficient_data');
    expect(decision.confidence).toBe('low');
    expect(decision.nextAction.kind).toBe('official_source');
  });
});
