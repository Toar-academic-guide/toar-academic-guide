import { describe, expect, it } from 'vitest';
import { allPrograms } from '@/data/degrees';
import { academicPrograms } from '@/data/degrees/academicPrograms';
import type { Program } from '@/data/degrees/types';
import { UNIVERSITIES } from '@/data/degreesData';
import type { UserScores } from '@/types';
import { analyzeBucketList } from '@/utils/bucketListEngine';
import { calculateDelta, calculateSekhem, evaluateUniversities } from '@/utils/sekhemCalculators';

const noBonus = { hasMath5: false, hasPhysics5: false };
const withheldIds = ['huji', 'bgu', 'haifa', 'biu'] as const;
// Pin 18 profiles are psychometric / bagrut, exactly as in the final spec.
const guardProfiles: UserScores[] = [
  { psychometric: 650, bagrut: 100 },
  { psychometric: 750, bagrut: 115 },
  { psychometric: 520, bagrut: 88 },
];

function university(id: string) {
  const found = UNIVERSITIES.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing university fixture: ${id}`);
  return found;
}

function program(id: string) {
  const found = academicPrograms.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing programme fixture: ${id}`);
  return found;
}

function evaluate(id: string, programId: string, scores: UserScores) {
  return evaluateUniversities([university(id)], program(programId), scores, noBonus)[0];
}

// Match the existing bucket-list resolver, including generic programme ids.
function resolvedBucketInstitution(entryProgram: Program): string | undefined {
  if (UNIVERSITIES.some((entry) => entry.id === entryProgram.institutionId)) {
    return entryProgram.institutionId;
  }
  return Object.entries(entryProgram.thresholds ?? {})
    .filter(([, threshold]) => threshold !== null)
    .map(([id]) => id)
    .find((id) => UNIVERSITIES.some((entry) => entry.id === id));
}

