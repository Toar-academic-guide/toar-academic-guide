import { gunzipSync } from 'node:zlib';

import {
  readOfficialResponseMetadata,
  sourceClassForCapability,
  type AdmissionsAdapterContext,
  type AdmissionsSourceProof,
} from '../admissionsSourceAdapters';
import {
  getHujiProgramConfig,
  hujiSourceFingerprint,
  HUJI_SOURCE_URL,
} from '@/data/admissions/hujiProgramVerification';

export async function runHujiAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program;
  if (!program) throw new Error('HUJI adapter requires a program context');

  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const targetId = program.targetId ?? `huji-${program.id}-live`;

  try {
    const response = await fetcher(HUJI_SOURCE_URL);
    metadata.push(readOfficialResponseMetadata(HUJI_SOURCE_URL, response));
    if (!response.ok) throw new Error(`HUJI endpoint returned HTTP ${response.status}`);

    const source = await parseHujiJson(response);
    const trackNumber = program.externalId;
    if (!trackNumber) throw new Error('HUJI target is missing its track number');

    const track = source.hogimInfoObj.find((entry) => entry.track_number === trackNumber);
    const year = source.currentYearObj.find((entry) => entry.track_number === trackNumber);
    if (!track || !year) throw new Error(`HUJI track ${trackNumber} was not found in the official JSON`);

    const formulaType = Number(track.hog_regType) as 1 | 2;
    const formula = source.formulasObj.find((entry) => Number(entry.formula_type) === formulaType);
    if (!formula) throw new Error(`HUJI formula type ${track.hog_regType} was not found`);

    const acceptanceThreshold = parseNumber(year.safAccept);
    const rejectionThreshold = parseNumber(year.safReject);
    if (acceptanceThreshold === undefined || rejectionThreshold === undefined) {
      throw new Error(`HUJI track ${trackNumber} has no numeric decision thresholds`);
    }

    const formulaPet = parseNumber(formula.formula_pet);
    const formulaAverage = parseNumber(formula.formula_avg);
    const formulaMinus = parseNumber(formula.formula_minus);
    if (formulaPet === undefined || formulaAverage === undefined || formulaMinus === undefined) {
      throw new Error(`HUJI formula type ${formulaType} has non-numeric coefficients`);
    }
    const selectedScore =
      formulaPet * context.applicant.psychometric +
      formulaAverage * context.applicant.bagrutAverage -
      formulaMinus;
    const officialVerdict =
      selectedScore >= acceptanceThreshold
        ? 'accepted'
        : selectedScore < rejectionThreshold
          ? 'below'
          : 'waiting';
    const config = getHujiProgramConfig(program.id);
    const sourceFingerprint = hujiSourceFingerprint(config);

    return {
      id: targetId,
      institutionId: 'huji',
      institutionName: 'Hebrew University of Jerusalem',
      officialUrl: HUJI_SOURCE_URL,
      adapterId: 'huji',
      capability: 'decision_capable',
      proofLevel: 'exact_official',
      status: 'succeeded',
      sourceClass: sourceClassForCapability('decision_capable'),
      reproducedFields: [
        'selectedScore',
        'acceptanceThreshold',
        'rejectionThreshold',
        'officialVerdict',
      ],
      normalizedPayload: {
        pairId: program.pairId,
        programId: program.id,
        programName: program.name,
        source: 'huji_static_json',
        trackNumber,
        formulaType,
        selectedScore,
        acceptanceThreshold,
        rejectionThreshold,
        officialVerdict,
        sourceFingerprint,
      },
      limitations: ['Proof applies to the explicitly matched HUJI track number and current cycle thresholds.'],
      nextAction: 'Keep the track mapping, formula coefficients, thresholds, fixtures, and source fingerprint under review.',
      rawResponseMetadata: metadata,
    };
  } catch (error) {
    return {
      id: targetId,
      institutionId: 'huji',
      institutionName: 'Hebrew University of Jerusalem',
      officialUrl: HUJI_SOURCE_URL,
      adapterId: 'huji',
      capability: 'blocked',
      proofLevel: 'blocked',
      status: 'failed',
      sourceClass: 'browser_required',
      reproducedFields: [],
      normalizedPayload: {},
      limitations: ['HUJI official JSON could not be parsed during the proof run.'],
      nextAction: 'Retry the official HUJI JSON proof and inspect the source shape before publishing.',
      errorReason: error instanceof Error ? error.message : String(error),
      rawResponseMetadata: metadata,
    };
  }
}

interface HujiSource {
  hogimInfoObj: Array<{ track_number?: string; hog_regType?: number | string; track_name?: string }>;
  currentYearObj: Array<{ track_number?: string; safAccept?: number | string; safReject?: number | string }>;
  formulasObj: Array<{
    formula_type?: number | string;
    formula_pet?: number | string;
    formula_avg?: number | string;
    formula_minus?: number | string;
  }>;
}

async function parseHujiJson(response: Response): Promise<HujiSource> {
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes[0] === 0x1f && bytes[1] === 0x8b
    ? gunzipSync(bytes).toString('utf8')
    : bytes.toString('utf8');
  const parsed = JSON.parse(text) as Partial<HujiSource>;
  if (!Array.isArray(parsed.hogimInfoObj) || !Array.isArray(parsed.currentYearObj) || !Array.isArray(parsed.formulasObj)) {
    throw new Error('HUJI response is missing hogimInfoObj, currentYearObj, or formulasObj');
  }
  return parsed as HujiSource;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}
