import { createHash } from 'node:crypto';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import type { OfficialProgramProofCapture } from './officialProgramProofCaptures';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

export const TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/exact/ba/computer?v=requirements';
export const TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/ba/admissions';
export const TAU_COMPUTER_SCIENCE_GRAPHQL_URL = 'https://go.tau.ac.il/graphql';
export const TAU_COMPUTER_SCIENCE_TARGET_ID = 'tau-cs-live';
export const TAU_COMPUTER_SCIENCE_NODE_ID = 8220;
export const TAU_COMPUTER_SCIENCE_PROGRAM_IDS = ['036811010000', '036811040455'] as const;
export const TAU_COMPUTER_SCIENCE_SCORE_FIELD = 'hatama_meduyakim';
export const TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF = 705;
export const TAU_COMPUTER_SCIENCE_REJECTION_CUTOFF = 704;
export const TAU_COMPUTER_SCIENCE_ADMISSION_CYCLE = '2026-2027';
export const TAU_COMPUTER_SCIENCE_REGISTRATION_COMMENTS: string | null = null;

const CAPTURED_AT = '2026-09-27T07:03:28.000Z';

export const TAU_COMPUTER_SCIENCE_REVIEWED_REQUIREMENTS_TEXT = normalizeRequirementText(
  [
    'הרשמה בעדיפות ראשונה התכנית נבחרה בעדיפות ראשונה',
    'פסיכומטרי ציון 660 לפחות או תואר בוגר (תואר ראשון) ממוסד אקדמי מוכר ע"י המל"ג בתחום מדעים מדויקים או הנדסה, בציון 80 ומעלה. על התוכנית לכלול קורסי בסיס מתמטיים שקולים ברמתם ובהיקפם לקורסים הנלמדים בביה"ס למדעי המחשב',
    'ידע במתמטיקה ציון 80 לפחות במתמטיקה בהיקף של 5 יח"ל או בעלי ציון 70-79 במתמטיקה בהיקף 5 יח"ל וציון של 75 לפחות בבחינת הסיווג במתמטיקה או ציון 88 לפחות במתמטיקה בהיקף של 4 יח"ל; או ציון 75-87 במתמטיקה בהיקף 4 יח"ל וציון של 75 לפחות ב בחינת הסיווג במתמטיקה',
    'ציון התאמה מדעים מדוייקים-מועמד שנבחן ב-5 יח"ל במתמטיקה ובפיזיקה בציון 55 לפחות בכל אחד מהם, יקבל תוספת של 10 נקודות בונוס לציון ההתאמה הרגיל.',
    'תעודת בגרות ישראלית או תעודת סיום תיכון מחו"ל לפרוט ידיעת השפה העברית לפרוט ידיעת השפה האנגלית',
    'תנאי הקבלה הכלליים ובגרות ישראלית נדרשים לאישור המועמד.',
  ].join(' '),
);
export const TAU_COMPUTER_SCIENCE_REVIEWED_ENGLISH_REQUIREMENT_TEXT = normalizeRequirementText(
  "כל המועמדות והמועמדים נדרשים להגיע לרמת מתקדמים א' לפחות באנגלית (100 נקודות במבחן המיון באנגלית במסגרת הבחינה הפסיכומטרית או בחינת אמיר\"ם ) ולרמת פטור עד סוף שנה א' ללימודים",
);
export const TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENT_MINIMUM = Number(
  TAU_COMPUTER_SCIENCE_REVIEWED_ENGLISH_REQUIREMENT_TEXT.match(/\((\d+) נקודות/)?.[1],
);

export interface TauComputerScienceSourceSnapshot {
  nodeId: number;
  programIds: readonly string[];
  scoreField: string;
  acceptanceCutoff: number;
  rejectionCutoff: number;
  registrationComments: string | null;
  criticalRequirementsText: string;
  englishRequirementText: string;
}

export function fingerprintTauComputerScienceSource(
  snapshot: TauComputerScienceSourceSnapshot,
): string {
  const normalized = {
    source: TAU_COMPUTER_SCIENCE_GRAPHQL_URL,
    requirementsUrl: TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL,
    englishRequirementsUrl: TAU_COMPUTER_SCIENCE_ENGLISH_REQUIREMENTS_URL,
    nodeId: snapshot.nodeId,
    programIds: [...snapshot.programIds].sort(),
    scoreField: snapshot.scoreField,
    acceptanceCutoff: snapshot.acceptanceCutoff,
    rejectionCutoff: snapshot.rejectionCutoff,
    registrationComments: snapshot.registrationComments,
    criticalRequirementsText: normalizeRequirementText(snapshot.criticalRequirementsText),
    englishRequirementText: normalizeRequirementText(snapshot.englishRequirementText),
  };
  return `sha256:${createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`;
}

export function extractTauComputerScienceCriticalRequirements(html: string): string | undefined {
  const text = normalizeRequirementText(stripTauHtml(html));
  const requirementsStart = text.indexOf('תנאים בסיסיים מצטברים לקבלה');
  if (requirementsStart < 0) return undefined;

  const firstChoiceStart = text.indexOf('הרשמה בעדיפות ראשונה', requirementsStart);
  const psychometricStart = text.indexOf('פסיכומטרי', firstChoiceStart);
  const mathematicsStart = text.indexOf('ידע במתמטיקה', psychometricStart);
  const mathematicsEnd = text.indexOf('הנתונים שלך לא עומדים בדרישות', mathematicsStart);
  const requirementsEnd = text.indexOf('אפיקי קבלה', requirementsStart);
  const bonusStart = text.indexOf('ציון התאמה מדעים מדוייקים-', requirementsEnd);
  if (
    firstChoiceStart < 0 ||
    psychometricStart < 0 ||
    mathematicsStart < 0 ||
    mathematicsEnd < 0 ||
    requirementsEnd < 0 ||
    bonusStart < requirementsEnd
  )
    return undefined;

  const bonusEnd = text.indexOf('הרגיל.', bonusStart);
  if (bonusEnd < 0) return undefined;

  const generalStart = text.lastIndexOf('תעודת בגרות ישראלית', requirementsStart);
  const generalEnd = text.indexOf('פרוט למידע המלא', generalStart);
  const generalText =
    generalStart >= 0 && generalEnd > generalStart
      ? text.slice(generalStart, generalEnd)
      : undefined;
  if (!generalText?.includes('ידיעת השפה העברית') || !generalText.includes('ידיעת השפה האנגלית')) {
    return undefined;
  }

  const firstChoiceText = text.slice(firstChoiceStart, psychometricStart).trim();
  const psychometricText = text.slice(psychometricStart, mathematicsStart).trim();
  const mathematicsText = text.slice(mathematicsStart, mathematicsEnd).trim();
  const bonusText = text.slice(bonusStart, bonusEnd + 'הרגיל.'.length).trim();
  if (
    !firstChoiceText.includes('נבחרה בעדיפות ראשונה') ||
    !psychometricText.includes('ציון 660 לפחות') ||
    !mathematicsText.includes('5 יח"ל') ||
    !mathematicsText.includes('4 יח"ל') ||
    !bonusText.includes('מתמטיקה ובפיזיקה') ||
    !bonusText.includes('55 לפחות') ||
    !bonusText.includes('10 נקודות בונוס')
  ) {
    return undefined;
  }

  return normalizeRequirementText(
    `${firstChoiceText} ${psychometricText} ${mathematicsText} ${bonusText} ${generalText} תנאי הקבלה הכלליים ובגרות ישראלית נדרשים לאישור המועמד.`,
  );
}

export function extractTauGeneralEnglishRequirement(html: string): string | undefined {
  const text = normalizeRequirementText(stripTauHtml(html));
  const englishSectionStart = text.indexOf('ב. ידיעת השפה');
  const hebrewSectionStart = text.indexOf('ג. ידיעת השפה העברית', englishSectionStart);
  const requirementStart = text.indexOf('כל המועמדות והמועמדים נדרשים להגיע', englishSectionStart);
  const requirementEnd = text.indexOf('ללימודים', requirementStart);
  if (
    englishSectionStart < 0 ||
    hebrewSectionStart < 0 ||
    requirementStart < englishSectionStart ||
    requirementEnd < requirementStart ||
    requirementEnd > hebrewSectionStart
  ) {
    return undefined;
  }

  const requirement = text.slice(requirementStart, requirementEnd + 'ללימודים'.length);
  if (!requirement.includes('מתקדמים א') || !/\(\d+ נקודות/.test(requirement)) {
    return undefined;
  }
  return normalizeRequirementText(requirement);
}

function stripTauHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    );
}

