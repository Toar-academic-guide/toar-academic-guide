'use client';

import { useEffect, useState, type ReactNode } from 'react';
import posthog from 'posthog-js';
import {
  ProfileScores,
  ValuesProfile,
  EngineeringOptions,
  RecommendedField,
  UniversityResult,
  UserScores,
  GeographicRegion,
  AvoidanceTag,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import {
  CatalogueApiError,
  fetchCatalogueInstitutions,
  fetchCataloguePrograms,
} from '@/lib/catalogueClient';
import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { getRecommendations } from '@/utils/recommendationEngine';
import { getUserInitials } from '@/utils/userDisplay';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import { extractFilterAnswers } from '@/utils/riasecEngine';
import { ArrowRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import CareerAssessment from '@/components/CareerAssessment';
import OnboardingFunnel from '@/components/OnboardingFunnel';
import LandingPage from '@/components/LandingPage';
import AuthScreen from '@/components/AuthScreen';
import QuizIntro from '@/components/QuizIntro';
import AcademicProfileForm from '@/components/AcademicProfileForm';
import RecommendationResults from '@/components/RecommendationResults';
import BucketList from '@/components/BucketList';
import DegreePicker from '@/components/DegreePicker';
import ScoreForm from '@/components/ScoreForm';
import ResultsDashboard from '@/components/ResultsDashboard';
import CalculatorResults from '@/components/CalculatorResults';
import WayPageShell from '@/components/WayPageShell';
import type { AcademicScores, RiasecAnswers } from '@/types';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

type CatalogueStatus = 'loading' | 'ready' | 'error';

type AppStep =
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
  'calculator-results',
];
const ENABLE_DEV_SHORTCUTS = process.env.NODE_ENV !== 'production';

// Dev shortcut: ?step=<stepname> or ?screen=N (assessment only)
function getDevStep(): AppStep {
  if (!ENABLE_DEV_SHORTCUTS || typeof window === 'undefined') return 'landing';
  const params = new URLSearchParams(window.location.search);
  if (params.has('screen')) return 'career-assessment';
  const s = params.get('step');
  return APP_STEPS.includes(s as AppStep) ? (s as AppStep) : 'landing';
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

function toCatalogueError(error: unknown): CatalogueApiError {
  if (error instanceof CatalogueApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new CatalogueApiError(error.message, { cause: error });
  }

  return new CatalogueApiError('Unable to load the catalogue.');
}

function AppSurface({
  children,
  className = '',
  showLogo = false,
}: {
  children: ReactNode;
  className?: string;
  showLogo?: boolean;
}) {
  return (
    <WayPageShell className={className} showLogo={showLogo}>
      {children}
    </WayPageShell>
  );
}

export default function Home() {
  const { loading: authLoading, signOut, user } = useAuth();
  const userInitials = getUserInitials(user);
  const [catalogueStatus, setCatalogueStatus] = useState<CatalogueStatus>('loading');
  const [catalogueError, setCatalogueError] = useState<CatalogueApiError | null>(null);
  const [catalogueInstitutions, setCatalogueInstitutions] = useState<CatalogueInstitution[]>(
    STATIC_CATALOGUE_INSTITUTIONS,
  );
  const [step, setStep] = useState<AppStep>('landing');
  const [recommendations, setRecommendations] = useState<RecommendedField[]>([]);
  const [cataloguePrograms, setCataloguePrograms] =
    useState<CatalogueProgram[]>(STATIC_CATALOGUE_PROGRAMS);
  const {
    clearLocalProfileData,
    profile,
    hydrated,
    isAuthenticated,
    removeSavedProgram,
    syncError,
    syncing,
    toggleSavedProgram,
    updateProfile,
  } = useUserProfile();

  const [pendingScores, setPendingScores] = useState<ProfileScores | null>(null);
  const [pendingValues, setPendingValues] = useState<ValuesProfile | null>(null);

  const [assessmentProfile, setAssessmentProfile] = useState<{
    scores: ProfileScores;
    values: ValuesProfile;
    geographicPreference: GeographicRegion;
  } | null>(null);
  const [recommendationRequest, setRecommendationRequest] = useState<{
    scores: ProfileScores;
    values: ValuesProfile;
    geographicPreference: GeographicRegion;
    avoidances: AvoidanceTag[];
  } | null>(null);

  const [selectedDegreeId, setSelectedDegreeId] = useState<string | null>(
    STATIC_CATALOGUE_PROGRAMS[0]?.id ?? null,
  );
  const [results, setResults] = useState<UniversityResult[] | null>(null);
  const [degreeName, setDegreeName] = useState('');
  const calculatorInstitutions = getCalculatorInstitutionsFromCatalogue(catalogueInstitutions);
  const [bucketReturnsTo, setBucketReturnsTo] = useState<AppStep>('recommendations');
  const [authReturnTo, setAuthReturnTo] = useState<Exclude<AppStep, 'auth'>>('landing');
  const [landingCalcScores, setLandingCalcScores] = useState<{
    psychometric: number;
    bagrut: number;
    degreeId: string;
  } | null>(null);

  useEffect(() => {
    const devStep = getDevStep();
    if (devStep === 'landing') {
      return;
    }

    setStep(devStep);

    if (devStep === 'recommendations') {
      setAssessmentProfile({
        scores: DEV_PROFILE_SCORES,
        values: DEV_VALUES,
        geographicPreference: DEV_GEO,
      });
      setRecommendationRequest({
        scores: DEV_PROFILE_SCORES,
        values: DEV_VALUES,
        geographicPreference: DEV_GEO,
        avoidances: DEV_AVOIDANCES,
      });
      setRecommendations(
        getRecommendations(
          DEV_PROFILE_SCORES,
          DEV_VALUES,
          undefined,
          DEV_AVOIDANCES,
          STATIC_CATALOGUE_PROGRAMS,
        ),
      );
    }
  }, []);

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

  function handleAssessmentComplete(profileScores: ProfileScores, valuesProfile: ValuesProfile) {
    posthog.capture('assessment_completed', {
      top_dimension: Object.entries(profileScores).sort((a, b) => b[1] - a[1])[0]?.[0],
    });
    setPendingScores(profileScores);
    setPendingValues(valuesProfile);
    setStep('quick-filters');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFiltersComplete(rawAnswers: RiasecAnswers) {
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

    posthog.capture('quick_filters_completed', {
      geographic_preference: geographicPreference,
      avoidances_count: avoidances.length,
    });
    posthog.capture('recommendations_viewed', {
      geographic_preference: geographicPreference,
    });
    updateProfile({ geographicPreference });
    setAssessmentProfile({ scores, values, geographicPreference });
    setRecommendationRequest({ scores, values, geographicPreference, avoidances });
    setRecommendations(
      catalogueStatus === 'ready'
        ? getRecommendations(scores, values, undefined, avoidances, cataloguePrograms)
        : [],
    );
    setResults(null);
    setBucketReturnsTo('recommendations');
    setStep('recommendations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleToggleSave(programId: string) {
    const isSaved = profile.savedProgramIds?.includes(programId) ?? false;
    if (!isSaved) {
      posthog.capture('program_saved', { program_id: programId });
    }
    void toggleSavedProgram(programId);
  }

  function handleRemoveFromBucket(programId: string) {
    posthog.capture('program_removed_from_bucket', { program_id: programId });
    void removeSavedProgram(programId);
  }

  function handleSelectDegree(degreeId: string) {
    posthog.capture('degree_selected_for_calculator', { degree_id: degreeId });
    setSelectedDegreeId(degreeId);
    setResults(null);
    setStep('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleGoHome() {
    setStep('landing');
    setResults(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    'calculator-results': 'landing',
  };

  function handleGoBack() {
    const prev = previousStep[step];
    if (!prev) return;
    if (prev === 'recommendations' || prev === 'quick-filters') setResults(null);
    setStep(prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showBackButton = step !== 'landing' && step !== 'auth';

  const BackButton = () =>
    showBackButton ? (
      <button
        type="button"
        onClick={handleGoBack}
        aria-label="חזרה לעמוד הקודם"
        title="חזרה לעמוד הקודם"
        className="fixed right-4 top-6 z-[60] flex h-11 items-center gap-2 rounded-2xl border border-white bg-white/82 px-4 text-sm font-bold text-[#647091] shadow-[0_16px_42px_rgba(105,133,190,0.18)] backdrop-blur-xl transition hover:bg-white hover:text-[#5262d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
      >
        <ArrowRight size={18} />
        <span>חזרה</span>
      </button>
    ) : null;

  function renderCatalogueState(title: string, description: string) {
    if (catalogueStatus === 'loading') {
      return (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-[1.7rem] border border-white bg-white/78 px-8 py-16 text-center shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur-xl">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe8f7] border-t-[#7784e8]" />
          <div>
            <h2 className="text-lg font-bold text-[#445274]">{title}</h2>
            <p className="mt-1.5 text-sm text-[#6f7a99]">{description}</p>
          </div>
        </section>
      );
    }

    if (catalogueStatus === 'error') {
      return (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-[1.7rem] border border-white bg-white/82 px-8 py-16 text-center shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur-xl">
          <div className="rounded-2xl bg-[#fff0f6] px-4 py-1 text-xs font-semibold text-[#ef6ea9]">
            קטלוג לא זמין
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#445274]">לא הצלחנו לטעון את קטלוג התארים</h2>
            <p className="mt-1.5 text-sm text-[#6f7a99]">{catalogueError?.message}</p>
            {catalogueError?.details[0] ? (
              <p className="mt-2 text-sm text-[#7c86a2]">{catalogueError.details[0]}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleGoHome}
            className="rounded-2xl bg-[#7784e8] px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(119,132,232,0.24)] transition hover:bg-[#6574dc]"
          >
            חזרה לעמוד הבית
          </button>
        </section>
      );
    }

    return null;
  }

  function handleCalculate(scores: UserScores, degreeId: string, engineering: EngineeringOptions) {
    const degree = cataloguePrograms.find((program) => program.id === degreeId);
    if (!degree) {
      return;
    }

    posthog.capture('degree_calculator_submitted', {
      degree_id: degreeId,
      degree_name: degree.name,
      psychometric: scores.psychometric,
      bagrut: scores.bagrut,
    });

    const evaluated = evaluateUniversities(calculatorInstitutions, degree, scores, engineering);
    setResults(evaluated);
    setDegreeName(degree.name);
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  const savedCount = profile.savedProgramIds?.length ?? 0;

  /* ── Full-screen steps (no header) ───────────────────────────────────────── */
  if (step === 'landing') {
    return (
      <LandingPage
        onAlreadyKnow={() => {
          posthog.capture('landing_cta_clicked', { cta: 'already_know' });
          setBucketReturnsTo('degree-picker');
          setStep('degree-picker');
        }}
        onNeedHelp={() => {
          posthog.capture('landing_cta_clicked', { cta: 'need_help' });
          setBucketReturnsTo('recommendations');
          setStep('intro');
        }}
        onSignIn={() => {
          setAuthReturnTo('landing');
          setStep('auth');
        }}
        onGoToBucket={() => {
          setBucketReturnsTo('landing');
          setStep('bucket-list');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onCalculate={(psychometric, bagrut, degreeId) => {
          posthog.capture('landing_calculator_submitted', {
            degree_id: degreeId,
            psychometric,
            bagrut,
          });
          setLandingCalcScores({ psychometric, bagrut, degreeId });
          setStep('calculator-results');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onGoToProfile={() => {
          setStep('academic-profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        programs={cataloguePrograms}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        savedCount={savedCount}
        userInitials={userInitials}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (step === 'calculator-results' && landingCalcScores) {
    return (
      <AppSurface>
        <CalculatorResults
          psychometric={landingCalcScores.psychometric}
          bagrut={landingCalcScores.bagrut}
          degreeId={landingCalcScores.degreeId}
          programs={cataloguePrograms}
          calculatorInstitutions={calculatorInstitutions}
          onBack={() => {
            setStep('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </AppSurface>
    );
  }

  if (step === 'auth') {
    return (
      <AppSurface showLogo>
        <AuthScreen
          onBack={() => setStep(authReturnTo)}
          onSuccess={() => {
            setStep(authReturnTo);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </AppSurface>
    );
  }

  if (step === 'degree-picker') {
    return (
      <AppSurface>
        <BackButton />
        {syncError && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
            <div className="rounded-2xl border border-white bg-white/84 px-4 py-3 text-sm font-semibold text-[#947329] shadow-[0_16px_42px_rgba(105,133,190,0.16)] backdrop-blur-xl">
              {syncError}
            </div>
          </div>
        )}
        {catalogueStatus === 'ready' ? (
          <DegreePicker
            programs={cataloguePrograms}
            savedProgramIds={profile.savedProgramIds ?? []}
            onToggleSave={handleToggleSave}
            onDone={() => setStep('bucket-list')}
          />
        ) : (
          <div className="px-4 py-24 sm:px-6">
            {renderCatalogueState(
              'טוענים את קטלוג התארים',
              'רק לאחר שהקטלוג ייטען אפשר לבחור תארים להשוואה.',
            )}
          </div>
        )}
      </AppSurface>
    );
  }

  if (step === 'intro') {
    return (
      <AppSurface>
        <BackButton />
        <QuizIntro onStart={() => setStep('academic-profile')} />
      </AppSurface>
    );
  }

  if (step === 'academic-profile') {
    return (
      <AppSurface>
        <BackButton />
        <AcademicProfileForm
          initialScores={profile.academicScores}
          initialDocuments={profile.uploadedDocuments}
          isAuthenticated={isAuthenticated}
          onClearLocalProfileData={clearLocalProfileData}
          onComplete={(scores: AcademicScores) => {
            posthog.capture('academic_profile_completed', {
              has_psychometric: !!scores.psychometric?.overall,
              has_bagrut: !!scores.bagrut?.weightedAverage,
            });
            updateProfile({ academicScores: scores });
            setStep('career-assessment');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSkip={() => {
            posthog.capture('academic_profile_skipped');
            setStep('career-assessment');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </AppSurface>
    );
  }

  if (step === 'career-assessment') {
    return (
      <AppSurface>
        <BackButton />
        <CareerAssessment onComplete={handleAssessmentComplete} />
      </AppSurface>
    );
  }

  if (step === 'quick-filters') {
    return (
      <AppSurface>
        <BackButton />
        <OnboardingFunnel onComplete={handleFiltersComplete} />
      </AppSurface>
    );
  }

  /* ── Steps with persistent header ───────────────────────────────────────── */
  // Source-aware: only navigate to recommendations when the user has a
  // saved assessment profile (i.e. came through the questionnaire). Degree-picker users
  // have no assessmentProfile — route them back to degree-picker instead.
  function handleGoToRecommendations() {
    if (!assessmentProfile) {
      setStep(bucketReturnsTo === 'degree-picker' ? 'degree-picker' : 'landing');
      return;
    }
    setStep('recommendations');
    setResults(null);
  }

  const shouldBlockCatalogueStep =
    catalogueStatus !== 'ready' &&
    (step === 'recommendations' || step === 'bucket-list' || step === 'calculator');
  const sekhemPrograms = cataloguePrograms.filter((program) => program.admissionType === 'sekhem');
  const bucketSourceLabel =
    bucketReturnsTo === 'degree-picker'
      ? 'בחירת תארים'
      : bucketReturnsTo === 'landing'
        ? 'דף הבית'
        : 'המלצות';
  const bucketBackLabel =
    bucketReturnsTo === 'degree-picker'
      ? 'חזרה לבחירת תארים'
      : bucketReturnsTo === 'landing'
        ? 'חזרה לדף הבית'
        : 'חזרה להמלצות';
  const bucketEmptyCtaLabel =
    bucketReturnsTo === 'degree-picker'
      ? 'חזור לבחור תארים ←'
      : bucketReturnsTo === 'landing'
        ? 'חזרה לדף הבית ←'
        : 'עבור להמלצות ←';

  return (
    <AppSurface>
      <BackButton />
      <NavBar
        step={step}
        savedCount={savedCount}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        userInitials={userInitials}
        onGoHome={handleGoHome}
        onGoToExam={() => {
          setStep('career-assessment');
          setResults(null);
          setPendingScores(null);
          setPendingValues(null);
        }}
        onGoToRecommendations={handleGoToRecommendations}
        onGoToBucket={() => setStep('bucket-list')}
        onGoToAuth={() => {
          setAuthReturnTo(step);
          setStep('auth');
        }}
        onSignOut={() => {
          void signOut();
        }}
        bucketSourceLabel={bucketSourceLabel}
        onGoToBucketSource={() => {
          setStep(bucketReturnsTo);
          setResults(null);
        }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6">
        {!hydrated || syncing ? (
          <div className="rounded-2xl border border-white bg-white/78 px-4 py-3 text-sm font-semibold text-[#647091] shadow-sm backdrop-blur-xl">
            מסנכרנים את הפרופיל שלך...
          </div>
        ) : null}

        {syncError ? (
          <div className="rounded-2xl border border-white bg-white/84 px-4 py-3 text-sm font-semibold text-[#947329] shadow-sm backdrop-blur-xl">
            {syncError}
          </div>
        ) : null}

        {shouldBlockCatalogueStep
          ? renderCatalogueState(
              'טוענים את הקטלוג',
              'הקטלוג נטען דרך ה-API לפני שאפשר להציג המלצות, מחשבון או הרשימה שלי.',
            )
          : null}

        {/* ── Step: Recommendations ─────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'recommendations' && assessmentProfile && (
          <RecommendationResults
            programs={cataloguePrograms}
            recommendations={recommendations}
            onSelectDegree={handleSelectDegree}
            profileScores={assessmentProfile.scores}
            environment={{ soloScore: 1, deskScore: 1 }}
            geographicPreference={assessmentProfile.geographicPreference}
            savedProgramIds={profile.savedProgramIds}
            onToggleSave={handleToggleSave}
          />
        )}

        {/* ── Step: Bucket List ─────────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'bucket-list' && (
          <BucketList
            programs={cataloguePrograms}
            calculatorInstitutions={calculatorInstitutions}
            catalogueInstitutions={catalogueInstitutions}
            savedProgramIds={profile.savedProgramIds ?? []}
            academicScores={profile.academicScores}
            onRemove={handleRemoveFromBucket}
            onBack={() => {
              setStep(bucketReturnsTo);
              setResults(null);
            }}
            backLabel={bucketBackLabel}
            emptyCtaLabel={bucketEmptyCtaLabel}
            isAuthenticated={isAuthenticated}
            onSignIn={() => {
              setAuthReturnTo('bucket-list');
              setStep('auth');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onContinueAsGuest={() => {
              setBucketReturnsTo('degree-picker');
              setStep('degree-picker');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ── Step: Calculator ──────────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'calculator' && (
          <>
            <section className="rounded-[1.7rem] border border-white bg-white/78 p-6 shadow-[0_24px_80px_rgba(105,133,190,0.14)] backdrop-blur-xl sm:p-8">
              <h2 className="mb-1 text-lg font-bold text-[#445274]">הזן את הנתונים שלך</h2>
              <p className="mb-6 text-sm text-[#7c86a2]">
                הממוצע בגרות כולל בונוסים (למשל מתמטיקה 5 יח׳ מוסיפה עד 35 נקודות).
              </p>
              {sekhemPrograms.length > 0 ? (
                <ScoreForm
                  programs={cataloguePrograms}
                  onSubmit={handleCalculate}
                  defaultDegreeId={selectedDegreeId ?? undefined}
                  defaultPsychometric={profile.academicScores?.psychometric?.overall}
                  defaultBagrut={profile.academicScores?.bagrut?.weightedAverage}
                />
              ) : (
                <div className="rounded-2xl border border-white bg-white/72 px-4 py-3 text-sm text-[#647091]">
                  אין כרגע תוכניות עם מחשבון קבלה זמין בקטלוג.
                </div>
              )}
            </section>

            {results && <ResultsDashboard results={results} degreeName={degreeName} />}
          </>
        )}
      </main>
    </AppSurface>
  );
}
