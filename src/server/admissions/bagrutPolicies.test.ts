import { describe, expect, it } from 'vitest';

import {
  BGU_COMPUTER_SCIENCE_ROUTE_POLICY,
  TAU_ENGINEERING_EXACT_SCIENCES_POLICY,
  evaluateTauEngineeringExactSciencesBonus,
} from './bagrutPolicies';

describe('TAU engineering and exact-sciences Bagrut policy', () => {
  it('awards the published bonus only when both qualifying five-unit subjects meet the grade floor', () => {
    expect(
      evaluateTauEngineeringExactSciencesBonus({
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 55 },
          { subjectId: 'physics', units: 5, grade: 55 },
        ],
      }),
    ).toEqual({ bonus: 10, qualifies: true, unmetRequirements: [] });
  });

  it('does not award a bonus when a required subject or its grade floor is missing', () => {
    expect(
      evaluateTauEngineeringExactSciencesBonus({
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 90 },
          { subjectId: 'physics', units: 5, grade: 54 },
        ],
      }),
    ).toEqual({
      bonus: 0,
      qualifies: false,
      unmetRequirements: ['physics_5_units_grade_55'],
    });
  });

  it('records reviewed provenance rather than treating a local shortcut as an official formula', () => {
    expect(TAU_ENGINEERING_EXACT_SCIENCES_POLICY).toMatchObject({
      version: 'tau-engineering-exact-sciences-2026-06-11',
      sourceUrl: 'https://go.tau.ac.il/he/engineering/ba/electrical',
      authority: 'official-published-requirement',
    });
    expect(BGU_COMPUTER_SCIENCE_ROUTE_POLICY).toMatchObject({
      enabled: false,
      authority: 'evidence-incomplete',
    });
  });
});
