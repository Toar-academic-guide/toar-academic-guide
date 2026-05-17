import type { LucideIcon } from 'lucide-react';
import {
  Wrench, Search, Palette, Heart, Rocket, BarChart3,
  Cpu, MessageCircle, Star, Brain, Stethoscope, Package,
  Lightbulb, Sparkles, DollarSign, Zap,
  Headphones, Users, Layers,
  Monitor, MapPin, Globe,
  Wand2, Crown, Ruler,
} from 'lucide-react';
import type { RiasecDimension, EnvironmentPreference } from '@/types';

export interface QuizAnswer {
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  riasecDeltas?: Partial<Record<RiasecDimension, number>>;
  environmentDelta?: Partial<EnvironmentPreference>;
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
    ],
  },
  {
    id: 'purpose',
    text: 'מה הכי חשוב לך שהעבודה תיתן לך?',
    answers: [
      { label: 'אתגר אינטלקטואלי', sublabel: 'בעיות שמאלצות אותי לחשוב',    icon: Lightbulb,  riasecDeltas: { I: 2 } },
      { label: 'תרומה חברתית',      sublabel: 'להשפיע על חיי אנשים',         icon: Heart,      riasecDeltas: { S: 2 } },
      { label: 'ביטוי אישי',         sublabel: 'ליצור משהו שמזוהה איתי',      icon: Sparkles,   riasecDeltas: { A: 2, E: 1 } },
      { label: 'יציבות ומשכורת',    sublabel: 'כסף ופיתוח קריירה',           icon: DollarSign, riasecDeltas: { E: 2, C: 1 } },
      { label: 'לבנות דברים',        sublabel: 'תוצר מוחשי, לראות את הפרי',  icon: Zap,        riasecDeltas: { R: 2, I: 1 } },
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
];
