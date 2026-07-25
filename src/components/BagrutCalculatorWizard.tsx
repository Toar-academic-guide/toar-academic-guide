'use client';

import { Fragment, useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { BagrutSubjectRecord } from '@/types';
import { buildBagrutSubjectRecord } from '@/utils/bagrutSubjectRecord';

// ── Sector → mandatory subjects ───────────────────────────────────────────────

const SECTORS: Record<string, { n: string; min: number; max: number }[]> = {
  יהודי: [
    { n: 'תנ״ך', min: 1, max: 5 },
    { n: 'ספרות', min: 1, max: 5 },
    { n: 'הבעה עברית', min: 1, max: 5 },
    { n: 'אנגלית', min: 3, max: 5 },
    { n: 'מתמטיקה', min: 3, max: 5 },
    { n: 'היסטוריה / תע״י', min: 1, max: 5 },
    { n: 'אזרחות', min: 1, max: 5 },
  ],
  ערבי: [
    { n: 'ערבית', min: 1, max: 5 },
    { n: 'עברית', min: 3, max: 5 },
    { n: 'הבעה ערבית', min: 1, max: 5 },
    { n: 'אנגלית', min: 3, max: 5 },
    { n: 'מתמטיקה', min: 3, max: 5 },
    { n: 'היסטוריה ותולדות הערבים', min: 1, max: 5 },
    { n: 'אזרחות', min: 1, max: 5 },
  ],
  דרוזי: [
    { n: 'ערבית', min: 1, max: 5 },
    { n: 'עברית', min: 3, max: 5 },
    { n: 'אנגלית', min: 3, max: 5 },
    { n: 'מתמטיקה', min: 3, max: 5 },
    { n: 'מורשת דרוזית', min: 1, max: 5 },
    { n: 'אזרחות', min: 1, max: 5 },
  ],
  צרקסי: [
    { n: 'ערבית', min: 1, max: 5 },
    { n: 'עברית', min: 3, max: 5 },
    { n: 'אנגלית', min: 3, max: 5 },
    { n: 'מתמטיקה', min: 3, max: 5 },
    { n: 'היסטוריה', min: 1, max: 5 },
    { n: 'אזרחות', min: 1, max: 5 },
  ],
  בדואי: [
    { n: 'ערבית', min: 1, max: 5 },
    { n: 'עברית', min: 3, max: 5 },
    { n: 'אנגלית', min: 3, max: 5 },
    { n: 'מתמטיקה', min: 3, max: 5 },
    { n: 'היסטוריה', min: 1, max: 5 },
    { n: 'אזרחות', min: 1, max: 5 },
  ],
  שומרוני: [
    { n: 'ערבית', min: 1, max: 5 },
    { n: 'עברית', min: 3, max: 5 },
    { n: 'אנגלית', min: 3, max: 5 },
    { n: 'מתמטיקה', min: 3, max: 5 },
    { n: 'היסטוריה', min: 1, max: 5 },
    { n: 'אזרחות', min: 1, max: 5 },
  ],
};

// ── All 271 elective subjects ─────────────────────────────────────────────────

const ALL_SUBJECTS: string[] = [
  'אדריכלות',
  'אדריכלות ועצוב נוף',
  'אומנויות בינתחומי',
  'אומנויות הבישול והאפייה המלונאית',
  'אומנות שימושית',
  'אופטיקה יישומית',
  'אזרחות',
  'איטלקית',
  'אלקטרוניקה',
  'אלקטרוניקה ומחשבים',
  'אמהרית',
  'אמנות הקולנוע',
  'אמנות חזותית',
  'אנגלית',
  'אפסנאות וטכנולוגיה',
  'בולגרית',
  'בזק',
  'ביוטכנולוגיה',
  'ביוכימיה',
  'ביולוגיה',
  'ביולוגיה חקלאית',
  'ביולוגיה לקוסמטיקה',
  'בקרת אקלים',
  'בקרת מכונות',
  'בקרת תהליכים',
  'בריאות הילד וסביבתו',
  'גאוגרפיה אדם וסביבה',
  'גלוף עץ עצוב וטכנולוגיה',
  'גרוזית',
  'גרמנית',
  'גרפיקה ממוחשבת',
  'גרפיקה עצוב גרפי',
  'גרפיקה עצוב וטכנולוגיה',
  'דיפלומטיה ותקשורת בינלאומית',
  'דת האסלם',
  'הגנת סייבר',
  'הדפסת אופסט',
  'הולנדית',
  'הונגרית',
  'היסטוריה',
  'המטוס ומערכותיו',
  'המסוק ומערכותיו',
  'הנדסת אוטוטק',
  'הסטוריה ואזרחות',
  'הסטוריה וגאוגרפיה',
  'הסטוריה ותולדות הערבים',
  'הסטוריה ותולדות הערבים ואזרחות',
  'הסטוריה ותע"י',
  'הסטוריה תע"י ואזרחות',
  'הפקות בתקשורת',
  'השפעה ויוזמה חברתית',
  'חבור עברי',
  'חוק ומשפט',
  'חינוך גופני',
  'חנוך גופני וביולוגיה',
  'חנוך הילד בגיל הרך',
  'חקלאות',
  'חשבונאות',
  'חשוב סטטי וקונסטרוקציות',
  'חשובי קונסטרוקציות',
  'חשמל ואלקטרוניקה ברכב',
  'חשמל ובקרה ימיים',
  'טכלוגיה ובדיקת מזון',
  'טכנאות שיניים',
  'טכנולוגיה מוכללת',
  'טכנולוגיה של הדפוס',
  'טכנולוגיה של הקולנוע והטלויזיה',
  'טכנולוגיה של טכנאות שיניים',
  'טכנולוגיות בנייה',
  'טכנולוגית בנייה',
  'טלוויזיה וקולנוע',
  'טפול בחולה פנימי ובחולה כירורג',
  'ידיעת העם והמדינה',
  'יהדות',
  'יהדות ממ"ד',
  'יידיש',
  'ייצור רהיטים ונגרות בניין',
  'יישומי אוטוטק',
  'יישומי ביוטכנולוגיה',
  'יישומי מחשב',
  'יישומי פעילויות בחינוך',
  'ימאות',
  'ימאות ומטאורולוגיה',
  'ימאות וספינות',
  'יסודות בעיצוב שיער',
  'יסודות תורת המחשב',
  'כימיה',
  'כימיה אנליטית ותורת המכשירים',
  'כימיה וביולוגיה',
  'כימיה וטכסטיל',
  'כימיה טכנולוגית',
  'כימיה כללית ואורגנית',
  'כימיה כללית ואנאורגנית',
  'כימיה לקוסמטיקה',
  'כלכלה',
  'כלכלה ומשק',
  'כתבנות',
  'לאדינו',
  'לטינית /רומית',
  'לימודי ארץ ישראל וארכיאולוגיה',
  'לשון ותקשורת',
  'מבוא למחשבים וענ"א',
  'מבוא למחשבים ותכנות',
  'מדע התזונה והארוח',
  'מדע וטכנולוגיה לכל',
  'מדע חישובי',
  'מדעי הבריאות',
  'מדעי ההנדסה',
  'מדעי החברה',
  'מדעי החיים וחקלאות',
  'מדעי הטכנולוגיה',
  'מדעי הים',
  'מדעי המדינה',
  'מדעי המחשב',
  'מדעי הנדסה',
  'מדעי הסביבה',
  'מדעי התזונה',
  'מדעי כדור הארץ',
  'מדעי תחבורה מתקדמת',
  'מוט"ב - מדע וטכנולוגיה בחברה',
  'מוסיקה',
  'מורשת דרוזית',
  'מורשת דת נוצרית',
  'מורשת ודת האסלאם',
  'מורשת, דת ותרבות במזרח התיכון',
  'מזכירות',
  'מזכירות ומנהל',
  'מחול',
  'מחשבים ומערכות',
  'מחשבת ישראל',
  'מחשוב ובקרה',
  'מחשוב ובקרה בהתיישבות',
  'מידע וידע באינטרנט',
  'מידע ונתונים',
  'מיכון חקלאי ומערכות',
  'מיקרוביולוגיה',
  'מכונאות ימית',
  'מכונאות כללית',
  'מכונאות מיכון',
  'מכונות חום ותרמודנמיקה',
  'מכונות חקלאיות וטרקטורים',
  'מכניקה הנדסית',
  'מכשירים ופיקוד',
  'מנהיגות ויזמות',
  'מנהל וכלכלה',
  'מנועי מטוסים ותרמודנמיקה',
  'מנועים ומערכות הדראוליות',
  "מע' אלק' וחשמל ברכב",
  'מערכות אוטוטק',
  'מערכות אלקטואופטיות',
  'מערכות אלקטרוניות',
  'מערכות בזק',
  'מערכות ביוטכנולוגיה',
  'מערכות בקרה ממוחשבות',
  'מערכות ומכונאות בחקלאות',
  'מערכות חשמל',
  'מערכות חשמל ובקרה ימיות',
  'מערכות חשמל רכב',
  'מערכות כח ועבודה',
  'מערכות מדענות ממוחשבות',
  'מערכות מומחה',
  'מערכות מידע וידע',
  'מערכות מכון חקלאי',
  'מערכות מכונאות רכב',
  'מערכות מכטרוניקה',
  'מערכות מכשור ובקרה',
  'מערכות ניהול מלונאי',
  'מערכות סיב"מ',
  'מערכות פיקוד ובקרה',
  'מערכות פקוד ובקרה - מחשבים',
  'מערכות צ.מ.ה - ציוד מכני הנדסי',
  'מערכות רפואיות',
  'מערכות תוכנה וחמרה',
  'מערכות תיב"מ',
  'מערכות תכנון וייצור',
  'מערכות תעופה',
  'מערכות תעופה ואביזראות מטוסים',
  'מערכות תקשוב',
  'מערכות תקשורת',
  'מערכת תעוש הבגד',
  'מקצוע בין תחומי',
  'מתמטיקה',
  'נהול התפעול',
  'נהול ומזכירות',
  'נהול מוסד ומחסנאות',
  'נהול רכש ומלאי',
  'נהול שווק ומכירות',
  'ניהול הייצור',
  'ניהול התפעול',
  'ניהול ומלאי',
  'ניהול מלונאי',
  'ניהול משאבי אנוש',
  'ניהול תיירותי',
  'נתוח מערכות וארגון קבצים',
  'סדר דפוס',
  'סוציולוגיה',
  'סייעות ברפואת שיניים',
  'סינית',
  'סלובקית',
  'סעוד כללי',
  'ספרדית',
  'ספרות',
  'ספרות ומחשבת ישראל',
  'ספרות ופילוסופיה',
  'ספרות ותושבע"פ',
  'ספרות ילדים',
  'סרבית',
  'סרטוט אדריכלי',
  'סרטוט אוטומציה וחשמל',
  'סרטוט בניין אדריכלי',
  'סרטוט בניין לקונסטרוקציות',
  'סרטוט ואווירודנמיקה',
  'סרטוט וטכנולוגיה',
  'סרטוט וטכנולוגיה במיכון חקלאי',
  'סרטוט ומנועי מטוסים',
  'סרטוט ותורת המנוע והרכב',
  'סרטוט טכני',
  'סרטוט מכונות',
  'סרטוט מנועי מטוסים ופרקי מכונו',
  'סרטוט מפות',
  'ע"ג הוראה והדרכה',
  'עבודת גמר',
  'עברית',
  'עולם הערבים והאיסלם',
  'עיצוב',
  'עיצוב אופנה ותלבושות',
  'עיצוב שיער וטיפוח החן',
  'עצוב גרפי',
  'עצוב המוצר',
  'עצוב התכשיט',
  'עצוב וטכנולוגיה',
  'עצוב חזותי',
  'עצוב יהלומים',
  'עצוב כללי',
  'עצוב נוף',
  'עצוב שיער קוסמטיקה ואיפור',
  'ערבית',
  'ערבית ומורשת דרוזים',
  'ערבית ותולדות הערבים והאסלם',
  'פולנית',
  'פורטוגזית',
  'פילוסופיה',
  'פיסיקה',
  'פסיכולוגיה',
  'פסיכולוגיה התפתחותית',
  'פרסית',
  'ציור טכסטיל',
  'ציור שלטים ודקורציה',
  'צילום',
  "צ'כית",
  'צרפתית',
  'קוסמטיקה',
  'קרמיקה עצוב וטכנולוגיה',
  'רבי מלל',
  'רדיו ואלקטרוניקה ימית',
  'רומנית',
  'רוסית',
  'רשום ציור ואסטטיקה בעצוב',
  'שווק ומכירות',
  'שיווק וקידום מכירות',
  'שייט וניווט חופי',
  'תולדות האמנות והבנתה',
  'תולדות הלבוש וציורו',
  'תולדות הערבית ואזרחות',
  'תולדות עם ישראל',
  'תולדות עם ישראל ואזרחות',
  'תורכית',
  'תורת הבנייה וחמרי בניין',
  'תורת החשמל',
  'תורת הטלפון, תקשורת ומיתוג',
  'תורת המבנה, תחשיב ואוטומציה',
  'תורת המדידה',
  'תורת הניווט הימי',
  'תורת הסעוד',
  'תורת הצלום',
  'תורת הקולנוע והטלויזיה',
  'תורת טכנאות השיניים',
  'תושב"ע',
  'תושב"ע ומשפט עברי',
  'תחזוקת מערכות מכניות',
  'תחזוקת מערכות סלולריות',
  'תיאטרון',
  'תיירות',
  'תיירות ותפעול משרד נסיעות',
  'תכנון הנדסי של מבנים',
  'תכנון וסרטוט רהיטים',
  'תכנון ותכנות מערכות',
  'תכנון מבלטים ומתקנים',
  'תכנון פרקי מכונות',
  'תכנון פרקי מכשירים',
  'תכנון צנרת ומבנים',
  'תכנון תפריט ומחסנאות',
  'תכנות אוטוטק',
  'תכשיטנות עצוב וטכנולוגיה',
  'תלמוד',
  'תנ"ך',
  'תנ"ך וספרות',
  'תנ"ך ותושבע"פ',
  'תעשייה כימית',
  'תעשיית המזון',
  'תפעול מלון',
  'תקשורת',
  'תקשורת וחברה',
  'תרמודינמיקה',
  'תרמודינמיקה טכנית',
  'תשתיות מחשוב ותקשוב',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface MandGrade {
  units: number;
  grade: number | '';
}

interface ElectiveRow {
  name: string;
  units: number;
  grade: number | '';
}

interface Props {
  onComplete: (weightedAverage: number) => void;
  onStructuredComplete?: (record: BagrutSubjectRecord) => void;
}

// ── Step labels ───────────────────────────────────────────────────────────────

const STEP_LABELS = ['מגזר', 'חובה', 'בחירה', 'תוצאה'] as const;

// ── Shared input class ────────────────────────────────────────────────────────

const numInput =
  'w-16 rounded-lg border border-[#bae6fd] bg-white px-2 py-1.5 text-center text-sm ' +
  'text-slate-900 outline-none placeholder:text-slate-300 ' +
  'focus:border-[#0891b2] focus:ring-2 focus:ring-[#0891b2]/20';

// ── NeoButton-style button helper ─────────────────────────────────────────────

function WizBtn({
  onClick,
  children,
  ghost = false,
  className = '',
}: {
  onClick: () => void;
  children: React.ReactNode;
  ghost?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border-2 border-black py-3 text-base font-bold text-slate-900 transition',
        ghost
          ? 'bg-white px-6 hover:bg-slate-50 hover:shadow-[2px_2px_0_#000]'
          : 'bg-[#00E5FF] hover:bg-[#79F7FF] hover:shadow-[2px_2px_0_#000]',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BagrutCalculatorWizard({ onComplete, onStructuredComplete }: Props) {
  const [step, setStep] = useState(1);
  const [sector, setSector] = useState('יהודי');
  const [mandGrades, setMandGrades] = useState<MandGrade[]>(
    SECTORS['יהודי'].map((s) => ({ units: s.min, grade: '' })),
  );
  const [electives, setElectives] = useState<ElectiveRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [computedAvg, setComputedAvg] = useState<number | null>(null);
  const [structuredRecord, setStructuredRecord] = useState<BagrutSubjectRecord | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  function handleSetSector(sec: string) {
    setSector(sec);
    setMandGrades(SECTORS[sec].map((s) => ({ units: s.min, grade: '' })));
  }

  function goStep(n: number) {
    setStep(n);
    setDropOpen(false);
  }

  function updateMandUnits(i: number, v: number) {
    const sub = (SECTORS[sector] ?? SECTORS['יהודי'])[i];
    const clamped = Math.min(Math.max(v, sub.min), sub.max);
    setMandGrades((prev) => prev.map((mg, idx) => (idx === i ? { ...mg, units: clamped } : mg)));
  }

  function updateMandGrade(i: number, v: number | '') {
    setMandGrades((prev) => prev.map((mg, idx) => (idx === i ? { ...mg, grade: v } : mg)));
  }

  function addElective(name: string) {
    if (!electives.find((e) => e.name === name)) {
      setElectives((prev) => [...prev, { name, units: 1, grade: '' }]);
    }
    setSearchQuery('');
    setDropOpen(false);
  }

  function removeElective(idx: number) {
    setElectives((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateElectiveUnits(idx: number, v: number) {
    setElectives((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, units: Math.min(Math.max(1, v), 5) } : e)),
    );
  }

  function updateElectiveGrade(idx: number, v: number | '') {
    setElectives((prev) => prev.map((e, i) => (i === idx ? { ...e, grade: v } : e)));
  }

  function calculateAndAdvance() {
    const record = buildBagrutSubjectRecord({
      sectorLabel: sector,
      subjects: [
        ...sectorSubs.map((subject, index) => ({
          label: subject.n,
          units: mandGrades[index]?.units ?? subject.min,
          grade: mandGrades[index]?.grade ?? '',
        })),
        ...electives.map((subject) => ({
          label: subject.name,
          units: subject.units,
          grade: subject.grade,
        })),
      ],
    });
    const totalWeighted = record.subjects.reduce(
      (total, subject) => total + subject.units * subject.grade,
      0,
    );
    const totalUnits = record.subjects.reduce((total, subject) => total + subject.units, 0);

    setComputedAvg(totalUnits > 0 ? totalWeighted / totalUnits : 0);
    setStructuredRecord(record.subjects.length > 0 ? record : null);
    setStep(4);
  }

  function resetWizard() {
    setElectives([]);
    setMandGrades(SECTORS[sector].map((s) => ({ units: s.min, grade: '' })));
    setComputedAvg(null);
    setStructuredRecord(null);
    setStep(1);
  }

  const addedNames = new Set(electives.map((e) => e.name));
  const filteredSubjects = ALL_SUBJECTS.filter(
    (s) => !addedNames.has(s) && (!searchQuery || s.includes(searchQuery)),
  );

  const sectorSubs = SECTORS[sector] ?? SECTORS['יהודי'];

  const mandEnteredCount = mandGrades.filter(
    (m) => m.grade !== '' && (m.grade as number) > 0,
  ).length;
  const electEnteredCount = electives.filter(
    (e) => e.grade !== '' && (e.grade as number) > 0,
  ).length;
  const totalUnitsEntered =
    mandGrades.reduce((s, m) => s + (m.grade !== '' && (m.grade as number) > 0 ? m.units : 0), 0) +
    electives.reduce((s, e) => s + (e.grade !== '' && (e.grade as number) > 0 ? e.units : 0), 0);

  return (
    <div dir="rtl" className="overflow-hidden rounded-2xl border border-[#bae6fd]">
      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-center border-b border-[#bae6fd] bg-[#e8f9ff] px-6 py-4">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const isDone = n < step;
          const isActive = n === step;
          return (
            <Fragment key={n}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => goStep(n)}
                  className={[
                    'flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-full border-2',
                    'text-sm font-bold transition hover:scale-110',
                    isDone
                      ? 'border-[#0891b2] bg-[#e0f9ff] text-[#0891b2] hover:bg-[#bae6fd]'
                      : isActive
                        ? 'border-[#00E5FF] bg-[#00E5FF] text-slate-900 shadow-[0_0_0_4px_rgba(0,229,255,0.2)] hover:bg-[#79F7FF]'
                        : 'border-[#bae6fd] bg-white text-slate-400 hover:border-[#38bdf8]',
                  ].join(' ')}
                >
                  {isDone ? <Check size={14} /> : n}
                </button>
                <span
                  className={`mt-1.5 cursor-pointer text-[11px] ${isActive ? 'font-bold text-slate-900' : 'text-slate-400'}`}
                  onClick={() => goStep(n)}
                >
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={`mt-4 h-0.5 min-w-8 flex-1 ${isDone ? 'bg-[#0891b2]' : 'bg-[#bae6fd]'}`}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Sector ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="p-7">
          <h3 className="mb-1 text-xl font-black text-slate-900">מאיזה מגזר תעודת הבגרות שלך?</h3>
          <p className="mb-5 text-sm text-slate-500">
            הבחירה קובעת אילו מקצועות חובה יופיעו בשלב הבא
          </p>
          <div className="mb-6 grid grid-cols-3 gap-2">
            {Object.keys(SECTORS).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleSetSector(sec)}
                className={[
                  'rounded-xl border-2 py-3 text-sm font-bold transition',
                  sector === sec
                    ? 'border-[#1e1b4b] bg-[#1e1b4b] text-[#00E5FF]'
                    : 'border-[#bae6fd] bg-white text-slate-600 hover:border-[#38bdf8] hover:bg-[#f0fbff]',
                ].join(' ')}
              >
                {sec}
              </button>
            ))}
          </div>
          <WizBtn onClick={() => goStep(2)} className="w-full">
            המשך למקצועות חובה ←
          </WizBtn>
        </div>
      )}

      {/* ── Step 2: Mandatory ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="p-7">
          <h3 className="mb-1 text-xl font-black text-slate-900">מקצועות חובה</h3>
          <p className="mb-5 text-sm text-slate-500">הזינו יחידות לימוד וציון לכל מקצוע</p>
          <div className="mb-4 space-y-2">
            {sectorSubs.map((sub, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-[#e0f9ff] bg-[#f8feff] px-4 py-2.5"
              >
                <span className="flex-1 text-sm font-bold text-slate-900">{sub.n}</span>
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-semibold text-slate-400">יח׳</span>
                  <input
                    type="number"
                    min={sub.min}
                    max={sub.max}
                    value={mandGrades[i]?.units ?? sub.min}
                    onChange={(e) => updateMandUnits(i, Number(e.target.value))}
                    className={numInput}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-semibold text-slate-400">ציון</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="—"
                    value={mandGrades[i]?.grade ?? ''}
                    onChange={(e) =>
                      updateMandGrade(i, e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className={numInput}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <WizBtn onClick={() => goStep(3)} className="flex-1">
              המשך למקצועות בחירה ←
            </WizBtn>
            <WizBtn onClick={() => goStep(1)} ghost>
              → חזרה
            </WizBtn>
          </div>
        </div>
      )}

      {/* ── Step 3: Electives ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="p-7">
          <h3 className="mb-1 text-xl font-black text-slate-900">מקצועות בחירה</h3>
          <p className="mb-4 text-sm text-slate-500">הקלידו שם מקצוע או לחצו על החץ לרשימה המלאה</p>

          {/* Search with flush chevron */}
          <div ref={searchWrapRef} className="relative mb-2">
            <div className="flex overflow-hidden rounded-xl border-2 border-[#bae6fd] bg-white transition focus-within:border-[#0891b2]">
              <input
                ref={searchRef}
                type="text"
                placeholder="חפשו מקצוע... (לדוגמה: פיזיקה, ביולוגיה)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDropOpen(true);
                }}
                onFocus={() => setDropOpen(true)}
                className="min-w-0 flex-1 border-none bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (dropOpen) {
                    setDropOpen(false);
                  } else {
                    setSearchQuery('');
                    setDropOpen(true);
                    searchRef.current?.focus();
                  }
                }}
                className="flex shrink-0 items-center border-r border-[#bae6fd] bg-white px-4 text-[#0891b2] transition hover:bg-[#e0f9ff]"
                aria-label="הצג רשימה מלאה"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {dropOpen && filteredSubjects.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[#bae6fd] bg-white shadow-lg">
                {filteredSubjects.map((s) => (
                  <div
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addElective(s);
                    }}
                    className="cursor-pointer border-b border-[#f0f9ff] px-4 py-2.5 text-sm text-slate-900 last:border-0 hover:bg-[#f0fbff] hover:text-[#0891b2]"
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Elective rows */}
          <div className="mb-4 space-y-2">
            {electives.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#bae6fd] bg-[#f8feff] px-4 py-5 text-center text-sm italic text-slate-400">
                עוד לא הוספתם מקצועות בחירה — חפשו מקצוע למעלה או לחצו על החץ לרשימה המלאה
              </div>
            ) : (
              electives.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[#e0f9ff] bg-[#f8feff] px-4 py-2.5"
                >
                  <span className="flex-1 text-sm font-bold text-slate-900">{e.name}</span>
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-semibold text-slate-400">יח׳</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={e.units}
                      onChange={(ev) => updateElectiveUnits(i, Number(ev.target.value))}
                      className={numInput}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-semibold text-slate-400">ציון</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="—"
                      value={e.grade === '' ? '' : e.grade}
                      onChange={(ev) =>
                        updateElectiveGrade(
                          i,
                          ev.target.value === '' ? '' : Number(ev.target.value),
                        )
                      }
                      className={numInput}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeElective(i)}
                    aria-label="הסר מקצוע"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3">
            <WizBtn onClick={calculateAndAdvance} className="flex-1">
              חשב ממוצע בגרות ←
            </WizBtn>
            <WizBtn onClick={() => goStep(2)} ghost>
              → חזרה
            </WizBtn>
          </div>
        </div>
      )}

      {/* ── Step 4: Result ───────────────────────────────────────────── */}
      {step === 4 && (
        <div className="p-7">
          <h3 className="mb-4 text-xl font-black text-slate-900">אומדן ממוצע הציונים שלך</h3>

          <div className="mb-4 rounded-2xl border-2 border-[#00E5FF] bg-[#e8f9ff] py-6 text-center">
            <div className="text-5xl font-black tracking-tight text-slate-900">
              {computedAvg !== null && computedAvg > 0 ? computedAvg.toFixed(1) : '—'}
            </div>
            <div className="mt-1 text-sm text-slate-500">אומדן לפי ציונים ויחידות לימוד</div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { value: mandEnteredCount, label: 'מקצועות חובה' },
              { value: electEnteredCount, label: 'מקצועות בחירה' },
              { value: totalUnitsEntered, label: 'יחידות לימוד' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl border border-[#bae6fd] bg-[#f0fbff] p-3 text-center"
              >
                <div className="text-xl font-black text-[#0891b2]">{value}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="mb-4 rounded-xl border border-[#e0f9ff] bg-[#f8feff] px-4 py-3.5 text-xs leading-relaxed text-slate-500">
            <strong className="font-bold text-slate-900">שים לב — זהו אומדן ראשוני בלבד.</strong>{' '}
            הוא מחושב מציונים ויחידות בלבד ואינו מחליף ממוצע בגרות משוקלל רשמי כולל בונוסים. הממוצע
            הקובע הוא תמיד זה שמחושב במשרד הרישום של כל מוסד.
          </div>

          <div className="flex gap-3">
            {computedAvg !== null && computedAvg > 0 && (
              <WizBtn
                onClick={() => {
                  onComplete(Math.round(computedAvg * 10) / 10);
                  if (structuredRecord) {
                    onStructuredComplete?.(structuredRecord);
                  }
                }}
                className="flex-1"
              >
                השתמש/י באומדן זה ←
              </WizBtn>
            )}
            <WizBtn onClick={resetWizard} ghost>
              חישוב מחדש
            </WizBtn>
          </div>
        </div>
      )}
    </div>
  );
}
