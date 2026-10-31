'use client';

import HomeHero from './hero/HomeHero';

import AdmissionEstimate from './AdmissionEstimate';
import { biuFloorVerdict, type BiuFloorResult } from '@/lib/biuFloorPresentation';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import posthog from 'posthog-js';
import ProgramTrackedLink from './ProgramTrackedLink';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Compass,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { fetchCatalogueInstitutions, fetchCataloguePrograms } from '@/lib/catalogueClient';
import { fetchAdmissionsBatch } from '@/lib/admissionsEvaluationClient';
import { admissionsExtraInputsFromAcademicScores } from '@/lib/admissionsEvaluationProfile';
import {
  bagrutScoresForMode,
  exactInProgressSchema,
  type ExactInProgress,
  LOCATIONS,
  INSTITUTION_TYPES,
  studyFields,
  matchesStudyField,
  selectedStudyFieldIds,
  journeyRows,
  distinctRecommendations,
  toggleLocation,
  institutionLocations,
  matchesLocation,
  matchesInstitutionType,
  groupJourneyRows,
  resultLabel,
  resultExplanation,
  resultSourceLinks,
  showsOfficialNoCalculationNote,
  isTechnionMedicineScore,
  formatJourneyScore,
  officialUrl,
  type JourneyLocation,
  type InstitutionType,
  type JourneyRow,
} from '@/lib/studyJourney';
import { catalogueAdmissionRequirements, catalogueDescription } from '@/lib/catalogueDisplayText';
import { technionWinterRequirement } from '@/data/admissions/technionWinterCutoffs';
import { userProfileSchema } from '@/server/user/profileSchema';
import type { AcademicScores, RecommendedField, CareerAssessmentDraft } from '@/types';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';
import { getRecommendations } from '@/utils/recommendationEngine';
import JourneyRegionMap from './JourneyRegionMap';
import EnquiryForm from './EnquiryForm';
import WayPageShell from './WayPageShell';
import PublicNavBar from './PublicNavBar';
import ProgramShareButton from './ProgramShareButton';
import AdmissionRequirements from './AdmissionRequirements';
import RequirementTiles from './RequirementTiles';
import AdmissionConditions from './AdmissionConditions';
import TechnionThresholdNotice from './TechnionThresholdNotice';
import TechnionMedicineComparison from './TechnionMedicineComparison';
import { acceptedManualGateFootnote } from '@/lib/acceptedManualGateFootnote';
import { isBatchCUnsupportedProgramId } from '@/data/admissions/batchCUnsupportedProgramIds';
import { DANON_PROGRAM_URLS } from '@/data/admissions/danon';
import { buildLoginPath, ROUTES } from '@/lib/routes';
import './StudyJourney.css';
import { preloadJourneyExactGrades } from './preloadJourneyExactGrades';

if (typeof window !== 'undefined' && window.location.hash === '#grades-exact') {
  preloadJourneyExactGrades();
}

const CareerAssessment = dynamic(() => import('./CareerAssessment'));
const JourneyExactGrades = dynamic(() => import('./JourneyExactGrades'));
const AcademicProfileForm = dynamic(() => import('./AcademicProfileForm'));

function journeyAdmissionRequirements(
  notes: readonly string[] | undefined,
  program: CatalogueProgram,
  institutionId: string,
): string[] {
  const requirements = catalogueAdmissionRequirements(
    notes,
    program.admissionRequirements,
    program.id,
  );
  const winter = ['technion_ee', 'technion_me'].includes(program.id)
    ? technionWinterRequirement(program.id, institutionId)
    : undefined;
  if (!winter) return requirements;
  return [
    winter,
    ...requirements.filter((text) => !/^בחורף תשפ|^באביב תשפ/.test(text)),
    ...requirements.filter((text) => /^באביב תשפ/.test(text)),
  ];
}

const STEPS = [
  'home',
  'intent',
  'subjects',
  'regions',
  'grade-mode',
  'grades-quick',
  'grades-exact',
  'psy-mode',
  'psy-score',
  'psy-target',
  'review',
  'results',
  'detail',
  'alternatives',
  'inquiry',
  'offer',
  'saved',
  'compare',
  'improve',
  'plan',
  'missing',
  'questionnaire',
  'quiz-result',
  'account',
] as const;
type Step = (typeof STEPS)[number];
const DRAFT_KEY = 'myway_study_journey_v2';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
interface JourneyCatalogue {
  programs: CatalogueProgram[];
  institutions: CatalogueInstitution[];
}
let cachedCatalogue: JourneyCatalogue | null = null;
const EMPTY_PROGRAMS: CatalogueProgram[] = [];

interface Draft {
  fields: string[];
  fieldLabels?: Record<string, string>;
  locations: JourneyLocation[];
  types: InstitutionType[];
  scores: AcademicScores;
  bagrutPaths?: AcademicScores['bagrut'];
  exactInProgress?: ExactInProgress;
  quickInProgress?: string;
  target?: number;
  gradeMode?: 'quick' | 'exact' | 'none';
  bagrutInputIdentity?: string;
  psyMode?: 'score' | 'target' | 'none';
  selectedRowId?: string;
}
const EMPTY: Draft = { fields: [], locations: ['all'], types: ['all'], scores: {} };
function readDraft(): Draft | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (
      !raw ||
      !Array.isArray(raw.fields) ||
      !raw.fields.every((id: unknown) => typeof id === 'string') ||
      !Array.isArray(raw.locations) ||
      !raw.locations.every((id: string) => id in LOCATIONS) ||
      !Array.isArray(raw.types) ||
      !raw.types.every((id: string) => id in INSTITUTION_TYPES)
    )
      return null;
    const profile = userProfileSchema.safeParse({
      geographicPreference: 'any',
      academicScores: raw.scores,
    });
    if (!profile.success) return null;
    const scores = profile.data.academicScores ?? {};
    const bagrutPaths = userProfileSchema.safeParse({
      geographicPreference: 'any',
      academicScores: { bagrut: raw.bagrutPaths },
    });
    const exactInProgress = exactInProgressSchema.safeParse(raw.exactInProgress);
    let gradeMode: Draft['gradeMode'] = ['quick', 'exact', 'none'].includes(raw.gradeMode)
      ? raw.gradeMode
      : scores.admissions?.activeBagrutPath;
    if (
      gradeMode === 'none' &&
      !scores.admissions?.activeBagrutPath &&
      scores.bagrut?.subjectRecord
    )
      gradeMode = 'exact';
    else if (
      gradeMode === 'none' &&
      !scores.admissions?.activeBagrutPath &&
      scores.bagrut?.weightedAverage !== undefined
    )
      gradeMode = 'quick';
    return {
      ...EMPTY,
      fields: raw.fields,
      fieldLabels: Object.fromEntries(
        Object.entries(
          raw.fieldLabels && typeof raw.fieldLabels === 'object' && !Array.isArray(raw.fieldLabels)
            ? raw.fieldLabels
            : {},
        ).filter(
          (entry): entry is [string, string] =>
            raw.fields.includes(entry[0]) && typeof entry[1] === 'string' && !!entry[1].trim(),
        ),
      ),
      locations: raw.locations,
      types: raw.types,
      scores,
      bagrutPaths: bagrutPaths.success ? bagrutPaths.data.academicScores?.bagrut : undefined,
      exactInProgress: exactInProgress.success ? exactInProgress.data : undefined,
      quickInProgress:
        typeof raw.quickInProgress === 'string' && Number.isFinite(Number(raw.quickInProgress))
          ? raw.quickInProgress
          : undefined,
      target: raw.target >= 200 && raw.target <= 800 ? raw.target : undefined,
      gradeMode,
      bagrutInputIdentity:
        gradeMode && typeof raw.bagrutInputIdentity === 'string'
          ? raw.bagrutInputIdentity
          : undefined,
      psyMode: ['score', 'target', 'none'].includes(raw.psyMode) ? raw.psyMode : undefined,
      selectedRowId: typeof raw.selectedRowId === 'string' ? raw.selectedRowId : undefined,
    };
  } catch {
    return null;
  }
}
const toggle = <T,>(items: T[], value: T) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
function Primary({
  children = 'המשיכו',
  onClick,
  disabled = false,
}: {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="journey-primary" onClick={onClick} disabled={disabled}>
      {children}
      <ArrowLeft size={18} aria-hidden="true" />
    </button>
  );
}
function Chips<T extends string>({
  items,
  selected,
  onSelect,
}: {
  items: Record<T, string>;
  selected: T[];
  onSelect: (id: T) => void;
}) {
  return (
    <div className="journey-chips">
      {(Object.entries(items) as [T, string][]).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={selected.includes(id)}
          onClick={() => onSelect(id)}
        >
          {selected.includes(id) && <Check size={15} aria-hidden="true" />}
          {label}
        </button>
      ))}
    </div>
  );
}