function normalizeRequirementText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export const TAU_COMPUTER_SCIENCE_REVIEWED_NODE_RULE_RECORD = {
  nodeId: TAU_COMPUTER_SCIENCE_NODE_ID,
  programIds: TAU_COMPUTER_SCIENCE_PROGRAM_IDS,
  scoreField: TAU_COMPUTER_SCIENCE_SCORE_FIELD,
  acceptanceCutoff: TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF,
  rejectionCutoff: TAU_COMPUTER_SCIENCE_REJECTION_CUTOFF,
  registrationComments: TAU_COMPUTER_SCIENCE_REGISTRATION_COMMENTS,
  criticalRequirementsText: TAU_COMPUTER_SCIENCE_REVIEWED_REQUIREMENTS_TEXT,
  englishRequirementText: TAU_COMPUTER_SCIENCE_REVIEWED_ENGLISH_REQUIREMENT_TEXT,
} as const;

export const TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT = fingerprintTauComputerScienceSource(
  TAU_COMPUTER_SCIENCE_REVIEWED_NODE_RULE_RECORD,
);

const COMPUTER_SCIENCE_SUBJECT_RECORD = {
  schemaVersion: 1 as const,
  sector: 'jewish' as const,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 85 },
    { subjectId: 'physics', units: 4, grade: 70 },
    { subjectId: 'english', units: 5, grade: 85 },
  ],
};