describe('postfreeze-5 Option A: published Ariel formula, no invented composites', () => {
  // Ariel source-table row: ba-registration-process.2026-10-25.md:15.
  // Text-verified, calculator not run. Precision distinguishes 6.666 from the legacy ratio.
  it.each([
    { pin: 1, bagrut: 100, psychometric: 700, expected: 683.3 },
    { pin: 2, bagrut: 120, psychometric: 800, expected: 799.96 },
    { pin: 3, bagrut: 55, psychometric: 500, expected: 433.315 },
  ])(
    'pin $pin: Ariel B$bagrut/P$psychometric equals $expected',
    ({ bagrut, psychometric, expected }) => {
      expect(
        calculateSekhem(
          university('ariel'),
          { bagrut, psychometric },
          program('ariel_cs'),
          noBonus,
        ),
      ).toBeCloseTo(expected, 6);
    },
  );

  it('pin 4: Ariel evaluateUniversities B100/P700 rounds to 683', () => {
    expect(evaluate('ariel', 'ariel_cs', { bagrut: 100, psychometric: 700 })?.sekhem).toBe(683);
  });

  it('pin 5: Ariel deficit 10 requires 20 psychometric or 4 bagrut points', () => {
    expect(calculateDelta(10, university('ariel'))).toEqual({ psychometric: 20, bagrut: 4 });
  });

  it('pin 6: HUJI without a direct track and with floors met is unavailable', () => {
    const fixture = program('huji_cs');
    expect(fixture.directPsychometric?.huji).toBeUndefined();
    expect(750).toBeGreaterThanOrEqual(fixture.minimumPsychometric?.huji ?? 0);
    expect(115).toBeGreaterThanOrEqual(fixture.minimumBagrut?.huji ?? 0);
    const result = evaluate('huji', 'huji_cs', { bagrut: 115, psychometric: 750 });
    expect.soft(result?.status).toBe('unavailable');
    expect.soft(result?.sekhem).toBeNull();
    expect.soft(result?.deltaNeeded).toBeUndefined();
  });

  it('pin 7: BGU EE preserves its psychometric floor result without sekhem 706', () => {
    const result = evaluate('bgu', 'bgu_ee', { psychometric: 590, bagrut: 120 });
    expect(result?.status).toBe('below');
    expect(result?.threshold).toBe(547);
    expect(result?.explanation).toContain('פסיכומטרי לפחות 600');
    expect(result?.deltaNeeded).toEqual({ psychometric: 10, bagrut: 0 });
    expect(result?.sekhem).toBeNull();
  });

  it('pin 8: BGU biology preserves its bagrut floor result without sekhem 682', () => {
    const result = evaluate('bgu', 'bgu_biology', { psychometric: 700, bagrut: 100 });
    expect(result?.status).toBe('below');
    expect(result?.threshold).toBe(585);
    expect(result?.explanation).toContain('ממוצע בגרות לפחות 106');
    expect(result?.deltaNeeded).toEqual({ psychometric: 0, bagrut: 6 });
    expect(result?.sekhem).toBeNull();
  });

  it.each([
    { pin: 9, id: 'bgu', programId: 'bgu_ee' },
    { pin: 10, id: 'haifa', programId: 'haifa_cs' },
    { pin: 11, id: 'biu', programId: 'biu_cs' },
  ])('pin $pin: $id with floors met is unavailable', ({ id, programId }) => {
    const fixture = program(programId);
    expect(fixture.directPsychometric?.[id]).toBeUndefined();
    expect(750).toBeGreaterThanOrEqual(fixture.minimumPsychometric?.[id] ?? 0);
    expect(115).toBeGreaterThanOrEqual(fixture.minimumBagrut?.[id] ?? 0);
    const result = evaluate(id, programId, { psychometric: 750, bagrut: 115 });
    expect.soft(result?.status).toBe('unavailable');
    expect.soft(result?.sekhem).toBeNull();
    expect.soft(result?.deltaNeeded).toBeUndefined();
  });

  // Approved test update, Jorje 2026-10-26
  it('pin 12: HUJI psychology P725/B90 qualifies for direct admission', () => {
    // Approved test update, Jorje 2026-10-26
    const result = evaluate('huji', 'huji_psychology', { psychometric: 725, bagrut: 90 });
    expect(result?.status).toBe('accepted');
    expect(result?.admissionTrack).toBe('direct');
    // Null score for direct-track results is enforced by pin 18, keeping this regression pin green.
  });

  it('pin 13: Technion CS P701/B101 remains 85.1', () => {
    expect(evaluate('technion', 'technion_cs', { psychometric: 701, bagrut: 101 })?.sekhem).toBe(
      85.1,
    );
  });

  it('pin 14: only TAU retains the legacy normalization output', () => {
    const scores = { bagrut: 100, psychometric: 700 };
    const outputs = Object.fromEntries(
      [...withheldIds, 'ariel', 'tau'].map((id) => [
        id,
        calculateSekhem(university(id), scores, program(`${id}_cs`), noBonus),
      ]),
    );
    expect.soft(outputs.tau).toBeCloseTo(0.6 * 700 + 0.4 * ((100 / 120) * 800), 6);
    expect.soft(outputs.ariel).toBeCloseTo(683.3, 6);
    for (const id of withheldIds) expect.soft(outputs[id], id).toBeNull();
  });

  it('TAU regression: unchanged by postfreeze-5', () => {
    const tau = university('tau');
    const options = { hasMath5: true, hasPhysics5: true };
    expect(
      calculateSekhem(tau, { psychometric: 700, bagrut: 100 }, program('tau_industrial'), options),
    ).toBeCloseTo(686.6667, 3);
    expect(
      calculateSekhem(tau, { psychometric: 700, bagrut: 100 }, program('tau_cs'), options),
    ).toBeCloseTo(696.6667, 3);
    expect(
      calculateSekhem(tau, { psychometric: 800, bagrut: 120 }, program('tau_cs'), options),
    ).toBe(800);
  });

  it('pin 18: no numeric sekhem in any of the three legacy APIs for the four institutions', () => {
    const leaks: string[] = [];
    const affected = UNIVERSITIES.filter((entry) => withheldIds.some((id) => id === entry.id));
    expect(affected).toHaveLength(4);
    const evaluated = new Set<string>();
    const bucketInstitutions = new Set<string>();

    for (const scores of guardProfiles) {
      const profileLabel = `P${scores.psychometric}/B${scores.bagrut}`;
      for (const fixture of allPrograms) {
        for (const institution of affected) {
          const score = calculateSekhem(institution, scores, fixture, noBonus);
          if (typeof score === 'number')
            leaks.push(`calculateSekhem ${fixture.id}/${institution.id} ${profileLabel}: ${score}`);
        }
        // Include missing thresholds: returning zero for unavailable is also a numeric leak.
        for (const result of evaluateUniversities(affected, fixture, scores, noBonus)) {
          evaluated.add(result.university.id);
          if (typeof result.sekhem === 'number')
            leaks.push(
              `evaluateUniversities ${fixture.id}/${result.university.id} ${profileLabel}: ${result.sekhem}`,
            );
        }
      }
      for (const entry of analyzeBucketList(
        allPrograms.map((fixture) => fixture.id),
        scores,
      )) {
        const id = resolvedBucketInstitution(entry.program);
        if (!withheldIds.some((withheldId) => withheldId === id)) continue;
        bucketInstitutions.add(id!);
        if (typeof entry.sekhem === 'number')
          leaks.push(
            `analyzeBucketList ${entry.program.id}/${id} ${profileLabel}: ${entry.sekhem}`,
          );
      }
    }
    expect([...evaluated].sort()).toEqual([...withheldIds].sort());
    expect([...bucketInstitutions].sort()).toEqual([...withheldIds].sort());
    expect(
      leaks,
      `${leaks.length} numeric sekhem leaks; first examples:\n${leaks.slice(0, 12).join('\n')}`,
    ).toHaveLength(0);
  });

  it.each(withheldIds)(
    '%s calculateDelta returns null because no composite derivative is published',
    (id) => {
      expect(calculateDelta(10, university(id))).toBeNull();
    },
  );

  it.each(withheldIds)('%s bucket-list analysis has no score or composite delta', (id) => {
    const fixture = program(`${id}_cs`);
    const [entry] = analyzeBucketList([fixture.id], { psychometric: 750, bagrut: 115 }, [fixture]);
    expect.soft(entry?.status).toBe('no-data');
    expect.soft(entry?.sekhem).toBeNull();
    expect.soft(entry?.delta).toBeUndefined();
  });
});
