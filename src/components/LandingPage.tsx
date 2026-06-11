'use client';

import { useRef } from 'react';
import { Target, Sparkles, BarChart3 } from 'lucide-react';
import LogoCanvas from './LogoCanvas';
import NeoButton from './NeoButton';

interface Props {
  onAlreadyKnow: () => void;
  onNeedHelp: () => void;
}

export default function LandingPage({ onAlreadyKnow, onNeedHelp }: Props) {
  const startRef = useRef<HTMLElement>(null);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
          <button type="button" className="cursor-pointer rounded-lg outline-none transition-opacity hover:opacity-80">
            <LogoCanvas size={52} brighten={false} />
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="text-sm text-slate-500 transition hover:text-slate-900">
              איך זה עובד
            </button>
            <button type="button" onClick={scrollToStart} className="text-sm text-slate-500 transition hover:text-slate-900">
              תחומי לימוד
            </button>
            <button type="button" className="text-sm text-slate-500 transition hover:text-slate-900">
              מי אנחנו
            </button>
          </nav>

          <button
            type="button"
            onClick={scrollToStart}
            className="rounded-full bg-[#1e1b4b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2a6e]"
          >
            מתחילים ←
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section
        className="grid grid-cols-1 md:grid-cols-2"
        style={{ background: 'linear-gradient(150deg, #f0f0ff 0%, #fafaff 55%, #ffffff 100%)', minHeight: '520px' }}
      >
        {/* Illustration — left column */}
        <div
          className="flex items-center justify-center p-10 order-2 md:order-1"
          style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)' }}
        >
          <svg width="280" height="280" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="140" cy="140" r="115" fill="#e8eaff" opacity="0.45" />
            <path d="M45 220 Q90 145 140 120 Q185 95 235 65" stroke="#4f46e5" strokeWidth="2" strokeDasharray="7 5" fill="none" opacity="0.35" />
            <path d="M45 220 Q75 190 125 175 Q175 158 215 115" stroke="#7c3aed" strokeWidth="2" strokeDasharray="7 5" fill="none" opacity="0.35" />
            <circle cx="140" cy="140" r="32" fill="#4f46e5" opacity="0.12" />
            <circle cx="140" cy="140" r="20" fill="#4f46e5" opacity="0.25" />
            <circle cx="140" cy="140" r="11" fill="#4f46e5" />
            <circle cx="235" cy="65" r="16" fill="#7c3aed" opacity="0.78" />
            <circle cx="215" cy="115" r="11" fill="#6366f1" opacity="0.65" />
            <circle cx="68" cy="200" r="9" fill="#818cf8" opacity="0.6" />
            <rect x="196" y="43" width="60" height="20" rx="10" fill="#e8eaff" />
            <text x="226" y="57" textAnchor="middle" fontSize="10" fill="#4338ca" fontFamily="sans-serif">הנדסה</text>
            <rect x="168" y="132" width="60" height="20" rx="10" fill="#ede9fe" />
            <text x="198" y="146" textAnchor="middle" fontSize="10" fill="#7c3aed" fontFamily="sans-serif">משפטים</text>
            <rect x="24" y="192" width="56" height="20" rx="10" fill="#e0e7ff" />
            <text x="52" y="206" textAnchor="middle" fontSize="10" fill="#4338ca" fontFamily="sans-serif">רפואה</text>
          </svg>
        </div>

        {/* Text — right column */}
        <div className="flex flex-col justify-center px-10 py-16 order-1 md:order-2">
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
            גלה את המסלול<br />
            האקדמי שלך<br />
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

      {/* ── How it works ────────────────────────────────────────── */}
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

      {/* ── Testimonials ────────────────────────────────────────── */}
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

      {/* ── Bottom CTA with Yes / No ─────────────────────────────── */}
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
