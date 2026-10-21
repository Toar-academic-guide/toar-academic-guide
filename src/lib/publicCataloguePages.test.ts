import type { InstitutionId } from '@/data/institutions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
import { listCataloguePrograms, listCatalogueInstitutions } from '@/server/catalogue/queries';

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

import { getPublicInstitutionPageData, getPublicProgramPageData } from './publicCataloguePages';

describe('public catalogue page data', () => {
  it('keeps an unlisted saved programme URL accessible without advertising it on institution pages', async () => {
    const program = { ...getStaticCataloguePrograms()[0], isListed: false };
    vi.mocked(listCataloguePrograms).mockResolvedValue({ data: [program], meta: {} });
    expect((await getPublicProgramPageData(program.id))?.program).toEqual(program);
    const page = await getPublicInstitutionPageData(program.linkedInstitutionIds[0]);
    expect(page?.programs.some((item) => item.id === program.id)).toBe(false);
  });
  beforeEach(() => {
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms(),
      meta: {},
    });
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: getStaticCatalogueInstitutions(),
      meta: {},
    });
  });
  it('resolves a known program without account-owned state', async () => {
    const knownProgram = getStaticCataloguePrograms()[0];

    expect(knownProgram).toBeTruthy();

    const data = await getPublicProgramPageData(knownProgram.id);

    expect(data?.program.name).toBe(knownProgram.name);
    expect(data).not.toHaveProperty('savedProgramIds');
    expect(data).not.toHaveProperty('academicScores');
  });

  it('resolves a known institution and its public programs', async () => {
    const knownInstitution = getStaticCatalogueInstitutions()[0];

    expect(knownInstitution).toBeTruthy();

    const data = await getPublicInstitutionPageData(knownInstitution.id);

    expect(data?.institution.name).toBe(knownInstitution.name);
    expect(
      data?.programs.every((program) => program.linkedInstitutionIds.includes(knownInstitution.id)),
    ).toBe(true);
  });

  it('resolves database-only shared URLs and uses current data for overlapping IDs', async () => {
    const institution = {
      ...getStaticCatalogueInstitutions()[0],
      id: 'mon_database_only' as InstitutionId,
      name: 'מוסד מהקטלוג הפעיל',
    };
    const program = {
      ...getStaticCataloguePrograms()[0],
      id: 'database_program',
      name: 'מסלול מהקטלוג הפעיל',
      linkedInstitutionIds: [institution.id],
    };
    const updated = { ...getStaticCataloguePrograms()[0], name: 'שם מעודכן' };
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [program, updated],
      meta: { catalogueSource: 'database' },
    });
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: [institution],
      meta: { catalogueSource: 'database' },
    });
    expect(await getPublicProgramPageData(program.id)).toEqual({
      program,
      institutions: [institution],
    });
    expect(await getPublicInstitutionPageData(institution.id)).toEqual({
      institution,
      programs: [program],
    });
    expect((await getPublicProgramPageData(updated.id))?.program.name).toBe('שם מעודכן');
    expect(await getPublicProgramPageData(getStaticCataloguePrograms()[1].id)).not.toBeNull();
    expect(
      await getPublicInstitutionPageData(getStaticCatalogueInstitutions()[1].id),
    ).not.toBeNull();
  });

  it('does not turn database failures into legacy data or a misleading 404', async () => {
    vi.mocked(listCataloguePrograms).mockRejectedValue(new Error('CATALOGUE_DATABASE_UNAVAILABLE'));
    await expect(getPublicProgramPageData(getStaticCataloguePrograms()[0].id)).rejects.toThrow(
      'CATALOGUE_DATABASE_UNAVAILABLE',
    );
    await expect(
      getPublicInstitutionPageData(getStaticCatalogueInstitutions()[0].id),
    ).rejects.toThrow('CATALOGUE_DATABASE_UNAVAILABLE');
  });

  it('returns null for unknown public IDs', async () => {
    expect(await getPublicProgramPageData('missing-program')).toBeNull();
    expect(await getPublicInstitutionPageData('missing-institution')).toBeNull();
  });
});
