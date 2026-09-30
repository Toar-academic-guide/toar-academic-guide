export const ROUTE_ESTIMATE_VERSION = 'standard-estimates-2026-07-20-v1';
export const ROUTE_ESTIMATE_OWNER = 'Toar admissions editorial';

export interface RouteEstimateSeedEntry {
  id: string;
  actionKind: 'psychometric' | 'improve_grade' | 'expand_units' | 'add_subject';
  minChange?: number;
  maxChange?: number;
  durationWeeks: number;
  effortPoints: number;
  eligibility: string;
  rationale: string;
}

export const ROUTE_ESTIMATE_SEED = {
  version: ROUTE_ESTIMATE_VERSION,
  effectiveDate: '2026-07-20',
  owner: ROUTE_ESTIMATE_OWNER,
  effortScale: { minimum: 1, maximum: 5 },
  entries: [
    {
      id: 'psychometric-increase-1-30',
      actionKind: 'psychometric',
      minChange: 1,
      maxChange: 30,
      durationWeeks: 8,
      effortPoints: 5,
      eligibility: 'The target psychometric score is 1–30 points above the current score.',
      rationale: 'Standard preparation and one additional psychometric sitting.',
    },
    {
      id: 'psychometric-increase-31-600',
      actionKind: 'psychometric',
      minChange: 31,
      maxChange: 600,
      durationWeeks: 10,
      effortPoints: 5,
      eligibility: 'The target psychometric score is 31–600 points above the current score.',
      rationale: 'Standard preparation and one additional psychometric sitting.',
    },
    {
      id: 'bagrut-grade-increase-1-10',
      actionKind: 'improve_grade',
      minChange: 1,
      maxChange: 10,
      durationWeeks: 12,
      effortPoints: 3,
      eligibility: 'The target Bagrut grade is 1–10 points above the current grade.',
      rationale: 'Standard independent Bagrut grade-improvement preparation.',
    },
    {
      id: 'bagrut-grade-increase-11-100',
      actionKind: 'improve_grade',
      minChange: 11,
      maxChange: 100,
      durationWeeks: 16,
      effortPoints: 4,
      eligibility: 'The target Bagrut grade is 11–100 points above the current grade.',
      rationale: 'Standard independent Bagrut grade-improvement preparation.',
    },
    {
      id: 'bagrut-unit-expansion',
      actionKind: 'expand_units',
      minChange: 1,
      maxChange: 4,
      durationWeeks: 16,
      effortPoints: 4,
      eligibility: 'An existing examined Bagrut subject expands by 1–4 units, up to five units.',
      rationale: 'Standard preparation for an eligible higher-unit Bagrut subject.',
    },
    {
      id: 'bagrut-added-five-unit-subject',
      actionKind: 'add_subject',
      durationWeeks: 28,
      effortPoints: 5,
      eligibility: 'One institution-supported subject is added at five units.',
      rationale: 'Standard preparation for one newly added five-unit Bagrut subject.',
    },
  ] satisfies RouteEstimateSeedEntry[],
} as const;
