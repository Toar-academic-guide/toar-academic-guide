'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Upload, FileText, X, Brain, GraduationCap } from 'lucide-react';
import type { AcademicScores } from '@/types';

// ── Framer Motion tokens ────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.72, ease: EASE, delay },
});

// ── Lightweight file metadata (File object not persisted) ───────────────────
interface FileInfo {
  name: string;
  size: number;
}

interface Props {
  onComplete: (scores: AcademicScores) => void;
  onSkip: () => void;
  initialScores?: AcademicScores;
}

export default function AcademicProfileForm({
  onComplete,
  onSkip,
  initialScores,
}: Props) {
  // ── Psychometric fields ─────────────────────────────────────────────────
  const [psyOverall, setPsyOverall] = useState(
    initialScores?.psychometric?.overall?.toString() ?? '',
  );
  const [psyQuantitative, setPsyQuantitative] = useState(
    initialScores?.psychometric?.quantitative?.toString() ?? '',
  );
  const [psyVerbal, setPsyVerbal] = useState(
    initialScores?.psychometric?.verbal?.toString() ?? '',
  );
  const [psyEnglish, setPsyEnglish] = useState(
    initialScores?.psychometric?.english?.toString() ?? '',
  );

  // ── Bagrut field ────────────────────────────────────────────────────────
  const [bagrutAverage, setBagrutAverage] = useState(
    initialScores?.bagrut?.weightedAverage?.toString() ?? '',
  );

  // ── File states (display-only — not serialised to localStorage) ─────────
  const [psyFile, setPsyFile] = useState<FileInfo | null>(null);
  const [bagrutFile, setBagrutFile] = useState<FileInfo | null>(null);
  const psyFileRef = useRef<HTMLInputElement>(null);
  const bagrutFileRef = useRef<HTMLInputElement>(null);

  // ── Save handler ────────────────────────────────────────────────────────
  function handleSave() {
    const scores: AcademicScores = {};

    const overall      = psyOverall      ? Number(psyOverall)      : undefined;
    const quantitative = psyQuantitative ? Number(psyQuantitative) : undefined;
    const verbal       = psyVerbal       ? Number(psyVerbal)       : undefined;
    const english      = psyEnglish      ? Number(psyEnglish)      : undefined;

    if (overall !== undefined || quantitative !== undefined || verbal !== undefined || english !== undefined) {
      scores.psychometric = { overall, quantitative, verbal, english };
    }

    const weightedAverage = bagrutAverage ? Number(bagrutAverage) : undefined;
    if (weightedAverage !== undefined) {
      scores.bagrut = { weightedAverage };
    }

    onComplete(scores);
  }

  // ── Shared input class ──────────────────────────────────────────────────
  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm ' +
    'text-slate-800 placeholder-slate-300 outline-none transition ' +
    'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

  return (
    <div className="min-h-screen bg-[#f5f4f0] px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0)}>
          <Image
            src="/way-logo.png"
            alt="לוגו"
            width={440}
            height={150}
            className="h-24 w-auto object-contain md:h-32"
            priority
          />
        </motion.div>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <motion.div
          {...fadeUp(0.18)}
          className="w-full rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-lg md:p-10"
        >
          {/* Card header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              הזן את הנתונים האקדמיים שלך
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              המידע יאפשר חישוב מדויק של סיכויי הקבלה שלך. כל השדות אופציונליים — מלא את מה שיש לך.
            </p>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* Section 1 — Psychometric                                    */}
          {/* ════════════════════════════════════════════════════════════ */}
          <section className="mb-8">
            {/* Section header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <Brain size={17} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">ציוני פסיכומטרי</h2>
                <p className="text-xs text-slate-400">ציון סופי 200–800, ציוני דגש 50–150</p>
              </div>
            </div>

            {/* 2 × 2 input grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Overall */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-overall" className="text-xs font-medium text-slate-600">
                  ציון כללי
                </label>
                <input
                  id="psy-overall"
                  type="number"
                  min={200}
                  max={800}
                  placeholder="למשל: 650"
                  value={psyOverall}
                  onChange={(e) => setPsyOverall(e.target.value)}
                  className={inputBase}
                />
              </div>

              {/* Quantitative */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-quant" className="text-xs font-medium text-slate-600">
                  דגש כמותי
                </label>
                <input
                  id="psy-quant"
                  type="number"
                  min={50}
                  max={150}
                  placeholder="למשל: 135"
                  value={psyQuantitative}
                  onChange={(e) => setPsyQuantitative(e.target.value)}
                  className={inputBase}
                />
              </div>

              {/* Verbal */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-verbal" className="text-xs font-medium text-slate-600">
                  דגש מילולי
                </label>
                <input
                  id="psy-verbal"
                  type="number"
                  min={50}
                  max={150}
                  placeholder="למשל: 120"
                  value={psyVerbal}
                  onChange={(e) => setPsyVerbal(e.target.value)}
                  className={inputBase}
                />
              </div>

              {/* English */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="psy-english" className="text-xs font-medium text-slate-600">
                  אנגלית
                </label>
                <input
                  id="psy-english"
                  type="number"
                  min={50}
                  max={150}
                  placeholder="למשל: 130"
                  value={psyEnglish}
                  onChange={(e) => setPsyEnglish(e.target.value)}
                  className={inputBase}
                />
              </div>
            </div>

            {/* Screenshot upload */}
            <div className="mt-4">
              <input
                ref={psyFileRef}
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                aria-label="העלאת תדפיס פסיכומטרי"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPsyFile({ name: f.name, size: f.size });
                }}
              />
              {psyFile ? (
                /* Success state */
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-700">
                    <FileText size={14} className="shrink-0" />
                    <span className="max-w-[18rem] truncate font-medium">{psyFile.name}</span>
                    <span className="shrink-0 text-indigo-400">
                      ({(psyFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="הסר קובץ"
                    onClick={() => {
                      setPsyFile(null);
                      if (psyFileRef.current) psyFileRef.current.value = '';
                    }}
                    className="ml-2 text-indigo-400 transition hover:text-indigo-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Upload prompt */
                <button
                  type="button"
                  onClick={() => psyFileRef.current?.click()}
                  className={[
                    'flex w-full items-center justify-center gap-2',
                    'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50',
                    'px-4 py-3.5 text-xs font-medium text-slate-400',
                    'transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600',
                  ].join(' ')}
                >
                  <Upload size={14} />
                  <span>העלה תדפיס פסיכומטרי (תמונה / PDF)</span>
                </button>
              )}
            </div>
          </section>

          {/* Divider */}
          <div className="mb-8 h-px w-full bg-slate-100" />

          {/* ════════════════════════════════════════════════════════════ */}
          {/* Section 2 — Bagrut                                          */}
          {/* ════════════════════════════════════════════════════════════ */}
          <section className="mb-8">
            {/* Section header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <GraduationCap size={17} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">ציוני בגרות</h2>
                <p className="text-xs text-slate-400">ממוצע סופי כולל בונוסים גנריים (60–120)</p>
              </div>
            </div>

            {/* Weighted average input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bagrut-avg" className="text-xs font-medium text-slate-600">
                ממוצע משוקלל כולל בונוסים
              </label>
              <input
                id="bagrut-avg"
                type="number"
                min={60}
                max={120}
                step={0.1}
                placeholder="למשל: 102.5"
                value={bagrutAverage}
                onChange={(e) => setBagrutAverage(e.target.value)}
                className={`${inputBase} sm:max-w-xs`}
              />
              <p className="text-xs text-slate-400">
                הממוצע הסופי לאחר כל הבונוסים הגנריים — מקסימום 120 נקודות
              </p>
            </div>

            {/* Diploma upload */}
            <div className="mt-4">
              <input
                ref={bagrutFileRef}
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                aria-label="העלאת גיליון ציוני בגרות"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setBagrutFile({ name: f.name, size: f.size });
                }}
              />
              {bagrutFile ? (
                /* Success state */
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <FileText size={14} className="shrink-0" />
                    <span className="max-w-[18rem] truncate font-medium">{bagrutFile.name}</span>
                    <span className="shrink-0 text-emerald-400">
                      ({(bagrutFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="הסר קובץ"
                    onClick={() => {
                      setBagrutFile(null);
                      if (bagrutFileRef.current) bagrutFileRef.current.value = '';
                    }}
                    className="ml-2 text-emerald-400 transition hover:text-emerald-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Upload prompt */
                <button
                  type="button"
                  onClick={() => bagrutFileRef.current?.click()}
                  className={[
                    'flex w-full items-center justify-center gap-2',
                    'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50',
                    'px-4 py-3.5 text-xs font-medium text-slate-400',
                    'transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600',
                  ].join(' ')}
                >
                  <Upload size={14} />
                  <span>העלה גיליון ציוני בגרות (תמונה / PDF)</span>
                </button>
              )}
            </div>
          </section>

          {/* ── Actions ──────────────────────────────────────────────── */}
          <motion.div {...fadeUp(0.38)} className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className={[
                'w-full rounded-full px-8 py-3.5 text-sm font-bold text-white',
                'bg-gradient-to-l from-indigo-600 to-violet-600',
                'shadow-lg shadow-indigo-200/70',
                'transition hover:brightness-110 hover:shadow-xl active:scale-[0.98]',
              ].join(' ')}
            >
              שמור והמשך לשאלון ←
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-slate-400 transition hover:text-slate-600"
            >
              דלג — אמלא מאוחר יותר
            </button>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
