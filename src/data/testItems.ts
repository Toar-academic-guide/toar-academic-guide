import type { ProfileDimension } from '@/types';

export type DimWeights = Partial<Record<ProfileDimension, number>>;

// ── Dimension metadata ──────────────────────────────────────────────────────

export interface DimensionMeta {
  dimension: ProfileDimension;
  label: string;
  description: string;
}

export const DIMENSION_META: DimensionMeta[] = [
  { dimension: 'AN', label: 'אנליטי', description: 'מחקר, נתונים ופתרון בעיות' },
  { dimension: 'TE', label: 'טכני', description: 'בנייה, הנדסה, חומרה ותשתיות' },
  { dimension: 'CR', label: 'יצירתי', description: 'עיצוב, אמנות, חדשנות וביטוי' },
  { dimension: 'SO', label: 'חברתי', description: 'עזרה, הוראה, ייעוץ וליווי' },
  { dimension: 'LE', label: 'מנהיגותי', description: 'ניהול, עסקים, הובלה ויזמות' },
  { dimension: 'OR', label: 'מערכתי', description: 'מבנה, סדר, תהליכים ונהלים' },
  { dimension: 'DI', label: 'דיגיטלי', description: 'קוד, AI, סייבר וטכנולוגיה' },
  { dimension: 'ER', label: 'עיוני', description: 'לימוד מעמיק, מחקר אקדמי וקריאה' },
];

export const DIMENSION_LABELS: Record<
  ProfileDimension,
  { name: string; trait: string; color: string }
> = {
  AN: { name: 'אנליטי', trait: 'מנתח ומגלה', color: 'bg-blue-100 text-blue-800' },
  TE: { name: 'טכני', trait: 'בונה ומהנדס', color: 'bg-orange-100 text-orange-800' },
  CR: { name: 'יצירתי', trait: 'אמן ויוצר', color: 'bg-purple-100 text-purple-800' },
  SO: { name: 'חברתי', trait: 'עוזר ומחבר', color: 'bg-green-100 text-green-800' },
  LE: { name: 'מנהיגותי', trait: 'מוביל ומשפיע', color: 'bg-red-100 text-red-800' },
  OR: { name: 'מערכתי', trait: 'מארגן ומדויק', color: 'bg-yellow-100 text-yellow-800' },
  DI: { name: 'דיגיטלי', trait: 'מפתח וחדשני', color: 'bg-cyan-100 text-cyan-800' },
  ER: { name: 'עיוני', trait: 'חוקר ומעמיק', color: 'bg-indigo-100 text-indigo-800' },
};

// ── Question types ──────────────────────────────────────────────────────────

export interface MultiSelectOption {
  id: string;
  title: string;
  subtitle: string;
  weights: DimWeights;
}

export interface MultiSelectQuestion {
  kind: 'multi-select';
  id: string;
  section: number;
  prompt: string;
  maxSelect: number;
  skippable: boolean;
  options: MultiSelectOption[];
}

export interface QuickPickItem {
  kind: 'quick-pick';
  id: string;
  section: number;
  text: string;
  dim: ProfileDimension;
  skippable: boolean;
}

export type QuickPickAnswer = 'yes' | 'maybe' | 'no';

export const QUICK_PICK_SCORES: Record<QuickPickAnswer, number> = {
  yes: 2,
  maybe: 1,
  no: 0,
};

export interface ValueSliderQuestion {
  kind: 'value-slider';
  id: string;
  section: number;
  leftLabel: string;
  leftDescription: string;
  rightLabel: string;
  rightDescription: string;
  valueKey: 'incomeVsImpact' | 'independenceVsTeam' | 'growthVsStability' | 'prestigeVsMeaning';
  skippable: boolean;
}

export type TestItem = MultiSelectQuestion | QuickPickItem | ValueSliderQuestion;

// ── Minimum answers threshold ───────────────────────────────────────────────

export const MIN_ANSWERED_ITEMS = 15;

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION 1: Icebreaker — Self-Discovery (2 questions, multi-select up to 3)
// ══════════════════════════════════════════════════════════════════════════════

