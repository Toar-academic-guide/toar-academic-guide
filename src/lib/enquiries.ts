import type { EnquiryAttribution } from './leadAttribution';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';

export const ENQUIRY_CONSENT =
  'אני מסכימ/ה שצוות MyWay יקבל את שמי, מספר הטלפון והמסלול שבחרתי ויחזור אליי בנושא הפנייה.';

export interface EnquiryInput {
  requestId: string;
  name: string;
  phone: string;
  programId: string;
  institutionId: string;
  sourcePath: string;
  consent: true;
  attribution?: EnquiryAttribution;
  evaluationInput?: AdmissionsEvaluationInput;
}

export type EnquiryResultStatus = 'accepted' | 'below' | 'eligible_to_apply' | 'unknown';

export interface EnquiryRecord extends EnquiryInput {
  programName: string;
  institutionName: string;
  resultStatus: EnquiryResultStatus;
  bagrut: number | null;
  psychometric: number | null;
  createdAt: Date;
}
