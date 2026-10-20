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
}
