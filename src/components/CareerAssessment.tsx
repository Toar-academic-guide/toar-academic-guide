'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Minus, X, SkipForward } from 'lucide-react';
import type { ProfileScores, ValuesProfile } from '@/types';
import {
  SCREEN_SEQUENCE,
  SECTION_LABELS,
  TOTAL_SECTIONS,
  MIN_ANSWERED_ITEMS,
  getMultiSelectQuestion,
  getQuickPickItem,
  getValueSlider,
  QUICK_PICK_ITEMS,
  type Screen,
  type QuickPickAnswer,
  type MultiSelectQuestion,
  type QuickPickItem,
  type ValueSliderQuestion,
} from '@/data/testItems';
import {
  computeProfileScores,
  computeValuesProfile,
  countAnsweredItems,
  type AssessmentAnswers,
  type MultiSelectAnswer,
  type QuickPickAnswerEntry,
  type ValueSliderAnswer,
} from '@/utils/scoringEngine';

interface Props {
  onComplete: (profileScores: ProfileScores, valuesProfile: ValuesProfile) => void;
}

const TOTAL_SCREENS = SCREEN_SEQUENCE.length;

const SLIDE: import('framer-motion').Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

const QP_CHOICES: {
  value: QuickPickAnswer;
  label: string;
  icon: typeof Check;
  base: string;
  active: string;
}[] = [
  {
    value: 'yes',
    label: 'כן',
    icon: Check,
    base: 'border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50',
    active: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'maybe',
    label: 'אולי',
    icon: Minus,
    base: 'border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50',
    active: 'border-amber-400 bg-amber-50 text-amber-700',
  },
  {
    value: 'no',
    label: 'לא',
    icon: X,
    base: 'border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50',
    active: 'border-rose-400 bg-rose-50 text-rose-600',
  },
];

