let pending: Promise<unknown> | undefined;

// A render-time hint only: no state, markup, or hydration-dependent fallback.
// Keep StudyJourney's next/dynamic import so both paths request the same chunk.
export function preloadJourneyExactGrades() {
  if (typeof window === 'undefined') return;
  pending ??= import('./JourneyExactGrades').catch(() => {
    pending = undefined;
  });
}
