import { describe, expect, it, vi } from 'vitest';

import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
import type { SourceFreshnessStateRow } from '@/db/types';
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

function expectBguExact(report: AdmissionsEvaluationReport, decision: 'accepted' | 'below' | 'eligible_to_apply'): void {
  expect(report.results).toContainEqual(
    expect.objectContaining({
      linkedInstitutionId: 'bgu',
      capability: 'exact',
      decision,
    }),
  );
}

function expectFormulaVerificationUnavailable(
  report: AdmissionsEvaluationReport,
  institutionId: string,
): void {
  expect(report.results).toContainEqual(
    expect.objectContaining({
      linkedInstitutionId: institutionId,
      kind: 'authority_unavailable',
      capability: 'authority_unavailable',
      decision: 'unknown',
      degradationReason: 'pair_verification_incomplete',
    }),
  );
}

function expectTechnionExact(report: AdmissionsEvaluationReport): void {
  expect(report.results).toContainEqual(
    expect.objectContaining({
      linkedInstitutionId: 'technion',
      kind: 'exact',
      capability: 'exact',
    }),
  );
}

function bguMockFetcher(threshold: number, score: number): typeof fetch {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ items: [{ psycho_sekem: threshold, psycho_value: threshold, comments: `סכם כמותי ${threshold}` }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(`<script>parent.main.document.mainForm.on_final_sekem.value = ${score};</script>`, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );
}

function tauFreshnessStates(): Map<string, SourceFreshnessStateRow> {
  return new Map([
    [
      'tau-digital-sciences-live',
      {
        sourceId: 'tau-digital-sciences-live',
        sourceClass: 'api_static_json',
        capability: 'decision_capable',
        status: 'fresh',
        lastCheckedAt: new Date('2026-07-25T20:12:07Z'),
        lastSuccessfulCheckAt: new Date('2026-07-25T20:12:07Z'),
        lastChangedAt: null,
        latestFailureReason: null,
        blockedReason: null,
        rawFingerprint: null,
        normalizedFingerprint: '62a6a2f398b737b2139671f32c48a921083a4966ea43e8135c081870d42e9971',
        normalizedDecisionPayload: {},
        latestReviewItemId: null,
        nextAction: null,
        createdAt: new Date('2026-07-25T20:12:07Z'),
        updatedAt: new Date('2026-07-25T20:12:07Z'),
      },
    ],
  ]);
}

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
    id: 'bgu',
    name: 'אוניברסיטת בן-גוריון בנגב',
    region: 'south',
    domain: 'bgu.ac.il',
    universityId: 'bgu',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה מוסדית',
      sekhemWeight: { psy: 0.45, bag: 0.55 },
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
    id: 'ariel',
    name: 'אוניברסיטת אריאל',
    region: 'center',
    domain: 'ariel.ac.il',
    universityId: 'ariel',
    calculatorConfig: {
      formulaType: 'weighted_scaled',
      scaleDescription: 'סקאלה 200-800',
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

const tauNursing: CatalogueProgram = {
  id: 'nursing',
  name: 'סיעוד',
  institution: 'אוניברסיטת תל אביב',
  institutionId: 'tau',
  type: 'academic',
  category: 'בריאות',
  profileScore: { AN: 3, TE: 2, CR: 1, SO: 5, LE: 1, OR: 3, DI: 1, ER: 3 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 530 },
  linkedInstitutionIds: ['tau'],
};

const tauPsychology: CatalogueProgram = {
  id: 'tau_psychology',
  name: 'פסיכולוגיה',
  institution: 'אוניברסיטת תל אביב',
  institutionId: 'tau',
  type: 'academic',
  category: 'מדעי החברה',
  profileScore: { AN: 3, TE: 1, CR: 3, SO: 5, LE: 4, OR: 3, DI: 1, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 660 },
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
  thresholds: { technion: 91 },
  linkedInstitutionIds: ['technion'],
};

const technionDataScience: CatalogueProgram = {
  id: 'technion_datascience',
  name: 'הנדסת נתונים ומידע',
  institution: 'הטכניון – מכון טכנולוגי לישראל',
  institutionId: 'technion',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { technion: 91 },
  linkedInstitutionIds: ['technion'],
};

const technionMedicine: CatalogueProgram = {
  id: 'technion_medicine',
  name: 'רפואה',
  institution: 'הטכניון – מכון טכנולוגי לישראל',
  institutionId: 'technion',
  type: 'academic',
  category: 'רפואה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { technion: null },
  linkedInstitutionIds: ['technion'],
};

const bguCs: CatalogueProgram = {
  id: 'bgu_cs',
  name: 'מדעי המחשב',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: 720 },
  minimumPsychometric: { bgu: 600 },
  linkedInstitutionIds: ['bgu'],
};

const bguEe: CatalogueProgram = {
  id: 'bgu_ee',
  name: 'הנדסת חשמל',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'הנדסה',
  profileScore: { AN: 4, TE: 4, CR: 0, SO: 0, LE: 1, OR: 2, DI: 3, ER: 2 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: 547 },
  minimumPsychometric: { bgu: 600 },
  linkedInstitutionIds: ['bgu'],
};

const bguBiology: CatalogueProgram = {
  id: 'bgu_biology',
  name: 'ביולוגיה',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'מדעי החיים',
  profileScore: { AN: 5, TE: 3, CR: 1, SO: 2, LE: 1, OR: 3, DI: 0, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: 585 },
  minimumPsychometric: { bgu: 585 },
  minimumBagrut: { bgu: 106 },
  linkedInstitutionIds: ['bgu'],
};

const bguNursing: CatalogueProgram = {
  id: 'bgu_nursing',
  name: 'סיעוד',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'מדעי הבריאות',
  profileScore: { AN: 3, TE: 3, CR: 1, SO: 5, LE: 2, OR: 2, DI: 0, ER: 2 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: {},
  linkedInstitutionIds: ['bgu'],
};

const bguMedicine: CatalogueProgram = {
  id: 'bgu_medicine',
  name: 'רפואה',
  institution: 'אוניברסיטת בן-גוריון בנגב',
  institutionId: 'bgu',
  type: 'academic',
  category: 'רפואה',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { bgu: null },
  minimumPsychometric: { bgu: 680 },
  linkedInstitutionIds: ['bgu'],
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

const arielCs: CatalogueProgram = {
  id: 'ariel_cs',
  name: 'מדעי המחשב',
  institution: 'אוניברסיטת אריאל',
  institutionId: 'ariel',
  type: 'academic',
  category: 'מדעי המחשב',
  profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { ariel: 600 },
  linkedInstitutionIds: ['ariel'],
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
  it('does not mutate canonical program definitions during evaluation', async () => {
    const originalTauProgram = structuredClone(tauDataScience);
    const originalHaifaProgram = structuredClone(haifaCs);
    const offlineFetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));

    await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 700,
        bagrut: 110,
      },
      program: tauDataScience,
      institutions,
      fetcher: offlineFetcher,
    });

    await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'haifa_cs',
        psychometric: 680,
        bagrut: 105,
      },
      program: haifaCs,
      institutions,
      fetcher: offlineFetcher,
    });

    expect(tauDataScience).toEqual(originalTauProgram);
    expect(haifaCs).toEqual(originalHaifaProgram);
  });

  it('requests Haifa psychometric subscores after pair proof is verified', async () => {
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
        decision: 'unknown',
        requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
      }),
    );
  });

  it('returns an exact Technion threshold after pair-level score and verdict proof', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_cs',
        psychometric: 760,
        bagrut: 115,
      },
      program: technionCs,
      institutions,
    });

    expectTechnionExact(report);
  });

  it('returns exact Technion data science after its calculator replay is proven', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_datascience',
        psychometric: 760,
        bagrut: 115,
      },
      program: technionDataScience,
      institutions,
    });

    expectTechnionExact(report);
  });

  it('returns exact Technion medicine after the complete invitation flow is proven', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_medicine',
        psychometric: 760,
        bagrut: 115,
      },
      program: technionMedicine,
      institutions,
    });

    expectTechnionExact(report);
  });

  it('issues the verified below verdict for a Technion medicine pair', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'technion_medicine',
        psychometric: 700,
        bagrut: 100,
      },
      program: technionMedicine,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'technion',
        kind: 'exact',
        capability: 'exact',
        decision: 'below',
      }),
    );
  });

  it('returns an exact BGU Computer Science verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_cs',
        psychometric: 760,
        bagrut: 115,
      },
      program: bguCs,
      institutions,
      fetcher: bguMockFetcher(720, 875),
    });

    expectBguExact(report, 'accepted');
  });

  it('returns an exact BGU engineering verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_ee',
        psychometric: 590,
        bagrut: 120,
      },
      program: bguEe,
      institutions,
      fetcher: bguMockFetcher(547, 875),
    });

    expectBguExact(report, 'accepted');
  });

  it('returns an exact BGU biology verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_biology',
        psychometric: 700,
        bagrut: 100,
      },
      program: bguBiology,
      institutions,
      fetcher: bguMockFetcher(585, 875),
    });

    expectBguExact(report, 'accepted');
  });

  it('returns an exact BGU nursing invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_nursing',
        psychometric: 530,
        bagrut: 95,
      },
      program: bguNursing,
      institutions,
      fetcher: bguMockFetcher(520, 875),
    });

    expectBguExact(report, 'eligible_to_apply');
  });

  it('does not estimate an explicitly excluded Ariel formula pair', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'ariel_cs',
        psychometric: 680,
        bagrut: 110,
      },
      program: arielCs,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'ariel',
        capability: 'unsupported',
        kind: 'unsupported',
        decision: 'unknown',
        sourceLabel: 'מחוץ להיקף האימות',
      }),
    );
  });

  it('returns a below BGU nursing invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_nursing',
        psychometric: 510,
        bagrut: 110,
      },
      program: bguNursing,
      institutions,
      fetcher: bguMockFetcher(520, 451),
    });

    expectBguExact(report, 'below');
  });

  it('returns an exact BGU medicine invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_medicine',
        psychometric: 760,
        bagrut: 115,
      },
      program: bguMedicine,
      institutions,
      fetcher: bguMockFetcher(735, 875),
    });

    expectBguExact(report, 'eligible_to_apply');
  });

  it('returns a below BGU medicine invitation verdict', async () => {
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'bgu_medicine',
        psychometric: 650,
        bagrut: 110,
      },
      program: bguMedicine,
      institutions,
      fetcher: bguMockFetcher(735, 451),
    });

    expectBguExact(report, 'below');
  });

  it('promotes Reichman to eligible_to_apply once the official bagrut-average rule is verified', async () => {
    const reichmanCs: CatalogueProgram = {
      id: 'reichman_cs',
      name: 'מדעי המחשב',
      institution: 'אוניברסיטת רייכמן',
      institutionId: 'reichman',
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 4 },
      admissionType: 'sekhem',
      admissionRequirements: [],
      thresholds: { reichman: 0 },
      linkedInstitutionIds: ['reichman'],
    };

    const reichmanInstitution: CatalogueInstitution = {
      id: 'reichman',
      name: 'אוניברסיטת רייכמן',
      region: 'center',
      domain: 'runi.ac.il',
      universityId: 'reichman',
      calculatorConfig: {
        formulaType: 'weighted_scaled',
        scaleDescription: 'סקאלה מקומית',
        sekhemWeight: { psy: 0.6, bag: 0.4 },
      },
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'reichman_cs',
        psychometric: 600,
        bagrut: 95,
      },
      program: reichmanCs,
      institutions: [...institutions, reichmanInstitution],
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'reichman',
        kind: 'manual_gate',
        capability: 'manual_gate',
        decision: 'eligible_to_apply',
        confidence: 'high',
      }),
    );
  });

  it('returns Colman automatic-route eligibility from its reviewed requirements proof', async () => {
    const colmanCs: CatalogueProgram = {
      id: 'colmgmt_cs',
      name: 'מדעי המחשב',
      institution: 'מכללת ניהול – לימודים אקדמיים',
      institutionId: 'colman',
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 5, TE: 2, CR: 1, SO: 0, LE: 1, OR: 3, DI: 5, ER: 2 },
      admissionType: 'requirements',
      admissionRequirements: [
        'מסלול בגרות: ממוצע בגרות משוקלל 85+',
        'מתמטיקה: 5 יח"ל 70+ או 4 יח"ל 80+',
      ],
      linkedInstitutionIds: ['colman'],
    };

    const colmanInstitution: CatalogueInstitution = {
      id: 'colman',
      name: 'מכללת ניהול – לימודים אקדמיים',
      region: 'center',
      domain: 'colman.ac.il',
      universityId: 'colman',
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'colmgmt_cs',
        psychometric: 580,
        bagrut: 92,
        extraInputs: { mathUnits: 5, mathGrade: 75 },
      },
      program: colmanCs,
      institutions: [...institutions, colmanInstitution],
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'colman',
        capability: 'exact',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
      }),
    );
  });

  it('surfaces Ono law as eligible_to_apply with current official requirements after verification', async () => {
    const onoLaw: CatalogueProgram = {
      id: 'ono_law',
      name: 'משפטים',
      institution: 'המכללה האקדמית אונו',
      institutionId: 'ono',
      type: 'academic',
      category: 'משפטים',
      profileScore: { AN: 2, TE: 0, CR: 1, SO: 3, LE: 5, OR: 2, DI: 0, ER: 5 },
      admissionType: 'requirements',
      admissionRequirements: [
        'קבלה ישירה: ממוצע בגרות 95+ או פסיכומטרי 600 + בגרות מלאה',
        'קבלה משוקללת: ראיון קבלה עם ממוצע בגרות 80-94 או פסיכומטרי 550 + בגרות מלאה',
      ],
      linkedInstitutionIds: ['ono'],
    };

    const onoInstitution: CatalogueInstitution = {
      id: 'ono',
      name: 'המכללה האקדמית אונו',
      region: 'center',
      domain: 'ono.ac.il',
      universityId: 'ono',
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'ono_law',
        psychometric: 590,
        bagrut: 92,
      },
      program: onoLaw,
      institutions: [...institutions, onoInstitution],
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'ono',
        kind: 'manual_gate',
        capability: 'manual_gate',
        decision: 'eligible_to_apply',
        confidence: 'high',
        nextAction: expect.stringContaining('הקבלה האוטומטי'),
        explanation: expect.stringContaining('מסלול קבלה אוטומטי'),
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

  it('does not call the TAU adapter while required exact inputs are missing', async () => {
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

    expect(fetcher).not.toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
      }),
    );
  });

  it('returns the reviewed TAU score and verdict with current proof and complete inputs', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getLastScore: {
                body: JSON.stringify({ hatama_handasa: 664 }),
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
                results: [
                  {
                    title: 'תואר ראשון במדעים דיגיטליים להיי-טק',
                    field_plain_id_programs: ['056011050000'],
                    field_this_year_receipt_threshol: 652,
                    field_this_year_rejection_thresh: 632,
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
        psychometric: 680,
        bagrut: 105,
        extraInputs: {
          psychometricEnglish: 110,
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 80 },
              { subjectId: 'physics', units: 5, grade: 70 },
              { subjectId: 'history', units: 2, grade: 90 },
              { subjectId: 'bible', units: 2, grade: 88 },
            ],
          },
        },
      },
      program: tauDataScience,
      institutions,
      fetcher,
      freshnessStatesBySourceId: tauFreshnessStates(),
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
      variables: { scoresData: { reali10: 1 } },
    });
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        kind: 'exact',
        capability: 'exact',
        decision: 'accepted',
        score: 664,
        threshold: 652,
      }),
    );
  });

  it('returns an exact below verdict for a failed TAU minimum gate without a live call', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_datascience',
        psychometric: 619,
        bagrut: 105,
        extraInputs: {
          psychometricEnglish: 110,
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
          },
        },
      },
      program: tauDataScience,
      institutions,
      fetcher,
      freshnessStatesBySourceId: tauFreshnessStates(),
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        kind: 'exact',
        capability: 'exact',
        decision: 'below',
        explanation: expect.stringContaining('פסיכומטרי כללי 620'),
      }),
    );
  });

  it('returns TAU Nursing eligibility for manual assessment, never final acceptance', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { getLastScore: { body: JSON.stringify({ hatama: 546 }) } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getPrograms: {
                results: [
                  {
                    title: 'לימודי תואר ראשון בחוג למדעי האחיוּת (Nursing)',
                    field_plain_id_programs: ['016211010000', '016211010208'],
                    field_this_year_receipt_threshol: 530,
                    field_this_year_rejection_thresh: 520,
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
        degreeId: 'nursing',
        psychometric: 520,
        bagrut: 100,
        extraInputs: { psychometricEnglish: 110 },
      },
      program: tauNursing,
      institutions,
      fetcher,
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'exact',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        score: 546,
        threshold: 530,
        explanation: expect.stringContaining('אינה קבלה סופית'),
      }),
    );
  });

  it('returns the node-specific TAU Psychology score and verdict', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { getLastScore: { body: { hatama: 679 } } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              getProgramByIdAndLang: {
                nid: '8275',
                title: 'תואר ראשון בלימודי פסיכולוגיה',
                field_plain_id_programs: ['107111050000', '107111030000'],
                receipt_threshol: [660],
                rejection_thresh: [659],
              },
            },
          }),
          { status: 200 },
        ),
      );

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'tau_psychology',
        psychometric: 680,
        bagrut: 110,
        extraInputs: { psychometricEnglish: 110 },
      },
      program: tauPsychology,
      institutions,
      fetcher,
      now: new Date('2026-07-25T21:00:00Z'),
    });

    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
      variables: { nid: 8275, langcode: 'he' },
    });
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'exact',
        kind: 'exact',
        decision: 'accepted',
        score: 679,
        threshold: 660,
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

  it('returns eligible_to_apply for design programs with manual gates only', async () => {
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
        decision: 'eligible_to_apply',
        sourceLabel: 'אפשר להגיש מועמדות',
        explanation: expect.stringContaining('תיק עבודות יצירתי'),
      }),
    );
  });

  it('does not spend live-call budget on a TAU pair with missing exact inputs', async () => {
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

    expect(fetcher).not.toHaveBeenCalled();
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'tau',
        capability: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
      }),
    );
  });

  it('includes dynamic admissions criteria (interview, portfolio, no bagrut, no psychometric) from Monday evidence in evaluator Hebrew explanation', async () => {
    const mondayProgram: CatalogueProgram = {
      id: 'mon_12341185928_cs',
      name: 'מדעי המחשב',
      institution: 'אורנים המכללה האקדמית לחינוך',
      institutionId: 'mon_12341185928' as any,
      type: 'academic',
      category: 'מדעי המחשב',
      profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['mon_12341185928' as any],
    };

    const mondayInstitutions: CatalogueInstitution[] = [
      {
        id: 'mon_12341185928' as any,
        name: 'אורנים המכללה האקדמית לחינוך',
        region: 'north',
        domain: 'oranim.ac.il',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'mon_12341185928_cs',
        psychometric: 500,
        bagrut: 80,
      },
      program: mondayProgram,
      institutions: mondayInstitutions,
    });

    const result = report.results.find((r) => r.linkedInstitutionId === 'mon_12341185928')!;
    expect(result.capability).toBe('manual_gate');
    expect(result.explanation).toContain('ראיון קבלה חובה');
    expect(result.explanation).toContain('אין צורך בפסיכומטרי');
  });

  it('asks for structured subject inputs before returning an accepted score-based result', async () => {
    const scoreProgram: CatalogueProgram = {
      id: 'structured_score_program',
      name: 'הנדסת נתונים',
      institution: 'אוניברסיטת בן-גוריון בנגב',
      institutionId: 'bgu',
      type: 'academic',
      category: 'הנדסה',
      profileScore: { AN: 5, TE: 4, CR: 1, SO: 1, LE: 1, OR: 3, DI: 5, ER: 3 },
      admissionType: 'sekhem',
      admissionRequirements: [],
      thresholds: { bgu: 600 },
      linkedInstitutionIds: ['bgu'],
      institutionDetails: [
        {
          institutionName: 'אוניברסיטת בן-גוריון בנגב',
          durationYears: 4,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_score_program:bgu:math-units',
              kind: 'numeric_gate',
              field: 'math_units',
              comparison: 'gte',
              valueNumber: 5,
              valueText: null,
              unit: 'units',
              description: 'מתמטיקה ברמת 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_score_program',
        psychometric: 760,
        bagrut: 115,
      },
      program: scoreProgram,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'bgu',
        capability: 'needs_input',
        kind: 'needs_input',
        requiredInputs: ['math_units'],
      }),
    );
  });

  it('turns an accepted score-based result into manual_gate when structured interview stages remain', async () => {
    const scoreProgram: CatalogueProgram = {
      id: 'structured_score_manual_program',
      name: 'פסיכולוגיה יישומית',
      institution: 'אוניברסיטת בן-גוריון בנגב',
      institutionId: 'bgu',
      type: 'academic',
      category: 'פסיכולוגיה',
      profileScore: { AN: 4, TE: 2, CR: 1, SO: 5, LE: 2, OR: 2, DI: 1, ER: 4 },
      admissionType: 'sekhem',
      admissionRequirements: [],
      thresholds: { bgu: 600 },
      linkedInstitutionIds: ['bgu'],
      institutionDetails: [
        {
          institutionName: 'אוניברסיטת בן-גוריון בנגב',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_score_manual_program:bgu:interview',
              kind: 'manual_gate',
              field: 'interview',
              comparison: 'present',
              valueNumber: null,
              valueText: 'ראיון קבלה',
              unit: 'text',
              description: 'ראיון קבלה מחייב',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_score_manual_program',
        psychometric: 760,
        bagrut: 115,
      },
      program: scoreProgram,
      institutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'bgu',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        score: expect.any(Number),
        threshold: 600,
        explanation: expect.stringContaining('ראיון קבלה מחייב'),
      }),
    );
  });

  it('returns below when structured numeric admission facts are not met before a manual gate stage', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_psych_program',
      name: 'פסיכולוגיה יישומית',
      institution: 'Structured College',
      institutionId: 'structured_college' as any,
      type: 'academic',
      category: 'פסיכולוגיה',
      profileScore: { AN: 3, TE: 2, CR: 2, SO: 5, LE: 3, OR: 2, DI: 1, ER: 4 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_college' as any],
      institutionDetails: [
        {
          institutionName: 'Structured College',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_psych_program:structured_college:fact:psychometric',
              kind: 'numeric_gate',
              field: 'psychometric',
              comparison: 'gte',
              valueNumber: 620,
              valueText: null,
              unit: 'points',
              description: 'פסיכומטרי 620 ומעלה',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_psych_program:structured_college:fact:interview',
              kind: 'manual_gate',
              field: 'interview',
              comparison: 'present',
              valueNumber: null,
              valueText: 'ראיון קבלה',
              unit: 'text',
              description: 'ראיון קבלה אישי',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_college' as any,
        name: 'Structured College',
        region: 'center',
        domain: 'structured.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_psych_program',
        psychometric: 580,
        bagrut: 100,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_college',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'below',
        threshold: 620,
        score: 580,
      }),
    );
  });

  it('returns eligible_to_apply when structured numeric facts are met and only the manual gate remains', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_design_program',
      name: 'עיצוב מוצר',
      institution: 'Structured Design School',
      institutionId: 'structured_design' as any,
      type: 'academic',
      category: 'עיצוב',
      profileScore: { AN: 2, TE: 2, CR: 5, SO: 2, LE: 2, OR: 2, DI: 4, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_design' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Design School',
          durationYears: 4,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_design_program:structured_design:fact:bagrut',
              kind: 'numeric_gate',
              field: 'bagrut_average',
              comparison: 'gte',
              valueNumber: 85,
              valueText: null,
              unit: 'average',
              description: 'ממוצע בגרות 85 ומעלה',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_design_program:structured_design:fact:portfolio',
              kind: 'manual_gate',
              field: 'portfolio',
              comparison: 'present',
              valueNumber: null,
              valueText: 'תיק עבודות',
              unit: 'text',
              description: 'הגשת תיק עבודות',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_design' as any,
        name: 'Structured Design School',
        region: 'center',
        domain: 'structured-design.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_design_program',
        psychometric: 500,
        bagrut: 92,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_design',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        sourceLabel: 'נדרש מיון נוסף',
      }),
    );
  });

  it('treats grouped structured numeric facts as alternative official routes instead of requiring every route at once', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_grouped_route_program',
      name: 'הנדסת תוכנה',
      institution: 'Structured Engineering College',
      institutionId: 'structured_grouped' as any,
      type: 'academic',
      category: 'הנדסה',
      profileScore: { AN: 4, TE: 4, CR: 2, SO: 2, LE: 2, OR: 2, DI: 4, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_grouped' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Engineering College',
          durationYears: 4,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F5_units:structured-0',
              kind: 'numeric_gate',
              field: 'math_units',
              comparison: 'gte',
              valueNumber: 5,
              valueText: null,
              unit: 'units',
              description: 'מתמטיקה ברמת 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F5_units:structured-1',
              kind: 'numeric_gate',
              field: 'math_grade',
              comparison: 'gte',
              valueNumber: 70,
              valueText: null,
              unit: 'points',
              description: 'ציון 70 ומעלה במתמטיקה 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F4_units:structured-2',
              kind: 'numeric_gate',
              field: 'math_units',
              comparison: 'gte',
              valueNumber: 4,
              valueText: null,
              unit: 'units',
              description: 'מתמטיקה ברמת 4 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:group:math_route%2F4_units:structured-3',
              kind: 'numeric_gate',
              field: 'math_grade',
              comparison: 'gte',
              valueNumber: 85,
              valueText: null,
              unit: 'points',
              description: 'ציון 85 ומעלה במתמטיקה 4 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:physics_units',
              kind: 'numeric_gate',
              field: 'physics_units',
              comparison: 'gte',
              valueNumber: 5,
              valueText: null,
              unit: 'units',
              description: 'פיזיקה ברמת 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:physics_grade',
              kind: 'numeric_gate',
              field: 'physics_grade',
              comparison: 'gte',
              valueNumber: 70,
              valueText: null,
              unit: 'points',
              description: 'ציון 70 ומעלה בפיזיקה 5 יח"ל',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:psychometric',
              kind: 'numeric_gate',
              field: 'psychometric',
              comparison: 'gte',
              valueNumber: 580,
              valueText: null,
              unit: 'points',
              description: 'פסיכומטרי 580 ומעלה',
              confidence: 'high',
              isRequired: true,
            },
            {
              id: 'structured_grouped_route_program:structured_grouped:fact:committee',
              kind: 'manual_gate',
              field: 'committee',
              comparison: 'present',
              valueNumber: null,
              valueText: 'ועדת קבלה',
              unit: 'text',
              description: 'בדיקת התאמה סופית מול המוסד',
              confidence: 'high',
              isRequired: true,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_grouped' as any,
        name: 'Structured Engineering College',
        region: 'south',
        domain: 'structured-grouped.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_grouped_route_program',
        psychometric: 610,
        bagrut: 110,
        extraInputs: {
          mathUnits: 4,
          mathGrade: 88,
          physicsUnits: 5,
          physicsGrade: 75,
        },
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_grouped',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        sourceLabel: 'נדרש מיון נוסף',
      }),
    );
  });

  it('returns eligible_to_apply when the direct structured numeric gate is missed but an official alternative path exists', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_alt_route_program',
      name: 'משפטים',
      institution: 'Structured Alt College',
      institutionId: 'structured_alt' as any,
      type: 'academic',
      category: 'משפטים',
      profileScore: { AN: 2, TE: 2, CR: 4, SO: 3, LE: 4, OR: 3, DI: 2, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_alt' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Alt College',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_alt_route_program:structured_alt:fact:bagrut',
              kind: 'numeric_gate',
              field: 'bagrut_average',
              comparison: 'gte',
              valueNumber: 85,
              valueText: null,
              unit: 'average',
              description: 'ממוצע בגרות 85 ומעלה לקבלה ישירה',
              confidence: 'high',
              isRequired: true,
            },
          ],
          admissionAlternativePaths: [
            {
              id: 'structured_alt_route_program:structured_alt:path:prep',
              kind: 'prep_program',
              title: 'מכינה קדם-אקדמית',
              description: 'אפשר להתקבל גם דרך מכינה קדם-אקדמית מאושרת.',
              priority: 1,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_alt' as any,
        name: 'Structured Alt College',
        region: 'center',
        domain: 'structured-alt.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_alt_route_program',
        psychometric: 550,
        bagrut: 78,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'structured_alt',
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
        sourceLabel: 'קיימים אפיקים חלופיים',
        threshold: 85,
        score: 78,
      }),
    );
  });

  it('does not describe alternative routes as mandatory remaining steps when the direct structured gate is already met', async () => {
    const structuredProgram: CatalogueProgram = {
      id: 'structured_direct_route_program',
      name: 'מנהל עסקים',
      institution: 'Structured Direct College',
      institutionId: 'structured_direct' as any,
      type: 'academic',
      category: 'מנהל עסקים',
      profileScore: { AN: 2, TE: 2, CR: 3, SO: 3, LE: 4, OR: 3, DI: 2, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['structured_direct' as any],
      institutionDetails: [
        {
          institutionName: 'Structured Direct College',
          durationYears: 3,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'structured_direct_route_program:structured_direct:fact:bagrut',
              kind: 'numeric_gate',
              field: 'bagrut_average',
              comparison: 'gte',
              valueNumber: 80,
              valueText: null,
              unit: 'average',
              description: 'ממוצע בגרות 80 ומעלה לקבלה ישירה',
              confidence: 'high',
              isRequired: true,
            },
          ],
          admissionAlternativePaths: [
            {
              id: 'structured_direct_route_program:structured_direct:path:psychometric',
              kind: 'manual_check',
              title: 'מסלול חלופי עם פסיכומטרי',
              description: 'אפשר להתקבל גם במסלול חלופי המבוסס על פסיכומטרי.',
              priority: 1,
            },
          ],
        },
      ],
    };

    const structuredInstitutions: CatalogueInstitution[] = [
      {
        id: 'structured_direct' as any,
        name: 'Structured Direct College',
        region: 'center',
        domain: 'structured-direct.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'structured_direct_route_program',
        psychometric: 620,
        bagrut: 88,
      },
      program: structuredProgram,
      institutions: structuredInstitutions,
    });

    const result = report.results.find(
      (entry) => entry.linkedInstitutionId === 'structured_direct',
    );

    expect(result).toMatchObject({
      linkedInstitutionId: 'structured_direct',
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
      sourceLabel: 'אפשר להגיש מועמדות',
    });
    expect(result?.explanation).toContain('עמדתם בתנאים המספריים שמופו.');
    expect(result?.explanation).not.toContain('עדיין צריך להשלים את השלבים הבאים');
    expect(result?.explanation).toContain('קיימים גם אפיקים חלופיים');
  });

  it('returns open_admission from structured detail facts even without monday evidence or a calculator source', async () => {
    const openProgram: CatalogueProgram = {
      id: 'open_fact_program',
      name: 'יסודות הפיתוח',
      institution: 'Open Fact College',
      institutionId: 'open_fact' as any,
      type: 'certificate',
      category: 'לימודי תעודה',
      profileScore: { AN: 3, TE: 3, CR: 3, SO: 3, LE: 3, OR: 3, DI: 3, ER: 3 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['open_fact' as any],
      institutionDetails: [
        {
          institutionName: 'Open Fact College',
          durationYears: 1,
          estimatedStudentsPerYear: 'לא ידוע',
          quantitativeMinRequirement: null,
          englishMinRequirement: null,
          specificAdmissionNotes: [],
          officialCalculatorUrl: '',
          admissionFacts: [
            {
              id: 'open_fact_program:open_fact:fact:open',
              kind: 'open_admission',
              field: 'open_admission',
              comparison: 'eq',
              valueNumber: null,
              valueText: 'קבלה פתוחה',
              unit: 'boolean',
              description: 'קבלה פתוחה ללא תנאי סף',
              confidence: 'high',
              isRequired: false,
            },
          ],
        },
      ],
    };

    const openInstitutions: CatalogueInstitution[] = [
      {
        id: 'open_fact' as any,
        name: 'Open Fact College',
        region: 'center',
        domain: 'openfact.example',
      },
    ];

    const report = await evaluateAdmissionsForProgram({
      input: {
        degreeId: 'open_fact_program',
        psychometric: 300,
        bagrut: 60,
      },
      program: openProgram,
      institutions: openInstitutions,
    });

    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: 'open_fact',
        capability: 'open_admission',
        kind: 'open_admission',
        decision: 'accepted',
      }),
    );
  });
});
