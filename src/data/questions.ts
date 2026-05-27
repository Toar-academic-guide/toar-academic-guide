/**
 * Filter questions shown AFTER the RIASEC exam.
 * These are not personality questions — they collect preferences (avoidances
 * and geographic region) used by the recommendation engine.
 *
 * The full RIASEC personality assessment is handled by RiasecExam.tsx +
 * src/data/riasecItems.ts (42 items, 7 per dimension).
 */
import type { LucideIcon } from 'lucide-react';
import {
  Calculator, BookOpen, FileText, Coffee, Monitor,
  Home, Mountain, Sun, Globe,
} from 'lucide-react';
import type { GeographicRegion, AvoidanceTag } from '@/types';

export interface QuizAnswer {
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  /** Geographic region tag — only present on the 'geography' question. */
  geographicTag?: GeographicRegion;
  /** Avoidance tag — only present on the 'avoidances' question. */
  avoidanceTag?: AvoidanceTag;
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

  // ── Avoidance filter ──────────────────────────────────────────────────────
  // Answers drive the −40% penalty in the recommendation engine.
  {
    id: 'avoidances',
    text: 'מה אתה/את הכי רוצה להימנע ממנו בלימודים?',
    sublabel: 'בחר/י עד שניים — זה יעזור לסנן תוכניות שפחות מתאימות לך',
    multiSelect: true,
    maxSelect: 2,
    answers: [
      {
        label: 'מתמטיקה מתקדמת',
        sublabel: 'חישובים, נוסחאות, סטטיסטיקה כבדה',
        icon: Calculator,
        avoidanceTag: 'heavy-math',
      },
      {
        label: 'קריאה וכתיבה מרובה',
        sublabel: 'מאמרים ארוכים, עבודות סמינריוניות, ספרי לימוד',
        icon: BookOpen,
        avoidanceTag: 'heavy-reading',
      },
      {
        label: 'בירוקרטיה ונהלים',
        sublabel: 'טפסים, תקנות, אדמיניסטרציה יבשה',
        icon: FileText,
        avoidanceTag: 'bureaucracy',
      },
      {
        label: 'עבודה בודדת מול מסך',
        sublabel: 'לימוד עצמאי ממושך, ללא עבודת צוות',
        icon: Monitor,
        avoidanceTag: 'solo-work',
      },
      {
        label: 'אין לי התנגדות מיוחדת',
        sublabel: 'פתוח/ה לכל סוגי הלימוד',
        icon: Coffee,
      },
    ],
  },

  // ── Geographic preference ─────────────────────────────────────────────────
  // Stored in the user profile; influences institution ordering in results.
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