export const TAU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES: readonly OfficialProgramProofCapture[] =
  [
    {
      captureId: `${TAU_COMPUTER_SCIENCE_TARGET_ID}:official-accepted:2026-09-27`,
      capturedAt: CAPTURED_AT,
      officialUrl: TAU_COMPUTER_SCIENCE_GRAPHQL_URL,
      applicant: {
        psychometric: 730,
        bagrutAverage: 115,
        bagrutSubjectRecord: COMPUTER_SCIENCE_SUBJECT_RECORD,
        extraInputs: {
          psychometricEnglish: 110,
          bagrutSubjectRecord: COMPUTER_SCIENCE_SUBJECT_RECORD,
          tauBagrutAverage: 115,
          tauApplicationRequirementsConfirmed: true,
        },
      },
      expected: { score: 730, verdict: 'accepted' },
    },
    {
      captureId: `${TAU_COMPUTER_SCIENCE_TARGET_ID}:official-below:2026-09-27`,
      capturedAt: CAPTURED_AT,
      officialUrl: TAU_COMPUTER_SCIENCE_GRAPHQL_URL,
      applicant: {
        psychometric: 660,
        bagrutAverage: 100,
        bagrutSubjectRecord: COMPUTER_SCIENCE_SUBJECT_RECORD,
        extraInputs: {
          psychometricEnglish: 110,
          bagrutSubjectRecord: COMPUTER_SCIENCE_SUBJECT_RECORD,
          tauBagrutAverage: 100,
          tauApplicationRequirementsConfirmed: true,
        },
      },
      expected: { score: 618, verdict: 'below' },
    },
  ];

function fixtureFromCapture(capture: OfficialProgramProofCapture): AdmissionsVerificationFixture {
  const { applicant, expected } = capture;
  return {
    id: capture.captureId,
    pairId: 'cs__tau',
    admissionCycle: TAU_COMPUTER_SCIENCE_ADMISSION_CYCLE,
    verdict: expected.verdict,
    input: {
      psychometric: applicant.psychometric,
      bagrut: applicant.bagrutAverage,
      psychometricEnglish: applicant.extraInputs?.psychometricEnglish,
      tauBagrutAverage: applicant.extraInputs?.tauBagrutAverage,
      tauApplicationRequirementsConfirmed:
        applicant.extraInputs?.tauApplicationRequirementsConfirmed,
      bagrutSubjectRecord: applicant.bagrutSubjectRecord,
    },
    expected,
    sourceFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
    capturedAt: capture.capturedAt,
  };
}

