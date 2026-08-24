'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Lock,
  MapPin,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import {
  SELECTABLE_STUDY_REGION_IDS,
  STUDY_REGIONS,
  type StudyLocationChoiceId,
  type StudyRegionDefinition,
  type StudyRegionId,
} from '@/data/studyRegions';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

interface StudyLocationStepProps {
  programs: CatalogueProgram[];
  savedProgramIds: string[];
  catalogueInstitutions: CatalogueInstitution[];
  onBack?: () => void;
  onDone: (selection: StudyLocationSelection) => void;
}

export interface StudyLocationSelection {
  allRegions: boolean;
  regionIds: StudyRegionId[];
}

type SvgPoint = {
  x: number;
  y: number;
};

type InstitutionKind = 'university' | 'college' | 'artDesign';
type InstitutionFilter = InstitutionKind | 'all';

interface StudyInstitution {
  id: string;
  label: string;
  sublabel: string;
  city: string;
  kind: InstitutionKind;
  point: SvgPoint;
  regionId: StudyRegionId;
}

interface MapRegionShape {
  sourceIds: string[];
  label: SvgPoint;
}

const MAP_SOURCE = '/maps/israel-regions.svg';
const MAP_VIEW = {
  x: 250,
  y: 15,
  width: 560,
  height: 960,
};

const regionDefinitions = STUDY_REGIONS.filter(
  (region): region is StudyRegionDefinition & { id: StudyRegionId } => region.id !== 'any',
);
const allRegionsOption = STUDY_REGIONS.find((region) => region.id === 'any')!;
const AllRegionsIcon = allRegionsOption.icon;

// Region geometry comes from Simplemaps' Israel admin SVG asset in public/maps.
const MAP_REGION_SHAPES: Record<StudyRegionId, MapRegionShape> = {
  north: {
    sourceIds: ['ILZ'],
    label: { x: 580.7, y: 174.1 },
  },
  haifa: {
    sourceIds: ['ILHA'],
    label: { x: 491.9, y: 204.2 },
  },
  center: {
    sourceIds: ['ILM', 'ILTA'],
    label: { x: 450.5, y: 389 },
  },
  jerusalem: {
    sourceIds: ['ILJM'],
    label: { x: 493.5, y: 434.3 },
  },
  south: {
    sourceIds: ['ILD'],
    label: { x: 457.1, y: 635.7 },
  },
};

