import type { AdmissionsApplicantInput } from '@/server/ingestion/admissionsSourceAdapters';

export interface OfficialProgramProofCapture {
  captureId: string;
  capturedAt: string;
  officialUrl: string;
  applicant: AdmissionsApplicantInput;
  expected: {
    score: number;
    verdict: 'accepted' | 'below' | 'eligible_to_apply';
  };
}

const TECHNION_CAPTURED_AT = '2026-07-31T10:57:00.000Z';
const TECHNION_OFFICIAL_URL = 'https://admissions.technion.ac.il/calculator/';
const HUJI_CAPTURED_AT = '2026-07-31T11:03:00.000Z';
const HUJI_OFFICIAL_URL = 'https://go.huji.ac.il/jjson/huji.json.gz';
const BGU_CAPTURED_AT = '2026-07-31T11:10:00.000Z';
const BGU_OFFICIAL_URL = 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem';
const HAIFA_CAPTURED_AT = '2026-07-31T11:17:00.000Z';
const HAIFA_OFFICIAL_URL = 'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet';
const TAU_CAPTURED_AT = '2026-07-31T10:11:16.543Z';
const TAU_OFFICIAL_URL = 'https://go.tau.ac.il/graphql';

const TECHNION_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 100,
  bagrutSubjectRecord: technionRecord(100),
  psychometric: 800,
};
const TECHNION_BELOW_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 95,
  bagrutSubjectRecord: technionRecord(95),
  psychometric: 500,
};

const TECHNION_ACCEPTED_TARGET_IDS = [
  'technion-cs-live',
  'technion-technion_cs-live',
  'technion-datascience-live',
  'technion-technion_datascience-live',
  'technion-ee-live',
  'technion-technion_ee-live',
  'technion-me-live',
  'technion-technion_me-live',
  'technion-technion_biomedical-live',
  'technion-technion_civil-live',
  'technion-technion_industrial-live',
] as const;

const TECHNION_ELIGIBLE_TO_APPLY_TARGET_IDS = [
  'technion-medicine-live',
  'technion-technion_medicine-live',
] as const;

const HUJI_FORMULA_TYPE_1_PROGRAM_IDS = [
  'biology',
  'cs',
  'law',
  'medicine',
  'nursing',
  'nutrition',
  'occupational_therapy',
  'pharmacy',
  'social_work',
  'huji_biology',
  'huji_cs',
  'huji_law',
  'huji_medicine',
  'huji_occupational_therapy',
  'huji_socialwork',
] as const;

const HUJI_FORMULA_TYPE_2_PROGRAM_IDS = [
  'accounting',
  'business',
  'communication',
  'datascience',
  'economics',
  'education',
  'political_science',
  'psychology',
  'huji_accounting',
  'huji_business',
  'huji_datascience',
  'huji_economics',
  'huji_psychology',
] as const;

const BGU_ACCEPTED_PROGRAM_IDS = [
  'accounting',
  'bgu_accounting',
  'biology',
  'bgu_biology',
  'business',
  'bgu_business',
  'cs',
  'bgu_cs',
  'datascience',
  'bgu_datascience',
  'economics',
  'bgu_economics',
  'ee',
  'bgu_ee',
  'me',
  'bgu_me',
  'bgu_industrial',
  'psychology',
  'bgu_psychology',
  'social_work',
  'bgu_socialwork',
  'communication',
  'education',
  'political_science',
] as const;

const BGU_ELIGIBLE_TO_APPLY_PROGRAM_IDS = [
  'bgu_medicine',
  'bgu_nursing',
  'occupational_therapy',
  'physiotherapy',
] as const;

const HAIFA_SCORE_848_PROGRAM_IDS = [
  'accounting',
  'haifa_accounting',
  'biology',
  'haifa_biology',
  'cs',
  'haifa_cs',
  'economics',
  'haifa_economics',
  'haifa_infosystems',
  'haifa_math',
  'haifa_statistics',
] as const;

const HAIFA_SCORE_881_PROGRAM_IDS = [
  'communication',
  'haifa_communication',
  'nursing',
  'haifa_nursing',
  'occupational_therapy',
  'physiotherapy',
  'haifa_physiotherapy',
  'political_science',
  'haifa_politicalscience',
  'psychology',
  'haifa_psychology',
  'social_work',
  'haifa_socialwork',
  'haifa_sociology',
] as const;

