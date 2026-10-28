import { vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { admissionsExtraInputsFromAcademicScores } from '@/lib/admissionsEvaluationProfile';
import { buildBagrutSubjectRecord } from '@/utils/bagrutSubjectRecord';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import haifaCaptures from '../../../../../docs/admissions-verification/2026-09-28-haifa-official.json';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import type { SourceFreshnessStateRow } from '@/db/types';
import type { CatalogueProgram } from '@/types/catalogue';

import savedCatalogue from '../../../../../docs/admissions-verification/evidence/2026-10-28-sekhem-gap-catalogue.json';
export const savedGapPrograms = savedCatalogue.programs as CatalogueProgram[];

export const gapNow = new Date('2026-10-28T12:00:00.000Z');
export const gapPrograms = getStaticCataloguePrograms().filter(
  (program) => program.type === 'academic' && program.isListed !== false,
);

// Replicates #320 buildSekhemInput at 12fd33f, using the two shared helpers whose
// contents are identical on both branches. All projections meet its HTTP ranges.
// (5*90 + 5*85 + 5*90 + 2*88 + 2*85 + 2*88 + 2*90 + 2*88)/25 = 88.12.
export function gapApplicant(overrides: AdmissionsExtraInputs = {}, fullCertificate = true) {
  const subjects = [
    { label: 'מתמטיקה', units: 5, grade: 90 },
    { label: 'אנגלית', units: 5, grade: 85 },
    { label: 'פיזיקה', units: 5, grade: 90 },
    ...(fullCertificate
      ? [
          { label: 'הבעה עברית', units: 2, grade: 88 },
          { label: 'היסטוריה', units: 2, grade: 85 },
          { label: 'אזרחות', units: 2, grade: 88 },
          { label: 'ספרות', units: 2, grade: 90 },
          { label: 'תנ״ך', units: 2, grade: 88 },
        ]
      : [{ label: 'מדעי המחשב', units: 5, grade: 95 }]),
  ];
  const record = buildBagrutSubjectRecord({
    sectorLabel: 'יהודי',
    certificateType: 'other',
    complete: true,
    subjects,
  });
  // JSON round trip matches the HTTP body: absent profile fields are omitted.
  return JSON.parse(
    JSON.stringify({
      psychometric: 590,
      extraInputs: {
        ...admissionsExtraInputsFromAcademicScores({
          bagrut: { subjectRecord: record },
          psychometric: { overall: 590, quantitative: 115, verbal: 110, english: 120 },
        }),
        ...overrides,
      },
    }),
  ) as { psychometric: number; extraInputs: AdmissionsExtraInputs };
}

export const programsFor = (institutionId: string, programs = gapPrograms) =>
  programs.filter((program) => program.linkedInstitutionIds.includes(institutionId));

export function gapFetcher() {
  return vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const address = String(url);
    if (address.includes('technion-calculators-sum.php'))
      // Transport sentinel, not a claimed live score for this persona.
      return new Response('הסכם לדיוני הקבלה הוא:84.4');
    if (address.includes('admissions.technion.ac.il'))
      return new Response(
        `<table id="tablepress-485">${[
          ['מדעי המחשב', 91],
          ['הנדסת נתונים ומידע', 91],
          ['הנדסת חשמל', 91.5],
          ['הנדסת מכונות', 87],
          ['מדעי הרפואה - מגמת רפואה', 92],
          ['הנדסה ביו רפואית', 87],
          ['הנדסה אזרחית', 87],
          ['הנדסת תעשיה וניהול', 89],
        ]
          .map(
            ([title, cutoff]) =>
              `<tr><td class="column-1">${title}</td><td class="column-2">${cutoff}</td></tr>`,
          )
          .join('')}</table>`,
      );
    if (address.includes('applicants.haifa.ac.il')) {
      const params = new URL(address).searchParams;
      if (params.get('operation') === 'checkConnection')
        return Response.json({ data: {}, return: { type: 'S' } });
      const capture = haifaCaptures.records.find(
        (row) => row.officialProgramId === params.get('program'),
      );
      if (capture) return Response.json(capture.low.response);
    }
    throw new Error(`Unexpected official replay request: ${address}`);
  });
}

export async function gapEvaluate(
  program: CatalogueProgram,
  institutionId: string,
  applicant = gapApplicant(),
) {
  const artifact = getProgramVerificationArtifact(`${program.id}__${institutionId}`);
  const freshnessStatesBySourceId = new Map<string, SourceFreshnessStateRow>();
  if (artifact) {
    const sourceId = artifact.contract.source.targetId;
    freshnessStatesBySourceId.set(sourceId, {
      sourceId,
      sourceClass: 'api_static_json',
      capability: 'decision_capable',
      status: 'fresh',
      proofLevel: 'exact_official',
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
      normalizedFingerprint: artifact.contract.sourceFingerprint,
      normalizedDecisionPayload: {},
      lastCheckedAt: gapNow,
      lastSuccessfulCheckAt: gapNow,
      lastExactCheckAt: gapNow,
      lastChangedAt: null,
      latestFailureReason: null,
      blockedReason: null,
      rawFingerprint: null,
      latestReviewItemId: null,
      nextAction: null,
      createdAt: gapNow,
      updatedAt: gapNow,
    });
  }
  const fetcher = gapFetcher();
  const report = await evaluateAdmissionsForProgram({
    program: { ...program, linkedInstitutionIds: [institutionId] },
    institutions: getStaticCatalogueInstitutions(),
    input: { degreeId: program.id, ...applicant },
    fetcher,
    now: gapNow,
    freshnessStatesBySourceId,
  });
  return { result: report.results[0], fetcher };
}

export async function gapSweep(institutionId: string, programs = gapPrograms) {
  const rows = [];
  for (const program of programsFor(institutionId, programs)) {
    const { result } = await gapEvaluate(program, institutionId);
    rows.push({
      id: program.id,
      kind: result.kind,
      score: result.score,
      requiredInputs: result.requiredInputs ?? [],
      explanation: result.explanation,
    });
  }
  return rows;
}
