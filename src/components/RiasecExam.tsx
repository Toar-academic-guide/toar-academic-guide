'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Minus, X } from 'lucide-react';
import type { RiasecDimension } from '@/types';
import {
  SCREEN_SEQUENCE,
  SCENARIOS,
  RATING_ITEMS,
  SITUATIONALS,
  MILITARY_OPTIONS,
  ANSWER_SCORES,
  MILITARY_BONUS,
  type RiasecAnswer,
  type RatingItem,
  type Screen,
} from '@/data/riasecItems';

interface Props {
  /** Called when every screen is done. Returns normalised 0–5 scores per dimension,
   *  ready to feed directly into the recommendation engine (no further scaling). */
  onComplete: (normalizedScores: Record<RiasecDimension, number>) => void;
}

const DIMS: RiasecDimension[] = ['R', 'I', 'A', 'S', 'E', 'C'];
const TOTAL_SCREENS = SCREEN_SEQUENCE.length;
const MAX_MILITARY_PICKS = 2;

const SLIDE: import('framer-motion').Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

// ── Lookups ─────────────────────────────────────────────────────────────────
const SCENARIO_BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]));
const RATING_BY_ID = new Map(RATING_ITEMS.map((r) => [r.id, r]));
const SITUATIONAL_BY_ID = new Map(SITUATIONALS.map((s) => [s.id, s]));

