'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  GraduationCap,
  LineChart,
  LockKeyhole,
  MapPinned,
  Radar,
  Target,
} from 'lucide-react';
import PublicNavBar from './PublicNavBar';
import WayPageShell from './WayPageShell';
import type { CatalogueProgram } from '@/types/catalogue';

interface Props {
  onAlreadyKnow: () => void;
  onNeedHelp: () => void;
  onSignIn: () => void;
  onGoToBucket: () => void;
  onCalculate: (psychometric: number, bagrut: number, degreeId: string) => void;
  onGoToProfile: () => void;
  programs: CatalogueProgram[];
  authLoading?: boolean;
  isAuthenticated?: boolean;
  savedCount?: number;
  userInitials?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

const processSteps = [
  {
    title: 'מתחילים מהמצב שלך',
    text: 'ציונים, העדפות, אזור בארץ ומה חשוב לך באמת בלימודים ובעבודה.',
    icon: Target,
  },
  {
    title: 'מקבלים כיוון ברור',
    text: 'המערכת מתרגמת תשובות לתחומי לימוד ותוכניות שאפשר לבדוק ברצינות.',
    icon: Radar,
  },
  {
    title: 'בודקים אפשרות קבלה',
    text: 'מחשבון קבלה ורשימת תארים שמאפשרים לעבור מהתלבטות להחלטה.',
    icon: LineChart,
  },
];

const movingStudyOptions = [
  { label: 'מדעי המחשב', x: '8%', y: '36%', delay: 0 },
  { label: 'פסיכולוגיה', x: '36%', y: '24%', delay: 0.3 },
  { label: 'הנדסה', x: '66%', y: '36%', delay: 0.7 },
  { label: 'כלכלה', x: '70%', y: '62%', delay: 0.15 },
  { label: 'עיצוב', x: '13%', y: '64%', delay: 0.55 },
  { label: 'ביולוגיה', x: '43%', y: '70%', delay: 0.9 },
];

const funnelStages = [
  {
    title: 'מה',
    question: 'בוחרים כיוון לימודים',
    text: 'מתוך מאות תחומים ואפשרויות.',
    icon: Compass,
    width: '100%',
    tone: 'from-[#f1edff]/95 to-[#faf7ff]/90',
    accent: 'text-[#7784e8]',
  },
  {
    title: 'איפה',
    question: 'מצמצמים מוסדות',
    text: 'משווים בין 200+ מוסדות ותוכניות.',
    icon: MapPinned,
    width: '78%',
    tone: 'from-[#e7f8ff]/95 to-[#f6fbff]/90',
    accent: 'text-[#52bde5]',
  },
  {
    title: 'איך',
    question: 'מקבלים דרך פעולה',
    text: 'מה צריך לעשות כדי להתקבל.',
    icon: LineChart,
    width: '56%',
    tone: 'from-[#fff0f8]/95 to-[#fffafd]/90',
    accent: 'text-[#ef83bb]',
  },
];

function DecisionFunnel({
  onNeedHelp,
  onAlreadyKnow,
}: Pick<Props, 'onNeedHelp' | 'onAlreadyKnow'>) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStage((current) => (current + 1) % funnelStages.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative z-10 mx-auto max-w-6xl">
      <div className="mb-10 text-center">
        <p className="text-sm font-bold text-[#7784e8]">מה איפה איך</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#445274] sm:text-5xl">
          הדרך הקצרה מתואר לא ברור לתוכנית פעולה.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6f7a99]">
          שלושה שלבים. קודם בוחרים כיוון, אחר כך מקום, ובסוף מבינים איך להתקבל.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/72 px-4 py-7 shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-x-10 top-20 h-[72%] rounded-[55%] bg-[linear-gradient(180deg,rgba(119,132,232,0.09),rgba(143,216,255,0.16),rgba(255,173,213,0.10))]" />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-28 h-[72%] w-[58%] -translate-x-1/2 rounded-[50%] border border-white/80"
          animate={{ opacity: [0.36, 0.62, 0.36], scaleX: [0.95, 1.02, 0.95] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-4">
          <div className="relative h-56 w-full overflow-hidden rounded-[1.5rem] bg-white/38">
            <p className="absolute inset-x-0 top-5 text-center text-sm font-bold text-[#7784e8]">
              הרבה אפשרויות בהתחלה
            </p>
            {movingStudyOptions.map((option, index) => (
              <motion.button
                key={option.label}
                type="button"
                onClick={() => setActiveStage(0)}
                className="absolute rounded-2xl border border-white bg-white/90 px-4 py-2 text-sm font-bold text-[#52607f] shadow-[0_12px_30px_rgba(105,133,190,0.12)] backdrop-blur transition hover:text-[#6574dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
                style={{ left: option.x, top: option.y }}
                animate={{
                  x: [0, index % 2 === 0 ? 18 : -16, 0],
                  y: [0, index % 2 === 0 ? -8 : 9, 0],
                }}
                transition={{
                  delay: option.delay,
                  duration: 7.5 + index * 0.25,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              >
                {option.label}
              </motion.button>
            ))}
          </div>

          {funnelStages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === activeStage;

            return (
              <motion.button
                key={stage.title}
                type="button"
                onClick={() => setActiveStage(index)}
                onMouseEnter={() => setActiveStage(index)}
                onFocus={() => setActiveStage(index)}
                className={`relative grid min-h-[120px] w-full grid-cols-[auto_1fr] items-center gap-4 overflow-hidden border bg-gradient-to-br px-8 py-5 text-right shadow-[0_20px_56px_rgba(105,133,190,0.13)] backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff] sm:max-w-[var(--stage-width)] ${stage.tone} ${
                  isActive ? 'border-[#c9d4ff] opacity-100' : 'border-white/80 opacity-85'
                }`}
                style={{
                  '--stage-width': stage.width,
                  clipPath: 'polygon(4% 0, 96% 0, 88% 100%, 12% 100%)',
                } as CSSProperties}
                animate={{ y: isActive ? -4 : 0, scale: isActive ? 1.015 : 1 }}
                transition={{ duration: 0.25 }}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                  <Icon className={stage.accent} size={22} />
                </span>
                <span>
                  <span className={`block text-4xl font-bold ${stage.accent}`}>{stage.title}</span>
                  <span className="mt-1 block text-2xl font-bold text-[#445274]">{stage.question}</span>
                  <span className="mt-2 block text-sm leading-6 text-[#6f7a99]">{stage.text}</span>
                </span>
              </motion.button>
            );
          })}

          <motion.div
            className="relative mt-1 flex w-full max-w-sm flex-col items-center rounded-[1.6rem] border border-white bg-white px-6 py-5 text-center shadow-[0_18px_54px_rgba(105,133,190,0.15)]"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CheckCircle2 className="text-[#7784e8]" size={26} />
            <p className="mt-2 text-lg font-bold text-[#445274]">מסלול ברור להתחיל ממנו</p>
          </motion.div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onNeedHelp}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7784e8] px-6 text-sm font-bold text-white shadow-[0_14px_34px_rgba(119,132,232,0.24)] transition hover:bg-[#6574dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
            >
              עזרו לי לבחור מה ללמוד
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              onClick={onAlreadyKnow}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d9e3f3] bg-white px-6 text-sm font-bold text-[#445274] transition hover:bg-[#f8fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8c4ff]"
            >
              כבר יש לי כיוון
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroFunnelPreview() {
  const heroOptions = [
    {
      label: 'מדעי המחשב',
      emoji: '📊',
      x: '42%',
      y: '5%',
      drift: 14,
      float: -8,
      tone: 'text-[#5f75f1]',
    },
    {
      label: 'רפואה',
      emoji: '💗',
      x: '10%',
      y: '18%',
      drift: -12,
      float: 9,
      tone: 'text-[#ef6ea9]',
    },
    {
      label: 'משפטים',
      emoji: '⚖️',
      x: '63%',
      y: '18%',
      drift: 12,
      float: -7,
      tone: 'text-[#8a76ef]',
    },
    {
      label: 'כלכלה',
      emoji: '📈',
      x: '23%',
      y: '31%',
      drift: 10,
      float: 8,
      tone: 'text-[#52a8ef]',
    },
    {
      label: 'פסיכולוגיה',
      emoji: '🍃',
      x: '53%',
      y: '34%',
      drift: -12,
      float: -8,
      tone: 'text-[#39bfc4]',
    },
  ];

  const heroStages = [
    {
      title: 'מה',
      text: 'סינון ראשוני במטרה להבין מה הכיוון הכללי',
      icon: Compass,
      accent: 'text-[#365bc8]',
      glow: 'from-[#f5f2ff] to-white',
      width: '100%',
      badge: 'bg-[#365bc8]',
    },
    {
      title: 'איפה',
      text: '200+ מוסדות',
      icon: MapPinned,
      accent: 'text-[#8357d8]',
      glow: 'from-[#edf8ff] to-white',
      width: '88%',
      badge: 'bg-[#8357d8]',
    },
    {
      title: 'איך',
      text: 'דרך קבלה מותאמת אישית',
      icon: GraduationCap,
      accent: 'text-[#ef83bb]',
      glow: 'from-[#fff0f8] to-white',
      width: '80%',
      badge: 'bg-[#ef83bb]',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
      className="relative min-h-[610px] sm:min-h-[670px]"
    >
      <div className="absolute inset-x-2 top-0 h-[570px] rounded-[48%] bg-[linear-gradient(180deg,rgba(119,132,232,0.08),rgba(143,216,255,0.16)_50%,rgba(255,173,213,0.09))] blur-2xl" />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-6 h-[220px] w-[99%] -translate-x-1/2 rounded-[50%] bg-white/14 shadow-[inset_0_24px_70px_rgba(255,255,255,0.58)] blur-[0.5px]"
        animate={{ opacity: [0.22, 0.46, 0.22], scaleX: [0.94, 1.04, 0.94] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-3 h-[430px] w-[99%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(235,232,255,0.46),rgba(222,246,255,0.34)_54%,rgba(255,240,248,0.26))] blur-xl"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 66% 100%, 34% 100%)',
          maskImage:
            'radial-gradient(ellipse at 50% 16%, black 0%, black 42%, transparent 82%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 16%, black 0%, black 42%, transparent 82%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[150px] h-[280px] w-[70%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(137,220,255,0.16),rgba(255,194,226,0.14))] blur-lg"
        style={{
          clipPath: 'polygon(5% 0, 95% 0, 66% 100%, 34% 100%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, black 12%, black 62%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, black 12%, black 62%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-4 h-[420px] w-[96%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.26),transparent)] blur-2xl"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 66% 100%, 34% 100%)',
          maskImage:
            'radial-gradient(ellipse at 50% 18%, black 0%, black 36%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 18%, black 0%, black 36%, transparent 78%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-16 h-[190px] w-[94%] -translate-x-1/2 rounded-[50%] border border-white/35 blur-[1.5px]"
        animate={{ rotate: [0, 7, 0], opacity: [0.16, 0.34, 0.16] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-8 h-[374px] w-3 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.32),rgba(122,132,232,0.10),rgba(255,255,255,0))] blur-md"
        animate={{ opacity: [0.16, 0.38, 0.16] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {heroOptions.map((option, index) => (
        <motion.div
          key={option.label}
          data-study-chip
          className={`pointer-events-none absolute inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-white/85 bg-white/82 py-2 pl-3 pr-4 text-xs font-bold shadow-[0_12px_34px_rgba(105,133,190,0.12)] backdrop-blur-xl sm:text-sm ${option.tone}`}
          style={{ left: option.x, top: option.y, zIndex: 3 }}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{
            x: [0, option.drift, -option.drift * 0.35, 0],
            y: [0, option.float, -option.float * 0.35, 0],
            opacity: [0.7, 0.92, 0.82, 0.7],
            scale: [0.98, 1.015, 0.99, 0.98],
          }}
          transition={{
            delay: index * 0.18,
            duration: 8 + index * 0.55,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <span>{option.label}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow-sm">
            {option.emoji}
          </span>
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto flex max-w-[500px] flex-col items-center pt-[300px]">
        {heroStages.map((stage, index) => {
          const Icon = stage.icon;

          return (
            <motion.div
              key={stage.title}
              className={`relative mb-5 grid min-h-[108px] w-full grid-cols-[1fr_auto] items-center gap-5 rounded-[1.7rem] border border-white/90 bg-gradient-to-br ${stage.glow} px-7 py-5 text-right shadow-[0_20px_58px_rgba(105,133,190,0.15)] backdrop-blur-xl`}
              style={{ width: stage.width }}
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 4.8,
                delay: index * 0.22,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <span
                className={`absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-[0_8px_22px_rgba(119,132,232,0.24)] ${stage.badge}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className={`text-4xl font-bold leading-none ${stage.accent}`}>{stage.title}</div>
                <div className="mt-2 text-sm font-bold leading-5 text-[#445274] sm:text-base">
                  {stage.text}
                </div>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/86 text-[#7784e8] shadow-sm">
                <Icon className={stage.accent} size={25} />
              </div>
              {index < heroStages.length - 1 ? (
                <span className="absolute -bottom-5 left-1/2 h-5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,#9cc8ff,#f0a2d2)]" />
              ) : null}
            </motion.div>
          );
        })}

        <motion.div
          className="mt-1 flex w-[58%] min-w-[250px] items-center justify-center gap-2 rounded-[1.45rem] border border-white bg-white/92 px-4 py-4 text-center shadow-[0_16px_48px_rgba(105,133,190,0.14)] backdrop-blur-xl"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CheckCircle2 className="shrink-0 text-[#7784e8]" size={22} />
          <div>
            <div className="text-lg font-bold text-[#445274]">הצעד הבא שלך</div>
            <div className="mt-1 text-xs font-medium text-[#6f7a99]">מסלול ברור להתחיל ממנו</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function LandingPage({
  onAlreadyKnow,
  onNeedHelp,
  onSignIn,
  onGoToBucket,
  onCalculate,
  onGoToProfile,
  programs,
  authLoading = false,
  isAuthenticated = false,
  savedCount = 0,
  userInitials,
  userEmail,
  onSignOut,
}: Props) {
  const startRef = useRef<HTMLElement>(null);
  const [psychometric, setPsychometric] = useState('');
  const [bagrut, setBagrut] = useState('');
  const [selectedDegreeId, setSelectedDegreeId] = useState(programs[0]?.id ?? '');
  const [calcErrors, setCalcErrors] = useState<{
    psychometric?: string;
    bagrut?: string;
    degree?: string;
  }>({});

  const uniqueCategories = useMemo(
    () => [...new Set(programs.map((program) => program.category))].sort(),
    [programs],
  );
  const selectedProgramExists = programs.some((program) => program.id === selectedDegreeId);

  useEffect(() => {
    if (programs.length === 0) {
      setSelectedDegreeId('');
      return;
    }

    if (!selectedDegreeId || !programs.some((program) => program.id === selectedDegreeId)) {
      setSelectedDegreeId(programs[0].id);
    }
  }, [programs, selectedDegreeId]);

  function handleCalcSubmit() {
    const errs: typeof calcErrors = {};
    const psy = Number(psychometric);
    const bag = Number(bagrut);

    if (!psychometric || Number.isNaN(psy) || psy < 200 || psy > 800) {
      errs.psychometric = 'ציון בין 200 ל-800';
    }

    if (!bagrut || Number.isNaN(bag) || bag < 60 || bag > 120) {
      errs.bagrut = 'ממוצע בין 60 ל-120';
    }

    if (!selectedDegreeId) {
      errs.degree = 'צריך לבחור תואר לבדיקה';
    }

    setCalcErrors(errs);
    if (!selectedDegreeId || !selectedProgramExists) {
      return;
    }
    if (Object.keys(errs).length === 0) {
      onCalculate(psy, bag, selectedDegreeId);
    }
  }

  function scrollToStart() {
    startRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <WayPageShell contentClassName="" navigation={
      <PublicNavBar
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        onCalculatorClick={() => scrollToSection('calculator')}
        onGoToBucket={onGoToBucket}
        onMethodClick={() => scrollToSection('method')}
        onPathClick={() => scrollToSection('path')}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onStartClick={scrollToStart}
        savedCount={savedCount}
        userEmail={userEmail}
        userInitials={userInitials}
      />

    }>
      <main className="relative overflow-hidden">
        <section className="relative px-4 pb-16 pt-28 sm:px-6 lg:pb-24 lg:pt-28">

          <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="relative z-10"
            >
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#0c1d45] sm:text-5xl lg:text-6xl">
                <span className="block">בוחרים</span>
                <span className="block">
                  <span className="text-[#365bc8]">מה</span> ללמוד,
                </span>
                <span className="block">
                  <span className="text-[#8357d8]">איפה</span> ללמוד,
                </span>
                <span className="block">
                  <span className="text-[#ef83bb]">ואיך</span> להתקבל.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#6d7896] sm:text-xl" dir="rtl">
                בתוך ריבוי האפשרויות, <span dir="ltr">Way</span> עוזרת לעשות סדר ולבנות דרך
                שמתאימה <strong className="font-bold text-[#445274]">לך.</strong>
                <br />
                שנתחיל?
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onNeedHelp}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#7784e8] px-6 py-4 text-base font-bold text-white shadow-[0_18px_44px_rgba(119,132,232,0.32)] transition hover:bg-[#6574dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
                >
                  עזרו לי לבחור מה ללמוד
                  <ArrowLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={onAlreadyKnow}
                  className="inline-flex h-13 items-center justify-center rounded-2xl border border-[#dae4f4] bg-white/80 px-6 py-4 text-base font-bold text-[#4d5a79] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8c4ff]"
                >
                  כבר יש לי כיוון
                </button>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 text-right">
                {[
                  ['200+', 'מוסדות ותוכניות'],
                  ['10 דק׳', 'עד כיוון ראשוני'],
                  ['3', 'שכבות החלטה'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white bg-white/62 p-4 shadow-sm backdrop-blur"
                  >
                    <div className="text-2xl font-bold text-[#445274]">{value}</div>
                    <div className="mt-1 text-xs leading-5 text-[#7c86a2]">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="relative z-10">
              <HeroFunnelPreview />
            </div>
          </div>
        </section>

        <section id="method" className="relative scroll-mt-28 px-4 py-16 sm:px-6 lg:py-24">
          <DecisionFunnel onNeedHelp={onNeedHelp} onAlreadyKnow={onAlreadyKnow} />
        </section>

        <section id="calculator" ref={startRef} className="relative scroll-mt-28 px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between rounded-[1.7rem] border border-white bg-white/72 p-6 text-[#445274] shadow-[0_20px_70px_rgba(105,133,190,0.14)] backdrop-blur lg:p-8">
              <div>
                <p className="text-sm font-bold text-[#7784e8]">בדיקת סיכויי קבלה</p>
                <h2 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
                  לא צריך לנחש אם את/ה בכיוון.
                </h2>
                <p className="mt-5 text-base leading-7 text-[#6f7a99]">
                  אפשר להתחיל מבדיקה מהירה עם פסיכומטרי וממוצע בגרות, או לעבור למחשבון המפורט
                  ששומר את הציונים ומחשב בגרות לפי מגזר, מקצועות חובה ומקצועות בחירה.
                </p>
              </div>

              <button
                type="button"
                onClick={onGoToProfile}
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-2xl border border-[#d9e3f3] bg-white px-4 py-3 text-sm font-bold text-[#445274] transition hover:border-[#8fd8ff] hover:bg-[#f2fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
              >
                <LockKeyhole size={16} />
                למחשבון המפורט ששומר ציונים
              </button>
            </div>

            <div className="rounded-[1.7rem] border border-white bg-white p-4 text-[#445274] shadow-[0_24px_80px_rgba(105,133,190,0.18)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">מחשבון מהיר</h3>
                  <p className="mt-1 text-sm leading-6 text-[#79849e]">
                    תמונה ראשונית. דיוק מלא דורש ציוני בגרות לפי מקצוע.
                  </p>
                </div>
                <span className="rounded-2xl bg-[#ecfdf5] px-3 py-1 text-xs font-bold text-emerald-700">
                  פעיל
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="calc-psychometric" className="mb-2 block text-sm font-bold">
                    ציון פסיכומטרי
                  </label>
                  <input
                    id="calc-psychometric"
                    type="number"
                    min={200}
                    max={800}
                    placeholder="200-800"
                    value={psychometric}
                    onChange={(event) => {
                      setPsychometric(event.target.value);
                      setCalcErrors((previous) => ({ ...previous, psychometric: undefined }));
                    }}
                    className={`h-12 w-full rounded-2xl border bg-[#f8fbff] px-4 text-base outline-none transition focus:border-[#7784e8] focus:bg-white ${
                      calcErrors.psychometric ? 'border-rose-400' : 'border-[#e2e9f4]'
                    }`}
                  />
                  {calcErrors.psychometric ? (
                    <p className="mt-1 text-xs text-rose-600">{calcErrors.psychometric}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="calc-bagrut" className="mb-2 block text-sm font-bold">
                    ממוצע בגרות
                  </label>
                  <input
                    id="calc-bagrut"
                    type="number"
                    min={60}
                    max={120}
                    placeholder="60-120"
                    value={bagrut}
                    onChange={(event) => {
                      setBagrut(event.target.value);
                      setCalcErrors((previous) => ({ ...previous, bagrut: undefined }));
                    }}
                    className={`h-12 w-full rounded-2xl border bg-[#f8fbff] px-4 text-base outline-none transition focus:border-[#7784e8] focus:bg-white ${
                      calcErrors.bagrut ? 'border-rose-400' : 'border-[#e2e9f4]'
                    }`}
                  />
                  {calcErrors.bagrut ? (
                    <p className="mt-1 text-xs text-rose-600">{calcErrors.bagrut}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="calc-degree" className="mb-2 block text-sm font-bold">
                  מה תרצה/י ללמוד?
                </label>
                <select
                  id="calc-degree"
                  value={selectedDegreeId}
                  onChange={(event) => {
                    setSelectedDegreeId(event.target.value);
                    setCalcErrors((previous) => ({ ...previous, degree: undefined }));
                  }}
                  disabled={programs.length === 0}
                  className={`h-12 w-full rounded-2xl border bg-[#f8fbff] px-4 text-base outline-none transition focus:border-[#7784e8] focus:bg-white ${
                    calcErrors.degree ? 'border-rose-400' : 'border-[#e2e9f4]'
                  }`}
                >
                  {uniqueCategories.map((category) => (
                    <optgroup key={category} label={category}>
                      {programs
                        .filter((program) => program.category === category)
                        .map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name} - {program.institution}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {calcErrors.degree ? (
                  <p className="mt-1 text-xs text-rose-600">{calcErrors.degree}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleCalcSubmit}
                aria-label="חשב סיכויים ←"
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#7784e8] px-5 text-base font-bold text-white shadow-[0_14px_30px_rgba(119,132,232,0.25)] transition hover:bg-[#6574dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
              >
                חשב סיכויים
                <ArrowLeft size={18} />
              </button>

              <div className="mt-4 rounded-2xl border border-[#d9e3f3] bg-[#f8fbff] p-4">
                <p className="text-sm font-bold text-[#445274]">רוצה חישוב מדויק יותר?</p>
                <p className="mt-1 text-xs leading-5 text-[#79849e]">
                  הזינו בצורה מסודרת מגזר, מקצועות חובה, הרחבות וציוני פסיכומטרי. הנתונים נשמרים
                  לאזור האישי ומשמשים את בדיקות הקבלה הבאות.
                </p>
                <button
                  type="button"
                  onClick={onGoToProfile}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#b8c4ff] bg-white px-4 py-3 text-sm font-bold text-[#5262d9] transition hover:border-[#7784e8] hover:bg-[#eef4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
                >
                  פתחו את המחשבון המפורט
                  <ArrowLeft size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="path" className="relative scroll-mt-28 px-4 py-16 sm:px-6 lg:py-24">
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-bold text-[#7784e8]">מסלול עבודה</p>
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-[#445274] sm:text-5xl">
                הדרך מהשאלה הגדולה להחלטה קטנה הבאה.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {processSteps.map(({ title, text, icon: Icon }, index) => (
                <article
                  key={title}
                  className="rounded-[1.6rem] border border-white bg-white/76 p-6 shadow-[0_18px_50px_rgba(105,133,190,0.13)] backdrop-blur"
                >
                  <div className="mb-12 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#6675df]">
                      <Icon size={20} />
                    </div>
                    <span className="text-sm font-bold text-[#a0a9bd]">0{index + 1}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#445274]">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#727d98]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 pt-12 sm:px-6 lg:pb-28">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white bg-white/82 p-6 text-center text-[#445274] shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur sm:p-10">
            <p className="text-sm font-bold text-[#7784e8]">מוכנים להתחיל?</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              לבחור לימודים זה לא צריך להרגיש כמו הימור.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#727d98]">
              אפשר להתחיל מהשאלון אם אין לך כיוון, או לדלג ישר לבחירת תארים אם כבר יש לך רשימה.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onNeedHelp}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7784e8] px-6 text-base font-bold text-white transition hover:bg-[#6574dc]"
              >
                אין לי כיוון עדיין
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={onAlreadyKnow}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d9e3f3] bg-white px-6 text-base font-bold text-[#445274] transition hover:bg-[#f8fbff]"
              >
                יש לי כיוון, בואו נשווה
              </button>
            </div>
          </div>
        </section>
      </main>
    </WayPageShell>
  );
}
