import { createHash } from 'node:crypto';
import captures from '../../../docs/admissions-verification/2026-09-27-bgu-engineering-live-proof.json';
import controlledProof from '../../../docs/admissions-verification/2026-09-27-bgu-engineering-controlled-proof.json';
import formCapture from './bguEngineeringFormCapture.json';
import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import {
  BGU_ENGINEERING_PROGRAMS,
  BGU_ENGINEERING_SCORE_URL,
  BGU_ENGINEERING_CALCULATOR_URL,
  type BguEngineeringProgramId,
} from '@/server/admissions/bguEngineeringPolicy';
import type { OfficialProgramProofCapture } from './officialProgramProofCaptures';

export const BGU_ENGINEERING_GUIDE_SHA256 =
  '00a0e0c00fceaec39bb331bf8e9a005561f9b5e6decbc39eef562b7b009b9114';

function text(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : null;
}
function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeBguEngineeringRule(payload: unknown, department: number) {
  if (!payload || typeof payload !== 'object') return null;
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length !== 1 || !items[0] || typeof items[0] !== 'object')
    return null;
  const rule = items[0] as Record<string, unknown>;
  if (
    number(rule.department) !== department ||
    number(rule.path) !== 1 ||
    rule.specialization !== null ||
    text(rule.sekem_label) !== 'סכם הנדסה' ||
    number(rule.psycho_sekem) === null ||
    number(rule.psycho_value) === null ||
    !text(rule.psycho_info) ||
    !text(rule.bagrut_info) ||
    !text(rule.comments) ||
    !text(rule.reg_status) ||
    text(rule.psycho_and_or) !== 'ובנוסף'
  )
    return null;
  return {
    mapping: {
      department,
      path: 1,
      specialization: null,
      year: 2027,
      semester: 1,
      degreeLevel: 1,
      label: 'סכם הנדסה',
    },
    acceptanceThreshold: number(rule.psycho_sekem)!,
    minimumPsychometric: number(rule.psycho_value)!,
    psychometricInfo: text(rule.psycho_info),
    bagrutInfo: text(rule.bagrut_info),
    directAverage: number(rule.bagrut_average),
    additional: text(rule.bagrut_additional),
    comments: text(rule.comments),
    registrationStatus: text(rule.reg_status),
  };
}

/** Ignore volatile display time; retain the action, cycle selectors and accepted field/option schema. */
export function normalizeBguEngineeringForm(html: string) {
  const action = html.match(/<form\b[^>]*\baction=["']([^"']+)["']/i)?.[1];
  const namedTags = Array.from(html.matchAll(/<(?:input|select)\b[^>]*>/gi));
  const names = namedTags
    .flatMap(([tag]) => tag.match(/\bname=["']([^"']+)["']/i)?.[1] ?? [])
    .sort();
  const valueFor = (name: string) =>
    namedTags
      .find(([tag]) => new RegExp(`\\bname=["']${name}["']`, 'i').test(tag))?.[0]
      .match(/\bvalue=["']([^"']*)["']/i)?.[1];
  const optionsFor = (name: string) => {
    const body =
      html.match(
        new RegExp(`<select\\b[^>]*\\bname=["']${name}["'][^>]*>([\\s\\S]*?)</select>`, 'i'),
      )?.[1] ?? '';
    return Array.from(body.matchAll(/<option\b[^>]*\bvalue=["']([^"']*)["'][^>]*>([^<]*)/gi)).map(
      (match) => match[1],
    );
  };
  if (
    action !== '!rg.acc_SubmitEngSekem' &&
    action !== BGU_ENGINEERING_SCORE_URL &&
    action !== '/pls/rgwp/!rg.acc_SubmitEngSekem'
  )
    return null;
  const year = valueFor('rn_year');
  const semester = valueFor('rn_semester');
  const departments = optionsFor('rn_eng_dprt_list');
  const bonusOptions = optionsFor('on_subject');
  if (
    year !== '2' ||
    semester !== '1' ||
    !names.includes('on_grade_classi_quant') ||
    ![361, 362, 364].every((department) => departments.includes(String(department))) ||
    !bonusOptions.length
  )
    return null;
  return { action: BGU_ENGINEERING_SCORE_URL, year, semester, names, departments, bonusOptions };
}

// Critical form metadata captured independently from BGU's current calculator.
export const BGU_ENGINEERING_REVIEWED_FORM = formCapture;

export function fingerprintBguEngineeringRules(
  rule: NonNullable<ReturnType<typeof normalizeBguEngineeringRule>>,
  form: NonNullable<ReturnType<typeof normalizeBguEngineeringForm>>,
  guideSha256: string,
) {
  return `sha256:${createHash('sha256')
    .update(
      JSON.stringify({ rule, form, guideSha256, calculatorUrl: BGU_ENGINEERING_CALCULATOR_URL }),
    )
    .digest('hex')}`;
}

