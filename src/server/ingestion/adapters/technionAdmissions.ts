import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';
import type { BagrutSubjectRecord } from '@/types';

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
  const row = html.match(
    new RegExp(
      `<tr[^>]*>\\s*<td[^>]*column-1[^>]*>\\s*${escapedTitle}[\\s\\S]*?<td[^>]*column-2[^>]*>\\s*([\\d.]+)`,
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
