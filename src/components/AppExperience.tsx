'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import {
  ProfileScores,
  ValuesProfile,
  EngineeringOptions,
  RecommendedField,
  CalculatorScores,
  GeographicRegion,
  AvoidanceTag,
  AssessmentFilterDraft,
  AssessmentProgress,
  CareerAssessmentDraft,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { ROUTES, type AdmissionAlertTarget } from '@/lib/routes';
import AdmissionAlertManager from './AdmissionAlertManager';
import {
  CatalogueApiError,
  fetchCatalogueInstitutions,
  fetchCataloguePrograms,
} from '@/lib/catalogueClient';
import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { getRecommendations } from '@/utils/recommendationEngine';
import { extractFilterAnswers } from '@/utils/riasecEngine';
import { ArrowRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import PublicNavBar from '@/components/PublicNavBar';
import CareerAssessment from '@/components/CareerAssessment';
import OnboardingFunnel from '@/components/OnboardingFunnel';
import LandingPage from '@/components/LandingPage';
import AuthScreen from '@/components/AuthScreen';
import QuizIntro from '@/components/QuizIntro';
import AcademicProfileForm from '@/components/AcademicProfileForm';
import RecommendationResults from '@/components/RecommendationResults';
import BucketList from '@/components/BucketList';
import DegreePicker from '@/components/DegreePicker';
import StudyLocationStep from '@/components/StudyLocationStep';
import type { StudyRegionId } from '@/data/studyRegions';
import ScoreForm from '@/components/ScoreForm';
import CalculatorResults from '@/components/CalculatorResults';
import WayPageShell from '@/components/WayPageShell';
import type { AcademicScores, RiasecAnswers } from '@/types';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

type CatalogueStatus = 'loading' | 'ready' | 'error';

export type AppStep =
  | 'landing'
  | 'auth'
  | 'intro'
  | 'academic-profile'
  | 'career-assessment'
  | 'quick-filters'
  | 'recommendations'
  | 'calculator'
  | 'bucket-list'
  | 'degree-picker'
  | 'study-location'
  | 'calculator-results';

const APP_STEPS: AppStep[] = [
  'landing',
  'auth',
  'intro',
  'academic-profile',
  'career-assessment',
  'quick-filters',
  'recommendations',
  'calculator',
  'bucket-list',
  'degree-picker',
  'study-location',
  'calculator-results',
];
const ENABLE_DEV_SHORTCUTS = process.env.NODE_ENV !== 'production';

// Dev shortcut: ?step=<stepname> or ?screen=N (assessment only)
function getDevStep(fallback: AppStep): AppStep {
  if (!ENABLE_DEV_SHORTCUTS || typeof window === 'undefined') return fallback;
  const params = new URLSearchParams(window.location.search);
  if (params.has('screen')) return 'career-assessment';
  const s = params.get('step');
  return APP_STEPS.includes(s as AppStep) ? (s as AppStep) : fallback;
}

const DEV_PROFILE_SCORES: ProfileScores = {
  AN: 3,
  TE: 4,
  CR: 3,
  SO: 3,
  LE: 3,
  OR: 3,
  DI: 3,
  ER: 3,
};
const DEV_VALUES: ValuesProfile = {
  incomeVsImpact: 0,
  independenceVsTeam: 0,
  growthVsStability: 0,
  prestigeVsMeaning: 0,
};
const DEV_GEO: GeographicRegion = 'any';
const DEV_AVOIDANCES: AvoidanceTag[] = [];
const STATIC_CATALOGUE_PROGRAMS = getStaticCataloguePrograms();
const STATIC_CATALOGUE_INSTITUTIONS = getStaticCatalogueInstitutions();

function getUserInitials(email: string): string {
  const prefix = email.split('@')[0] ?? '';
  const parts = prefix.split(/[._-]/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  return prefix.slice(0, 2).toUpperCase();
}

function toCatalogueError(error: unknown): CatalogueApiError {
  if (error instanceof CatalogueApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new CatalogueApiError(error.message, { cause: error });
  }

  return new CatalogueApiError('Unable to load the catalogue.');
}

interface AppExperienceProps {
  initialStudyRegions?: StudyRegionId[];
  fromStudyLocation?: boolean;
  initialStep?: AppStep;
  enableDevShortcuts?: boolean;
  admissionAlertTarget?: AdmissionAlertTarget | null;
}

const DURABLE_STEP_ROUTES: Partial<Record<AppStep, string>> = {
  landing: ROUTES.home,
  intro: ROUTES.assessment,
  'academic-profile': ROUTES.profile,
  'career-assessment': ROUTES.assessment,
  recommendations: ROUTES.recommendations,
  calculator: ROUTES.calculator,
  'bucket-list': ROUTES.savedPrograms,
};

export default function AppExperience({
  initialStudyRegions = [],
  fromStudyLocation = false,
  initialStep: routeInitialStep = 'landing',
  enableDevShortcuts = false,
  admissionAlertTarget = null,
}: AppExperienceProps) {
  const router = useRouter();
  const { loading: authLoading, signOut, user } = useAuth();
  const [initialStep] = useState<AppStep>(routeInitialStep);
  const seedDevRecommendations = enableDevShortcuts && initialStep === 'recommendations';
  const [catalogueStatus, setCatalogueStatus] = useState<CatalogueStatus>('loading');
  const [catalogueError, setCatalogueError] = useState<CatalogueApiError | null>(null);
  const [catalogueInstitutions, setCatalogueInstitutions] = useState<CatalogueInstitution[]>(
    STATIC_CATALOGUE_INSTITUTIONS,
  );
  const [step, setStep] = useState<AppStep>(initialStep);
  const [recommendations, setRecommendations] = useState<RecommendedField[]>(() =>
    seedDevRecommendations
      ? getRecommendations(
          DEV_PROFILE_SCORES,
          DEV_VALUES,
          undefined,
          DEV_AVOIDANCES,
          STATIC_CATALOGUE_PROGRAMS,
        )
      : [],
  );
  const [cataloguePrograms, setCataloguePrograms] =
    useState<CatalogueProgram[]>(STATIC_CATALOGUE_PROGRAMS);
  const {
    clearLocalProfileData,
    profile,
    hydrated,
    initialProfileError,
    initialProfileStatus,
    isAuthenticated,
    removeSavedProgram,
    retryInitialProfileLoad,
    syncError,
    syncing,
    toggleSavedProgram,
    updateProfile,
  } = useUserProfile();

  const [pendingScores, setPendingScores] = useState<ProfileScores | null>(null);
  const [pendingValues, setPendingValues] = useState<ValuesProfile | null>(null);
  const [startingFreshAssessment, setStartingFreshAssessment] = useState(false);

  const [assessmentProfile, setAssessmentProfile] = useState<{
    scores: ProfileScores;
    values: ValuesProfile;
    geographicPreference: GeographicRegion;
  } | null>(() =>
    seedDevRecommendations
      ? {
          scores: DEV_PROFILE_SCORES,
          values: DEV_VALUES,
          geographicPreference: DEV_GEO,
        }
      : null,
  );
  const [recommendationRequest, setRecommendationRequest] = useState<{
    scores: ProfileScores;
    values: ValuesProfile;
    geographicPreference: GeographicRegion;
    avoidances: AvoidanceTag[];
  } | null>(() =>
    seedDevRecommendations
      ? {
          scores: DEV_PROFILE_SCORES,
          values: DEV_VALUES,
          geographicPreference: DEV_GEO,
          avoidances: DEV_AVOIDANCES,
        }
      : null,
  );

  const [selectedDegreeId, setSelectedDegreeId] = useState<string | null>(
    STATIC_CATALOGUE_PROGRAMS[0]?.id ?? null,
  );
  const calculatorInstitutions = getCalculatorInstitutionsFromCatalogue(catalogueInstitutions);
  const [bucketReturnsTo, setBucketReturnsTo] = useState<AppStep>(
    fromStudyLocation ? 'study-location' : 'recommendations',
  );
  const [studyRegions, setStudyRegions] = useState(initialStudyRegions);
  const [authReturnTo] = useState<Exclude<AppStep, 'auth'>>('landing');
  const [landingCalcScores, setLandingCalcScores] = useState<{
    psychometric?: number;
    bagrut?: number;
    degreeId: string;
  } | null>(null);

  const isComputerScienceAlertContinuation = Boolean(admissionAlertTarget);
  const [appCalcScores, setAppCalcScores] = useState<{
    psychometric?: number;
    bagrut?: number;
    degreeId: string;
  } | null>(null);

  useEffect(() => {
    if (!enableDevShortcuts) {
      return;
    }

    const devStep = getDevStep(routeInitialStep);
    if (devStep !== routeInitialStep) {
      setStep(devStep);
    }
  }, [enableDevShortcuts, routeInitialStep]);

  function navigateToStep(nextStep: AppStep, path = DURABLE_STEP_ROUTES[nextStep]) {
    setStep(nextStep);
    if (path) {
      if (nextStep === 'career-assessment') {
        window.history.pushState(null, '', path);
      } else {
        router.push(path);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    let isMounted = true;

    setCatalogueStatus('loading');
    setCatalogueError(null);

    Promise.all([fetchCataloguePrograms(), fetchCatalogueInstitutions()])
      .then(([programs, institutions]) => {
        if (!isMounted) {
          return;
        }

        setCataloguePrograms(programs);
        setCatalogueInstitutions(institutions);
        setSelectedDegreeId((current) =>
          current && programs.some((program) => program.id === current)
            ? current
            : (programs[0]?.id ?? null),
        );
        setCatalogueStatus('ready');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setCatalogueError(toCatalogueError(error));
        setCatalogueStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (catalogueStatus !== 'ready' || !recommendationRequest) {
      return;
    }

    setRecommendations(
      getRecommendations(
        recommendationRequest.scores,
        recommendationRequest.values,
        undefined,
        recommendationRequest.avoidances,
        cataloguePrograms,
      ),
    );
  }, [cataloguePrograms, catalogueStatus, recommendationRequest]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const savedProgress = profile.assessmentProgress;
    if (savedProgress?.stage === 'quick-filters') {
      setPendingScores(savedProgress.scores);
      setPendingValues(savedProgress.values);
    } else if (savedProgress?.stage === 'completed') {
      setPendingScores(savedProgress.scores);
      setPendingValues(savedProgress.values);
      setAssessmentProfile({
        scores: savedProgress.scores,
        values: savedProgress.values,
        geographicPreference: savedProgress.geographicPreference,
      });
      setRecommendationRequest({
        scores: savedProgress.scores,
        values: savedProgress.values,
        geographicPreference: savedProgress.geographicPreference,
        avoidances: savedProgress.avoidances,
      });
    }
  }, [hydrated, profile.assessmentProgress]);

  function handleCareerProgress(careerDraft: CareerAssessmentDraft) {
    setStartingFreshAssessment(false);
    void updateProfile({
      assessmentProgress: {
        schemaVersion: 1,
        stage: 'career-assessment',
        careerDraft,
      },
    });
  }

  async function handleAssessmentComplete(
    profileScores: ProfileScores,
    valuesProfile: ValuesProfile,
    careerDraft: CareerAssessmentDraft,
  ) {
    const filterDraft: AssessmentFilterDraft = { currentStep: 0, answers: {} };
    const saved = await updateProfile({
      assessmentProgress: {
        schemaVersion: 1,
        stage: 'quick-filters',
        careerDraft,
        filterDraft,
        scores: profileScores,
        values: valuesProfile,
      },
    });
    if (!saved) {
      return false;
    }

    posthog.capture('assessment_completed', {
      top_dimension: Object.entries(profileScores).sort((a, b) => b[1] - a[1])[0]?.[0],
    });
    setPendingScores(profileScores);
    setPendingValues(valuesProfile);
    setStep('quick-filters');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function handleFilterProgress(filterDraft: AssessmentFilterDraft) {
    const savedProgress = profile.assessmentProgress;
    if (savedProgress?.stage !== 'quick-filters' || !pendingScores || !pendingValues) {
      return;
    }

    void updateProfile({
      assessmentProgress: {
        ...savedProgress,
        filterDraft,
        scores: pendingScores,
        values: pendingValues,
      },
    });
  }

  async function handleFiltersComplete(
    rawAnswers: RiasecAnswers,
    _filterDraft: AssessmentFilterDraft,
  ) {
    const { geographicPreference, avoidances } = extractFilterAnswers(rawAnswers);
    const scores = pendingScores ?? {
      AN: 0,
      TE: 0,
      CR: 0,
      SO: 0,
      LE: 0,
      OR: 0,
      DI: 0,
      ER: 0,
    };
    const values = pendingValues ?? {
      incomeVsImpact: 0,
      independenceVsTeam: 0,
      growthVsStability: 0,
      prestigeVsMeaning: 0,
    };

    const assessmentProgress: AssessmentProgress = {
      schemaVersion: 1,
      stage: 'completed',
      scores,
      values,
      geographicPreference,
      avoidances,
    };
    const saved = await updateProfile({ geographicPreference, assessmentProgress });
    if (!saved) {
      return false;
    }

    posthog.capture('quick_filters_completed', {
      geographic_preference: geographicPreference,
      avoidances_count: avoidances.length,
    });
    posthog.capture('recommendations_viewed', {
      geographic_preference: geographicPreference,
    });
    setAssessmentProfile({ scores, values, geographicPreference });
    setRecommendationRequest({ scores, values, geographicPreference, avoidances });
    setRecommendations(
      catalogueStatus === 'ready'
        ? getRecommendations(scores, values, undefined, avoidances, cataloguePrograms)
        : [],
    );
    setAppCalcScores(null);
    setBucketReturnsTo('recommendations');
    navigateToStep('recommendations');
    return true;
  }

  function handleResumeAssessment() {
    const savedProgress = profile.assessmentProgress;
    if (!savedProgress) {
      return;
    }

    setStartingFreshAssessment(false);

    if (savedProgress.stage === 'career-assessment') {
      setStep('career-assessment');
    } else if (savedProgress.stage === 'quick-filters') {
      setPendingScores(savedProgress.scores);
      setPendingValues(savedProgress.values);
      setStep('quick-filters');
    } else {
      setAssessmentProfile({
        scores: savedProgress.scores,
        values: savedProgress.values,
        geographicPreference: savedProgress.geographicPreference,
      });
      setRecommendationRequest({
        scores: savedProgress.scores,
        values: savedProgress.values,
        geographicPreference: savedProgress.geographicPreference,
        avoidances: savedProgress.avoidances,
      });
      navigateToStep('recommendations');
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleStartAssessmentOver() {
    const saved = await updateProfile({ assessmentProgress: undefined });
    if (!saved) {
      return false;
    }

    setPendingScores(null);
    setPendingValues(null);
    setAssessmentProfile(null);
    setRecommendationRequest(null);
    setRecommendations([]);
    setAppCalcScores(null);
    setStartingFreshAssessment(true);
    navigateToStep('career-assessment');
    return true;
  }

  function handleToggleSave(programId: string) {
    const isSaved = profile.savedProgramIds?.includes(programId) ?? false;
    if (!isSaved) {
      posthog.capture('program_saved', { program_id: programId });
    }
    void toggleSavedProgram(programId);
  }

  function handleToggleProgramGroup(programIds: string[]) {
    const currentIds = profile.savedProgramIds ?? [];
    const currentSet = new Set(currentIds);
    const allSaved = programIds.every((programId) => currentSet.has(programId));
    const nextSavedProgramIds = allSaved
      ? currentIds.filter((programId) => !programIds.includes(programId))
      : Array.from(new Set([...currentIds, ...programIds]));

    posthog.capture(allSaved ? 'degree_group_removed_from_bucket' : 'degree_group_saved', {
      program_count: programIds.length,
    });

    void updateProfile({ savedProgramIds: nextSavedProgramIds });
  }

  function handleRemoveFromBucket(programId: string) {
    posthog.capture('program_removed_from_bucket', { program_id: programId });
    void removeSavedProgram(programId);
  }

  function handleSelectDegree(degreeId: string) {
    posthog.capture('degree_selected_for_calculator', { degree_id: degreeId });
    setSelectedDegreeId(degreeId);
    setAppCalcScores(null);
    navigateToStep('calculator');
  }

  function handleGoHome() {
    setAppCalcScores(null);
    navigateToStep('landing');
  }

  const previousStep: Record<AppStep, AppStep | null> = {
    landing: null,
    auth: authReturnTo,
    intro: 'landing',
    'academic-profile': 'intro',
    'career-assessment': 'academic-profile',
    'quick-filters': 'career-assessment',
    recommendations: 'quick-filters',
    calculator: 'recommendations',
    'bucket-list': bucketReturnsTo,
    'degree-picker': 'landing',
    'study-location': 'degree-picker',
    'calculator-results': 'landing',
  };

  function handleGoBack() {
    const prev = previousStep[step];
    if (!prev) return;
    if (prev === 'recommendations' || prev === 'quick-filters') setAppCalcScores(null);
    navigateToStep(prev);
  }

  const showBackButton = step !== 'landing' && step !== 'auth';

  const BackButton = () =>
    showBackButton ? (
      <button
        type="button"
        onClick={handleGoBack}
        aria-label="חזרה לעמוד הקודם"
        title="חזרה לעמוד הקודם"
        className="way-button-secondary flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition"
      >
        <ArrowRight size={18} />
        <span>חזרה</span>
      </button>
    ) : null;

  function renderCatalogueState(title: string, description: string) {
    if (catalogueStatus === 'loading') {
      return (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-500">{description}</p>
          </div>
        </section>
      );
    }

    if (catalogueStatus === 'error') {
      return (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border border-rose-200 bg-rose-50 px-8 py-16 text-center shadow-sm">
          <div className="rounded-full bg-white px-4 py-1 text-xs font-semibold text-rose-700">
            קטלוג לא זמין
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">לא הצלחנו לטעון את קטלוג התארים</h2>
            <p className="mt-1.5 text-sm text-slate-600">{catalogueError?.message}</p>
            {catalogueError?.details[0] ? (
              <p className="mt-2 text-sm text-slate-500">{catalogueError.details[0]}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleGoHome}
            className="way-button-primary px-5 py-2.5 text-sm font-semibold transition"
          >
            חזרה לעמוד הבית
          </button>
        </section>
      );
    }

    return null;
  }

  function handleCalculate(
    scores: CalculatorScores,
    degreeId: string,
    _engineering: EngineeringOptions,
  ) {
    posthog.capture('degree_calculator_submitted', {
      degree_id: degreeId,
    });
    setAppCalcScores({
      psychometric: scores.psychometric,
      bagrut: scores.bagrut,
      degreeId,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const savedCount = profile.savedProgramIds?.length ?? 0;

  function renderStep(content: ReactNode, showBack = true) {
    return (
      <WayPageShell
        navigation={
          <PublicNavBar
            authLoading={authLoading}
            isAuthenticated={isAuthenticated}
            savedCount={savedCount}
            userEmail={user?.email ?? undefined}
            onGoHome={handleGoHome}
            onGoToBucket={() => navigateToStep('bucket-list')}
            onStartClick={() => navigateToStep('intro')}
            onSignIn={() => router.push(ROUTES.login)}
            onSignOut={() => {
              void signOut();
            }}
          />
        }
      >
        {showBack ? (
          <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
            <BackButton />
          </div>
        ) : null}
        {content}
      </WayPageShell>
    );
  }

  /* Workflow steps share the same navigation and page background. */
  if (step === 'landing') {
    return (
      <LandingPage
        onAlreadyKnow={() => {
          posthog.capture('landing_cta_clicked', { cta: 'already_know' });
          setBucketReturnsTo('degree-picker');
          navigateToStep('degree-picker');
        }}
        onNeedHelp={() => {
          posthog.capture('landing_cta_clicked', { cta: 'need_help' });
          setBucketReturnsTo('recommendations');
          navigateToStep('intro');
        }}
        onSignIn={() => {
          router.push(ROUTES.login);
        }}
        onGoToBucket={() => {
          setBucketReturnsTo('landing');
          navigateToStep('bucket-list');
        }}
        onCalculate={(psychometric, bagrut, degreeId) => {
          posthog.capture('landing_calculator_submitted', {
            degree_id: degreeId,
          });
          setLandingCalcScores({ psychometric, bagrut, degreeId });
          setStep('calculator-results');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onGoToProfile={() => {
          navigateToStep('academic-profile');
        }}
        programs={cataloguePrograms}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        savedCount={savedCount}
        userInitials={user?.email ? getUserInitials(user.email) : undefined}
        userEmail={user?.email ?? undefined}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (step === 'calculator-results' && landingCalcScores) {
    return renderStep(
      <CalculatorResults
        psychometric={landingCalcScores.psychometric}
        bagrut={landingCalcScores.bagrut}
        degreeId={landingCalcScores.degreeId}
        programs={cataloguePrograms}
        academicScores={profile.academicScores}
        onCompleteAcademicProfile={() => navigateToStep('academic-profile')}
        onBack={() => {
          navigateToStep('landing');
        }}
      />,
      false,
    );
  }

  if (step === 'auth') {
    return (
      <AuthScreen
        onBack={() => navigateToStep(authReturnTo)}
        onSuccess={() => {
          navigateToStep(authReturnTo);
        }}
      />
    );
  }

  if (step === 'degree-picker') {
    return renderStep(
      <>
        {syncError && (
          <div className="mx-auto w-full max-w-xl px-4 pt-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-md">
              {syncError}
            </div>
          </div>
        )}
        {catalogueStatus === 'ready' ? (
          <DegreePicker
            programs={cataloguePrograms}
            savedProgramIds={profile.savedProgramIds ?? []}
            onToggleProgramGroup={handleToggleProgramGroup}
            onDone={() => navigateToStep('study-location')}
          />
        ) : (
          <div className="px-4 py-10 sm:px-6">
            {renderCatalogueState(
              'טוענים את קטלוג התארים',
              'רק לאחר שהקטלוג ייטען אפשר לבחור תארים להשוואה.',
            )}
          </div>
        )}
      </>,
    );
  }

  if (step === 'study-location') {
    return renderStep(
      <>
        {syncError && (
          <div className="mx-auto w-full max-w-xl px-4 pt-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-md">
              {syncError}
            </div>
          </div>
        )}
        {catalogueStatus === 'ready' ? (
          <StudyLocationStep
            programs={cataloguePrograms}
            savedProgramIds={profile.savedProgramIds ?? []}
            catalogueInstitutions={catalogueInstitutions}
            onBack={() => navigateToStep('degree-picker')}
            onDone={(selection) => {
              posthog.capture('study_location_selected', {
                all_regions: selection.allRegions,
                region_count: selection.allRegions ? 'all' : selection.regionIds.length,
                regions: selection.regionIds,
              });
              setBucketReturnsTo('study-location');
              const regions = selection.allRegions ? [] : selection.regionIds;
              setStudyRegions(regions);
              const query = new URLSearchParams({
                from: 'study-location',
                regions: regions.join(','),
              });
              navigateToStep('bucket-list', `${ROUTES.savedPrograms}?${query}`);
            }}
          />
        ) : (
          <div className="px-4 py-10 sm:px-6">
            {renderCatalogueState(
              'טוענים את אזורי הלימוד',
              'רק לאחר שהקטלוג ייטען אפשר להציג את מפת האפשרויות לפי התארים שבחרת.',
            )}
          </div>
        )}
      </>,
      false,
    );
  }

  if (step === 'intro') {
    if (!hydrated || syncing) {
      return (
        <div className="min-h-screen bg-[#f5f4f0] px-4 py-24 text-center text-sm text-slate-600">
          מסנכרנים את השאלון שלך...
        </div>
      );
    }

    if (profile.assessmentProgress) {
      return (
        <>
          <BackButton />
          <div
            dir="rtl"
            className="flex min-h-screen items-center justify-center bg-[#f5f4f0] px-4 py-12"
          >
            <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-10">
              <p className="text-sm font-semibold text-indigo-600">מצאנו שאלון שמור</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                {profile.assessmentProgress.stage === 'completed'
                  ? 'ההמלצות שלך מוכנות'
                  : 'אפשר להמשיך בדיוק מאיפה שהפסקת'}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                ההתקדמות נשמרה. אפשר להמשיך אותה, או להתחיל שאלון חדש בלי למחוק ציונים, תוכניות
                שמורות, מסמכים או התראות.
              </p>
              {syncError ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {syncError}
                </p>
              ) : null}
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleResumeAssessment}
                  className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  להמשיך מאיפה שהפסקתי
                </button>
                <button
                  type="button"
                  onClick={() => void handleStartAssessmentOver()}
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  להתחיל מחדש
                </button>
              </div>
            </section>
          </div>
        </>
      );
    }

    return (
      <QuizIntro
        onStart={() => navigateToStep('academic-profile')}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        savedCount={savedCount}
        userInitials={user?.email ? getUserInitials(user.email) : undefined}
        userEmail={user?.email ?? undefined}
        onGoHome={() => navigateToStep('landing')}
        onGoToBucket={() => {
          setBucketReturnsTo('intro');
          navigateToStep('bucket-list');
        }}
        onSignIn={() => {
          router.push(ROUTES.login);
        }}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (step === 'academic-profile' && initialProfileStatus !== 'ready') {
    return (
      <>
        <BackButton />
        <div className="mx-auto my-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {initialProfileStatus === 'error' ? (
            <>
              <h1 className="text-base font-bold text-slate-900">לא הצלחנו לטעון את הפרופיל שלך</h1>
              <p className="mt-2 text-sm text-slate-600">
                {initialProfileError ?? 'בדוק את החיבור ונסה שוב כדי לשמור על הנתונים הקיימים שלך.'}
              </p>
              <button
                type="button"
                onClick={retryInitialProfileLoad}
                className="mt-4 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                נסו שוב
              </button>
            </>
          ) : (
            <p role="status" className="text-sm text-slate-600">
              טוענים את הנתונים השמורים שלך…
            </p>
          )}
        </div>
      </>
    );
  }

  if (step === 'academic-profile') {
    return renderStep(
      <>
        <AcademicProfileForm
          initialScores={profile.academicScores}
          initialDocuments={profile.uploadedDocuments}
          isAuthenticated={isAuthenticated}
          onClearLocalProfileData={clearLocalProfileData}
          alertContinuation={
            isComputerScienceAlertContinuation
              ? {
                  title: `נשמור את הפרופיל ואז נחזור לבדיקת הקבלה למדעי המחשב ב${admissionAlertTarget?.institutionId === 'bgu' ? 'אוניברסיטת בן־גוריון' : 'אוניברסיטת תל אביב'}`,
                  submitLabel: 'שמור והמשך לבדיקת המעקב ←',
                  requiresStructuredBagrut: true,
                }
              : undefined
          }
          onComplete={async (scores: AcademicScores) => {
            posthog.capture('academic_profile_completed', {
              has_psychometric: !!scores.psychometric?.overall,
              has_bagrut: !!scores.bagrut?.weightedAverage,
            });
            const profileSaved = await updateProfile({ academicScores: scores });
            if (!profileSaved) {
              return false;
            }
            if (
              isComputerScienceAlertContinuation &&
              admissionAlertTarget &&
              scores.psychometric?.overall !== undefined &&
              scores.bagrut?.weightedAverage !== undefined
            ) {
              setLandingCalcScores({
                psychometric: scores.psychometric.overall,
                bagrut: scores.bagrut.weightedAverage,
                degreeId: admissionAlertTarget.programId,
              });
              setStep('calculator-results');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return true;
            }
            navigateToStep('career-assessment');
            return true;
          }}
          onSkip={() => {
            posthog.capture('academic_profile_skipped');
            navigateToStep('career-assessment');
          }}
        />
        {user ? <AdmissionAlertManager key={user.id} userId={user.id} /> : null}
      </>,
    );
  }

  if (step === 'career-assessment') {
    const savedProgress = profile.assessmentProgress;
    const initialDraft =
      !startingFreshAssessment &&
      (savedProgress?.stage === 'career-assessment' || savedProgress?.stage === 'quick-filters')
        ? savedProgress.careerDraft
        : undefined;
    return renderStep(
      <>
        {syncError ? (
          <div className="fixed top-20 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-md">
              {syncError}
            </div>
          </div>
        ) : null}
        <CareerAssessment
          initialDraft={initialDraft}
          onProgressChange={handleCareerProgress}
          onComplete={handleAssessmentComplete}
        />
      </>,
    );
  }

  if (step === 'quick-filters') {
    const savedProgress = profile.assessmentProgress;
    return renderStep(
      <>
        {syncError ? (
          <div className="fixed top-20 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-md">
              {syncError}
            </div>
          </div>
        ) : null}
        <OnboardingFunnel
          initialDraft={
            savedProgress?.stage === 'quick-filters' ? savedProgress.filterDraft : undefined
          }
          onProgressChange={handleFilterProgress}
          onComplete={handleFiltersComplete}
        />
      </>,
    );
  }

  /* ── Steps with persistent header ───────────────────────────────────────── */
  // Source-aware: only navigate to recommendations when the user has a
  // saved assessment profile (i.e. came through the questionnaire). Degree-picker users
  // have no assessmentProfile — route them back to degree-picker instead.
  function handleGoToRecommendations() {
    if (!assessmentProfile) {
      navigateToStep(bucketReturnsTo === 'degree-picker' ? 'degree-picker' : 'landing');
      return;
    }
    setAppCalcScores(null);
    navigateToStep('recommendations');
  }

  const shouldBlockCatalogueStep =
    catalogueStatus !== 'ready' &&
    (step === 'recommendations' || step === 'bucket-list' || step === 'calculator');
  return (
    <WayPageShell
      navigation={
        <NavBar
          step={step}
          savedCount={savedCount}
          authLoading={authLoading}
          isAuthenticated={isAuthenticated}
          userInitials={user?.email ? getUserInitials(user.email) : undefined}
          onGoHome={handleGoHome}
          onGoToExam={() => {
            void handleStartAssessmentOver();
          }}
          onGoToRecommendations={handleGoToRecommendations}
          onGoToBucket={() => navigateToStep('bucket-list')}
          onGoToAuth={() => {
            const nextPath = DURABLE_STEP_ROUTES[step] ?? ROUTES.home;
            router.push(`${ROUTES.login}?next=${encodeURIComponent(nextPath)}`);
          }}
          onSignOut={() => {
            void signOut();
          }}
          bucketSourceLabel={bucketReturnsTo === 'degree-picker' ? 'בחירת תארים' : 'המלצות'}
          onGoToBucketSource={() => {
            setAppCalcScores(null);
            navigateToStep(bucketReturnsTo);
          }}
        />
      }
    >
      {step !== 'bucket-list' && !(step === 'calculator' && appCalcScores) ? (
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <BackButton />
        </div>
      ) : null}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6">
        {!hydrated || syncing ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            מסנכרנים את הפרופיל שלך...
          </div>
        ) : null}

        {syncError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {syncError}
          </div>
        ) : null}

        {shouldBlockCatalogueStep
          ? renderCatalogueState(
              'טוענים את הקטלוג',
              'הקטלוג נטען דרך ה-API לפני שאפשר להציג המלצות, מחשבון או רשימת ייעוד.',
            )
          : null}

        {/* ── Step: Recommendations ─────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'recommendations' && assessmentProfile && (
          <RecommendationResults
            programs={cataloguePrograms}
            recommendations={recommendations}
            onSelectDegree={handleSelectDegree}
            profileScores={assessmentProfile.scores}
            geographicPreference={assessmentProfile.geographicPreference}
            savedProgramIds={profile.savedProgramIds}
            onToggleSave={handleToggleSave}
          />
        )}

        {!shouldBlockCatalogueStep &&
          step === 'recommendations' &&
          hydrated &&
          !syncing &&
          !assessmentProfile && (
            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 text-center shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-slate-900">
                כדי להציג המלצות צריך להשלים שאלון
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                הקישור הזה מוביל לאזור ההמלצות, אבל ההמלצות עצמן נבנות מנתוני השאלון המקומיים שלך.
              </p>
              <button
                type="button"
                onClick={() => navigateToStep('intro')}
                className="way-button-primary mt-5 px-5 py-2.5 text-sm font-semibold transition"
              >
                להתחיל שאלון
              </button>
            </section>
          )}

        {/* ── Step: Bucket List ─────────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'bucket-list' && (
          <BucketList
            initialRegions={studyRegions}
            onRegionsChange={(regions) => {
              setStudyRegions(regions);
              const url = new URL(window.location.href);
              url.searchParams.set('regions', regions.join(','));
              window.history.replaceState(null, '', url);
            }}
            programs={cataloguePrograms}
            calculatorInstitutions={calculatorInstitutions}
            catalogueInstitutions={catalogueInstitutions}
            savedProgramIds={profile.savedProgramIds ?? []}
            academicScores={profile.academicScores}
            onRemove={handleRemoveFromBucket}
            onBack={() => {
              setAppCalcScores(null);
              navigateToStep(bucketReturnsTo);
            }}
            backLabel={
              bucketReturnsTo === 'study-location'
                ? 'חזרה לבחירת אזור'
                : bucketReturnsTo === 'degree-picker'
                  ? 'חזרה לבחירת תארים'
                  : 'חזרה להמלצות'
            }
            emptyCtaLabel={
              bucketReturnsTo === 'degree-picker' ? 'חזור לבחור תארים ←' : 'עבור להמלצות ←'
            }
            isAuthenticated={isAuthenticated}
            onSignIn={() => {
              router.push(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.savedPrograms)}`);
            }}
            onContinueAsGuest={() => {
              setBucketReturnsTo('degree-picker');
              navigateToStep('degree-picker');
            }}
          />
        )}

        {/* ── Step: Calculator ──────────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'calculator' && (
          <>
            {appCalcScores ? (
              <CalculatorResults
                psychometric={appCalcScores.psychometric}
                bagrut={appCalcScores.bagrut}
                degreeId={appCalcScores.degreeId}
                programs={cataloguePrograms}
                academicScores={profile.academicScores}
                onCompleteAcademicProfile={() => navigateToStep('academic-profile')}
                onBack={() => setAppCalcScores(null)}
              />
            ) : (
              <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-1 text-lg font-semibold text-gray-800">הזן את הנתונים שלך</h2>
                <p className="mb-6 text-sm text-gray-400">
                  הממוצע בגרות כולל בונוסים (למשל מתמטיקה 5 יח׳ מוסיפה עד 35 נקודות).
                </p>
                {cataloguePrograms.length > 0 ? (
                  <ScoreForm
                    programs={cataloguePrograms}
                    onSubmit={handleCalculate}
                    defaultDegreeId={selectedDegreeId ?? undefined}
                    defaultPsychometric={profile.academicScores?.psychometric?.overall}
                    defaultBagrut={profile.academicScores?.bagrut?.weightedAverage}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    אין כרגע תוכניות עם מחשבון קבלה זמין בקטלוג.
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </WayPageShell>
  );
}
