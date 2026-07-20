'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, ChevronDown, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import {
  INSTITUTION_BY_ID,
  INSTITUTION_BY_NAME,
  type InstitutionId,
  type InstitutionRecord,
} from '@/data/institutions';
import { REGION_LABEL } from '@/data/geography';
import InstitutionLogo from '@/components/InstitutionLogo';
import { useAuth } from '@/context/AuthContext';
import { buildAdmissionAlertIntentPath, buildAdmissionAlertSignupPath } from '@/lib/routes';
import {
  AdmissionsEvaluationApiError,
  fetchAdmissionsEvaluation,
} from '@/lib/admissionsEvaluationClient';
import {
  AdmissionsRouteApiError,
  fetchTauComputerScienceRoutes,
  type AdmissionsRouteResult,
  type AdmissionsRouteSearchResult,
} from '@/lib/admissionsRouteClient';
import type { CatalogueProgram } from '@/types/catalogue';
import type { AcademicScores, GeographicRegion } from '@/types';
import type {
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';

const UNIVERSITY_IDS = new Set([
  'tau',
  'huji',
  'technion',
  'bgu',
  'haifa',
  'biu',
  'ariel',
  'weizmann',
  'reichman',
  'open_university',
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
  return UNIVERSITY_IDS.has(inst.universityId ?? inst.id) ? 'university' : 'college';
}

function formatResultSummary(result: AdmissionsEvaluationResult): string {
  if (typeof result.score === 'number') {
    const formattedScore = Number.isInteger(result.score)
      ? String(result.score)
      : result.score.toFixed(1);
    const formattedThreshold =
      typeof result.threshold === 'number'
        ? Number.isInteger(result.threshold)
          ? String(result.threshold)
          : result.threshold.toFixed(1)
        : null;

    return `${result.scoreLabel ?? 'ציון'} ${formattedScore}${
      formattedThreshold ? ` · סף ${formattedThreshold}` : ''
    }`;
  }

  if (result.deltaNeeded) {
    const parts: string[] = [];
    if (result.deltaNeeded.psychometric > 0) {
      parts.push(`+${result.deltaNeeded.psychometric} פסיכומטרי`);
    }
    if (result.deltaNeeded.bagrut > 0) {
      parts.push(`+${result.deltaNeeded.bagrut} בגרות`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'נדרשים נתונים נוספים';
  }

  if (result.requiredInputs?.length) {
    return 'נדרשים גם תתי-ציונים בפסיכומטרי';
  }

  return result.sourceLabel;
}

interface Props {
  psychometric: number;
  bagrut: number;
  degreeId: string;
  programs: CatalogueProgram[];
  onBack: () => void;
  academicScores?: AcademicScores;
  onCompleteAcademicProfile?: () => void;
}

export default function CalculatorResults({
  psychometric,
  bagrut,
  degreeId,
  programs,
  onBack,
  academicScores,
  onCompleteAcademicProfile,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    posthog.capture('calculator_results_viewed', { degree_id: degreeId });
  }, [degreeId]);

  const [selectedTypes, setSelectedTypes] = useState<Set<InstitutionType>>(
    new Set(['university', 'college']),
  );
  const [selectedRegions, setSelectedRegions] = useState<Set<DisplayRegion>>(
    new Set(DISPLAY_REGIONS),
  );
  const [expandedRegions, setExpandedRegions] = useState<Set<DisplayRegion>>(new Set());
  const [report, setReport] = useState<AdmissionsEvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AdmissionsEvaluationApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [routeResult, setRouteResult] = useState<AdmissionsRouteSearchResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<AdmissionsRouteApiError | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    | 'idle'
    | 'submitting'
    | 'created'
    | 'existing'
    | 'profile_incomplete'
    | 'already_eligible'
    | 'error'
  >('idle');

  const selectedProgram = programs.find((program) => program.id === degreeId);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchAdmissionsEvaluation({
      degreeId,
      psychometric,
      bagrut,
    })
      .then((nextReport) => {
        if (cancelled) {
          return;
        }

        setReport(nextReport);
        posthog.capture('calculator_results_loaded', {
          degree_id: degreeId,
          result_count: nextReport.results.length,
          exact_count: nextReport.results.filter((result) => result.kind === 'exact').length,
          estimated_count: nextReport.results.filter((result) => result.kind === 'estimated')
            .length,
          unsupported_count: nextReport.results.filter((result) => result.kind === 'unsupported')
            .length,
          degraded_count: nextReport.results.filter((result) => result.kind === 'degraded').length,
          needs_input_count: nextReport.results.filter((result) => result.kind === 'needs_input')
            .length,
          open_admission_count: nextReport.results.filter(
            (result) => result.kind === 'open_admission',
          ).length,
          manual_gate_count: nextReport.results.filter((result) => result.kind === 'manual_gate')
            .length,
          requirements_only_count: nextReport.results.filter(
            (result) => result.kind === 'requirements_only',
          ).length,
          tracked_missing_rule_count: nextReport.results.filter(
            (result) => result.kind === 'tracked_missing_rule',
          ).length,
        });
      })
      .catch((requestError: unknown) => {
        if (cancelled) {
          return;
        }

        setReport(null);
        setError(
          requestError instanceof AdmissionsEvaluationApiError
            ? requestError
            : new AdmissionsEvaluationApiError('Unable to evaluate admissions right now.'),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bagrut, degreeId, psychometric, reloadToken]);

  const tauBelowThreshold = report?.results.some(
    (result) => result.linkedInstitutionId === 'tau' && result.decision === 'below',
  );
  const hasCompleteRouteProfile = Boolean(
    academicScores?.psychometric?.overall !== undefined &&
    academicScores.bagrut?.weightedAverage !== undefined &&
    academicScores.bagrut?.subjectRecord,
  );
  const routeProfileMatchesCalculation = Boolean(
    hasCompleteRouteProfile &&
    academicScores?.psychometric?.overall === psychometric &&
    academicScores.bagrut?.weightedAverage === bagrut,
  );

  async function handleAdmissionAlert() {
    const target = { institutionId: 'tau' as const, programId: 'tau_cs' as const };
    if (!user) {
      router.push(buildAdmissionAlertSignupPath(target));
      return;
    }
    if (!hasCompleteRouteProfile || !routeProfileMatchesCalculation) {
      router.push(buildAdmissionAlertIntentPath(target));
      return;
    }

    setSubscriptionStatus('submitting');
    try {
      const response = await fetch('/api/admission-alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(target),
      });
      const body = (await response.json()) as { data?: { status?: string } };
      if (!response.ok || !body.data?.status) throw new Error('subscription failed');
      if (body.data.status === 'created' || body.data.status === 'existing') {
        setSubscriptionStatus(body.data.status);
      } else if (
        body.data.status === 'profile_incomplete' ||
        body.data.status === 'already_eligible'
      ) {
        setSubscriptionStatus(body.data.status);
      } else {
        setSubscriptionStatus('error');
      }
    } catch {
      setSubscriptionStatus('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    setRouteResult(null);
    setRouteError(null);
    if (
      degreeId !== 'tau_cs' ||
      !tauBelowThreshold ||
      !hasCompleteRouteProfile ||
      !routeProfileMatchesCalculation ||
      !academicScores
    ) {
      setRouteLoading(false);
      return;
    }

    setRouteLoading(true);
    fetchTauComputerScienceRoutes(academicScores)
      .then((result) => !cancelled && setRouteResult(result))
      .catch((error: unknown) => {
        if (!cancelled) {
          setRouteError(
            error instanceof AdmissionsRouteApiError
              ? error
              : new AdmissionsRouteApiError('לא הצלחנו לאמת מסלול קבלה כרגע.'),
          );
        }
      })
      .finally(() => !cancelled && setRouteLoading(false));

    return () => {
      cancelled = true;
    };
  }, [
    academicScores,
    degreeId,
    hasCompleteRouteProfile,
    routeProfileMatchesCalculation,
    tauBelowThreshold,
  ]);

  const displayRows = useMemo(() => {
    return (report?.results ?? [])
      .map((result) => {
        const staticRecord =
          INSTITUTION_BY_ID[result.linkedInstitutionId as InstitutionId] ??
          INSTITUTION_BY_NAME[result.institution.name];
        const institution: InstitutionRecord = {
          ...(staticRecord ?? {
            id: result.linkedInstitutionId as InstitutionId,
            name: result.institution.name,
            region: result.institution.region,
          }),
          name: result.institution.name,
          region: result.institution.region,
          ...(result.institution.logoUrl ? { logoUrl: result.institution.logoUrl } : {}),
          ...(result.institution.domain ? { domain: result.institution.domain } : {}),
          ...(result.institution.programUrl ? { programUrl: result.institution.programUrl } : {}),
          ...(result.institution.calculatorUrl
            ? { calculatorUrl: result.institution.calculatorUrl }
            : {}),
          ...(result.institution.universityId
            ? { universityId: result.institution.universityId }
            : {}),
        };

        return {
          institution,
          result,
        };
      })
      .filter((entry) => entry.institution.region !== 'any');
  }, [report]);

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

  const filtered = displayRows.filter(
    (entry) =>
      selectedTypes.has(getInstitutionType(entry.institution)) &&
      selectedRegions.has(entry.institution.region as DisplayRegion),
  );

  const groupedByRegion = DISPLAY_REGIONS.map((region) => ({
    region,
    institutions: filtered.filter((institution) => institution.institution.region === region),
  })).filter((group) => group.institutions.length > 0);

  const STATUS_CONFIG = {
    exactAccepted: { label: 'מתקבל/ת', bg: 'bg-[#34D399]' },
    exactBelow: { label: 'מתחת לסף', bg: 'bg-[#FCD34D]' },
    estimatedAccepted: { label: 'מתקבל/ת', bg: 'bg-[#34D399]' },
    estimatedBelow: { label: 'מתחת לסף', bg: 'bg-[#FCD34D]' },
    needsInput: { label: 'נדרשים נתונים', bg: 'bg-violet-200' },
    degraded: { label: 'אימות לא זמין', bg: 'bg-rose-200' },
    openAdmission: { label: 'קבלה פתוחה', bg: 'bg-emerald-200' },
    manualGateEligible: { label: 'אפשר להגיש מועמדות', bg: 'bg-indigo-200' },
    manualGateBelow: { label: 'מתחת לסף', bg: 'bg-[#FCD34D]' },
    requirementsOnly: { label: 'תנאי קבלה', bg: 'bg-teal-200' },
    trackedMissingRule: { label: 'חסר אימות רשמי', bg: 'bg-amber-200' },
    unsupported: { label: 'אין מספיק מידע', bg: 'bg-slate-300' },
  } as const;

  const isCertificateProgram =
    selectedProgram?.type === 'certificate' || selectedProgram?.type === 'vocational';

  function acceptedLabel(): string {
    return isCertificateProgram ? 'זכאי/ת להירשם' : 'מתקבל/ת';
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f4f0]">
      <div className="border-b border-[#e5e7eb] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
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
            <button
              type="button"
              onClick={selectAllTypes}
              className="cursor-pointer text-xs font-semibold text-[#4f46e5]"
            >
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
            <button
              type="button"
              onClick={selectAllRegions}
              className="cursor-pointer text-xs font-semibold text-[#4f46e5]"
            >
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
              className="cursor-pointer inline-flex items-center gap-1 text-sm font-bold text-[#4f46e5] underline decoration-[#a5b4fc] underline-offset-2 transition hover:text-[#3730a3]"
            >
              לפירוט על לימודים אקדמיים בחו&quot;ל
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {degreeId === 'tau_cs' && tauBelowThreshold ? (
          <VerifiedRoutePanel
            completeProfile={hasCompleteRouteProfile}
            profileMatchesCalculation={routeProfileMatchesCalculation}
            loading={routeLoading}
            result={routeResult}
            error={routeError}
            onCompleteAcademicProfile={onCompleteAcademicProfile}
            subscriptionStatus={subscriptionStatus}
            onAdmissionAlert={handleAdmissionAlert}
          />
        ) : null}

        {loading ? (
          <div className="rounded-2xl border-2 border-black bg-white p-12 text-center">
            <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-slate-500" />
            <p className="mt-3 text-sm text-slate-500">טוענים את תוצאות הקבלה למסלול זה</p>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-8 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-rose-600" />
            <p className="mt-3 text-base font-black text-slate-900">
              לא הצלחנו לחשב את התוצאות כרגע
            </p>
            <p className="mt-2 text-sm text-slate-600">{error.message}</p>
            <button
              type="button"
              onClick={() => setReloadToken((current) => current + 1)}
              className="mt-5 cursor-pointer rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              נסו שוב
            </button>
          </div>
        ) : null}

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
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${REGION_COUNT_STYLE[region]}`}
                >
                  {institutions.length} מוסדות
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {visible.map(({ institution, result }) => {
                  const config =
                    result.kind === 'exact'
                      ? result.decision === 'accepted'
                        ? { ...STATUS_CONFIG.exactAccepted, label: acceptedLabel() }
                        : STATUS_CONFIG.exactBelow
                      : result.kind === 'estimated'
                        ? result.decision === 'accepted'
                          ? { ...STATUS_CONFIG.estimatedAccepted, label: acceptedLabel() }
                          : STATUS_CONFIG.estimatedBelow
                        : result.kind === 'needs_input'
                          ? STATUS_CONFIG.needsInput
                          : result.kind === 'degraded'
                            ? STATUS_CONFIG.degraded
                            : result.kind === 'open_admission'
                              ? isCertificateProgram
                                ? { ...STATUS_CONFIG.openAdmission, label: 'זכאי/ת להירשם' }
                                : STATUS_CONFIG.openAdmission
                              : result.kind === 'manual_gate'
                                ? result.decision === 'below'
                                  ? STATUS_CONFIG.manualGateBelow
                                  : STATUS_CONFIG.manualGateEligible
                                : result.kind === 'requirements_only'
                                  ? STATUS_CONFIG.requirementsOnly
                                  : result.kind === 'tracked_missing_rule'
                                    ? STATUS_CONFIG.trackedMissingRule
                                    : STATUS_CONFIG.unsupported;
                  const institutionType = getInstitutionType(institution);

                  return (
                    <div
                      key={institution.id}
                      className="flex flex-col gap-3 rounded-[14px] border-2 border-black bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <InstitutionLogo
                          institution={institution.name}
                          record={institution}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {institution.name}
                          </p>
                          <p className="text-[10px] text-slate-500" dir="ltr">
                            {institutionType === 'university' ? 'אוניברסיטה' : 'מכללה'} ·{' '}
                            {formatResultSummary(result)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {result.sourceLabel}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {result.explanation}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">{result.nextAction}</p>
                          {result.officialUrls && result.officialUrls.length > 0 ? (
                            <a
                              href={result.officialUrls[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              dir="ltr"
                              className="mt-1 inline-block max-w-full truncate text-[11px] font-semibold text-[#4f46e5] underline decoration-[#a5b4fc] underline-offset-2 hover:text-[#3730a3]"
                            >
                              {result.officialUrls[0]}
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <span
                        aria-label={`${institution.name}: ${config.label}`}
                        className={`${config.bg} self-start rounded-full border-2 border-black px-3 py-1 text-[10px] font-extrabold text-black sm:self-center`}
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
                  className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 text-xs text-slate-500"
                >
                  + {hiddenCount} מוסדות נוספים{' '}
                  <span className="font-semibold text-[#4f46e5]">הצג/י הכל</span>
                  <ChevronDown size={12} className="text-[#4f46e5]" />
                </button>
              ) : null}

              {isExpanded && hiddenCount > 0 ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(region)}
                  className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 text-xs text-slate-500"
                >
                  <span className="font-semibold text-[#4f46e5]">הסתר/י</span>
                  <ChevronDown size={12} className="rotate-180 text-[#4f46e5]" />
                </button>
              ) : null}
            </div>
          );
        })}

        {!loading && !error && groupedByRegion.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">
              {report?.results.length
                ? 'לא נמצאו מוסדות עם הסינון הנוכחי'
                : 'לא נמצאו תוצאות מוסדיות למסלול שנבחר'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VerifiedRoutePanel({
  completeProfile,
  profileMatchesCalculation,
  loading,
  result,
  error,
  onCompleteAcademicProfile,
  subscriptionStatus,
  onAdmissionAlert,
}: {
  completeProfile: boolean;
  profileMatchesCalculation: boolean;
  loading: boolean;
  result: AdmissionsRouteSearchResult | null;
  error: AdmissionsRouteApiError | null;
  onCompleteAcademicProfile?: () => void;
  subscriptionStatus:
    | 'idle'
    | 'submitting'
    | 'created'
    | 'existing'
    | 'profile_incomplete'
    | 'already_eligible'
    | 'error';
  onAdmissionAlert: () => void;
}) {
  return (
    <section className="mb-8 rounded-2xl border-2 border-black bg-[#e8f9ff] p-5" aria-live="polite">
      <p className="text-base font-black text-slate-900">
        הדרך המהירה ביותר להתקבל למדעי המחשב בתל אביב
      </p>
      <p className="mt-1 text-sm text-slate-600">
        ההמלצות מוצגות רק אחרי אימות מול מחשבון הקבלה הרשמי של אוניברסיטת תל אביב.
      </p>
      <div className="mt-4 rounded-xl border border-sky-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-900">רוצה שנעדכן כשנפתח לך סיכוי קבלה?</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          נבדוק רק שינויים שפורסמו ונבדקו, ונשלח עדכון אם החישוב המתמטי שלך יהפוך לזכאות.
        </p>
        {subscriptionStatus === 'created' || subscriptionStatus === 'existing' ? (
          <p className="mt-3 text-sm font-semibold text-emerald-800">
            המעקב פעיל. נעדכן אותך אם התנאים ישתנו.
          </p>
        ) : (
          <button
            type="button"
            onClick={onAdmissionAlert}
            disabled={subscriptionStatus === 'submitting'}
            className="mt-3 min-h-11 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {subscriptionStatus === 'submitting' ? 'מפעילים מעקב…' : 'עדכנו אותי כשאהיה זכאי/ת'}
          </button>
        )}
        {subscriptionStatus === 'profile_incomplete' ? (
          <p className="mt-2 text-xs font-semibold text-amber-800">
            יש להשלים ולשמור את הפרופיל האקדמי לפני הפעלת המעקב.
          </p>
        ) : null}
        {subscriptionStatus === 'already_eligible' ? (
          <p className="mt-2 text-xs font-semibold text-slate-700">
            לפי החישוב העדכני כבר אפשר להגיש מועמדות, ולכן לא הופעל מעקב.
          </p>
        ) : null}
        {subscriptionStatus === 'error' ? (
          <p className="mt-2 text-xs font-semibold text-rose-800">
            לא הצלחנו להפעיל מעקב כרגע. אפשר לנסות שוב.
          </p>
        ) : null}
      </div>
      {!completeProfile ? (
        <>
          <p className="mt-3 text-sm font-semibold text-slate-800">
            כדי לחשב מסלול מאומת, יש להשלים את מקצועות הבגרות והיחידות שלך בפרופיל.
          </p>
          {onCompleteAcademicProfile ? (
            <button
              type="button"
              onClick={onCompleteAcademicProfile}
              className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              השלמת פרופיל אקדמי
            </button>
          ) : null}
        </>
      ) : null}
      {completeProfile && !profileMatchesCalculation ? (
        <>
          <p className="mt-3 text-sm font-semibold text-slate-800">
            יש לעדכן את הפרופיל כך שיתאים לציונים שחושבו כאן לפני שנוכל לאמת מסלול קבלה.
          </p>
          {onCompleteAcademicProfile ? (
            <button
              type="button"
              onClick={onCompleteAcademicProfile}
              className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              עדכון פרופיל אקדמי
            </button>
          ) : null}
        </>
      ) : null}
      {loading ? (
        <p className="mt-3 text-sm font-semibold text-slate-700">
          מאמתים מסלולים אפשריים מול המקור הרשמי…
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-semibold text-rose-800">
          האימות הרשמי אינו זמין כרגע — לא הוצגה המלצה לא מאומתת.
        </p>
      ) : null}
      {!loading && !error && result?.status === 'no_route' ? (
        <p className="mt-3 text-sm font-semibold text-slate-700">
          לא נמצא כרגע מסלול מתמטי מאומת במסגרת האפשרויות שנבדקו.
        </p>
      ) : null}
      {!loading && !error && result?.status === 'search_incomplete' ? (
        <p className="mt-3 text-sm font-semibold text-slate-700">
          לא הצלחנו להשלים את החיפוש בבטחה, לכן לא הוצגה המלצה.
        </p>
      ) : null}
      {!loading && !error && result?.status === 'complete' && result.fastest ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <RouteCard title="המהיר ביותר" route={result.fastest} />
          {result.lowestEffort && result.lowestEffort.id !== result.fastest.id ? (
            <RouteCard title="הכי מעט מאמץ" route={result.lowestEffort} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function RouteCard({ title, route }: { title: string; route: AdmissionsRouteResult }) {
  return (
    <article className="rounded-xl border-2 border-black bg-white p-4">
      <h2 className="text-sm font-black text-slate-900">{title}</h2>
      <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
        {route.actions.map((action) => (
          <li key={action.id}>{routeActionLabel(action)}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold text-slate-600">
        הערכה סטנדרטית ושקופה: כ-{route.estimate.durationWeeks} שבועות · מאמץ{' '}
        {route.estimate.effortPoints}/5
      </p>
      <p className="mt-2 text-xs text-slate-500">
        אומת מול ציון {route.verification.score} וסף {route.verification.cutoff}. זהו חישוב קבלה, לא
        הבטחת קבלה סופית.
      </p>
    </article>
  );
}

function routeActionLabel(action: AdmissionsRouteResult['actions'][number]) {
  if (action.kind === 'psychometric') return `לשפר פסיכומטרי מ-${action.from} ל-${action.to}`;
  if (action.kind === 'improve_grade')
    return `לשפר ציון ${action.subjectId} מ-${action.fromGrade} ל-${action.toGrade}`;
  if (action.kind === 'expand_units')
    return `להרחיב ${action.subjectId} מ-${action.fromUnits} ל-${action.toUnits} יחידות`;
  return `להוסיף ${action.subjectId}: ${action.units} יחידות בציון ${action.grade}`;
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-bold transition ${
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
