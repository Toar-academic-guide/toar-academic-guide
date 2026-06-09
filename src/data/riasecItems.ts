import type { RiasecDimension } from '@/types';

/* ════════════════════════════════════════════════════════════════════════════
 *  ✏️  זה הקובץ היחיד שצריך לערוך כדי לשנות את השאלות.
 *  ─────────────────────────────────────────────────────────────────────────
 *  המבחן בנוי מ-3 חלקים — כולם מודדים את אותם 6 ממדי RIASEC (R/I/A/S/E/C).
 *  משנים רק *איך* שואלים; כל פריט מתויג בממד, והניקוד תמיד נשען על RIASEC.
 *
 *  כללי המשחק (כדי שהציון יישאר מאוזן — אל תיגעו בקבצים אחרים):
 *
 *  1. כל פריט/אופציה מתויג/ת בממד RIASEC. ה-dim (או ה-weights) הוא מה שקובע
 *     את הניקוד — לא הטקסט. אפשר לשכתב כל טקסט בחופשיות, רק לשמור על התיוג.
 *
 *  2. חלק 0 — צבא (MILITARY_OPTIONS): אופציה אחת לכל ממד. "אהבתי" מוסיף, "שנאתי" מוריד.
 *  3. חלק 1 — קלאסי (RATING_ITEMS): 2 פריטים לכל ממד (כן/אולי/לא). זה הגב המאומת.
 *  4. חלק 2 — זה או זה (SCENARIOS): 6 תרחישים, כל אחד מנגיד 2 ממדים. כל ממד מופיע
 *     בדיוק פעמיים: I↔S · R↔E · A↔C · I↔E · S↔C · R↔A.
 *  5. חלק 3 — מה היית עושה (SITUATIONALS): כל תרחיש = 6 אופציות, אחת לכל ממד,
 *     עם מפת משקלים (weights). אופציה ראשית מקבלת +2; אפשר להוסיף משקל משני.
 *
 *  6. SCREEN_SEQUENCE (בתחתית) — סדר המסכים, כולל מסכי מעבר בין החלקים.
 * ════════════════════════════════════════════════════════════════════════════ */

export type RiasecAnswer = 'yes' | 'maybe' | 'no';

/** ניקוד לכל תשובה במסכי הדירוג (חלק 1) */
export const ANSWER_SCORES: Record<RiasecAnswer, number> = {
  yes: 2,
  maybe: 1,
  no: 0,
};

/** צבא: כל בחירת "אהבתי" מוסיפה +2, כל בחירת "שנאתי" מורידה −2 (נחתך לטווח הממד). */
export const MILITARY_BONUS = 2;

// ── Dimension meta (תוויות, אימוג'י, תיאור) ─────────────────────────────────────
export interface DimensionMeta {
  dimension: RiasecDimension;
  label: string;
  emoji: string;
  description: string;
}

export const DIMENSION_META: DimensionMeta[] = [
  { dimension: 'R', label: 'מעשי',   emoji: '🔧', description: 'עבודה עם ידיים, כלים, מכונות ותשתית פיזית' },
  { dimension: 'I', label: 'חוקרי',  emoji: '🔬', description: 'מחקר, ניתוח, פתרון בעיות ומדע' },
  { dimension: 'A', label: 'יצירתי', emoji: '🎨', description: 'יצירה, עיצוב, ביטוי אמנותי ופיתוח רעיונות' },
  { dimension: 'S', label: 'חברתי',  emoji: '🤝', description: 'עזרה לאנשים, הוראה, ייעוץ ועבודת צוות' },
  { dimension: 'E', label: 'יזמי',   emoji: '🚀', description: 'הנהגה, ניהול, שכנוע ויצירת הזדמנויות' },
  { dimension: 'C', label: 'מסודר',  emoji: '📋', description: 'ארגון, תיעוד, עבודה עם נתונים ונהלים' },
];

/* ════════════════════════════════════════════════════════════════════════════
 *  TYPES — אל תיגעו (אלא אם משנים מבנה)
 * ════════════════════════════════════════════════════════════════════════════ */

/** מפת משקלים — כמה כל ממד מקבל מאופציה (ראשי +2, משני אופציונלי +1). */
export type DimWeights = Partial<Record<RiasecDimension, number>>;

/** אופציה במסכי הצבא (חלק 0) */
export interface MilitaryOption {
  id: string;
  emoji: string;
  label: string;
  dim: RiasecDimension;
}

/** פריט דירוג קלאסי — כן / אולי / לא (חלק 1) */
export interface RatingItem {
  kind: 'rating';
  id: string;
  dim: RiasecDimension;
  text: string;
}