export const TAU_COMPUTER_SCIENCE_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_COMPUTER_SCIENCE_OFFICIAL_PROOF_CAPTURES.map(fixtureFromCapture);

export const TAU_COMPUTER_SCIENCE_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'cs__tau',
  programId: 'cs',
  institutionId: 'tau',
  officialProgramId: TAU_COMPUTER_SCIENCE_PROGRAM_IDS[0],
  admissionCycle: TAU_COMPUTER_SCIENCE_ADMISSION_CYCLE,
  source: {
    targetId: TAU_COMPUTER_SCIENCE_TARGET_ID,
    url: TAU_COMPUTER_SCIENCE_GRAPHQL_URL,
  },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_meduyakim',
    requiredInputs: ['bagrut_subject_record', 'tau_bagrut_average', 'tau_application_requirements'],
    cutoff: {
      acceptance: TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF,
      rejection: TAU_COMPUTER_SCIENCE_REJECTION_CUTOFF,
    },
    gates: [
      {
        id: 'tau-cs:first-choice',
        kind: 'manual',
        field: 'tauApplicationRequirementsConfirmed',
        description:
          'The current Computer Science page requires the program to be the applicant’s first choice.',
      },
      {
        id: 'tau-cs:psychometric-minimum',
        kind: 'minimum',
        field: 'psychometric',
        minimum: 660,
        description:
          'The current Computer Science page requires a psychometric score of at least 660.',
      },
      {
        id: 'tau-cs:mathematics-route',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        description:
          'Mathematics must meet one of the published 5-unit or 4-unit routes, including placement-exam conditions where stated.',
      },
      {
        id: 'tau-cs:exact-sciences-bonus',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        minimum: 55,
        description:
          'The exact-sciences bonus is 10 points only for 5-unit mathematics and physics grades of at least 55 in each.',
      },
      {
        id: 'tau-cs:english-advanced-a',
        kind: 'manual',
        field: 'tauApplicationRequirementsConfirmed',
        description:
          'Confirm Advanced A English: at least 100 through the psychometric English section or a separate English placement exam.',
      },
      {
        id: 'tau-cs:general-admission-confirmation',
        kind: 'manual',
        field: 'tauApplicationRequirementsConfirmed',
        description:
          'Israeli Bagrut and TAU general Hebrew and admission requirements must be confirmed.',
      },
      {
        id: 'tau-cs:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Academic-degree and other alternative routes remain manual.',
      },
    ],
  },
  fixtureIds: TAU_COMPUTER_SCIENCE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_COMPUTER_SCIENCE_FIXTURES),
  sourceFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: CAPTURED_AT,
    sourceFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
  },
};

export const TAU_LEGACY_COMPUTER_SCIENCE_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_COMPUTER_SCIENCE_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('cs__tau', 'tau_cs__tau'),
    pairId: 'tau_cs__tau',
  }));

export const TAU_LEGACY_COMPUTER_SCIENCE_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_COMPUTER_SCIENCE_CONTRACT,
  pairId: 'tau_cs__tau',
  programId: 'tau_cs',
  source: { ...TAU_COMPUTER_SCIENCE_CONTRACT.source, targetId: 'tau-cs-legacy-live' },
  fixtureIds: TAU_LEGACY_COMPUTER_SCIENCE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_LEGACY_COMPUTER_SCIENCE_FIXTURES),
};

export const TAU_COMPUTER_SCIENCE_PROGRAM_VERIFICATION_ARTIFACTS = {
  cs__tau: {
    contract: TAU_COMPUTER_SCIENCE_CONTRACT,
    fixtures: TAU_COMPUTER_SCIENCE_FIXTURES,
  },
  tau_cs__tau: {
    contract: TAU_LEGACY_COMPUTER_SCIENCE_CONTRACT,
    fixtures: TAU_LEGACY_COMPUTER_SCIENCE_FIXTURES,
  },
};
