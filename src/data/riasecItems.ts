import type { RiasecDimension } from '@/types';

export type RiasecAnswer = 'yes' | 'maybe' | 'no';

/** Score value assigned to each answer choice */
export const ANSWER_SCORES: Record<RiasecAnswer, number> = {
  yes: 2,
  maybe: 1,
  no: 0,
};

/** Maximum raw score per dimension (7 items × 2 points) */
export const MAX_RAW_SCORE = 14;

export interface RiasecItem {
  id: string;              // 'R1' ... 'C7'
  dimension: RiasecDimension;
  text: string;            // Hebrew activity description
}

export interface DimensionMeta {
  dimension: RiasecDimension;
  label: string;           // short Hebrew label
  emoji: string;
  description: string;     // one-line Hebrew description shown as screen header
}

export const DIMENSION_META: DimensionMeta[] = [
  {
    dimension: 'R',
    label: 'מעשי',
    emoji: '🔧',
    description: 'עבודה עם ידיים, כלים, מכונות ותשתית פיזית',
  },
  {
    dimension: 'I',
    label: 'חוקרי',
    emoji: '🔬',
    description: 'מחקר, ניתוח, פתרון בעיות ומדע',
  },
  {
    dimension: 'A',
    label: 'יצירתי',
    emoji: '🎨',
    description: 'יצירה, עיצוב, ביטוי אמנותי ופיתוח רעיונות',
  },
  {
    dimension: 'S',
    label: 'חברתי',
    emoji: '🤝',
    description: 'עזרה לאנשים, הוראה, ייעוץ ועבודת צוות',
  },
  {
    dimension: 'E',
    label: 'יזמי',
    emoji: '🚀',
    description: 'הנהגה, ניהול, שכנוע ויצירת הזדמנויות',
  },
  {
    dimension: 'C',
    label: 'מסודר',
    emoji: '📋',
    description: 'ארגון, תיעוד, עבודה עם נתונים ונהלים',
  },
];

export const RIASEC_ITEMS: RiasecItem[] = [

  // ── R — Realistic (מעשי) ───────────────────────────────────────────────────
  { id: 'R1', dimension: 'R', text: 'לתקן רכב, קטנוע או אופניים' },
  { id: 'R2', dimension: 'R', text: 'לבנות מבנה מעץ, מתכת או בטון' },
  { id: 'R3', dimension: 'R', text: 'להפעיל ולתפעל מכונות תעשייתיות כבדות' },
  { id: 'R4', dimension: 'R', text: 'לעבוד בחוץ בשטח, לא בין קירות' },
  { id: 'R5', dimension: 'R', text: 'לתחזק ולתקן ציוד מכני או חשמלי' },
  { id: 'R6', dimension: 'R', text: 'לגדל גידולים חקלאיים או לטפל בבעלי חיים' },
  { id: 'R7', dimension: 'R', text: 'לעסוק בעבודות בנייה, שיפוץ או תשתית' },

  // ── I — Investigative (חוקרי) ─────────────────────────────────────────────
  { id: 'I1', dimension: 'I', text: 'לנהל ניסוי מדעי ולנתח את תוצאותיו' },
  { id: 'I2', dimension: 'I', text: 'לפתור בעיות מתמטיות או לוגיות מורכבות' },
  { id: 'I3', dimension: 'I', text: 'לקרוא מאמרים מדעיים ולכתוב ממצאים' },
  { id: 'I4', dimension: 'I', text: 'לחקור תופעה לא מוסברת ולגלות את סיבתה' },
  { id: 'I5', dimension: 'I', text: 'לנתח סטים גדולים של נתונים ולמצוא דפוסים' },
  { id: 'I6', dimension: 'I', text: 'לבדוק השערות ולהסיק מסקנות מממצאים' },
  { id: 'I7', dimension: 'I', text: 'לפתח תיאוריות חדשות לפתרון בעיות מורכבות' },

  // ── A — Artistic (יצירתי) ─────────────────────────────────────────────────
  { id: 'A1', dimension: 'A', text: 'לצייר, לפסל או ליצור יצירת אמנות' },
  { id: 'A2', dimension: 'A', text: 'לכתוב שירה, סיפורת או תסריט' },
  { id: 'A3', dimension: 'A', text: 'לנגן כלי נגינה או לשיר בפני קהל' },
  { id: 'A4', dimension: 'A', text: 'לעצב לוגו, ממשק משתמש או זהות ויזואלית' },
  { id: 'A5', dimension: 'A', text: 'לביים הצגה, סרטון קצר או קליפ' },
  { id: 'A6', dimension: 'A', text: 'לצלם ולערוך תמונות או סרטים' },
  { id: 'A7', dimension: 'A', text: 'לפתח קמפיין יצירתי לרעיון, מותג או מוצר' },

  // ── S — Social (חברתי) ────────────────────────────────────────────────────
  { id: 'S1', dimension: 'S', text: 'ללמד ולהדריך ילדים, נוער או מבוגרים' },
  { id: 'S2', dimension: 'S', text: 'לתת ייעוץ רגשי לאנשים שמתמודדים עם קשיים' },
  { id: 'S3', dimension: 'S', text: 'לעבוד עם קשישים, נכים או אנשים הזקוקים לסיוע' },
  { id: 'S4', dimension: 'S', text: 'לשמש כמגשר וליישב קונפליקטים בין אנשים' },
  { id: 'S5', dimension: 'S', text: 'לארגן פעילויות קבוצתיות ולחבר אנשים' },
  { id: 'S6', dimension: 'S', text: 'לטפל בחולים ולתמוך בהם בתהליך ההחלמה' },
  { id: 'S7', dimension: 'S', text: 'לעזור לאנשים לפתח את עצמם ולהגשים מטרות' },

  // ── E — Enterprising (יזמי) ──────────────────────────────────────────────
  { id: 'E1', dimension: 'E', text: 'להקים ולנהל עסק משלי מאפס' },
  { id: 'E2', dimension: 'E', text: 'להוביל צוות לעמוד ביעדים ובלוחות זמנים' },
  { id: 'E3', dimension: 'E', text: 'לשכנע לקוחות לרכוש מוצר או שירות' },
  { id: 'E4', dimension: 'E', text: 'לנהל מו"מ ולסגור עסקה גדולה' },
  { id: 'E5', dimension: 'E', text: 'להכין ולהציג תוכנית עסקית בפני משקיעים' },
  { id: 'E6', dimension: 'E', text: 'לנהל תקציב ולקבל החלטות כספיות אסטרטגיות' },
  { id: 'E7', dimension: 'E', text: 'לגייס עובדים, לנהל צוות ולפתח את חברי הצוות' },

  // ── C — Conventional (מסודר) ─────────────────────────────────────────────
  { id: 'C1', dimension: 'C', text: 'לארגן קבצים, מסמכים ומידע בצורה מסודרת' },
  { id: 'C2', dimension: 'C', text: 'לנהל ספרי חשבונות ולהכין דוחות כספיים' },
  { id: 'C3', dimension: 'C', text: 'לעבוד לפי נהלים, תבניות ותקנות מוגדרים' },
  { id: 'C4', dimension: 'C', text: 'להזין ולנהל נתונים במסדי נתונים ומערכות' },
  { id: 'C5', dimension: 'C', text: 'לבדוק מסמכים ודוחות לאיתור שגיאות ואי-דיוקים' },
  { id: 'C6', dimension: 'C', text: 'לנהל לוחות זמנים, יומנים ותיאומים' },
  { id: 'C7', dimension: 'C', text: 'לסווג, לתייק ולהנגיש מידע לפי קטגוריות' },
];