export const BGU_ENGINEERING_METADATA_BY_PAIR_ID = Object.fromEntries(
  (Object.keys(BGU_ENGINEERING_PROGRAMS) as BguEngineeringProgramId[]).map((programId) => {
    const pairId = `${programId}__bgu`;
    const pairCaptures = captures.filter((capture) => capture.pairId === pairId);
    const comparison = controlledProof.find((proof) => proof.pairId === pairId);
    if (
      !comparison ||
      comparison.comparisons.length !== 2 ||
      comparison.comparisons.some(
        (proof) =>
          proof.proofStatus !== 'succeeded' ||
          !proof.fingerprintMatches ||
          proof.score !== proof.expected.score ||
          proof.verdict !== proof.expected.verdict,
      )
    )
      throw new Error(`Missing successful controlled engineering proof for ${pairId}`);
    if (pairCaptures.length !== 2)
      throw new Error(`Missing independent BGU engineering captures for ${pairId}`);
    const rule = normalizeBguEngineeringRule(
      pairCaptures[0].source.payload,
      BGU_ENGINEERING_PROGRAMS[programId].department,
    );
    if (!rule) throw new Error(`Invalid BGU engineering source capture for ${pairId}`);
    const sourceFingerprint = fingerprintBguEngineeringRules(
      rule,
      BGU_ENGINEERING_REVIEWED_FORM,
      BGU_ENGINEERING_GUIDE_SHA256,
    );
    const fixtures: AdmissionsVerificationFixture[] = pairCaptures.map((capture) => {
      const request = capture.calculator.request;
      return {
        id: `${pairId}:${capture.label}:2026-2027`,
        pairId,
        admissionCycle: '2026-2027',
        verdict: capture.verdict as 'below' | 'eligible_to_apply',
        sourceFingerprint,
        capturedAt: capture.capturedAt,
        input: {
          psychometric: Number(request.on_grade_classi_psycho),
          bagrut: Number(request.on_bag_avg),
          bguBagrutAverage: Number(request.on_bag_avg),
          psychometricMath: Number(request.on_grade_classi_quant),
          bguLanguageRequirementsConfirmed: true,
          bguEngineering: { detailsConfirmed: true, route: 'engineering_score' },
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              {
                subjectId: 'mathematics',
                units: Number(request.on_learning_units_bag_math),
                grade: Number(request.on_grade_bag_math),
              },
              {
                subjectId: 'physics',
                units: Number(request.on_learning_units_bag_phy),
                grade: Number(request.on_grade_bag_phy),
              },
            ],
          },
        },
        expected: {
          score: capture.score,
          verdict: capture.verdict as 'below' | 'eligible_to_apply',
        },
      };
    });
    const contract: AdmissionsProgramVerificationContract = {
      pairId,
      programId,
      institutionId: 'bgu',
      officialProgramId: `dep${rule.mapping.department}-pat1`,
      admissionCycle: '2026-2027',
      source: { targetId: `bgu-${programId}-live`, url: pairCaptures[0].source.url },
      calculation: {
        adapterId: 'bgu',
        mode: 'official_replay',
        formulaFamily: 'bgu_engineering_sekhem',
        requiredInputs: ['bgu_engineering_details', 'bgu_language_requirements'],
        cutoff: { acceptance: rule.acceptanceThreshold, rejection: rule.acceptanceThreshold },
        gates: [
          {
            id: `${pairId}:psychometric`,
            kind: 'minimum',
            field: 'psychometric',
            minimum: rule.minimumPsychometric,
            description:
              'Psychometric minimum applies to the engineering-score route; Industrial has a separate direct route.',
          },
          {
            id: `${pairId}:inputs`,
            kind: 'subject',
            field: 'bguEngineering',
            description:
              'Mathematics, quantitative score, official average, highest qualifying subject bonus, and all applicable recognized preparatory/diploma grades.',
          },
          {
            id: `${pairId}:language`,
            kind: 'language',
            field: 'bguLanguageRequirementsConfirmed',
            description: 'English Basic and applicable Hebrew level E.',
          },
          {
            id: `${pairId}:physics`,
            kind: 'manual',
            field: 'bguEngineering.physicsCoursePassed',
            description:
              'Passing five-unit physics or a recognized physics course; Electrical requires completion from July. Other programmes retain the required course condition.',
          },
          {
            id: `${pairId}:capacity`,
            kind: 'manual',
            field: 'registrationStatus',
            description:
              'Eligibility to apply is conditional on places and final institutional approval; Electrical/Mechanical currently have waiting lists.',
          },
        ],
      },
      fixtureIds: fixtures.map((fixture) => fixture.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      sourceFingerprint,
      proof: {
        state: 'verified',
        comparedScore: true,
        comparedVerdict: true,
        liveComparedAt: comparison.comparedAt,
        sourceFingerprint,
      },
    };
    return [
      pairId,
      {
        contract,
        fixtures,
        ledgerReason:
          'Current programme mapping, engineering calculator, guide and two independent captures match controlled live score-and-verdict proof; waiting lists and physics conditions remain explicit.',
      },
    ];
  }),
);

export const BGU_ENGINEERING_OFFICIAL_PROOF_CAPTURES_BY_TARGET_ID: Record<
  string,
  OfficialProgramProofCapture[]
> = Object.fromEntries(
  Object.values(BGU_ENGINEERING_METADATA_BY_PAIR_ID).map(({ contract, fixtures }) => [
    contract.source.targetId,
    fixtures.map((fixture) => {
      const { psychometric, bagrut, ...extraInputs } = fixture.input;
      return {
        captureId: fixture.id,
        capturedAt: fixture.capturedAt,
        officialUrl: BGU_ENGINEERING_SCORE_URL,
        applicant: { psychometric, bagrutAverage: bagrut, extraInputs },
        expected: fixture.expected,
      };
    }),
  ]),
);
