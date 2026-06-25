'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles, BarChart3 } from 'lucide-react';
import LogoCanvas from './LogoCanvas';
import PaintingCanvas from './PaintingCanvas';
import NeoButton from './NeoButton';
import KineticTextSwapper from './KineticTextSwapper';
import type { CatalogueProgram } from '@/types/catalogue';

interface Props {
  onAlreadyKnow: () => void;
  onNeedHelp: () => void;
  onSignIn: () => void;
  onCalculate: (psychometric: number, bagrut: number, degreeId: string) => void;
  onGoToProfile: () => void;
  programs: CatalogueProgram[];
  authLoading?: boolean;
  isAuthenticated?: boolean;
  userInitials?: string;
  onSignOut?: () => void;
}

export default function LandingPage({
  onAlreadyKnow,
  onNeedHelp,
  onSignIn,
  onCalculate,
  onGoToProfile,
  programs,
  authLoading = false,
  isAuthenticated = false,
  userInitials,
  onSignOut,
}: Props) {
  const startRef = useRef<HTMLElement>(null);
  const [psychometric, setPsychometric] = useState('');
  const [bagrut, setBagrut] = useState('');
  const [selectedDegreeId, setSelectedDegreeId] = useState(programs[0]?.id ?? '');
  const [calcErrors, setCalcErrors] = useState<{ psychometric?: string; bagrut?: string }>({});

  const uniqueCategories = [...new Set(programs.map((p) => p.category))].sort();

  function handleCalcSubmit() {
    const errs: typeof calcErrors = {};
    const psy = Number(psychometric);
    const bag = Number(bagrut);
    if (!psychometric || isNaN(psy) || psy < 200 || psy > 800) {
      errs.psychometric = 'ציון בין 200 ל-800';
    }
    if (!bagrut || isNaN(bag) || bag < 60 || bag > 120) {
      errs.bagrut = 'ממוצע בין 60 ל-120';
    }
    setCalcErrors(errs);
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
    <div dir="rtl" className="min-h-screen bg-white">
      {/* ── Sticky Nav ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-white">
        <div className="flex items-center justify-between py-4 pl-8 pr-4 sm:pl-12 sm:pr-6">
          {/* Logo + nav links grouped together on the right (RTL) */}
          <div className="flex items-center gap-8">
            <button
              type="button"
              aria-label="דף הבית"
              className="cursor-pointer rounded-lg outline-none transition-opacity hover:opacity-80"
            >
              <LogoCanvas size={44} brighten={false} />
            </button>

            <nav className="hidden items-center gap-7 md:flex">
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="text-base text-slate-900 transition hover:text-slate-600"
              >
                איך זה עובד
              </button>
              <button
                type="button"
                onClick={scrollToStart}
                className="text-base text-slate-900 transition hover:text-slate-600"
              >
                תחומי לימוד
              </button>
              <button
                type="button"
                className="text-base text-slate-900 transition hover:text-slate-600"
              >
                מי אנחנו
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            ) : isAuthenticated && userInitials ? (
              <button
                type="button"
                onClick={onSignOut}
                title="לחץ להתנתקות"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#1e1b4b] text-xs font-bold text-white shadow transition hover:bg-[#2d2a6e]"
              >
                {userInitials}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                התחברות
              </button>
            )}
            <button
              type="button"
              onClick={scrollToStart}
              className="rounded-full bg-[#1e1b4b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2a6e]"
            >
              מתחילים ←
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section
        className="flex min-h-screen items-center px-8 py-16 md:px-16 md:py-20"
        style={{
          background: 'radial-gradient(ellipse at center, #f3fdff 0%, #e8f7fa 60%, #e5f7fb 100%)',
        }}
      >
        <div
          className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[3fr_2fr] md:gap-16"
          dir="rtl"
        >
          {/* Content panel — right side in RTL */}
          <div className="text-right">
            <p className="mb-2 text-2xl font-bold text-slate-900 md:text-3xl">חושב/ת על לימודים?</p>

            <p className="mb-4 text-3xl font-semibold italic text-[#4f46e5] md:text-4xl" dir="ltr">
              Let&apos;s find your way!
            </p>

            <h1
              className="mb-3 font-black text-slate-900"
              style={{ fontSize: 'clamp(44px, 6vw, 90px)', letterSpacing: '0.02em', lineHeight: 1 }}
            >
              מה<span className="text-[#4f46e5]">.</span>איפה
              <span className="text-[#4f46e5]">.</span>איך
            </h1>

            <p className="mb-10 text-xl font-bold text-slate-900 md:text-2xl">הכל במקום אחד</p>

            <div className="flex items-center gap-4" dir="rtl">
              {/* מה — compact cloud */}
              <motion.div
                className="relative"
                style={{ flex: '0.85' }}
                animate={{ y: [0, -6, 2, -4, 0], x: [0, 3, -2, 1, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg viewBox="0 0 210 140" className="w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="hd1" x="-20%" y="-20%" width="140%" height="140%">
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.04"
                        numOctaves="4"
                        seed="7"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        scale="2.8"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                  </defs>
                  <path
                    filter="url(#hd1)"
                    d="M 28,86 C 12,76 10,56 24,46 C 22,30 38,20 55,26 C 60,10 80,4 98,15 C 110,4 132,6 140,22 C 156,16 172,28 174,48 C 188,55 190,76 176,86 C 174,104 152,112 132,102 C 118,114 82,114 68,102 C 50,112 28,106 28,86 Z"
                    fill="white"
                    stroke="#000000"
                    strokeWidth="1.5"
                  />
                </svg>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center"
                  style={{ padding: '6% 15%' }}
                >
                  <p className="text-2xl font-black leading-none text-slate-900">מה</p>
                  <p className="mt-2 text-sm leading-snug text-slate-500">כל אפשרויות הלימודים</p>
                </div>
              </motion.div>

              {/* איפה — wide cloud */}
              <motion.div
                className="relative"
                style={{ flex: '1.2' }}
                animate={{ y: [0, 5, -3, 6, 0], x: [0, -2, 3, -1, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg viewBox="0 0 275 145" className="w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="hd2" x="-20%" y="-20%" width="140%" height="140%">
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.038"
                        numOctaves="4"
                        seed="12"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        scale="2.8"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                  </defs>
                  <path
                    filter="url(#hd2)"
                    d="M 34,90 C 14,80 8,60 22,46 C 26,28 46,20 66,28 C 72,12 94,4 116,14 C 128,2 154,2 166,16 C 184,8 204,20 208,42 C 226,46 238,64 228,80 C 232,98 220,116 198,116 C 180,130 148,128 130,116 C 108,128 74,126 54,112 C 36,120 22,106 34,90 Z"
                    fill="white"
                    stroke="#000000"
                    strokeWidth="1.5"
                  />
                </svg>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center"
                  style={{ padding: '6% 15%' }}
                >
                  <p className="text-2xl font-black leading-none text-slate-900">איפה</p>
                  <p className="mt-2 text-sm leading-snug text-slate-500">הבדלים בין מוסדות</p>
                </div>
              </motion.div>

              {/* איך — tall irregular cloud */}
              <motion.div
                className="relative"
                style={{ flex: '0.95' }}
                animate={{ y: [0, -4, 5, -2, 0], x: [0, 2, -3, 2, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg viewBox="0 0 235 158" className="w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="hd3" x="-20%" y="-20%" width="140%" height="140%">
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.042"
                        numOctaves="4"
                        seed="20"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        scale="2.8"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                  </defs>
                  <path
                    filter="url(#hd3)"
                    d="M 42,112 C 18,100 10,78 24,60 C 22,40 40,28 60,36 C 56,18 74,6 96,12 C 104,0 130,0 142,14 C 160,4 182,14 186,36 C 206,36 218,56 212,76 C 226,86 222,112 200,118 C 190,136 162,138 144,122 C 124,136 92,134 72,120 C 54,130 36,122 42,112 Z"
                    fill="white"
                    stroke="#000000"
                    strokeWidth="1.5"
                  />
                </svg>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center"
                  style={{ padding: '6% 15%' }}
                >
                  <p className="text-2xl font-black leading-none text-slate-900">איך</p>
                  <p className="mt-2 text-sm leading-snug text-slate-500">שקלול הנתונים שלך</p>
                </div>
              </motion.div>
            </div>

            {/* PaintingCanvas below the cards */}
            <div className="mt-10 flex justify-center">
              <PaintingCanvas className="block h-auto w-full max-w-lg md:max-w-xl" />
            </div>
          </div>

          {/* Calculator card — left side in RTL */}
          <div className="mt-12 flex flex-col self-start rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-4 text-xl font-black text-slate-900">בדיקת סיכויי קבלה</h2>

            <div className="flex flex-col gap-3">
              {/* Psychometric */}
              <div>
                <label
                  htmlFor="calc-psychometric"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  ציון פסיכומטרי
                </label>
                <input
                  id="calc-psychometric"
                  type="number"
                  min={200}
                  max={800}
                  placeholder="200–800"
                  value={psychometric}
                  onChange={(e) => {
                    setPsychometric(e.target.value);
                    setCalcErrors((p) => ({ ...p, psychometric: undefined }));
                  }}
                  className={`w-full rounded-xl border-2 ${calcErrors.psychometric ? 'border-red-400' : 'border-[#e5e7eb]'} bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#4f46e5]`}
                />
                {calcErrors.psychometric && (
                  <p className="mt-1 text-xs text-red-500">{calcErrors.psychometric}</p>
                )}
              </div>

              {/* Bagrut */}
              <div>
                <label
                  htmlFor="calc-bagrut"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  ממוצע בגרות
                </label>
                <input
                  id="calc-bagrut"
                  type="number"
                  min={60}
                  max={120}
                  placeholder="60–120"
                  value={bagrut}
                  onChange={(e) => {
                    setBagrut(e.target.value);
                    setCalcErrors((p) => ({ ...p, bagrut: undefined }));
                  }}
                  className={`w-full rounded-xl border-2 ${calcErrors.bagrut ? 'border-red-400' : 'border-[#e5e7eb]'} bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#4f46e5]`}
                />
                {calcErrors.bagrut && (
                  <p className="mt-1 text-xs text-red-500">{calcErrors.bagrut}</p>
                )}
              </div>

              {/* Degree category */}
              <div>
                <label
                  htmlFor="calc-degree"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  מה תרצה/י ללמוד?
                </label>
                <select
                  id="calc-degree"
                  value={selectedDegreeId}
                  onChange={(e) => setSelectedDegreeId(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-[#e5e7eb] bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#4f46e5]"
                >
                  {uniqueCategories.map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {programs
                        .filter((p) => p.category === cat)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.institution}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* CTA */}
              <NeoButton onClick={handleCalcSubmit} className="mt-1 w-full py-3 text-base">
                חשב סיכויים ←
              </NeoButton>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 border-t border-[#e5e7eb] pt-3">
              <p className="text-base leading-relaxed text-slate-400">
                מחשבון זה נועד לספק תמונה כללית. לצורך וודאות מלאה, יש להזין את ציוני הבגרות בכל
                מקצוע{' '}
                <button
                  type="button"
                  onClick={onGoToProfile}
                  className="cursor-pointer font-semibold text-[#4f46e5] underline decoration-[#a5b4fc] underline-offset-2 transition hover:text-[#3730a3]"
                >
                  באזור האישי
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Kinetic text swapper ──────────────────────────────── */}
      <KineticTextSwapper />

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-3 text-center text-5xl font-black tracking-tight text-slate-900"
            style={{ letterSpacing: '-0.02em' }}
          >
            איך זה עובד?
          </h2>
          <p className="mb-16 text-center text-xl text-slate-500">
            שלושה שלבים — פחות מ-10 דקות מהתחלה ועד תוצאה
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-10 text-center shadow-sm">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: '#eef2ff' }}
              >
                <Target size={28} color="#4f46e5" />
              </div>
              <div className="mb-2 text-sm font-bold tracking-widest" style={{ color: '#4f46e5' }}>
                שלב 01
              </div>
              <h3 className="mb-3 text-xl font-black text-slate-900">שאלון אישיות</h3>
              <p className="text-base leading-relaxed text-slate-500">
                42 שאלות קצרות שמגלות מה מניע אותך ולאן כדאי לך ללכת
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-10 text-center shadow-sm">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: '#f5f3ff' }}
              >
                <Sparkles size={28} color="#7c3aed" />
              </div>
              <div className="mb-2 text-sm font-bold tracking-widest" style={{ color: '#7c3aed' }}>
                שלב 02
              </div>
              <h3 className="mb-3 text-xl font-black text-slate-900">המלצות מותאמות</h3>
              <p className="text-base leading-relaxed text-slate-500">
                5 תחומי לימוד שמתאימים לפרופיל האישיות הייחודי שלך
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-10 text-center shadow-sm">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: '#ecfdf5' }}
              >
                <BarChart3 size={28} color="#059669" />
              </div>
              <div className="mb-2 text-sm font-bold tracking-widest" style={{ color: '#059669' }}>
                שלב 03
              </div>
              <h3 className="mb-3 text-xl font-black text-slate-900">בדיקת סיכויי קבלה</h3>
              <p className="text-base leading-relaxed text-slate-500">
                חישוב סכ״מ ל-35 מוסדות אקדמיים ובדיקה מה נדרש כדי להתקבל
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── After cartoon ───────────────────────────────────────── */}
      <section className="flex justify-end bg-white px-8 py-4 pr-0 md:px-16 md:pr-0" dir="ltr">
        <img
          src="/way-cartoon-after.png"
          alt="That's way easier than I thought"
          className="h-auto w-full max-w-3xl md:max-w-5xl"
          style={{ mixBlendMode: 'multiply', filter: 'brightness(1.1) contrast(1.2)' }}
        />
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section className="px-6 py-20" style={{ background: '#f8f9fc' }}>
        <div className="mx-auto max-w-4xl">
          <h2
            className="mb-2 text-center text-3xl font-black tracking-tight text-slate-900"
            style={{ letterSpacing: '-0.02em' }}
          >
            מה אומרים המשתמשים?
          </h2>
          <p className="mb-12 text-center text-base text-slate-500">
            חיילים משוחררים שכבר מצאו את הדרך שלהם
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-7 shadow-sm">
              <p className="mb-5 text-sm italic leading-relaxed text-slate-700">
                &quot;לא ידעתי בכלל מה לעשות אחרי הצבא. Way עזר לי להבין שהנדסת תוכנה זה בדיוק מה
                שמתאים לי.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: '#eef2ff', color: '#4f46e5' }}
                >
                  ד.כ
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">דניאל כהן</p>
                  <p className="text-xs text-slate-500">לשעבר לוחם, היום סטודנט ב-TAU</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-7 shadow-sm">
              <p className="mb-5 text-sm italic leading-relaxed text-slate-700">
                &quot;השאלון גילה לי שפסיכולוגיה מתאים לי — משהו שלא חשבתי עליו בכלל. ממליצה
                בחום!&quot;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: '#f5f3ff', color: '#7c3aed' }}
                >
                  מ.ל
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">מיכל לוי</p>
                  <p className="text-xs text-slate-500">לשעבר קצינה, היום לומדת פסיכולוגיה</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA with Yes / No ─────────────────────────────── */}
      <section
        ref={startRef}
        id="start"
        className="px-6 py-24 text-center"
        style={{
          background: 'radial-gradient(ellipse at center, #f3fdff 0%, #e8f7fa 60%, #e5f7fb 100%)',
        }}
      >
        <div className="mx-auto max-w-lg">
          <h2
            className="mb-3 text-3xl font-black tracking-tight text-slate-900"
            style={{ letterSpacing: '-0.02em' }}
          >
            קדימה בוא נתחיל!
          </h2>
          <p className="mb-6 text-base font-semibold text-slate-700">
            האם כבר ידוע לך מה תרצה/י ללמוד?
          </p>
          <div className="flex items-center justify-center gap-4">
            <NeoButton
              onClick={onAlreadyKnow}
              ariaLabel="כן, אני יודע מה אני רוצה ללמוד"
              className="h-12 min-w-[8rem] px-7 text-base"
            >
              כן ✓
            </NeoButton>
            <NeoButton
              onClick={onNeedHelp}
              ariaLabel="לא, אני צריך עזרה לבחור"
              variant="ghost"
              className="h-12 min-w-[8rem] px-7 text-base"
            >
              לא, עזרו לי
            </NeoButton>
          </div>
        </div>
      </section>
    </div>
  );
}
