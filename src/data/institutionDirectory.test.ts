import { describe, expect, it } from 'vitest';

import { getInstitutionDirectoryItems } from './institutionDirectory';
import yoramInstitutionLogos from './yoramInstitutionLogos.generated.json';

describe('institution directory data', () => {
  it('builds one public directory item for every valid Monday institution row', () => {
    const institutions = getInstitutionDirectoryItems();

    expect(institutions).toHaveLength(211);
    expect(institutions.every((institution) => institution.id && institution.name)).toBe(true);
    expect(institutions.some((institution) => institution.itemId === '12242591498')).toBe(false);
    expect(institutions.some((institution) => institution.name === 'י')).toBe(false);
  });

  it('keeps the flagship institution filter useful', () => {
    const popularNames = getInstitutionDirectoryItems()
      .filter((institution) => institution.categories.includes('popular'))
      .map((institution) => institution.name);

    expect(popularNames).toEqual(
      expect.arrayContaining([
        'אוניברסיטת תל אביב',
        'אוניברסיטת בן-גוריון בנגב',
        'האוניברסיטה העברית בירושלים',
        'הטכניון – מכון טכנולוגי לישראל',
      ]),
    );
  });

  it('derives geography and credential filters from Monday fields', () => {
    const institutions = getInstitutionDirectoryItems();

    expect(
      institutions.some(
        (institution) =>
          institution.name === 'אוניברסיטת תל אביב' &&
          institution.areas.includes('tel_aviv') &&
          institution.credentials.includes('subsidized'),
      ),
    ).toBe(true);
    expect(institutions.some((institution) => institution.areas.includes('online'))).toBe(true);
    expect(
      institutions.some((institution) =>
        institution.credentials.includes('professional_certificate'),
      ),
    ).toBe(true);
  });

  it('has a logo URL or favicon domain for every real institution row', () => {
    const institutions = getInstitutionDirectoryItems();
    const rowsWithoutLogoSource = institutions.filter(
      (institution) => !institution.logoUrl && !institution.domain,
    );

    expect(rowsWithoutLogoSource).toEqual([]);
  });

  it('uses curated logo sources for frequently scanned institution cards', () => {
    const institutions = getInstitutionDirectoryItems();
    const byId = new Map(institutions.map((institution) => [institution.id, institution]));

    expect(byId.get('tau')?.logoUrl).toBe('/institution-logos/tau.png');
    expect(byId.get('technion')?.logoUrl).toContain('TechnionLogo');
    expect(byId.get('huji')?.logoUrl).toContain('Hebrew%20University%20Logo');
    expect(byId.get('hit')?.logoUrl).toContain('Holon%20Institute%20of%20Technology');
    expect(byId.get('ono')?.logoUrl).toContain('Ono%20Academic%20College');
    expect(byId.get('minshar')?.logoUrl).toBe('/institution-logos/minshar.png');
    expect(byId.get('nativ')?.logoUrl).toBe('/institution-logos/nativ.png');
    expect(byId.get('beit_zvi')?.logoUrl).toBe('/institution-logos/beit-zvi.png');
    expect(byId.get('david_yellin')?.logoUrl).toBe('/institution-logos/david-yellin.png');
    expect(byId.get('shaare_mishpat')?.logoUrl).toBe(
      '/institution-logos/shaarei-mada-mishpat.png',
    );
    expect(byId.get('ramat_gan')?.logoUrl).toBe('/institution-logos/clb-ramat-gan.png');
    expect(byId.get('telhai')?.logoUrl).toBe('/institution-logos/telhai.png');
    expect(byId.get('israel_academic')?.logoUrl).toBe(
      '/institution-logos/academic-ramat-gan.png',
    );
    expect(byId.get('hackeru')?.logoUrl).toBe('/institution-logos/hackeru.png');
    expect(byId.get('aliya')?.logoUrl).toBe('/institution-logos/aliya.png');
    expect(byId.get('givat_washington')?.logoUrl).toBe(
      '/institution-logos/givat-washington.png',
    );
    expect(byId.get('danon')).toMatchObject({
      domain: 'danon.org.il',
      sourceUrl: 'https://www.danon.org.il',
    });
    expect(byId.get('spieldocs')?.logoUrl).toContain('SamSpigelSchool.svg');
    expect(byId.get('wizo')?.domain).toBe('wizo.org.il');
    expect(byId.get('mon_12220697934')).toMatchObject({
      domain: 'bpm-music.com',
      logoUrl: 'https://i1.sndcdn.com/avatars-000030802522-35lsuk-t500x500.jpg',
    });
    expect(byId.get('mon_12220697940')?.logoUrl).toBe(
      '/institution-logos/yoram-levinstein.png',
    );
    expect(byId.get('mon_12341118768')?.logoUrl).toBe('/institution-logos/hbs-college.png');
    expect(byId.get('mon_12341122479')?.logoUrl).toBe('/institution-logos/inline-college.png');
    expect(byId.get('mon_12341127690')?.logoUrl).toBe('/institution-logos/erez-college.png');
    expect(byId.get('mon_12341128292')?.logoUrl).toBe(
      '/institution-logos/medicine-college.png',
    );
    expect(byId.get('mon_12341064485')?.logoUrl).toBe('/institution-logos/anat-barzilai.png');
    expect(byId.get('mon_12341092879')?.logoUrl).toBe('/institution-logos/studio-6b.png');
    expect(byId.get('mon_12341098736')?.logoUrl).toBe('/institution-logos/laledet.png');
    expect(byId.get('mon_12341102883')?.logoUrl).toBe('/institution-logos/res-college.png');
    expect(byId.get('mon_12341114949')?.logoUrl).toBe('/institution-logos/msc-college.png');
    expect(byId.get('mon_12341133521')?.logoUrl).toBe('/institution-logos/minhal-tech.png');
    expect(byId.get('mon_12341142616')?.logoUrl).toBe('/institution-logos/master-college.png');
    expect(byId.get('mon_12341144078')?.logoUrl).toBe('/institution-logos/natasha-denona.png');
    expect(byId.get('mon_12341092241')?.logoUrl).toBe('/institution-logos/psagot-college.png');
    expect(byId.get('mon_12341126780')?.logoUrl).toBe('/institution-logos/ravit-asaf.png');
  });

  it('uses the generated Yoram logo cache when no curated logo exists', () => {
    const institutions = getInstitutionDirectoryItems();
    const yoramLogos = yoramInstitutionLogos as Record<string, string>;

    expect(Object.keys(yoramLogos)).toHaveLength(164);
    expect(yoramLogos['1567']).toMatch(/^\/institution-logos\/yoram\/1567\.(jpg|png)$/);
    expect(
      institutions.some(
        (institution) =>
          institution.name === 'מכון שכטר למדעי היהדות' &&
          institution.logoUrl === yoramLogos['1567'],
      ),
    ).toBe(true);
  });
});
