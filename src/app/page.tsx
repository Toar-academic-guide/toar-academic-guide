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
import { extractFilterAnswers, normalizeRiasecScores } from '@/utils/riasecEngine';
import Image from 'next/image';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import RiasecExam from '@/components/RiasecExam';
import OnboardingFunnel from '@/components/OnboardingFunnel';
import LandingPage from '@/components/LandingPage';
import QuizIntro from '@/components/QuizIntro';
import AcademicProfileForm from '@/components/AcademicProfileForm';
import RecommendationResults from '@/components/RecommendationResults';
import BucketList from '@/components/BucketList';
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
  | 'bucket-list';

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

  // ── Step: RIASEC exam complete ──────────────────────────────────────────────
  function handleRiasecComplete(rawScores: Record<RiasecDimension, number>) {
    const normalized = normalizeRiasecScores(rawScores);
    setPendingScores(normalized);
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
    return <LandingPage onStart={() => setStep('intro')} />;
  }

  if (step === 'intro') {
    return <QuizIntro onStart={() => setStep('academic-profile')} />;
  }

  if (step === 'academic-profile') {
    return (
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
    );
  }

  if (step === 'riasec-exam') {
    return <RiasecExam onComplete={handleRiasecComplete} />;
  }

  if (step === 'quick-filters') {
    return <OnboardingFunnel onComplete={handleFiltersComplete} />;
  }

  /* ── Steps with persistent header ───────────────────────────────────────── */
  const hideBreadcrumb = false;
  const savedCount = profile.savedProgramIds?.length ?? 0;
  const isBucketActive = step === 'bucket-list';

  return (
    <>
      {/* ── Persistent site header ──────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={handleGoHome}
            aria-label="חזרה לדף הבית"
            title="חזרה לדף הבית"
            className="cursor-pointer rounded-xl outline-none transition-opacity duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <Image
              src="/logo.jpg.PNG"
              alt="לוגו — לחץ לחזרה לדף הבית"
              width={880}
              height={300}
              className="h-52 w-auto object-contain md:h-64"
              priority
            />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6">

        {/* Breadcrumb + Bucket List nav */}
        {!hideBreadcrumb && (
          <nav
            className="flex items-center justify-between text-sm text-gray-400"
            aria-label="ניווט"
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setStep('riasec-exam'); setResults(null); setPendingScores(null); }}
                className="transition hover:text-gray-800"
              >
                שאלון
              </button>
              {step === 'recommendations' && (
                <>
                  <span>/</span>
                  <span className="font-medium text-gray-700">המלצות</span>
                </>
              )}
              {step === 'calculator' && (
                <>
                  <span>/</span>
                  <button
                    onClick={() => { setStep('recommendations'); setResults(null); }}
                    className="transition hover:text-gray-800"
                  >
                    המלצות
                  </button>
                  <span>/</span>
                  <span className="font-medium text-gray-700">חישוב</span>
                </>
              )}
              {step === 'bucket-list' && (
                <>
                  <span>/</span>
                  <button
                    onClick={() => { setStep('recommendations'); setResults(null); }}
                    className="transition hover:text-gray-800"
                  >
                    המלצות
                  </button>
                  <span>/</span>
                  <span className="font-medium text-gray-700">רשימת הייעוד</span>
                </>
              )}
            </div>

            <button
              onClick={() => setStep('bucket-list')}
              aria-label={`רשימת הייעוד — ${savedCount} פריטים`}
              className={[
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                isBucketActive
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-800',
              ].join(' ')}
            >
              {savedCount > 0 ? (
                <BookmarkCheck size={13} className={isBucketActive ? 'text-indigo-600' : 'text-indigo-400'} />
              ) : (
                <Bookmark size={13} />
              )}
              <span>רשימת הייעוד</span>
              {savedCount > 0 && (
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    isBucketActive ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-100 text-indigo-700',
                  ].join(' ')}
                >
                  {savedCount}
                </span>
              )}
            </button>
          </nav>
        )}

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
            onBack={() => { setStep('recommendations'); setResults(null); }}
          />
        )}

        {/* ── Step: Calculator ──────────────────────────────────── */}
        {step === 'calculator' && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
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
