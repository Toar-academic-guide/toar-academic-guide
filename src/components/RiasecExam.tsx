'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Minus, X } from 'lucide-react';
import type { RiasecDimension } from '@/types';
import {
  RIASEC_ITEMS,
  DIMENSION_META,
  ANSWER_SCORES,
  MAX_RAW_SCORE,
  type RiasecAnswer,
} from '@/data/riasecItems';

interface Props {
  /** Called when all 6 dimension screens are done.
   *  rawScores: 0–14 per dimension
   *  normalizedScores: 0–5 per dimension (ready for recommendation engine) */
  onComplete: (normalizedScores: Record<RiasecDimension, number>) => void;
}

const SLIDE: import('framer-motion').Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

const DIMS: RiasecDimension[] = ['R', 'I', 'A', 'S', 'E', 'C'];

/** Normalise a raw 0–14 score to a 0–5 scale. */
function normalise(raw: number): number {
  return Math.round((raw / MAX_RAW_SCORE) * 5);
}

type AnswerMap = Partial<Record<string, RiasecAnswer>>; // itemId → answer

// ── Answer button config ──────────────────────────────────────────────────────
const CHOICES: {
  value: RiasecAnswer;
  label: string;
  icon: typeof Check;
  base: string;       // unselected Tailwind classes
  active: string;     // selected Tailwind classes
}[] = [
  {
    value: 'yes',
    label: 'כן',
    icon: Check,
    base:   'border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50',
    active: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'maybe',
    label: 'אולי',
    icon: Minus,
    base:   'border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50',
    active: 'border-amber-400 bg-amber-50 text-amber-700',
  },
  {
    value: 'no',
    label: 'לא',
    icon: X,
    base:   'border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50',
    active: 'border-rose-400 bg-rose-50 text-rose-600',
  },
];

export default function RiasecExam({ onComplete }: Props) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  const dim = DIMS[screenIndex];
  const meta = DIMENSION_META[screenIndex];
  const items = RIASEC_ITEMS.filter((item) => item.dimension === dim);
  const answeredCount = items.filter((item) => answers[item.id] !== undefined).length;
  const allAnswered = answeredCount === items.length;
  const progressPercent = Math.round(((screenIndex + 1) / DIMS.length) * 100);

  function setAnswer(itemId: string, value: RiasecAnswer) {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  }

  function handleBack() {
    if (screenIndex === 0) return;
    setSlideDir(-1);
    setScreenIndex((i) => i - 1);
  }

  function handleNext() {
    if (!allAnswered) return;

    if (screenIndex < DIMS.length - 1) {
      setSlideDir(1);
      setScreenIndex((i) => i + 1);
    } else {
      // All 6 screens done — compute and return normalised scores
      const raw = {} as Record<RiasecDimension, number>;
      for (const d of DIMS) {
        const dimItems = RIASEC_ITEMS.filter((item) => item.dimension === d);
        raw[d] = dimItems.reduce(
          (sum, item) => sum + ANSWER_SCORES[answers[item.id] ?? 'no'],
          0
        );
      }
      const normalised = {} as Record<RiasecDimension, number>;
      for (const d of DIMS) normalised[d] = normalise(raw[d]);
      onComplete(normalised);
    }
  }

  const xIn  = slideDir * 60;
  const xOut = slideDir * -60;

  return (
    <div className="w-full px-2 py-8 sm:px-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl md:p-12">

        {/* ── Progress ───────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>חלק {screenIndex + 1} מתוך {DIMS.length}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* ── Animated dimension screen ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={dim}
            initial={{ opacity: 0, x: xIn }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: xOut }}
            transition={SLIDE}
            className="flex flex-col gap-6"
          >
            {/* Dimension header */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{meta.emoji}</span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {meta.label}
                </h2>
              </div>
              <p className="text-sm text-slate-400">{meta.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                עד כמה תרצה/י לעשות כל אחת מהפעילויות הבאות?
              </p>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3">
              <div className="flex-1" />
              {CHOICES.map((c) => (
                <div
                  key={c.value}
                  className="w-16 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  {c.label}
                </div>
              ))}
            </div>

            {/* Items */}
            <div className="flex flex-col divide-y divide-slate-100">
              {items.map((item, idx) => {
                const current = answers[item.id];
                return (
                  <div
                    key={item.id}
                    className={[
                      'flex items-center gap-3 py-3 transition-colors duration-100',
                      current !== undefined ? 'bg-white' : '',
                    ].join(' ')}
                  >
                    {/* Item number + text */}
                    <div className="flex flex-1 items-start gap-2 text-right">
                      <span className="mt-0.5 shrink-0 text-xs font-medium text-slate-300">
                        {idx + 1}.
                      </span>
                      <p
                        className={`text-sm leading-relaxed ${
                          current !== undefined
                            ? 'font-medium text-slate-800'
                            : 'text-slate-600'
                        }`}
                      >
                        {item.text}
                      </p>
                    </div>

                    {/* Answer buttons */}
                    {CHOICES.map((c) => {
                      const selected = current === c.value;
                      const Icon = c.icon;
                      return (
                        <motion.button
                          key={c.value}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setAnswer(item.id, c.value)}
                          aria-label={`${item.text} — ${c.label}`}
                          aria-pressed={selected}
                          className={[
                            'flex h-9 w-16 shrink-0 items-center justify-center',
                            'rounded-lg border-2 transition-all duration-150',
                            selected ? c.active : c.base,
                          ].join(' ')}
                        >
                          <Icon size={15} strokeWidth={selected ? 2.5 : 1.8} />
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Completion nudge */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex gap-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={[
                      'h-1 w-4 rounded-full transition-colors duration-200',
                      answers[item.id] !== undefined
                        ? 'bg-indigo-400'
                        : 'bg-slate-200',
                    ].join(' ')}
                  />
                ))}
              </div>
              <span>
                {allAnswered
                  ? 'כל הפריטים נענו ✓'
                  : `${answeredCount} מתוך ${items.length} נענו`}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation ────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          {screenIndex > 0 ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <ChevronRight size={16} />
              <span>חזרה</span>
            </motion.button>
          ) : (
            <div />
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={!allAnswered}
            className={[
              'flex items-center gap-2 rounded-full px-10 py-3.5 text-sm font-bold text-white',
              'bg-gradient-to-l from-indigo-600 to-violet-600',
              'shadow-lg shadow-indigo-200/70',
              'transition-all hover:shadow-xl hover:brightness-110',
              'disabled:cursor-not-allowed disabled:opacity-40',
            ].join(' ')}
          >
            <span>
              {screenIndex === DIMS.length - 1 ? 'סיום הבחינה' : 'הממד הבא'}
            </span>
            <ChevronLeft size={16} />
          </motion.button>
        </div>

      </div>
    </div>
  );
}
