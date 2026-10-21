import { allPrograms } from '@/data/degrees';
import type { Program } from '@/data/degrees/types';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { applyCatalogueContentRepair } from './catalogueContentRepair';
import repair from './catalogueContentRepair.json';

describe('verified catalogue content repair', () => {
  it('seeds researched pairs present in the static catalogue without changing their keys', () => {
    const seed = buildCatalogueSeed();
    const seededIds = new Set(seed.programs.map((row) => row.id));
    expect(
      new Set(repair.requirements.map((row) => `${row.programId}:${row.institutionId}`)).size,
    ).toBe(repair.requirements.length);
    for (const row of repair.requirements) {
      // Live-only legacy rows are repaired in SQL, not reintroduced into the seed catalogue.
      if (!seededIds.has(row.programId)) continue;
      const id = `${row.programId}:${row.institutionId}`;
      expect(
        seed.admissionRequirements.find((item) => item.id === id),
        id,
      ).toMatchObject({
        specificAdmissionNotes: row.notes,
      });
      expect(
        seed.sourceUrls.find((item) => item.id === `${id}:program`),
        id,
      ).toMatchObject({
        url: 'programUrl' in row ? row.programUrl : row.sourceUrl,
      });
    }
  });

  it('keeps institution conditions separate and preserves calculation inputs', () => {
    const program = allPrograms.find((item) => item.id === 'communication')!;
    const unchanged = { ...program, id: 'unrelated' };
    expect(applyCatalogueContentRepair(unchanged)).toBe(unchanged);
    const result = applyCatalogueContentRepair(program);
    expect(result.thresholds).toBe(program.thresholds);
    expect(result.minimumBagrut).toBe(program.minimumBagrut);
    expect(result.minimumPsychometric).toBe(program.minimumPsychometric);
    expect(result.admissionRequirements).toBe(program.admissionRequirements);
    for (const detail of result.institutionDetails!) {
      const original = program.institutionDetails!.find(
        (item) => item.institutionName === detail.institutionName,
      )!;
      expect(detail.admissionFacts).toBe(original.admissionFacts);
      expect(detail.admissionAlternativePaths).toBe(original.admissionAlternativePaths);
    }
    const tau = result.institutionDetails!.find((item) =>
      item.institutionName.includes('תל אביב'),
    )!;
    expect(tau.specificAdmissionNotes).not.toEqual(
      result.institutionDetails!.find((item) => item.institutionName.includes('חיפה'))!
        .specificAdmissionNotes,
    );
  });

  it('retains excluded IDs for saved links and corrects verified course identities', () => {
    const byId = new Map(allPrograms.map((program) => [program.id, program]));
    for (const row of repair.excludedPrograms) {
      // Some withdrawn legacy rows exist only in the database, never re-create them in seeds.
      const legacy = { ...allPrograms[0], id: row.programId };
      expect(applyCatalogueContentRepair(legacy)).toMatchObject({
        id: row.programId,
        isListed: false,
      });
    }
    for (const row of repair.requirements) {
      if (row.identity) {
        expect(['academic', 'certificate']).toContain(row.identity.type);
        const input = byId.get(row.programId) ?? { ...allPrograms[0], id: row.programId };
        expect(applyCatalogueContentRepair(input)).toMatchObject(row.identity);
      }
    }
    expect(byId.get('mon_12341122982_graphic_design')).toMatchObject({
      name: 'הכשרת דולות',
      category: 'ליווי לידה',
      type: 'certificate',
    });
  });

  it('does not derive admission facts from newly added display text', () => {
    const original = allPrograms.find((program) => program.id === 'mon_12341134448_business')!;
    const facts: NonNullable<Program['institutionDetails']>[number]['admissionFacts'] = [];
    const input = {
      ...original,
      institutionDetails: original.institutionDetails!.map((detail) => ({
        ...detail,
        admissionFacts: facts,
      })),
    };
    expect(applyCatalogueContentRepair(input).institutionDetails![0].admissionFacts).toBe(facts);
  });
});
