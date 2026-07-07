import { allPrograms } from '@/data/degrees';
import { UNIVERSITIES } from '@/data/degreesData';
import { INSTITUTIONS } from '@/data/institutions';
import type { Program } from '@/data/degrees/types';
import { buildCatalogueSeed, buildCatalogueSeedVerificationReport } from '@/db/seeds/catalogueSeed';

function duplicatedValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates].sort();
}

describe('catalogueSeed', () => {
  it('maps every institution and program into exactly one seed row', () => {
    const payload = buildCatalogueSeed();

    expect(payload.institutions).toHaveLength(INSTITUTIONS.length);
    expect(payload.universityCalculatorConfigs).toHaveLength(UNIVERSITIES.length);
    expect(payload.universityCalculatorConfigs.map((row) => row.institutionId).sort()).toEqual(
      UNIVERSITIES.map((row) => row.id).sort(),
    );
    expect(payload.programs).toHaveLength(allPrograms.length);
  });

  it('emits conflict-safe seed rows for repeatable remote upserts', () => {
    const payload = buildCatalogueSeed();

    expect(duplicatedValues(payload.institutions.map((row) => row.id))).toEqual([]);
    expect(duplicatedValues(payload.programs.map((row) => row.id))).toEqual([]);
    expect(
      duplicatedValues(
        payload.programInstitutions.map((row) => `${row.programId}:${row.institutionId}`),
      ),
    ).toEqual([]);
    expect(duplicatedValues(payload.admissionRequirements.map((row) => row.id))).toEqual([]);
    expect(duplicatedValues(payload.admissionThresholds.map((row) => row.id))).toEqual([]);
    expect(duplicatedValues(payload.sourceUrls.map((row) => row.id))).toEqual([]);
    expect(duplicatedValues(payload.requirementVersions.map((row) => row.id))).toEqual([]);
    expect(duplicatedValues(payload.admissionsSourceCandidates.map((row) => row.id))).toEqual([]);
    expect(duplicatedValues(payload.admissionFacts.map((row) => row.id))).toEqual([]);
    expect(duplicatedValues(payload.admissionAlternativePaths.map((row) => row.id))).toEqual([]);
  });

  it('canonicalizes Monday-only institution ids before creating database rows', () => {
    const payload = buildCatalogueSeed();
    const institutionIds = new Set(payload.institutions.map((row) => row.id));
    const referencedInstitutionIds = [
      ...payload.programs.map((row) => row.institutionId),
      ...payload.programInstitutions.map((row) => row.institutionId),
      ...payload.admissionRequirements.map((row) => row.institutionId),
      ...payload.admissionThresholds.map((row) => row.institutionId),
      ...payload.sourceUrls.map((row) => row.institutionId),
      ...payload.admissionsSourceCandidates.map((row) => row.institutionId),
      ...payload.admissionFacts.map((row) => row.institutionId),
      ...payload.admissionAlternativePaths.map((row) => row.institutionId),
    ].filter((value): value is string => Boolean(value));

    expect(
      referencedInstitutionIds.filter((institutionId) => !institutionIds.has(institutionId)),
    ).toEqual([]);
    expect(payload.programs.find((row) => row.id === 'sapir_law')?.institutionId).toBe('sapir');
    expect(
      payload.programInstitutions.some(
        (row) => row.programId === 'sapir_law' && row.institutionId === 'sapir',
      ),
    ).toBe(true);
  });

  it('creates requirement and source candidates for programs with institution details', () => {
    const payload = buildCatalogueSeed();
    const targetProgram = allPrograms.find((program) => program.id === 'tau_cs');

    expect(targetProgram?.institutionDetails?.length).toBeGreaterThan(0);
    expect(payload.admissionRequirements.some((row) => row.programId === 'tau_cs')).toBe(true);
    expect(payload.sourceUrls.some((row) => row.programId === 'tau_cs')).toBe(true);
  });

  it('seeds representative admissions facts with source provenance', () => {
    const payload = buildCatalogueSeed();

    expect(payload.programs.some((row) => row.id === 'open_university_cs')).toBe(true);
    expect(
      payload.admissionsSourceCandidates.some(
        (row) => row.id === 'ono_nursing:ono:program-source' && row.origin === 'catalogue_url',
      ),
    ).toBe(true);
    expect(
      payload.admissionsSourceCandidates.some(
        (row) =>
          row.id === 'kinneret_sound_eng:kinneret:board-source' &&
          row.origin === 'board_column' &&
          row.confidence === 'low',
      ),
    ).toBe(true);
    expect(
      payload.admissionsSourceCandidates.find(
        (row) => row.id === 'sapir_law:sapir:source:monday-evidence',
      ),
    ).toMatchObject({
      origin: 'board_column',
      confidence: 'high',
      programId: 'sapir_law',
      institutionId: 'sapir',
      url: 'https://www.sapir.ac.il/ba/law#collapse-accordion-798-3',
    });
  });

  it('distinguishes explicit absence, unknown facts, manual gates, and alternatives', () => {
    const payload = buildCatalogueSeed();

    expect(
      payload.admissionFacts.find(
        (row) => row.id === 'open_university_cs:open_university:fact:no-psychometric',
      ),
    ).toMatchObject({
      kind: 'explicit_absence',
      field: 'psychometric',
      comparison: 'not_required',
    });
    expect(
      payload.admissionFacts.find(
        (row) => row.id === 'kinneret_sound_eng:kinneret:fact:unknown-score',
      ),
    ).toMatchObject({
      kind: 'unknown',
      confidence: 'low',
    });
    expect(
      payload.admissionFacts.find((row) => row.id === 'ono_nursing:ono:fact:interview'),
    ).toMatchObject({
      kind: 'manual_gate',
      field: 'interview',
    });
    expect(
      payload.admissionAlternativePaths.find((row) => row.id === 'ono_nursing:ono:alt:bridge'),
    ).toMatchObject({
      kind: 'transfer_path',
      programId: 'ono_nursing',
    });
    expect(
      payload.admissionFacts.find((row) => row.id === 'sapir_law:sapir:fact:no-psychometric'),
    ).toMatchObject({
      kind: 'explicit_absence',
      field: 'psychometric',
      comparison: 'not_required',
      sourceCandidateId: 'sapir_law:sapir:source:monday-evidence',
    });
  });

  it('keeps the Haifa programmes as sekhem seed records with thresholds', () => {
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
        .map((program) => ({ id: program.id, admissionType: program.admissionType })),
    ).toEqual(
      haifaProgramIds.map((programId) => ({
        id: programId,
        admissionType: 'sekhem',
      })),
    );
    expect(
      payload.admissionThresholds.some((threshold) =>
        haifaProgramIds.includes(threshold.programId),
      ),
    ).toBe(true);
  });

  it('is deterministic across repeated runs', () => {
    const first = buildCatalogueSeed();
    const second = buildCatalogueSeed();

    expect(first.programs.map((row) => row.id)).toEqual(second.programs.map((row) => row.id));
    expect(first.admissionRequirements.map((row) => row.id)).toEqual(
      second.admissionRequirements.map((row) => row.id),
    );
    expect(first.admissionThresholds.map((row) => row.id)).toEqual(
      second.admissionThresholds.map((row) => row.id),
    );
  });

  it('reports unknown institution mappings before writing', () => {
    const invalidProgram: Program = {
      id: 'invalid_program',
      name: 'תוכנית ניסוי',
      institution: 'מוסד לא קיים',
      type: 'academic',
      category: 'מדעי החברה',
      profileScore: { AN: 1, TE: 0, CR: 1, SO: 3, LE: 1, OR: 1, DI: 0, ER: 2 },
      admissionType: 'requirements',
      admissionRequirements: [],
    };

    const payload = buildCatalogueSeed([invalidProgram]);

    expect(payload.validationErrors).toHaveLength(1);
    expect(payload.validationErrors[0]?.programId).toBe('invalid_program');
  });

  it('reports stale Haifa requirements state during seed verification', () => {
    const payload = buildCatalogueSeed();

    const verification = buildCatalogueSeedVerificationReport(payload, {
      programs: [
        { id: 'haifa_cs', admissionType: 'requirements' },
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
        expected: 'sekhem',
        actual: 'requirements',
      },
    ]);
    expect(verification.issues).toContain(
      'Program admissionType mismatches: haifa_cs (requirements -> sekhem)',
    );
  });
});
