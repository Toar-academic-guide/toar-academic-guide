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
  userInitials?: string;
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
  userInitials,
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
    <header className="sticky top-0 z-50 px-4 pt-5 sm:px-6">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between rounded-[1.4rem] border border-white bg-white/78 px-4 shadow-[0_20px_70px_rgba(117,139,190,0.18)] backdrop-blur-xl sm:px-5">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="חזרה לדף הבית"
          className="flex h-11 items-center gap-2 rounded-2xl border border-[#e3e9f6] bg-white px-3 shadow-sm transition hover:bg-[#f6f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
        >
          <LogoCanvas size={30} brighten={false} />
        </button>

        <nav
          className="hidden items-center gap-1 text-sm font-semibold text-[#647091] md:flex"
          aria-label="ניווט"
        >
          <button
            onClick={onGoToExam}
            className="rounded-2xl px-4 py-2 transition hover:bg-[#eef4ff] hover:text-[#5262d9]"
          >
            שאלון
          </button>

          {step === 'recommendations' && (
            <>
              <span className="text-[#c4cce0]">/</span>
              <span className="rounded-2xl bg-[#eef4ff] px-4 py-2 font-bold text-[#5262d9]">
                המלצות
              </span>
            </>
          )}
          {step === 'calculator' && (
            <>
              <span className="text-[#c4cce0]">/</span>
              <button
                onClick={onGoToRecommendations}
                className="rounded-2xl px-4 py-2 transition hover:bg-[#eef4ff] hover:text-[#5262d9]"
              >
                המלצות
              </button>
              <span className="text-[#c4cce0]">/</span>
              <span className="rounded-2xl bg-[#eef4ff] px-4 py-2 font-bold text-[#5262d9]">
                חישוב
              </span>
            </>
          )}
          {step === 'bucket-list' && (
            <>
              <span className="text-[#c4cce0]">/</span>
              <button
                onClick={goToBucketSource}
                className="rounded-2xl px-4 py-2 transition hover:bg-[#eef4ff] hover:text-[#5262d9]"
              >
                {bucketSourceLabel}
              </button>
              <span className="text-[#c4cce0]">/</span>
              <span className="rounded-2xl bg-[#eef4ff] px-4 py-2 font-bold text-[#5262d9]">
                הרשימה שלי
              </span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={isAuthenticated ? onSignOut : onGoToAuth}
            disabled={authLoading}
            className="hidden rounded-2xl px-3 py-2 text-sm font-bold text-[#647091] transition hover:bg-[#eef4ff] hover:text-[#5262d9] disabled:opacity-50 sm:inline-flex"
          >
            {authLoading
              ? 'טוען...'
              : isAuthenticated
                ? userInitials
                  ? `התנתק (${userInitials})`
                  : 'התנתק'
                : 'התחברות'}
          </button>

          <button
            onClick={onGoToBucket}
            aria-label={`הרשימה שלי — ${savedCount} פריטים`}
            className={[
              'flex h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold shadow-[0_16px_34px_rgba(119,132,232,0.24)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]',
              isBucketActive
                ? 'bg-[#6574dc] text-white'
                : 'bg-[#7784e8] text-white hover:bg-[#6574dc]',
            ].join(' ')}
          >
            {savedCount > 0 ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            <span>הרשימה שלי</span>
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