const HAIFA_LAW_PROGRAM_IDS = ['law', 'haifa_law'] as const;

function capturedTechnionFixtures(
  targetId: string,
  acceptedVerdict: 'accepted' | 'eligible_to_apply',
): OfficialProgramProofCapture[] {
  return [
    {
      captureId: `${targetId}:official-eligible:2026-07-31`,
      capturedAt: TECHNION_CAPTURED_AT,
      officialUrl: TECHNION_OFFICIAL_URL,
      applicant: TECHNION_ACCEPTED_APPLICANT,
      expected: { score: 98.9, verdict: acceptedVerdict },
    },
    {
      captureId: `${targetId}:official-below:2026-07-31`,
      capturedAt: TECHNION_CAPTURED_AT,
      officialUrl: TECHNION_OFFICIAL_URL,
      applicant: TECHNION_BELOW_APPLICANT,
      expected: { score: 73.9, verdict: 'below' },
    },
  ];
}

export const OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID: Record<
  string,
  readonly OfficialProgramProofCapture[]
> = Object.fromEntries([
  ...TECHNION_ACCEPTED_TARGET_IDS.map((targetId) => [
    targetId,
    capturedTechnionFixtures(targetId, 'accepted'),
  ]),
  ...TECHNION_ELIGIBLE_TO_APPLY_TARGET_IDS.map((targetId) => [
    targetId,
    capturedTechnionFixtures(targetId, 'eligible_to_apply'),
  ]),
  ...HUJI_FORMULA_TYPE_1_PROGRAM_IDS.map((programId) => [
    `huji-${programId}-live`,
    capturedHujiFixtures(`huji-${programId}-live`, 'formula-type-1'),
  ]),
  ...HUJI_FORMULA_TYPE_2_PROGRAM_IDS.map((programId) => [
    `huji-${programId}-live`,
    capturedHujiFixtures(`huji-${programId}-live`, 'formula-type-2'),
  ]),
  ...BGU_ACCEPTED_PROGRAM_IDS.map((programId) => [
    `bgu-${programId}-live`,
    capturedBguFixtures(`bgu-${programId}-live`, 'accepted'),
  ]),
  ...BGU_ELIGIBLE_TO_APPLY_PROGRAM_IDS.map((programId) => [
    `bgu-${programId}-live`,
    capturedBguFixtures(`bgu-${programId}-live`, 'eligible_to_apply'),
  ]),
  ...HAIFA_SCORE_848_PROGRAM_IDS.map((programId) => [
    `haifa-${programId}-live`,
    capturedHaifaFixtures(`haifa-${programId}-live`, 848, 493),
  ]),
  ...HAIFA_SCORE_881_PROGRAM_IDS.map((programId) => [
    `haifa-${programId}-live`,
    capturedHaifaFixtures(`haifa-${programId}-live`, 881, 493),
  ]),
  ...HAIFA_LAW_PROGRAM_IDS.map((programId) => [
    `haifa-${programId}-live`,
    capturedHaifaFixtures(`haifa-${programId}-live`, 881, 492),
  ]),
]);

function capturedHujiFixtures(
  targetId: string,
  formula: 'formula-type-1' | 'formula-type-2',
): OfficialProgramProofCapture[] {
  const scores =
    formula === 'formula-type-1'
      ? { accepted: 28.480061201, below: 12.658222001000002 }
      : { accepted: 27.921461230000006, below: 13.862308330000001 };

  return [
    {
      captureId: `${targetId}:official-eligible:2026-07-31`,
      capturedAt: HUJI_CAPTURED_AT,
      officialUrl: HUJI_OFFICIAL_URL,
      applicant: { bagrutAverage: 120, psychometric: 800 },
      expected: { score: scores.accepted, verdict: 'accepted' },
    },
    {
      captureId: `${targetId}:official-below:2026-07-31`,
      capturedAt: HUJI_CAPTURED_AT,
      officialUrl: HUJI_OFFICIAL_URL,
      applicant: { bagrutAverage: 80, psychometric: 500 },
      expected: { score: scores.below, verdict: 'below' },
    },
  ];
}

