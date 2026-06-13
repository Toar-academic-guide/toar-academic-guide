'use client';

import { useRef } from 'react';
import { BarChart3, Sparkles, Target } from 'lucide-react';
import LogoCanvas from './LogoCanvas';
import NeoButton from './NeoButton';

interface Props {
  onAlreadyKnow: () => void;
  onNeedHelp: () => void;
  onSignIn: () => void;
}

export default function LandingPage({ onAlreadyKnow, onNeedHelp, onSignIn }: Props) {
  const startRef = useRef<HTMLElement>(null);

  function scrollToStart() {
    startRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
          <button
            type="button"
            className="cursor-pointer rounded-lg outline-none transition-opacity hover:opacity-80"
          >
            <LogoCanvas size={52} brighten={false} />
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              איך זה עובד
            </button>
            <button
              type="button"
              onClick={scrollToStart}
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              תחומי לימוד
            </button>
            <button type="button" className="text-sm text-slate-500 transition hover:text-slate-900">
              מי אנחנו
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              התחברות
            </button>
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

      <section className="flex flex-col md:flex-row" style={{ minHeight: '92vh' }}>
        {/* RIGHT 2/3: Bauhaus visual (first in DOM = right side in RTL) */}
        <div className="relative order-2 overflow-hidden md:order-1 md:flex-[2]" style={{ minHeight: '260px', background: '#f7f6f2' }}>
          <svg
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            <rect width="800" height="500" fill="#f7f6f2" />
            {/* Grid lines: extensions of blue quad edges */}
            <line x1="0" y1="116" x2="800" y2="45" stroke="#cac7bc" strokeWidth="0.6" />
            <line x1="0" y1="388" x2="800" y2="316" stroke="#cac7bc" strokeWidth="0.6" />
            <line x1="173" y1="0" x2="210" y2="500" stroke="#cac7bc" strokeWidth="0.6" />
            <line x1="454" y1="0" x2="491" y2="500" stroke="#cac7bc" strokeWidth="0.6" />
            {/* Blue quadrilateral */}
            <polygon points="180,100 460,75 480,345 200,370" fill="#2563a4" />
            {/* Yellow triangle */}
            <polygon points="330,20 550,20 440,230" fill="#f4b800" />
            {/* Red circle */}
            <circle cx="620" cy="330" r="155" fill="#c8322a" />
          </svg>
        </div>

        {/* LEFT 1/3: text (second in DOM = left side in RTL) */}
        <div className="order-1 flex flex-col justify-center px-10 py-16 md:order-2 md:w-1/3">
          <div
            className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: '#eef2ff', color: '#4f46e5' }}
          >
            <span>✦</span>
            כלי חינמי לחיילים משוחררים
          </div>

          <h1
            className="mb-4 text-4xl font-black leading-tight text-slate-900 md:text-5xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            גלה את המסלול
            <br />
            האקדמי שלך
            <br />
            אחרי הצבא
          </h1>

          <p className="mb-8 max-w-sm text-base leading-relaxed text-slate-500">
            שאלון אישיות, המלצות תחומי לימוד, וחישוב סיכויי קבלה ל-35 מוסדות אקדמיים בישראל.
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={scrollToStart}
              className="rounded-full bg-[#1e1b4b] px-8 py-3.5 text-base font-semibold text-white transition hover:bg-[#2d2a6e]"
            >
              מתחילים ←
            </button>
            <span className="text-sm text-slate-400">ללא הרשמה · חינמי לחלוטין</span>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            איך זה עובד?
          </h2>
          <p className="mb-12 text-center text-base text-slate-500">
            שלושה שלבים — פחות מ-10 דקות מהתחלה ועד תוצאה
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-7 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#eef2ff' }}>
                <Target size={22} color="#4f46e5" />
              </div>
              <div className="mb-1 text-xs font-bold tracking-widest" style={{ color: '#4f46e5' }}>שלב 01</div>
              <h3 className="mb-2 text-base font-black text-slate-900">שאלון אישיות</h3>
              <p className="text-sm leading-relaxed text-slate-500">42 שאלות קצרות שמגלות מה מניע אותך ולאן כדאי לך ללכת</p>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-7 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#f5f3ff' }}>
                <Sparkles size={22} color="#7c3aed" />
              </div>
              <div className="mb-1 text-xs font-bold tracking-widest" style={{ color: '#7c3aed' }}>שלב 02</div>
              <h3 className="mb-2 text-base font-black text-slate-900">המלצות מותאמות</h3>
              <p className="text-sm leading-relaxed text-slate-500">5 תחומי לימוד שמתאימים לפרופיל האישיות הייחודי שלך</p>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-7 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#ecfdf5' }}>
                <BarChart3 size={22} color="#059669" />
              </div>
              <div className="mb-1 text-xs font-bold tracking-widest" style={{ color: '#059669' }}>שלב 03</div>
              <h3 className="mb-2 text-base font-black text-slate-900">בדיקת סיכויי קבלה</h3>
              <p className="text-sm leading-relaxed text-slate-500">חישוב סכ״מ ל-35 מוסדות אקדמיים ובדיקה מה נדרש כדי להתקבל</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20" style={{ background: '#f8f9fc' }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            מה אומרים המשתמשים?
          </h2>
          <p className="mb-12 text-center text-base text-slate-500">
            חיילים משוחררים שכבר מצאו את הדרך שלהם
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-7 shadow-sm">
              <p className="mb-5 text-sm italic leading-relaxed text-slate-700">
                &quot;לא ידעתי בכלל מה לעשות אחרי הצבא. TOAR עזר לי להבין שהנדסת תוכנה זה בדיוק מה שמתאים לי.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: '#eef2ff', color: '#4f46e5' }}>
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
                &quot;השאלון גילה לי שפסיכולוגיה מתאים לי — משהו שלא חשבתי עליו בכלל. ממליצה בחום!&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
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

      <section
        ref={startRef}
        id="start"
        className="px-6 py-24 text-center"
        style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #3730a3 100%)' }}
      >
        <div className="mx-auto max-w-lg">
          <h2 className="mb-3 text-3xl font-black tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
            מוכן להתחיל?
          </h2>
          <p className="mb-8 text-base text-white/60">
            ספר לנו קצת עליך ונסייע לך למצוא את הדרך הנכונה
          </p>
          <p className="mb-6 text-base font-semibold text-white/85">
            האם כבר ידוע לך מה תרצה ללמוד?
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
