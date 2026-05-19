import type { LucideIcon } from 'lucide-react';
import {
  Wrench, Search, Palette, Heart, Rocket, BarChart3,
  Cpu, MessageCircle, Star, Brain, Stethoscope, Package,
  Lightbulb, Sparkles, DollarSign, Zap,
  Headphones, Users, Layers,
  Monitor, MapPin, Globe,
  Wand2, Crown, Ruler, Hammer,
  Home, Mountain, Sun,
} from 'lucide-react';
import type { RiasecDimension, EnvironmentPreference, GeographicRegion } from '@/types';

export interface QuizAnswer {
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  riasecDeltas?: Partial<Record<RiasecDimension, number>>;
  environmentDelta?: Partial<EnvironmentPreference>;
  /** Geographic region tag — only present on the 'geography' question. */
  geographicTag?: GeographicRegion;
}

export interface QuizQuestion {
  id: string;
  text: string;
  sublabel?: string;
  multiSelect?: boolean;
  maxSelect?: number;
  answers: QuizAnswer[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'interests',
    text: 'מה הכי מסקרן אותך?',
    sublabel: 'בחר/י עד שניים',
    multiSelect: true,
    maxSelect: 2,
    answers: [
      { label: 'לבנות ולהנדס',           sublabel: 'מכונות, מערכות, קוד',           icon: Wrench,       riasecDeltas: { R: 2 } },
      { label: 'לחקור ולנתח',             sublabel: 'נתונים, מדע, בעיות מורכבות',   icon: Search,       riasecDeltas: { I: 2 } },
      { label: 'ליצור ולעצב',             sublabel: 'אמנות, עיצוב, תוכן',           icon: Palette,      riasecDeltas: { A: 2 } },
      { label: 'לעזור ולטפל',             sublabel: 'אנשים, בריאות, רווחה',         icon: Heart,        riasecDeltas: { S: 2 } },
      { label: 'להוביל ולנהל',            sublabel: 'צוותים, עסקים, אסטרטגיה',     icon: Rocket,       riasecDeltas: { E: 2 } },
      { label: 'לארגן ולבנות תהליכים',  sublabel: 'נהלים, כספים, נתונים מובנים', icon: BarChart3,    riasecDeltas: { C: 2 } },
    ],
  },
  {
    id: 'armyRole',
    text: 'בצבא, מה הכי אפיין אותך?',
    answers: [
      { label: 'טכני',               sublabel: 'ציוד, מערכות, טכנולוגיה',        icon: Cpu,           riasecDeltas: { R: 1, I: 1 } },
      { label: 'רווחה / קשב',        sublabel: 'תמיכה בחיילים, שיחות',           icon: MessageCircle, riasecDeltas: { S: 2 } },
      { label: 'מפקד',               sublabel: 'ניהול אנשים, קבלת החלטות',       icon: Star,          riasecDeltas: { E: 2 } },
      { label: 'מודיעין / ניתוח',   sublabel: 'עיבוד מידע, זיהוי דפוסים',       icon: Brain,         riasecDeltas: { I: 2 } },
      { label: 'רפואה / חובש',       sublabel: 'טיפול, פרוצדורות רפואיות',       icon: Stethoscope,   riasecDeltas: { S: 1, I: 1 } },
      { label: 'לוגיסטיקה / מנהל',  sublabel: 'ארגון, תיאום, תכנון',            icon: Package,       riasecDeltas: { C: 2, E: 1 } },
      { label: 'תוכן, עיצוב והסברה',      sublabel: 'כתיבה, צילום, חשיבה מחוץ לקופסה, פיתוח הדרכה יצירתי', icon: Palette, riasecDeltas: { A: 5, S: 1 } },
      { label: 'מכניקה, שטח ועבודת כפיים', sublabel: 'עבודה עם הידיים, תפעול ואחזקת ציוד, פתרון בעיות פיזיות בשטח', icon: Hammer, riasecDeltas: { R: 5, C: 1 } },
    ],
  },
  {
    id: 'purpose',
    text: 'כשאתה חושב על הקריירה שלך, מה הם הדברים שהכי חשובים לך?',
    sublabel: 'בחר/י עד שלושה דברים',
    multiSelect: true,
    maxSelect: 3,
    answers: [
      { label: 'אתגר אינטלקטואלי',               sublabel: 'פתרון בעיות שמאלצות אותי לחשוב',          icon: Lightbulb,     riasecDeltas: { I: 2 } },
      { label: 'תרומה חברתית',                    sublabel: 'להשפיע על חיי אנשים בצורה חיובית',        icon: Heart,         riasecDeltas: { S: 2 } },
      { label: 'יציבות ושכר גבוה',               sublabel: 'ביטחון כלכלי מובהק ופוטנציאל רווח',       icon: DollarSign,    riasecDeltas: { E: 2, C: 1 } },
      { label: 'ביטוי אישי ויצירתיות',           sublabel: 'ליצור משהו שהוא לגמרי שלי',               icon: Sparkles,      riasecDeltas: { A: 2, E: 1 } },
      { label: 'עבודה פיזית ובשטח',              sublabel: 'לא להיות סגור כל היום בין קירות',          icon: MapPin,        riasecDeltas: { R: 2 } },
      { label: 'ממשק קרוב עם בני אדם',           sublabel: 'עבודה שכולה תקשורת, קשר וחיבור',          icon: MessageCircle, riasecDeltas: { S: 2, E: 1 } },
      { label: 'גמישות ואפשרות לעבודה מרחוק',   sublabel: 'לנהל את הזמן והמיקום שלי לבד',            icon: Globe,         riasecDeltas: { A: 1, E: 1 } },
      { label: 'עצמאות ויזמות',                  sublabel: 'להוביל תהליכים בעצמי, בלי בוס על הראש',  icon: Rocket,        riasecDeltas: { E: 2 } },
      { label: 'בנייה ועבודה עם ידיים',           sublabel: 'לראות תוצר מוחשי, לראות את הפרי',         icon: Hammer,        riasecDeltas: { R: 2, A: 1 } },
    ],
  },
  {
    id: 'workStyle',
    text: 'איך אתה/את מעדיף/ה לעבוד?',
    answers: [
      { label: 'לבד ועמוק', sublabel: 'ריכוז מלא, פחות הפרעות',       icon: Headphones, environmentDelta: { soloScore: 3 } },
      { label: 'בצוות',      sublabel: 'שיתוף, דיונים, עבודה משותפת',  icon: Users,      environmentDelta: { soloScore: 0 } },
      { label: 'שילוב',      sublabel: 'עצמאות + שיתוף לפי הצורך',     icon: Layers,     environmentDelta: { soloScore: 1 } },
    ],
  },
  {
    id: 'environment',
    text: 'מה סביבת העבודה שמתאימה לך?',
    answers: [
      { label: 'משרד / מחשב', sublabel: 'סביבה יציבה ומאורגנת',    icon: Monitor, riasecDeltas: { C: 1 }, environmentDelta: { deskScore: 3 } },
      { label: 'שטח / תנועה', sublabel: 'דינמיקה, פגישות, נסיעות', icon: MapPin,  riasecDeltas: { S: 1 }, environmentDelta: { deskScore: 0 } },
      { label: 'היברידי',      sublabel: 'גמישות לפי הפרויקט',                     icon: Globe,                           environmentDelta: { deskScore: 1 } },
    ],
  },
  {
    id: 'selfDescription',
    text: 'מה מתאר אותך הכי טוב?',
    answers: [
      { label: 'אנליטי/ת וסקרן/ית', sublabel: 'חופר/ת לעומק, אוהב/ת ללמוד', icon: Search,  riasecDeltas: { I: 2 } },
      { label: 'יצירתי/ת',            sublabel: 'רואה/ה דברים אחרת, חולמ/ת',   icon: Wand2,   riasecDeltas: { A: 2 } },
      { label: 'מנהיג/ה טבעי/ת',     sublabel: 'אנשים סומכים עליי',             icon: Crown,   riasecDeltas: { E: 2 } },
      { label: 'אמפתי/ת ומחבר/ת',    sublabel: 'קשר עמוק עם אנשים',            icon: Users,   riasecDeltas: { S: 2 } },
      { label: 'מעשי/ת ובונה/ה',     sublabel: 'עדיף/ה לעשות מלדבר',           icon: Wrench,  riasecDeltas: { R: 2 } },
      { label: 'מדויק/ת ומסודר/ת',   sublabel: 'פרטים ונהלים חשובים לי',       icon: Ruler,   riasecDeltas: { C: 2 } },
    ],
  },
  {
    id: 'armyPeak',
    text: 'איפה היית בשיא שלך בצבא?',
    sublabel: 'בחר/י עד שניים',
    multiSelect: true,
    maxSelect: 2,
    answers: [
      { label: 'פיקוד וקבלת החלטות',       sublabel: 'הובלת אנשים, לחץ ואחריות',            icon: Crown,   riasecDeltas: { E: 2 } },
      { label: 'ניתוח מידע ופתרון בעיות',  sublabel: 'זיהוי דפוסים, חשיבה אסטרטגית',       icon: Brain,   riasecDeltas: { I: 2 } },
      { label: 'עבודה טכנית ועם ציוד',     sublabel: 'תפעול, אחזקה, פתרון תקלות',           icon: Wrench,  riasecDeltas: { R: 2 } },
      { label: 'תמיכה ועבודה עם אנשים',   sublabel: 'קשר, הקשבה, סיוע לחיילים',            icon: Heart,   riasecDeltas: { S: 2 } },
      { label: 'יצירה, תכנון והדרכה',      sublabel: 'בניית תהליכים, הכשרת אחרים',          icon: Wand2,   riasecDeltas: { A: 2, E: 1 } },
      { label: 'ארגון, לוגיסטיקה ותיאום', sublabel: 'סדר, ניהול משאבים, תכנון קדימה',      icon: Package, riasecDeltas: { C: 2 } },
    ],
  },
  {
    id: 'peerPerception',
    text: 'אם היינו שואלים את חמשת האנשים הכי קרובים אליך...',
    sublabel: 'מה הם היו אומרים שהכי מגדיר אותך? בחר/י עד שניים',
    multiSelect: true,
    maxSelect: 2,
    answers: [
      { label: 'שאני תמיד שם/ת בשביל אחרים', sublabel: 'אמפתיה, נוכחות, תמיכה',          icon: Heart,  riasecDeltas: { S: 2 } },
      { label: 'שאני מוביל/ה ומשפיע/ה',       sublabel: 'יוזמה, כריזמה, הנעת אנשים',     icon: Crown,  riasecDeltas: { E: 2 } },
      { label: 'שאני מנתח/ת ופותר/ת בעיות',  sublabel: 'חשיבה לוגית, פרקטיות',           icon: Search, riasecDeltas: { I: 2 } },
      { label: 'שאני יוצר/ת ורואה/ה אחרת',   sublabel: 'חשיבה מחוץ לקופסה, חידושים',    icon: Wand2,  riasecDeltas: { A: 2 } },
      { label: 'שאני מסודר/ת ואמין/ה',        sublabel: 'עקביות, דיוק, אחריות',           icon: Ruler,  riasecDeltas: { C: 2 } },
    ],
  },
  {
    id: 'lastMeaningful',
    text: 'מתי בפעם האחרונה הרגשת משמעותי באמת?',
    sublabel: 'בחר/י עד שניים',
    multiSelect: true,
    maxSelect: 2,
    answers: [
      { label: 'כשעזרתי ושיניתי מצב של מישהו', sublabel: 'השפעה אנושית ישירה',            icon: Heart,     riasecDeltas: { S: 2 } },
      { label: 'כשפתרתי בעיה שאחרים לא הצליחו', sublabel: 'אתגר אינטלקטואלי',            icon: Brain,     riasecDeltas: { I: 2 } },
      { label: 'כשבניתי או יצרתי משהו מוחשי',   sublabel: 'עשייה, בנייה, יצירה',         icon: Hammer,    riasecDeltas: { R: 2, A: 1 } },
      { label: 'כשהובלתי צוות להצלחה',           sublabel: 'מנהיגות ותוצאה משותפת',       icon: Rocket,    riasecDeltas: { E: 2 } },
      { label: 'כשסיימתי משהו בצורה מדויקת',    sublabel: 'דיוק, סיכום מוצלח',            icon: Ruler,     riasecDeltas: { C: 2 } },
      { label: 'כשחידשתי פתרון מקורי',           sublabel: 'יצירתיות, המצאה, ייחודיות',   icon: Lightbulb, riasecDeltas: { A: 2, I: 1 } },
    ],
  },
  {
    id: 'energyPeak',
    text: 'איפה האנרגיה שלך במיטבה?',
    answers: [
      { label: 'מול אתגר אינטלקטואלי חדש', sublabel: 'ניתוח, חקירה, פתרון',          icon: Brain,    riasecDeltas: { I: 2 } },
      { label: 'כשאני בונה/ה ורואה/ה תוצאה', sublabel: 'עשייה מוחשית ופרקטית',       icon: Zap,      riasecDeltas: { R: 2 } },
      { label: 'בשיחה ועבודה עם אנשים',       sublabel: 'חיבור, שיתוף פעולה, השפעה', icon: Users,    riasecDeltas: { S: 2, E: 1 } },
      { label: 'כשיש לי חופש ליצור',           sublabel: 'יצירתיות ללא מגבלות',       icon: Sparkles, riasecDeltas: { A: 2 } },
    ],
  },

