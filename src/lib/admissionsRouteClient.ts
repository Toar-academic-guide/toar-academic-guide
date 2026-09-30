import type { AcademicScores, BagrutSubject } from '@/types';

export interface AdmissionsRouteAction {
  id: string;
  kind: 'psychometric' | 'improve_grade' | 'expand_units' | 'add_subject';
  component?: 'overall' | 'quantitative' | 'verbal' | 'english';
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
  afterProfile: {
    psychometric: number;
    psychometricComponents?: {
      quantitative?: number;
      verbal?: number;
      english?: number;
    };
    subjectRecord: { subjects: BagrutSubject[] };
  };
  estimate: {
    durationWeeks: number;
    effortPoints: number;
    estimateVersion: string;
    owner: string;
    effectiveDate: string;
    eligibility: string;
    rationale: string;
  };
  verification: {
    eligible: boolean;
    margin: number;
    score?: number;
    cutoff?: number;
    sourceUrl?: string;
    ruleFingerprint?: string;
    unmetRequirements?: string[];
  };
}

export interface AdmissionsRouteSearchResult {
  status: 'complete' | 'no_route' | 'search_incomplete' | 'authority_unavailable';
  fastest?: AdmissionsRouteResult;
  lowestEffort?: AdmissionsRouteResult;
  target?: {
    degreeId: 'tau_cs' | 'bgu_cs';
    pairId: string;
    institutionId: 'tau' | 'bgu';
    verificationMode: string;
  };
  evidence?: {
    evaluatorCapability: string;
    evaluatedCandidateCount: number;
    unavailableFinalistCount: number;
  };
}

export class AdmissionsRouteApiError extends Error {
  code: string;
  constructor(message: string, code = 'ADMISSIONS_ROUTE_REQUEST_FAILED') {
    super(message);
    this.name = 'AdmissionsRouteApiError';
    this.code = code;
  }
}

export async function fetchComputerScienceRoutes(
  degreeId: 'tau_cs' | 'bgu_cs',
  scores: AcademicScores,
): Promise<AdmissionsRouteSearchResult> {
  const psychometric = scores.psychometric?.overall;
  const subjectRecord = scores.bagrut?.subjectRecord;
  if (psychometric === undefined || !subjectRecord) {
    throw new AdmissionsRouteApiError(
      'נדרשים ציון פסיכומטרי וציוני בגרות מפורטים.',
      'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
    );
  }

  const profile =
    degreeId === 'tau_cs'
      ? tauProfile(scores, psychometric, subjectRecord)
      : bguProfile(scores, psychometric, subjectRecord);

  const response = await fetch('/api/admissions/routes', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      degreeId,
      source: 'input',
      profile,
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

function tauProfile(
  scores: AcademicScores,
  psychometric: number,
  subjectRecord: NonNullable<AcademicScores['bagrut']>['subjectRecord'],
) {
  const tauBagrutAverage = scores.admissions?.tauBagrutAverage;
  if (tauBagrutAverage === undefined || !subjectRecord) {
    throw new AdmissionsRouteApiError(
      'נדרש ממוצע הבגרות הרשמי של אוניברסיטת תל אביב.',
      'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
    );
  }
  return {
    psychometric,
    tauBagrutAverage,
    subjectRecord,
    tauApplicationRequirementsConfirmed: scores.admissions?.tauApplicationRequirementsConfirmed,
    tauMathPlacementScore: scores.admissions?.tauMathPlacementScore,
  };
}

function bguProfile(
  scores: AcademicScores,
  psychometric: number,
  subjectRecord: NonNullable<AcademicScores['bagrut']>['subjectRecord'],
) {
  const quantitativeSubscore = scores.psychometric?.quantitative;
  const verbalSubscore = scores.psychometric?.verbal;
  const englishSubscore = scores.psychometric?.english;
  const bguBagrutAverage = scores.admissions?.bguBagrutAverage;
  const languageRequirementsConfirmed = scores.admissions?.bguLanguageRequirementsConfirmed;
  if (
    !subjectRecord ||
    quantitativeSubscore === undefined ||
    verbalSubscore === undefined ||
    englishSubscore === undefined ||
    bguBagrutAverage === undefined ||
    languageRequirementsConfirmed !== true
  ) {
    throw new AdmissionsRouteApiError(
      'נדרשים ממוצע הבגרות הרשמי של בן־גוריון, תתי־ציונים בפסיכומטרי ואישור דרישות השפה.',
      'ADMISSIONS_ROUTE_PROFILE_INCOMPLETE',
    );
  }
  return {
    psychometric,
    bguBagrutAverage,
    quantitativeSubscore,
    verbalSubscore,
    englishSubscore,
    languageRequirementsConfirmed,
    subjectRecord,
  };
}

export function fetchTauComputerScienceRoutes(scores: AcademicScores) {
  return fetchComputerScienceRoutes('tau_cs', scores);
}
