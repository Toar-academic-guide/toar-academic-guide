'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronLeft,
  Cpu, Zap, Settings, Building2, Activity, Microscope,
  PieChart, Brain, Stethoscope, Scale, Briefcase, TrendingUp,
  Heart, Shield, Film,
  UtensilsCrossed, Palette, Camera, Sparkles, Leaf, FlaskConical,
  LineChart, Database, Music, Anchor,
  Cake, ChefHat, PenTool, Clapperboard, Ruler,
  Bookmark, BookmarkCheck,
} from 'lucide-react';
import { RecommendedField, RiasecScores, EnvironmentPreference, RiasecDimension, GeographicRegion } from '@/types';
import { INSTITUTION_REGIONS, REGION_LABEL, REGION_EMOJI, REGION_BADGE_COLOR } from '@/data/geography';
import { INSTITUTION_BY_NAME } from '@/data/institutions';
import InstitutionLogo from '@/components/InstitutionLogo';
import type { Program } from '@/data/degrees/types';
import { PROGRAM_FIELD_MAP, FIELD_ENRICHMENT } from '@/data/degrees/fieldEnrichment';
import { getTopDimensions, DIMENSION_LABELS } from '@/utils/riasecEngine';

interface Props {
  programs: Program[];
  recommendations: RecommendedField[];
  onSelectDegree: (degreeId: string) => void;
  riasecScores: RiasecScores;
  environment: EnvironmentPreference;
  geographicPreference?: GeographicRegion;
  savedProgramIds?: string[];
  onToggleSave?: (programId: string) => void;
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
  industrialDesign: { icon: PenTool,         color: 'bg-blue-50 text-blue-600',       accent: 'border-r-blue-400'      },
  fineArts:         { icon: Palette,         color: 'bg-purple-50 text-purple-600',   accent: 'border-r-purple-400'    },
  photography:      { icon: Camera,          color: 'bg-slate-50 text-slate-600',     accent: 'border-r-slate-400'     },
  fashion:          { icon: Ruler,           color: 'bg-pink-50 text-pink-600',       accent: 'border-r-pink-400'      },
  graphicDesign:    { icon: Palette,         color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  animation:        { icon: Clapperboard,    color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  dance:            { icon: Sparkles,        color: 'bg-rose-50 text-rose-600',       accent: 'border-r-rose-400'      },
  cinema:           { icon: Film,            color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  screenwriting:    { icon: Film,            color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  documentary:      { icon: Film,            color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  // ── Culinary ──────────────────────────────────────────────────────────────
  chef:             { icon: ChefHat,         color: 'bg-amber-50 text-amber-600',     accent: 'border-r-amber-400'     },
  pastry:           { icon: Cake,            color: 'bg-amber-50 text-amber-600',     accent: 'border-r-amber-400'     },
  restaurantMgmt:   { icon: UtensilsCrossed, color: 'bg-amber-50 text-amber-600',     accent: 'border-r-amber-400'     },
  // ── Integrative medicine ──────────────────────────────────────────────────
  chineseMedicine:  { icon: Leaf,            color: 'bg-emerald-50 text-emerald-600', accent: 'border-r-emerald-400'   },
  naturopathy:      { icon: Leaf,            color: 'bg-green-50 text-green-600',     accent: 'border-r-green-400'     },
  homeopathy:       { icon: FlaskConical,    color: 'bg-teal-50 text-teal-600',       accent: 'border-r-teal-400'      },
  reflexology:      { icon: Heart,           color: 'bg-rose-50 text-rose-600',       accent: 'border-r-rose-400'      },
  psychotherapy:    { icon: Brain,           color: 'bg-purple-50 text-purple-600',   accent: 'border-r-purple-400'    },
  // ── Business cluster ──────────────────────────────────────────────────────────
  accounting:          { icon: LineChart,  color: 'bg-slate-50 text-slate-600',     accent: 'border-r-slate-400'     },
  infoSystems:         { icon: Database,   color: 'bg-cyan-50 text-cyan-600',       accent: 'border-r-cyan-400'      },
  // ── New specialised fields ─────────────────────────────────────────────────
  soundEngineering:    { icon: Music,      color: 'bg-violet-50 text-violet-600',   accent: 'border-r-violet-400'    },
  marineBiology:       { icon: Anchor,     color: 'bg-cyan-50 text-cyan-600',       accent: 'border-r-cyan-400'      },
  occupationalTherapy: { icon: Heart,      color: 'bg-red-50 text-red-600',         accent: 'border-r-red-400'       },
};

// InstitutionLogo is imported from @/components/InstitutionLogo (shared)

// ── Expandable program description ───────────────────────────────────────────
// Click-to-reveal on any device; smooth max-height CSS transition.
function ExpandableDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-fit items-center gap-1.5 rounded px-1 py-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <span
          className="transition-transform duration-200"
          style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
        <span>על התוכנית</span>
      </button>
      <p
        className={`overflow-hidden text-xs leading-relaxed text-slate-600 transition-all duration-300 ${open ? 'max-h-40 pt-1.5' : 'max-h-0'}`}
      >
        {text}
      </p>
    </div>
  );
}

// ── Sheba-style program sub-card ──────────────────────────────────────────────

interface SubCardProps {
  program: Program;
  fieldId: string;
  onSelect: () => void;
}

function ProgramSubCard({ program, fieldId, onSelect }: SubCardProps) {
  const Icon = FIELD_ICON[fieldId]?.icon;

  return (
    <button
      onClick={onSelect}
      className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl border border-slate-100 bg-white p-4 text-right shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md"
    >
      <div className="absolute bottom-0 right-0 top-0 w-[4px] bg-[#6366f1]" />
      <div className="flex items-center gap-3 pr-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-slate-700 transition-colors duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-600">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div className="text-right">
          <h4 className="text-sm font-semibold leading-none text-slate-800">{program.name}</h4>
          <span className="mt-2 block text-xs text-slate-400">לחץ לפרטים ודרישות קבלה</span>
        </div>
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:-translate-x-1 group-hover:text-slate-600" />
    </button>
  );
}

// ── Tabbed field sub-navigation ───────────────────────────────────────────────

interface SubTabPanelProps {
  programs: Program[];
  suggestedPrograms: Program[];
  onSelectProgram: (id: string) => void;
}

function SubTabPanel({ programs, suggestedPrograms, onSelectProgram }: SubTabPanelProps) {
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
  const clusterPrograms = programs
    .filter((p) => {
      if (!fieldProgramIds.includes(p.id) || p.institution === 'אוניברסיטה') return false;
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    })
    .sort((a, b) => (a.admissionType === 'sekhem' ? 0 : 1) - (b.admissionType === 'sekhem' ? 0 : 1))
    .slice(0, 6);

  const uniquePrograms = clusterPrograms.filter(
    (v, i, a) => a.findIndex((t) => t.name === v.name) === i
  );

  if (tabs.length === 0) return null;

  return (
    <div>
      {/* Tab bar — RTL, thin underline active indicator */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-100" dir="rtl">
        {tabs.map((tab) => {
          const TabIcon = FIELD_ICON[tab.fieldId]?.icon;
          const isActive = activeFieldId === tab.fieldId;
          return (
            <button
              key={tab.fieldId}
              onClick={() => setActiveFieldId(tab.fieldId)}
              className={`relative whitespace-nowrap pb-3 px-2 text-sm font-medium transition-all ${
                isActive ? 'font-semibold text-[#4f46e5]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="flex items-center gap-2">
                {TabIcon && <TabIcon className="h-4 w-4 shrink-0" />}
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#6366f1]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Program cards under active tab */}
      {uniquePrograms.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2" dir="rtl">
          {uniquePrograms.map((p) => (
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
  programs: Program[];
  program: Program;
  onBack: () => void;
  onSelectDegree: (id: string) => void;
  geographicPreference?: GeographicRegion;
  savedProgramIds?: string[];
  onToggleSave?: (programId: string) => void;
}

function ProgramDetailView({
  programs, program, onBack, onSelectDegree, geographicPreference,
  savedProgramIds, onToggleSave,
}: DetailProps) {
  const fieldId    = PROGRAM_FIELD_MAP[program.id];
  const enrichment = fieldId ? FIELD_ENRICHMENT[fieldId] : null;
  const FieldIcon  = fieldId ? FIELD_ICON[fieldId]?.icon : undefined;
  const iconBadge  = fieldId ? (FIELD_ICON[fieldId]?.color ?? 'bg-slate-50 text-slate-500') : 'bg-slate-50 text-slate-500';

  // All institution programs for "where to study", deduped by ID
  const relatedProgramIds = enrichment?.programIds ?? [program.id];
  const seenIds = new Set<string>();
  const institutionPrograms = programs
    .filter((p) => {
      if (!relatedProgramIds.includes(p.id) || p.institution === 'אוניברסיטה') return false;
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    })
    .sort((a, b) => {
      // Primary sort: institutions in the preferred region float to the top
      if (geographicPreference && geographicPreference !== 'any') {
        const aMatch = INSTITUTION_REGIONS[a.institution] === geographicPreference ? 0 : 1;
        const bMatch = INSTITUTION_REGIONS[b.institution] === geographicPreference ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      // Secondary sort: sekhem-track before requirements-track
      return (a.admissionType === 'sekhem' ? 0 : 1) - (b.admissionType === 'sekhem' ? 0 : 1);
    });

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
              <p className="text-xs font-semibold text-slate-500">אוניברסיטאות — פרטי קבלה</p>
              {sekhemInstitutions.map((p) => {
                const detail      = p.institutionDetails?.[0];
                const instRecord  = INSTITUTION_BY_NAME[p.institution];
                const region      = instRecord?.region ?? INSTITUTION_REGIONS[p.institution];
                const isPreferred = geographicPreference && geographicPreference !== 'any' && region === geographicPreference;
                const isSaved     = savedProgramIds?.includes(p.id) ?? false;
                return (
                  <div
                    key={p.id}
                    className={[
                      'flex flex-col gap-3 rounded-2xl border px-4 py-4',
                      isPreferred
                        ? 'border-indigo-200 bg-indigo-50/40'
                        : 'border-slate-100 bg-slate-50',
                    ].join(' ')}
                  >
                    {/* Institution name + logo + quick stats + save button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <InstitutionLogo institution={p.institution} record={instRecord} />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.institution}</p>
                          <p className="text-xs text-slate-500">{p.name}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        {detail && (
                          <div className="flex flex-col items-end gap-0.5 text-right text-xs text-slate-500">
                            {detail.durationYears !== null && <span>{detail.durationYears} שנות לימוד</span>}
                            <span>{detail.estimatedStudentsPerYear}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleSave?.(p.id)}
                          aria-label={isSaved ? 'הסר מרשימת הייעוד' : 'שמור לרשימת הייעוד'}
                          title={isSaved ? 'הסר מרשימת הייעוד' : 'שמור לרשימת הייעוד'}
                          className={[
                            'flex h-8 w-8 items-center justify-center rounded-lg transition',
                            isSaved
                              ? 'text-indigo-600 hover:text-indigo-800'
                              : 'text-slate-300 hover:text-slate-600',
                          ].join(' ')}
                        >
                          {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        </button>
                      </div>
                    </div>
                    {detail && (
                      <>
                        {/* Section-score minimums as chips */}
                        {(detail.quantitativeMinRequirement !== null || detail.englishMinRequirement !== null) && (
                          <div className="flex flex-wrap gap-1.5" dir="rtl">
                            {detail.quantitativeMinRequirement !== null && (
                              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                כמותי ≥ {detail.quantitativeMinRequirement}
                              </span>
                            )}
                            {detail.englishMinRequirement !== null && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                אנגלית ≥ {detail.englishMinRequirement}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Admission requirements headline + notes */}
                        {detail.specificAdmissionNotes.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-slate-700">מה נדרש כדי להתקבל</p>
                            <ul className="space-y-0.5" dir="rtl">
                              {detail.specificAdmissionNotes.map((note, i) => (
                                <li key={i} className="text-xs text-slate-600">• {note}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {/* Program description (expandable) */}
                        {detail.programDescription && (
                          <ExpandableDescription text={detail.programDescription} />
                        )}
                        {/* Dual-action CTA — program info + admission calculator
                            Falls back to the master institution record URLs when
                            the program-level detail fields are absent. */}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {(detail.programUrl ?? instRecord?.programUrl) && (
                            <a
                              href={detail.programUrl ?? instRecord?.programUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-95"
                            >
                              מידע על המסלול ↗
                            </a>
                          )}
                          <a
                            href={
                              detail.calculatorUrl
                                ?? detail.officialCalculatorUrl
                                ?? instRecord?.calculatorUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca] active:scale-95"
                          >
                            בדיקת סיכויי קבלה ומחשבון סכם ↗
                          </a>
                        </div>
                      </>
                    )}
                    {/* Fallback when institutionDetails not yet populated */}
                    {!detail && (
                      <button
                        onClick={() => { onSelectDegree(p.id); onBack(); }}
                        className="rounded-xl bg-[#4f46e5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4338ca] active:scale-95"
                      >
                        חשב סיכויי קבלה ←
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Requirements-track institutions */}
          {reqInstitutions.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-500">
                מכללות ומוסדות — קבלה על פי דרישות
              </p>
              {reqInstitutions.map((p) => {
                const detail      = p.institutionDetails?.[0];
                const instRecord  = INSTITUTION_BY_NAME[p.institution];
                const region      = instRecord?.region ?? INSTITUTION_REGIONS[p.institution];
                const isPreferred = geographicPreference && geographicPreference !== 'any' && region === geographicPreference;
                const isSaved     = savedProgramIds?.includes(p.id) ?? false;
                return (
                  <div
                    key={p.id}
                    className={[
                      'flex flex-col gap-3 rounded-2xl border px-4 py-4',
                      isPreferred
                        ? 'border-indigo-200 bg-indigo-50/40'
                        : 'border-slate-100 bg-slate-50',
                    ].join(' ')}
                  >
                    {/* Institution name + logo + save button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <InstitutionLogo institution={p.institution} record={instRecord} />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-semibold text-slate-800">{p.institution}</p>
                          {p.type === 'academic' && (
                            <span className="w-fit rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              מוסד אקדמי
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        {detail && (
                          <div className="flex flex-col items-end gap-0.5 text-right text-xs text-slate-500">
                            {detail.durationYears !== null && <span>{detail.durationYears} שנות לימוד</span>}
                            <span>{detail.estimatedStudentsPerYear}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleSave?.(p.id)}
                          aria-label={isSaved ? 'הסר מרשימת הייעוד' : 'שמור לרשימת הייעוד'}
                          title={isSaved ? 'הסר מרשימת הייעוד' : 'שמור לרשימת הייעוד'}
                          className={[
                            'flex h-8 w-8 items-center justify-center rounded-lg transition',
                            isSaved
                              ? 'text-indigo-600 hover:text-indigo-800'
                              : 'text-slate-300 hover:text-slate-600',
                          ].join(' ')}
                        >
                          {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        </button>
                      </div>
                    </div>
                    {detail ? (
                      <>
                        {/* Admission requirements headline + notes from institutionDetails */}
                        {detail.specificAdmissionNotes.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-slate-700">מה נדרש כדי להתקבל</p>
                            <ul className="space-y-0.5" dir="rtl">
                              {detail.specificAdmissionNotes.map((note, i) => (
                                <li key={i} className="text-xs text-slate-600">• {note}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {/* Program description (expandable) */}
                        {detail.programDescription && (
                          <ExpandableDescription text={detail.programDescription} />
                        )}
                        {/* Dual-action CTA — program info + admission portal
                            Falls back to the master institution record URLs when
                            the program-level detail fields are absent. */}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {(detail.programUrl ?? instRecord?.programUrl) && (
                            <a
                              href={detail.programUrl ?? instRecord?.programUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-95"
                            >
                              מידע על המסלול ↗
                            </a>
                          )}
                          <a
                            href={
                              detail.calculatorUrl
                                ?? detail.officialCalculatorUrl
                                ?? instRecord?.calculatorUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#4f46e5] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4338ca] active:scale-95"
                          >
                            בדיקת סיכויי קבלה ומחשבון סכם ↗
                          </a>
                        </div>
                      </>
                    ) : (
                      p.admissionRequirements.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-slate-700">מה נדרש כדי להתקבל</p>
                          <ul className="space-y-0.5">
                            {p.admissionRequirements.map((req, i) => (
                              <li key={i} className="text-xs text-slate-600">• {req}</li>
                            ))}
                          </ul>
                        </>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── Level 1: Category Overview ────────────────────────────────────────────────

export default function RecommendationResults({
  programs,
  recommendations,
  onSelectDegree,
  riasecScores,
  environment,
  geographicPreference = 'any',
  savedProgramIds,
  onToggleSave,
}: Props) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const [primary, secondary] = getTopDimensions(riasecScores);
  const profileLabel = `${DIMENSION_LABELS[primary].name}-${DIMENSION_LABELS[secondary].name}`;
  const dimensionsSorted = (Object.entries(riasecScores) as [RiasecDimension, number][])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  // Level 2 — show program detail
  if (selectedProgramId !== null) {
    const program = programs.find((p) => p.id === selectedProgramId);
    if (program) {
      return (
        <div className="flex flex-col gap-6">
          <ProgramDetailView
            programs={programs}
            program={program}
            onBack={() => setSelectedProgramId(null)}
            onSelectDegree={onSelectDegree}
            geographicPreference={geographicPreference}
            savedProgramIds={savedProgramIds}
            onToggleSave={onToggleSave}
          />
        </div>
      );
    }
  }

  // Level 1 — category overview
  return (
    <div className="flex flex-col gap-6">
      {/* Profile card */}
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-8">
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
            {geographicPreference !== 'any' && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${REGION_BADGE_COLOR[geographicPreference]}`}>
                {REGION_EMOJI[geographicPreference]} העדפה: {REGION_LABEL[geographicPreference]}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Category cards */}
      <div className="flex flex-col gap-5">
        {recommendations.map((rec, i) => {
          // Unique programs by ID (guard against any upstream duplicate IDs)
          const seen = new Set<string>();
          const suggestedPrograms = programs.filter((p) => {
            if (!rec.suggestedDegreeIds.includes(p.id) || seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });

          return (
            <section
              key={rec.id}
              className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-8"
            >
              {/* Header */}
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-xs font-bold text-white">
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
                    programs={programs}
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
