'use client';

import { useState } from 'react';
import {
  RiasecAnswers,
  RiasecScores,
  EnvironmentPreference,
  EngineeringOptions,
  RecommendedField,
  UniversityResult,
  UserScores,
} from '@/types';
import { UNIVERSITIES, DEGREES } from '@/data/degreesData';
import { getRecommendations } from '@/utils/recommendationEngine';
import { evaluateUniversities } from '@/utils/sekhemCalculators';
import { calculateRiasecScores } from '@/utils/riasecEngine';
import OnboardingFunnel from '@/components/OnboardingFunnel';
import RecommendationResults from '@/components/RecommendationResults';
import ScoreForm from '@/components/ScoreForm';
import ResultsDashboard from '@/components/ResultsDashboard';

type AppStep = 'onboarding' | 'recommendations' | 'calculator';

export default function Home() {
  const [step, setStep] = useState<AppStep>('onboarding');
  const [recommendations, setRecommendations] = useState<RecommendedField[]>([]);
  const [riasecProfile, setRiasecProfile] = useState<{
    scores: RiasecScores;
    environment: EnvironmentPreference;
  } | null>(null);
  const [selectedDegreeId, setSelectedDegreeId] = useState(DEGREES[0].id);
  const [results, setResults] = useState<UniversityResult[] | null>(null);
  const [degreeName, setDegreeName] = useState('');

  function handleOnboardingComplete(rawAnswers: RiasecAnswers) {
    const { scores, environment } = calculateRiasecScores(rawAnswers);
    const recs = getRecommendations(scores, environment);
    setRiasecProfile({ scores, environment });
    setRecommendations(recs);
    setResults(null);
    setStep('recommendations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSelectDegree(degreeId: string) {
    setSelectedDegreeId(degreeId);
    setResults(null);
    setStep('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCalculate(scores: UserScores, degreeId: string, engineering: EngineeringOptions) {
    const degree = DEGREES.find((d) => d.id === degreeId)!;
    const evaluated = evaluateUniversities(UNIVERSITIES, degree, scores, engineering);
    setResults(evaluated);
    setDegreeName(degree.name);
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6">
      {/* Breadcrumb */}
      {step !== 'onboarding' && (
        <nav className="flex items-center gap-1.5 text-sm text-gray-400" aria-label="ניווט">
          <button
            onClick={() => { setStep('onboarding'); setResults(null); }}
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
        </nav>
      )}

      {/* ── Step: Onboarding ───────────────────────────────────── */}
      {step === 'onboarding' && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <OnboardingFunnel onComplete={handleOnboardingComplete} />
        </section>
      )}

      {/* ── Step: Recommendations ─────────────────────────────── */}
      {step === 'recommendations' && riasecProfile && (
        <RecommendationResults
          recommendations={recommendations}
          onSelectDegree={handleSelectDegree}
          riasecScores={riasecProfile.scores}
          environment={riasecProfile.environment}
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
            <ScoreForm onSubmit={handleCalculate} defaultDegreeId={selectedDegreeId} />
          </section>

          {results && (
            <ResultsDashboard results={results} degreeName={degreeName} />
          )}
        </>
      )}
    </main>
  );
}
