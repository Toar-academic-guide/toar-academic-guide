import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
import { listCataloguePrograms, listCatalogueInstitutions } from '@/server/catalogue/queries';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from './catalogueStatic';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';
import { canonicalInstitutionId } from '@/data/institutionAliases';
import { getPublicInstitutionPageData } from './publicCataloguePages';
import { getPublicInstitutionDirectoryData } from './institutionDirectoryData';

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

describe('public institution directory', () => {
  it('keeps all directory identities and real programme links without aliases or internal metadata', async () => {
    const { institutions } = await getPublicInstitutionDirectoryData();
    const ids = institutions.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const institution of getInstitutionDirectoryItems()) {
      expect(ids).toContain(canonicalInstitutionId(institution.id));
    }
    expect(ids).toContain('mon_12341137918');
    expect(ids).toContain('mon_12341149221');
    const tau = institutions.find((i) => i.id === 'tau')!;
    const page = (await getPublicInstitutionPageData('tau'))!;
    expect(tau.programmes.map((p) => p.id).sort()).toEqual(page.programs.map((p) => p.id).sort());
    expect(tau.programmes.find((p) => p.id === 'tau_cs')?.href).toBe('/programs/tau_cs');
    expect(tau).not.toHaveProperty('coverageLevel');
    expect(tau).not.toHaveProperty('confidence');
    expect(tau.programmes[0]).not.toHaveProperty('admissionFacts');
  });
  it('keeps campus regions correct after combining database and directory identities', async () => {
    const { institutions } = await getPublicInstitutionDirectoryData();
    const center = institutions.filter((item) => item.areas.includes('center'));
    for (const id of ['ariel', 'technion', 'bgu', 'haifa', 'telhai']) {
      expect(
        institutions.some((item) => item.id === id),
        id,
      ).toBe(true);
      expect(
        center.some((item) => item.id === id),
        id,
      ).toBe(false);
    }
    expect(center.some((item) => item.id === 'tau')).toBe(true);
    expect(institutions.find((item) => item.id === 'ono')?.areas).toEqual([
      'center',
      'jerusalem',
      'haifa',
      'north',
    ]);
  });

  it('includes verified nationwide providers in each campus region', async () => {
    const { institutions } = await getPublicInstitutionDirectoryData();
    for (const id of ['open_university', 'reidman', 'johnbryce']) {
      expect(institutions.find((item) => item.id === id)?.areas, id).toEqual(
        expect.arrayContaining(['center', 'tel_aviv', 'jerusalem', 'haifa', 'north']),
      );
    }
    for (const id of ['open_university', 'reidman']) {
      expect(institutions.find((item) => item.id === id)?.areas, id).toContain('south');
    }
    expect(institutions.find((item) => item.id === 'johnbryce')?.areas).not.toContain('south');
    const reidman = institutions.find((item) => item.id === 'reidman')!;
    expect(reidman.diplomaType).toBe('תעודה מקצועית');
    expect(reidman.credentials).toContain('professional_certificate');
    expect(reidman.credentials).not.toContain('academic_degree');
  });

  it('offers every mapped subject and distinguishes qualification types in ambiguous labels', async () => {
    const data = await getPublicInstitutionDirectoryData();
    for (const institution of data.institutions) {
      for (const programme of institution.programmes) {
        expect(data.subjects.some((s) => s.key === programme.subjectKey)).toBe(true);
        expect(data.fields.some((f) => f.key === programme.fieldKey)).toBe(true);
      }
    }
    expect(data.subjects.some((s) => s.label === 'הנדסת תוכנה')).toBe(true);
    const art = data.subjects.filter((s) => s.key.endsWith(':אמנות'));
    expect(art.length).toBeGreaterThan(1);
    expect(new Set(art.map((s) => s.label)).size).toBe(art.length);
  });
  it('keeps verified named programmes apart from general categories and technical colleges', async () => {
    const { institutions, subjects } = await getPublicInstitutionDirectoryData();
    const bdo = institutions.find((institution) => institution.id === 'bdo_academy')!;
    expect(bdo.programmes.map((p) => p.name)).toContain('תכנון פרישה');
    expect(bdo.programmes.every((p) => p.href.startsWith('https://'))).toBe(true);
    expect(bdo.fieldSources.business).toContain('bdo-academy.co.il');
    expect(subjects.some((p) => p.label === 'לימודי תעודה מקצועיים')).toBe(false);
    const technical = institutions.find((institution) => institution.id === 'mon_12341101391')!;
    expect(technical.programmes.map((p) => p.id)).toContain('kinneret_sound_technician');
    const academic = institutions.find((institution) => institution.id === 'kinneret')!;
    expect(academic.programmes.map((p) => p.id)).toContain('kinneret_softwareeng');
    expect(academic.programmes.map((p) => p.id)).not.toContain('kinneret_sound_technician');
    expect(institutions.find((i) => i.id === 'mon_12341149221')?.fieldSources.design).toContain(
      'tiltan.co.il',
    );
    expect(institutions.find((i) => i.id === 'tiltan')?.fieldSources.complementary).toContain(
      'tiltancollege.co.il',
    );
  });
  it('does not hide database failures behind static directory results', async () => {
    vi.mocked(listCataloguePrograms).mockRejectedValue(new Error('catalogue unavailable'));
    await expect(getPublicInstitutionDirectoryData()).rejects.toThrow('catalogue unavailable');
  });
});
