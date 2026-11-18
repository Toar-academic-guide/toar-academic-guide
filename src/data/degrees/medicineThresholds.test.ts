import { allPrograms } from '@/data/degrees';
import { ACADEMIC_PROGRAMS } from './academic';
import { academicPrograms } from './academicPrograms';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { getStaticCataloguePrograms, toStaticCatalogueProgram } from '@/lib/catalogueStatic';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { buildFormulaBackedPairInventory } from '@/data/admissions/formulaBackedPairInventory';
import { getFormulaPairVerificationEntry } from '@/data/admissions/formulaBackedVerificationLedger';

const nullPlaceholders = [
  ['ee', 'huji'],
  ['me', 'huji'],
  ['psychology', 'technion'],
  ['law', 'technion'],
  ['law', 'bgu'],
  ['business', 'technion'],
  ['economics', 'technion'],
] as const;

describe('medicine threshold scales', () => {
  it.each([
    // Approved test update, Jorje 2026-10-31: A1 keeps BGU 735 in the corrected inventory rather than the static threshold map.
    ['medicine', { tau: 726.44, huji: null, technion: 92, biu: null }],
    ['huji_medicine', { tau: null, huji: null, technion: null, bgu: null }],
    ['tau_medicine', { tau: 726.44, huji: null, technion: null, bgu: null }],
    ['biu_medicine', { biu: null }],
  ] as const)(
    'keeps %s cutoffs on their column scales without legacy medicine values',
    (id, expected) => {
      for (const catalogue of [[...ACADEMIC_PROGRAMS, ...academicPrograms], allPrograms]) {
        const thresholds = catalogue.find((program) => program.id === id)!.thresholds!;
        expect(thresholds).toEqual(expected);
        for (const [university, value] of Object.entries(thresholds)) {
          if (value === null) continue;
          expect([770, 775, 94, 740]).not.toContain(value);
          expect(value >= 11 && value <= 30).toBe(false);
          expect(value).toBeGreaterThanOrEqual(university === 'technion' ? 60 : 200);
          expect(value).toBeLessThanOrEqual(university === 'technion' ? 100 : 800);
        }
      }
    },
  );

  it('links NULL HUJI and BIU medicine without emitting a numeric static cutoff', () => {
    const medicine = getStaticCataloguePrograms().find((program) => program.id === 'medicine')!;
    expect(medicine.linkedInstitutionIds).toEqual(['tau', 'huji', 'technion', 'biu']);
    for (const institution of ['huji', 'biu']) {
      expect(medicine.thresholds).toHaveProperty(institution, null);
      expect([0, NaN, '', 640, 775, 740]).not.toContain(medicine.thresholds![institution]);
    }
    expect(getFormulaPairVerificationEntry('medicine__huji')?.state).toBe('exact');
    expect(getFormulaPairVerificationEntry('medicine__biu')?.state).not.toBe('exact');
  });

  it('retains opted-in NULL links while all seven existing NULL placeholders stay unlinked', () => {
    const medicine = allPrograms.find((program) => program.id === 'medicine')!;
    const optedIn = toStaticCatalogueProgram({ ...medicine, nullThresholdLinks: ['huji', 'biu'] });
    expect(optedIn.linkedInstitutionIds).toEqual(expect.arrayContaining(['huji', 'biu']));
    for (const [programId, institution] of nullPlaceholders) {
      const program = getStaticCataloguePrograms().find((entry) => entry.id === programId)!;
      expect(program.thresholds).toHaveProperty(institution, null);
      expect(program.linkedInstitutionIds, `${programId}:${institution}`).not.toContain(
        institution,
      );
    }
  });

  it('links corrected generic BGU medicine at 735 as withheld without a static BGU key', () => {
    const medicine = getStaticCataloguePrograms().find((program) => program.id === 'medicine')!;
    expect(medicine.thresholds).not.toHaveProperty('bgu');
    expect(medicine.linkedInstitutionIds).not.toContain('bgu');
    expect(canonicalProgramId(medicine.id, 'bgu')).toBe('bgu_medicine');
    expect(buildFormulaBackedPairInventory(allPrograms).pairs).toContainEqual(
      expect.objectContaining({ id: 'medicine__bgu', cutoff: 735 }),
    );
    expect(getFormulaPairVerificationEntry('medicine__bgu')?.state).toBe('withheld');
    const seed = buildCatalogueSeed();
    expect(seed.programInstitutions).toContainEqual({
      programId: 'medicine',
      institutionId: 'bgu',
    });
  });

  it('labels the generic Technion medicine cutoff as an estimated invitation threshold', () => {
    const medicine = allPrograms.find((program) => program.id === 'medicine')!;
    expect(medicine.admissionRequirements.join(' ')).toContain('סף זימון משוער');
    expect(medicine.admissionRequirements.join(' ')).toContain('92');
  });
});
