import { describe, expect, it, vi } from 'vitest';

import * as contentRepair from '@/data/admissions/catalogueContentRepair';
import { BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS } from '@/data/admissions/batchCUnsupportedProgramIds';
import * as batchCPrograms from '@/data/admissions/batchCUnsupportedProgramIds';
import * as programAliases from '@/lib/seo/programAliases';
import {
  BATCH_C_CATALOGUE_FALLBACK_PROGRAM_IDS,
  findAdmissionsEvaluationProgram,
  withBatchCCatalogueFallback,
} from './admissionsEvaluationProgram';
import * as catalogueStatic from './catalogueStatic';
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

describe('withBatchCCatalogueFallback', () => {
  const programs = getStaticCataloguePrograms();
  const haifaEngineering = programs.find((program) => program.id === 'haifa_engineering')!;
  const expectedFallbackIds = [
    'huji_engineering',
    'tau_engineering',
    'technion_engineering',
    'bgu_engineering',
    'haifa_engineering',
    'shenkar_engineering',
    'azrieli_engineering',
    'braude_engineering',
    'ruppin_engineering',
    'tech_management_engineering',
    'kinneret_engineering',
  ];

  it('pins the fallback allowlist to exactly the 11 approved engineering Batch C ids', () => {
    expect([...BATCH_C_CATALOGUE_FALLBACK_PROGRAM_IDS].sort()).toEqual(
      [...expectedFallbackIds].sort(),
    );
    for (const id of BATCH_C_CATALOGUE_FALLBACK_PROGRAM_IDS) {
      expect(Object.hasOwn(BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS, id)).toBe(true);
      expect(programs.some((program) => program.id === id)).toBe(true);
    }
  });

  it('adds all 11 allowlisted programmes exactly once and nothing else to an empty DB list', () => {
    const result = withBatchCCatalogueFallback([]);

    expect(result.map((program) => program.id).sort()).toEqual([...expectedFallbackIds].sort());
    expect(result).toHaveLength(11);
    expect(new Set(result.map((program) => program.id)).size).toBe(11);
  });

  it.each([
    'ono_medicine',
    'shaare_mishpat_law',
    'beit_berl_graphic_design',
    'huji_prep',
    'telhai_general_academic',
    'mon_12220697934_certificate',
    'mon_12341114114_engineering',
    'mon_12341134763_engineering',
  ])('does not append non-allowlisted Batch C programme %s', (id) => {
    expect(Object.hasOwn(BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS, id)).toBe(true);
    expect(programs.some((program) => program.id === id)).toBe(true);

    expect(withBatchCCatalogueFallback([]).some((program) => program.id === id)).toBe(false);
  });

  it('does not append an allowlisted id missing from the Batch C registry', () => {
    const registry = { ...BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS };
    delete registry[haifaEngineering.id];
    vi.spyOn(batchCPrograms, 'BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS', 'get').mockReturnValue(
      registry,
    );

    expect(
      withBatchCCatalogueFallback([]).some((program) => program.id === haifaEngineering.id),
    ).toBe(false);
  });

  it('appends a missing Batch C programme exactly once', () => {
    const result = withBatchCCatalogueFallback([]);

    expect(result.filter((program) => program.id === haifaEngineering.id)).toEqual([
      haifaEngineering,
    ]);
    expect(withBatchCCatalogueFallback(result)).toEqual(result);
  });

  it('preserves DB objects, their content and order without mutating the input', () => {
    const databaseProgram = Object.freeze({ ...haifaEngineering, name: 'DB programme' });
    const otherProgram = Object.freeze({ ...haifaEngineering, id: 'database_only' });
    const databasePrograms = [otherProgram, databaseProgram];
    Object.freeze(databasePrograms);

    const result = withBatchCCatalogueFallback(databasePrograms);

    expect(result.slice(0, 2)).toEqual(databasePrograms);
    expect(result[0]).toBe(otherProgram);
    expect(result[1]).toBe(databaseProgram);
    expect(result.filter((program) => program.id === haifaEngineering.id)).toEqual([
      databaseProgram,
    ]);
  });

  it('adds only allowlisted Batch C code-catalogue ids in deterministic catalogue order', () => {
    const result = withBatchCCatalogueFallback([]);
    const expected = programs.filter(
      (program) =>
        expectedFallbackIds.includes(program.id) &&
        Object.hasOwn(BATCH_C_UNSUPPORTED_PROGRAM_INSTITUTIONS, program.id) &&
        !contentRepair.RETIRED_PROGRAM_IDS.includes(program.id),
    );

    expect(result).toEqual(expected);
    expect(result.map((program) => program.id)).not.toContain('tau_datascience');
    expect(result.map((program) => program.id)).not.toContain('not_a_real_programme_xyz');
    expect(new Set(result.map((program) => program.id)).size).toBe(result.length);
  });

  it('does not add a canonical Batch C entry already represented by a DB alias', () => {
    const canonicalProgramId = programAliases.canonicalProgramId;
    const databaseAlias = { ...haifaEngineering, id: 'legacy_haifa_engineering', name: 'DB alias' };
    vi.spyOn(programAliases, 'canonicalProgramId').mockImplementation((id, institutionId) =>
      id === databaseAlias.id ? haifaEngineering.id : canonicalProgramId(id, institutionId),
    );

    const result = withBatchCCatalogueFallback([databaseAlias]);

    expect(result[0]).toBe(databaseAlias);
    expect(result.some((program) => program.id === haifaEngineering.id)).toBe(false);
  });

  it('never appends a retired id even when it is eligible for Batch C fallback', () => {
    vi.spyOn(contentRepair, 'RETIRED_PROGRAM_IDS', 'get').mockReturnValue([
      ...contentRepair.RETIRED_PROGRAM_IDS,
      haifaEngineering.id,
    ]);

    const result = withBatchCCatalogueFallback([]);

    expect(result.some((program) => program.id === haifaEngineering.id)).toBe(false);
    expect(result.some((program) => contentRepair.RETIRED_PROGRAM_IDS.includes(program.id))).toBe(
      false,
    );
  });

  it('does not duplicate repeated code-catalogue entries', () => {
    vi.spyOn(catalogueStatic, 'getStaticCataloguePrograms').mockReturnValue([
      haifaEngineering,
      { ...haifaEngineering, name: 'Duplicate code entry' },
    ]);

    expect(withBatchCCatalogueFallback([])).toEqual([haifaEngineering]);
  });
});
