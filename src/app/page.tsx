'use client';

import { useState } from 'react';
import {
  RiasecScores,
  EngineeringOptions,
  RecommendedField,
  UniversityResult,
  UserScores,
  GeographicRegion,
  RiasecDimension,
} from '@/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UNIVERSITIES } from '@/data/degreesData';
import { allPrograms } from '@/data/degrees';
import { getRecommendations } from '@/utils/recommendationEngine';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import { extractFilterAnswers } from '@/utils/riasecEngine';
import { ArrowRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import RiasecExam from '@/components/RiasecExam';
import OnboardingFunnel from '@/components/OnboardingFunnel';
import LandingPage from '@/components/LandingPage';
import QuizIntro from '@/components/QuizIntro';
import AcademicProfileForm from '@/components/AcademicProfileForm';
import RecommendationResults from '@/components/RecommendationResults';
import BucketList from '@/components/BucketList';
import DegreePicker from '@/components/DegreePicker';
import ScoreForm from '@/components/ScoreForm';
import ResultsDashboard from '@/components/ResultsDashboard';
import type { AcademicScores, RiasecAnswers } from '@/types';

type AppStep =
  | 'landing'
  | 'intro'
  | 'academic-profile'
  | 'riasec-exam'        // NEW: full 42-item RIASEC assessment
  | 'quick-filters'      // NEW: geography + avoidances only
  | 'recommendations'
  | 'calculator'
  | 'bucket-list'
  | 'degree-picker';     // NEW: "I already know what I want to study" browse

export default function Home() {
  const [step, setStep] = useState<AppStep>('landing');
  const [recommendations, setRecommendations] = useState<RecommendedField[]>([]);
  const { profile, updateProfile } = useUserProfile();

  // RIASEC scores from the exam (stored before filter answers arrive)
  const [pendingScores, setPendingScores] = useState<RiasecScores | null>(null);

  const [riasecProfile, setRiasecProfile] = useState<{
    scores: RiasecScores;
    geographicPreference: GeographicRegion;
  } | null>(null);

  const [selectedDegreeId, setSelectedDegreeId] = useState(allPrograms[0].id);
  const [results, setResults] = useState<UniversityResult[] | null>(null);
  const [degreeName, setDegreeName] = useState('');

  // Where BucketList's "back" button should land. Defaults to recommendations
  // (the normal RIASEC flow). Set to 'degree-picker' when arriving via the
  // "I already know what I want to study" branch.
  const [bucketReturnsTo, setBucketReturnsTo] = useState<AppStep>('recommendations');

  // ── Step: RIASEC exam complete ──────────────────────────────────────────────
  function handleRiasecComplete(scores: Record<RiasecDimension, number>) {
    // RiasecExam already returns normalised 0–5 scores — use them directly.
    setPendingScores(scores);
    setStep('quick-filters');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Step: Filter questions complete ────────────────────────────────────────
  function handleFiltersComplete(rawAnswers: RiasecAnswers) {
    const { geographicPreference, avoidances } = extractFilterAnswers(rawAnswers);
    const scores = pendingScores ?? ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as RiasecScores);

    updateProfile({ geographicPreference });
    const recs = getRecommendations(scores, undefined, avoidances);
    setRiasecProfile({ scores, geographicPreference });
    setRecommendations(recs);
    setResults(null);
    setStep('recommendations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Bucket list ────────────────────────────────────────────────────────────
  function handleToggleSave(programId: string) {
    const current = profile.savedProgramIds ?? [];
    const next = current.includes(programId)
      ? current.filter((id) => id !== programId)
      : [...current, programId];
    updateProfile({ savedProgramIds: next });
  }

  function handleRemoveFromBucket(programId: string) {
    const next = (profile.savedProgramIds ?? []).filter((id) => id !== programId);
    updateProfile({ savedProgramIds: next });
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

  // Map of each step → its previous step (for the "back" button)
  const previousStep: Record<AppStep, AppStep | null> = {
    landing: null,
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

  const showBackButton = step !== 'landing';

  // Floating back button — visible on every page except the landing page
  const BackButton = () =>
    showBackButton ? (
      <button
        type="button"
        onClick={handleGoBack}
        aria-label="חזרה לעמוד הקודם"
        title="חזרה לעמוד הקודם"
        className="fixed bottom-6 left-4 z-50 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#1e1b4b]/80 px-3.5 py-2 text-sm font-medium text-white/80 shadow-lg backdrop-blur transition hover:bg-[#1e1b4b] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <ArrowRight size={16} />
        <span>חזרה</span>
      </button>
    ) : null;

  function handleCalculate(scores: UserScores, degreeId: string, engineering: EngineeringOptions) {
    const degree = allPrograms.find((p) => p.id === degreeId)!;
    const evaluated = evaluateUniversities(UNIVERSITIES, degree, scores, engineering);
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
      />
    );
  }

  if (step === 'degree-picker') {
    return (
      <>
        <BackButton />
        <DegreePicker
          allPrograms={allPrograms}
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

  return (
    <>
      <BackButton />
      <NavBar
        step={step}
        savedCount={savedCount}
        onGoHome={handleGoHome}
        onGoToExam={() => { setStep('riasec-exam'); setResults(null); setPendingScores(null); }}
        onGoToRecommendations={() => { setStep('recommendations'); setResults(null); }}
        onGoToBucket={() => setStep('bucket-list')}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6">

        {/* ── Step: Recommendations ─────────────────────────────── */}
        {step === 'recommendations' && riasecProfile && (
          <RecommendationResults
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
