'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronLeft,
  Cpu, Zap, Settings, Building2, Activity, Microscope,
  PieChart, Brain, Stethoscope, Scale, Briefcase, TrendingUp,
  Heart, Shield, Film,
  UtensilsCrossed, Compass, Palette, Camera, Scissors, Sparkles, Leaf, FlaskConical,
} from 'lucide-react';
import { RecommendedField, RiasecScores, EnvironmentPreference, RiasecDimension } from '@/types';
import { allPrograms } from '@/data/degrees';
import type { Program } from '@/data/degrees/types';
import { PROGRAM_FIELD_MAP, FIELD_ENRICHMENT } from '@/data/degrees/fieldEnrichment';
import { getTopDimensions, DIMENSION_LABELS } from '@/utils/riasecEngine';

interface Props {
  recommendations: RecommendedField[];
  onSelectDegree: (degreeId: string) => void;
  riasecScores: RiasecScores;
  environment: EnvironmentPreference;
}

const DEMAND_COLOR: Record<RecommendedField['marketDemand'], string> = {
  'גבוה מאוד': 'bg-green-100 text-green-800',
  'גבוה':      'bg-blue-100 text-blue-800',
  'בינוני':    'bg-yellow-100 text-yellow-800',
};
const RESILIENCE_COLOR: Record<RecommendedField['aiResilience'], string> = {
  'גבוהה':   'bg-green-100 text-green-800',
  'בינונית': 'bg-yellow-100 text-yellow-800',
  'נמוכה':   'bg-red-100 text-red-800',
};

