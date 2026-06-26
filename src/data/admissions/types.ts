import type { InstitutionId } from '@/data/institutions';
import type {
  AdmissionAlternativePath,
  AdmissionFact,
  AdmissionsSourceCandidate,
} from '@/data/degrees/types';

export interface HybridAdmissionSliceEntry {
  programId: string;
  institutionId: InstitutionId;
  sourceCandidates: AdmissionsSourceCandidate[];
  facts: AdmissionFact[];
  alternativePaths: AdmissionAlternativePath[];
}