export default function StudyJourney({
  initialStep = 'home',
  browse,
  initialProgramId,
}: {
  initialStep?: Step;
  browse?: ReactNode;
  initialProgramId?: string;
}) {
  if (initialStep === 'subjects') preloadJourneyExactGrades();
  const [urlProgramId, setUrlProgramId] = useState<string>();
  const selectedProgramId = initialProgramId ?? urlProgramId;
  const auth = useAuth();
  const router = useRouter();
  const {
    profile,
    updateProfile,
    toggleSavedProgram,
    hydrated,
    initialProfileStatus,
    syncError,
    clearLocalProfileData,
  } = useUserProfile();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [ready, setReady] = useState(false);
  const hadStoredDraft = useRef(false);
  const [step, setStep] = useState<Step>(initialStep);
  const [catalogue, setCatalogue] = useState<JourneyCatalogue | null>(null);
  const programs = catalogue?.programs ?? EMPTY_PROGRAMS;
  const quickAverageValue =
    draft.quickInProgress ??
    String(draft.scores.bagrut?.weightedAverage ?? draft.bagrutPaths?.weightedAverage ?? '');
  const journeyScores = useMemo(
    () => bagrutScoresForMode(draft.scores, draft.gradeMode),
    [draft.scores, draft.gradeMode],
  );
  const [catalogueError, setCatalogueError] = useState('');
  const [catalogueRefreshing, setCatalogueRefreshing] = useState(true);
  const catalogueLoading = !catalogue && catalogueRefreshing;
  const [query, setQuery] = useState('');
  const [quizPrompt, setQuizPrompt] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHeadingOnNavigation = useRef(false);
  const [quizDraft, setQuizDraft] = useState<CareerAssessmentDraft>();
  const [recommendations, setRecommendations] = useState<RecommendedField[]>([]);
  const [reports, setReports] = useState<Record<string, AdmissionsEvaluationReport>>({});
  const [failedReports, setFailedReports] = useState<string[]>([]);
  const [calculating, setCalculating] = useState(false);
  const calculation = useRef(0);
  const [groupBy, setGroupBy] = useState<'field' | 'institution'>('field');
  const [resultFilter, setResultFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailOrigin, setDetailOrigin] = useState<'saved' | 'results'>('results');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<number | undefined>();
  const [message, setMessage] = useState('');
  const [resultLimit, setResultLimit] = useState(10);

  const go = useCallback(
    (next: Step) => {
      focusHeadingOnNavigation.current = true;
      setStep(next);
      setMessage('');
      if (next === 'home') router.push(ROUTES.home);
      else if (window.location.hash !== `#${next}`) {
        // Preserve Next's route state when creating a journey history entry.
        window.history.pushState(null, '', `#${next}`);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [router],
  );
  useIsomorphicLayoutEffect(() => {
    if (cachedCatalogue) setCatalogue(cachedCatalogue);
    const queryPrograms = new URLSearchParams(window.location.search).getAll('program');
    setUrlProgramId(
      initialStep === 'subjects' && queryPrograms.length === 1 ? queryPrograms[0] : undefined,
    );
    const stored = readDraft();
    hadStoredDraft.current = !!stored;
    if (stored) {
      setDraft(stored);
      setActiveId(stored.selectedRowId ?? null);
    }
    setReady(true);
    const readStep = (event?: Event) => {
      const hash = window.location.hash.slice(1);
      focusHeadingOnNavigation.current = !!event;
      setStep(STEPS.includes(hash as Step) ? (hash as Step) : initialStep);
    };
    readStep();
    window.addEventListener('hashchange', readStep);
    window.addEventListener('popstate', readStep);
    return () => {
      window.removeEventListener('hashchange', readStep);
      window.removeEventListener('popstate', readStep);
    };
  }, [initialStep]);
  const importedProfile = useRef<string | null>(null);
  const profileIdentity = auth.user?.id ?? 'guest';
  useEffect(() => {
    if (
      !ready ||
      !hydrated ||
      initialProfileStatus !== 'ready' ||
      importedProfile.current === profileIdentity
    )
      return;
    importedProfile.current = profileIdentity;
    if (auth.user || !hadStoredDraft.current) {
      const scores = profile.academicScores ?? {};
      const profileGradeMode =
        scores.admissions?.activeBagrutPath ??
        (scores.bagrut?.subjectRecord
          ? 'exact'
          : scores.bagrut?.weightedAverage
            ? 'quick'
            : 'none');
      setDraft((current) => {
        const keepBagrutInput = current.bagrutInputIdentity === profileIdentity;
        return {
          ...current,
          scores: keepBagrutInput
            ? { ...scores, bagrut: bagrutScoresForMode(current.scores, current.gradeMode).bagrut }
            : scores,
          gradeMode: keepBagrutInput ? current.gradeMode : profileGradeMode,
          bagrutInputIdentity: keepBagrutInput ? current.bagrutInputIdentity : undefined,
          bagrutPaths: keepBagrutInput
            ? { ...scores.bagrut, ...current.bagrutPaths, ...current.scores.bagrut }
            : scores.bagrut,
          psyMode: scores.psychometric?.overall ? 'score' : 'none',
          target: undefined,
        };
      });
    }
  }, [ready, hydrated, initialProfileStatus, profile.academicScores, profileIdentity, auth.user]);
  useIsomorphicLayoutEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* Optional browser draft. */
    }
  }, [draft, ready]);
  useEffect(() => {
    if (!focusHeadingOnNavigation.current) return;
    focusHeadingOnNavigation.current = false;
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (quizPrompt) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [quizPrompt]);
  const loadCatalogue = useCallback(async () => {
    setCatalogueRefreshing(true);
    setCatalogueError('');
    try {
      const [nextPrograms, nextInstitutions] = await Promise.all([
        fetchCataloguePrograms(),
        fetchCatalogueInstitutions(),
      ]);
      cachedCatalogue = { programs: nextPrograms, institutions: nextInstitutions };
      setCatalogue(cachedCatalogue);
    } catch {
      setCatalogueError('לא הצלחנו לטעון את המסלולים. נסו שוב.');
    } finally {
      setCatalogueRefreshing(false);
    }
  }, []);
  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue]);
  const fields = useMemo(() => studyFields(programs), [programs]);
  useEffect(() => {
    if (!catalogue) return;
    setDraft((current) => {
      const fieldLabels = Object.fromEntries(
        fields
          .filter((field) => current.fields.includes(field.id))
          .map((field) => [field.id, field.name]),
      );
      return JSON.stringify(current.fieldLabels) === JSON.stringify(fieldLabels)
        ? current
        : { ...current, fieldLabels };
    });
  }, [catalogue, fields, draft.fields]);
  const selectedFieldIds = useMemo(
    () => selectedStudyFieldIds(fields, draft.fields),
    [fields, draft.fields],
  );
  const allRows = useMemo(
    () => journeyRows(studyFields(programs, true), catalogue?.institutions ?? []),
    [programs, catalogue],
  );
  const preselectedProgram = useRef<string | null>(null);
  useEffect(() => {
    if (
      !selectedProgramId ||
      !ready ||
      catalogueRefreshing ||
      preselectedProgram.current === selectedProgramId
    )
      return;
    const field = fields.find((entry) =>
      entry.programs.some((program) => program.id === selectedProgramId),
    );
    if (!field) return;
    const row = allRows.find((entry) => entry.program.id === selectedProgramId);
    preselectedProgram.current = selectedProgramId;
    setDraft((current) => ({
      ...current,
      fields: [field.id],
      locations: ['all'],
      types: ['all'],
      selectedRowId: row?.id,
    }));
    setActiveId(row?.id ?? null);
  }, [selectedProgramId, ready, catalogueRefreshing, fields, allRows]);
  const selectedRows = useMemo(
    () =>
      distinctRecommendations(allRows).filter(
        (row) =>
          row.program.isListed !== false &&
          (!selectedFieldIds.length || selectedFieldIds.includes(row.fieldId)) &&
          matchesLocation(row.institution, draft.locations) &&
          matchesInstitutionType(row.institution, row.program, draft.types),
      ),
    [allRows, selectedFieldIds, draft.locations, draft.types],
  );
  const savedRows = useMemo(
    () => allRows.filter((row) => profile.savedProgramIds?.includes(row.program.id)),
    [allRows, profile.savedProgramIds],
  );
  const rows = useMemo(
    () =>
      selectedRows.map((row) => ({
        ...row,
        result: reports[row.program.id]?.results.find(
          (result) => result.linkedInstitutionId === row.institution.id,
        ),
        failed: failedReports.includes(row.program.id),
      })),
    [selectedRows, reports, failedReports],
  );
  const active = allRows.find((row) => row.id === activeId);
  const activeRow = active
    ? {
        ...active,
        result: reports[active.program.id]?.results.find(
          (result) => result.linkedInstitutionId === active.institution.id,
        ),
        failed: failedReports.includes(active.program.id),
      }
    : undefined;
  const biuFloorResult =
    activeRow?.result?.linkedInstitutionId === 'biu' && activeRow.result.floorChecks
      ? (activeRow.result as BiuFloorResult)
      : undefined;
  const activeFootnote = acceptedManualGateFootnote(activeRow?.result);
  const isBatchCUnsupported = activeRow
    ? isBatchCUnsupportedProgramId(activeRow.program.id, activeRow.institution.id)
    : false;
  const details = activeRow?.program.institutionDetails?.find(
    (detail) => detail.institutionName === activeRow.institution.name,
  );
  const activeOfficialUrl = officialUrl(
    (isBatchCUnsupported ? activeRow?.result?.officialUrls?.[0] : undefined) ??
      details?.programUrl ??
      activeRow?.institution.programUrl,
    activeRow?.institution.id,
  );
  const activeSourceLinks = resultSourceLinks(activeRow?.result, activeOfficialUrl);
  const activeShowsNoCalculationNote = showsOfficialNoCalculationNote(activeRow?.result);
  const description = catalogueDescription(details?.programDescription);
  const counts = useMemo(() => {
    const sets: Partial<Record<JourneyLocation, Set<string>>> = {};
    for (const row of allRows) {
      if (row.program.isListed === false) continue;
      if (selectedFieldIds.length && !selectedFieldIds.includes(row.fieldId)) continue;
      if (!matchesInstitutionType(row.institution, row.program, draft.types)) continue;
      for (const area of institutionLocations(row.institution))
        (sets[area] ??= new Set()).add(row.institution.id);
    }
    return Object.fromEntries(Object.entries(sets).map(([area, ids]) => [area, ids.size]));
  }, [allRows, selectedFieldIds, draft.types]);
  const saveExactProgress = useCallback((exactInProgress: ExactInProgress) => {
    setDraft((current) => ({ ...current, exactInProgress }));
  }, []);
  const patch = (updates: Partial<Draft>) => setDraft((current) => ({ ...current, ...updates }));
  const submitBagrut = (
    gradeMode: NonNullable<Draft['gradeMode']>,
    bagrut?: AcademicScores['bagrut'],
  ) => {
    patch({
      gradeMode,
      bagrutInputIdentity: profileIdentity,
      exactInProgress: undefined,
      quickInProgress: undefined,
      bagrutPaths: { ...draft.bagrutPaths, ...draft.scores.bagrut, ...bagrut },
      scores: { ...draft.scores, bagrut },
    });
  };
  const patchScores = (updates: Partial<AcademicScores>) =>
    patch({ scores: { ...draft.scores, ...updates } });
  const setType = (type: InstitutionType) => {
    const types =
      type === 'all'
        ? (['all'] as InstitutionType[])
        : toggle(
            draft.types.filter((id) => id !== 'all'),
            type,
          );
    patch({ types: types.length ? types : ['all'] });
  };
  const evaluate = useCallback(
    async (targets: JourneyRow[], scores: AcademicScores, target?: number, retry = false) => {
      const version = ++calculation.current;
      setCalculating(true);
      setFailedReports([]);
      if (!retry) setReports({});
      const ids = [...new Set(targets.map((row) => row.program.id))];
      const found: Record<string, AdmissionsEvaluationReport> = {};
      const failed: string[] = [];
      for (let index = 0; index < ids.length; index += 50) {
        if (calculation.current !== version) return;
        const degreeIds = ids.slice(index, index + 50);
        try {
          const batch = await fetchAdmissionsBatch({
            degreeIds,
            psychometric: target ?? scores.psychometric?.overall,
            bagrut: scores.bagrut?.weightedAverage,
            extraInputs: admissionsExtraInputsFromAcademicScores(scores),
          });
          Object.assign(found, batch.reports);
          failed.push(...batch.failedDegreeIds);
        } catch {
          failed.push(...degreeIds);
        }
        if (calculation.current === version) {
          setReports((current) => ({ ...(retry ? current : {}), ...found }));
          setFailedReports([...failed]);
        }
      }
      if (calculation.current === version) setCalculating(false);
    },
    [],
  );
  const evaluationScope =
    step === 'saved'
      ? 'saved'
      : ['results', 'plan'].includes(step)
        ? 'results'
        : step === 'detail'
          ? 'detail'
          : null;
  const evaluationTargets = useMemo(
    () =>
      evaluationScope === 'detail'
        ? active
          ? [active]
          : []
        : evaluationScope === 'saved'
          ? savedRows
          : selectedRows,
    [evaluationScope, active, savedRows, selectedRows],
  );
  const usesSavedGrades =
    evaluationScope === 'saved' || (evaluationScope === 'detail' && detailOrigin === 'saved');
  const evaluationScores = useMemo(
    () =>
      usesSavedGrades
        ? draft.bagrutInputIdentity === profileIdentity
          ? bagrutScoresForMode(
              { ...profile.academicScores, bagrut: journeyScores.bagrut },
              draft.gradeMode,
            )
          : bagrutScoresForMode(
              profile.academicScores ?? EMPTY.scores,
              profile.academicScores?.admissions?.activeBagrutPath,
            )
        : journeyScores,
    [
      usesSavedGrades,
      draft.bagrutInputIdentity,
      draft.gradeMode,
      profileIdentity,
      profile.academicScores,
      journeyScores,
    ],
  );
  const evaluationTarget = usesSavedGrades ? undefined : (simulation ?? draft.target);
  const resultSignature = JSON.stringify([
    evaluationScope,
    profileIdentity,
    evaluationTargets.map((row) => row.id),
    evaluationScores,
    evaluationTarget,
  ]);
  const lastEvaluation = useRef('');
  const viewedResults = useRef('');
  useEffect(() => {
    if (!['results', 'plan'].includes(step)) {
      viewedResults.current = '';
      return;
    }
    if (!ready || catalogueRefreshing || catalogueError || calculating) return;
    // Wait for the current calculation, including when older reports are still rendered.
    if (draft.fields.length && rows.length && lastEvaluation.current !== resultSignature) return;
    if (draft.fields.length && rows.some((row) => !row.result && !row.failed)) return;
    const key = `${step}:${resultSignature}`;
    if (viewedResults.current === key) return;
    viewedResults.current = key;
    const groups = rows.map(
      (row) => resultLabel(row.result, row.failed, false, row.program.id).group,
    );
    posthog.capture('journey_results_viewed', {
      result_count: rows.length,
      match_count: groups.filter((group) => group === 'match').length,
      improve_count: groups.filter((group) => group === 'improve').length,
      explore_count: groups.filter((group) => group === 'explore').length,
      has_psychometric: !!draft.scores.psychometric?.overall,
      has_bagrut: !!(draft.scores.bagrut?.weightedAverage || draft.scores.bagrut?.subjectRecord),
    });
  }, [
    step,
    ready,
    catalogueRefreshing,
    catalogueError,
    calculating,
    draft.fields.length,
    draft.scores,
    rows,
    resultSignature,
  ]);
  useEffect(() => {
    if (!ready || catalogueRefreshing || !evaluationScope) return;
    if (['saved', 'detail'].includes(evaluationScope) && initialProfileStatus !== 'ready') return;
    // A detail reached from results already has a report; a refreshed detail does not.
    if (evaluationScope === 'detail' && (activeRow?.result || activeRow?.failed)) return;
    if (evaluationScope === 'results' && !draft.fields.length) return;
    if (!evaluationTargets.length) {
      lastEvaluation.current = '';
      calculation.current++;
      setCalculating(false);
      return;
    }
    if (lastEvaluation.current === resultSignature) return;
    lastEvaluation.current = resultSignature;
    void evaluate(evaluationTargets, evaluationScores, evaluationTarget);
  }, [
    evaluationScope,
    activeRow?.result,
    activeRow?.failed,
    ready,
    catalogueRefreshing,
    initialProfileStatus,
    resultSignature,
    evaluationTargets,
    evaluationScores,
    evaluationTarget,
    draft.fields.length,
    evaluate,
  ]);
  useEffect(
    () => () => {
      calculation.current++;
    },
    [],
  );
  const contactProgramId = activeRow?.program.id;
  const contactInstitutionId = activeRow?.institution.id;
  const contactResultGroup =
    activeRow?.result || activeRow?.failed
      ? resultLabel(activeRow.result, activeRow.failed, false, activeRow.program.id).group
      : undefined;
  const previousContactStep = useRef<Step | null>(null);
  useEffect(() => {
    const previous = previousContactStep.current;
    if (previous === step || (step === 'inquiry' && !contactProgramId)) return;
    previousContactStep.current = step;
    if (step === 'offer') {
      posthog.capture('journey_contact_clicked', {
        program_id: 'psychometric-preparation',
        institution_id: '',
        surface: 'offer',
      });
    } else if (step === 'inquiry' && contactProgramId) {
      posthog.capture('journey_contact_clicked', {
        program_id: contactProgramId,
        institution_id: contactInstitutionId,
        surface:
          previous && ['results', 'plan', 'saved'].includes(previous)
            ? 'row'
            : (previous ?? 'inquiry'),
        ...(contactResultGroup ? { result_group: contactResultGroup } : {}),
      });
    }
  }, [step, contactProgramId, contactInstitutionId, contactResultGroup]);
  const saveScores = async () => {
    const academicScores: AcademicScores = {
      ...draft.scores,
      bagrut: { ...draft.bagrutPaths, ...draft.scores.bagrut },
      ...(draft.gradeMode !== undefined
        ? { admissions: { ...draft.scores.admissions, activeBagrutPath: draft.gradeMode } }
        : {}),
    };
    if (!(await updateProfile({ academicScores })))
      setMessage('שמירת הציונים לא הושלמה. אפשר להמשיך ולנסות לשמור שוב בהמשך.');
  };
  const selectRow = (row: JourneyRow, next: Step) => {
    setDetailOrigin(step === 'saved' ? 'saved' : 'results');
    setActiveId(row.id);
    setDraft((current) => ({ ...current, selectedRowId: row.id }));
    go(next);
  };
  const save = async (programId: string) => {
    await toggleSavedProgram(programId);
  };
  const startResults = () => {
    setSimulation(undefined);
    void saveScores();
    go('results');
  };
  const afterGrades = () => go('psy-mode');
  const goBack = () => {
    const previous: Partial<Record<Step, Step>> = {
      intent: 'home',
      subjects: 'intent',
      regions: draft.fields.length ? 'subjects' : 'intent',
      'grade-mode': 'regions',
      'grades-quick': 'grade-mode',
      'grades-exact': 'grade-mode',
      'psy-mode': 'grade-mode',
      'psy-score': 'psy-mode',
      'psy-target': 'psy-mode',
      review: 'psy-mode',
      results: 'review',
      detail: detailOrigin,
      alternatives: 'detail',
      inquiry: 'detail',
      offer: 'results',
      saved: 'results',
      compare: 'saved',
      improve: 'results',
      plan: 'improve',
      missing: 'detail',
      questionnaire: 'intent',
      'quiz-result': 'questionnaire',
      account: 'saved',
    };
    go(previous[step] ?? 'home');
  };
  const titles: Record<Step, string> = {
    home: '',
    intent: 'אני יודע/ת מה אני רוצה ללמוד',
    subjects: 'מה מעניין אתכם ללמוד?',
    regions: 'איפה אתם רוצים ללמוד?',
    'grade-mode': 'איך נבדוק את ציוני הבגרות?',
    'grades-quick': 'מה ממוצע הבגרות שלכם?',
    'grades-exact': 'ציוני הבגרות שלכם',
    'psy-mode': 'יש לכם ציון פסיכומטרי?',
    'psy-score': 'מה ציון הפסיכומטרי שלכם?',
    'psy-target': 'לאיזה ציון אתם מכוונים?',
    review: 'מוכנים לגלות את האפשרויות שלכם?',
    results: 'האפשרויות שלכם',

    detail: activeRow?.fieldName ?? 'פרטי המסלול',
    alternatives: 'עוד דרכים להתקבל',
    inquiry: 'בואו נעשה את הצעד הבא',
    offer: 'עזרה בהכנה לפסיכומטרי',
    saved: 'הרשימה שלי',
    compare: 'משווים אפשרויות',
    improve: 'מה יקרה אם נשפר את הציון?',
    plan: 'האפשרויות עם ציון היעד',
    missing: 'השלמת נתונים לחישוב',
    questionnaire: 'מגלים מה מתאים לכם',
    'quiz-result': 'הכיוונים שמתאימים לכם',
    account: 'החשבון שלי',
  };
  const stageIndex = ['intent', 'subjects', 'questionnaire', 'quiz-result'].includes(step)
    ? 0
    : step === 'regions'
      ? 1
      : [
            'grade-mode',
            'grades-quick',
            'grades-exact',
            'psy-mode',
            'psy-score',
            'psy-target',
            'review',
          ].includes(step)
        ? 2
        : 3;
  const catalogueStatus = catalogueLoading ? (
    <p role="status">טוענים מסלולים…</p>
  ) : catalogueError ? (
    <div role="alert">
      <p>{catalogueError}</p>
      <button className="journey-secondary" onClick={() => void loadCatalogue()}>
        לנסות שוב
      </button>
    </div>
  ) : null;
  const continueButton = (onClick: () => void, disabled = false) => (
    <div className="journey-actions">
      <Primary onClick={onClick} disabled={disabled} />
    </div>
  );
  const visibleRows = rows.filter(
    (row) =>
      (resultFilter === 'all' ||
        resultLabel(row.result, false, false, row.program.id).group === resultFilter) &&
      (!query || `${row.fieldName} ${row.institution.name}`.includes(query)),
  );
  const groups = groupJourneyRows(visibleRows, groupBy);
  const rowView = (row: JourneyRow) => {
    const status = resultLabel(row.result, row.failed, calculating && !row.result, row.program.id);
    const sourceLinks = resultSourceLinks(row.result, row.institution.programUrl);
    return (
      <article className="journey-result-row" key={row.id}>
        <div className="journey-row-info">
          <button className="journey-row-title" onClick={() => selectRow(row, 'detail')}>
            {step === 'saved'
              ? `${row.fieldName} — ${row.institution.name}`
              : groupBy === 'field'
                ? row.institution.name
                : row.fieldName}
          </button>
          {!showsOfficialNoCalculationNote(row.result) && (
            <span
              className={`journey-status status-${isTechnionMedicineScore(row.result, row.program.id) && !row.failed ? 'match' : status.group}`}
            >
              {status.label}
            </span>
          )}
          {sourceLinks && (
            <>
              {resultExplanation(row.result, row.program.id) && (
                <p className="journey-result-explanation">
                  {resultExplanation(row.result, row.program.id)}
                </p>
              )}
              <div className="journey-links">
                {sourceLinks.map(({ href, label }) => (
                  <ProgramTrackedLink
                    key={href}
                    event="institution_site_clicked"
                    programId={row.program.id}
                    institutionId={row.institution.id}
                    target="_blank"
                    rel="noopener noreferrer"
                    href={href}
                  >
                    {label}
                  </ProgramTrackedLink>
                ))}
              </div>
            </>
          )}
          {isTechnionMedicineScore(row.result, row.program.id) && !row.failed && (
            <TechnionMedicineComparison score={row.result.score} />
          )}
          <TechnionThresholdNotice programId={row.program.id} institutionId={row.institution.id} />
        </div>
        <div className="journey-row-actions">
          <button className="journey-contact" onClick={() => selectRow(row, 'inquiry')}>
            קבלו שיחה מהמוסד
          </button>
          <button
            className="journey-icon-button"
            aria-label={`שמירת ${row.fieldName} — ${row.institution.name}`}
            aria-pressed={profile.savedProgramIds?.includes(row.program.id) ?? false}
            onClick={() => void save(row.program.id)}
          >
            <Bookmark size={19} aria-hidden="true" />
          </button>
          <button
            className="journey-icon-button"
            aria-label={`פרטים על ${row.fieldName} — ${row.institution.name}`}
            onClick={() => selectRow(row, 'detail')}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <WayPageShell navigation={null} contentClassName="" className="study-journey">
      <PublicNavBar
        onGoHome={() => go('home')}
        onGoToBucket={() => go('saved')}
        onAccountClick={() => go('account')}
        loginHref={buildLoginPath('/#' + step)}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={`journey-main ${step === 'home' ? 'journey-home' : ''} ${step === 'intent' ? 'journey-intent' : ''} ${['subjects', 'grade-mode', 'grades-quick', 'grades-exact', 'psy-mode', 'psy-score', 'psy-target', 'review', 'detail', 'alternatives', 'quiz-result', 'improve', 'account', 'inquiry', 'offer'].includes(step) ? 'journey-main-narrow' : ''}`}
      >
        {step !== 'home' && (
          <>
            <div className="journey-progress" aria-label="התקדמות">
              {['מה ללמוד', 'איפה ללמוד', 'הציונים שלי', 'האפשרויות שלי'].map((label, index) => (
                <span
                  key={label}
                  aria-current={index === stageIndex ? 'step' : undefined}
                  className={index <= stageIndex ? 'active' : ''}
                >
                  {label}
                </span>
              ))}
            </div>
            <button className="journey-pill journey-back" onClick={goBack}>
              <ArrowRight size={16} aria-hidden="true" />
              חזרה
            </button>
            <h1 ref={heading} tabIndex={-1}>
              {titles[step]}
            </h1>
          </>
        )}
        {(message || syncError) && <p role="alert">{message || syncError}</p>}
        {step === 'home' && <HomeHero heading={heading} />}
        {step === 'intent' && (
          <>
            <div className="journey-intent-options">
              <Primary onClick={() => go('subjects')}>כן</Primary>
              <button className="journey-secondary" onClick={() => setQuizPrompt(true)}>
                עדיין לא
              </button>
            </div>
            <p className="journey-helper">גם אם עוד לא החלטתם, אפשר להתחיל.</p>
          </>
        )}
        <dialog
          ref={dialog}
          className="journey-dialog"
          onCancel={() => setQuizPrompt(false)}
          onClose={() => setQuizPrompt(false)}
        >
          <button
            className="journey-icon-button dialog-close"
            aria-label="סגירה"
            onClick={() => setQuizPrompt(false)}
          >
            <X />
          </button>
          <Compass size={30} aria-hidden="true" />
          <h2>נמצא יחד כיוון?</h2>
          <p>שאלון קצר יעזור לגלות מה מתאים לכם.</p>
          <Primary
            onClick={() => {
              setQuizPrompt(false);
              go('questionnaire');
            }}
          >
            לשאלון
          </Primary>
          <button
            className="journey-text-button"
            onClick={() => {
              setQuizPrompt(false);
              patch({ fields: [] });
              go('regions');
            }}
          >
            להמשיך בלי שאלון
          </button>
        </dialog>
        {step === 'subjects' && (
          <section className="journey-narrow">
            {catalogueStatus}
            <label className="journey-search way-search-field">
              <Search size={20} aria-hidden="true" />
              <input
                className="way-input-unframed"
                aria-label="חיפוש תחום לימודים"
                placeholder="איזה תחום מעניין אתכם?"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {!!draft.fields.length && (
              <Chips
                items={Object.fromEntries(
                  draft.fields.flatMap((id) => {
                    const label =
                      fields.find((field) => field.id === id)?.name ??
                      (!catalogue ? draft.fieldLabels?.[id] : undefined);
                    return label ? [[id, label]] : [];
                  }),
                )}
                selected={draft.fields}
                onSelect={(id) => patch({ fields: toggle(draft.fields, id) })}
              />
            )}
            {query ? (
              <Chips
                items={Object.fromEntries(
                  fields
                    .filter((field) => matchesStudyField(field, query))
                    .map((field) => [field.id, field.name]),
                )}
                selected={draft.fields}
                onSelect={(id) => patch({ fields: toggle(draft.fields, id) })}
              />
            ) : (
              <>
                <h2>בחירות נפוצות</h2>
                <Chips
                  items={Object.fromEntries(
                    fields
                      .filter((field) =>
                        [
                          'פיזיותרפיה',
                          'מדעי המחשב',
                          'פסיכולוגיה',
                          'משפטים',
                          'סיעוד',
                          'מנהל עסקים',
                        ].includes(field.name),
                      )
                      .map((field) => [field.id, field.name]),
                  )}
                  selected={draft.fields}
                  onSelect={(id) => patch({ fields: toggle(draft.fields, id) })}
                />
                <details className="journey-field-group">
                  <summary>
                    לגלות לפי תחום
                    <ChevronDown size={18} />
                  </summary>
                  <div className="journey-category-grid">
                    {[...new Set(fields.map((field) => field.category))].map((category) => (
                      <details className="journey-field-group" key={category}>
                        <summary>
                          {category}
                          <ChevronDown size={18} aria-hidden="true" />
                        </summary>
                        <Chips
                          items={Object.fromEntries(
                            fields
                              .filter((field) => field.category === category)
                              .map((field) => [field.id, field.name]),
                          )}
                          selected={draft.fields}
                          onSelect={(id) => patch({ fields: toggle(draft.fields, id) })}
                        />
                      </details>
                    ))}
                  </div>
                </details>
              </>
            )}
            {continueButton(() => {
              setQuery('');
              go('regions');
            }, !draft.fields.length)}
          </section>
        )}
        {step === 'regions' && (
          <div className="journey-regions">
            <div>
              <h2>אזור לימודים</h2>
              <Chips
                items={LOCATIONS}
                selected={draft.locations}
                onSelect={(id) => patch({ locations: toggleLocation(draft.locations, id) })}
              />
              <h2>סוג מוסד</h2>
              <Chips items={INSTITUTION_TYPES} selected={draft.types} onSelect={setType} />
              {catalogueStatus}
              {continueButton(
                () =>
                  go(
                    draft.types.length === 1 && draft.types[0] === 'course'
                      ? 'results'
                      : 'grade-mode',
                  ),
                !draft.locations.length,
              )}
            </div>
            <JourneyRegionMap
              selected={draft.locations}
              counts={counts}
              onSelect={(id) => patch({ locations: toggleLocation(draft.locations, id) })}
            />
          </div>
        )}
        {step === 'grade-mode' && (
          <section className="journey-narrow">
            <div className="journey-choice-list">
              <button onClick={() => go('grades-quick')}>
                <strong>יש לי ממוצע בגרות</strong>
                <span>מזינים ממוצע וממשיכים</span>
                <ArrowLeft size={20} />
              </button>
              <button onClick={() => go('grades-exact')}>
                <strong>יש לי ציונים לפי מקצוע</strong>
                <span>מזינים ציונים או מעלים גיליון PDF</span>
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={() => {
                  submitBagrut('none');
                  go('psy-mode');
                }}
              >
                <strong>אין לי כרגע ציוני בגרות</strong>
                <span>ממשיכים לגלות אפשרויות</span>
                <ArrowLeft size={20} />
              </button>
            </div>
            <a
              className="journey-pill journey-grade-link"
              href="https://students.education.gov.il/certificates/grades-sheet"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Search size={16} aria-hidden="true" />
              לא זוכרים? למעבר לציונים
            </a>
          </section>
        )}
        {step === 'grades-quick' && (
          <form
            className="journey-narrow"
            onSubmit={(event) => {
              event.preventDefault();
              submitBagrut('quick', {
                weightedAverage: quickAverageValue ? Number(quickAverageValue) : undefined,
              });
              afterGrades();
            }}
          >
            <label className="journey-number-label">
              ממוצע בגרות
              <input
                type="number"
                inputMode="decimal"
                min={60}
                max={120}
                step="any"
                required
                value={quickAverageValue}
                onChange={(event) => patch({ quickInProgress: event.target.value })}
              />
            </label>
            <div className="journey-actions">
              <Primary />
            </div>
          </form>
        )}
        {step === 'grades-exact' && ready && (
          <JourneyExactGrades
            initialRecord={draft.scores.bagrut?.subjectRecord ?? draft.bagrutPaths?.subjectRecord}
            initialProgress={draft.exactInProgress}
            onProgress={saveExactProgress}
            onComplete={(record) => {
              submitBagrut('exact', { subjectRecord: record });
              afterGrades();
            }}
          />
        )}
        {step === 'psy-mode' && (
          <section className="journey-narrow">
            <div className="journey-choice-list">
              <button
                onClick={() => {
                  patch({ psyMode: 'score', target: undefined });
                  go('psy-score');
                }}
              >
                <strong>כן, יש לי ציון</strong>
                <ArrowLeft />
              </button>
              <button
                onClick={() => {
                  patch({
                    psyMode: 'target',
                    scores: { ...draft.scores, psychometric: undefined },
                  });
                  go('psy-target');
                }}
              >
                <strong>עוד לא, יש לי ציון יעד</strong>
                <ArrowLeft />
              </button>
              <button
                onClick={() => {
                  patch({
                    psyMode: 'none',
                    target: undefined,
                    scores: { ...draft.scores, psychometric: undefined },
                  });
                  go('review');
                }}
              >
                <strong>בלי פסיכומטרי כרגע</strong>
                <ArrowLeft />
              </button>
            </div>
          </section>
        )}
        {['psy-score', 'psy-target', 'improve'].includes(step) && (
          <form
            className="journey-narrow"
            onSubmit={(event) => {
              event.preventDefault();
              if (step === 'improve') go('plan');
              else go('review');
            }}
          >
            <label className="journey-number-label">
              {step === 'psy-score' ? 'ציון כללי' : 'ציון יעד'}
              <input
                type="number"
                inputMode="numeric"
                min={200}
                max={800}
                step={1}
                required
                value={
                  step === 'improve'
                    ? (simulation ?? '')
                    : step === 'psy-target'
                      ? (draft.target ?? '')
                      : (draft.scores.psychometric?.overall ?? '')
                }
                onChange={(event) => {
                  const value = event.target.value ? Number(event.target.value) : undefined;
                  if (step === 'improve') setSimulation(value);
                  else if (step === 'psy-target') patch({ target: value });
                  else
                    patchScores({ psychometric: { ...draft.scores.psychometric, overall: value } });
                }}
              />
            </label>
            {step === 'psy-score' && (
              <div className="journey-score-sections">
                {(
                  [
                    ['verbal', 'מילולי'],
                    ['quantitative', 'כמותי'],
                    ['english', 'אנגלית'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={50}
                      max={150}
                      step={1}
                      value={draft.scores.psychometric?.[key] ?? ''}
                      onChange={(event) =>
                        patchScores({
                          psychometric: {
                            ...draft.scores.psychometric,
                            [key]: event.target.value ? Number(event.target.value) : undefined,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            {step !== 'psy-score' && <p className="journey-helper">בדקו מה ציון היעד פותח לכם.</p>}
            <div className="journey-actions">
              <Primary>{step === 'improve' ? 'לבדוק את האפשרויות' : 'המשיכו'}</Primary>
            </div>
          </form>
        )}
        {step === 'review' && (
          <section className="journey-narrow">
            <div className="journey-review">
              {[
                [
                  'תחומי לימוד',
                  fields
                    .filter((field) => draft.fields.includes(field.id))
                    .map((field) => field.name)
                    .join(', ') || 'פתוח/ה להצעות',
                  'subjects',
                ],
                ['איפה לומדים', draft.locations.map((id) => LOCATIONS[id]).join(', '), 'regions'],
                [
                  'בגרות',
                  draft.gradeMode === 'quick'
                    ? `הזנתם ממוצע: ${journeyScores.bagrut?.weightedAverage ?? ''}`
                    : draft.gradeMode === 'exact'
                      ? `הזנתם ציונים ב-${journeyScores.bagrut?.subjectRecord?.subjects.length ?? 0} מקצועות`
                      : 'ללא ציון כרגע',
                  draft.gradeMode === 'exact'
                    ? 'grades-exact'
                    : draft.gradeMode === 'quick'
                      ? 'grades-quick'
                      : 'grade-mode',
                ],
                [
                  'פסיכומטרי',
                  draft.target
                    ? `ציון יעד: ${draft.target}`
                    : (draft.scores.psychometric?.overall ?? 'ללא ציון כרגע'),
                  'psy-mode',
                ],
              ].map(([label, value, target]) => (
                <div key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <button className="journey-text-button" onClick={() => go(target as Step)}>
                    עריכה
                  </button>
                </div>
              ))}
            </div>
            <p className="journey-helper">הממוצע של כל מוסד מופיע בתוצאות</p>
            <div className="journey-actions">
              <Primary onClick={startResults}>לגלות את האפשרויות שלי</Primary>
            </div>
          </section>
        )}
        {['results', 'plan'].includes(step) && (
          <section>
            {catalogueStatus}
            {(simulation ?? draft.target) && (
              <p className="journey-helper">בדיקה לפי ציון יעד {simulation ?? draft.target}</p>
            )}
            <div className="journey-results-tools">
              <div className="journey-segment" aria-label="קיבוץ תוצאות">
                <button aria-pressed={groupBy === 'field'} onClick={() => setGroupBy('field')}>
                  לפי תחום
                </button>
                <button
                  aria-pressed={groupBy === 'institution'}
                  onClick={() => setGroupBy('institution')}
                >
                  לפי מוסד
                </button>
              </div>
              <button
                className="journey-pill"
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={16} />
                סינון
              </button>
              {rows.some((row) => row.program.type === 'academic') && (
                <button className="journey-pill" onClick={() => go('improve')}>
                  מה אם אשפר ציון?
                </button>
              )}
            </div>
            {filtersOpen && (
              <div className="journey-filters">
                <label className="journey-search way-search-field">
                  <Search size={18} />
                  <input
                    className="way-input-unframed"
                    aria-label="חיפוש אפשרויות"
                    placeholder="תחום או מוסד"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <Chips
                  items={{
                    all: 'הכול',
                    match: 'מתאימות לי',
                    improve: 'עם שיפור ציון',
                    explore: 'עוד אפשרויות',
                  }}
                  selected={[resultFilter]}
                  onSelect={setResultFilter}
                />
              </div>
            )}
            {calculating && <p role="status">בודקים את ההתאמה לציונים שלכם…</p>}
            {failedReports.length > 0 && (
              <p role="alert">
                חלק מהחישובים לא נטענו.{' '}
                <button
                  className="journey-text-button"
                  onClick={() =>
                    void evaluate(
                      selectedRows.filter((row) => failedReports.includes(row.program.id)),
                      journeyScores,
                      simulation ?? draft.target,
                      true,
                    )
                  }
                >
                  לנסות שוב
                </button>
              </p>
            )}
            {!catalogueLoading && !catalogueError && !visibleRows.length && (
              <div className="journey-empty">
                <h2>לא נמצאו מסלולים בבחירה הזו</h2>
                <button className="journey-secondary" onClick={() => go('regions')}>
                  לשנות אזור או סוג מוסד
                </button>
                <button className="journey-text-button" onClick={() => go('subjects')}>
                  לבחור תחום אחר
                </button>
              </div>
            )}
            {groups.slice(0, resultLimit).map((group, index) => (
              <details
                className="journey-result-group"
                key={`${groupBy}:${group.id}`}
                open={groups.length === 1 || index === 0}
              >
                <summary>
                  <span>
                    {group.name}
                    <small>{group.rows.length} אפשרויות</small>
                  </span>
                  <ChevronDown size={20} />
                </summary>
                {group.rows.map(rowView)}
              </details>
            ))}
            {groups.length > resultLimit && (
              <button
                className="journey-secondary"
                onClick={() => setResultLimit(resultLimit + 10)}
              >
                עוד תחומים
              </button>
            )}
            {!!rows.length && (
              <div className="journey-actions">
                <button className="journey-secondary" onClick={() => go('saved')}>
                  לרשימה שלי
                </button>
                {rows.some((row) => row.program.type === 'academic') && (
                  <button className="journey-text-button" onClick={() => go('offer')}>
                    עזרה בהכנה לפסיכומטרי
                  </button>
                )}
              </div>
            )}
          </section>
        )}
        {['detail', 'alternatives'].includes(step) &&
          (activeRow ? (
            <section className="journey-narrow">
              <p className="journey-subtitle">{activeRow.institution.name}</p>
              {step === 'detail' ? (
                <>
                  <div className="journey-actions journey-detail-actions">
                    <Primary onClick={() => go('inquiry')}>קבלו שיחה מהמוסד</Primary>
                    <button
                      className="journey-secondary"
                      aria-pressed={
                        profile.savedProgramIds?.includes(activeRow.program.id) ?? false
                      }
                      onClick={() => void save(activeRow.program.id)}
                    >
                      {profile.savedProgramIds?.includes(activeRow.program.id)
                        ? 'הסרה מהרשימה'
                        : 'שמירה לרשימה'}
                    </button>
                  </div>
                  {description && !isBatchCUnsupported && <p>{description}</p>}
                  {!activeShowsNoCalculationNote && (
                    <span
                      className={`journey-status status-${isTechnionMedicineScore(activeRow.result, activeRow.program.id) && !activeRow.failed ? 'match' : resultLabel(activeRow.result, activeRow.failed, false, activeRow.program.id).group}`}
                    >
                      {calculating && !activeRow.result && !activeRow.failed
                        ? 'מחשבים התאמה…'
                        : resultLabel(
                            activeRow.result,
                            activeRow.failed,
                            false,
                            activeRow.program.id,
                          ).label}
                    </span>
                  )}
                  {isTechnionMedicineScore(activeRow.result, activeRow.program.id) ? (
                    <TechnionMedicineComparison score={activeRow.result.score} />
                  ) : biuFloorResult ? (
                    <p className="journey-result-explanation">
                      {biuFloorVerdict(biuFloorResult.floorChecks!)}
                    </p>
                  ) : (
                    resultExplanation(activeRow.result, activeRow.program.id) && (
                      <p className="journey-result-explanation">
                        {resultExplanation(activeRow.result, activeRow.program.id)}
                      </p>
                    )
                  )}
                  {!activeRow.result?.floorChecks && (
                    <AdmissionEstimate result={activeRow.result} />
                  )}
                  {!biuFloorResult && activeFootnote && (
                    <AdmissionConditions
                      conditions={activeRow.result?.additionalConditions}
                      footnote={activeFootnote}
                    />
                  )}
                  {activeRow.result?.score != null &&
                    !isTechnionMedicineScore(activeRow.result, activeRow.program.id) && (
                      <p>
                        {activeRow.result.scoreLabel ?? 'ציון מחושב'}:{' '}
                        {formatJourneyScore(activeRow.result.score)}
                        {activeRow.result.threshold != null &&
                          ` · סף: ${activeRow.result.threshold}`}
                      </p>
                    )}
                  {!biuFloorResult && !activeFootnote && (
                    <AdmissionConditions conditions={activeRow.result?.additionalConditions} />
                  )}
                  {activeRow.program.isListed !== false && (
                    <>
                      <h2>תנאי קבלה</h2>
                      {isBatchCUnsupported && (
                        <TechnionThresholdNotice
                          programId={activeRow.program.id}
                          institutionId={activeRow.institution.id}
                        />
                      )}
                      {activeRow.result?.floorChecks ? (
                        <AdmissionRequirements
                          requirements={[]}
                          programId={activeRow.program.id}
                          institutionId={activeRow.institution.id}
                          floorChecks={activeRow.result.floorChecks}
                        />
                      ) : isBatchCUnsupported ? (
                        <p>{activeRow.result?.nextAction}</p>
                      ) : (
                        <RequirementTiles
                          program={activeRow.program}
                          preserveRequirements
                          verificationIssue={activeRow.result?.degradationReason}
                          institutionId={activeRow.institution.id}
                          requirements={journeyAdmissionRequirements(
                            details?.specificAdmissionNotes,
                            activeRow.program,
                            activeRow.institution.id,
                          )}
                        />
                      )}
                    </>
                  )}
                  {biuFloorResult?.decision === 'below' &&
                    biuFloorResult.floorCaveats?.some((caveat) => caveat.kind === 'reservist') && (
                      <p className="mt-2 text-right text-xs text-[var(--text-muted)]" dir="rtl">
                        מילואימניקים: ייתכן מסלול קבלה ייעודי — כדאי לבדוק מול האוניברסיטה.
                      </p>
                    )}
                  {activeRow.result?.floorChecks && <AdmissionEstimate result={activeRow.result} />}
                  <div className="journey-links">
                    {!isBatchCUnsupported &&
                      !DANON_PROGRAM_URLS[activeRow.program.id] &&
                      activeRow.result?.degradationReason !==
                        'incomplete_published_requirements' && (
                        <>
                          {!activeShowsNoCalculationNote && (
                            <button onClick={() => go('missing')}>השלימו וקבלו תשובה</button>
                          )}
                          <button onClick={() => go('alternatives')}>עוד דרכי קבלה</button>
                        </>
                      )}
                    {activeSourceLinks
                      ? activeSourceLinks.map(({ href, label }) => (
                          <ProgramTrackedLink
                            key={href}
                            event="institution_site_clicked"
                            programId={activeRow.program.id}
                            institutionId={activeRow.institution.id}
                            target="_blank"
                            rel="noopener noreferrer"
                            href={href}
                          >
                            {label}
                          </ProgramTrackedLink>
                        ))
                      : activeOfficialUrl && (
                          <ProgramTrackedLink
                            event="institution_site_clicked"
                            programId={activeRow.program.id}
                            institutionId={activeRow.institution.id}
                            target="_blank"
                            rel="noopener noreferrer"
                            href={activeOfficialUrl}
                          >
                            לאתר המוסד
                          </ProgramTrackedLink>
                        )}
                    <ProgramShareButton
                      key={activeRow.program.id}
                      programId={activeRow.program.id}
                      institutionId={activeRow.institution.id}
                      title={activeRow.fieldName}
                    />
                  </div>
                </>
              ) : (
                <>
                  {details?.admissionAlternativePaths?.length ? (
                    details.admissionAlternativePaths.map((path) => (
                      <article className="journey-alternative" key={path.id}>
                        <h2>{path.title}</h2>
                        <p>{path.description}</p>
                        {officialUrl(path.url, activeRow.institution.id, {
                          fallbackToWebsite: false,
                        }) && (
                          <a
                            href={officialUrl(path.url, activeRow.institution.id, {
                              fallbackToWebsite: false,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            לפרטים במוסד
                          </a>
                        )}
                      </article>
                    ))
                  ) : (
                    <p>יש עוד דרכים להתקבל. השאירו פרטים והמוסד יחזור אליכם עם האפשרויות.</p>
                  )}
                  <Primary onClick={() => go('inquiry')}>קבלו שיחה מהמוסד</Primary>
                </>
              )}
            </section>
          ) : (
            <div className="journey-empty">
              <Primary onClick={() => go('results')}>בחירת מסלול</Primary>
            </div>
          ))}
        {step === 'inquiry' &&
          (activeRow ? (
            <section className="journey-narrow">
              <EnquiryForm
                key={activeRow.id}
                programId={activeRow.program.id}
                institutionId={activeRow.institution.id}
                evaluationInput={reports[activeRow.program.id]?.input}
                surface="journey"
                title={`${activeRow.fieldName} · ${activeRow.institution.name}`}
                onBack={() => go('results')}
              />
            </section>
          ) : (
            <Primary onClick={() => go('results')}>בחירת מסלול</Primary>
          ))}
        {step === 'offer' && (
          <section className="journey-narrow">
            <EnquiryForm
              programId="psychometric-preparation"
              institutionId=""
              surface="journey"
              title="הכנה לפסיכומטרי"
              onBack={() => go('results')}
            />
          </section>
        )}
        {step === 'saved' && (
          <section>
            {catalogueStatus}
            {calculating && <p role="status">בודקים את ההתאמה לציונים שלכם…</p>}
            {failedReports.length > 0 && (
              <p role="alert">
                חלק מהחישובים לא נטענו.{' '}
                <button
                  className="journey-text-button"
                  onClick={() =>
                    void evaluate(
                      savedRows.filter((row) => failedReports.includes(row.program.id)),
                      evaluationScores,
                      undefined,
                      true,
                    )
                  }
                >
                  לנסות שוב
                </button>
              </p>
            )}
            {!profile.savedProgramIds?.length ? (
              <div className="journey-empty">
                <Bookmark size={36} />
                <h2>כאן יישמרו המסלולים שמעניינים אתכם</h2>
                <Primary onClick={() => go('results')}>לגלות אפשרויות</Primary>
              </div>
            ) : (
              <>
                {savedRows.map((row) => (
                  <div className="journey-saved-row" key={row.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={compareIds.includes(row.id)}
                        disabled={compareIds.length >= 3 && !compareIds.includes(row.id)}
                        onChange={() => setCompareIds(toggle(compareIds, row.id))}
                      />
                      להשוואה
                    </label>
                    {rowView({
                      ...row,
                      result: reports[row.program.id]?.results.find(
                        (result) => result.linkedInstitutionId === row.institution.id,
                      ),
                      failed: failedReports.includes(row.program.id),
                    })}
                  </div>
                ))}
                <div className="journey-actions">
                  <Primary onClick={() => go('compare')} disabled={compareIds.length < 2}>
                    השוואת מסלולים
                  </Primary>
                </div>
              </>
            )}
            {!auth.user && (
              <p className="journey-helper">
                <Link href="/signup?next=%2F%23saved">
                  יצירת חשבון כדי לשמור את הרשימה גם במכשיר אחר
                </Link>
              </p>
            )}
          </section>
        )}
        {step === 'compare' && (
          <section className="journey-compare">
            {allRows
              .filter((row) => compareIds.includes(row.id))
              .map((row) => (
                <article key={row.id}>
                  <h2>{row.fieldName}</h2>
                  <p>{row.institution.name}</p>
                  {row.program.isListed !== false && (
                    <AdmissionRequirements
                      programId={row.program.id}
                      institutionId={row.institution.id}
                      requirements={journeyAdmissionRequirements(
                        row.program.institutionDetails?.find(
                          (detail) => detail.institutionName === row.institution.name,
                        )?.specificAdmissionNotes,
                        row.program,
                        row.institution.id,
                      )}
                    />
                  )}
                  {row.program.id === 'technion_ee' && (
                    <TechnionThresholdNotice
                      programId={row.program.id}
                      institutionId={row.institution.id}
                    />
                  )}
                  <Primary onClick={() => selectRow(row, 'inquiry')}>קבלו שיחה מהמוסד</Primary>
                </article>
              ))}
            {compareIds.length < 2 && (
              <Primary onClick={() => go('saved')}>לבחירת מסלולים להשוואה</Primary>
            )}
          </section>
        )}
        {step === 'missing' && (
          <AcademicProfileForm
            initialScores={draft.scores}
            isAuthenticated={!!auth.user}
            onClearLocalProfileData={clearLocalProfileData}
            onSkip={() => go('detail')}
            onComplete={async (scores) => {
              if (!(await updateProfile({ academicScores: scores }))) return false;
              patch({ scores });
              lastEvaluation.current = '';
              go('results');
              return true;
            }}
          />
        )}
        {step === 'questionnaire' && (
          <CareerAssessment
            initialDraft={quizDraft}
            onProgressChange={setQuizDraft}
            onComplete={async (scores, values, completedDraft) => {
              setQuizDraft(completedDraft);
              setRecommendations(getRecommendations(scores, values, undefined, [], programs));
              await updateProfile({
                assessmentProgress: {
                  schemaVersion: 1,
                  stage: 'completed',
                  scores,
                  values,
                  geographicPreference: 'any',
                  avoidances: [],
                },
              });
              go('quiz-result');
            }}
          />
        )}
        {step === 'quiz-result' && (
          <section className="journey-narrow">
            {recommendations.length ? (
              recommendations.slice(0, 5).map((recommendation) => (
                <article className="journey-recommendation" key={recommendation.id}>
                  <h2>{recommendation.name}</h2>
                  <p>{recommendation.matchReason}</p>
                  <button
                    className="journey-secondary"
                    onClick={() => {
                      patch({
                        fields: fields
                          .filter((field) =>
                            field.programs.some((program) =>
                              recommendation.suggestedDegreeIds.includes(program.id),
                            ),
                          )
                          .map((field) => field.id),
                      });
                      go('regions');
                    }}
                  >
                    לגלות מסלולים בתחום
                  </button>
                </article>
              ))
            ) : (
              <Primary onClick={() => go('questionnaire')}>לשאלון</Primary>
            )}
            <button className="journey-text-button" onClick={() => go('subjects')}>
              לבחור תחום אחר
            </button>
          </section>
        )}
        {step === 'account' && (
          <section className="journey-narrow">
            <p>{profile.firstName || auth.user?.email}</p>
            <div className="journey-choice-list">
              <button onClick={() => go('saved')}>
                הרשימה שלי
                <ArrowLeft />
              </button>
              <button onClick={() => go('grade-mode')}>
                הציונים שלי
                <ArrowLeft />
              </button>
            </div>
            <Link className="journey-text-button" href={ROUTES.profile}>
              הפרופיל שלי
            </Link>
            {auth.user ? (
              <button
                className="journey-text-button"
                onClick={async () => {
                  await auth.signOut();
                  go('home');
                }}
              >
                יציאה מהחשבון
              </button>
            ) : (
              <Link className="journey-text-button" href={buildLoginPath('/#account')}>
                כניסה לחשבון
              </Link>
            )}
          </section>
        )}
        {step === 'home' && browse}
      </main>
    </WayPageShell>
  );
}