export default function CareerAssessment({ onComplete }: Props) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  const [multiSelectAnswers, setMultiSelectAnswers] = useState<
    Record<string, string[]>
  >({});
  const [quickPickAnswers, setQuickPickAnswers] = useState<
    Record<string, QuickPickAnswer>
  >({});
  const [sliderAnswers, setSliderAnswers] = useState<Record<string, number>>({});
  const [skippedScreens, setSkippedScreens] = useState<Set<number>>(new Set());

  const screen = SCREEN_SEQUENCE[screenIndex];
  const progressPercent = Math.round(((screenIndex + 1) / TOTAL_SCREENS) * 100);
  const currentSection = screen.kind === 'transition' ? screen.section : getSectionForScreen(screenIndex);

  function getSectionForScreen(idx: number): number {
    for (let i = idx; i >= 0; i--) {
      const s = SCREEN_SEQUENCE[i];
      if (s.kind === 'transition') return s.section;
    }
    return 1;
  }

  // ── Collect answers into the shape the scoring engine expects ────────────

  const collectAnswers = useCallback((): AssessmentAnswers => {
    const multiSelect: MultiSelectAnswer[] = Object.entries(multiSelectAnswers)
      .filter(([, ids]) => ids.length > 0)
      .map(([questionId, selectedOptionIds]) => ({ questionId, selectedOptionIds }));

    const quickPicks: QuickPickAnswerEntry[] = Object.entries(quickPickAnswers).map(
      ([itemId, answer]) => ({ itemId, answer })
    );

    const valueSliders: ValueSliderAnswer[] = Object.entries(sliderAnswers).map(
      ([sliderId, value]) => ({ sliderId, value })
    );

    return { multiSelect, quickPicks, valueSliders };
  }, [multiSelectAnswers, quickPickAnswers, sliderAnswers]);

  // ── Multi-select toggling ─────────────────────────────────────────────────

  function toggleOption(questionId: string, optionId: string, maxSelect: number) {
    setMultiSelectAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [questionId]: [...current, optionId] };
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleBack() {
    if (screenIndex === 0) return;
    setSlideDir(-1);
    setScreenIndex((i) => i - 1);
  }

  function handleNext() {
    if (screenIndex < TOTAL_SCREENS - 1) {
      setSlideDir(1);
      setScreenIndex((i) => i + 1);
    } else {
      handleFinish();
    }
  }

  function handleSkip() {
    setSkippedScreens((prev) => new Set(prev).add(screenIndex));
    handleNext();
  }

  function handleFinish() {
    const answers = collectAnswers();
    const answered = countAnsweredItems(answers);
    if (answered < MIN_ANSWERED_ITEMS) {
      // stay on last screen — the UI will show a message
      return;
    }
    const profileScores = computeProfileScores(answers);
    const valuesProfile = computeValuesProfile(answers);
    onComplete(profileScores, valuesProfile);
  }

  function canAdvance(): boolean {
    if (screen.kind === 'transition') return true;
    // All question screens can be advanced (they have skip)
    return true;
  }

  // ── Check if we have enough answers for finishing ─────────────────────────

  const isLastScreen = screenIndex === TOTAL_SCREENS - 1;
  const answeredCount = countAnsweredItems(collectAnswers());
  const hasEnough = answeredCount >= MIN_ANSWERED_ITEMS;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>{SECTION_LABELS[currentSection] ?? ''}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-indigo-500"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="mt-1.5 flex justify-between">
          {Array.from({ length: TOTAL_SECTIONS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i + 1 <= currentSection ? 'bg-indigo-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Screen content */}
      <motion.div
        key={screenIndex}
        initial={{ opacity: 0, x: slideDir * 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -slideDir * 60 }}
        transition={SLIDE}
        className="flex-1"
      >
        {screen.kind === 'transition' && (
          <TransitionScreen title={screen.title} subtitle={screen.subtitle} />
        )}

        {screen.kind === 'multi-select' && (() => {
          const q = getMultiSelectQuestion(screen.questionId);
          return q ? (
            <MultiSelectScreen
              question={q}
              selected={multiSelectAnswers[q.id] ?? []}
              onToggle={(optionId) => toggleOption(q.id, optionId, q.maxSelect)}
            />
          ) : null;
        })()}

        {screen.kind === 'quick-picks' && (
          <QuickPicksScreen
            itemIds={screen.itemIds}
            answers={quickPickAnswers}
            onAnswer={(itemId, answer) =>
              setQuickPickAnswers((prev) => ({ ...prev, [itemId]: answer }))
            }
          />
        )}

        {screen.kind === 'value-slider' && (() => {
          const slider = getValueSlider(screen.sliderId);
          return slider ? (
            <ValueSliderScreen
              slider={slider}
              value={sliderAnswers[slider.id] ?? 0}
              onChange={(val) =>
                setSliderAnswers((prev) => ({ ...prev, [slider.id]: val }))
              }
            />
          ) : null;
        })()}
      </motion.div>

      {/* Not enough answers warning (on last screen) */}
      {isLastScreen && !hasEnough && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          ענית על {answeredCount} שאלות מתוך {MIN_ANSWERED_ITEMS} מינימום.
          חזור/חזרי אחורה וענה/ענו על עוד שאלות כדי לקבל המלצות מדויקות.
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={handleBack}
          disabled={screenIndex === 0}
          className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronRight size={16} />
          הקודם
        </button>

        <div className="flex items-center gap-2">
          {screen.kind !== 'transition' && (
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              <SkipForward size={14} />
              דלג
            </button>
          )}
          <button
            type="button"
            onClick={isLastScreen ? handleFinish : handleNext}
            disabled={isLastScreen && !hasEnough}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {isLastScreen ? 'הצג המלצות' : 'הבא'}
            {!isLastScreen && <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TransitionScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="mb-3 text-2xl font-bold text-slate-800">{title}</h2>
      <p className="max-w-md text-base text-slate-500">{subtitle}</p>
    </div>
  );
}

function MultiSelectScreen({
  question,
  selected,
  onToggle,
}: {
  question: MultiSelectQuestion;
  selected: string[];
  onToggle: (optionId: string) => void;
}) {
  const isSingleSelect = question.maxSelect === 1;
  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-slate-800">{question.prompt}</h3>
      <p className="mb-5 text-sm text-slate-400">
        {isSingleSelect ? 'בחר/י אפשרות אחת' : `בחר/י עד ${question.maxSelect} אפשרויות`}
      </p>
      <div className="flex flex-col gap-2.5">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={`rounded-xl border-2 px-4 py-3.5 text-right transition ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/70'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">{option.title.replace(/:$/, '')}</span>
                  <span className="text-slate-500"> - {option.subtitle}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickPicksScreen({
  itemIds,
  answers,
  onAnswer,
}: {
  itemIds: string[];
  answers: Record<string, QuickPickAnswer>;
  onAnswer: (itemId: string, answer: QuickPickAnswer) => void;
}) {
  const items = itemIds.map(getQuickPickItem).filter((i): i is QuickPickItem => i != null);

  return (
    <div className="flex flex-col gap-5">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-base font-medium text-slate-700">{item.text}</p>
          <div className="flex gap-2">
            {QP_CHOICES.map((choice) => {
              const Icon = choice.icon;
              const isActive = answers[item.id] === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => onAnswer(item.id, choice.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                    isActive ? choice.active : choice.base
                  }`}
                >
                  <Icon size={14} />
                  {choice.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const SLIDER_STOPS = [30, 130, 230, 330, 430] as const;
const SLIDER_VALUES = [-2, -1, 0, 1, 2] as const;
const SLIDER_LABELS = ['ממש', 'קצת', 'שווה', 'קצת', 'ממש'] as const;
const TRACK_PATH = 'M 30,2 C 140,2 195,25 230,25 C 265,25 320,2 430,2 A 28,28 0 0 1 430,58 C 320,58 265,35 230,35 C 195,35 140,58 30,58 A 28,28 0 0 1 30,2 Z';

function thumbRadius(x: number) {
  const d = Math.abs(x - 230) / 200;
  return 9 + d * 10;
}

function thumbDotRadius(x: number) {
  const d = Math.abs(x - 230) / 200;
  return 3 + d * 3;
}

function nearestStop(x: number) {
  let best = 0;
  let bestD = Infinity;
  SLIDER_STOPS.forEach((s, i) => {
    const d = Math.abs(x - s);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

function ValueSliderScreen({
  slider,
  value,
  onChange,
}: {
  slider: ValueSliderQuestion;
  value: number;
  onChange: (value: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const thumbRef = useRef<SVGCircleElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const fillLRef = useRef<SVGRectElement>(null);
  const fillRRef = useRef<SVGRectElement>(null);
  const draggingRef = useRef(false);
  const curXRef = useRef<number>(SLIDER_STOPS[value + 2] ?? 230);
  const animRef = useRef<number>(0);

  const valueIdx = value + 2;

  const renderThumb = useCallback((x: number) => {
    curXRef.current = x;
    const r = thumbRadius(x);
    const dr = thumbDotRadius(x);
    thumbRef.current?.setAttribute('cx', String(x));
    thumbRef.current?.setAttribute('r', String(r));
    dotRef.current?.setAttribute('cx', String(x));
    dotRef.current?.setAttribute('r', String(dr));
    fillLRef.current?.setAttribute('x', String(x));
    fillLRef.current?.setAttribute('width', String(Math.max(0, 230 - x)));
    fillRRef.current?.setAttribute('width', String(Math.max(0, x - 230)));
  }, []);

  const toSvgX = useCallback((clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 230;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(30, Math.min(430, (1 - ratio) * 460));
  }, []);

  const snapTo = useCallback((targetIdx: number) => {
    cancelAnimationFrame(animRef.current);
    const tx = SLIDER_STOPS[targetIdx];
    const sx = curXRef.current;
    const start = performance.now();
    const dur = 180;
    const tick = (now: number) => {
      let t = Math.min(1, (now - start) / dur);
      t = t * (2 - t);
      renderThumb(sx + (tx - sx) * t);
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    onChange(SLIDER_VALUES[targetIdx]);
  }, [onChange, renderThumb]);

  useEffect(() => {
    renderThumb(SLIDER_STOPS[value + 2] ?? 230);
  }, [value, renderThumb]);

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!draggingRef.current) return;
      const x = toSvgX(clientX);
      renderThumb(x);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const idx = nearestStop(curXRef.current);
      snapTo(idx);
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onMouseUp = () => handleUp();
    const onTouchEnd = () => handleUp();
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(animRef.current);
    };
  }, [toSvgX, renderThumb, snapTo]);

  const handlePointerDown = useCallback((clientX: number) => {
    cancelAnimationFrame(animRef.current);
    draggingRef.current = true;
    renderThumb(toSvgX(clientX));
  }, [toSvgX, renderThumb]);

  const leftActive = value < 0;
  const rightActive = value > 0;

  return (
    <div className="py-8">
      <h3 className="mb-8 text-center text-lg font-semibold text-slate-800">
        כשאת/ה חושב/ת על הקריירה שלך, מה מרגיש לך יותר חשוב?
      </h3>

      <div className="flex items-stretch justify-between gap-4">
        <div
          className={`flex-1 rounded-xl border-2 p-4 text-center transition ${
            leftActive
              ? 'border-[#534AB7] bg-[#EEEDFE]'
              : 'border-slate-200'
          }`}
        >
          <p className="font-semibold text-slate-800">{slider.leftLabel}</p>
          <p className="mt-1 text-sm text-slate-500">{slider.leftDescription}</p>
        </div>

        <div
          className={`flex-1 rounded-xl border-2 p-4 text-center transition ${
            rightActive
              ? 'border-[#534AB7] bg-[#EEEDFE]'
              : 'border-slate-200'
          }`}
        >
          <p className="font-semibold text-slate-800">{slider.rightLabel}</p>
          <p className="mt-1 text-sm text-slate-500">{slider.rightDescription}</p>
        </div>
      </div>

      <div className="mt-8 mx-auto max-w-[460px] px-1">
        <svg
          ref={svgRef}
          viewBox="0 0 460 60"
          className="w-full block cursor-pointer select-none"
          style={{ transform: 'scaleX(-1)' }}
          onMouseDown={(e) => { e.preventDefault(); handlePointerDown(e.clientX); }}
          onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        >
          <defs>
            <clipPath id={`track-clip-${slider.id}`}>
              <path d={TRACK_PATH} />
            </clipPath>
          </defs>
          <path d={TRACK_PATH} fill="#e8f7fa" stroke="#c8e8ee" strokeWidth="0.5" />
          <rect
            ref={fillLRef}
            x="230" y="0" width="0" height="60"
            fill="#85B7EB"
            clipPath={`url(#track-clip-${slider.id})`}
          />
          <rect
            ref={fillRRef}
            x="230" y="0" width="0" height="60"
            fill="#85B7EB"
            clipPath={`url(#track-clip-${slider.id})`}
          />
          <circle
            ref={thumbRef}
            cx={SLIDER_STOPS[valueIdx]}
            cy="30"
            r={thumbRadius(SLIDER_STOPS[valueIdx])}
            fill="white"
            stroke="#534AB7"
            strokeWidth="2.5"
            className="cursor-grab"
          />
          <circle
            ref={dotRef}
            cx={SLIDER_STOPS[valueIdx]}
            cy="30"
            r={thumbDotRadius(SLIDER_STOPS[valueIdx])}
            fill="#534AB7"
            pointerEvents="none"
          />
        </svg>
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          {SLIDER_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => snapTo(i)}
              className={`w-12 text-center ${valueIdx === i ? 'font-bold text-indigo-600' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
