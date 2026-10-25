import { describe, expect, it } from 'vitest';
import { canonicalInstitutionId } from './institutionAliases';
import { INSTITUTIONS, INSTITUTION_BY_ID, INSTITUTION_BY_NAME } from './institutions';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

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
  it('adds the canonical identity once, retaining every legacy row and its metadata', async () => {
    const { withCanonicalInstitutionAliases } = await import('./institutionAliases');
    const rows = [
      { id: 'ort_braude', name: 'בראודה' },
      { id: 'mon_12220708942', name: 'בראודה נוסף' },
    ];
    const result = withCanonicalInstitutionAliases(rows);
    expect(result).toEqual([...rows, { id: 'braude', name: 'בראודה' }]);
    expect(rows).toHaveLength(2);
    expect(withCanonicalInstitutionAliases(result)).toEqual(result);
  });
});
