'use client';

import { useEffect, useState } from 'react';
import {
  RiasecScores,
  EngineeringOptions,
  RecommendedField,
  UniversityResult,
  UserScores,
  GeographicRegion,
  RiasecDimension,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  CatalogueApiError,
  fetchCatalogueInstitutions,
  fetchCataloguePrograms,
} from '@/lib/catalogueClient';
import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { getRecommendations } from '@/utils/recommendationEngine';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import { extractFilterAnswers } from '@/utils/riasecEngine';
import { ArrowRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import RiasecExam from '@/components/RiasecExam';
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
import type { AcademicScores, RiasecAnswers } from '@/types';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

type CatalogueStatus = 'loading' | 'ready' | 'error';

type AppStep =
  | 'landing'
  | 'auth'
  | 'intro'
  | 'academic-profile'
  | 'riasec-exam'
  | 'quick-filters'
  | 'recommendations'
  | 'calculator'
  | 'bucket-list'
  | 'degree-picker';

function toCatalogueError(error: unknown): CatalogueApiError {
  if (error instanceof CatalogueApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new CatalogueApiError(error.message, { cause: error });
  }

  return new CatalogueApiError('Unable to load the catalogue.');
}

export default function Home() {
  const { loading: authLoading, signOut, user } = useAuth();
  const [catalogueStatus, setCatalogueStatus] = useState<CatalogueStatus>('loading');
  const [catalogueError, setCatalogueError] = useState<CatalogueApiError | null>(null);
  const [catalogueInstitutions, setCatalogueInstitutions] = useState<CatalogueInstitution[]>([]);
  const [step, setStep] = useState<AppStep>('landing');
  const [recommendations, setRecommendations] = useState<RecommendedField[]>([]);
  const [cataloguePrograms, setCataloguePrograms] = useState<CatalogueProgram[]>([]);
  const {
    profile,
    hydrated,
    isAuthenticated,
    removeSavedProgram,
    syncError,
    syncing,
    toggleSavedProgram,
    updateProfile,
  } = useUserProfile();

  const [pendingScores, setPendingScores] = useState<RiasecScores | null>(null);

  const [riasecProfile, setRiasecProfile] = useState<{
    scores: RiasecScores;
    geographicPreference: GeographicRegion;
  } | null>(null);
  const [recommendationRequest, setRecommendationRequest] = useState<{
    scores: RiasecScores;
    geographicPreference: GeographicRegion;
    avoidances: string[];
  } | null>(null);

  const [selectedDegreeId, setSelectedDegreeId] = useState<string | null>(null);
  const [results, setResults] = useState<UniversityResult[] | null>(null);
  const [degreeName, setDegreeName] = useState('');
  const calculatorInstitutions = getCalculatorInstitutionsFromCatalogue(catalogueInstitutions);
  const [bucketReturnsTo, setBucketReturnsTo] = useState<AppStep>('recommendations');
  const [authReturnTo, setAuthReturnTo] = useState<Exclude<AppStep, 'auth'>>('landing');

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
            : (programs[0]?.id ?? null)
        );
        setCatalogueStatus('ready');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setCataloguePrograms([]);
        setCatalogueInstitutions([]);
        setSelectedDegreeId(null);
        setRecommendations([]);
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
        undefined,
        recommendationRequest.avoidances,
        cataloguePrograms
      )
    );
  }, [cataloguePrograms, catalogueStatus, recommendationRequest]);

  function handleRiasecComplete(scores: Record<RiasecDimension, number>) {
    setPendingScores(scores);
    setStep('quick-filters');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFiltersComplete(rawAnswers: RiasecAnswers) {
    const { geographicPreference, avoidances } = extractFilterAnswers(rawAnswers);
    const scores = pendingScores ?? ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as RiasecScores);

    updateProfile({ geographicPreference });
    setRiasecProfile({ scores, geographicPreference });
    setRecommendationRequest({ scores, geographicPreference, avoidances });
    setRecommendations(
      catalogueStatus === 'ready'
        ? getRecommendations(scores, undefined, avoidances, cataloguePrograms)
        : []
    );
    setResults(null);
    setBucketReturnsTo('recommendations');
    setStep('recommendations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleToggleSave(programId: string) {
    void toggleSavedProgram(programId);
  }

  function handleRemoveFromBucket(programId: string) {
    void removeSavedProgram(programId);
  }

  function handleSelectDegree(degreeId: string) {
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
    'riasec-exam': 'academic-profile',
    'quick-filters': 'riasec-exam',
    recommendations: 'quick-filters',
    calculator: 'recommendations',
    'bucket-list': bucketReturnsTo,
    'degree-picker': 'landing',
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
        className="fixed top-6 right-4 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-[#1e1b4b]/80 px-5 py-2.5 text-base font-medium text-white/80 shadow-lg backdrop-blur transition hover:bg-[#1e1b4b] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
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

    const evaluated = evaluateUniversities(calculatorInstitutions, degree, scores, engineering);
    setResults(evaluated);
    setDegreeName(degree.name);
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  /* ── Full-screen steps (no header) ───────────────────────────────────────── */
  if (step === 'landing') {
    return (
      <LandingPage
        onAlreadyKnow={() => {
          setBucketReturnsTo('degree-picker');
          setStep('degree-picker');
        }}
        onNeedHelp={() => {
          setBucketReturnsTo('recommendations');
          setStep('intro');
        }}
        onSignIn={() => {
          setAuthReturnTo('landing');
          setStep('auth');
        }}
      />
    );
  }

  if (step === 'auth') {
    return (
      <AuthScreen
        onBack={() => setStep(authReturnTo)}
        onSuccess={() => {
          setStep(authReturnTo);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  if (step === 'degree-picker') {
    return (
      <>
        <BackButton />
        {catalogueStatus === 'ready' ? (
          <DegreePicker
            programs={cataloguePrograms}
            savedProgramIds={profile.savedProgramIds ?? []}
            onToggleSave={handleToggleSave}
            onDone={() => setStep('bucket-list')}
          />
        ) : (
          <div className="min-h-screen bg-[#f5f4f0] px-4 py-10 sm:px-6">
            {renderCatalogueState('טוענים את קטלוג התארים', 'רק לאחר שהקטלוג ייטען אפשר לבחור תארים להשוואה.')}
          </div>
        )}
      </>
    );
  }

  if (step === 'intro') {
    return (
      <>
        <BackButton />
        <QuizIntro onStart={() => setStep('academic-profile')} />
      </>
    );
  }

  if (step === 'academic-profile') {
    return (
      <>
        <BackButton />
        <AcademicProfileForm
          initialScores={profile.academicScores}
          onComplete={(scores: AcademicScores) => {
            updateProfile({ academicScores: scores });
            setStep('riasec-exam');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSkip={() => {
            setStep('riasec-exam');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </>
    );
  }

  if (step === 'riasec-exam') {
    return (
      <>
        <BackButton />
        <RiasecExam onComplete={handleRiasecComplete} />
      </>
    );
  }

  if (step === 'quick-filters') {
    return (
      <>
        <BackButton />
        <OnboardingFunnel onComplete={handleFiltersComplete} />
      </>
    );
  }

  /* ── Steps with persistent header ───────────────────────────────────────── */
  const savedCount = profile.savedProgramIds?.length ?? 0;

  // Source-aware: only navigate to recommendations when the user has a
  // riasecProfile (i.e. came through the questionnaire). Degree-picker users
  // have no riasecProfile — route them back to degree-picker instead.
  function handleGoToRecommendations() {
    if (!riasecProfile) {
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

  return (
    <>
      <BackButton />
      <NavBar
        step={step}
        savedCount={savedCount}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        userEmail={user?.email ?? undefined}
        onGoHome={handleGoHome}
        onGoToExam={() => { setStep('riasec-exam'); setResults(null); setPendingScores(null); }}
        onGoToRecommendations={handleGoToRecommendations}
        onGoToBucket={() => setStep('bucket-list')}
        onGoToAuth={() => {
          setAuthReturnTo(step);
          setStep('auth');
        }}
        onSignOut={() => {
          void signOut();
        }}
        bucketSourceLabel={bucketReturnsTo === 'degree-picker' ? 'בחירת תארים' : 'המלצות'}
        onGoToBucketSource={() => {
          setStep(bucketReturnsTo);
          setResults(null);
        }}
      />

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

        {shouldBlockCatalogueStep ? (
          renderCatalogueState(
            'טוענים את הקטלוג',
            'הקטלוג נטען דרך ה-API לפני שאפשר להציג המלצות, מחשבון או רשימת ייעוד.'
          )
        ) : null}

        {/* ── Step: Recommendations ─────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'recommendations' && riasecProfile && (
          <RecommendationResults
            programs={cataloguePrograms}
            recommendations={recommendations}
            onSelectDegree={handleSelectDegree}
            riasecScores={riasecProfile.scores}
            environment={{ soloScore: 1, deskScore: 1 }}
            geographicPreference={riasecProfile.geographicPreference}
            savedProgramIds={profile.savedProgramIds}
            onToggleSave={handleToggleSave}
          />
        )}

        {/* ── Step: Bucket List ─────────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'bucket-list' && (
          <BucketList
            programs={cataloguePrograms}
            calculatorInstitutions={calculatorInstitutions}
            savedProgramIds={profile.savedProgramIds ?? []}
            academicScores={profile.academicScores}
            onRemove={handleRemoveFromBucket}
            onBack={() => { setStep(bucketReturnsTo); setResults(null); }}
            backLabel={bucketReturnsTo === 'degree-picker' ? 'חזרה לבחירת תארים' : 'חזרה להמלצות'}
            emptyCtaLabel={bucketReturnsTo === 'degree-picker' ? 'חזור לבחור תארים ←' : 'עבור להמלצות ←'}
          />
        )}

        {/* ── Step: Calculator ──────────────────────────────────── */}
        {!shouldBlockCatalogueStep && step === 'calculator' && (
          <>
            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-1 text-lg font-semibold text-gray-800">הזן את הנתונים שלך</h2>
              <p className="mb-6 text-sm text-gray-400">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  אין כרגע תוכניות עם מחשבון קבלה זמין בקטלוג.
                </div>
              )}
            </section>

            {results && (
              <ResultsDashboard results={results} degreeName={degreeName} />
            )}
          </>
        )}
      </main>
    </>
  );
}
