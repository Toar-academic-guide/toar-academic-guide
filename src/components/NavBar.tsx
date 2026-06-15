'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import LogoCanvas from './LogoCanvas';

type AppStep =
  | 'landing'
  | 'intro'
  | 'academic-profile'
  | 'career-assessment'
  | 'quick-filters'
  | 'recommendations'
  | 'calculator'
  | 'bucket-list'
  | 'degree-picker';

interface Props {
  step: AppStep;
  savedCount: number;
  authLoading: boolean;
  isAuthenticated: boolean;
  userEmail?: string;
  onGoHome: () => void;
  onGoToExam: () => void;
  onGoToRecommendations: () => void;
  onGoToBucket: () => void;
  onGoToAuth: () => void;
  onSignOut: () => void;
  bucketSourceLabel?: string;
  onGoToBucketSource?: () => void;
}

export default function NavBar({
  step,
  savedCount,
  authLoading,
  isAuthenticated,
  userEmail,
  onGoHome,
  onGoToExam,
  onGoToRecommendations,
  onGoToBucket,
  onGoToAuth,
  onSignOut,
  bucketSourceLabel = 'המלצות',
  onGoToBucketSource,
}: Props) {
  const isBucketActive = step === 'bucket-list';
  const goToBucketSource = onGoToBucketSource ?? onGoToRecommendations;

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: 'linear-gradient(90deg, #1e1b4b 0%, #3730a3 100%)' }}
    >
      <div className="flex items-center justify-between px-8 py-2 sm:px-10">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="חזרה לדף הבית"
          className="cursor-pointer rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <LogoCanvas size={160} brighten={true} />
        </button>

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
              <button onClick={onGoToRecommendations} className="text-white/50 transition hover:text-white/80">
                המלצות
              </button>
              <span className="text-white/30">/</span>
              <span className="font-semibold text-indigo-300">חישוב</span>
            </>
          )}
          {step === 'bucket-list' && (
            <>
              <span className="text-white/30">/</span>
              <button onClick={goToBucketSource} className="text-white/50 transition hover:text-white/80">
                {bucketSourceLabel}
              </button>
              <span className="text-white/30">/</span>
              <span className="font-semibold text-indigo-300">רשימת הייעוד</span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isAuthenticated ? onSignOut : onGoToAuth}
            disabled={authLoading}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            {authLoading
              ? 'טוען...'
              : isAuthenticated
                ? userEmail
                  ? `התנתק (${userEmail})`
                  : 'התנתק'
                : 'התחברות'}
          </button>

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
              <BookmarkCheck size={13} className="text-indigo-300" />
            ) : (
              <Bookmark size={13} />
            )}
            <span>רשימת הייעוד</span>
            {savedCount > 0 && (
              <span
                className={[
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isBucketActive ? 'bg-indigo-400/50 text-white' : 'bg-indigo-400/40 text-indigo-200',
                ].join(' ')}
              >
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
