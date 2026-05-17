'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RiasecAnswers } from '@/types';
import { QUIZ_QUESTIONS } from '@/data/questions';

interface Props {
  onComplete: (answers: RiasecAnswers) => void;
}

export default function OnboardingFunnel({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<RiasecAnswers>({});

  const question = QUIZ_QUESTIONS[currentStep];
  const totalSteps = QUIZ_QUESTIONS.length;
  const currentAnswers = answers[question.id] ?? [];
  const isMultiSelect = question.multiSelect ?? false;
  const maxSelect = question.maxSelect ?? 1;
  const isLastStep = currentStep === totalSteps - 1;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  function toggleAnswer(idx: number) {
    if (isMultiSelect) {
      if (currentAnswers.includes(idx)) {
        setAnswers({ ...answers, [question.id]: currentAnswers.filter((i) => i !== idx) });
      } else if (currentAnswers.length < maxSelect) {
        setAnswers({ ...answers, [question.id]: [...currentAnswers, idx] });
      }
    } else {
      setAnswers({ ...answers, [question.id]: [idx] });
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
    <div className="flex flex-col gap-7">
      {/* ── Progress ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            שאלה {currentStep + 1} מתוך {totalSteps}
          </span>
          <span>{progressPercent}% הושלם</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Question header ───────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{question.text}</h2>
        {question.sublabel && (
          <p className="text-sm text-slate-400">{question.sublabel}</p>
        )}
      </div>

      {/* ── Answer cards ─────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {question.answers.map((answer, idx) => {
          const selected = currentAnswers.includes(idx);
          const exhausted = isMultiSelect && !selected && currentAnswers.length >= maxSelect;
          const Icon = answer.icon;

          return (
            <button
              key={idx}
              onClick={() => !exhausted && toggleAnswer(idx)}
              className={[
                'flex w-full items-center gap-4 rounded-2xl border p-4 text-right transition-all duration-150 select-none',
                selected
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                  : exhausted
                  ? 'cursor-not-allowed border-slate-200 bg-white opacity-40'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50',
              ].join(' ')}
            >
              {/* Text — fills space (appears on RIGHT in RTL) */}
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold leading-snug ${
                    selected ? 'text-indigo-900' : 'text-slate-800'
                  }`}
                >
                  {answer.label}
                </p>
                {answer.sublabel && (
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      selected ? 'text-indigo-500' : 'text-slate-400'
                    }`}
                  >
                    {answer.sublabel}
                  </p>
                )}
              </div>

              {/* Icon box — shrinks to its size (appears on LEFT in RTL) */}
              <div
                className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                  selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400',
                ].join(' ')}
              >
                <Icon size={18} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {currentStep > 0 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-700"
          >
            <ChevronRight size={16} />
            <span>חזרה</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          disabled={currentAnswers.length === 0}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
        >
          <span>{isLastStep ? 'קבל המלצות' : 'הבא'}</span>
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}
