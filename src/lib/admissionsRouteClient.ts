import type { AcademicScores, BagrutSubject } from '@/types';

export interface AdmissionsRouteAction {
  id: string;
  kind: 'psychometric' | 'improve_grade' | 'expand_units' | 'add_subject';
  subjectId?: string;
  from?: number;
  to?: number;
  fromGrade?: number;
  toGrade?: number;
  fromUnits?: number;
  toUnits?: number;
  units?: number;
  grade?: number;
}

export interface AdmissionsRouteResult {
  id: string;
  actions: AdmissionsRouteAction[];
  afterProfile: { psychometric: number; subjects: BagrutSubject[] };
  estimate: { durationWeeks: number; effortPoints: number; version: string };
  verification: {
    eligible: boolean;
    margin: number;
    score?: number;
    cutoff?: number;
    sourceUrl?: string;
  };
}

export interface AdmissionsRouteSearchResult {
  status: 'complete' | 'no_route' | 'search_incomplete';
  fastest?: AdmissionsRouteResult;
  lowestEffort?: AdmissionsRouteResult;
}

export class AdmissionsRouteApiError extends Error {
  code: string;
  constructor(message: string, code = 'ADMISSIONS_ROUTE_REQUEST_FAILED') {
    super(message);
    this.name = 'AdmissionsRouteApiError';
    this.code = code;
  }
}

export async function fetchTauComputerScienceRoutes(
  scores: AcademicScores,
): Promise<AdmissionsRouteSearchResult> {
  const psychometric = scores.psychometric?.overall;
  const bagrutAverage = scores.bagrut?.weightedAverage;
  const subjectRecord = scores.bagrut?.subjectRecord;
  if (psychometric === undefined || bagrutAverage === undefined || !subjectRecord) {
    throw new AdmissionsRouteApiError(
      'נדרשים ציוני פסיכומטרי ובגרות מפורטים.',
      'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
    );
  }

  const response = await fetch('/api/admissions/routes', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      degreeId: 'tau_cs',
      source: 'input',
      profile: { psychometric, bagrutAverage, subjectRecord },
    }),
  });
  const payload = (await response.json()) as {
    data?: AdmissionsRouteSearchResult;
    error?: { code?: string; message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new AdmissionsRouteApiError(
      payload.error?.message ?? 'לא הצלחנו לאמת מסלול קבלה כרגע.',
      payload.error?.code,
    );
  }
  return payload.data;
}
