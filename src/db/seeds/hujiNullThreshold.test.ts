import { allPrograms } from '@/data/degrees';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { admissionThresholds } from '@/db/schema';

describe('HUJI biology NULL threshold seed gate', () => {
  it('builds a present nullable threshold row when the static cutoff is null', () => {
    const biology = allPrograms.find((program) => program.id === 'huji_biology')!;
    const seed = buildCatalogueSeed([{ ...biology, thresholds: { huji: null } }]);
    expect(seed.validationErrors).toEqual([]);
    expect(seed.admissionThresholds).toContainEqual({
      id: 'huji_biology:huji:huji:sekhem',
      programId: 'huji_biology',
      institutionId: 'huji',
      universityId: 'huji',
      thresholdKind: 'sekhem',
      thresholdValue: null,
    });
    expect(admissionThresholds.thresholdValue.notNull).toBe(false);
  });

  it('seeds the canonical HUJI biology cutoff as null', () => {
    expect(
      buildCatalogueSeed().admissionThresholds.find(
        (row) => row.id === 'huji_biology:huji:huji:sekhem',
      )?.thresholdValue,
    ).toBeNull();
  });
});
