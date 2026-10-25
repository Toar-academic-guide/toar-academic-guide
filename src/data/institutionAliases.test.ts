import { describe, expect, it } from 'vitest';
import { canonicalInstitutionId } from './institutionAliases';
import { INSTITUTIONS, INSTITUTION_BY_ID, INSTITUTION_BY_NAME } from './institutions';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import { INSTITUTION_REGIONS } from './geography';
import { getInstitutionDirectoryItems } from './institutionDirectory';

describe('Braude data-layer identity aliases', () => {
  it.each(['braude', 'ort_braude', 'mon_12220708942'])(
    'resolves %s to the public identity',
    (id) => {
      expect(canonicalInstitutionId(id)).toBe('braude');
      expect(INSTITUTION_BY_ID[id as keyof typeof INSTITUTION_BY_ID].id).toBe('braude');
    },
  );
  it('leaves unrelated ids intact', () => {
    expect(canonicalInstitutionId('afeka')).toBe('afeka');
    expect(canonicalInstitutionId('mon_unknown')).toBe('mon_unknown');
  });
  it('retains legacy entries and resolves their Hebrew names to the canonical institution', () => {
    expect(INSTITUTIONS.some((i) => i.id === 'ort_braude')).toBe(true);
    expect(INSTITUTIONS.some((i) => i.id === 'braude')).toBe(true);
    for (const row of INSTITUTIONS.filter((i) => canonicalInstitutionId(i.id) === 'braude')) {
      expect(INSTITUTION_BY_NAME[row.name].id).toBe('braude');
    }
  });
  it('keeps both static programme ids while linking to the canonical institution', () => {
    const programs = getStaticCataloguePrograms();
    for (const id of ['braude_engineering', 'braude_prep']) {
      expect(programs.find((p) => p.id === id)?.linkedInstitutionIds).toEqual(['braude']);
    }
  });
});

describe('canonical catalogue institution availability', () => {
  it('lists Braude exactly once while retaining the input legacy rows and their metadata', async () => {
    const { withCanonicalInstitutionAliases } = await import('./institutionAliases');
    const rows = [
      { id: 'ort_braude', name: 'בראודה' },
      { id: 'mon_12220708942', name: 'בראודה נוסף' },
    ];
    const result = withCanonicalInstitutionAliases(rows);
    expect(result).toEqual([{ id: 'braude', name: 'בראודה' }]);
    expect(rows.map((row) => row.id)).toEqual(['ort_braude', 'mon_12220708942']);
    expect(rows).toHaveLength(2);
    expect(withCanonicalInstitutionAliases(result)).toEqual(result);
  });
});

describe('Braude curated metadata regression', () => {
  const expected = {
    id: 'braude',
    name: 'המכללה האקדמית להנדסה אורט בראודה',
    region: 'north',
    domain: 'braude.ac.il',
    programUrl: 'https://www.braude.ac.il',
  };
  it.each(['braude', 'ort_braude', 'mon_12220708942'])(
    'preserves curated metadata when resolving %s',
    (id) => {
      const record = INSTITUTION_BY_ID[id as keyof typeof INSTITUTION_BY_ID];
      expect(record).toMatchObject(expected);
      expect(record.logoUrl).toBeUndefined();
      expect(record).toEqual({
        ...INSTITUTIONS.find((row) => row.id === 'ort_braude'),
        id: 'braude',
      });
    },
  );
  it.each(['המכללה האקדמית להנדסה אורט בראודה', 'המכללה האקדמית להנדסה בראודה'])(
    'preserves curated metadata for Hebrew name %s',
    (name) => {
      expect(INSTITUTION_BY_NAME[name]).toMatchObject(expected);
      expect(INSTITUTION_BY_NAME[name].logoUrl).toBeUndefined();
      expect(INSTITUTION_REGIONS[name]).toBe('north');
    },
  );
  it('lists one northern Braude in the static catalogue and institution directory', () => {
    const rows = getStaticCatalogueInstitutions().filter(
      (row) => canonicalInstitutionId(row.id) === 'braude',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject(expected);
    const directory = getInstitutionDirectoryItems().filter(
      (row) => canonicalInstitutionId(row.id) === 'braude',
    );
    expect(directory).toHaveLength(1);
    expect(directory[0].areas).toContain('north');
    expect(directory[0].name).toBe(expected.name);
  });
});

it('prefers an existing canonical row in either input order without advertising its aliases', async () => {
  const { withCanonicalInstitutionAliases } = await import('./institutionAliases');
  const canonical = { id: 'braude', name: 'canonical' };
  const legacy = { id: 'ort_braude', name: 'legacy' };
  for (const rows of [
    [legacy, canonical],
    [canonical, legacy],
  ]) {
    expect(withCanonicalInstitutionAliases(rows)).toEqual([canonical]);
    expect(rows).toHaveLength(2);
  }
});
