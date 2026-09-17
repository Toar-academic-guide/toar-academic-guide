'use client';

import PublicNavBar from './PublicNavBar';

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
  | 'study-location'
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
  savedCount,
  authLoading,
  isAuthenticated,
  userInitials,
  onGoHome,
  onGoToBucket,
  onGoToAuth,
  onSignOut,
}: Props) {
  return (
    <PublicNavBar
      authLoading={authLoading}
      isAuthenticated={isAuthenticated}
      onGoHome={onGoHome}
      onGoToBucket={onGoToBucket}
      onSignIn={onGoToAuth}
      onSignOut={onSignOut}
      savedCount={savedCount}
      userInitials={userInitials}
    />
  );
}
