import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { calculateLandingCalculatorState } from '@/lib/landingCalculator';

describe('calculateLandingCalculatorState', () => {
  it('uses the real admissions engine for the landing-page calculator flow', () => {
    const programs = getStaticCataloguePrograms();
    const institutions = getStaticCatalogueInstitutions();

    const lowScores = calculateLandingCalculatorState(programs, institutions, {
      psychometric: 420,
      bagrut: 75,
      degreeId: 'tau_cs',
    });
    const highScores = calculateLandingCalculatorState(programs, institutions, {
      psychometric: 780,
      bagrut: 118,
      degreeId: 'tau_cs',
    });

    expect(lowScores.degreeName).toBe('מדעי המחשב');
    expect(highScores.degreeName).toBe('מדעי המחשב');
    expect(lowScores.results.some((result) => result.status === 'below')).toBe(true);
    expect(highScores.results.some((result) => result.status === 'accepted')).toBe(true);
    expect(highScores.results).not.toEqual(lowScores.results);
  });
});
