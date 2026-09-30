import { gunzipSync } from 'node:zlib';
import { isHujiMedicineProgram } from '@/lib/hujiMedicineInputs';
import {
  HUJI_MEDICINE_CALCULATOR_URL,
  HUJI_MEDICINE_REQUIREMENTS_URL,
  HUJI_MEDICINE_POLICY,
  resolveHujiMedicineAdmission,
} from '@/server/admissions/hujiMedicinePolicy';
import { HUJI_MEDICINE_SOURCE_FINGERPRINT } from '@/data/admissions/hujiMedicineVerification';

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

const MAX_HUJI_COMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_HUJI_DECOMPRESSED_BYTES = 8 * 1024 * 1024;

export async function runHujiAdmissionsProof(
  context: AdmissionsAdapterContext,
): Promise<AdmissionsSourceProof> {
  const fetcher = context.fetcher ?? fetch;
  const program = context.program;
  if (!program) throw new Error('HUJI adapter requires a program context');
  if (isHujiMedicineProgram(program.id)) return runMedicineProof(context);

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
    if (!track || !year)
      throw new Error(`HUJI track ${trackNumber} was not found in the official JSON`);

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
    const derivedVerdict =
      selectedScore >= acceptanceThreshold
        ? 'accepted'
        : selectedScore < rejectionThreshold
          ? 'below'
          : 'pending';
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
        'derivedVerdict',
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
        publicationMetric: 'formula_score',
        derivedVerdict,
        proofStatus: 'succeeded',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
        sourceFingerprint,
      },
      limitations: [
        'Proof applies to the explicitly matched HUJI track number and current cycle thresholds.',
      ],
      nextAction:
        'Keep the track mapping, formula coefficients, thresholds, fixtures, and source fingerprint under review.',
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
      nextAction:
        'Retry the official HUJI JSON proof and inspect the source shape before publishing.',
      errorReason: error instanceof Error ? error.message : String(error),
      rawResponseMetadata: metadata,
    };
  }
}

async function runMedicineProof(context: AdmissionsAdapterContext): Promise<AdmissionsSourceProof> {
  const program = context.program!;
  const metadata: NonNullable<AdmissionsSourceProof['rawResponseMetadata']> = [];
  const base = {
    id: program.targetId ?? `huji-${program.id}-live`,
    institutionId: 'huji',
    institutionName: 'Hebrew University of Jerusalem',
    officialUrl: HUJI_MEDICINE_CALCULATOR_URL,
    adapterId: 'huji' as const,
    rawResponseMetadata: metadata,
  };
  try {
    if (program.externalId !== '601-4601')
      throw new Error(
        'Medicine requires ordinary track601-4601; no alternate track may be substituted.',
      );
    const response = await (context.fetcher ?? fetch)(HUJI_MEDICINE_CALCULATOR_URL);
    metadata.push(readOfficialResponseMetadata(HUJI_MEDICINE_CALCULATOR_URL, response));
    if (!response.ok) throw new Error(`Medicine calculator returned HTTP${response.status}`);
    const html = (await readBoundedBody(response, MAX_HUJI_COMPRESSED_BYTES)).toString('utf8');
    if (!matchesCurrentMedicineCalculator(html))
      throw new Error(
        'Current Medicine calculator coefficients, rounding or cycle no longer match the reviewed source.',
      );
    const result = resolveHujiMedicineAdmission(
      context.applicant.psychometric,
      context.applicant.extraInputs,
    );
    return {
      ...base,
      capability: result.status === 'decided' ? 'decision_capable' : 'blocked',
      proofLevel: result.status === 'decided' ? 'exact_official' : 'partial_official',
      status: result.status === 'decided' ? 'succeeded' : 'partial',
      sourceClass: 'official_html',
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: HUJI_MEDICINE_SOURCE_FINGERPRINT,
      reproducedFields: [
        'selectedScore',
        'cognitiveScore',
        'medicineStage',
        'acceptanceThreshold',
        'derivedVerdict',
      ],
      normalizedPayload: {
        pairId: program.pairId,
        programId: program.id,
        trackNumber: '601-4601',
        source: 'huji_medicine_current_calculator',
        selectedScore: result.score,
        cognitiveScore: result.cognitiveScore,
        medicineStage: result.stage,
        // Publish the final programme cutoff; the applicant-specific stage threshold stays separate.
        acceptanceThreshold: HUJI_MEDICINE_POLICY.finalCutoff,
        rejectionThreshold: null,
        medicineThreshold: result.threshold,
        derivedVerdict: result.decision ?? 'unknown',
        proofStatus: result.status === 'decided' ? 'succeeded' : 'partial',
        proofLevel: result.status === 'decided' ? 'exact_official' : 'partial_official',
        medicineStatus: result.status,
        requiredInputs: result.missing,
        medicineReasons: result.reasons,
        publicationMetric: 'formula_score',
        sourceFingerprint: HUJI_MEDICINE_SOURCE_FINGERPRINT,
        decisionProvenance: 'verified_derivation',
      },
      limitations: [
        'Published prerequisites and stage-specific cutoffs are composed with the dedicated calculator; final institutional selection remains required.',
        ...result.reasons,
      ],
      nextAction:
        result.status === 'manual'
          ? 'Obtain the specific official admissions clarification.'
          : 'Complete the stage-specific applicant facts and keep the current policy under reviewed publication.',
    };
  } catch (error) {
    return {
      ...base,
      capability: 'blocked',
      proofLevel: 'blocked',
      status: 'failed',
      sourceClass: 'browser_required',
      reproducedFields: [],
      normalizedPayload: {},
      limitations: ['Current Medicine calculator could not be verified.'],
      nextAction: `Review ${HUJI_MEDICINE_REQUIREMENTS_URL} and the current calculator.`,
      errorReason: error instanceof Error ? error.message : String(error),
    };
  }
}