function capturedBguFixtures(
  targetId: string,
  acceptedVerdict: 'accepted' | 'eligible_to_apply',
): OfficialProgramProofCapture[] {
  return [
    {
      captureId: `${targetId}:official-eligible:2026-07-31`,
      capturedAt: BGU_CAPTURED_AT,
      officialUrl: BGU_OFFICIAL_URL,
      applicant: { bagrutAverage: 120, psychometric: 800 },
      expected: { score: 875, verdict: acceptedVerdict },
    },
    {
      captureId: `${targetId}:official-below:2026-07-31`,
      capturedAt: BGU_CAPTURED_AT,
      officialUrl: BGU_OFFICIAL_URL,
      applicant: { bagrutAverage: 80, psychometric: 500 },
      expected: { score: 451, verdict: 'below' },
    },
  ];
}

function capturedHaifaFixtures(
  targetId: string,
  acceptedScore: number,
  belowScore: number,
): OfficialProgramProofCapture[] {
  return [
    {
      captureId: `${targetId}:official-eligible:2026-07-31`,
      capturedAt: HAIFA_CAPTURED_AT,
      officialUrl: HAIFA_OFFICIAL_URL,
      applicant: {
        bagrutAverage: 120,
        psychometric: 800,
        psychometricSubscores: { english: 160, math: 160, verbal: 160 },
      },
      expected: { score: acceptedScore, verdict: 'accepted' },
    },
    {
      captureId: `${targetId}:official-below:2026-07-31`,
      capturedAt: HAIFA_CAPTURED_AT,
      officialUrl: HAIFA_OFFICIAL_URL,
      applicant: {
        bagrutAverage: 80,
        psychometric: 500,
        psychometricSubscores: { english: 100, math: 100, verbal: 100 },
      },
      expected: { score: belowScore, verdict: 'below' },
    },
  ];
}

const TAU_DIGITAL_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 105,
  psychometric: 680,
  exactSciencesBonusEligible: true,
  psychometricSubscores: { english: 110, math: 680, verbal: 680 },
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
};
const TAU_DIGITAL_BELOW_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 100,
  psychometric: 620,
  exactSciencesBonusEligible: false,
  psychometricSubscores: { english: 100, math: 620, verbal: 620 },
  bagrutSubjectRecord: {
    schemaVersion: 1,
    sector: 'jewish',
    subjects: [
      { subjectId: 'mathematics', units: 4, grade: 85 },
      { subjectId: 'history', units: 2, grade: 90 },
      { subjectId: 'bible', units: 2, grade: 88 },
    ],
  },
};
const TAU_STANDARD_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 110,
  psychometric: 680,
  exactSciencesBonusEligible: false,
  psychometricSubscores: { english: 110, math: 680, verbal: 680 },
  bagrutSubjectRecord: tauRecord(5, 82, 90, 92, 88),
};
const TAU_STANDARD_BELOW_620_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 90,
  psychometric: 620,
  exactSciencesBonusEligible: false,
  psychometricSubscores: { english: 110, math: 620, verbal: 620 },
  bagrutSubjectRecord: tauRecord(4, 80, 85, 80, 78),
};
const TAU_STANDARD_BELOW_520_APPLICANT: AdmissionsApplicantInput = {
  ...TAU_STANDARD_BELOW_620_APPLICANT,
  psychometric: 520,
  psychometricSubscores: { english: 110, math: 520, verbal: 520 },
};
const TAU_ENGINEERING_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  ...TAU_STANDARD_ACCEPTED_APPLICANT,
  bagrutAverage: 115,
  psychometric: 730,
  psychometricSubscores: { english: 110, math: 730, verbal: 730 },
};
const TAU_NURSING_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 100,
  psychometric: 520,
  exactSciencesBonusEligible: false,
  psychometricSubscores: { english: 110, math: 520, verbal: 520 },
};
const TAU_NURSING_BELOW_APPLICANT: AdmissionsApplicantInput = {
  ...TAU_NURSING_ACCEPTED_APPLICANT,
  bagrutAverage: 90,
};
const TAU_MEDICINE_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 115,
  psychometric: 760,
  exactSciencesBonusEligible: false,
  psychometricSubscores: { english: 130, math: 760, verbal: 760 },
};
const TAU_MEDICINE_BELOW_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 100,
  psychometric: 680,
  exactSciencesBonusEligible: false,
  psychometricSubscores: { english: 130, math: 680, verbal: 680 },
};
const TAU_PHYSIOTHERAPY_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 110,
  psychometric: 700,
  exactSciencesBonusEligible: false,
  psychometricSubscores: { english: 130, math: 700, verbal: 700 },
};
const TAU_PHYSIOTHERAPY_BELOW_APPLICANT: AdmissionsApplicantInput = {
  ...TAU_PHYSIOTHERAPY_ACCEPTED_APPLICANT,
  bagrutAverage: 100,
};
const TAU_SOCIAL_WORK_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 110,
  psychometric: 680,
  exactSciencesBonusEligible: false,
  bagrutSubjectRecord: tauRecord(5, 80, 88, 90, 86),
};
const TAU_SOCIAL_WORK_BELOW_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 90,
  psychometric: 520,
  exactSciencesBonusEligible: false,
  bagrutSubjectRecord: tauRecord(4, 80, 88, 90, 86),
};
const TAU_BUSINESS_ACCEPTED_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 110,
  psychometric: 680,
  exactSciencesBonusEligible: false,
};
const TAU_BUSINESS_BELOW_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 90,
  psychometric: 620,
  exactSciencesBonusEligible: false,
};

