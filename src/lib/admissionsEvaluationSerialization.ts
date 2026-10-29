import { isHujiMedicineProgram } from '@/lib/hujiMedicineInputs';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';

/** Round presentation only; decisions, thresholds, gaps and snapshots retain their raw evaluation. */
export function serializeAdmissionsReport(
  report: AdmissionsEvaluationReport,
): AdmissionsEvaluationReport {
  return {
    ...report,
    results: report.results.map((result) =>
      result.linkedInstitutionId === 'huji' && typeof result.score === 'number'
        ? {
            ...result,
            score: Number(result.score.toFixed(isHujiMedicineProgram(report.program.id) ? 3 : 2)),
          }
        : result,
    ),
  };
}