/** תרחיש "זה או זה" — בוחרים תגובה אחת מתוך שתיים (חלק 2) */
export interface ScenarioItem {
  kind: 'scenario';
  id: string;
  prompt: string;
  a: { text: string; dim: RiasecDimension };
  b: { text: string; dim: RiasecDimension };
}

/** תרחיש סיטואציוני — מצב אחד, 6 אופציות (אחת לכל ממד) (חלק 3) */
export interface SituationalOption {
  text: string;
  weights: DimWeights;
}
export interface SituationalItem {
  kind: 'situational';
  id: string;
  emoji: string;
  prompt: string;
  options: SituationalOption[];
}

/* ════════════════════════════════════════════════════════════════════════════
 *  ✏️  התוכן — שכתבו כאן בחופשיות (שמרו על התיוג של כל פריט)
 * ════════════════════════════════════════════════════════════════════════════ */

// ── חלק 0 · צבא: אופציה אחת לכל ממד ─────────────────────────────────────────────
export const MILITARY_OPTIONS: MilitaryOption[] = [
  { id: 'mil-R', emoji: '🔧', label: 'פיצוח תקלות, הפעלת ציוד או נשק',        dim: 'R' },
  { id: 'mil-I', emoji: '🔍', label: 'ניתוח מידע, הצלבת נתונים והבנת תמונה',   dim: 'I' },
  { id: 'mil-A', emoji: '🎨', label: 'יצירת תוכן, מצגות, צילום או עיצוב',       dim: 'A' },
  { id: 'mil-S', emoji: '🤝', label: 'הדרכה, חניכה ודאגה לאנשים שלי',          dim: 'S' },
  { id: 'mil-E', emoji: '🚀', label: 'הובלה, פיקוד וקבלת החלטות',             dim: 'E' },
  { id: 'mil-C', emoji: '📋', label: 'תכנון, תיאום ולוגיסטיקה',               dim: 'C' },
];

// ── חלק 1 · פריטים קלאסיים לדירוג (12) — 2 לכל ממד ──────────────────────────────
export const RATING_ITEMS: RatingItem[] = [
  // R
  { kind: 'rating', id: 'R1', dim: 'R', text: "האוזניות של חבר נדפקו — המחשבה הראשונה שלך: 'תביא, נפתח ונראה מה הסיפור'." },
  { kind: 'rating', id: 'R2', dim: 'R', text: 'כשמשהו בבית מתקלקל, בא לך לתקן אותו בעצמך לפני שמזמינים טכנאי.' },
  // I
  { kind: 'rating', id: 'I1', dim: 'I', text: 'ראית כותרת מדעית מוזרה ומצאת את עצמך נופל לשרשור מאמרים ב-2 בלילה.' },
  { kind: 'rating', id: 'I2', dim: 'I', text: 'אתה לא נרגע עד שאתה מבין *למה* משהו עובד, לא רק *איך*.' },
  // A
  { kind: 'rating', id: 'A1', dim: 'A', text: 'אתה פשוט לא מסוגל להשאיר מצגת או פוסט עם עיצוב מכוער.' },
  { kind: 'rating', id: 'A2', dim: 'A', text: 'יוצא לך לדמיין רעיונות, סיפורים או יצירות גם כשאתה לא מנסה.' },
  // S
  { kind: 'rating', id: 'S1', dim: 'S', text: 'מישהו בקבוצה שקט ונראה לא טוב — אתה זה ששם לב וניגש לדבר איתו.' },
  { kind: 'rating', id: 'S2', dim: 'S', text: 'אנשים נוטים לבוא אליך כשהם צריכים עצה או אוזן קשבת.' },
  // E
  { kind: 'rating', id: 'E1', dim: 'E', text: 'בפרויקט קבוצתי אתה תופס טבעית את ההגה ומחלק לכולם משימות.' },
  { kind: 'rating', id: 'E2', dim: 'E', text: 'כיף לך לשכנע אנשים ולמכור להם רעיון שאתה מאמין בו.' },
  // C
  { kind: 'rating', id: 'C1', dim: 'C', text: 'יש לך סיפוק אמיתי כשהכל מסודר — תיקיות, רשימות, צבעים.' },
  { kind: 'rating', id: 'C2', dim: 'C', text: 'אתה מרגיש רגוע יותר כשיש תוכנית ברורה ולוז, לא אלתור.' },
];

