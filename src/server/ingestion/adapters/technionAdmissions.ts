import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';
import type { BagrutSubjectRecord } from '@/types';
import {
  calculateTechnionArchitectureScore,
  TECHNION_ARCHITECTURE_CUTOFF,
  TECHNION_ARCHITECTURE_FORMULA,
  TECHNION_ARCHITECTURE_REQUIREMENTS_URL,
  technionArchitectureUnmetRequirements,
} from '@/server/admissions/technionArchitecturePolicy';

const TECHNION_INDEX_URL = 'https://admissions.technion.ac.il/calculator/';
const TECHNION_THRESHOLD_URL =
  'https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/';
const TECHNION_SUBMIT_URL =
  'https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php';

const TECHNION_SUBJECT_FIELDS = [
  ['english', 'yEnglish', 'english'],
  ['literature', 'yHebrew_lit', 'hebrew_lit'],
  ['mathematics', 'yMathematic', 'mathematic'],
  ['bible', 'yBible', 'bible'],
  ['civics', 'yEzrahut', 'ezrahut'],
  ['hebrew_expression', 'yHabaa', 'habaa'],
  ['history', 'yHistory', 'history'],
  ['hebrew', 'yHebrew', 'hebrew'],
] as const;

const TECHNION_OFFICIAL_TITLE_BY_PROGRAM_ID: Record<string, string> = {
  architecture: 'ארכיטקטורה',
  biomedical: 'הנדסה ביו רפואית',
  civil: 'הנדסה אזרחית',
  cs: 'מדעי המחשב',
  datascience: 'הנדסת נתונים ומידע',
  ee: 'הנדסת חשמל',
  industrial: 'הנדסת תעשיה וניהול',
  medicine: 'מדעי הרפואה - מגמת רפואה',
  me: 'הנדסת מכונות',
};

export function hasTechnionRequiredSubjectRecord(
  record: BagrutSubjectRecord | undefined,
): record is BagrutSubjectRecord {
  if (!record) return false;
  const byId = new Map(record.subjects.map((subject) => [subject.subjectId, subject]));
  return TECHNION_SUBJECT_FIELDS.every(([subjectId]) => {
    const subject = byId.get(subjectId);
    return subject && Number.isFinite(subject.units) && Number.isFinite(subject.grade);
  });
}