// Context-only West Bank geometry, transformed from Simplemaps' Palestine admin SVG
// into the Israel admin SVG coordinate system so the map never reads as a broken silhouette.
const MAP_CONTEXT_SHAPES = [
  {
    id: 'west-bank',
    d: 'M577.1 496.2 L563.6 496 L552.2 501.6 L530.7 517.9 L519.1 521.2 L494.4 518.6 L482.6 519.1 L477.6 520.4 L472.1 520.7 L466.9 519.4 L462.5 515.5 L460.2 507.4 L463.1 499.7 L472 485.3 L473.1 477.7 L473.3 471 L474.1 464.7 L477.2 458.8 L477.7 458 L481.3 454 L498.2 444.6 L505 439.2 L509.1 435.9 L511.4 432.5 L516 431.9 L517 432.9 L519.5 433.5 L522 436.6 L527.1 436.4 L529.9 438.6 L530.8 437.7 L531.6 438.2 L532.3 439.4 L533.6 440.3 L534.5 440 L534.8 438 L535.8 437.2 L536.4 433.8 L537.6 432.8 L538.5 431.5 L537.9 429.4 L536.6 428 L536.5 426.2 L537.6 423 L538.5 421.7 L537.9 420.9 L537.7 419 L537.1 416.2 L538.1 414.7 L538.9 413 L538 412.3 L536.7 412.1 L536.3 411.6 L537.4 409.9 L536.7 409.2 L535.9 408.4 L534.9 408.1 L532.7 408.5 L531.5 406.6 L531.1 404.9 L531.3 402.5 L530.4 399.6 L528.4 398.8 L527.1 399.7 L527 401.2 L527.9 403.1 L528.6 405.6 L529.3 409 L529.3 412.7 L529.2 413.5 L528.7 413.8 L525.4 411.7 L524.1 411.5 L522.8 411.7 L522.5 412.9 L523.3 414.4 L523.3 415.7 L520.9 415.7 L513.6 413.4 L510.5 410.6 L508.8 410.6 L505.8 408.6 L504 404.4 L501.6 402.7 L499.3 402.4 L497.6 402.5 L495.5 403.5 L492 406.9 L489.1 407.4 L486.8 407.4 L482.7 406.3 L482.1 405.8 L482.3 404.8 L484.5 403.1 L486.2 401.3 L487.8 400.9 L492.5 401.1 L493.3 400.2 L494.2 389 L492.4 385.1 L489.8 384.3 L487.6 382.4 L487.3 381.1 L488.1 379.8 L486.8 378.5 L483.9 374 L486.1 371.5 L486.3 367.9 L485.9 363.8 L488 361.7 L483.4 344.8 L484 336.7 L482 330.3 L479.2 324.4 L478.3 321.2 L478.9 317.6 L486.6 311.1 L488.1 308.3 L488.8 305.3 L488.4 302.8 L487.1 300.8 L484.6 299.8 L485.2 296.7 L485.9 289.3 L486.7 286.3 L487.5 285.8 L490.1 285.1 L490.8 284.6 L492.3 279.8 L493.1 275.8 L495.4 263.6 L499.3 257 L504.5 253.7 L510.5 251.4 L516.6 248 L521.5 242.5 L524.3 240.7 L527.9 240.8 L528.2 241 L530.8 242.7 L536.5 248 L540.1 249.7 L552.5 250.3 L558.4 251.6 L564.3 255.9 L566 261.7 L565.9 269.1 L567 275.3 L572.2 277.3 L576.9 278 L581.5 279.6 L597.5 285.5 L598.1 287.4 L598.4 289.6 L597.2 289.4 L597.2 287.8 L595.7 287.7 L595.7 289.3 L596.8 291.7 L596.6 298.9 L598.4 302.6 L597.5 305.3 L597.4 309.9 L598.2 314.5 L599.8 317.5 L598.8 318 L598 318.5 L597.5 319.3 L597.2 320.6 L599.8 320.9 L597.2 331.9 L596.3 335.7 L597.2 338.6 L597.2 340.4 L595.5 341 L594.6 342 L594.6 343.3 L595.7 345 L592.4 350.5 L592.2 353.2 L594.3 356.4 L591 358.8 L589.9 362.9 L590.3 373.9 L592.4 379.7 L592.9 382.3 L593 385.6 L593.3 387.6 L594.5 390.3 L594.3 392.2 L593.4 393.2 L592.1 393.5 L590.8 394.1 L590.3 395.9 L595.1 415.5 L592.9 418.2 L592.9 420 L597.1 433.2 L590.8 439.8 L585.9 451.1 L581.4 461.2 L578.3 478.1 L577.2 495.6 L577.3 496 L577.3 496.2 L577.2 496.3 L577.1 496.2 Z',
  },
];

const MAP_SURFACE = {
  base: 'url(#mapBaseGradient)',
  inactive: 'url(#mapInactiveGradient)',
  selected: 'url(#mapSelectedGradient)',
  border: '#ffffff',
  selectedBorder: '#f3a1d7',
};

const INSTITUTION_KIND_LABELS: Record<InstitutionKind, string> = {
  university: 'אוניברסיטאות',
  college: 'מכללות',
  artDesign: 'אמנות ועיצוב',
};

const INSTITUTION_KIND_COLORS: Record<InstitutionKind, string> = {
  university: '#136fff',
  college: '#18bba0',
  artDesign: '#e85eb9',
};