// ── חלק 2 · תרחישי "זה או זה" (6) — כל אחד מנגיד שני ממדים ───────────────────────
export const SCENARIOS: ScenarioItem[] = [
  {
    kind: 'scenario',
    id: 'SC1', // I ↔ S
    prompt: 'אחרי הצבא אתם מתכננים טיול גדול בדרום אמריקה.',
    a: { text: 'אני זה שחוקר כל יעד לעומק, משווה מסלולים ובונה את התוכנית המושלמת', dim: 'I' },
    b: { text: "אני זה שמלכד את החבר'ה, דואג שכולם בעניין ושהאווירה גבוהה",          dim: 'S' },
  },
  {
    kind: 'scenario',
    id: 'SC2', // R ↔ E
    prompt: 'משמרת עמוסה בעבודה, ופתאום הכל מתפוצץ ונהיה בלאגן.',
    a: { text: 'אני נכנס למצב ביצוע — ראש שקט, ידיים מהירות, פותר תקלות', dim: 'R' },
    b: { text: 'אני תופס פיקוד — מחלק לכל אחד תפקיד ומסדר את הזירה',       dim: 'E' },
  },
  {
    kind: 'scenario',
    id: 'SC3', // A ↔ C
    prompt: 'קיבלתם פרויקט להגיש ביחד, יש שבועיים.',
    a: { text: 'אני נדלק על איך זה ייראה ואיזה רעיון מקורי יחבר הכל',        dim: 'A' },
    b: { text: 'אני נרגע רק כשיש לוז מסודר וכל המשימות מחולקות בטבלה',      dim: 'C' },
  },
  {
    kind: 'scenario',
    id: 'SC4', // I ↔ E
    prompt: 'לחבר יש רעיון לסטארטאפ והוא רוצה אתכם בצוות.',
    a: { text: 'אני רוצה קודם לבדוק אם זה בכלל עובד — לחקור את השוק והטכנולוגיה', dim: 'I' },
    b: { text: 'אני כבר רואה את התמונה הגדולה — בואו נגייס אנשים ונמכור את זה',    dim: 'E' },
  },
  {
    kind: 'scenario',
    id: 'SC5', // S ↔ C
    prompt: "מארגנים אירוע גדול למשפחה או לחבר'ה.",
    a: { text: 'אני על הקשר עם האנשים — מי מגיע, מי צריך טרמפ, שכולם ירגישו טוב', dim: 'S' },
    b: { text: 'אני על הלוגיסטיקה — תקציב, לוז, רשימות וספקים',                  dim: 'C' },
  },
  {
    kind: 'scenario',
    id: 'SC6', // R ↔ A
    prompt: 'סוף שבוע פנוי בלי תוכניות. מה מתחשק לך לעשות?',
    a: { text: 'להרכיב, לתקן או לבנות משהו פיזי במו ידיי', dim: 'R' },
    b: { text: 'ליצור משהו — לצלם, לנגן, לעצב או לכתוב',   dim: 'A' },
  },
];