export async function runTechnionAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program;
  if (!program) {
    throw new Error('Technion adapter requires a program context');
  }
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];

  try {
    if (program.id === 'architecture') {
      return await runArchitectureProof(context, metadata);
    }
    const psy = context.applicant.psychometric;
    const subjectRecord = context.applicant.bagrutSubjectRecord;
    if (!hasTechnionRequiredSubjectRecord(subjectRecord)) {
      throw new Error('Technion calculator requires a complete structured Bagrut subject record');
    }

    const params = new URLSearchParams({
      bagrot: 'true',
      handesae: 'false',
      academic: 'false',
      mehinaAve: 'false',
      arc: 'arcNo',
      psychometry: String(psy),
      memuca: 'sehem',
    });
    const subjectsById = new Map(
      subjectRecord.subjects.map((subject) => [subject.subjectId, subject]),
    );
    for (const [subjectId, unitsField, gradeField] of TECHNION_SUBJECT_FIELDS) {
      const subject = subjectsById.get(subjectId)!;
      params.set(unitsField, String(subject.units));
      params.set(gradeField, String(subject.grade));
    }

    const response = await fetcher(TECHNION_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: TECHNION_INDEX_URL,
      },
      body: params.toString(),
    });

    metadata.push(readOfficialResponseMetadata(TECHNION_SUBMIT_URL, response));

    if (!response.ok) {
      throw new Error(`Technion endpoint returned HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse: הסכם לדיוני הקבלה הוא:83.9 or similar
    const sekhemMatch = html.match(/הסכם לדיוני הקבלה הוא:[\s]*([\d.]+)/i);
    const parsedSekhem = sekhemMatch ? parseOfficialNumeric(sekhemMatch[1]) : undefined;

    if (parsedSekhem === undefined) {
      throw new Error('Failed to parse Sekhem score from Technion response HTML');
    }

    const thresholdResponse = await fetcher(TECHNION_THRESHOLD_URL, {
      headers: { Referer: TECHNION_INDEX_URL },
    });
    metadata.push(readOfficialResponseMetadata(TECHNION_THRESHOLD_URL, thresholdResponse));
    if (!thresholdResponse.ok) {
      throw new Error(`Technion threshold table returned HTTP ${thresholdResponse.status}`);
    }
    const acceptanceThreshold = parseTechnionOfficialThreshold(
      await thresholdResponse.text(),
      program.id,
    );
    const exact = acceptanceThreshold !== undefined;
    const derivedVerdict = exact
      ? parsedSekhem >= acceptanceThreshold
        ? program.scoreField === 'invitation'
          ? 'eligible_to_apply'
          : 'accepted'
        : 'below'
      : undefined;

    return {
      id: program.targetId ?? 'technion-score-only',
      institutionId: 'technion',
      institutionName: 'Technion',
      officialUrl: TECHNION_INDEX_URL,
      adapterId: 'technion',
      capability: exact ? 'decision_capable' : 'score_only',
      proofLevel: exact ? 'exact_official' : 'partial_official',
      status: 'succeeded',
      sourceClass: sourceClassForCapability(exact ? 'decision_capable' : 'score_only'),
      reproducedFields: exact
        ? ['selectedScore', 'acceptanceThreshold', 'rejectionThreshold', 'derivedVerdict']
        : ['sekhemScore'],
      normalizedPayload: {
        programId: program.id,
        programName: program.name,
        source: 'technion_calculators_sum_and_cutoff_table',
        selectedScore: parsedSekhem,
        sekhemScore: parsedSekhem,
        acceptanceThreshold,
        rejectionThreshold: acceptanceThreshold,
        derivedVerdict,
        proofStatus: 'succeeded',
        proofLevel: exact ? 'exact_official' : 'partial_official',
        decisionProvenance: exact ? 'verified_derivation' : 'none',
      },
      limitations: exact
        ? [
            'The cutoff-table proof covers the numeric Sekhem threshold; programme-specific manual gates remain outside this replay.',
          ]
        : ['Calculator response can produce score fields, but proof has no official thresholds'],
      nextAction: exact
        ? 'Keep the calculator input mapping, current cutoff table, fixtures, and source fingerprint under review'
        : 'Pair calculator output with a reviewed official threshold source',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedTechnionProof(error, metadata, program);
  }
}

async function runArchitectureProof(
  context: AdmissionsAdapterContext,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
): Promise<AdmissionsSourceProof> {
  const inputs = context.applicant.extraInputs ?? {};
  const unmet = technionArchitectureUnmetRequirements(inputs);
  if (unmet.length)
    throw new Error(`Architecture requirements are unconfirmed: ${unmet.join('; ')}`);
  const score = calculateTechnionArchitectureScore(
    inputs.technionArchitectureBagrutAverage ?? NaN,
    context.applicant.psychometric,
    inputs.technionArchitectureExamScore ?? NaN,
  );
  const urls = [
    TECHNION_INDEX_URL,
    TECHNION_THRESHOLD_URL,
    TECHNION_ARCHITECTURE_REQUIREMENTS_URL,
    'https://admissions.technion.ac.il/english-exam/',
    'https://admissions.technion.ac.il/knowledge-of-hebrew/',
  ];
  const pages = await Promise.all(
    urls.map(async (url) => {
      const response = await (context.fetcher ?? fetch)(url);
      metadata.push(readOfficialResponseMetadata(url, response));
      if (!response.ok)
        throw new Error(`Technion Architecture source returned HTTP ${response.status}`);
      return response.text();
    }),
  );
  const match = pages[0].match(/new GFCalc\(73,\s*(\[[\s\S]*?\])\)/);
  const fields: Array<{ field_id: number; formula: string; rounding: string }> = match
    ? JSON.parse(match[1])
    : [];
  const result = fields.find((field) => field.field_id === 5);
  const formula = result?.formula
    .replace(/\{[^{}]*:(1|3|8)\}/g, (_, id: string) => ({ '1': 'D', '3': 'P', '8': 'A' })[id]!)
    .replace(/\s/g, '');
  if (formula !== TECHNION_ARCHITECTURE_FORMULA || result?.rounding !== '1') {
    throw new Error(
      'Architecture official formula or rounding changed; review the contract before calculating',
    );
  }
  const cutoff = parseTechnionOfficialThreshold(pages[1], 'architecture');
  const plain = (html: string) =>
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/[^א-תa-zA-Z0-9]/g, '');
  const cutoffText = plain(pages[1]);
  const requirementsText = plain(pages[2]);
  if (
    cutoff !== TECHNION_ARCHITECTURE_CUTOFF ||
    !cutoffText.includes('אוקטובר2026') ||
    !cutoffText.includes('קבלהעלבסיסמקוםפנוי') ||
    !requirementsText.includes('4יחללפחותבציון70ומעלהאוציון65ומעלהב5יחל') ||
    !requirementsText.includes('בחינהבאנגליתברמהשל4יחללפחות') ||
    !requirementsText.includes('בשלישהתחתון') ||
    !plain(pages[3]).includes('ציוןאנגליתגבוהמ104') ||
    !plain(pages[4]).includes('ציוןשל121')
  ) {
    throw new Error(
      'Architecture cutoff, cycle or admission requirements changed; review current official sources',
    );
  }
  const derivedVerdict = score >= cutoff ? 'eligible_to_apply' : 'below';
  return {
    id: context.program?.targetId ?? 'technion-architecture-live',
    institutionId: 'technion',
    institutionName: 'Technion',
    officialUrl: TECHNION_INDEX_URL,
    adapterId: 'technion',
    capability: 'decision_capable',
    proofLevel: 'exact_official',
    status: 'succeeded',
    decisionProvenance: 'verified_derivation',
    sourceClass: 'api_static_json',
    reproducedFields: [
      'selectedScore',
      'acceptanceThreshold',
      'rejectionThreshold',
      'derivedVerdict',
      'admissionRequirements',
    ],
    normalizedPayload: {
      programId: 'architecture',
      officialProgramId: '73',
      admissionCycle: '2026-2027',
      source: 'technion_architecture_form73_and_cutoff_table',
      selectedScore: score,
      acceptanceThreshold: cutoff,
      rejectionThreshold: cutoff,
      derivedVerdict,
      proofStatus: 'succeeded',
      proofLevel: 'exact_official',
      decisionProvenance: 'verified_derivation',
      conditionalOnAvailablePlaces: true,
    },
    limitations: [
      'Regular Israeli Bagrut route only. Applicant confirms valid exam passing, general requirements and registration. Above-cutoff eligibility remains conditional on available places; it is not final admission.',
    ],
    nextAction: 'Confirm available places and the final decision with Technion admissions',
    rawResponseMetadata: metadata,
  };
}

export function parseTechnionOfficialThreshold(
  html: string,
  programId: string,
): number | undefined {
  const normalizedProgramId = programId.startsWith('technion_')
    ? programId.slice('technion_'.length)
    : programId;
  const officialTitle = TECHNION_OFFICIAL_TITLE_BY_PROGRAM_ID[normalizedProgramId];
  if (!officialTitle) return undefined;

  const escapedTitle = officialTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titleSuffix = normalizedProgramId === 'architecture' ? '\\s*\\*?\\s*</td>' : '';
  const row = html.match(
    new RegExp(
      `<tr[^>]*>\\s*<td[^>]*column-1[^>]*>\\s*${escapedTitle}${titleSuffix}[\\s\\S]*?<td[^>]*column-2[^>]*>\\s*([\\d.]+)`,
    ),
  );
  return row ? parseOfficialNumeric(row[1]) : undefined;
}

function failedTechnionProof(
  error: unknown,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
  program?: AdmissionsAdapterContext['program'],
): AdmissionsSourceProof {
  return {
    id: program?.targetId ?? 'technion-score-only',
    institutionId: 'technion',
    institutionName: 'Technion',
    officialUrl: TECHNION_INDEX_URL,
    adapterId: 'technion',
    capability: 'blocked',
    proofLevel: 'blocked',
    status: 'failed',
    sourceClass: 'browser_required',
    reproducedFields: [],
    normalizedPayload: {},
    limitations: ['Live Technion request failed during proof run'],
    nextAction: 'Retry live proof and inspect response shape before promoting adapter',
    errorReason: error instanceof Error ? error.message : String(error),
    rawResponseMetadata: metadata,
  };
}
