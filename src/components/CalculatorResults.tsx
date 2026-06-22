'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import posthog from 'posthog-js';
import { INSTITUTIONS, type InstitutionRecord } from '@/data/institutions';
import { REGION_LABEL } from '@/data/geography';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import InstitutionLogo from '@/components/InstitutionLogo';
import type { CatalogueProgram } from '@/types/catalogue';
import type { GeographicRegion, University, UniversityResult } from '@/types';

const UNIVERSITY_IDS = new Set([
  'tau', 'huji', 'technion', 'bgu', 'haifa', 'biu', 'ariel',
  'weizmann', 'reichman', 'open_university',
]);

type InstitutionType = 'university' | 'college';
type DisplayRegion = Exclude<GeographicRegion, 'any'>;

const DISPLAY_REGIONS: DisplayRegion[] = ['north', 'center', 'south'];

const REGION_COUNT_STYLE: Record<DisplayRegion, string> = {
  north: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  center: 'bg-blue-50 text-blue-700 border-blue-200',
  south: 'bg-amber-50 text-amber-700 border-amber-200',
};

function getInstitutionType(inst: InstitutionRecord): InstitutionType {
  return UNIVERSITY_IDS.has(inst.id) ? 'university' : 'college';
}

function getResultSummary(result: UniversityResult): string {
  if (result.status === 'accepted') {
    return `סכם ${result.sekhem}${result.threshold !== null ? ` · סף ${result.threshold}` : ''}`;
  }

  if (result.status === 'below' && result.deltaNeeded) {
    const parts: string[] = [];
    if (result.deltaNeeded.psychometric > 0) {
      parts.push(`+${result.deltaNeeded.psychometric} פסיכומטרי`);
    }
    if (result.deltaNeeded.bagrut > 0) {
      parts.push(`+${result.deltaNeeded.bagrut} בגרות`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'נדרשים נתונים נוספים';
  }

  return 'אין סף קבלה זמין למסלול זה';
}

interface Props {
  psychometric: number;
  bagrut: number;
  degreeId: string;
  programs: CatalogueProgram[];
  calculatorInstitutions: University[];
  onBack: () => void;
}

export default function CalculatorResults({
  psychometric,
  bagrut,
  degreeId,
  programs,
  calculatorInstitutions,
  onBack,
}: Props) {
  useEffect(() => {
    posthog.capture('calculator_results_viewed', { degree_id: degreeId, psychometric, bagrut });
  }, [degreeId, psychometric, bagrut]);

  const [selectedTypes, setSelectedTypes] = useState<Set<InstitutionType>>(
    new Set(['university', 'college']),
  );
  const [selectedRegions, setSelectedRegions] = useState<Set<DisplayRegion>>(
    new Set(DISPLAY_REGIONS),
  );
  const [expandedRegions, setExpandedRegions] = useState<Set<DisplayRegion>>(new Set());

  const selectedProgram = programs.find((program) => program.id === degreeId);
  const evaluatedResults = selectedProgram
    ? evaluateUniversities(
        calculatorInstitutions,
        selectedProgram,
        { psychometric, bagrut },
        { hasMath5: false, hasPhysics5: false },
      )
    : [];
  const resultsByUniversityId = new Map(
    evaluatedResults.map((result) => [result.university.id, result]),
  );

  const allInstitutions = INSTITUTIONS.filter(
    (institution) =>
      institution.region !== 'any' && resultsByUniversityId.has(institution.universityId ?? institution.id),
  );

  function toggleType(type: InstitutionType) {
    setSelectedTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function toggleRegion(region: DisplayRegion) {
    setSelectedRegions((previous) => {
      const next = new Set(previous);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  }

  function selectAllTypes() {
    setSelectedTypes(new Set(['university', 'college']));
  }

  function selectAllRegions() {
    setSelectedRegions(new Set(DISPLAY_REGIONS));
  }

  function toggleExpanded(region: DisplayRegion) {
    setExpandedRegions((previous) => {
      const next = new Set(previous);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  }

  const filtered = allInstitutions.filter(
    (institution) =>
      selectedTypes.has(getInstitutionType(institution)) &&
      selectedRegions.has(institution.region as DisplayRegion),
  );

  const groupedByRegion = DISPLAY_REGIONS.map((region) => ({
    region,
    institutions: filtered.filter((institution) => institution.region === region),
  })).filter((group) => group.institutions.length > 0);

  const STATUS_CONFIG = {
    accepted: { label: 'מתקבל/ת', bg: 'bg-[#34D399]' },
    below: { label: 'נדרש שיפור', bg: 'bg-[#FCD34D]' },
    unavailable: { label: 'חסר מידע', bg: 'bg-slate-300' },
  } as const;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f4f0]">
      <div className="border-b border-[#e5e7eb] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          >
            <ArrowRight size={16} />
            חזרה
          </button>
          <h1 className="text-xl font-black text-slate-900">סיכויי הקבלה שלך</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="mb-6 text-sm text-slate-500">סנן/י לפי סוג מוסד ואזור גיאוגרפי</p>
        <div className="mb-6 rounded-2xl border-2 border-black bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">הנתונים שחושבו</p>
          <p className="mt-1 text-base font-black text-slate-900">
            {selectedProgram?.name ?? 'תוכנית לא נמצאה'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            פסיכומטרי {psychometric} · ממוצע בגרות {bagrut}
          </p>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">סוג מוסד</p>
            <button type="button" onClick={selectAllTypes} className="text-xs font-semibold text-[#4f46e5]">
              בחר/י הכל
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="אוניברסיטה"
              selected={selectedTypes.has('university')}
              onClick={() => toggleType('university')}
            />
            <FilterChip
              label="מכללה"
              selected={selectedTypes.has('college')}
              onClick={() => toggleType('college')}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">אזור</p>
            <button type="button" onClick={selectAllRegions} className="text-xs font-semibold text-[#4f46e5]">
              בחר/י הכל
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {DISPLAY_REGIONS.map((region) => (
              <FilterChip
                key={region}
                label={REGION_LABEL[region as GeographicRegion]}
                selected={selectedRegions.has(region)}
                onClick={() => toggleRegion(region)}
              />
            ))}
            <span className="relative inline-flex cursor-default items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold text-slate-900">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white" />
              חו&quot;ל
            </span>
          </div>
        </div>

        <div className="relative mb-8">
          <div className="absolute -top-2 left-10 z-10 h-3.5 w-3.5 rotate-45 border-l-2 border-t-2 border-black bg-white" />
          <div className="rounded-2xl border-2 border-black bg-white p-5">
            <p className="mb-2 text-sm font-bold text-slate-900">
              הציונים שלכם אינם מספיקים כדי להתקבל ללימודים בארץ?
            </p>
            <p className="mb-1 text-xs leading-relaxed text-slate-500">
              יש לנו גם אפשרות של חיבור שלכם למוסדות בינלאומיים ללמידה Online.
            </p>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              לצד עוד מספר גדול מאוד של יתרונות שיש לשיטה זו.
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#4f46e5] underline decoration-[#a5b4fc] underline-offset-2 transition hover:text-[#3730a3]"
            >
              לפירוט על לימודים אקדמיים בחו&quot;ל
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {groupedByRegion.map(({ region, institutions }) => {
          const isExpanded = expandedRegions.has(region);
          const visible = isExpanded ? institutions : institutions.slice(0, 3);
          const hiddenCount = institutions.length - 3;

          return (
            <div key={region} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  {REGION_LABEL[region as GeographicRegion]}
                </h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${REGION_COUNT_STYLE[region]}`}>
                  {institutions.length} מוסדות
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {visible.map((institution) => {
                  const result = resultsByUniversityId.get(institution.universityId ?? institution.id);
                  if (!result) {
                    return null;
                  }

                  const config = STATUS_CONFIG[result.status];
                  const institutionType = getInstitutionType(institution);

                  return (
                    <div
                      key={institution.id}
                      className="flex items-center justify-between rounded-[14px] border-2 border-black bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <InstitutionLogo institution={institution.name} record={institution} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{institution.name}</p>
                          <p className="text-[10px] text-slate-500" dir="ltr">
                            {institutionType === 'university' ? 'אוניברסיטה' : 'מכללה'} · {getResultSummary(result)}
                          </p>
                        </div>
                      </div>
                      <span
                        aria-label={`${institution.name}: ${config.label}`}
                        className={`${config.bg} flex-shrink-0 rounded-full border-2 border-black px-3 py-1 text-[10px] font-extrabold text-black`}
                      >
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hiddenCount > 0 && !isExpanded ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(region)}
                  className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-slate-500"
                >
                  + {hiddenCount} מוסדות נוספים <span className="font-semibold text-[#4f46e5]">הצג/י הכל</span>
                  <ChevronDown size={12} className="text-[#4f46e5]" />
                </button>
              ) : null}

              {isExpanded && hiddenCount > 0 ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(region)}
                  className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-slate-500"
                >
                  <span className="font-semibold text-[#4f46e5]">הסתר/י</span>
                  <ChevronDown size={12} className="rotate-180 text-[#4f46e5]" />
                </button>
              ) : null}
            </div>
          );
        })}

        {groupedByRegion.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">לא נמצאו מוסדות עם הסינון הנוכחי</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-bold transition ${
        selected
          ? 'bg-[#A6FAFF] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
          : 'bg-white hover:bg-slate-50 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
      }`}
    >
      {selected ? (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-black bg-[#00E1EF]">
          <Check size={8} strokeWidth={3} />
        </span>
      ) : (
        <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white" />
      )}
      {label}
    </button>
  );
}
