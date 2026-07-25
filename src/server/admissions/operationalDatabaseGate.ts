export interface PublicationDatabaseState {
  pendingReleaseCount: number;
  startedAttemptCount: number;
  malformedPublishedReleaseCount: number;
}

export function assessPublicationDatabaseState(state: PublicationDatabaseState): {
  ready: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  addCountIssue(
    issues,
    state.pendingReleaseCount,
    'pending admission release',
    'must be reconciled',
  );
  addCountIssue(
    issues,
    state.startedAttemptCount,
    'started publication attempt',
    'must be reconciled',
  );
  addCountIssue(
    issues,
    state.malformedPublishedReleaseCount,
    'published admission release',
    'has incomplete identity evidence',
  );
  return { ready: issues.length === 0, issues };
}

function addCountIssue(issues: string[], count: number, subject: string, detail: string) {
  if (count > 0) {
    issues.push(`${count} ${subject}${count === 1 ? '' : 's'} ${detail}.`);
  }
}