interface FieldIconMeta { icon: LucideIcon; color: string; accent: string }
const FIELD_ICON: Record<string, FieldIconMeta> = {
  // ── Academic ──────────────────────────────────────────────────────────────
  cs:               { icon: Cpu,             color: 'bg-blue-50 text-blue-600',       accent: 'border-r-blue-400'      },
  datascience:      { icon: PieChart,        color: 'bg-indigo-50 text-indigo-600',   accent: 'border-r-indigo-400'    },
  ee:               { icon: Zap,             color: 'bg-yellow-50 text-yellow-600',   accent: 'border-r-yellow-400'    },
  me:               { icon: Settings,        color: 'bg-orange-50 text-orange-600',   accent: 'border-r-orange-400'    },
  civilEng:         { icon: Building2,       color: 'bg-stone-50 text-stone-600',     accent: 'border-r-stone-400'     },
  industrialEng:    { icon: Activity,        color: 'bg-teal-50 text-teal-600',       accent: 'border-r-teal-400'      },
  biomedical:       { icon: Microscope,      color: 'bg-pink-50 text-pink-600',       accent: 'border-r-pink-400'      },
  psychology:       { icon: Brain,           color: 'bg-purple-50 text-purple-600',   accent: 'border-r-purple-400'    },
  medicine:         { icon: Stethoscope,     color: 'bg-red-50 text-red-600',         accent: 'border-r-red-400'       },
  law:              { icon: Scale,           color: 'bg-amber-50 text-amber-600',     accent: 'border-r-amber-400'     },
  business:         { icon: Briefcase,       color: 'bg-emerald-50 text-emerald-600', accent: 'border-r-emerald-400'   },
  economics:        { icon: TrendingUp,      color: 'bg-green-50 text-green-600',     accent: 'border-r-green-400'     },
  biology:          { icon: Microscope,      color: 'bg-lime-50 text-lime-600',       accent: 'border-r-lime-400'      },
  socialWork:       { icon: Heart,           color: 'bg-rose-50 text-rose-600',       accent: 'border-r-rose-400'      },
  nursing:          { icon: Shield,          color: 'bg-red-50 text-red-500',         accent: 'border-r-red-300'       },
  // ── Tech bootcamps ────────────────────────────────────────────────────────
  fullstack:        { icon: Cpu,             color: 'bg-blue-50 text-blue-600',       accent: 'border-r-blue-400'      },
  cyber:            { icon: Shield,          color: 'bg-slate-50 text-slate-600',     accent: 'border-r-slate-400'     },
  dataAnalysis:     { icon: PieChart,        color: 'bg-indigo-50 text-indigo-600',   accent: 'border-r-indigo-400'    },
  cloudDevOps:      { icon: Activity,        color: 'bg-teal-50 text-teal-600',       accent: 'border-r-teal-400'      },
  // ── Arts & design ─────────────────────────────────────────────────────────
  industrialDesign: { icon: Compass,         color: 'bg-blue-50 text-blue-600',       accent: 'border-r-blue-400'      },
  fineArts:         { icon: Palette,         color: 'bg-purple-50 text-purple-600',   accent: 'border-r-purple-400'    },
  photography:      { icon: Camera,          color: 'bg-slate-50 text-slate-600',     accent: 'border-r-slate-400'     },
  fashion:          { icon: Scissors,        color: 'bg-pink-50 text-pink-600',       accent: 'border-r-pink-400'      },
  graphicDesign:    { icon: Palette,         color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  animation:        { icon: Sparkles,        color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  dance:            { icon: Sparkles,        color: 'bg-rose-50 text-rose-600',       accent: 'border-r-rose-400'      },
  cinema:           { icon: Film,            color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  screenwriting:    { icon: Film,            color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  documentary:      { icon: Film,            color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  // ── Culinary ──────────────────────────────────────────────────────────────
  chef:             { icon: UtensilsCrossed, color: 'bg-amber-50 text-amber-600',     accent: 'border-r-amber-400'     },
  pastry:           { icon: UtensilsCrossed, color: 'bg-amber-50 text-amber-600',     accent: 'border-r-amber-400'     },
  restaurantMgmt:   { icon: UtensilsCrossed, color: 'bg-amber-50 text-amber-600',     accent: 'border-r-amber-400'     },
  // ── Integrative medicine ──────────────────────────────────────────────────
  chineseMedicine:  { icon: Leaf,            color: 'bg-emerald-50 text-emerald-600', accent: 'border-r-emerald-400'   },
  naturopathy:      { icon: Leaf,            color: 'bg-green-50 text-green-600',     accent: 'border-r-green-400'     },
  homeopathy:       { icon: FlaskConical,    color: 'bg-teal-50 text-teal-600',       accent: 'border-r-teal-400'      },
  reflexology:      { icon: Heart,           color: 'bg-rose-50 text-rose-600',       accent: 'border-r-rose-400'      },
  psychotherapy:    { icon: Brain,           color: 'bg-purple-50 text-purple-600',   accent: 'border-r-purple-400'    },
};

// ── Sheba-style program sub-card ──────────────────────────────────────────────

interface SubCardProps {
  program: Program;
  fieldId: string;
  onSelect: () => void;
}

function ProgramSubCard({ program, fieldId, onSelect }: SubCardProps) {
  const meta  = FIELD_ICON[fieldId];
  const Icon  = meta?.icon;
  const badge = meta?.color ?? 'bg-slate-50 text-slate-500';
  const accent = meta?.accent ?? 'border-r-slate-300';

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-right shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.98] cursor-pointer border-r-[3px] ${accent}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-xl p-2.5 ${badge}`}>
        {Icon && <Icon className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{program.name}</p>
        <p className="mt-1 text-xs text-slate-400">{program.institution}</p>
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
}

// ── Tabbed field sub-navigation ───────────────────────────────────────────────

interface SubTabPanelProps {
  suggestedPrograms: Program[];
  onSelectProgram: (id: string) => void;
}

function SubTabPanel({ suggestedPrograms, onSelectProgram }: SubTabPanelProps) {
  const tabs = suggestedPrograms.map((p) => {
    const fieldId = PROGRAM_FIELD_MAP[p.id] ?? p.id;
    return {
      fieldId,
      label: FIELD_ENRICHMENT[fieldId]?.name ?? p.name,
    };
  });

  const [activeFieldId, setActiveFieldId] = useState(tabs[0]?.fieldId ?? '');

  const fieldProgramIds = FIELD_ENRICHMENT[activeFieldId]?.programIds ?? [];
  const seenIds = new Set<string>();
  const tabPrograms = allPrograms
    .filter((p) => {
      if (!fieldProgramIds.includes(p.id) || p.institution === 'אוניברסיטה') return false;
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    })
    .sort((a, b) => (a.admissionType === 'sekhem' ? 0 : 1) - (b.admissionType === 'sekhem' ? 0 : 1))
    .slice(0, 6);

  if (tabs.length === 0) return null;

  return (
    <div>
      {/* Tab bar — LTR scroll container so tabs flow left→right */}
      <div className="overflow-x-auto" dir="ltr">
        <div className="flex min-w-max border-b border-slate-200">
          {tabs.map((tab) => {
            const TabIcon = FIELD_ICON[tab.fieldId]?.icon;
            return (
              <button
                key={tab.fieldId}
                onClick={() => setActiveFieldId(tab.fieldId)}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeFieldId === tab.fieldId
                    ? 'text-gray-900'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {TabIcon && <TabIcon className="h-4 w-4 shrink-0" />}
                <span>{tab.label}</span>
                {activeFieldId === tab.fieldId && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-purple-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Program cards under active tab */}
      {tabPrograms.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {tabPrograms.map((p) => (
            <ProgramSubCard
              key={p.id}
              program={p}
              fieldId={activeFieldId}
              onSelect={() => onSelectProgram(p.id)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">אין מסלולים זמינים לתחום זה כרגע.</p>
      )}
    </div>
  );
}

// ── Level 2: Program Detail View ─────────────────────────────────────────────

interface DetailProps {
  program: Program;
  onBack: () => void;
  onSelectDegree: (id: string) => void;
}

function ProgramDetailView({ program, onBack, onSelectDegree }: DetailProps) {
  const fieldId    = PROGRAM_FIELD_MAP[program.id];
  const enrichment = fieldId ? FIELD_ENRICHMENT[fieldId] : null;
  const FieldIcon  = fieldId ? FIELD_ICON[fieldId]?.icon : undefined;
  const iconBadge  = fieldId ? (FIELD_ICON[fieldId]?.color ?? 'bg-slate-50 text-slate-500') : 'bg-slate-50 text-slate-500';

  // All institution programs for "where to study", deduped by ID
  const relatedProgramIds = enrichment?.programIds ?? [program.id];
  const seenIds = new Set<string>();
  const institutionPrograms = allPrograms
    .filter((p) => {
      if (!relatedProgramIds.includes(p.id) || p.institution === 'אוניברסיטה') return false;
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    })
    .sort((a, b) => (a.admissionType === 'sekhem' ? 0 : 1) - (b.admissionType === 'sekhem' ? 0 : 1));

  const sekhemInstitutions = institutionPrograms.filter((p) => p.admissionType === 'sekhem');
  const reqInstitutions    = institutionPrograms.filter((p) => p.admissionType === 'requirements');

  return (
    <div className="flex flex-col gap-5">
      {/* Back nav */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
      >
        → חזרה לתוצאות
      </button>

      {/* Hero card */}
      <section className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm sm:p-10">
        <div className="mb-5 flex items-center gap-4">
          <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconBadge}`}>
            {FieldIcon ? <FieldIcon className="h-8 w-8" /> : null}
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {enrichment?.name ?? program.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{program.category}</p>
          </div>
        </div>

        {enrichment ? (
          <div className="flex flex-col gap-6">
            {/* About */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                על המקצוע
              </p>
              <p className="text-sm leading-relaxed text-slate-700">{enrichment.aboutText}</p>
            </div>

            {/* Market & Jobs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  מצב שוק העבודה
                </p>
                <p className="text-sm leading-relaxed text-slate-700">{enrichment.marketStatus}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  תפקידים בסוף הדרך
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {enrichment.endGoalJobs.map((job) => (
                    <li
                      key={job}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-100"
                    >
                      {job}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Advanced degrees */}
            {enrichment.advancedDegreesSteps && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                  מסלול תואר מתקדם
                </p>
                <p className="text-sm leading-relaxed text-indigo-800">
                  {enrichment.advancedDegreesSteps}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">מידע מפורט על תחום זה יתווסף בקרוב.</p>
        )}
      </section>

      {/* Where to Study */}
      {institutionPrograms.length > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm sm:p-10">
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-400">
            איפה ללמוד
          </p>

          {/* Sekhem-track universities */}
          {sekhemInstitutions.length > 0 && (
            <div className="mb-5 flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-500">אוניברסיטאות — חישוב סכ"ם</p>
              {sekhemInstitutions.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.institution}</p>
                    <p className="text-xs text-slate-500">{p.name}</p>
                  </div>
                  <button
                    onClick={() => { onSelectDegree(p.id); onBack(); }}
                    className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-700 active:scale-95"
                  >
                    חשב סיכויי קבלה ←
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Requirements-track institutions */}
          {reqInstitutions.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-500">
                מכללות ובתי ספר — קבלה על פי דרישות
              </p>
              {reqInstitutions.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-slate-800">{p.institution}</p>
                    {p.type === 'academic' && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        מוסד אקדמי
                      </span>
                    )}
                  </div>
                  {p.admissionRequirements.length > 0 && (
                    <ul className="space-y-0.5">
                      {p.admissionRequirements.map((req, i) => (
                        <li key={i} className="text-xs text-slate-600">
                          • {req}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── Level 1: Category Overview ────────────────────────────────────────────────

export default function RecommendationResults({
  recommendations,
  onSelectDegree,
  riasecScores,
  environment,
}: Props) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const [primary, secondary] = getTopDimensions(riasecScores);
  const profileLabel = `${DIMENSION_LABELS[primary].name}-${DIMENSION_LABELS[secondary].name}`;
  const dimensionsSorted = (Object.entries(riasecScores) as [RiasecDimension, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  // Level 2 — show program detail
  if (selectedProgramId !== null) {
    const program = allPrograms.find((p) => p.id === selectedProgramId);
    if (program) {
      return (
        <div className="flex flex-col gap-6">
          <ProgramDetailView
            program={program}
            onBack={() => setSelectedProgramId(null)}
            onSelectDegree={onSelectDegree}
          />
        </div>
      );
    }
  }

  // Level 1 — category overview
  return (
    <div className="flex flex-col gap-6">
      {/* Profile card */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          הפרופיל התעסוקתי שלך
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">{profileLabel}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {DIMENSION_LABELS[primary].trait} עם נטייה {DIMENSION_LABELS[secondary].trait}
        </p>

        {dimensionsSorted.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {dimensionsSorted.map(([dim, score]) => (
              <span
                key={dim}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${DIMENSION_LABELS[dim].color}`}
              >
                {DIMENSION_LABELS[dim].name} · {score}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Category cards */}
      <div className="flex flex-col gap-5">
        {recommendations.map((rec, i) => {
          // Unique programs by ID (guard against any upstream duplicate IDs)
          const seen = new Set<string>();
          const suggestedPrograms = allPrograms.filter((p) => {
            if (!rec.suggestedDegreeIds.includes(p.id) || seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });

          return (
            <section
              key={rec.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
            >
              {/* Header */}
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{rec.name}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">{rec.description}</p>
                </div>
              </div>

              {/* Warning */}
              {rec.hasWarning && rec.warningText && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  ⚠️ {rec.warningText}
                </div>
              )}

              {/* Why it fits */}
              <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  מדוע זה מתאים לך
                </p>
                <p className="text-sm text-gray-700">{rec.matchReason}</p>
              </div>

              {/* Career data grid */}
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-400">ביקוש בשוק</p>
                  <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${DEMAND_COLOR[rec.marketDemand]}`}>
                    {rec.marketDemand}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-400">היום-יום</p>
                  <p className="text-xs leading-relaxed text-gray-600">{rec.dailyWorkflow}</p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-400">עמידות בפני AI</p>
                  <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${RESILIENCE_COLOR[rec.aiResilience]}`}>
                    {rec.aiResilience}
                  </span>
                  <p className="text-xs leading-relaxed text-gray-500">{rec.aiResilienceNote}</p>
                </div>
              </div>

              {/* Tabbed program sub-navigation */}
              {suggestedPrograms.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    מסלולים לחקור
                  </p>
                  <SubTabPanel
                    suggestedPrograms={suggestedPrograms}
                    onSelectProgram={setSelectedProgramId}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
