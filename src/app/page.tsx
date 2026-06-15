'use client';

import { useEffect, useState } from 'react';
import {
  ProfileScores,
  ValuesProfile,
  EngineeringOptions,
  RecommendedField,
  UniversityResult,
  UserScores,
  GeographicRegion,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { fetchCatalogueInstitutions, fetchCataloguePrograms } from '@/lib/catalogueClient';
import { getCalculatorInstitutionsFromCatalogue } from '@/lib/calculatorInstitutions';
import { getRecommendations } from '@/utils/recommendationEngine';
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
import type { AcademicScores, RiasecAnswers, RiasecScores } from '@/types';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

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
  | 'degree-picker';

export default function Home() {
  const { loading: authLoading, signOut, user } = useAuth();
  const staticCataloguePrograms = getStaticCataloguePrograms();
  const staticCatalogueInstitutions = getStaticCatalogueInstitutions();
  const [catalogueInstitutions, setCatalogueInstitutions] =
    useState<CatalogueInstitution[]>(staticCatalogueInstitutions);
  const [step, setStep] = useState<AppStep>('landing');
  const [recommendations, setRecommendations] = useState<RecommendedField[]>([]);
  const [cataloguePrograms, setCataloguePrograms] = useState<CatalogueProgram[]>(staticCataloguePrograms);
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

  const [pendingScores, setPendingScores] = useState<ProfileScores | null>(null);
  const [pendingValues, setPendingValues] = useState<ValuesProfile | null>(null);

  const [riasecProfile, setRiasecProfile] = useState<{
    scores: RiasecScores;
    geographicPreference: GeographicRegion;
  } | null>(null);

  const [selectedDegreeId, setSelectedDegreeId] = useState(staticCataloguePrograms[0].id);
  const [results, setResults] = useState<UniversityResult[] | null>(null);
  const [degreeName, setDegreeName] = useState('');
  const calculatorInstitutions = getCalculatorInstitutionsFromCatalogue(catalogueInstitutions);
  const [bucketReturnsTo, setBucketReturnsTo] = useState<AppStep>('recommendations');
  const [authReturnTo, setAuthReturnTo] = useState<Exclude<AppStep, 'auth'>>('landing');

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchCataloguePrograms(), fetchCatalogueInstitutions()]).then(([programs, institutions]) => {
      if (!isMounted) {
        return;
      }

      if (programs.length > 0) {
        setCataloguePrograms(programs);
        setSelectedDegreeId((current) =>
          programs.some((program) => program.id === current) ? current : programs[0].id
        );
      }

      setCatalogueInstitutions(institutions);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleAssessmentComplete(profileScores: ProfileScores, valuesProfile: ValuesProfile) {
    setPendingScores(profileScores);
    setPendingValues(valuesProfile);
    setStep('quick-filters');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFiltersComplete(rawAnswers: RiasecAnswers) {
    const { geographicPreference, avoidances } = extractFilterAnswers(rawAnswers);

    // Bridge: map 8-dim ProfileScores → old 6-dim RiasecScores until
    // recommendationEngine is updated to use 8 dimensions (Step 6).
    const p = pendingScores ?? { AN: 0, TE: 0, CR: 0, SO: 0, LE: 0, OR: 0, DI: 0, ER: 0 };
    const scores: RiasecScores = {
      R: p.TE,
      I: Math.max(p.AN, p.DI),
      A: p.CR,
      S: p.SO,
      E: p.LE,
      C: p.OR,
    };

    updateProfile({ geographicPreference });
    const recs = getRecommendations(scores, undefined, avoidances, cataloguePrograms);
    setRiasecProfile({ scores, geographicPreference });
    setRecommendations(recs);
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
    'career-assessment': 'academic-profile',
    'quick-filters': 'career-assessment',
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

  function handleCalculate(scores: UserScores, degreeId: string, engineering: EngineeringOptions) {
    const degree = cataloguePrograms.find((p) => p.id === degreeId)!;
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
        <DegreePicker
          programs={cataloguePrograms}
          savedProgramIds={profile.savedProgramIds ?? []}
          onToggleSave={handleToggleSave}
          onDone={() => setStep('bucket-list')}
        />
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
            setStep('career-assessment');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSkip={() => {
            setStep('career-assessment');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </>
    );
  }

  if (step === 'career-assessment') {
    return (
      <>
        <BackButton />
        <CareerAssessment onComplete={handleAssessmentComplete} />
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
        onGoToExam={() => { setStep('career-assessment'); setResults(null); setPendingScores(null); setPendingValues(null); }}
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

        {/* ── Step: Recommendations ─────────────────────────────── */}
        {step === 'recommendations' && riasecProfile && (
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
        {step === 'bucket-list' && (
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
        {step === 'calculator' && (
          <>
            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-1 text-lg font-semibold text-gray-800">הזן את הנתונים שלך</h2>
              <p className="mb-6 text-sm text-gray-400">
                הממוצע בגרות כולל בונוסים (למשל מתמטיקה 5 יח׳ מוסיפה עד 35 נקודות).
              </p>
              <ScoreForm
                programs={cataloguePrograms}
                onSubmit={handleCalculate}
                defaultDegreeId={selectedDegreeId}
                defaultPsychometric={profile.academicScores?.psychometric?.overall}
                defaultBagrut={profile.academicScores?.bagrut?.weightedAverage}
              />
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