function matchesCurrentMedicineCalculator(html: string): boolean {
  if (!html.includes('2026-2027')) return false;
  const normalized = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\s/g, '');
  if (!normalized.includes('varmin_psych=700;')) return false;
  // Verify each function's arithmetic independently; never execute fetched scripts.
  const expected: Record<string, string> = {
    'a(bag,psy)':
      'varB=3.9630*bag-20.0621;varP=0.032073*psy+0.3672;varX=0.3*B+0.7*P;varY=Math.floor((1.2235*X-4.4598+0.0005)*1000)/1000;',
    'c(mechina,psy)':
      'varB=3.9261*mechina-15.9285;varP=0.032073*psy+0.3672;varX=0.5*B+0.5*P;varY=Math.floor((1.2422*X-4.7609+0.0005)*1000)/1000;',
    'd(mechina,psy)':
      'varB=3.6201*mechina-12.1296;varP=0.032073*psy+0.3672;varX=0.5*B+0.5*P;varY=Math.floor((1.2422*X-4.7609+0.0005)*1000)/1000;',
    'b(mesh,m)':
      'varY=mesh;varM=0.0290*m+19.9393;varS=Math.floor(((0.6*M+0.4*Y)+0.0005)*1000)/1000;',
  };
  return Object.entries(expected).every(([signature, arithmetic]) => {
    const start = normalized.indexOf(`functionmed_meshuklal_func_${signature}{`);
    if (start < 0) return false;
    const bodyStart = normalized.indexOf('{', start) + 1;
    const firstValidation = normalized.indexOf('if(', bodyStart);
    const body = normalized
      .slice(bodyStart, firstValidation)
      .replace(/console\.log\([^;]*\);/g, '');
    return body === arithmetic;
  });
}

interface HujiSource {
  hogimInfoObj: Array<{
    track_number?: string;
    hog_regType?: number | string;
    track_name?: string;
  }>;
  currentYearObj: Array<{
    track_number?: string;
    safAccept?: number | string;
    safReject?: number | string;
  }>;
  formulasObj: Array<{
    formula_type?: number | string;
    formula_pet?: number | string;
    formula_avg?: number | string;
    formula_minus?: number | string;
  }>;
}

async function parseHujiJson(response: Response): Promise<HujiSource> {
  const bytes = await readBoundedBody(response, MAX_HUJI_COMPRESSED_BYTES);
  const text =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? gunzipSync(bytes, { maxOutputLength: MAX_HUJI_DECOMPRESSED_BYTES }).toString('utf8')
      : bytes.toString('utf8');
  const parsed = JSON.parse(text) as Partial<HujiSource>;
  if (
    !Array.isArray(parsed.hogimInfoObj) ||
    !Array.isArray(parsed.currentYearObj) ||
    !Array.isArray(parsed.formulasObj)
  ) {
    throw new Error('HUJI response is missing hogimInfoObj, currentYearObj, or formulasObj');
  }
  return parsed as HujiSource;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    throw new Error('HUJI response has no readable body');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new Error(`HUJI response exceeded ${maxBytes} byte compressed limit`);
    }
    chunks.push(value);
  }

  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    length,
  );
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}
