import { allPrograms } from '@/data/degrees';
import { INSTITUTIONS } from '@/data/institutions';
import type { Program } from '@/data/degrees/types';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';

describe('catalogueSeed', () => {
  it('maps every institution and program into exactly one seed row', () => {
    const payload = buildCatalogueSeed();

    expect(payload.institutions).toHaveLength(INSTITUTIONS.length);
    expect(payload.programs).toHaveLength(allPrograms.length);
  });

  it('creates requirement and source candidates for programs with institution details', () => {
    const payload = buildCatalogueSeed();
    const targetProgram = allPrograms.find((program) => program.id === 'tau_cs');

    expect(targetProgram?.institutionDetails?.length).toBeGreaterThan(0);
    expect(payload.admissionRequirements.some((row) => row.programId === 'tau_cs')).toBe(true);
    expect(payload.sourceUrls.some((row) => row.programId === 'tau_cs')).toBe(true);
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
});
