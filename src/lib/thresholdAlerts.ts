import { enquirySourcePath } from '@/lib/enquirySourcePath';

export const THRESHOLD_ALERT_CYCLE = '2027';

export const THRESHOLD_ALERT_PATH = '/threshold-alerts';

/** Alerts only. This is not the enquiry consent and not the prep-company consent. */
export const THRESHOLD_ALERT_CONSENT =
  'אני מבקש/ת ש-MyWay תשלח לי עדכון כשהמוסדות או התארים שסימנתי מפרסמים את תנאי הקבלה ואת ספי הסכם למחזור 2027. העדכון יישלח רק לדוא״ל או ל-WhatsApp שהשארתי כאן, ורק בשביל ההתראה הזו.';

export const THRESHOLD_ALERT_COPY = {
  title: 'עדכון כשמתפרסמים תנאי קבלה',
  description:
    'סמנו את תל אביב, הטכניון או מוסדות ותארים נוספים. נעדכן בדוא״ל או ב-WhatsApp כשיתפרסמו תנאי הקבלה וספי הסכם ל-2027.',
  heading: 'עדכון כשמתפרסמים תנאי קבלה',
  intro:
    'תל אביב, הטכניון ומוסדות נוספים מפרסמים בכל מחזור את תנאי הקבלה ואת ספי הסכם. סמנו מוסדות או תארים, והשאירו דוא״ל או WhatsApp.',
  scope: 'זה עדכון על פרסום תנאי קבלה. לא שיחה ממוסד, ולא העברה לחברת הכנה.',
  institutionsLegend: 'מוסדות',
  degreesLegend: 'תארים',
  emailLabel: 'דוא״ל',
  phoneLabel: 'WhatsApp',
  emailPlaceholder: 'name@example.com',
  phonePlaceholder: '05X-XXXXXXX',
  submit: 'עדכנו אותי',
  submitting: 'שומרים…',
  success: 'נרשמתם. נעדכן כשיתפרסמו תנאי הקבלה.',
  targetError: 'סמנו לפחות מוסד אחד או תואר אחד.',
  contactError: 'השאירו דוא״ל או מספר WhatsApp.',
  emailError: 'כתובת הדוא״ל לא תקינה.',
  phoneError: 'מספר הנייד לא תקין.',
  consentError: 'כדי להירשם צריך לאשר קבלת עדכונים.',
  serverError: 'ההרשמה לא נשמרה. אפשר לנסות שוב.',
  cta: 'עדכנו אותי כשיתפרסמו תנאי הקבלה',
} as const;

export const THRESHOLD_ALERT_INSTITUTIONS = [
  { id: 'tau', label: 'תל אביב' },
  { id: 'technion', label: 'הטכניון' },
  { id: 'huji', label: 'העברית' },
  { id: 'bgu', label: 'בן-גוריון' },
  { id: 'haifa', label: 'חיפה' },
  { id: 'biu', label: 'בר-אילן' },
  { id: 'ariel', label: 'אריאל' },
  { id: 'reichman', label: 'רייכמן' },
] as const;

export const THRESHOLD_ALERT_DEGREES = [
  { id: 'cs', label: 'מדעי המחשב' },
  { id: 'software_engineering', label: 'הנדסת תוכנה' },
  { id: 'electrical_engineering', label: 'הנדסת חשמל' },
  { id: 'industrial_engineering', label: 'הנדסת תעשייה וניהול' },
  { id: 'mechanical_engineering', label: 'הנדסת מכונות' },
  { id: 'medicine', label: 'רפואה' },
  { id: 'nursing', label: 'סיעוד' },
  { id: 'law', label: 'משפטים' },
  { id: 'psychology', label: 'פסיכולוגיה' },
  { id: 'business', label: 'מנהל עסקים' },
  { id: 'economics', label: 'כלכלה' },
  { id: 'biology', label: 'מדעי החיים' },
  { id: 'accounting', label: 'חשבונאות' },
  { id: 'communications', label: 'תקשורת' },
] as const;

export type ThresholdAlertInstitutionId = (typeof THRESHOLD_ALERT_INSTITUTIONS)[number]['id'];
export type ThresholdAlertDegreeId = (typeof THRESHOLD_ALERT_DEGREES)[number]['id'];

const institutionIds = new Set<string>(THRESHOLD_ALERT_INSTITUTIONS.map((item) => item.id));
const degreeIds = new Set<string>(THRESHOLD_ALERT_DEGREES.map((item) => item.id));

const degreeByProgramId: Record<string, ThresholdAlertDegreeId> = {
  cs: 'cs',
  softwareeng: 'software_engineering',
  software_engineering: 'software_engineering',
  ee: 'electrical_engineering',
  electrical_engineering: 'electrical_engineering',
  industrial_engineering: 'industrial_engineering',
  ie: 'industrial_engineering',
  mechanical_engineering: 'mechanical_engineering',
  me: 'mechanical_engineering',
  medicine: 'medicine',
  nursing: 'nursing',
  law: 'law',
  psychology: 'psychology',
  business: 'business',
  management: 'business',
  economics: 'economics',
  biology: 'biology',
  lifesciences: 'biology',
  accounting: 'accounting',
  communications: 'communications',
  communication: 'communications',
};

