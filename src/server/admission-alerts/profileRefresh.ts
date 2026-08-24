export interface AlertRelevantAcademicProfile {
  psychometricOverall: number | null;
  psychometricQuantitative: number | null;
  psychometricVerbal: number | null;
  psychometricEnglish: number | null;
  bagrutWeightedAverage: number | null;
  bagrutProfileVersionId: string | null;
}

export function shouldRefreshAdmissionAlerts(
  previous: AlertRelevantAcademicProfile | undefined,
  next: AlertRelevantAcademicProfile,
): boolean {
  if (!previous) {
    return false;
  }

  return (
    previous.psychometricOverall !== next.psychometricOverall ||
    previous.psychometricQuantitative !== next.psychometricQuantitative ||
    previous.psychometricVerbal !== next.psychometricVerbal ||
    previous.psychometricEnglish !== next.psychometricEnglish ||
    previous.bagrutWeightedAverage !== next.bagrutWeightedAverage ||
    previous.bagrutProfileVersionId !== next.bagrutProfileVersionId
  );
}
