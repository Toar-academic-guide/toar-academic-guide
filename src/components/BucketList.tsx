'use client';

import { useMemo, useState } from 'react';
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
import type { CatalogueInstitution } from '@/types/catalogue';
import { analyzeBucketList, type BucketEntry } from '@/utils/bucketListEngine';
import InstitutionLogo from '@/components/InstitutionLogo';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  programs: Program[];
  calculatorInstitutions: University[];
  catalogueInstitutions: CatalogueInstitution[];
  savedProgramIds: string[];
  academicScores?: AcademicScores;
  onRemove: (programId: string) => void;
  onBack: () => void;
  backLabel?: string;
  emptyCtaLabel?: string;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onContinueAsGuest?: () => void;
}

// ── Individual saved-item card ────────────────────────────────────────────────

const REGION_LABEL = {
  center: 'מרכז',
  north: 'צפון',
  south: 'דרום',
} as const;
const GENERIC_INSTITUTION_NAME = 'אוניברסיטה';

type FilterKind = 'institution' | 'region' | 'degree';

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface BucketFilters {
  degreeKeys: string[];
  institutionKeys: string[];
  regions: Array<keyof typeof REGION_LABEL>;
}

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function getProgramInstitutionKey(
  program: Program,
  institutionByKey?: Map<string, CatalogueInstitution>,
) {
  if (program.institutionId && institutionByKey?.has(program.institutionId)) {
    return program.institutionId;
  }

  return institutionByKey?.get(program.institution)?.id ?? program.institutionId ?? program.institution;
}

function getProgramDegreeKeys(program: Program) {
  return Array.from(new Set([program.name, program.category]));
}

function buildCountedOptions(entries: BucketEntry[], getKeys: (entry: BucketEntry) => string[]) {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    getKeys(entry).forEach((key) => {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });

  return counts;
}

