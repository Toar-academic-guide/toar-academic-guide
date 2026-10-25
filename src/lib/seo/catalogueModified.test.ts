import { describe, expect, it } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { institutionModifiedAt, programModifiedAt } from './catalogueModified';

const programs = getStaticCataloguePrograms();

describe('catalogue sitemap provenance', () => {
  it('uses a program source checkedAt without a database', () => {
    expect(programModifiedAt(programs.find((p) => p.id === 'tau_business')!)).toBe('2026-10-21');
  });

  it('uses a newer row updated_at and propagates it to the institution', () => {
    const updated = {
      ...programs.find((p) => p.id === 'tau_cs')!,
      updatedAt: '2026-10-25T10:00:00Z',
    };
    expect(programModifiedAt(updated)).toBe('2026-10-25T10:00:00Z');
    expect(
      institutionModifiedAt(
        getStaticCatalogueInstitutions().find((i) => i.id === 'tau')!,
        [updated],
      ),
    ).toBe('2026-10-25T10:00:00Z');
  });

  it('keeps the latest checkedAt when a row timestamp predates verified source content', () => {
    const program = {
      ...programs.find((p) => p.id === 'tau_business')!,
      updatedAt: '2026-10-01T00:00:00Z',
    };
    expect(programModifiedAt(program)).toBe('2026-10-21');
  });

  it('covers every static catalogue record with a real source date', () => {
    for (const program of programs) {
      expect(Number.isFinite(Date.parse(programModifiedAt(program)))).toBe(true);
    }
    for (const institution of getStaticCatalogueInstitutions()) {
      expect(Number.isFinite(Date.parse(institutionModifiedAt(institution, programs)))).toBe(true);
    }
  });
});

it.each(['jerusalem_academy_classical', 'jerusalem_academy_jazz', 'jerusalem_academy_dance'])(
  'uses the verified curriculum date for %s without changing its admission-source date',
  (id) => {
    expect(programModifiedAt(programs.find((p) => p.id === id)!)).toBe('2026-10-24');
  },
);
