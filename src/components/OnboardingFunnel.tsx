'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { RiasecAnswers } from '@/types';
import { QUIZ_QUESTIONS } from '@/data/questions';

interface Props {
  onComplete: (answers: RiasecAnswers) => void;
}

const SLIDE: import('framer-motion').Transition = {
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1],
};

// Pastel icon palette — one per answer slot, wraps after 8
const ICON_PALETTES = [
  'bg-indigo-50 text-indigo-500',
  'bg-violet-50 text-violet-500',
  'bg-sky-50 text-sky-500',
  'bg-emerald-50 text-emerald-500',
  'bg-amber-50 text-amber-500',
  'bg-rose-50 text-rose-500',
  'bg-teal-50 text-teal-500',
  'bg-fuchsia-50 text-fuchsia-500',
] as const;

export default function OnboardingFunnel({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<RiasecAnswers>({});

  const question = QUIZ_QUESTIONS[currentStep];
  const totalSteps = QUIZ_QUESTIONS.length;
  const currentAnswers = answers[question.id] ?? [];
  const isMultiSelect = question.multiSelect ?? false;
  const maxSelect = question.maxSelect ?? 1;
  const isLastStep = currentStep === totalSteps - 1;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  function toggleAnswer(label: string) {
    if (isMultiSelect) {
      if (currentAnswers.includes(label)) {
        // deselect
        setAnswers({ ...answers, [question.id]: currentAnswers.filter((l) => l !== label) });
      } else if (currentAnswers.length < maxSelect) {
        // select normally
        setAnswers({ ...answers, [question.id]: [...currentAnswers, label] });
      } else {
        // at max — deselect oldest (first added), add new at end
        setAnswers({ ...answers, [question.id]: [...currentAnswers.slice(1), label] });
      }
    } else {
      setAnswers({ ...answers, [question.id]: [label] });
    }
  }

  function handleNext() {
    if (currentAnswers.length === 0) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete(answers);
    }
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  return (
    <div className="w-full bg-white px-2 py-8 sm:px-4">
      {/* ── Floating canvas card ────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl md:p-12">

        {/* Progress */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>שאלה {currentStep + 1} מתוך {totalSteps}</span>
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

        {/* ── Animated question block ─────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 56 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -56 }}
            transition={SLIDE}
            className="flex flex-col gap-7"
          >
            {/* Question header */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {question.text}
              </h2>
              {question.sublabel && (
                <p className="mt-1.5 text-sm text-slate-400">{question.sublabel}</p>
              )}
            </div>

            {/* Answer grid — 2 columns */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {question.answers.map((answer, idx) => {
                const selected = currentAnswers.includes(answer.label);
                const Icon = answer.icon;
                const iconPalette = ICON_PALETTES[idx % ICON_PALETTES.length];

                return (
                  <button
                    key={answer.label}
                    onClick={() => toggleAnswer(answer.label)}
                    className={[
                      'relative flex w-full items-center gap-4 rounded-2xl p-5 text-right',
                      'border-2 transition-all duration-200 select-none',
                      selected
                        ? 'scale-[1.02] border-purple-600 bg-purple-50/40 shadow-lg'
                        : 'border-slate-200 bg-white shadow-sm hover:scale-[1.01] hover:border-indigo-300 hover:shadow-md',
                    ].join(' ')}
                  >
                    {/* Checkmark badge (appears on select) */}
                    <AnimatePresence>
                      {selected && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: 'backOut' }}
                          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white"
                        >
                          <Check size={11} strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Text (RIGHT in RTL) */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold leading-snug ${
                          selected ? 'text-purple-900' : 'text-slate-800'
                        }`}
                      >
                        {answer.label}
                      </p>
                      {answer.sublabel && (
                        <p
                          className={`mt-0.5 text-xs leading-relaxed ${
                            selected ? 'text-purple-500' : 'text-slate-400'
                          }`}
                        >
                          {answer.sublabel}
                        </p>
                      )}
                    </div>

                    {/* Icon container (LEFT in RTL) */}
                    <div
                      className={[
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        'transition-all duration-200',
                        selected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-200/60'
                          : iconPalette,
                      ].join(' ')}
                    >
                      <Icon size={20} />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation ─────────────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          {currentStep > 0 ? (
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
            disabled={currentAnswers.length === 0}
            className={[
              'flex items-center gap-2 rounded-full px-10 py-3.5 text-sm font-bold text-white',
              'bg-gradient-to-l from-indigo-600 to-violet-600',
              'shadow-lg shadow-indigo-200/70',
              'transition-all hover:shadow-xl hover:brightness-110',
              'disabled:cursor-not-allowed disabled:opacity-40',
            ].join(' ')}
          >
            <span>{isLastStep ? 'קבל המלצות' : 'הבא'}</span>
            <ChevronLeft size={16} />
          </motion.button>
        </div>

      </div>
    </div>
  );
}
