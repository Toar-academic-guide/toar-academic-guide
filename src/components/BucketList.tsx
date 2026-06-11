'use client';

import { useMemo } from 'react';
import {
  CheckCircle2,
  TrendingUp,
  BookmarkX,
  Info,
  Bookmark,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import type { AcademicScores, University } from '@/types';
import type { Program } from '@/data/degrees/types';
import { analyzeBucketList, type BucketEntry } from '@/utils/bucketListEngine';
import InstitutionLogo from '@/components/InstitutionLogo';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  programs: Program[];
  calculatorInstitutions: University[];
  savedProgramIds: string[];
  academicScores?: AcademicScores;
  onRemove: (programId: string) => void;
  onBack: () => void;
  /** Optional override for the back-button text and empty-state CTA.
   *  Default behaviour assumes user came from the recommendations screen. */
  backLabel?: string;
  emptyCtaLabel?: string;
}

// ── Individual saved-item card ────────────────────────────────────────────────

function BucketCard({
  entry,
  onRemove,
}: {
  entry: BucketEntry;
  onRemove: (id: string) => void;
}) {
  const { program, status, sekhem, threshold, delta } = entry;

  // ── Border / background per status ──────────────────────────────────────────
  const cardClass =
    status === 'qualified'
      ? 'border-green-100 bg-green-50/40'
      : status === 'gap'
      ? 'border-amber-100 bg-white'
      : 'border-slate-100 bg-white';

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 transition ${cardClass}`}>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">

        {/* Logo + names */}
        <div className="flex min-w-0 items-center gap-2.5">
          <InstitutionLogo institution={program.institution} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {program.institution}
            </p>
            <p className="truncate text-xs text-slate-500">{program.name}</p>
          </div>
        </div>

        {/* Right cluster: score badge + remove button */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Sekhem badge (qualified / gap) */}
          {(status === 'qualified' || status === 'gap') && threshold !== undefined && (
            <span
              className={[
                'rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums',
                status === 'qualified'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-50 text-red-700',
              ].join(' ')}
            >
              {sekhem} / ≥{threshold}
            </span>
          )}

          {/* Requirements badge */}
          {status === 'requirements' && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
              לפי דרישות
            </span>
          )}

          {/* No-data badge */}
          {status === 'no-data' && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
              ממתין לציונים
            </span>
          )}

          {/* Remove from bucket list */}
          <button
            type="button"
            onClick={() => onRemove(program.id)}
            aria-label="הסר מהרשימה"
            title="הסר מהרשימה"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
          >
            <BookmarkX size={15} />
          </button>
        </div>
      </div>

      {/* ── Qualified confirmation line ─────────────────────────────────────── */}
      {status === 'qualified' && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
          <CheckCircle2 size={13} className="shrink-0" />
          הציונים שלך עומדים בדרישות הקבלה לתוכנית זו
        </p>
      )}

      {/* ── Gap analysis box ───────────────────────────────────────────────── */}
      {status === 'gap' && delta && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <TrendingUp size={13} className="shrink-0" />
            הפער שלך לקבלה
          </p>
          <p className="text-xs leading-relaxed text-amber-900">
            חסרות כ-<span className="font-bold">{delta.psychometric}</span> נקודות בציון הפסיכומטרי
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700">
            או: העלאת ממוצע הבגרות בכ-<span className="font-bold">{delta.bagrut}</span> נקודות
          </p>
        </div>
      )}

      {/* ── Requirements-track note ─────────────────────────────────────────── */}
      {status === 'requirements' && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500">
          <Info size={12} className="mt-0.5 shrink-0" />
          קבלה לתוכנית זו מתבצעת לפי דרישות המוסד — בדוק את הדרישות הספציפיות באתר הרשמי.
        </p>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  variant: 'green' | 'amber' | 'slate';
}) {
  const colors = {
    green: 'border-green-100 bg-green-50 text-green-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    slate: 'border-slate-100 bg-slate-50 text-slate-600',
  };
  const countColors = {
    green: 'bg-green-200 text-green-900',
    amber: 'bg-amber-200 text-amber-900',
    slate: 'bg-slate-200 text-slate-700',
  };

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold ${colors[variant]}`}
    >
      {icon}
      <span className="flex-1">{title}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${countColors[variant]}`}>
        {count}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BucketList({
  programs,
  calculatorInstitutions,
  savedProgramIds,
  academicScores,
  onRemove,
  onBack,
  backLabel = 'חזרה להמלצות',
  emptyCtaLabel = 'עבור להמלצות ←',
}: Props) {
  // Build UserScores only when both required fields are present
  const userScores = useMemo(() => {
    const psy  = academicScores?.psychometric?.overall;
    const bag  = academicScores?.bagrut?.weightedAverage;
    return psy !== undefined && bag !== undefined
      ? { psychometric: psy, bagrut: bag }
      : null;
  }, [academicScores]);

  const entries = useMemo(
    () => analyzeBucketList(savedProgramIds, userScores, programs, calculatorInstitutions),
    [savedProgramIds, userScores, programs, calculatorInstitutions],
  );

  const qualified    = entries.filter((e) => e.status === 'qualified');
  const gap          = entries.filter((e) => e.status === 'gap');
  const requirements = entries.filter((e) => e.status === 'requirements');
  const noData       = entries.filter((e) => e.status === 'no-data');
  const hasScores    = userScores !== null;

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (savedProgramIds.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {/* Back nav */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
        >
          <ArrowRight size={14} />
          {backLabel}
        </button>

        <section className="flex flex-col items-center gap-4 rounded-3xl border border-slate-100 bg-white px-8 py-16 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <Bookmark size={28} className="text-slate-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">רשימת הייעוד ריקה</h2>
            <p className="mt-1.5 max-w-sm text-sm text-slate-400">
              עיין בהמלצות, פתח את פרטי תוכנית לימודים ולחץ על סמל הסימנייה כדי לשמור תארים שמעניינים אותך.
            </p>
          </div>
          <button
            onClick={onBack}
            className="mt-2 rounded-full bg-gradient-to-l from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            {emptyCtaLabel}
          </button>
        </section>
      </div>
    );
  }

  // ── Populated state ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
        >
          <ArrowRight size={14} />
          {backLabel}
        </button>

        <div className="text-left">
          <h1 className="text-lg font-bold text-slate-900">רשימת הייעוד שלך</h1>
          <p className="text-xs text-slate-400">{savedProgramIds.length} תארים שמורים</p>
        </div>
      </div>

      {/* ── Missing scores banner ─────────────────────────────────────────────── */}
      {!hasScores && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3.5">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-blue-500" />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              הזן ציוני פסיכומטרי ובגרות כדי לקבל ניתוח פערים מדויק
            </p>
            <p className="mt-0.5 text-xs text-blue-600">
              חזור לשלב הזנת הציונים בתחילת התהליך כדי להפעיל את חישוב הפערים האוטומטי.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* Section A — Qualified                                                   */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {qualified.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={<CheckCircle2 size={16} />}
            title="תארים שמעניינים אותי ואני מתקבל אליהם כרגע"
            count={qualified.length}
            variant="green"
          />
          {qualified.map((entry) => (
            <BucketCard key={entry.program.id} entry={entry} onRemove={onRemove} />
          ))}
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* Section B — Gap                                                          */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {gap.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={<TrendingUp size={16} />}
            title="תארים שמעניינים אותי ועדיין לא הגעתי לרף הקבלה"
            count={gap.length}
            variant="amber"
          />
          {gap.map((entry) => (
            <BucketCard key={entry.program.id} entry={entry} onRemove={onRemove} />
          ))}
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* Section C — Requirements-track + no-data (smaller shelf)                */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(requirements.length > 0 || noData.length > 0) && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={<Info size={16} />}
            title="מוסדות נוספים ומסלולים בקבלה לפי דרישות"
            count={requirements.length + noData.length}
            variant="slate"
          />
          {[...requirements, ...noData].map((entry) => (
            <BucketCard key={entry.program.id} entry={entry} onRemove={onRemove} />
          ))}
        </section>
      )}

    </div>
  );
}
