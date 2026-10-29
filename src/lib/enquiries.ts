import type { EnquiryAttribution } from './leadAttribution';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';

export const ENQUIRY_CONSENT =
  'אני מסכימ/ה שצוות MyWay יקבל את שמי, מספר הטלפון והמסלול שבחרתי ויחזור אליי בנושא הפנייה.';

export const ENQUIRY_PREP_CONSENT =
  'אני רוצה שפרטיי יועברו גם לחברת הכנה לפסיכומטרי, שתפנה אליי בטלפון, SMS או WhatsApp לגבי קורסים והטבות. אני מאשר/ת שגילי 18 ומעלה.';

export const ENQUIRY_COPY = {
  button: 'שלחו, והמוסד יחזור אליכם',
  nameLabel: 'שם',
  phoneLabel: 'טלפון נייד',
  namePlaceholder: 'שם מלא',
  phonePlaceholder: 'מספר טלפון',
  requiredLegend: 'שדה חובה',
  actionNotice: 'בלחיצה על שליחה אני מאשר/ת להעביר את פרטיי {institution_le} בלבד',
  privacyLink: 'מדיניות פרטיות',
  loadingLive: 'שולחים את הפנייה',
  loadingButton: 'שלחו, והמוסד יחזור אליכם',
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
