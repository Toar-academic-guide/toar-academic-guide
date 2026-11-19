import type { Program } from '@/data/degrees/types';

export interface DirectoryOption {
  key: string;
  label: string;
}

export interface DirectorySubject extends DirectoryOption {
  field: DirectoryOption;
  type: Program['type'] | 'course';
}

const FIELDS = {
  engineering: 'הנדסה',
  computing: 'מחשבים וטכנולוגיה',
  social: 'מדעי החברה',
  humanities: 'מדעי הרוח',
  business: 'כלכלה וניהול',
  health: 'רפואה ומקצועות הבריאות',
  life: 'מדעי החיים',
  sciences: 'מדעים מדויקים',
  law: 'משפטים',
  education: 'חינוך והוראה',
  architecture: 'אדריכלות',
  design: 'אמנות ועיצוב',
  performing: 'מוזיקה ואמנויות הבמה',
  film: 'צילום וקולנוע',
  culinary: 'קולינריה',
  complementary: 'רפואה משלימה',
  sport: 'ספורט',
  communication: 'תקשורת',
  hospitality: 'תיירות ואירוח',
  beauty: 'מקצועות היופי',
  preparation: 'מכינות',
  exam: 'הכנה לבגרות ולפסיכומטרי',
  languages: 'שפות',
  technical: 'לימודים טכנולוגיים והנדסאים',
  property: 'נדל״ן ושמאות',
  jewish: 'יהדות ומקצועות הדת',
  safety: 'בטיחות וביטחון',
  coaching: 'ייעוץ, אימון והדרכה',
  animals: 'עבודה עם בעלי חיים',
  personal: 'רוחניות ומודעות עצמית',
  gemology: 'גמולוגיה ויהלומים',
  bodyart: 'קעקועים ופירסינג',
  academic: 'לימודים אקדמיים',
  certificate: 'לימודי תעודה',
} as const;
type FieldKey = keyof typeof FIELDS;

export function directoryField(key: string): DirectoryOption {
  if (!Object.hasOwn(FIELDS, key)) throw new Error(`Unknown directory field: ${key}`);
  return { key, label: FIELDS[key as FieldKey] };
}

// These are catalogue classifications, not evidence of an institution's offerings.
const CATEGORY_FIELDS: Record<string, FieldKey> = {
  הנדסה: 'engineering',
  הנדסאים: 'technical',
  'הנדסה וטכנולוגיה': 'engineering',
  'מדעי המחשב': 'computing',
  'טכנולוגיה ופיתוח': 'computing',
  'מערכות מידע': 'computing',
  'מדעי החברה': 'social',
  פסיכולוגיה: 'social',
  'כלכלה ועסקים': 'business',
  'ניהול ועסקים': 'business',
  'מנהל עסקים': 'business',
  כלכלה: 'business',
  'מדעי הבריאות': 'health',
  רפואה: 'health',
  'ליווי לידה': 'health',
  'מדעי החיים': 'life',
  'מדעים מדויקים': 'sciences',
  משפטים: 'law',
  חינוך: 'education',
  אדריכלות: 'architecture',
  'אמנות ועיצוב': 'design',
  עיצוב: 'design',
  אמנות: 'design',
  'מוזיקה ותיאטרון': 'performing',
  'אמנויות הבמה': 'performing',
  מוזיקה: 'performing',
  מחול: 'performing',
  'צילום וקולנוע': 'film',
  צילום: 'film',
  קולנוע: 'film',
  'קולינריה וגסטרונומיה': 'culinary',
  קולינריה: 'culinary',
  'רפואה אינטגרטיבית': 'complementary',
  'רפואה משלימה': 'complementary',
  ספורט: 'sport',
  תקשורת: 'communication',
  'תיירות ואירוח': 'hospitality',
  'מקצועות היופי': 'beauty',
  מכינות: 'preparation',
  'לימודים אקדמיים': 'academic',
  'לימודי תעודה': 'certificate',
};

// Exact subject names reconcile historical broad categories across providers.
const SUBJECT_FIELDS: Record<string, FieldKey> = {
  'מדעי המחשב': 'computing',
  'מדעי הנתונים': 'computing',
  'מדעי הנתונים וסטטיסטיקה': 'computing',
  סטטיסטיקה: 'sciences',
  צילום: 'film',
  קולנוע: 'film',
  תסריטאות: 'film',
  'ריקוד עכשווי': 'performing',
};

// Keep campus and qualification in the programme title; the pill compares the subject.
const VERIFIED_SUBJECT_NAMES: Readonly<Record<string, string>> = {
  biu_medicine: 'רפואה',
  rubin_classical: 'מוזיקה',
  jerusalem_academy_dance: 'מחול',
  achva_education: 'חינוך והוראה',
  beit_berl_criminology: 'קרימינולוגיה',
};

export function catalogueSubjectName(id: string, name: string) {
  return (VERIFIED_SUBJECT_NAMES[id] ?? name).normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function directorySubject(
  program: Pick<Program, 'id' | 'category' | 'type'>,
  shortName: string,
): DirectorySubject {
  const label = catalogueSubjectName(program.id, shortName);
  const fieldKey = SUBJECT_FIELDS[label] ?? CATEGORY_FIELDS[program.category];
  if (!fieldKey)
    throw new Error(`Unmapped directory category for ${program.id}: ${program.category}`);
  return {
    key: `${program.type}:${label}`,
    label,
    type: program.type,
    field: directoryField(fieldKey),
  };
}

export function officialDirectorySubject(
  name: string,
  type: DirectorySubject['type'],
  fieldKey: string,
): DirectorySubject {
  return { key: `${type}:${name}`, label: name, type, field: directoryField(fieldKey) };
}
