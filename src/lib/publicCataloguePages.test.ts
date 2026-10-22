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
    expect((await getPublicProgramPageData(program.id))?.program).toMatchObject({
      id: program.id,
      isListed: false,
    });
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
      institutionId: institution.id,
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
    expect(await getPublicProgramPageData(program.id)).toMatchObject({
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

  it('replaces seeded single-provider links with all subject signals, excluding legacy labels and unknown institutions', async () => {
    const base = getStaticCataloguePrograms().find((program) => program.id === 'nursing')!;
    const institution = getStaticCatalogueInstitutions().find((item) => item.id === 'haifa')!;
    const subject = {
      ...base,
      id: 'read_time_subject',
      name: 'תחום בדיקה',
      institution: 'האוניברסיטה העברית בירושלים',
      linkedInstitutionIds: ['huji'],
      thresholds: { tau: 0, huji: null, unknown: 500 } as typeof base.thresholds,
      institutionDetails: [
        { ...base.institutionDetails![0], institutionName: institution.name },
        { ...base.institutionDetails![0], institutionName: 'מוסד שלא קיים' },
      ],
    };
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [
        subject,
        { ...subject, id: 'listed_specific', institutionId: 'bgu' },
        { ...subject, id: 'unlisted_specific', institutionId: 'ariel', isListed: false },
      ],
      meta: { catalogueSource: 'database' },
    });
    const page = (await getPublicProgramPageData(subject.id))!;
    expect(page.isGeneral).toBe(true);
    expect(page.program.linkedInstitutionIds).toEqual(['tau', 'bgu', 'haifa']);
    expect(page.institutions.map((item) => item.id)).toEqual(['tau', 'bgu', 'haifa']);
    expect(page.institutionProgramPaths).toEqual({
      tau: '/institutions/tau',
      bgu: '/programs/listed_specific',
      haifa: '/institutions/haifa',
    });
    expect(subject.linkedInstitutionIds).toEqual(['huji']);
  });

  it('keeps a vocational single-institution link when there are no subject signals', async () => {
    const program = {
      ...getStaticCataloguePrograms()[0],
      id: 'vocational_single',
      name: 'קורס בדיקה',
      type: 'vocational' as const,
      institution: 'דנון',
      thresholds: undefined,
      institutionDetails: [],
      linkedInstitutionIds: ['danon'],
    };
    vi.mocked(listCataloguePrograms).mockResolvedValue({ data: [program], meta: {} });
    expect(await getPublicProgramPageData(program.id)).toMatchObject({
      program,
      isGeneral: false,
      institutions: [{ id: 'danon' }],
      institutionProgramPaths: { danon: '/institutions/danon' },
    });
  });

  it('ignores seeded institution IDs on legacy subjects and links only to institution-specific programs', async () => {
    const programs = getStaticCataloguePrograms();
    const nursing = {
      ...programs.find((program) => program.id === 'nursing')!,
      institutionId: 'tau' as const,
      linkedInstitutionIds: ['tau', 'haifa'],
      thresholds: { tau: 610, haifa: 580 } as (typeof programs)[0]['thresholds'],
    };
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: programs.map((program) =>
        program.id === nursing.id
          ? nursing
          : {
              ...program,
              // Reproduce the legacy ownership written to general subject DB rows.
              institutionId:
                program.institutionId ?? (program.linkedInstitutionIds[0] as InstitutionId),
            },
      ),
      meta: { catalogueSource: 'database' },
    });
    const page = (await getPublicProgramPageData(nursing.id))!;
    expect(page.isGeneral).toBe(true);
    expect(page.program.institutionId).toBeUndefined();
    expect(page.institutions.map((institution) => institution.id)).toEqual([
      'tau',
      'bgu',
      'haifa',
      'ariel',
      'telhai',
      'mta',
      'ono',
    ]);
    expect(page.institutionProgramPaths).toMatchObject({
      tau: '/institutions/tau',
      bgu: '/programs/bgu_nursing',
      haifa: '/programs/haifa_nursing',
    });
    expect(Object.values(page.institutionProgramPaths)).not.toContain('/programs/nursing');
    const tau = (await getPublicInstitutionPageData('tau'))!;
    const ownIds = programs
      .filter((program) => program.isListed !== false && program.institutionId === 'tau')
      .map((program) => program.id);
    expect(tau.programs.slice(0, ownIds.length).map((program) => program.id)).toEqual(ownIds);
    expect(new Set(tau.programs.map((program) => program.name)).size).toBe(tau.programs.length);
    expect(tau.programs.some((program) => program.id === 'nursing')).toBe(true);
    for (const id of ['biology', 'social_work', 'accounting', 'occupational_therapy']) {
      expect(tau.programs.some((program) => program.id === id)).toBe(false);
    }
    expect(nursing.institutionId).toBe('tau');
  });

  it('does not use another general row as a provider or a specific-program destination', async () => {
    const programs = getStaticCataloguePrograms();
    const nursing = {
      ...programs.find((program) => program.id === 'nursing')!,
      institutionId: 'tau' as const,
    };
    const otherGeneral = {
      ...programs.find((program) => program.id === 'biology')!,
      name: nursing.name,
      institutionId: 'technion' as const,
      thresholds: { haifa: 580 } as typeof nursing.thresholds,
      institutionDetails: [],
    };
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [nursing, otherGeneral],
      meta: { catalogueSource: 'database' },
    });
    const page = (await getPublicProgramPageData(nursing.id))!;
    expect(page.isGeneral).toBe(true);
    expect(page.institutions.map((institution) => institution.id)).not.toContain('technion');
    expect(Object.values(page.institutionProgramPaths)).not.toContain('/programs/biology');
    const otherPage = (await getPublicProgramPageData(otherGeneral.id))!;
    expect(otherPage.isGeneral).toBe(true);
    expect(otherPage.institutions.map((institution) => institution.id)).not.toContain('tau');
    expect(Object.values(otherPage.institutionProgramPaths)).not.toContain('/programs/nursing');
  });

  it('preserves legacy ownership without subject signals and recognizes subjects supported only by a specific program', async () => {
    const base = getStaticCataloguePrograms().find((program) => program.id === 'nursing')!;
    const legacy = {
      ...base,
      name: 'תחום בדיקה ללא ספים',
      institutionId: 'tau' as const,
      thresholds: undefined,
      institutionDetails: [],
      linkedInstitutionIds: ['tau'],
    };
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [legacy],
      meta: { catalogueSource: 'database' },
    });
    expect(await getPublicProgramPageData(legacy.id)).toMatchObject({
      isGeneral: false,
      program: legacy,
    });
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [
        legacy,
        { ...legacy, id: 'specific_only', institutionId: 'bgu', linkedInstitutionIds: ['bgu'] },
      ],
      meta: { catalogueSource: 'database' },
    });
    expect(await getPublicProgramPageData(legacy.id)).toMatchObject({
      isGeneral: true,
      program: { institutionId: undefined, linkedInstitutionIds: ['bgu'] },
      institutionProgramPaths: { bgu: '/programs/specific_only' },
    });
  });

  it('orders own programs first, preserves own duplicates and deduplicates remaining names', async () => {
    const institution = {
      ...getStaticCatalogueInstitutions()[0],
      id: 'test_college' as InstitutionId,
      name: 'מכללת בדיקה',
    };
    const base = getStaticCataloguePrograms().find((program) => program.id === 'nursing')!;
    const general = {
      ...base,
      id: 'general',
      name: 'תחום משותף',
      thresholds: undefined,
      linkedInstitutionIds: ['tau'],
      institutionDetails: [{ ...base.institutionDetails![0], institutionName: institution.name }],
    };
    const own = {
      ...general,
      id: 'own',
      institutionId: institution.id,
      linkedInstitutionIds: [institution.id],
    };
    const other = { ...general, id: 'other', name: 'תחום נוסף' };
    const withdrawn = { ...own, id: 'withdrawn', name: 'תחום זמין', isListed: false };
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({ data: [institution], meta: {} });
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [
        general,
        other,
        { ...other, id: 'other_duplicate' },
        own,
        { ...own, id: 'own_duplicate' },
        withdrawn,
        { ...general, id: 'available', name: withdrawn.name },
      ],
      meta: {},
    });
    const page = (await getPublicInstitutionPageData(institution.id))!;
    expect(page.programs.map((program) => program.id)).toEqual([
      'own',
      'own_duplicate',
      'other',
      'available',
    ]);
    expect(
      (await getPublicProgramPageData(general.id))!.institutionProgramPaths[institution.id],
    ).toBe('/programs/own');
    expect(
      (await getPublicProgramPageData('available'))!.institutionProgramPaths[institution.id],
    ).toBe('/institutions/test_college');
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
