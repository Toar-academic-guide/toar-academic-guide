import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { parseReviewedAdmissionsManifest } from '@/server/admissions/reviewedManifest';
import { allPrograms, programsWithLegacyAdmissionFacts } from '@/data/degrees';
import { hybridAdmissionSlice } from './hybridSlice';
import { RETIRED_PROGRAM_IDS } from './catalogueContentRepair';
import manifest from './reviewedManifest.json';

describe('sweep-38 official catalogue corrections', () => {
  it('records schema-valid official evidence for every changed gate and cutoff', () => {
    expect(() => parseReviewedAdmissionsManifest(manifest)).not.toThrow();
    for (const programId of ['ruppin_marine_bio', 'afeka_biomedical', 'medicine']) {
      const changes = manifest.changes.filter((row) => row.target.programId === programId);
      expect(changes).toHaveLength(1);
      expect(changes[0].sourceProofs[0].excerpt).toContain('raw/official/');
      expect(changes[0].sourceProofs[0].excerpt).toContain('2026-10-25');
    }
  });
  it('keeps the marine ID with the official name and removes the false 500/75 gates', () => {
    const program = allPrograms.find((row) => row.id === 'ruppin_marine_bio')!;
    expect(program.name).toBe('מדעי הים והסביבה הימית');
    expect(JSON.stringify(program)).not.toMatch(/מינימלי: (500|75)/);
    expect(hybridAdmissionSlice.find((row) => row.programId === program.id)!.facts).toEqual([]);
    expect(program.admissionRequirements.join(' ')).toContain('100');
    expect(program.admissionRequirements.join(' ')).toContain('620');
  });
  it('retires the generated BGU law placeholder through the existing retirement list', () => {
    expect(RETIRED_PROGRAM_IDS).toContain('bgu_law');
    expect(allPrograms.some((row) => row.id === 'bgu_law')).toBe(false);
    const law = allPrograms.find((row) => row.id === 'law')!;
    expect(law.thresholds?.bgu).toBeNull();
  });
  it('cleans biomedical display and legacy facts while preserving its ID', () => {
    for (const catalogue of [allPrograms, programsWithLegacyAdmissionFacts]) {
      const program = catalogue.find((row) => row.id === 'afeka_biomedical')!;
      const text = JSON.stringify(program);
      expect(text).not.toMatch(/ממוצע בגרות מינימלי: 80|ציון פסיכומטרי מינימלי: 530/);
      expect(program.thresholds).toBeUndefined();
      expect(text).toContain('כמותי 115');
      expect(text).not.toContain('620');
      expect(text).not.toContain('מקצוע מדעי אחר');
    }
  });
  it('records the BGU medicine correction without replacing either saved program ID', () => {
    expect(allPrograms.some((row) => row.id === 'medicine')).toBe(true);
    expect(allPrograms.some((row) => row.id === 'bgu_medicine')).toBe(true);
    expect(manifest.changes).toContainEqual(
      expect.objectContaining({
        target: { institutionId: 'bgu', programId: 'medicine', cycle: '2027' },
        ruleKind: 'admission_cutoff',
        before: 760,
        after: 735,
        effectiveFrom: '2026-10-25',
      }),
    );
  });
});
