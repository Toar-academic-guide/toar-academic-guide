/** Read-only local evaluator replay against an exported production catalogue.
 * NODE_OPTIONS=--conditions=react-server npx tsx scripts/diagnose-results-averages.ts <catalogue-dir> <output.json>
 * The directory contains progs.json and insts.json from the public catalogue API.
 * Freshness is fixture-qualified, as in evaluator unit tests; official HTTP calls are live.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { studyFields, journeyRows, distinctRecommendations, resultLabel } from '@/lib/studyJourney';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { exactSourceIdsForProgram } from '@/server/admissions/capabilityMatrix';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { CatalogueProgram, CatalogueInstitution } from '@/types/catalogue';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
import type { BagrutSubjectRecordV2 } from '@/types';
import type { SourceFreshnessStateRow } from '@/db/types';

function qualifiedFreshness(
  program: CatalogueProgram,
  extraInputs: AdmissionsExtraInputs | undefined,
  now: Date,
) {
  const states = new Map<string, SourceFreshnessStateRow>();
  const ids = exactSourceIdsForProgram(program, extraInputs);
  for (const institutionId of program.linkedInstitutionIds) {
    const artifact = getProgramVerificationArtifact(`${program.id}__${institutionId}`);
    if (!artifact || !ids.includes(artifact.contract.source.targetId)) continue;
    const sourceId = artifact.contract.source.targetId;
    states.set(sourceId, {
      sourceId,
      sourceClass: 'api_static_json',
      capability: 'decision_capable',
      status: 'fresh',
      proofLevel: 'exact_official',
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
      lastCheckedAt: now,
      lastSuccessfulCheckAt: now,
      lastExactCheckAt: now,
      lastChangedAt: null,
      latestFailureReason: null,
      blockedReason: null,
      rawFingerprint: null,
      normalizedFingerprint: artifact.contract.sourceFingerprint,
      normalizedDecisionPayload: {},
      latestReviewItemId: null,
      nextAction: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  return states;
}

async function main() {
  const [catalogueDirectory, outputPath] = process.argv.slice(2);
  if (!catalogueDirectory || !outputPath)
    throw new Error('Pass catalogue directory and output JSON path.');
  const programs: CatalogueProgram[] = JSON.parse(
    readFileSync(join(catalogueDirectory, 'progs.json'), 'utf8'),
  ).data;
  const institutions: CatalogueInstitution[] = JSON.parse(
    readFileSync(join(catalogueDirectory, 'insts.json'), 'utf8'),
  ).data;
  const fields = ['cs', 'psychology', 'law', 'nursing', 'business'];
  const rows = distinctRecommendations(
    journeyRows(studyFields(programs, true), institutions),
  ).filter((row) => row.program.isListed !== false && fields.includes(row.fieldId));
  const now = new Date('2026-10-24T12:00:00Z');
  // Explicit test certificate; no inferred psychometric section scores or qualifications.
  const record: BagrutSubjectRecordV2 = {
    schemaVersion: 2,
    sector: 'jewish',
    certificateType: 'internal',
    complete: true,
    subjects: [
      ['mathematics', 5, 90],
      ['english', 5, 90],
      ['physics', 5, 90],
      ['computer_science', 5, 90],
      ['hebrew_expression', 2, 90],
      ['history', 2, 90],
      ['civics', 2, 90],
      ['literature', 2, 90],
      ['bible', 2, 90],
    ].map(([subjectId, units, grade]) => ({
      subjectId: String(subjectId),
      units: Number(units),
      grade: Number(grade),
      assessmentKind: 'exam',
    })),
  };
  const output = [];
  for (const [bagrut, psychometric] of [
    [105, 650],
    [110, 700],
  ]) {
    for (const mode of ['average-only', 'subjects', 'subjects-only'] as const) {
      const extraInputs: AdmissionsExtraInputs | undefined =
        mode !== 'average-only'
          ? {
              bagrutSubjectRecord: record,
              mathUnits: 5,
              mathGrade: 90,
              englishUnits: 5,
              englishGrade: 90,
              physicsUnits: 5,
              physicsGrade: 90,
              csUnits: 5,
              csGrade: 90,
            }
          : undefined;
      // subjects-only separately reproduces the diagnosed dropped-average request.
      const inputScores = {
        bagrut: mode === 'subjects-only' ? undefined : bagrut,
        psychometric,
        extraInputs,
      };
      const reports = new Map();
      const uniquePrograms = [
        ...new Map(rows.map((row) => [row.program.id, row.program])).values(),
      ];
      for (let index = 0; index < uniquePrograms.length; index += 4) {
        await Promise.all(
          uniquePrograms.slice(index, index + 4).map(async (program) => {
            const states = qualifiedFreshness(program, extraInputs, now);
            reports.set(
              program.id,
              await evaluateAdmissionsForProgram({
                input: { degreeId: program.id, ...inputScores },
                program,
                institutions,
                now,
                freshnessStatesBySourceId: states,
              }),
            );
          }),
        );
      }
      const results = rows.map((row) => {
        const report = reports.get(row.program.id);
        const result = report.results.find(
          (entry: { linkedInstitutionId: string }) =>
            entry.linkedInstitutionId === row.institution.id,
        );
        return {
          field: row.fieldId,
          institution: row.institution.id,
          program: row.program.id,
          kind: result?.kind,
          requiredInputs: result?.requiredInputs,
          estimated: result?.estimated,
          estimationReason: result?.estimationReason,
          label: resultLabel(result).label,
        };
      });
      const missing = Object.fromEntries(
        fields.map((field) => [
          field,
          results.filter((row) => row.field === field && row.kind === 'needs_input').length,
        ]),
      );
      const scenario = { bagrut, psychometric, mode, missing, rows: results };
      output.push(scenario);
      console.log(JSON.stringify({ bagrut, psychometric, mode, missing }));
    }
  }
  const psychologyWalkthrough = [];
  const psychologyProgram = programs.find((program) => program.id === 'bgu_psychology');
  if (!psychologyProgram) throw new Error('Production snapshot is missing bgu_psychology.');
  for (const psychometric of [650, 690, 720]) {
    const report = await evaluateAdmissionsForProgram({
      input: { degreeId: psychologyProgram.id, bagrut: 112, psychometric },
      program: psychologyProgram,
      institutions,
      now,
      freshnessStatesBySourceId: qualifiedFreshness(psychologyProgram, undefined, now),
    });
    const result = report.results.find((row) => row.linkedInstitutionId === 'bgu');
    psychologyWalkthrough.push({ bagrut: 112, psychometric, result });
    console.log(JSON.stringify({ bagrut: 112, psychometric, result }));
  }
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        freshness: 'fixture-qualified; not a production freshness health check',
        officialRequests: 'live, evaluator timeouts apply',
        record,
        scenarios: output,
        psychologyWalkthrough,
      },
      null,
      2,
    ),
  );
}
void main();