const TAU_CAPTURED_TARGETS: ReadonlyArray<
  readonly [
    string,
    readonly [AdmissionsApplicantInput, number, 'accepted' | 'eligible_to_apply'],
    readonly [AdmissionsApplicantInput, number],
  ]
> = [
  [
    'tau-digital-sciences-live',
    [TAU_DIGITAL_ACCEPTED_APPLICANT, 664, 'accepted'],
    [TAU_DIGITAL_BELOW_APPLICANT, 598],
  ],
  [
    'tau-digital-sciences-legacy-live',
    [TAU_DIGITAL_ACCEPTED_APPLICANT, 664, 'accepted'],
    [TAU_DIGITAL_BELOW_APPLICANT, 598],
  ],
  [
    'tau-nursing-live',
    [TAU_NURSING_ACCEPTED_APPLICANT, 546, 'eligible_to_apply'],
    [TAU_NURSING_BELOW_APPLICANT, 496],
  ],
  [
    'tau-medicine-live',
    [TAU_MEDICINE_ACCEPTED_APPLICANT, 745.43, 'eligible_to_apply'],
    [TAU_MEDICINE_BELOW_APPLICANT, 628.79],
  ],
  [
    'tau-medicine-legacy-live',
    [TAU_MEDICINE_ACCEPTED_APPLICANT, 745.43, 'eligible_to_apply'],
    [TAU_MEDICINE_BELOW_APPLICANT, 628.79],
  ],
  [
    'tau-physiotherapy-live',
    [TAU_PHYSIOTHERAPY_ACCEPTED_APPLICANT, 689.22, 'eligible_to_apply'],
    [TAU_PHYSIOTHERAPY_BELOW_APPLICANT, 639.19],
  ],
  [
    'tau-psychology-live',
    [TAU_STANDARD_ACCEPTED_APPLICANT, 679, 'accepted'],
    [
      {
        ...TAU_STANDARD_ACCEPTED_APPLICANT,
        bagrutAverage: 105,
        bagrutSubjectRecord: tauRecord(4, 80, 88, 90, 86),
      },
      654,
    ],
  ],
  [
    'tau-psychology-legacy-live',
    [TAU_STANDARD_ACCEPTED_APPLICANT, 679, 'accepted'],
    [
      {
        ...TAU_STANDARD_ACCEPTED_APPLICANT,
        bagrutAverage: 105,
        bagrutSubjectRecord: tauRecord(4, 80, 88, 90, 86),
      },
      654,
    ],
  ],
  [
    'tau-social-work-live',
    [TAU_SOCIAL_WORK_ACCEPTED_APPLICANT, 679, 'accepted'],
    [TAU_SOCIAL_WORK_BELOW_APPLICANT, 496],
  ],
  [
    'tau-social-work-legacy-live',
    [TAU_SOCIAL_WORK_ACCEPTED_APPLICANT, 679, 'accepted'],
    [TAU_SOCIAL_WORK_BELOW_APPLICANT, 496],
  ],
  ...[
    'tau-law-live',
    'tau-law-legacy-live',
    'tau-architecture-live',
    'tau-biology-live',
    'tau-biology-legacy-live',
  ].map(
    (targetId) =>
      [
        targetId,
        [TAU_STANDARD_ACCEPTED_APPLICANT, 679, 'accepted'],
        [TAU_STANDARD_BELOW_620_APPLICANT, 548],
      ] as const,
  ),
  ...['tau-accounting-live', 'tau-accounting-legacy-live'].map(
    (targetId) =>
      [
        targetId,
        [TAU_STANDARD_ACCEPTED_APPLICANT, 677, 'accepted'],
        [TAU_STANDARD_BELOW_620_APPLICANT, 577],
      ] as const,
  ),
  ...[
    'tau-communication-live',
    'tau-political-science-live',
    'tau-education-live',
    'tau-economics-live',
    'tau-economics-legacy-live',
  ].map(
    (targetId) =>
      [
        targetId,
        [TAU_STANDARD_ACCEPTED_APPLICANT, 679, 'accepted'],
        [TAU_STANDARD_BELOW_520_APPLICANT, 496],
      ] as const,
  ),
  ...[
    'tau-cs-live',
    'tau-cs-legacy-live',
    'tau-ee-live',
    'tau-ee-legacy-live',
    'tau-me-live',
    'tau-me-legacy-live',
    'tau-occupational-live',
    'tau-occupational-legacy-live',
    'tau-industrial-live',
  ].map(
    (targetId) =>
      [
        targetId,
        [TAU_ENGINEERING_ACCEPTED_APPLICANT, 730, 'accepted'],
        [TAU_STANDARD_BELOW_520_APPLICANT, 496],
      ] as const,
  ),
  ...['tau-business-live', 'tau-business-legacy-live'].map(
    (targetId) =>
      [
        targetId,
        [TAU_BUSINESS_ACCEPTED_APPLICANT, 677, 'accepted'],
        [TAU_BUSINESS_BELOW_APPLICANT, 577],
      ] as const,
  ),
];

