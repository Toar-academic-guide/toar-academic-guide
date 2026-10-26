import type { EnquiryAttribution } from './leadAttribution';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';

export const ENQUIRY_CONSENT =
  'אני מסכימ/ה שצוות MyWay יקבל את שמי, מספר הטלפון והמסלול שבחרתי ויחזור אליי בנושא הפנייה.';

export const ENQUIRY_PREP_CONSENT =
  'אני רוצה שפרטיי יועברו גם לחברת הכנה לפסיכומטרי, שתחזור אליי בטלפון לגבי קורסים והטבות (לבני 18 ומעלה).';

export const ENQUIRY_COPY = {
  button: 'שליחת פרטים',
  nameLabel: 'שם',
  phoneLabel: 'טלפון נייד',
  requiredLegend: 'שדה חובה',
  actionNotice:
    'בלחיצה על ״שליחת פרטים״ פרטיך וטווח הציונים שלך יועברו {institution_le}, שיחזרו אליך בטלפון. אפשר לבטל בכל עת.',
  privacyLink: 'מדיניות פרטיות',
  loadingLive: 'שולחים את הפנייה',
  loadingButton: 'שליחת פרטים',
  successTitle: 'הפנייה נשלחה',
  successLive: 'הפנייה נשלחה',
  successBody: '{institution_me} יחזרו אליך בטלפון.',
  serverError: 'השליחה נכשלה. נסו שוב.',
  retry: 'ניסיון נוסף',
  nameError: 'נא להזין שם',
  phoneError: 'מספר נייד לא תקין',
} as const;

export interface EnquiryInput {
  requestId: string;
  name: string;
  phone: string;
  programId: string;
  institutionId: string;
  sourcePath: string;
  consent: true;
  prepConsent?: boolean;
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
  prepConsentText?: string | null;
  prepConsentAt?: Date | null;
}
