import { vi } from 'vitest';
import { UNIVERSITIES } from '@/data/degreesData';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import type { AdmissionThresholdRow, ProgramRow } from '@/db/types';
import { evaluateCatalogueReadiness } from './queries';
import { serializeProgramRow } from './serializers';

vi.mock('server-only', () => ({}));

describe('HUJI biology NULL threshold catalogue gate', () => {
  const threshold = {
    id: 'huji_biology:huji:huji:sekhem',
    programId: 'huji_biology',
    institutionId: 'huji',
    universityId: 'huji',
    thresholdKind: 'sekhem',
    thresholdValue: null,
  } as AdmissionThresholdRow;

  it('accepts a present NULL row without reporting a missing sekhem threshold', () => {
    const snapshot = {
      institutions: [{ id: 'huji' }],
      programs: [{ id: 'huji_biology', admissionType: 'sekhem' as const }],
      programInstitutions: [{ programId: 'huji_biology', institutionId: 'huji' }],
      admissionThresholds: [threshold],
      universityCalculatorConfigs: UNIVERSITIES.map(({ id }) => ({ institutionId: id })),
    };
    expect(evaluateCatalogueReadiness(snapshot)).toEqual({ isReady: true, issues: [] });
    expect(evaluateCatalogueReadiness({ ...snapshot, admissionThresholds: [] }).issues).toContain(
      'Sekhem programs missing thresholds: huji_biology',
    );
  });

  it.each(['explicit NULL row', 'canonical seed row'])(
    'serializes %s as thresholds.huji null',
    (source) => {
      const seed = buildCatalogueSeed();
      const row = seed.admissionThresholds.find((entry) => entry.id === threshold.id)!;
      const result = serializeProgramRow({
        program: seed.programs.find((program) => program.id === 'huji_biology')! as ProgramRow,
        relations: [],
        requirements: [],
        thresholds: [source === 'explicit NULL row' ? threshold : (row as AdmissionThresholdRow)],
        sourceUrls: [],
        institutionsById: new Map(),
      });
      expect(result.thresholds).toHaveProperty('huji', null);
    },
  );
});