function capturedTauFixtures(
  targetId: string,
  accepted: readonly [AdmissionsApplicantInput, number, 'accepted' | 'eligible_to_apply'],
  below: readonly [AdmissionsApplicantInput, number],
): OfficialProgramProofCapture[] {
  return [
    {
      captureId: `${targetId}:official-eligible:2026-07-31T10:11:16.543Z`,
      capturedAt: TAU_CAPTURED_AT,
      officialUrl: TAU_OFFICIAL_URL,
      applicant: accepted[0],
      expected: { score: accepted[1], verdict: accepted[2] },
    },
    {
      captureId: `${targetId}:official-below:2026-07-31T10:11:16.543Z`,
      capturedAt: TAU_CAPTURED_AT,
      officialUrl: TAU_OFFICIAL_URL,
      applicant: below[0],
      expected: { score: below[1], verdict: 'below' },
    },
  ];
}

function tauRecord(
  mathUnits: number,
  mathGrade: number,
  englishGrade: number,
  historyGrade: number,
  bibleGrade: number,
) {
  return {
    schemaVersion: 1 as const,
    sector: 'jewish' as const,
    subjects: [
      { subjectId: 'mathematics', units: mathUnits, grade: mathGrade },
      { subjectId: 'english', units: 5, grade: englishGrade },
      { subjectId: 'history', units: 2, grade: historyGrade },
      { subjectId: 'bible', units: 2, grade: bibleGrade },
    ],
  };
}

Object.assign(
  OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID,
  Object.fromEntries(
    TAU_CAPTURED_TARGETS.map(([targetId, accepted, below]) => [
      targetId,
      capturedTauFixtures(targetId, accepted, below),
    ]),
  ),
);

function technionRecord(grade: number) {
  return {
    schemaVersion: 1 as const,
    sector: 'jewish' as const,
    subjects: [
      { subjectId: 'english', units: 5, grade },
      { subjectId: 'literature', units: 2, grade },
      { subjectId: 'mathematics', units: 5, grade },
      { subjectId: 'bible', units: 2, grade },
      { subjectId: 'civics', units: 2, grade },
      { subjectId: 'hebrew_expression', units: 2, grade },
      { subjectId: 'history', units: 2, grade },
      { subjectId: 'hebrew', units: 2, grade },
    ],
  };
}