  // ── Geographic / lifestyle preference ─────────────────────────────────────────
  // No RIASEC deltas — answer is extracted separately in riasecEngine and stored
  // in the user profile as GeographicRegion.
  {
    id: 'geography',
    text: 'איפה תרצה/י להעביר את שנות הלימודים שלך?',
    sublabel: 'ההעדפה תשפיע על סדר המוסדות בהמלצות',
    answers: [
      {
        label:         'להישאר קרוב/ה לבית במרכז',
        sublabel:      'ת"א, ירושלים, הרצליה ואזור גוש דן',
        icon:          Home,
        geographicTag: 'center',
      },
      {
        label:         'מחפש/ת הרפתקה חדשה ומעבר לצפון',
        sublabel:      'טכניון, חיפה, כנרת, תל-חי ואזור הגליל',
        icon:          Mountain,
        geographicTag: 'north',
      },
      {
        label:         'לרדת דרומה לשינוי אווירה',
        sublabel:      'בן-גוריון, ספיר ואזור הנגב',
        icon:          Sun,
        geographicTag: 'south',
      },
      {
        label:         'פתוח/ה לכל האפשרויות',
        sublabel:      'המיקום פחות חשוב — תעדוף לפי תוכן',
        icon:          Globe,
        geographicTag: 'any',
      },
    ],
  },
];
