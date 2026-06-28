import {
  parseOfficialNumeric,
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';

const TECHNION_INDEX_URL = 'https://admissions.technion.ac.il/calculator/';
const TECHNION_SUBMIT_URL =
  'https://admissions.technion.ac.il/wp-content/plugins/technion-calculators/technion-calculators-sum.php';

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
    const bagrut = context.applicant.bagrutAverage;
    const psy = context.applicant.psychometric;

    const mathUnits = 5;
    const mathGrade = Math.round(bagrut);
    const engUnits = 5;
    const engGrade = Math.round(bagrut);

    const params = new URLSearchParams({
      bagrot: 'true',
      yEnglish: String(engUnits),
      english: String(engGrade),
      yHebrew_lit: '2',
      hebrew_lit: String(Math.round(bagrut)),
      yMathematic: String(mathUnits),
      mathematic: String(mathGrade),
      yBible: '2',
      bible: String(Math.round(bagrut)),
      yEzrahut: '2',
      ezrahut: String(Math.round(bagrut)),
      yHabaa: '2',
      habaa: String(Math.round(bagrut)),
      yHistory: '2',
      history: String(Math.round(bagrut)),
      yHebrew: '2',
      hebrew: String(Math.round(bagrut)),
      handesae: 'false',
      academic: 'false',
      mehinaAve: 'false',
      arc: 'arcNo',
      psychometry: String(psy),
      memuca: 'sehem',
    });

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

    return {
      id: 'technion-score-only',
      institutionId: 'technion',
      institutionName: 'Technion',
      officialUrl: TECHNION_INDEX_URL,
      adapterId: 'technion',
      capability: 'score_only',
      proofLevel: 'partial_official',
      status: 'succeeded',
      sourceClass: sourceClassForCapability('score_only'),
      reproducedFields: ['sekhemScore'],
      normalizedPayload: {
        programId: program.id,
        programName: program.name,
        source: 'technion_calculators_sum',
        sekhemScore: parsedSekhem,
      },
      limitations: [
        'Calculator response can produce score fields, but proof has no official thresholds',
      ],
      nextAction: 'Pair calculator output with a reviewed official threshold source',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return failedTechnionProof(error, metadata);
  }
}

function failedTechnionProof(
  error: unknown,
  metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']>,
): AdmissionsSourceProof {
  return {
    id: 'technion-score-only',
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
