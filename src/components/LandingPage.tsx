'use client';

import LogoCanvas from './LogoCanvas';
import NeoButton from './NeoButton';

interface Props {
  onAlreadyKnow: () => void;
  onNeedHelp: () => void;
}

export default function LandingPage({ onAlreadyKnow, onNeedHelp }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#f5f4f0' }}
    >
      {/* ── Logo ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <LogoCanvas size={100} brighten={false} />
      </div>

      {/* ── Welcome headline ───────────────────────────────────── */}
      <h1
        className="mb-3 text-center text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-4xl"
        style={{ letterSpacing: '-0.02em' }}
      >
        ברוכה הבאה ל-TOAR !
      </h1>

      {/* ── Subtitle ───────────────────────────────────────────── */}
      <p className="mb-10 max-w-md text-center text-base font-medium text-slate-600 md:text-lg">
        בוא ניגש ישר לעניין ונבין ביחד מה עומד בינך לבין היעדים שלך.
      </p>

      {/* ── Question ───────────────────────────────────────────── */}
      <p className="mb-6 text-center text-lg font-semibold text-slate-800 md:text-xl">
        האם כבר ידוע לך מה תרצה ללמוד?
      </p>

      {/* ── Yes / No buttons ───────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        <NeoButton
          onClick={onAlreadyKnow}
          ariaLabel="כן, אני יודע מה אני רוצה ללמוד"
          className="h-12 min-w-[7rem] px-6 text-base"
        >
          כן
        </NeoButton>
        <NeoButton
          onClick={onNeedHelp}
          ariaLabel="לא, אני צריך עזרה לבחור"
          className="h-12 min-w-[7rem] px-6 text-base"
        >
          לא
        </NeoButton>
      </div>
    </div>
  );
}
