// Failing-first stub: storage behavior is implemented after the red test commit.
import type { CalculatorProfile, CalculatorOffering } from './sekhemCalculator';
import type { HaifaQualificationValues } from '@/components/HaifaQualificationFields';
import type { HaifaAdmissionsInputs } from './haifaAdmissionsInputs';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
export const SEKHEM_SESSION_KEY = 'myway:sekhem-calculator:v1';
export interface SekhemCalculatorSnapshot extends CalculatorProfile {
  programId: string;
  requiredKeys: (keyof HaifaAdmissionsInputs)[];
  haifaValues: HaifaQualificationValues;
  reports: AdmissionsEvaluationReport[];
  failedIds: string[];
}
export function readSekhemSession(_offerings: CalculatorOffering[]): SekhemCalculatorSnapshot | null { return null; }
export function writeSekhemSession(_snapshot: SekhemCalculatorSnapshot): void {}