// ── חלק 3 · תרחישים סיטואציוניים (4) — 6 אופציות, אחת לכל ממד ────────────────────
export const SITUATIONALS: SituationalItem[] = [
  {
    kind: 'situational',
    id: 'SIT1',
    emoji: '🧩',
    prompt: 'כשאתם עובדים בצוות, איזה תפקיד הכי טבעי לך?',
    options: [
      { text: 'המוביל — לוקח אחריות, רואה את התמונה המלאה ומכוון את כולם ליעד', weights: { E: 2 } },
      { text: 'המפצח האנליטי — צולל לנתונים וללוגיקה ומוצא פתרון לבעיה הקשה',    weights: { I: 2 } },
      { text: 'איש האנשים — מחבר בין כולם, רותם שותפים ומציג את הרעיון החוצה',   weights: { S: 2 } },
      { text: 'הסמכות המקצועית — מרכז את הידע המדויק, יורד לפרטים ושומר על נהלים', weights: { C: 2 } },
      { text: 'הראש היצירתי — חושב מחוץ לקופסה ומביא את הקונספט החדש',          weights: { A: 2 } },
      { text: 'איש הביצוע — לוקח את הכלים ועושה בידיים בשטח',                   weights: { R: 2 } },
    ],
  },
  {
    kind: 'situational',
    id: 'SIT2',
    emoji: '🧠',
    prompt: 'נתקלת בבעיה מורכבת. מה התגובה האינטואיטיבית הראשונה שלך?',
    options: [
      { text: 'לפרק ללוגיקה ולנתונים — למצוא איפה בדיוק הכשל ולתקן את המנגנון', weights: { I: 2 } },
      { text: 'להסתכל על האנשים והמערכת — מי מעורב ואיך משנים את הדינמיקה',    weights: { S: 2 } },
      { text: 'לבחון מהיסוד — אולי המבנה כולו לא נכון, ולהציע קונספט חדש',      weights: { A: 2 } },
      { text: 'ניסוי וטעייה בשטח — לעזוב תיאוריות ולראות מה אשכרה עובד',        weights: { R: 2 } },
      { text: 'לקבל החלטה ולהוביל — לקחת אחריות ולהניע מהלך גם באי-וודאות',     weights: { E: 2 } },
      { text: 'לפעול לפי הספר — לבדוק מה אומרים הנהלים ולעבוד שיטתית',          weights: { C: 2 } },
    ],
  },
  {
    kind: 'situational',
    id: 'SIT3',
    emoji: '✨',
    prompt: 'מתי אתה מרגיש שאתה הכי "בקטע שלך"?',
    options: [
      { text: 'כשאני יוצר משהו מאפס — רעיון, עיצוב, כתיבה או אמנות', weights: { A: 2 } },
      { text: 'כשאני חוקר ומבין לעומק איך משהו עובד',               weights: { I: 2 } },
      { text: 'כשאני בונה, מתקן או מפעיל משהו פיזי בידיים',          weights: { R: 2 } },
      { text: 'כשאני מלווה, מקשיב או עוזר למישהו לצמוח',            weights: { S: 2 } },
      { text: 'כשאני מוביל יוזמה ומניע אנשים קדימה',                weights: { E: 2 } },
      { text: 'כשאני מסדר, מארגן ומביא סדר לכאוס',                  weights: { C: 2 } },
    ],
  },
  {
    kind: 'situational',
    id: 'SIT4',
    emoji: '🎯',
    prompt: 'פרויקט חדש נוחת עליך. מאיפה אתה מתחיל?',
    options: [
      { text: 'מהתמונה הגדולה — אסטרטגיה, תכנון והובלת התהליך',     weights: { E: 2 } },
      { text: 'מהפרטים — דיוק בנתונים, חישובים וירידה לעומק הקטן',  weights: { C: 2 } },
      { text: 'מרעיון — חשיבה גמישה ופתרונות יצירתיים מחוץ לקופסה',  weights: { A: 2 } },
      { text: 'מהשטח — ניגש ישר לביצוע ולומד תוך כדי תנועה',         weights: { R: 2 } },
      { text: 'מהבנה — קודם חוקר לעומק את הנושא לפני שזזים',         weights: { I: 2 } },
      { text: 'מהאנשים — מתאם, מקשיב ומגייס את הצוות מסביב',         weights: { S: 2 } },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════════════════
 *  סדר המסכים — 3 חלקים עם מסכי מעבר. ניתן לסדר מחדש.
 * ════════════════════════════════════════════════════════════════════════════ */
export type Screen =
  | { kind: 'military'; mode: 'loved' | 'drained' }
  | { kind: 'transition'; part: string; title: string; subtitle: string; emoji: string }
  | { kind: 'rating'; itemIds: string[] }
  | { kind: 'scenario'; scenarioId: string }
  | { kind: 'situational'; situationalId: string };

export const SCREEN_SEQUENCE: Screen[] = [
  // ── חלק 0 · צבא ──
  { kind: 'military', mode: 'loved' },
  { kind: 'military', mode: 'drained' },

  // ── חלק 1 · קלאסי ──
  { kind: 'transition', part: 'חלק 1 מתוך 3', title: 'כמה זה אתה?', subtitle: '12 משפטים קצרים — דרגו עד כמה כל אחד מתאר אתכם', emoji: '💭' },
  { kind: 'rating', itemIds: ['R1', 'I1', 'A1', 'S1'] },
  { kind: 'rating', itemIds: ['E1', 'C1', 'R2', 'I2'] },
  { kind: 'rating', itemIds: ['A2', 'S2', 'E2', 'C2'] },

  // ── חלק 2 · זה או זה ──
  { kind: 'transition', part: 'חלק 2 מתוך 3', title: 'זה או זה', subtitle: 'בכל מסך — באיזה צד אתם מזהים את עצמכם יותר?', emoji: '⚖️' },
  { kind: 'scenario', scenarioId: 'SC1' },
  { kind: 'scenario', scenarioId: 'SC2' },
  { kind: 'scenario', scenarioId: 'SC3' },
  { kind: 'scenario', scenarioId: 'SC4' },
  { kind: 'scenario', scenarioId: 'SC5' },
  { kind: 'scenario', scenarioId: 'SC6' },

  // ── חלק 3 · מה היית עושה ──
  { kind: 'transition', part: 'חלק 3 מתוך 3', title: 'מה היית עושה?', subtitle: 'מצב אחד, שש דרכים להגיב — בחרו את שלכם', emoji: '🎬' },
  { kind: 'situational', situationalId: 'SIT1' },
  { kind: 'situational', situationalId: 'SIT2' },
  { kind: 'situational', situationalId: 'SIT3' },
  { kind: 'situational', situationalId: 'SIT4' },
];
