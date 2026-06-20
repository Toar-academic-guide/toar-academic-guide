'use client';

import { useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { INSTITUTIONS, type InstitutionRecord } from '@/data/institutions';
import { REGION_LABEL } from '@/data/geography';
import type { GeographicRegion } from '@/types';

const UNIVERSITY_IDS = new Set([
  'tau', 'huji', 'technion', 'bgu', 'haifa', 'biu', 'ariel',
  'weizmann', 'reichman', 'open_university',
]);

type InstitutionType = 'university' | 'college';
type DisplayRegion = 'north' | 'center' | 'south';

const DISPLAY_REGIONS: DisplayRegion[] = ['north', 'center', 'south'];

const REGION_COUNT_STYLE: Record<DisplayRegion, string> = {
  north: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  center: 'bg-blue-50 text-blue-700 border-blue-200',
  south: 'bg-amber-50 text-amber-700 border-amber-200',
};

function getInstitutionType(inst: InstitutionRecord): InstitutionType {
  return UNIVERSITY_IDS.has(inst.id) ? 'university' : 'college';
}

function getLogoSrc(inst: InstitutionRecord): string | null {
  if (inst.logoUrl) return inst.logoUrl;
  if (inst.domain) return `https://www.google.com/s2/favicons?domain=${inst.domain}&sz=64`;
  return null;
}

interface Props {
  psychometric: number;
  bagrut: number;
  degreeId: string;
  onBack: () => void;
}

export default function CalculatorResults({ onBack }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<Set<InstitutionType>>(
    new Set(['university', 'college']),
  );
  const [selectedRegions, setSelectedRegions] = useState<Set<DisplayRegion>>(
    new Set(DISPLAY_REGIONS),
  );
  const [expandedRegions, setExpandedRegions] = useState<Set<DisplayRegion>>(new Set());

  const allInstitutions = INSTITUTIONS.filter(
    (inst) => inst.region !== 'any',
  );

  function toggleType(t: InstitutionType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function toggleRegion(r: DisplayRegion) {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function selectAllTypes() {
    setSelectedTypes(new Set(['university', 'college']));
  }

  function selectAllRegions() {
    setSelectedRegions(new Set(DISPLAY_REGIONS));
  }

  function toggleExpanded(r: DisplayRegion) {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  const filtered = allInstitutions.filter(
    (inst) =>
      selectedTypes.has(getInstitutionType(inst)) &&
      selectedRegions.has(inst.region as DisplayRegion),
  );

  const groupedByRegion = DISPLAY_REGIONS.map((region) => ({
    region,
    institutions: filtered.filter((inst) => inst.region === region),
  })).filter((g) => g.institutions.length > 0);

  // Placeholder status — will be replaced with real sekhem logic later
  function getPlaceholderStatus(inst: InstitutionRecord): 'accepted' | 'close' | 'rejected' {
    if (UNIVERSITY_IDS.has(inst.id)) {
      const uniOrder = ['tau', 'huji', 'technion', 'bgu', 'haifa', 'biu', 'ariel'];
      const idx = uniOrder.indexOf(inst.id);
      if (idx <= 1) return 'accepted';
      if (idx <= 4) return 'close';
      return 'rejected';
    }
    return 'accepted';
  }

  const STATUS_CONFIG = {
    accepted: { label: 'מתקבל/ת', bg: 'bg-[#34D399]' },
    close: { label: 'קרוב/ה לסף', bg: 'bg-[#FCD34D]' },
    rejected: { label: 'לא מתאפשרת קבלה', bg: 'bg-[#EF0000]' },
  } as const;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f4f0]">
      {/* Header */}
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

        {/* Filter: Institution type */}
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

        {/* Filter: Region */}
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">אזור</p>
            <button type="button" onClick={selectAllRegions} className="text-xs font-semibold text-[#4f46e5]">
              בחר/י הכל
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {DISPLAY_REGIONS.map((r) => (
              <FilterChip
                key={r}
                label={REGION_LABEL[r as GeographicRegion]}
                selected={selectedRegions.has(r)}
                onClick={() => toggleRegion(r)}
              />
            ))}
            {/* חו"ל chip — always unselected for now */}
            <span className="relative inline-flex cursor-default items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold text-slate-900">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white" />
              חו&quot;ל
            </span>
          </div>
        </div>

        {/* חו"ל tooltip */}
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

        {/* Institution groups */}
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
                {visible.map((inst) => {
                  const status = getPlaceholderStatus(inst);
                  const cfg = STATUS_CONFIG[status];
                  const logo = getLogoSrc(inst);
                  const instType = getInstitutionType(inst);

                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between rounded-[14px] border-2 border-black bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          {logo ? (
                            <img
                              src={logo}
                              alt=""
                              className="h-5 w-5 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                              <path d="M3 21h18M5 21V7l7-4 7 4v14" />
                              <path d="M9 21v-4h6v4" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{inst.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {instType === 'university' ? 'אוניברסיטה' : 'מכללה'}
                          </p>
                        </div>
                      </div>
                      <span className={`${cfg.bg} flex-shrink-0 rounded-full border-2 border-black px-3 py-1 text-[10px] font-extrabold text-black`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hiddenCount > 0 && !isExpanded && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(region)}
                  className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-slate-500"
                >
                  + {hiddenCount} מוסדות נוספים{' '}
                  <span className="font-semibold text-[#4f46e5]">הצג/י הכל</span>
                  <ChevronDown size={12} className="text-[#4f46e5]" />
                </button>
              )}

              {isExpanded && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(region)}
                  className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-slate-500"
                >
                  <span className="font-semibold text-[#4f46e5]">הסתר/י</span>
                  <ChevronDown size={12} className="rotate-180 text-[#4f46e5]" />
                </button>
              )}
            </div>
          );
        })}

        {groupedByRegion.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">לא נמצאו מוסדות עם הסינון הנוכחי</p>
          </div>
        )}
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
