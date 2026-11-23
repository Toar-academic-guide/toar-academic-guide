import { describe, expect, it, vi } from 'vitest';
import { allPrograms, programsWithLegacyAdmissionFacts } from '@/data/degrees';
import { applyHaifaPhysiotherapyCopy, HAIFA_PHYSIOTHERAPY_NOTES } from './haifaPhysiotherapyCopy';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { serializeProgramRow } from '@/server/catalogue/serializers';
import type {
  ProgramRow,
  ProgramInstitutionRow,
  AdmissionRequirementRow,
  AdmissionThresholdRow,
  InstitutionRow,
} from '@/db/types';
vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('No database access');
  },
}));

describe('Haifa physiotherapy source correction', () => {
  it.each(['physiotherapy', 'haifa_physiotherapy'])(
    'corrects %s while preserving thresholds and other institutions',
    (id) => {
      const previous = programsWithLegacyAdmissionFacts.find((p) => p.id === id)!;
      const result = applyHaifaPhysiotherapyCopy(previous);
      expect(result.thresholds).toEqual(previous.thresholds);
      expect(
        result.institutionDetails?.filter((d) => d.institutionName !== 'אוניברסיטת חיפה'),
      ).toEqual(
        previous.institutionDetails?.filter((d) => d.institutionName !== 'אוניברסיטת חיפה') ?? [],
      );
      const haifa = result.institutionDetails!.find(
        (d) => d.institutionName === 'אוניברסיטת חיפה',
      )!;
      expect(haifa.specificAdmissionNotes).toEqual(HAIFA_PHYSIOTHERAPY_NOTES);
      expect(JSON.stringify(haifa)).not.toContain('ביולוגיה');
      expect(JSON.stringify(haifa)).not.toContain('ראיון קבלה מחייב');
      expect(
        allPrograms
          .find((p) => p.id === id)
          ?.institutionDetails?.find((d) => d.institutionName === 'אוניברסיטת חיפה'),
      ).toEqual(haifa);
    },
  );
  it('corrects stale database notes without writing or inventing a formula', () => {
    const seed = buildCatalogueSeed();
    const id = 'haifa_physiotherapy';
    const result = serializeProgramRow({
      program: seed.programs.find((p) => p.id === id)! as ProgramRow,
      relations: seed.programInstitutions.filter(
        (p) => p.programId === id,
      ) as ProgramInstitutionRow[],
      requirements: seed.admissionRequirements
        .filter((p) => p.programId === id)
        .map((p) => ({
          ...p,
          admissionRequirements: ['ביולוגיה 5 יח"ל — חובה'],
          specificAdmissionNotes: ['ביולוגיה 5 יח"ל — חובה', 'ראיון קבלה מחייב'],
        })) as AdmissionRequirementRow[],
      thresholds: seed.admissionThresholds.filter(
        (p) => p.programId === id,
      ) as AdmissionThresholdRow[],
      sourceUrls: [],
      institutionsById: new Map(seed.institutions.map((p) => [p.id, p as InstitutionRow])),
    });
    expect(result.admissionRequirements).toEqual([]);
    const haifa = result.institutionDetails!.find((d) => d.institutionName === 'אוניברסיטת חיפה')!;
    expect(haifa.specificAdmissionNotes).toEqual(HAIFA_PHYSIOTHERAPY_NOTES);
    expect(JSON.stringify(haifa)).not.toContain('ביולוגיה');
    expect(result.thresholds?.haifa).toBe(680);
  });
});
