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
  | 'degree-picker'
  | 'calculator-results';

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
    <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-between py-4 pl-8 pr-4 sm:pl-12 sm:pr-6">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="חזרה לדף הבית"
          className="cursor-pointer rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#1e1b4b]/30"
        >
          <LogoCanvas size={44} brighten={false} />
        </button>

        <nav className="flex items-center gap-1.5 text-sm text-slate-600" aria-label="ניווט">
          <button onClick={onGoToExam} className="transition hover:text-slate-900">
            שאלון
          </button>

          {step === 'recommendations' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900">המלצות</span>
            </>
          )}
          {step === 'calculator' && (
            <>
              <span className="text-slate-300">/</span>
              <button onClick={onGoToRecommendations} className="transition hover:text-slate-900">
                המלצות
              </button>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900">חישוב</span>
            </>
          )}
          {step === 'bucket-list' && (
            <>
              <span className="text-slate-300">/</span>
              <button onClick={goToBucketSource} className="transition hover:text-slate-900">
                {bucketSourceLabel}
              </button>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900">רשימת הייעוד</span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isAuthenticated ? onSignOut : onGoToAuth}
            disabled={authLoading}
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
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
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              isBucketActive
                ? 'bg-[#1e1b4b] text-white'
                : 'bg-[#1e1b4b] text-white hover:bg-[#2d2a6e]',
            ].join(' ')}
          >
            {savedCount > 0 ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            <span>רשימת הייעוד</span>
            {savedCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
