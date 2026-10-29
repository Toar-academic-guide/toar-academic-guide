import { describe, expect, it, vi } from 'vitest';

import { findAdmissionsEvaluationProgram } from './admissionsEvaluationProgram';
import { getStaticCataloguePrograms } from './catalogueStatic';

vi.mock('server-only', () => ({}));

describe('findAdmissionsEvaluationProgram', () => {
  const programs = getStaticCataloguePrograms();
  const haifaEngineering = programs.find((program) => program.id === 'haifa_engineering')!;

  it('resolves a Batch C programme from the code catalogue when its DB row is missing', () => {
    expect(findAdmissionsEvaluationProgram([], 'haifa_engineering')).toEqual(haifaEngineering);
  });

  it('prefers the DB programme over the Batch C code catalogue entry', () => {
    const databaseProgram = { ...haifaEngineering, name: 'DB programme' };
    expect(findAdmissionsEvaluationProgram([databaseProgram], 'haifa_engineering')).toBe(
      databaseProgram,
    );
  });

  it('resolves another Batch C programme from the code catalogue', () => {
    expect(findAdmissionsEvaluationProgram([], 'nativ_graphic_design')).toEqual(
      programs.find((program) => program.id === 'nativ_graphic_design'),
    );
  });

  it.each(['not_a_real_programme_xyz', 'tau_datascience'])(
    'does not fall back for non-Batch C id %s',
    (degreeId) => {
      expect(findAdmissionsEvaluationProgram([], degreeId)).toBeUndefined();
    },
  );
});