export type ThresholdAlertFieldError = 'target' | 'contact' | 'email' | 'phone' | 'consent';

export interface ThresholdAlertSignup {
  requestId: string;
  email: string | null;
  phone: string | null;
  institutions: ThresholdAlertInstitutionId[];
  degrees: ThresholdAlertDegreeId[];
  cycle: typeof THRESHOLD_ALERT_CYCLE;
  consent: true;
  consentText: string;
  sourcePath: string;
}

export function isThresholdAlertInstitution(value: string): value is ThresholdAlertInstitutionId {
  return institutionIds.has(value);
}

export function isThresholdAlertDegree(value: string): value is ThresholdAlertDegreeId {
  return degreeIds.has(value);
}

export function thresholdAlertDegreeForProgram(programId: string): ThresholdAlertDegreeId | null {
  return degreeByProgramId[programId] ?? null;
}

export function thresholdAlertPath(selection?: {
  institutions?: readonly string[];
  degrees?: readonly string[];
}) {
  const params = new URLSearchParams();
  for (const id of selection?.institutions ?? []) {
    if (isThresholdAlertInstitution(id)) params.append('institution', id);
  }
  for (const id of selection?.degrees ?? []) {
    if (isThresholdAlertDegree(id)) params.append('degree', id);
  }
  const query = params.toString();
  return query ? `${THRESHOLD_ALERT_PATH}?${query}` : THRESHOLD_ALERT_PATH;
}

export function readThresholdAlertSelection(
  searchParams:
    | Pick<URLSearchParams, 'getAll'>
    | { institution?: string | string[]; degree?: string | string[] },
) {
  const institutions = (
    'getAll' in searchParams ? searchParams.getAll('institution') : asList(searchParams.institution)
  ).filter(isThresholdAlertInstitution);
  const degrees = (
    'getAll' in searchParams ? searchParams.getAll('degree') : asList(searchParams.degree)
  ).filter(isThresholdAlertDegree);
  return {
    institutions: unique(institutions),
    degrees: unique(degrees),
  };
}

/** Israeli mobile numbers only, stored as E.164 so a later WhatsApp send does not guess. */
export function normalizeThresholdAlertPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (!compact) return null;
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  const local = digits.startsWith('972') ? `0${digits.slice(3)}` : digits;
  if (!/^05\d{8}$/.test(local)) return null;
  return `+972${local.slice(1)}`;
}

export function normalizeThresholdAlertEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254 || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

export function parseThresholdAlertSignup(input: {
  institutions?: readonly string[];
  degrees?: readonly string[];
  email?: string;
  phone?: string;
  consent?: boolean;
  sourcePath?: string;
}):
  | { ok: true; value: Omit<ThresholdAlertSignup, 'requestId'> }
  | { ok: false; field: ThresholdAlertFieldError } {
  const institutions = unique((input.institutions ?? []).filter(isThresholdAlertInstitution));
  const degrees = unique((input.degrees ?? []).filter(isThresholdAlertDegree));
  const unknownInstitution = (input.institutions ?? []).some(
    (id) => !isThresholdAlertInstitution(id),
  );
  const unknownDegree = (input.degrees ?? []).some((id) => !isThresholdAlertDegree(id));
  if (unknownInstitution || unknownDegree || (institutions.length === 0 && degrees.length === 0)) {
    return { ok: false, field: 'target' };
  }

  const emailRaw = input.email?.trim() ?? '';
  const phoneRaw = input.phone?.trim() ?? '';
  if (!emailRaw && !phoneRaw) return { ok: false, field: 'contact' };
  const email = emailRaw ? normalizeThresholdAlertEmail(emailRaw) : null;
  if (emailRaw && !email) return { ok: false, field: 'email' };
  const phone = phoneRaw ? normalizeThresholdAlertPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { ok: false, field: 'phone' };
  if (input.consent !== true) return { ok: false, field: 'consent' };

  return {
    ok: true,
    value: {
      email,
      phone,
      institutions,
      degrees,
      cycle: THRESHOLD_ALERT_CYCLE,
      consent: true,
      consentText: THRESHOLD_ALERT_CONSENT,
      sourcePath: enquirySourcePath(input.sourcePath ?? '/'),
    },
  };
}

export function thresholdAlertContactChannel(signup: {
  email: string | null;
  phone: string | null;
}) {
  if (signup.email && signup.phone) return 'email_and_whatsapp';
  if (signup.email) return 'email';
  return 'whatsapp';
}

function asList(value: string | string[] | undefined) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((item) => item.split(','));
}

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}