const studyInstitutions: StudyInstitution[] = [
  {
    id: 'tel-hai',
    label: 'מכללת תל-חי',
    sublabel: 'קמפוס גלילי ליד קריית שמונה',
    city: 'תל חי',
    kind: 'college',
    point: { x: 610, y: 100 },
    regionId: 'north',
  },
  {
    id: 'zefat',
    label: 'המכללה האקדמית צפת',
    sublabel: 'גליל עליון',
    city: 'צפת',
    kind: 'college',
    point: { x: 545, y: 168 },
    regionId: 'north',
  },
  {
    id: 'haifa',
    label: 'אוניברסיטת חיפה',
    sublabel: 'כרמל',
    city: 'חיפה',
    kind: 'university',
    point: { x: 486, y: 205 },
    regionId: 'haifa',
  },
  {
    id: 'technion',
    label: 'הטכניון',
    sublabel: 'מכון טכנולוגי לישראל',
    city: 'חיפה',
    kind: 'university',
    point: { x: 502, y: 213 },
    regionId: 'haifa',
  },
  {
    id: 'wizod',
    label: 'המרכז האקדמי ויצו חיפה',
    sublabel: 'עיצוב וחינוך',
    city: 'חיפה',
    kind: 'artDesign',
    point: { x: 475, y: 224 },
    regionId: 'haifa',
  },
  {
    id: 'tau',
    label: 'אוניברסיטת תל אביב',
    sublabel: 'תל אביב',
    city: 'תל אביב',
    kind: 'university',
    point: { x: 445, y: 360 },
    regionId: 'center',
  },
  {
    id: 'biu',
    label: 'אוניברסיטת בר-אילן',
    sublabel: 'רמת גן',
    city: 'רמת גן',
    kind: 'university',
    point: { x: 462, y: 375 },
    regionId: 'center',
  },
  {
    id: 'hit',
    label: 'HIT מכון טכנולוגי חולון',
    sublabel: 'עיצוב, טכנולוגיה וניהול',
    city: 'חולון',
    kind: 'college',
    point: { x: 446, y: 392 },
    regionId: 'center',
  },
  {
    id: 'shenkar',
    label: 'שנקר',
    sublabel: 'הנדסה. עיצוב. אמנות',
    city: 'רמת גן',
    kind: 'artDesign',
    point: { x: 456, y: 365 },
    regionId: 'center',
  },
  {
    id: 'huji',
    label: 'האוניברסיטה העברית',
    sublabel: 'ירושלים',
    city: 'ירושלים',
    kind: 'university',
    point: { x: 498, y: 438 },
    regionId: 'jerusalem',
  },
  {
    id: 'bezalel',
    label: 'בצלאל',
    sublabel: 'אקדמיה לאמנות ועיצוב',
    city: 'ירושלים',
    kind: 'artDesign',
    point: { x: 485, y: 430 },
    regionId: 'jerusalem',
  },
  {
    id: 'azrieli',
    label: 'עזריאלי מכללה אקדמית להנדסה',
    sublabel: 'ירושלים',
    city: 'ירושלים',
    kind: 'college',
    point: { x: 508, y: 448 },
    regionId: 'jerusalem',
  },
  {
    id: 'bgu',
    label: 'אוניברסיטת בן גוריון',
    sublabel: 'באר שבע',
    city: 'באר שבע',
    kind: 'university',
    point: { x: 474, y: 552 },
    regionId: 'south',
  },
  {
    id: 'sapir',
    label: 'המכללה האקדמית ספיר',
    sublabel: 'שדרות והנגב המערבי',
    city: 'שדרות',
    kind: 'college',
    point: { x: 430, y: 500 },
    regionId: 'south',
  },
  {
    id: 'sapir-film',
    label: 'בית הספר לאמנויות הקול והמסך',
    sublabel: 'ספיר',
    city: 'שדרות',
    kind: 'artDesign',
    point: { x: 420, y: 510 },
    regionId: 'south',
  },
  {
    id: 'eilat',
    label: 'קמפוס אילת של בן-גוריון',
    sublabel: 'הנקודה הדרומית',
    city: 'אילת',
    kind: 'university',
    point: { x: 410, y: 848 },
    regionId: 'south',
  },
];

const progressSteps = [
  { id: 'what', label: 'מה', helper: 'כיוון לימודים', state: 'done' },
  { id: 'where', label: 'איפה', helper: 'אזורי לימוד', state: 'active' },
  { id: 'how', label: 'איך', helper: 'דרך קבלה', state: 'upcoming' },
  { id: 'institutions', label: 'מוסדות', helper: 'בחירה חכמה', state: 'upcoming' },
] as const;

function institutionsForRegion(regionId: StudyRegionId) {
  return studyInstitutions.filter((institution) => institution.regionId === regionId);
}

function filteredInstitutions(regionId: StudyRegionId, filter: InstitutionFilter) {
  const institutions = institutionsForRegion(regionId);
  return filter === 'all'
    ? institutions
    : institutions.filter((institution) => institution.kind === filter);
}

function countInstitutions(regionId: StudyRegionId, filter: InstitutionFilter) {
  return filteredInstitutions(regionId, filter).length;
}