// ── כן / אולי / לא button config (Part 1) ──────────────────────────────────────
const CHOICES: {
  value: RiasecAnswer;
  label: string;
  icon: typeof Check;
  base: string;
  active: string;
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

type RatingMap = Partial<Record<string, RiasecAnswer>>;   // itemId → answer
type ScenarioMap = Partial<Record<string, 'a' | 'b'>>;    // scenarioId → side
type SituationalMap = Partial<Record<string, number>>;    // situationalId → option index

export default function RiasecExam({ onComplete }: Props) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [ratings, setRatings] = useState<RatingMap>({});
  const [scenarios, setScenarios] = useState<ScenarioMap>({});
  const [situationals, setSituationals] = useState<SituationalMap>({});
  const [militaryLoved, setMilitaryLoved] = useState<RiasecDimension[]>([]);
  const [militaryDrained, setMilitaryDrained] = useState<RiasecDimension[]>([]);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  const screen = SCREEN_SEQUENCE[screenIndex];
  const progressPercent = Math.round((screenIndex / TOTAL_SCREENS) * 100);

  // ── Per-screen completion gate ──────────────────────────────────────────────
  function isScreenComplete(s: Screen): boolean {
    if (s.kind === 'military') return true;     // 0–2 picks; skippable
    if (s.kind === 'transition') return true;   // breather screen
    if (s.kind === 'scenario') return scenarios[s.scenarioId] !== undefined;
    if (s.kind === 'situational') return situationals[s.situationalId] !== undefined;
    return s.itemIds.every((id) => ratings[id] !== undefined);
  }
  const canAdvance = isScreenComplete(screen);

  // ── Mutators ────────────────────────────────────────────────────────────────
  function setRating(itemId: string, value: RiasecAnswer) {
    setRatings((prev) => ({ ...prev, [itemId]: value }));
  }
  function setScenario(scenarioId: string, side: 'a' | 'b') {
    setScenarios((prev) => ({ ...prev, [scenarioId]: side }));
  }
  function setSituational(situationalId: string, optionIndex: number) {
    setSituationals((prev) => ({ ...prev, [situationalId]: optionIndex }));
  }

  function toggleMilitary(mode: 'loved' | 'drained', dim: RiasecDimension) {
    const [list, setList] =
      mode === 'loved'
        ? [militaryLoved, setMilitaryLoved]
        : [militaryDrained, setMilitaryDrained];
    if (list.includes(dim)) {
      setList(list.filter((d) => d !== dim));
    } else if (list.length < MAX_MILITARY_PICKS) {
      setList([...list, dim]);
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function handleBack() {
    if (screenIndex === 0) return;
    setSlideDir(-1);
    setScreenIndex((i) => i - 1);
  }

  function handleNext() {
    if (!canAdvance) return;
    if (screenIndex < TOTAL_SCREENS - 1) {
      setSlideDir(1);
      setScreenIndex((i) => i + 1);
    } else {
      onComplete(computeScores());
    }
  }

  // ── Scoring: weighted per-dimension raw + max → normalise to 0–5 ─────────────
  // Each dimension is normalised against its OWN max-possible, so the 3 formats
  // stay balanced and every dimension sits on the same 0–5 scale.
  function computeScores(): Record<RiasecDimension, number> {
    const raw = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as Record<RiasecDimension, number>;
    const max = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as Record<RiasecDimension, number>;

    // Part 1 — classic rating items
    for (const item of RATING_ITEMS) {
      raw[item.dim] += ANSWER_SCORES[ratings[item.id] ?? 'no'];
      max[item.dim] += ANSWER_SCORES.yes;
    }

    // Part 2 — "זה או זה" (chosen side +2; each side counts toward its dim's max)
    for (const sc of SCENARIOS) {
      max[sc.a.dim] += 2;
      max[sc.b.dim] += 2;
      const side = scenarios[sc.id];
      if (side === 'a') raw[sc.a.dim] += 2;
      else if (side === 'b') raw[sc.b.dim] += 2;
    }

    // Part 3 — situational (chosen option's weights; per-dim max = best option for that dim)
    for (const sit of SITUATIONALS) {
      for (const d of DIMS) {
        let best = 0;
        for (const opt of sit.options) best = Math.max(best, opt.weights[d] ?? 0);
        max[d] += best;
      }
      const chosen = situationals[sit.id];
      if (chosen !== undefined) {
        const opt = sit.options[chosen];
        for (const d of DIMS) raw[d] += opt.weights[d] ?? 0;
      }
    }

    // Part 0 — military: loved adds, drained subtracts (clamped into the dim's range)
    for (const d of militaryLoved) raw[d] += MILITARY_BONUS;
    for (const d of militaryDrained) raw[d] -= MILITARY_BONUS;

    const normalized = {} as Record<RiasecDimension, number>;
    for (const d of DIMS) {
      const m = max[d] || 1;
      const clamped = Math.max(0, Math.min(m, raw[d]));
      normalized[d] = Math.round((clamped / m) * 5);
    }
    return normalized;
  }

  const xIn = slideDir * 60;
  const isLast = screenIndex === TOTAL_SCREENS - 1;

  return (
    <div className="min-h-screen w-full bg-[#f5f4f0] px-2 py-10 sm:px-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-lg md:p-12">

        {/* ── Progress ───────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>שלב {screenIndex + 1} מתוך {TOTAL_SCREENS}</span>
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

        {/* ── Animated screen (keyed re-mount plays the slide-in) ─────── */}
        <motion.div
          key={screenIndex}
          initial={{ opacity: 0, x: xIn }}
          animate={{ opacity: 1, x: 0 }}
          transition={SLIDE}
          className="flex flex-col gap-6"
        >
          {screen.kind === 'military' && (
            <MilitaryScreen
              mode={screen.mode}
              selected={screen.mode === 'loved' ? militaryLoved : militaryDrained}
              onToggle={(dim) => toggleMilitary(screen.mode, dim)}
            />
          )}

          {screen.kind === 'transition' && <TransitionScreen screen={screen} />}

          {screen.kind === 'scenario' && (
            <ScenarioScreen
              scenarioId={screen.scenarioId}
              selected={scenarios[screen.scenarioId]}
              onSelect={(side) => setScenario(screen.scenarioId, side)}
            />
          )}

          {screen.kind === 'situational' && (
            <SituationalScreen
              situationalId={screen.situationalId}
              selected={situationals[screen.situationalId]}
              onSelect={(idx) => setSituational(screen.situationalId, idx)}
            />
          )}

          {screen.kind === 'rating' && (
            <RatingScreen
              itemIds={screen.itemIds}
              answers={ratings}
              onAnswer={setRating}
            />
          )}
        </motion.div>

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
            disabled={!canAdvance}
            className={[
              'flex items-center gap-2 rounded-full px-10 py-3.5 text-sm font-bold text-white',
              'bg-gradient-to-l from-indigo-600 to-violet-600',
              'shadow-lg shadow-indigo-200/70',
              'transition-all hover:shadow-xl hover:brightness-110',
              'disabled:cursor-not-allowed disabled:opacity-40',
            ].join(' ')}
          >
            <span>{isLast ? 'סיום הבחינה' : screen.kind === 'transition' ? 'יאללה, מתחילים' : 'הבא'}</span>
            <ChevronLeft size={16} />
          </motion.button>
        </div>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 *  Screen renderers
 * ════════════════════════════════════════════════════════════════════════════ */

// ── Part transition (breather between the 3 parts) ──────────────────────────────
function TransitionScreen({
  screen,
}: {
  screen: Extract<Screen, { kind: 'transition' }>;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="text-5xl">{screen.emoji}</span>
      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-500">
        {screen.part}
      </span>
      <h2 className="text-3xl font-black tracking-tight text-slate-900">{screen.title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-slate-500">{screen.subtitle}</p>
    </div>
  );
}

// ── Military (multi-select up to 2) ─────────────────────────────────────────────
function MilitaryScreen({
  mode,
  selected,
  onToggle,
}: {
  mode: 'loved' | 'drained';
  selected: RiasecDimension[];
  onToggle: (dim: RiasecDimension) => void;
}) {
  const atMax = selected.length >= MAX_MILITARY_PICKS;
  const title = mode === 'loved' ? 'מה הכי הדליק אותך בשירות?' : 'ומה הכי שחק לך את העצבים?';
  const sub =
    mode === 'loved'
      ? 'בחר/י עד 2 — מה שהכי אהבת לעשות'
      : 'בחר/י עד 2 — מה שהכי לא התחברת אליו';

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🪖</span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        <p className="text-sm text-slate-500">{sub}</p>
        <p className="text-xs text-slate-400">השירות שלך הוא רמז חזק — אפשר גם לדלג</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MILITARY_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.dim);
          const dimmed = atMax && !isSelected;
          const activeColor =
            mode === 'loved'
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-rose-300 bg-rose-50';
          const activeText = mode === 'loved' ? 'text-indigo-800' : 'text-rose-700';
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: dimmed ? 1 : 0.97 }}
              onClick={() => onToggle(opt.dim)}
              aria-pressed={isSelected}
              className={[
                'flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all duration-150',
                isSelected
                  ? activeColor
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50',
                dimmed ? 'opacity-40' : '',
              ].join(' ')}
            >
              <span className="shrink-0 text-2xl">{opt.emoji}</span>
              <span className={`text-sm font-semibold ${isSelected ? activeText : 'text-slate-700'}`}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

// ── Scenario "זה או זה" (single choice of two) ──────────────────────────────────
function ScenarioScreen({
  scenarioId,
  selected,
  onSelect,
}: {
  scenarioId: string;
  selected?: 'a' | 'b';
  onSelect: (side: 'a' | 'b') => void;
}) {
  const sc = SCENARIO_BY_ID.get(scenarioId);
  if (!sc) return null;

  const sides: { side: 'a' | 'b'; text: string }[] = [
    { side: 'a', text: sc.a.text },
    { side: 'b', text: sc.b.text },
  ];

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">מה יותר אתה?</span>
        <h2 className="text-xl font-bold leading-relaxed tracking-tight text-slate-900">
          {sc.prompt}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sides.map(({ side, text }) => {
          const isSelected = selected === side;
          return (
            <motion.button
              key={side}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(side)}
              aria-pressed={isSelected}
              className={[
                'flex min-h-28 flex-col justify-center gap-2 rounded-2xl border-2 p-5 text-right transition-all duration-150',
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <span className={`text-sm leading-relaxed ${isSelected ? 'font-semibold text-indigo-900' : 'text-slate-700'}`}>
                {text}
              </span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

// ── Situational "מה היית עושה?" (single choice of six) ──────────────────────────
function SituationalScreen({
  situationalId,
  selected,
  onSelect,
}: {
  situationalId: string;
  selected?: number;
  onSelect: (optionIndex: number) => void;
}) {
  const sit = SITUATIONAL_BY_ID.get(situationalId);
  if (!sit) return null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{sit.emoji}</span>
          <h2 className="text-xl font-bold leading-relaxed tracking-tight text-slate-900">
            {sit.prompt}
          </h2>
        </div>
        <p className="text-xs text-slate-400">בחר/י את התגובה שהכי מתארת אותך</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {sit.options.map((opt, idx) => {
          const isSelected = selected === idx;
          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(idx)}
              aria-pressed={isSelected}
              className={[
                'flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all duration-150',
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                  isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent',
                ].join(' ')}
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <span className={`text-sm leading-relaxed ${isSelected ? 'font-semibold text-indigo-900' : 'text-slate-700'}`}>
                {opt.text}
              </span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

// ── Rating group (כן / אולי / לא) ───────────────────────────────────────────────
function RatingScreen({
  itemIds,
  answers,
  onAnswer,
}: {
  itemIds: string[];
  answers: RatingMap;
  onAnswer: (itemId: string, value: RiasecAnswer) => void;
}) {
  const items = itemIds
    .map((id) => RATING_BY_ID.get(id))
    .filter((x): x is RatingItem => x !== undefined);
  const answeredCount = itemIds.filter((id) => answers[id] !== undefined).length;
  const allAnswered = answeredCount === itemIds.length;

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💭</span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">כמה זה אתה?</h2>
        </div>
        <p className="text-sm text-slate-400">דרג/י עד כמה כל משפט מתאר אותך</p>
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
            <div key={item.id} className="flex items-center gap-3 py-3">
              <div className="flex flex-1 items-start gap-2 text-right">
                <span className="mt-0.5 shrink-0 text-xs font-medium text-slate-300">{idx + 1}.</span>
                <p className={`text-sm leading-relaxed ${current !== undefined ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                  {item.text}
                </p>
              </div>

              {CHOICES.map((c) => {
                const isSelected = current === c.value;
                const Icon = c.icon;
                return (
                  <motion.button
                    key={c.value}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onAnswer(item.id, c.value)}
                    aria-label={`${item.text} — ${c.label}`}
                    aria-pressed={isSelected}
                    className={[
                      'flex h-9 w-16 shrink-0 items-center justify-center',
                      'rounded-lg border-2 transition-all duration-150',
                      isSelected ? c.active : c.base,
                    ].join(' ')}
                  >
                    <Icon size={15} strokeWidth={isSelected ? 2.5 : 1.8} />
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
          {itemIds.map((id) => (
            <div
              key={id}
              className={[
                'h-1 w-4 rounded-full transition-colors duration-200',
                answers[id] !== undefined ? 'bg-indigo-400' : 'bg-slate-200',
              ].join(' ')}
            />
          ))}
        </div>
        <span>{allAnswered ? 'כל הפריטים נענו ✓' : `${answeredCount} מתוך ${itemIds.length} נענו`}</span>
      </div>
    </>
  );
}
