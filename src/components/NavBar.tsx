'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import LogoCanvas from './LogoCanvas';

type AppStep = 'landing' | 'intro' | 'academic-profile' | 'riasec-exam' | 'quick-filters' | 'recommendations' | 'calculator' | 'bucket-list' | 'degree-picker';

interface Props {
  step: AppStep;
  savedCount: number;
  onGoHome: () => void;
  onGoToExam: () => void;
  onGoToRecommendations: () => void;
  onGoToBucket: () => void;
  /** Controls the breadcrumb label when step is 'bucket-list'. */
  bucketSource?: 'questionnaire' | 'degree-picker';
}

export default function NavBar({ step, savedCount, onGoHome, onGoToExam, onGoToRecommendations, onGoToBucket, bucketSource }: Props) {
  const isBucketActive = step === 'bucket-list';

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #3730a3 100%)' }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 sm:px-6">

        {/* Logo — links home */}
        <button
          type="button"
          onClick={onGoHome}
          aria-label="חזרה לדף הבית"
          className="cursor-pointer rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <LogoCanvas size={70} brighten={true} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm" aria-label="ניווט">
          <button
            onClick={onGoToExam}
            className="text-white/50 transition hover:text-white/80"
          >
            שאלון
          </button>

          {step === 'recommendations' && (
            <>
              <span className="text-white/30">/</span>
              <span className="font-semibold text-indigo-300">המלצות</span>
            </>
          )}
          {step === 'calculator' && (
            <>
              <span className="text-white/30">/</span>
              <button onClick={onGoToRecommendations} className="text-white/50 transition hover:text-white/80">המלצות</button>
              <span className="text-white/30">/</span>
              <span className="font-semibold text-indigo-300">חישוב</span>
            </>
          )}
          {step === 'bucket-list' && (
            <>
              <span className="text-white/30">/</span>
              <button onClick={onGoToRecommendations} className="text-white/50 transition hover:text-white/80">
                {bucketSource === 'degree-picker' ? 'בחירת תארים' : 'המלצות'}
              </button>
              <span className="text-white/30">/</span>
              <span className="font-semibold text-indigo-300">רשימת הייעוד</span>
            </>
          )}
        </nav>

        {/* Bucket list button */}
        <button
          onClick={onGoToBucket}
          aria-label={`רשימת הייעוד — ${savedCount} פריטים`}
          className={[
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
            isBucketActive
              ? 'border-indigo-300 bg-indigo-500/30 text-indigo-200'
              : 'border-white/20 bg-white/10 text-white/70 hover:border-white/40 hover:text-white',
          ].join(' ')}
        >
          {savedCount > 0 ? (
            <BookmarkCheck size={13} className={isBucketActive ? 'text-indigo-300' : 'text-indigo-300'} />
          ) : (
            <Bookmark size={13} />
          )}
          <span>רשימת הייעוד</span>
          {savedCount > 0 && (
            <span className={[
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              isBucketActive ? 'bg-indigo-400/50 text-white' : 'bg-indigo-400/40 text-indigo-200',
            ].join(' ')}>
              {savedCount}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
