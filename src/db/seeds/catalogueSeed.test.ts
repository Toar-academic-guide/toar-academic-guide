import { allPrograms } from '@/data/degrees';
import { UNIVERSITIES } from '@/data/degreesData';
import { INSTITUTIONS } from '@/data/institutions';
import type { Program } from '@/data/degrees/types';
import {
  buildCatalogueSeed,
  buildCatalogueSeedVerificationReport,
} from '@/db/seeds/catalogueSeed';

describe('catalogueSeed', () => {
  it('maps every institution and program into exactly one seed row', () => {
    const payload = buildCatalogueSeed();

    expect(payload.institutions).toHaveLength(INSTITUTIONS.length);
    expect(payload.universityCalculatorConfigs.map((row) => row.institutionId).sort()).toEqual(
      UNIVERSITIES.map((row) => row.id).sort()
    );
    expect(payload.programs).toHaveLength(allPrograms.length);
  });

  it('creates requirement and source candidates for programs with institution details', () => {
    const payload = buildCatalogueSeed();
    const targetProgram = allPrograms.find((program) => program.id === 'tau_cs');

    expect(targetProgram?.institutionDetails?.length).toBeGreaterThan(0);
    expect(payload.admissionRequirements.some((row) => row.programId === 'tau_cs')).toBe(true);
    expect(payload.sourceUrls.some((row) => row.programId === 'tau_cs')).toBe(true);
  });

  it('keeps the Haifa programmes as requirements-only seed records', () => {
    const payload = buildCatalogueSeed();
    const haifaProgramIds = [
      'haifa_cs',
      'haifa_psychology',
      'haifa_law',
      'haifa_economics',
      'haifa_biology',
    ];

    expect(
      payload.programs
        .filter((program) => haifaProgramIds.includes(program.id))
        .map((program) => ({ id: program.id, admissionType: program.admissionType }))
    ).toEqual(
      haifaProgramIds.map((programId) => ({
        id: programId,
        admissionType: 'requirements',
      }))
    );
    expect(payload.admissionThresholds.some((threshold) => haifaProgramIds.includes(threshold.programId))).toBe(
      false
    );
  });

  it('is deterministic across repeated runs', () => {
    const first = buildCatalogueSeed();
    const second = buildCatalogueSeed();

    expect(first.programs.map((row) => row.id)).toEqual(second.programs.map((row) => row.id));
    expect(first.admissionRequirements.map((row) => row.id)).toEqual(
      second.admissionRequirements.map((row) => row.id)
    );
    expect(first.admissionThresholds.map((row) => row.id)).toEqual(
      second.admissionThresholds.map((row) => row.id)
    );
  });

  it('reports unknown institution mappings before writing', () => {
    const invalidProgram: Program = {
      id: 'invalid_program',
      name: 'תוכנית ניסוי',
      institution: 'מוסד לא קיים',
      type: 'academic',
      category: 'מדעי החברה',
      riasecScore: { R: 0, I: 1, A: 1, S: 3, E: 1, C: 1 },
      admissionType: 'requirements',
      admissionRequirements: [],
    };

    const payload = buildCatalogueSeed([invalidProgram]);

    expect(payload.validationErrors).toHaveLength(1);
    expect(payload.validationErrors[0]?.programId).toBe('invalid_program');
  });

  it('reports stale Haifa sekhem state during seed verification', () => {
    const payload = buildCatalogueSeed();

    const verification = buildCatalogueSeedVerificationReport(payload, {
      programs: [
        { id: 'haifa_cs', admissionType: 'sekhem' },
        ...payload.programs
          .filter((program) => program.id !== 'haifa_cs')
          .map((program) => ({ id: program.id, admissionType: program.admissionType })),
      ],
      programInstitutions: payload.programInstitutions.map((row) => ({
        programId: row.programId,
        institutionId: row.institutionId,
      })),
      admissionThresholds: payload.admissionThresholds.map((row) => ({
        id: row.id,
        programId: row.programId,
      })),
      universityCalculatorConfigs: payload.universityCalculatorConfigs.map((row) => ({
        institutionId: row.institutionId,
      })),
    });

    expect(verification.isMatching).toBe(false);
    expect(verification.admissionTypeMismatches).toEqual([
      {
        programId: 'haifa_cs',
        expected: 'requirements',
        actual: 'sekhem',
      },
    ]);
    expect(verification.issues).toContain(
      'Program admissionType mismatches: haifa_cs (sekhem -> requirements)'
    );
  });
});