export default function StudyLocationStep({
  programs,
  savedProgramIds,
  onBack,
  onDone,
}: StudyLocationStepProps) {
  const [selectedRegions, setSelectedRegions] = useState<StudyRegionId[]>([]);
  const [allRegionsSelected, setAllRegionsSelected] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<StudyRegionId[]>(['south']);
  const [institutionFilters, setInstitutionFilters] = useState<Record<StudyRegionId, InstitutionFilter>>({
    center: 'all',
    haifa: 'all',
    jerusalem: 'all',
    north: 'all',
    south: 'all',
  });
  const shouldReduceMotion = useReducedMotion();

  const savedProgramNames = useMemo(() => {
    const names = programs
      .filter((program) => savedProgramIds.includes(program.id))
      .map((program) => program.name);
    return Array.from(new Set(names)).slice(0, 3);
  }, [programs, savedProgramIds]);

  const activeRegionIds = allRegionsSelected ? SELECTABLE_STUDY_REGION_IDS : selectedRegions;
  const hasSelection = allRegionsSelected || selectedRegions.length > 0;
  const activeRegionNames = allRegionsSelected
    ? [allRegionsOption.shortName]
    : regionDefinitions
        .filter((region) => selectedRegions.includes(region.id))
        .map((region) => region.name);

  function toggleRegion(id: StudyLocationChoiceId) {
    if (id === 'any') {
      setSelectedRegions([]);
      setAllRegionsSelected((current) => !current);
      return;
    }

    setAllRegionsSelected(false);
    setExpandedRegions((current) => (current.includes(id) ? current : [...current, id]));
    setSelectedRegions((current) =>
      current.includes(id) ? current.filter((regionId) => regionId !== id) : [...current, id],
    );
  }

  function expandRegion(id: StudyRegionId) {
    setExpandedRegions((current) =>
      current.includes(id) ? current.filter((regionId) => regionId !== id) : [...current, id],
    );
  }

  function setRegionFilter(id: StudyRegionId, filter: InstitutionFilter) {
    setInstitutionFilters((current) => ({ ...current, [id]: filter }));
  }

  function focusInstitution(institution: StudyInstitution) {
    setAllRegionsSelected(false);
    setSelectedRegions((current) =>
      current.includes(institution.regionId) ? current : [...current, institution.regionId],
    );
    setExpandedRegions((current) =>
      current.includes(institution.regionId) ? current : [...current, institution.regionId],
    );
  }

  function removeRegion(id: StudyRegionId) {
    setSelectedRegions((current) => current.filter((regionId) => regionId !== id));
  }

  function handleContinue() {
    if (!hasSelection) return;
    onDone({ allRegions: allRegionsSelected, regionIds: selectedRegions });
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-10 pt-5 sm:px-6 lg:px-8" dir="rtl">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(142,205,255,0.34),transparent_31%),radial-gradient(circle_at_84%_74%,rgba(236,116,187,0.16),transparent_26%),linear-gradient(180deg,#fbfdff_0%,#f7faff_42%,#f2f7ff_100%)]" />
      <div className="pointer-events-none fixed left-0 top-0 h-full w-[54vw] bg-[linear-gradient(90deg,rgba(184,219,255,0.48),rgba(255,255,255,0.04))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[1440px] flex-col">
        <div
          className="absolute right-2 top-2 hidden items-center gap-2 text-2xl font-extrabold tracking-normal text-[#071638] md:flex"
          dir="ltr"
        >
          <span className="inline-flex h-7 w-10 rounded-[0.6rem] bg-gradient-to-br from-[#1682ff] via-[#7458e9] to-[#f06fbd] shadow-[0_10px_24px_rgba(91,101,235,0.2)]" />
          Way
        </div>
        <ProgressStepper onBack={onBack} />

        <main className="grid flex-1 items-stretch gap-6 py-7 lg:grid-cols-[minmax(0,1.06fr)_minmax(420px,0.94fr)] lg:py-9">
          <IsraelRegionMap
            activeRegionIds={activeRegionIds}
            allRegionsSelected={allRegionsSelected}
            shouldReduceMotion={shouldReduceMotion}
            onToggleRegion={toggleRegion}
          />

          <section className="flex min-w-0 flex-col justify-center px-1 lg:px-6">
            <div className="mx-auto w-full max-w-[540px]">
              <header className="text-right">
                <h1 className="text-[2.25rem] font-bold leading-tight text-[#071638] sm:text-[3.15rem]">
                  איפה היית רוצה ללמוד?
                </h1>
                <p className="mt-4 max-w-xl text-base font-medium leading-8 text-[#6f7a99]">
                  בחר/י אזור אחד או יותר ונציג לך מוסדות רלוונטיים מתוך הבחירות שלך.
                </p>

                {savedProgramNames.length > 0 ? (
                  <div className="mt-6 flex flex-wrap justify-start gap-2.5">
                    {savedProgramNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-[#e5ebf6] bg-white/78 px-4 text-xs font-bold text-[#647091] shadow-[0_10px_30px_rgba(73,94,145,0.08)] backdrop-blur-xl"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#7d63ee]" />
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>

              <div className="mt-8 overflow-hidden rounded-[1.15rem] border border-[#dde6f4] bg-white/72 shadow-[0_24px_70px_rgba(73,94,145,0.13)] backdrop-blur-2xl">
                <div className="divide-y divide-[#e3ebf6]">
                  {regionDefinitions.map((region) => (
                    <RegionRow
                      key={region.id}
                      region={region}
                      selected={selectedRegions.includes(region.id)}
                      disabledByAll={allRegionsSelected}
                      expanded={expandedRegions.includes(region.id)}
                      institutionFilter={institutionFilters[region.id]}
                      institutions={filteredInstitutions(region.id, institutionFilters[region.id])}
                      totalInstitutionCount={institutionsForRegion(region.id).length}
                      onExpand={() => expandRegion(region.id)}
                      onFilterChange={(filter) => setRegionFilter(region.id, filter)}
                      onFocusInstitution={focusInstitution}
                      onToggle={() => toggleRegion(region.id)}
                    />
                  ))}
                  <AllRegionsRow selected={allRegionsSelected} onToggle={() => toggleRegion('any')} />
                </div>
              </div>

              <SelectedSummary
                allRegionsSelected={allRegionsSelected}
                regionNames={activeRegionNames}
                selectedRegions={selectedRegions}
                onRemoveRegion={removeRegion}
                onClearAll={() => {
                  setAllRegionsSelected(false);
                  setSelectedRegions([]);
                }}
              />

              <button
                type="button"
                onClick={handleContinue}
                disabled={!hasSelection}
                className={[
                  'mt-8 inline-flex h-16 w-full items-center justify-center gap-3 rounded-[1rem] px-7 text-base font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d63ee] focus-visible:ring-offset-2',
                  hasSelection
                    ? 'bg-gradient-to-l from-[#1b75ff] via-[#6a57f4] to-[#de5ac4] text-white shadow-[0_22px_52px_rgba(91,101,235,0.3)] hover:-translate-y-0.5'
                    : 'cursor-not-allowed border border-[#dfe7f3] bg-white/64 text-[#98a4bb]',
                ].join(' ')}
              >
                המשך לבחירת מוסדות
                <ArrowLeft size={19} />
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-[#8c97af]">
                <Lock size={15} />
                המידע שלך נשמר באופן פרטי ומוצג רק לך.
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ProgressStepper({ onBack }: { onBack?: () => void }) {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl items-center gap-5 rounded-[1.65rem] border border-white/80 bg-white/76 px-4 py-3 shadow-[0_18px_58px_rgba(73,94,145,0.12)] backdrop-blur-2xl"
      dir="ltr"
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[1rem] border border-[#e1e8f4] bg-white/74 px-5 text-sm font-bold text-[#7b86a0] transition hover:border-[#cdd9ef] hover:bg-white"
        >
          <ArrowRight size={17} />
          חזרה
        </button>
      ) : null}

      <ol className="grid min-w-0 flex-1 grid-cols-4 items-center gap-1 text-center" dir="rtl">
        {progressSteps.map((step, index) => (
          <li key={step.id} className="relative flex min-w-0 items-center justify-center">
            {index > 0 ? (
              <span
                className={[
                  'absolute right-[calc(-50%+1.45rem)] top-5 hidden h-px w-[calc(100%-2.9rem)] sm:block',
                  step.state === 'done' || step.state === 'active'
                    ? 'bg-[#8fd8ff]'
                    : 'bg-[#dfe7f4]',
                ].join(' ')}
              />
            ) : null}
            <span className="relative z-10 flex min-w-0 flex-col items-center gap-1">
              <span
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  step.state === 'done'
                    ? 'bg-[#17c6a3] text-white'
                    : step.state === 'active'
                      ? 'bg-[#7458e9] text-white shadow-[0_12px_28px_rgba(116,88,233,0.3)]'
                      : 'bg-[#eef3fb] text-[#7c86a2]',
                ].join(' ')}
              >
                {step.state === 'done' ? <Check size={18} /> : index + 1}
              </span>
              <span
                className={[
                  'truncate text-xs font-bold',
                  step.state === 'active' ? 'text-[#7458e9]' : 'text-[#7a86a6]',
                ].join(' ')}
              >
                {step.label}
              </span>
              <span className="hidden truncate text-[10px] font-bold text-[#a0aac0] sm:block">
                {step.helper}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RegionRow({
  region,
  selected,
  disabledByAll,
  expanded,
  institutionFilter,
  institutions,
  totalInstitutionCount,
  onExpand,
  onFilterChange,
  onFocusInstitution,
  onToggle,
}: {
  region: StudyRegionDefinition & { id: StudyRegionId };
  selected: boolean;
  disabledByAll: boolean;
  expanded: boolean;
  institutionFilter: InstitutionFilter;
  institutions: StudyInstitution[];
  totalInstitutionCount: number;
  onExpand: () => void;
  onFilterChange: (filter: InstitutionFilter) => void;
  onFocusInstitution: (institution: StudyInstitution) => void;
  onToggle: () => void;
}) {
  const Icon = region.icon;

  return (
    <div
      className={[
        'transition',
        selected ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.88),rgba(240,246,255,0.94))]' : 'bg-white/44',
        disabledByAll ? 'opacity-55' : '',
      ].join(' ')}
    >
      <div className="flex min-h-[72px] w-full items-center gap-3 px-5 text-right">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onToggle}
          className="group flex min-w-0 flex-1 items-center gap-4 rounded-xl text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7458e9]"
        >
          <span
            className={[
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.45rem] border transition',
              selected
                ? 'border-[#1b75ff] bg-[#1b75ff] text-white shadow-[0_8px_18px_rgba(27,117,255,0.22)]'
                : 'border-[#aab6ca] bg-white/70 text-transparent group-hover:border-[#7d63ee]',
            ].join(' ')}
          >
            <Check size={15} strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold text-[#071638]">{region.name}</span>
            <span className="sr-only">{region.description}</span>
            <span className="mt-1 hidden text-xs font-bold text-[#8792aa] sm:block">
              {totalInstitutionCount} מוסדות באזור
            </span>
          </span>
          <span
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
              selected ? 'text-[#1b75ff]' : 'text-[#071638]',
            ].join(' ')}
          >
            <Icon size={24} strokeWidth={1.8} />
          </span>
        </button>

        <button
          type="button"
          onClick={onExpand}
          aria-label={`${expanded ? 'סגור' : 'פתח'} מוסדות באזור ${region.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dde6f4] bg-white/70 text-[#72809d] transition hover:bg-white hover:text-[#071638] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7458e9]"
        >
          <ChevronDown
            size={18}
            className={['transition-transform', expanded ? 'rotate-180' : ''].join(' ')}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#e3ebf6] px-5 pb-5 pt-4">
              <div className="flex flex-wrap gap-2">
                {(['all', 'university', 'college', 'artDesign'] as InstitutionFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => onFilterChange(filter)}
                    className={[
                      'inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition',
                      institutionFilter === filter
                        ? 'bg-[#071638] text-white shadow-[0_10px_22px_rgba(7,22,56,0.18)]'
                        : 'border border-[#e2e9f5] bg-white/70 text-[#6f7a99] hover:bg-white',
                    ].join(' ')}
                  >
                    {filter === 'all' ? 'הכל' : INSTITUTION_KIND_LABELS[filter]}
                    <span className="mr-1 opacity-70">({countInstitutions(region.id, filter)})</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                {institutions.map((institution) => (
                  <button
                    key={institution.id}
                    type="button"
                    onClick={() => onFocusInstitution(institution)}
                    className="flex items-center gap-3 rounded-xl border border-[#e3ebf6] bg-white/72 px-3 py-2 text-right transition hover:-translate-y-0.5 hover:border-[#cfdcf2] hover:bg-white hover:shadow-[0_12px_26px_rgba(73,94,145,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7458e9]"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(73,94,145,0.16)]"
                      style={{ backgroundColor: INSTITUTION_KIND_COLORS[institution.kind] }}
                    >
                      <MapPin size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-[#071638]">
                        {institution.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-bold text-[#7f8aa4]">
                        {institution.city} · {INSTITUTION_KIND_LABELS[institution.kind]}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AllRegionsRow({ selected, onToggle }: { selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={[
        'group flex min-h-[72px] w-full items-center gap-4 px-5 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ef83bb]',
        selected
          ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.82),rgba(255,240,247,0.9))]'
          : 'bg-white/44 hover:bg-white/76',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.45rem] border transition',
          selected
            ? 'border-[#de5ac4] bg-[#de5ac4] text-white shadow-[0_8px_18px_rgba(222,90,196,0.2)]'
            : 'border-[#aab6ca] bg-white/70 text-transparent group-hover:border-[#de5ac4]',
        ].join(' ')}
      >
        <Check size={15} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-[#071638]">{allRegionsOption.name}</span>
        <span className="sr-only">{allRegionsOption.description}</span>
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#071638]">
        <AllRegionsIcon size={24} strokeWidth={1.8} />
      </span>
    </button>
  );
}

function SelectedSummary({
  allRegionsSelected,
  regionNames,
  selectedRegions,
  onRemoveRegion,
  onClearAll,
}: {
  allRegionsSelected: boolean;
  regionNames: string[];
  selectedRegions: StudyRegionId[];
  onRemoveRegion: (id: StudyRegionId) => void;
  onClearAll: () => void;
}) {
  const hasSelection = allRegionsSelected || regionNames.length > 0;

  return (
    <div className="mt-6 rounded-[1rem] border border-[#e2e9f5] bg-white/56 px-4 py-3 shadow-[0_14px_38px_rgba(73,94,145,0.08)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="text-[#8792aa]">אזורי לימוד נבחרים:</span>
        {hasSelection ? (
          regionNames.map((name) => {
            const region = regionDefinitions.find((item) => item.name === name);
            return (
              <span
                key={name}
                className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-xs text-[#6574dc] ring-1 ring-[#e2e9f5]"
              >
                {name}
                <button
                  type="button"
                  onClick={() => (allRegionsSelected ? onClearAll() : region && onRemoveRegion(region.id))}
                  aria-label={`הסר ${name}`}
                  className="rounded-full p-0.5 text-[#7d88a4] transition hover:bg-[#eef4ff] hover:text-[#071638]"
                >
                  <X size={13} />
                </button>
              </span>
            );
          })
        ) : (
          <span className="text-[#a0aac0]">עדיין לא בחרת אזור</span>
        )}
      </div>
    </div>
  );
}

function IsraelRegionMap({
  activeRegionIds,
  allRegionsSelected,
  shouldReduceMotion,
  onToggleRegion,
}: {
  activeRegionIds: StudyRegionId[];
  allRegionsSelected: boolean;
  shouldReduceMotion: boolean | null;
  onToggleRegion: (id: StudyLocationChoiceId) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const activeSet = new Set(activeRegionIds);

  function zoomIn() {
    setZoom((current) => Math.min(2.05, Number((current + 0.35).toFixed(2))));
  }

  function zoomOut() {
    setZoom((current) => Math.max(1, Number((current - 0.35).toFixed(2))));
  }

  return (
    <section className="relative order-2 min-h-[620px] overflow-hidden rounded-[1.7rem] border border-white/40 bg-[linear-gradient(90deg,rgba(208,231,255,0.62),rgba(255,255,255,0.36))] shadow-[0_30px_80px_rgba(73,94,145,0.12)] lg:order-1 lg:min-h-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_18%,rgba(125,99,238,0.12),transparent_28%),linear-gradient(90deg,rgba(184,219,255,0.7),rgba(255,255,255,0.2)_58%,rgba(255,246,236,0.42))]" />
      <div className="absolute left-5 bottom-9 z-20 overflow-hidden rounded-[0.8rem] border border-[#dce6f4] bg-white/82 shadow-[0_16px_38px_rgba(73,94,145,0.13)] backdrop-blur-xl">
        <button
          type="button"
          aria-label="הגדל מפה"
          onClick={zoomIn}
          className="flex h-10 w-10 items-center justify-center text-[#071638] transition hover:bg-[#f3f7ff]"
        >
          <Plus size={18} />
        </button>
        <div className="h-px bg-[#e3ebf6]" />
        <button
          type="button"
          aria-label="הקטן מפה"
          onClick={zoomOut}
          className="flex h-10 w-10 items-center justify-center text-[#071638] transition hover:bg-[#f3f7ff]"
        >
          <Minus size={18} />
        </button>
      </div>

      <div className="relative z-10 mx-auto min-h-[620px] w-full max-w-[760px] px-4 py-7 sm:px-8 lg:h-[calc(100vh-13rem)] lg:max-h-[760px] lg:min-h-[620px]">
        <div className="relative mx-auto h-full min-h-[580px] max-w-[560px] overflow-hidden rounded-[1.45rem] lg:max-w-[640px]">
          <motion.div
            className="absolute inset-0"
            animate={{ scale: zoom }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: 'easeOut' }}
            style={{ transformOrigin: '50% 50%' }}
          >
            <svg
              viewBox={`${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.width} ${MAP_VIEW.height}`}
              role="img"
              aria-label="מפת ישראל לבחירת אזורי לימודים"
              className="absolute inset-x-0 top-[46%] mx-auto h-[520px] w-full max-w-[430px] -translate-y-1/2 overflow-visible drop-shadow-[0_28px_46px_rgba(73,94,145,0.14)] lg:top-1/2 lg:h-[580px] lg:max-w-[470px]"
            >
              <defs>
                <linearGradient id="mapBaseGradient" x1="355" x2="650" y1="84" y2="858" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#8a72ff" />
                  <stop offset="0.52" stopColor="#7168f6" />
                  <stop offset="1" stopColor="#5f7cff" />
                </linearGradient>
                <linearGradient id="mapInactiveGradient" x1="355" x2="650" y1="84" y2="858" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#d9e4ff" />
                  <stop offset="0.56" stopColor="#cdd9ff" />
                  <stop offset="1" stopColor="#dce8ff" />
                </linearGradient>
                <linearGradient id="mapSelectedGradient" x1="360" x2="640" y1="86" y2="844" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#9b6cff" />
                  <stop offset="0.5" stopColor="#7067f4" />
                  <stop offset="1" stopColor="#2f7fff" />
                </linearGradient>
                <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#405885" floodOpacity="0.12" />
                </filter>
                <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#e970cf" floodOpacity="0.34" />
                  <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#287cff" floodOpacity="0.16" />
                </filter>
              </defs>

              <g aria-hidden="true" className="pointer-events-none" filter="url(#mapShadow)">
                {MAP_CONTEXT_SHAPES.map((shape) => (
                  <path
                    key={shape.id}
                    d={shape.d}
                    fill={MAP_SURFACE.base}
                    stroke={MAP_SURFACE.base}
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                ))}
                {regionDefinitions.map((region) =>
                  MAP_REGION_SHAPES[region.id].sourceIds.map((sourceId) => (
                    <use
                      key={`${region.id}-${sourceId}`}
                      href={`${MAP_SOURCE}#${sourceId}`}
                      fill={MAP_SURFACE.base}
                      stroke={MAP_SURFACE.base}
                      strokeWidth="3.5"
                      strokeLinejoin="round"
                    />
                  )),
                )}
              </g>

              <g>
                {regionDefinitions.map((region) => {
                  const selected = activeSet.has(region.id);
                  const highlighted = selected || allRegionsSelected;
                  const shape = MAP_REGION_SHAPES[region.id];

                  return (
                    <motion.g
                      key={region.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`בחר אזור ${region.name}`}
                      onClick={() => onToggleRegion(region.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onToggleRegion(region.id);
                        }
                      }}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: 'easeOut' }}
                      className="cursor-pointer outline-none transition hover:opacity-100"
                    >
                      {shape.sourceIds.map((sourceId) => (
                        <use
                          key={sourceId}
                          href={`${MAP_SOURCE}#${sourceId}`}
                          fill="transparent"
                          stroke="transparent"
                          pointerEvents="all"
                        />
                      ))}
                    </motion.g>
                  );
                })}
              </g>
            </svg>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