export const ICEBREAKER_QUESTIONS: MultiSelectQuestion[] = [
  {
    kind: 'multi-select',
    id: 'Q1',
    section: 1,
    prompt: 'מה מהבאים הכי מושך אותך?',
    maxSelect: 3,
    skippable: true,
    options: [
      {
        id: 'Q1-A', title: 'יצירה מקורית:',
        subtitle: 'ליצור משהו מאפס - רעיון, עיצוב, כתיבה או אמנות.',
        weights: { CR: 2 },
      },
      {
        id: 'Q1-B', title: 'פיצוח לוגי, אלגוריתמי והנדסי:',
        subtitle: 'לפתור בעיות מורכבות, לכתוב קוד או לנתח נתונים מופשטים.',
        weights: { AN: 2, TE: 1, DI: 1 },
      },
      {
        id: 'Q1-C', title: 'סקרנות, חקר והבנת העולם:',
        subtitle: 'להבין לעומק את חוקי הבסיס של היקום, לפענח תופעות מדעיות - מהמוח האנושי ועד לפיזיקה וכימיה.',
        weights: { AN: 2, ER: 1 },
      },
      {
        id: 'Q1-D', title: 'חיבור לטבע ולסביבה:',
        subtitle: 'ללמוד על פלאי הטבע, על בעלי חיים, צמחים ומערכות אקולוגיות.',
        weights: { TE: 1, AN: 1 },
      },
      {
        id: 'Q1-E', title: 'חקר תרבויות, היסטוריה וטקסטים:',
        subtitle: 'להתעמק במקורות, ללמוד שפות חדשות ולהבין חברות, תהליכים והגות מהעבר ומההווה.',
        weights: { ER: 2 },
      },
      {
        id: 'Q1-F', title: 'לעזור, לרפא ולשקם:',
        subtitle: 'לעבוד עם אנשים אחד על אחד - לאבחן, לטפל ולעזור להם בריפוי הגוף והנפש.',
        weights: { SO: 2, AN: 1 },
      },
      {
        id: 'Q1-G', title: 'ללוות, לחנך ולהעצים:',
        subtitle: 'להדריך אנשים וצוותים בתהליכי צמיחה, לחנך ולתמוך בקהילות כחלק ממסגרת חברתית רחבה.',
        weights: { SO: 2 },
      },
      {
        id: 'Q1-H', title: 'הבנה עמוקה של בני אדם והחברה:',
        subtitle: 'לחקור מה מניע אותנו, לנתח התנהגויות ולהבין תהליכים עמוקים בפוליטיקה, בתקשורת ובחברה.',
        weights: { AN: 1, ER: 1, SO: 1 },
      },
      {
        id: 'Q1-I', title: 'הובלה, ניהול ויזמות:',
        subtitle: 'לעמוד בראש צוות, לקבל החלטות אסטרטגיות ולקדם פרויקטים.',
        weights: { LE: 2 },
      },
      {
        id: 'Q1-J', title: 'אסטרטגיה פיננסית ומסחר:',
        subtitle: 'לנתח שווקים ומגמות כלכליות, לעסוק בתקציבים, השקעות או ניהול סיכונים.',
        weights: { LE: 1, OR: 1, AN: 1 },
      },
      {
        id: 'Q1-K', title: 'שיטתיות, חוקיות ומבנה:',
        subtitle: 'לצלול לפרטים הקטנים, לעבוד לפי כללים ברורים, חוקים, סעיפים ומערכות מובנות.',
        weights: { OR: 2 },
      },
      {
        id: 'Q1-L', title: 'תנועה, מלאכה ועשייה מעשית:',
        subtitle: 'לאמן, לבשל, לרקוד או ליצור דברים מוחשיים בעבודת יד.',
        weights: { CR: 1, TE: 1, SO: 1 },
      },
    ],
  },
  {
    kind: 'multi-select',
    id: 'Q2',
    section: 1,
    prompt: 'באילו עולמות תוכן ומחקר היית רוצה להתעמק?',
    maxSelect: 3,
    skippable: true,
    options: [
      {
        id: 'Q2-A', title: 'הנדסה, מדעי המחשב וטכנולוגיה:',
        subtitle: 'מפיתוח תוכנה ובינה מלאכותית ועד חומרה, רובוטיקה ומערכות הנדסיות.',
        weights: { TE: 2, DI: 2, AN: 1 },
      },
      {
        id: 'Q2-B', title: 'פיזיקה, כימיה ומדעים מדויקים:',
        subtitle: 'החוקים הבסיסיים עליהם מושתת היקום - מהאטום ועד לכוכבים.',
        weights: { AN: 2, ER: 1 },
      },
      {
        id: 'Q2-C', title: 'מדעי החיים, רפואה ומוח:',
        subtitle: 'מהתא הבודד ועד לגוף האדם כולו - ביולוגיה, רפואה ומדעי המוח.',
        weights: { AN: 2, SO: 1 },
      },
      {
        id: 'Q2-D', title: 'חקלאות, סביבה וקיימות:',
        subtitle: 'עולם הצומח והחי, איכות הסביבה וקיימות.',
        weights: { TE: 1, AN: 1 },
      },
      {
        id: 'Q2-E', title: 'כלכלה, פיננסים וחשבונאות:',
        subtitle: 'שווקים, השקעות, מיסוי ותכנון פיננסי - המנגנונים אשר מניעים את המשק.',
        weights: { OR: 1, AN: 1, LE: 1 },
      },
      {
        id: 'Q2-F', title: 'מנהל עסקים, יזמות ושיווק:',
        subtitle: 'הקמת מיזמים, אסטרטגיה עסקית, שיווק וניהול ארגונים.',
        weights: { LE: 2 },
      },
      {
        id: 'Q2-G', title: 'משפטים, ממשל ופוליטיקה:',
        subtitle: 'חוק ומשפט, זכויות, דיפלומטיה ומדיניות ציבורית.',
        weights: { ER: 1, OR: 1, LE: 1 },
      },
      {
        id: 'Q2-H', title: 'פסיכולוגיה, חברה ותקשורת:',
        subtitle: 'הבנת ההתנהגות האנושית - ברמת הפרט, הקבוצה והתקשורת שמעצבת את החברה כולה.',
        weights: { SO: 2, AN: 1 },
      },
      {
        id: 'Q2-I', title: 'מדעי הרוח, פילוסופיה והיסטוריה:',
        subtitle: 'הגות, חקר תרבויות, שפות, ספרות וארכאולוגיה - מהעבר ועד ההווה.',
        weights: { ER: 2 },
      },
      {
        id: 'Q2-J', title: 'אמנות, עיצוב וארכיטקטורה:',
        subtitle: 'עיצוב חזותי, תכנון מרחבי, אופנה, מוצר, סאונד וקולנוע.',
        weights: { CR: 2 },
      },
      {
        id: 'Q2-K', title: 'ספורט, תנועה וגוף:',
        subtitle: 'אימון, הדרכה, פיזיותרפיה, חינוך גופני וניהול ספורט.',
        weights: { TE: 1, SO: 1 },
      },
      {
        id: 'Q2-L', title: 'קולינריה, אמנויות הבמה ומלאכה:',
        subtitle: 'בישול ואפייה, ריקוד, תיאטרון ומקצועות מלאכה ויצירה.',
        weights: { CR: 2, TE: 1 },
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION 2: Quick Picks (8 items, Yes/Maybe/No — one per dimension)
// ══════════════════════════════════════════════════════════════════════════════

export const QUICK_PICK_ITEMS: QuickPickItem[] = [
  { kind: 'quick-pick', id: 'QP-AN', section: 2, dim: 'AN', skippable: true,
    text: 'לנתח מערכת נתונים ולהסיק ממנה מסקנות' },
  { kind: 'quick-pick', id: 'QP-TE', section: 2, dim: 'TE', skippable: true,
    text: 'להרכיב, לפרק ולהבין איך מערכות עובדות מבפנים' },
  { kind: 'quick-pick', id: 'QP-CR', section: 2, dim: 'CR', skippable: true,
    text: 'לעצב פרויקט מאפס — ויזואלי, קולי או דיגיטלי' },
  { kind: 'quick-pick', id: 'QP-SO', section: 2, dim: 'SO', skippable: true,
    text: 'ללוות אדם בתהליך אישי — ייעוץ, טיפול או הדרכה' },
  { kind: 'quick-pick', id: 'QP-LE', section: 2, dim: 'LE', skippable: true,
    text: 'לנהל צוות, לקבל החלטות ולהוביל פרויקט' },
  { kind: 'quick-pick', id: 'QP-OR', section: 2, dim: 'OR', skippable: true,
    text: 'לארגן תהליך מורכב — לוחות זמנים, נהלים, מסמכים' },
  { kind: 'quick-pick', id: 'QP-DI', section: 2, dim: 'DI', skippable: true,
    text: 'לכתוב קוד, לבנות אפליקציה או מוצר טכנולוגי' },
  { kind: 'quick-pick', id: 'QP-ER', section: 2, dim: 'ER', skippable: true,
    text: 'להעמיק בנושא אקדמי שמעניין אותך, גם בלי מטרה מעשית' },
];

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION 3: Army / Sherut Leumi — Self-Discovery (2 questions, skippable)
// ══════════════════════════════════════════════════════════════════════════════

export const ARMY_QUESTIONS: MultiSelectQuestion[] = [
  {
    kind: 'multi-select',
    id: 'ARMY-1',
    section: 3,
    prompt: 'מה גילית על עצמך בזמן השירות הצבאי / הלאומי?',
    maxSelect: 2,
    skippable: true,
    options: [
      {
        id: 'ARMY-1A', title: 'שאני אוהב/ת לעבוד עם אנשים',
        subtitle: 'הקשר הצוותי, ההובלה, הליווי של אחרים',
        weights: { SO: 2, LE: 1 },
      },
      {
        id: 'ARMY-1B', title: 'שאני טוב/ה בפתרון בעיות תחת לחץ',
        subtitle: 'חשיבה מהירה, קבלת החלטות, אילתור',
        weights: { AN: 2 },
      },
      {
        id: 'ARMY-1C', title: 'שאני אוהב/ת פעילות בשטח ותנועה',
        subtitle: 'להיות בחוץ, לזוז, לפעול פיזית',
        weights: { TE: 2 },
      },
      {
        id: 'ARMY-1D', title: 'שאני נהנה/ית ללמוד מיומנויות חדשות',
        subtitle: 'לרכוש ידע שלא היה לי לפני — טכני, מקצועי, אישי',
        weights: { ER: 1, TE: 1 },
      },
      {
        id: 'ARMY-1E', title: 'שאני משגשג/ת כשיש מבנה ומשימה ברורה',
        subtitle: 'לדעת מה לעשות ולבצע ברמה גבוהה',
        weights: { OR: 2 },
      },
      {
        id: 'ARMY-1F', title: 'שאני רוצה ליצור השפעה אמיתית',
        subtitle: 'להרגיש שמה שאני עושה באמת משנה משהו',
        weights: { LE: 1, SO: 1 },
      },
    ],
  },
  {
    kind: 'multi-select',
    id: 'ARMY-2',
    section: 3,
    prompt: 'מה הכי שחק אותך בשירות?',
    maxSelect: 2,
    skippable: true,
    options: [
      {
        id: 'ARMY-2A', title: 'בירוקרטיה וחוסר יעילות',
        subtitle: 'הליכים מיותרים, המתנות, בזבוז זמן',
        weights: { OR: -1 },
      },
      {
        id: 'ARMY-2B', title: 'חוסר אוטונומיה',
        subtitle: 'שאמרו לך מה לעשות בלי מרחב ליוזמה אישית',
        weights: { OR: -1, LE: -1 },
      },
      {
        id: 'ARMY-2C', title: 'שגרה חוזרת',
        subtitle: 'אותו דבר כל יום, בלי אתגר או התפתחות',
        weights: { CR: -1 },
      },
      {
        id: 'ARMY-2D', title: 'עומס רגשי',
        subtitle: 'לחץ, אחריות כבדה, מתח מתמשך',
        weights: { SO: -1 },
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION 4: Style & Preferences (5 questions, single-select)
// ══════════════════════════════════════════════════════════════════════════════

export const STYLE_QUESTIONS: MultiSelectQuestion[] = [
  {
    kind: 'multi-select',
    id: 'Q3',
    section: 4,
    prompt: 'מהי סביבת העבודה האידיאלית בעיניך?',
    maxSelect: 1,
    skippable: true,
    options: [
      {
        id: 'Q3-A', title: 'סביבה דינמית, קצבית והישגית',
        subtitle: 'עבודה המאופיינת בקצב מהיר וסביבה תחרותית.',
        weights: { LE: 1 },
      },
      {
        id: 'Q3-B', title: 'עבודה בשטח ובתנועה',
        subtitle: 'עבודה מחוץ למשרד הסגור – בסביבה פתוחה, בטבע או בתחומי התפעול והלוגיסטיקה.',
        weights: { TE: 1 },
      },
      {
        id: 'Q3-C', title: 'עבודה עצמאית מול מסך',
        subtitle: 'התעמקות במשימות מורכבות, ניתוח נתונים, פתרון בעיות או ניהול מערכות דיגיטליות, בסביבה שקטה ובקצב אישי.',
        weights: { DI: 1, AN: 1 },
      },
      {
        id: 'Q3-D', title: 'סביבה אנושית וטיפולית',
        subtitle: 'עבודה המבוססת על אינטראקציה עם אנשים, הקשבה, הדרכה, חינוך או סיוע ישיר.',
        weights: { SO: 2 },
      },
      {
        id: 'Q3-E', title: 'מרחב יצירתי ופתוח',
        subtitle: 'עבודה בסטודיו או בסביבה המאפשרת חופש פעולה, עיצוב ואלתור ללא מסגרת נוקשה.',
        weights: { CR: 2 },
      },
    ],
  },
  {
    kind: 'multi-select',
    id: 'Q4',
    section: 4,
    prompt: 'כשאתה נחשף לתחום ידע חדש, היכן נמצאת המשיכה הטבעית שלך?',
    maxSelect: 1,
    skippable: true,
    options: [
      {
        id: 'Q4-A', title: 'בבסיס התיאורטי והמחקרי שלו',
        subtitle: 'מדעים מדויקים, מדעי המוח, ביולוגיה',
        weights: { AN: 2, ER: 1 },
      },
      {
        id: 'Q4-B', title: 'בדרכי היישום שלו בפועל ובשטח',
        subtitle: 'הנדסות, אדריכלות, חקלאות',
        weights: { TE: 2 },
      },
      {
        id: 'Q4-C', title: 'בפוטנציאל העסקי והכלכלי שלו',
        subtitle: 'מנהל עסקים, יזמות, כלכלה',
        weights: { LE: 2 },
      },
      {
        id: 'Q4-D', title: 'בזווית האנושית, החברתית והציבורית שלו',
        subtitle: 'משפטים, פסיכולוגיה, ממשל, חינוך',
        weights: { SO: 1, ER: 1 },
      },
      {
        id: 'Q4-E', title: 'בהרחבת אופקים, סקרנות וחקר תרבויות והגות',
        subtitle: 'היסטוריה, ארכאולוגיה, פילוסופיה, ספרות',
        weights: { ER: 2 },
      },
      {
        id: 'Q4-F', title: 'בפוטנציאל ליצירה, עיצוב וביטוי עצמי',
        subtitle: 'אמנויות, עיצוב, אופנה וקולנוע',
        weights: { CR: 2 },
      },
    ],
  },
  {
    kind: 'multi-select',
    id: 'Q5',
    section: 4,
    prompt: 'כשאתה עובד בצוות, איזה תפקיד בדרך כלל מרגיש לך הכי טבעי?',
    maxSelect: 1,
    skippable: true,
    options: [
      {
        id: 'Q5-A', title: 'המוביל והמנהל',
        subtitle: 'לקיחת אחריות, ראיית התמונה המלאה והובלת הצוות אל היעד.',
        weights: { LE: 2 },
      },
      {
        id: 'Q5-B', title: 'המפצח האנליטי',
        subtitle: 'צלילה לנתונים, ניתוח לוגי ומציאת פתרונות לבעיות טכניות או מדעיות מורכבות.',
        weights: { AN: 2 },
      },
      {
        id: 'Q5-C', title: 'איש התקשורת והדינמיקה',
        subtitle: 'הבנת אנשים, ניהול המשאב האנושי, רתימת שותפים והצגת הרעיונות החוצה.',
        weights: { SO: 2 },
      },
      {
        id: 'Q5-D', title: 'הסמכות המקצועית',
        subtitle: 'ריכוז הידע המדויק, ירידה לפרטים הקטנים ביותר ווידוא עמידה בסטנדרטים, חוקים ונהלים.',
        weights: { OR: 2 },
      },
      {
        id: 'Q5-E', title: 'המוח היצירתי',
        subtitle: 'חשיבה מחוץ לקופסה, פריצת מסגרות ופיתוח הקונספט הרעיוני או העיצובי החדש.',
        weights: { CR: 2 },
      },
    ],
  },
  {
    kind: 'multi-select',
    id: 'Q6',
    section: 4,
    prompt: 'כשאתה נתקל בבעיה מורכבת, מהי התגובה האינטואיטיבית שלך?',
    maxSelect: 1,
    skippable: true,
    options: [
      {
        id: 'Q6-A', title: 'להתמקד בלוגיקה ובנתונים',
        subtitle: 'לפרק את הבעיה לרכיבים שלה, למצוא את ה"באג" או הכשל הנקודתי, ולתקן את המנגנון הפיזי או הדיגיטלי.',
        weights: { AN: 2, DI: 1 },
      },
      {
        id: 'Q6-B', title: 'להתמקד באנשים ובמערכת',
        subtitle: 'להסתכל על האקוסיסטם המלא – להבין מי האנשים שמעורבים, איך התהליכים משפיעים זה על זה ואיך משנים את הדינמיקה הכללית.',
        weights: { SO: 2 },
      },
      {
        id: 'Q6-C', title: 'לבחון את הבעיה מהיסוד',
        subtitle: 'להסתכל על הסיטואציה בצורה ניטרלית, לבדוק אם המבנה הקיים עדיין משרת את המטרה, ובמידת הצורך להציע קונספט חדש.',
        weights: { CR: 1, ER: 1 },
      },
      {
        id: 'Q6-D', title: 'לגשת ישר לניסוי וטעייה בשטח',
        subtitle: 'לעזוב את התאוריות והדיבורים, לבצע מהלכים מעשיים מהירים ולראות מה אשכרה עובד במציאות.',
        weights: { TE: 2 },
      },
    ],
  },
  {
    kind: 'multi-select',
    id: 'Q8',
    section: 4,
    prompt: 'כשאתה ניגש למשימה או לפרויקט מורכב, מהו סגנון העבודה הכי טבעי לך?',
    maxSelect: 1,
    skippable: true,
    options: [
      {
        id: 'Q8-A', title: 'ראיית מאקרו ואסטרטגיה',
        subtitle: 'להתמקד ברעיון הכללי, בתכנון התמונה הגדולה ובהובלה של התהליך.',
        weights: { LE: 2 },
      },
      {
        id: 'Q8-B', title: 'ירידה לפרטים הקטנים',
        subtitle: 'עבודה יסודית, אנליטית ומדויקת על הנתונים, החישובים והפרטים הקטנים.',
        weights: { OR: 2, AN: 1 },
      },
      {
        id: 'Q8-C', title: 'חשיבה גמישה ואלתור',
        subtitle: 'מציאת פתרונות מהירים ויצירתיים מחוץ לקופסה ברגע שהתוכניות משתנות.',
        weights: { CR: 2 },
      },
      {
        id: 'Q8-D', title: 'עשייה ישירה ופרקטיקה',
        subtitle: 'לגשת ישר לשלב הביצוע, ללמוד תוך כדי תנועה ולפתור דברים בצורה מוחשית בשטח.',
        weights: { TE: 2 },
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
//  SECTION 5: Values (4 binary forced-choice sliders)
// ══════════════════════════════════════════════════════════════════════════════

export const VALUE_SLIDERS: ValueSliderQuestion[] = [
  {
    kind: 'value-slider',
    id: 'V1',
    section: 5,
    leftLabel: 'הכנסה גבוהה וביטחון כלכלי',
    leftDescription: 'לדעת שאתה מרוויח טוב ויכול לחיות ברמה שנוחה לך',
    rightLabel: 'עשייה עם משמעות והשפעה',
    rightDescription: 'להרגיש שהעבודה שלך תורמת משהו אמיתי לעולם',
    valueKey: 'incomeVsImpact',
    skippable: true,
  },
  {
    kind: 'value-slider',
    id: 'V2',
    section: 5,
    leftLabel: 'עצמאות',
    leftDescription: 'לנהל את עצמך, לעבוד בקצב שלך',
    rightLabel: 'שייכות',
    rightDescription: 'להיות חלק מצוות, לעבוד עם אנשים',
    valueKey: 'independenceVsTeam',
    skippable: true,
  },
  {
    kind: 'value-slider',
    id: 'V3',
    section: 5,
    leftLabel: 'צמיחה מתמדת',
    leftDescription: 'ללמוד כל הזמן, להתקדם, לא לקפוא',
    rightLabel: 'יציבות',
    rightDescription: 'מסלול ברור, שקט, ביטחון תעסוקתי',
    valueKey: 'growthVsStability',
    skippable: true,
  },
  {
    kind: 'value-slider',
    id: 'V4',
    section: 5,
    leftLabel: 'יוקרה והכרה',
    leftDescription: 'שהעבודה שלך תזכה להערכה ומעמד',
    rightLabel: 'סיפוק אישי',
    rightDescription: 'לעשות מה שאתה אוהב, גם אם אף אחד לא מכיר',
    valueKey: 'prestigeVsMeaning',
    skippable: true,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
//  Screen sequence — defines the order of screens in the assessment
// ══════════════════════════════════════════════════════════════════════════════

export type Screen =
  | { kind: 'transition'; section: number; title: string; subtitle: string }
  | { kind: 'multi-select'; questionId: string }
  | { kind: 'quick-picks'; itemIds: string[] }
  | { kind: 'value-slider'; sliderId: string };

export const SCREEN_SEQUENCE: Screen[] = [
  // Section 1: Icebreaker
  { kind: 'transition', section: 1, title: 'בואו נכיר אותך', subtitle: 'שתי שאלות קצרות על מה שמרגיש לך הכי טבעי' },
  { kind: 'multi-select', questionId: 'Q1' },
  { kind: 'multi-select', questionId: 'Q2' },

  // Section 2: Quick Picks
  { kind: 'transition', section: 2, title: 'כמה זה אתה?', subtitle: '8 משפטים קצרים — כן, אולי, או לא' },
  { kind: 'quick-picks', itemIds: ['QP-AN', 'QP-TE', 'QP-CR', 'QP-SO'] },
  { kind: 'quick-picks', itemIds: ['QP-LE', 'QP-OR', 'QP-DI', 'QP-ER'] },

  // Section 3: Army / Sherut
  { kind: 'transition', section: 3, title: 'מה השירות לימד אותך על עצמך?', subtitle: 'אפשר לדלג אם אתה מעדיף' },
  { kind: 'multi-select', questionId: 'ARMY-1' },
  { kind: 'multi-select', questionId: 'ARMY-2' },

  // Section 4: Style & Preferences
  { kind: 'transition', section: 4, title: 'איך אתה פועל?', subtitle: 'חמש שאלות על סגנון העבודה וההעדפות שלך' },
  { kind: 'multi-select', questionId: 'Q3' },
  { kind: 'multi-select', questionId: 'Q4' },
  { kind: 'multi-select', questionId: 'Q5' },
  { kind: 'multi-select', questionId: 'Q6' },
  { kind: 'multi-select', questionId: 'Q8' },

  // Section 5: Values
  { kind: 'transition', section: 5, title: 'מה חשוב לך?', subtitle: 'ארבעה צירים — בחר את הצד שמושך אותך יותר' },
  { kind: 'value-slider', sliderId: 'V1' },
  { kind: 'value-slider', sliderId: 'V2' },
  { kind: 'value-slider', sliderId: 'V3' },
  { kind: 'value-slider', sliderId: 'V4' },
];

// ── Convenience lookups ─────────────────────────────────────────────────────

const ALL_MULTI_SELECT = [...ICEBREAKER_QUESTIONS, ...ARMY_QUESTIONS, ...STYLE_QUESTIONS];

export function getMultiSelectQuestion(id: string): MultiSelectQuestion | undefined {
  return ALL_MULTI_SELECT.find((q) => q.id === id);
}

export function getQuickPickItem(id: string): QuickPickItem | undefined {
  return QUICK_PICK_ITEMS.find((item) => item.id === id);
}

export function getValueSlider(id: string): ValueSliderQuestion | undefined {
  return VALUE_SLIDERS.find((s) => s.id === id);
}

export const SECTION_LABELS: Record<number, string> = {
  1: 'הכרות',
  2: 'כמה זה אתה?',
  3: 'שירות',
  4: 'סגנון',
  5: 'ערכים',
};

export const TOTAL_SECTIONS = 5;
