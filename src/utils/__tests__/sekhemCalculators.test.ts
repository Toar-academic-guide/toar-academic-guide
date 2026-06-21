import { academicPrograms } from '@/data/degrees/academicPrograms';
import { UNIVERSITIES } from '@/data/degreesData';
import { calculateSekhem, evaluateMinimumFloorsAdmission, evaluateUniversities } from '@/utils/sekhemCalculators';

function getUniversity(id: 'tau' | 'huji' | 'technion' | 'bgu') {
  const university = UNIVERSITIES.find((entry) => entry.id === id);
  if (!university) {
    throw new Error(`Missing university fixture: ${id}`);
  }

  return university;
}

function getProgram(id: string) {
  const program = academicPrograms.find((entry) => entry.id === id);
  if (!program) {
    throw new Error(`Missing program fixture: ${id}`);
  }

  return program;
}

describe('sekhemCalculators', () => {
  it('applies TAU engineering bonuses only to TAU engineering or exact-sciences programs and caps the result at 800', () => {
    const tau = getUniversity('tau');
    const tauEngineeringProgram = getProgram('tau_cs');
    const tauNonEngineeringProgram = getProgram('tau_industrial');
    const strongScores = { psychometric: 700, bagrut: 100 };

    expect(
      calculateSekhem(tau, strongScores, tauEngineeringProgram, {
        hasMath5: true,
        hasPhysics5: true,
      })
    ).toBeCloseTo(746.6667, 3);

    expect(
      calculateSekhem(tau, strongScores, tauNonEngineeringProgram, {
        hasMath5: true,
        hasPhysics5: true,
      })
    ).toBeCloseTo(686.6667, 3);

    expect(
      calculateSekhem(
        tau,
        { psychometric: 800, bagrut: 120 },
        tauEngineeringProgram,
        { hasMath5: true, hasPhysics5: true }
      )
    ).toBe(800);
  });

  it('uses the Technion linear formula and rounds to one decimal place', () => {
    const technion = getUniversity('technion');
    const results = evaluateUniversities(
      [technion],
      getProgram('technion_cs'),
      { psychometric: 701, bagrut: 101 },
      { hasMath5: false, hasPhysics5: false }
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.sekhem).toBe(85.1);
  });

  it('marks a program accepted through the direct psychometric track when the cutoff is met', () => {
    const result = evaluateUniversities(
      [getUniversity('huji')],
      getProgram('huji_psychology'),
      { psychometric: 660, bagrut: 90 },
      { hasMath5: false, hasPhysics5: false }
    )[0];

    expect(result?.status).toBe('accepted');
    expect(result?.admissionTrack).toBe('direct');
  });

  it('evaluates minimum-floors admission with separate psychometric and bagrut gaps', () => {
    const result = evaluateMinimumFloorsAdmission(
      {
        id: 'test-college',
        name: 'Test College',
        formulaType: 'minimum_floors',
        minPsychometric: 620,
        minBagrut: 90,
        scaleDescription: 'Direct minimums',
      },
      620,
      { psychometric: 600, bagrut: 84 }
    );

    expect(result.meetsAll).toBe(false);
    expect(result.deltaNeeded).toEqual({
      psychometric: 20,
      bagrut: 6,
    });
  });
});