function FilterGroup({
  activeIds,
  kind,
  options,
  title,
  onToggle,
}: {
  activeIds: string[];
  kind: FilterKind;
  options: FilterOption[];
  title: string;
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-[#7784e8]">{title}</p>
      <div className="flex flex-wrap gap-2" data-filter-kind={kind}>
        {options.map((option) => {
          const selected = activeIds.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              aria-pressed={selected}
              className={[
                'inline-flex h-9 items-center gap-1.5 rounded-2xl border px-3 text-xs font-bold transition',
                selected
                  ? 'border-[#7784e8] bg-[#7784e8] text-white shadow-[0_12px_28px_rgba(119,132,232,0.24)]'
                  : 'border-[#d9e3f3] bg-white/78 text-[#647091] hover:border-[#8fd8ff] hover:bg-white',
              ].join(' ')}
            >
              <span>{option.label}</span>
              <span
                className={[
                  'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                  selected ? 'bg-white/20 text-white' : 'bg-[#eef4ff] text-[#7c86a2]',
                ].join(' ')}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BucketCard({ entry, onRemove }: { entry: BucketEntry; onRemove: (id: string) => void }) {
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
            <p className="truncate text-sm font-semibold text-slate-800">{program.institution}</p>
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
                status === 'qualified' ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700',
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
  catalogueInstitutions,
  savedProgramIds,
  academicScores,
  onRemove,
  onBack,
  backLabel = 'חזרה להמלצות',
  emptyCtaLabel = 'עבור להמלצות ←',
  isAuthenticated = false,
  onSignIn,
  onContinueAsGuest,
}: Props) {
  const [filters, setFilters] = useState<BucketFilters>({
    degreeKeys: [],
    institutionKeys: [],
    regions: [],
  });

  // Build UserScores only when both required fields are present
  const userScores = useMemo(() => {
    const psy = academicScores?.psychometric?.overall;
    const bag = academicScores?.bagrut?.weightedAverage;
    return psy !== undefined && bag !== undefined ? { psychometric: psy, bagrut: bag } : null;
  }, [academicScores]);

  const entries = useMemo(
    () => analyzeBucketList(savedProgramIds, userScores, programs, calculatorInstitutions),
    [savedProgramIds, userScores, programs, calculatorInstitutions],
  );

  const institutionByKey = useMemo(() => {
    const byKey = new Map<string, CatalogueInstitution>();
    catalogueInstitutions.forEach((institution) => {
      byKey.set(institution.id, institution);
      byKey.set(institution.name, institution);
    });
    return byKey;
  }, [catalogueInstitutions]);

  const filterOptions = useMemo(() => {
    const institutionCounts = buildCountedOptions(entries, (entry) =>
      entry.program.institution === GENERIC_INSTITUTION_NAME
        ? []
        : [getProgramInstitutionKey(entry.program, institutionByKey)],
    );
    const regionCounts = buildCountedOptions(entries, (entry) => {
      if (entry.program.institution === GENERIC_INSTITUTION_NAME) {
        return [];
      }

      const region = institutionByKey.get(
        getProgramInstitutionKey(entry.program, institutionByKey),
      )?.region;
      return region && region !== 'any' ? [region] : [];
    });
    const degreeCounts = buildCountedOptions(entries, (entry) => getProgramDegreeKeys(entry.program));

    const institutionOptions = Array.from(institutionCounts, ([id, count]) => {
      const program = entries.find(
        (entry) => getProgramInstitutionKey(entry.program, institutionByKey) === id,
      )?.program;
      return {
        id,
        count,
        label: institutionByKey.get(id)?.name ?? program?.institution ?? id,
      };
    }).sort((left, right) => left.label.localeCompare(right.label, 'he'));

    const regionOptions = Array.from(regionCounts, ([id, count]) => ({
      id,
      count,
      label: REGION_LABEL[id as keyof typeof REGION_LABEL] ?? id,
    })).sort((left, right) => left.label.localeCompare(right.label, 'he'));

    const degreeOptions = Array.from(degreeCounts, ([id, count]) => ({
      id,
      count,
      label: id,
    })).sort((left, right) => left.label.localeCompare(right.label, 'he'));

    return { degreeOptions, institutionOptions, regionOptions };
  }, [entries, institutionByKey]);

  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const institutionKey = getProgramInstitutionKey(entry.program, institutionByKey);
        const region = institutionByKey.get(institutionKey)?.region;
        const degreeKeys = getProgramDegreeKeys(entry.program);

        const institutionMatch =
          filters.institutionKeys.length === 0 || filters.institutionKeys.includes(institutionKey);
        const regionMatch =
          filters.regions.length === 0 ||
          (region !== undefined && filters.regions.includes(region as keyof typeof REGION_LABEL));
        const degreeMatch =
          filters.degreeKeys.length === 0 ||
          filters.degreeKeys.some((degreeKey) => degreeKeys.includes(degreeKey));

        return institutionMatch && regionMatch && degreeMatch;
      }),
    [entries, filters, institutionByKey],
  );

  const activeFilterCount =
    filters.institutionKeys.length + filters.regions.length + filters.degreeKeys.length;
  const qualified = visibleEntries.filter((e) => e.status === 'qualified');
  const gap = visibleEntries.filter((e) => e.status === 'gap');
  const requirements = visibleEntries.filter((e) => e.status === 'requirements');
  const noData = visibleEntries.filter((e) => e.status === 'no-data');
  const hasScores = userScores !== null;

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (savedProgramIds.length === 0) {
    const handleGuestContinue = onContinueAsGuest ?? onBack;

    return (
      <div className="flex flex-col gap-6">
        {/* Back nav */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 self-start rounded-2xl border border-white bg-white/82 px-4 py-2 text-sm font-bold text-[#647091] shadow-[0_14px_34px_rgba(105,133,190,0.14)] backdrop-blur-xl transition hover:bg-white hover:text-[#5262d9]"
        >
          <ArrowRight size={14} />
          {backLabel}
        </button>

        {!isAuthenticated ? (
          <section className="relative overflow-hidden rounded-[1.7rem] border border-white bg-white/78 px-6 py-10 text-center shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur-xl sm:px-10 sm:py-14">
            <div className="pointer-events-none absolute -left-16 top-8 h-32 w-32 rounded-full bg-[#ffd4ec]/40 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 bottom-8 h-36 w-36 rounded-full bg-[#bfeeff]/45 blur-3xl" />

            <div className="relative mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white bg-white/82 shadow-[0_16px_42px_rgba(105,133,190,0.16)]">
                <Bookmark size={28} className="text-[#7784e8]" />
              </div>

              <p className="mt-5 text-sm font-bold text-[#7784e8]">הרשימה שלי</p>
              <h2 className="mt-2 text-2xl font-bold text-[#445274] sm:text-3xl">
                רוצה לשמור אפשרויות להשוואה?
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-[#6f7a99] sm:text-base">
                כדי לשמור תארים מועדפים ולהשוות ביניהם לאורך זמן, כדאי להתחבר או ליצור
                חשבון לפני שמתחילים.
              </p>

              <div className="mt-6 rounded-[1.25rem] border border-[#fff1bd] bg-[#fff8e8]/82 px-4 py-3 text-sm font-semibold leading-7 text-[#8a6b23]">
                אפשר להמשיך כאורח/ת ולבחור תארים עכשיו, אבל הרשימה תישמר רק בדפדפן
                הזה ועלולה להימחק. כדי לשמור אותה בחשבון ובמכשירים נוספים צריך להירשם.
              </div>

              <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={!onSignIn}
                  className="rounded-2xl bg-[#7784e8] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_38px_rgba(119,132,232,0.26)] transition hover:bg-[#6574dc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  התחברות / יצירת חשבון
                </button>
                <button
                  type="button"
                  onClick={handleGuestContinue}
                  className="rounded-2xl border border-[#d9e3f3] bg-white/82 px-6 py-3 text-sm font-bold text-[#647091] shadow-[0_12px_30px_rgba(105,133,190,0.1)] transition hover:border-[#8fd8ff] hover:bg-white hover:text-[#5262d9]"
                >
                  להמשיך כאורח/ת
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-col items-center gap-4 rounded-[1.7rem] border border-white bg-white/78 px-8 py-16 text-center shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white bg-white/82 shadow-[0_16px_42px_rgba(105,133,190,0.16)]">
              <Bookmark size={28} className="text-[#7784e8]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#445274]">הרשימה שלי ריקה</h2>
              <p className="mt-1.5 max-w-sm text-sm leading-6 text-[#6f7a99]">
                עיין בהמלצות, פתח את פרטי תוכנית לימודים ולחץ על סמל הסימנייה כדי לשמור
                תארים שמעניינים אותך.
              </p>
            </div>
            <button
              onClick={onBack}
              className="mt-2 rounded-2xl bg-[#7784e8] px-6 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(119,132,232,0.24)] transition hover:bg-[#6574dc]"
            >
              {emptyCtaLabel}
            </button>
          </section>
        )}
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
          <h1 className="text-lg font-bold text-slate-900">הרשימה שלי</h1>
          <p className="text-xs text-slate-400">{savedProgramIds.length} תארים שמורים</p>
        </div>
      </div>

      <section className="rounded-[1.7rem] border border-white bg-white/78 p-4 shadow-[0_20px_64px_rgba(105,133,190,0.12)] backdrop-blur-xl sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#7784e8]">איך להשוות?</p>
            <h2 className="mt-1 text-xl font-bold text-[#445274]">בחר מוסדות, אזורים או תארים</h2>
            <p className="mt-1 text-sm text-[#6f7a99]">
              אפשר לסנן למשל לפי אוניברסיטת תל אביב, אזור המרכז, או תחומים כמו הנדסה ומדעי המחשב.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#647091]">
              מציג {visibleEntries.length} מתוך {entries.length}
            </span>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setFilters({ degreeKeys: [], institutionKeys: [], regions: [] })
                }
                className="rounded-2xl border border-[#d9e3f3] bg-white/80 px-3 py-1 text-xs font-bold text-[#647091] transition hover:border-[#8fd8ff] hover:bg-white"
              >
                נקה סינון
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          <FilterGroup
            kind="institution"
            title="לפי מוסד"
            options={filterOptions.institutionOptions}
            activeIds={filters.institutionKeys}
            onToggle={(id) =>
              setFilters((current) => ({
                ...current,
                institutionKeys: toggleValue(current.institutionKeys, id),
              }))
            }
          />
          <FilterGroup
            kind="region"
            title="לפי אזור גיאוגרפי"
            options={filterOptions.regionOptions}
            activeIds={filters.regions}
            onToggle={(id) =>
              setFilters((current) => ({
                ...current,
                regions: toggleValue(current.regions, id as keyof typeof REGION_LABEL),
              }))
            }
          />
          <FilterGroup
            kind="degree"
            title="לפי תואר או תחום"
            options={filterOptions.degreeOptions}
            activeIds={filters.degreeKeys}
            onToggle={(id) =>
              setFilters((current) => ({
                ...current,
                degreeKeys: toggleValue(current.degreeKeys, id),
              }))
            }
          />
        </div>
      </section>

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

      {visibleEntries.length === 0 && (
        <section className="rounded-[1.7rem] border border-white bg-white/78 px-6 py-10 text-center shadow-[0_20px_64px_rgba(105,133,190,0.12)] backdrop-blur-xl">
          <h2 className="text-lg font-bold text-[#445274]">אין התאמות לסינון הנוכחי</h2>
          <p className="mt-2 text-sm text-[#6f7a99]">
            נסה להסיר מוסד, אזור או תואר כדי להחזיר אפשרויות להשוואה.
          </p>
          <button
            type="button"
            onClick={() => setFilters({ degreeKeys: [], institutionKeys: [], regions: [] })}
            className="mt-5 rounded-2xl bg-[#7784e8] px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(119,132,232,0.24)] transition hover:bg-[#6574dc]"
          >
            נקה סינון
          </button>
        </section>
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
