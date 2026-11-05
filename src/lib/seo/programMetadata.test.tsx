import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import { getPublicProgramPageData } from '@/lib/publicCataloguePages';
import { buildProgramMetadata } from './metadata';
import { programLd, programBreadcrumbLd } from './jsonLd';
import ProgramPage from '@/app/programs/[programId]/page';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms(), meta: {} }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions(), meta: {} }),
}));

// Metadata captured from main (a4d84ae). JSON-LD hashes include provider
// catalogues, with duplicate aliases removed from MTA and Colman, and the
// intentional slashed homepage breadcrumb identity from the indexing brief.
const unchangedPrograms = [
  {
    id: 'bgu_psychology',
    structuredDataSha256: '2aabea44e74869b576a140ec5fac1e2714435596aa38f936bbc52a7350f73099',
    name: 'פסיכולוגיה',
    title: 'פסיכולוגיה – אוניברסיטת בן-גוריון בנגב: תנאי קבלה',
    description:
      'פסיכולוגיה באוניברסיטת בן-גוריון בנגב: תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.',
    providers: [
      {
        id: 'bgu',
        name: 'אוניברסיטת בן-גוריון בנגב',
      },
    ],
    breadcrumbNames: ['בית', 'מוסדות לימוד', 'אוניברסיטת בן-גוריון בנגב', 'פסיכולוגיה'],
  },
  {
    id: 'tau_cs',
    structuredDataSha256: '8158c55cfa799653bed1d042df8d973be1a1b48de29937f194b455239cda3449',
    name: 'מדעי המחשב',
    title: 'מדעי המחשב – אוניברסיטת תל אביב: תנאי קבלה',
    description:
      'מדעי המחשב באוניברסיטת תל אביב: תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.',
    providers: [
      {
        id: 'tau',
        name: 'אוניברסיטת תל אביב',
      },
    ],
    breadcrumbNames: ['בית', 'מוסדות לימוד', 'אוניברסיטת תל אביב', 'מדעי המחשב'],
  },
  {
    id: 'nursing',
    structuredDataSha256: '2649cc67211782576c40ebdabfe960a98f7cdef762255bcc6290662a3006bbcd',
    name: 'סיעוד',
    title: 'לימודי סיעוד: תנאי קבלה וסיכויי קבלה',
    description:
      'סיעוד ב-8 מוסדות לימוד: תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.',
    providers: [
      {
        id: 'tau',
        name: 'אוניברסיטת תל אביב',
      },
      {
        id: 'huji',
        name: 'האוניברסיטה העברית בירושלים',
      },
      {
        id: 'bgu',
        name: 'אוניברסיטת בן-גוריון בנגב',
      },
      {
        id: 'haifa',
        name: 'אוניברסיטת חיפה',
      },
      {
        id: 'ariel',
        name: 'אוניברסיטת אריאל',
      },
      {
        id: 'telhai',
        name: 'מכללת תל-חי',
      },
      {
        id: 'mta',
        name: 'המכללה האקדמית תל-אביב-יפו',
      },
      {
        id: 'ono',
        name: 'המכללה האקדמית אונו',
      },
    ],
    breadcrumbNames: ['בית', 'מוסדות לימוד', 'סיעוד'],
  },
  {
    id: 'tlvyaffo_cs',
    structuredDataSha256: '3128a1f6c9654b14cb70ea9b739840dab5e00ee00d5301d565f45fa6261f97e8',
    name: 'מדעי המחשב',
    title: 'מדעי המחשב – המכללה האקדמית תל-אביב-יפו: תנאי קבלה',
    description:
      'מדעי המחשב במכללה האקדמית תל-אביב-יפו: תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.',
    providers: [
      {
        id: 'mta',
        name: 'המכללה האקדמית תל-אביב-יפו',
      },
    ],
    breadcrumbNames: ['בית', 'מוסדות לימוד', 'המכללה האקדמית תל-אביב-יפו', 'מדעי המחשב'],
  },
  {
    id: 'colmgmt_business',
    structuredDataSha256: '1c8f153e91cd5124d44b2ac5d379025e82de08edfc8483578fe434f287979c67',
    name: 'מנהל עסקים',
    title: 'מנהל עסקים – מכללת ניהול – לימודים אקדמיים: תנאי קבלה',
    description:
      'מנהל עסקים במכללת ניהול – לימודים אקדמיים: תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.',
    providers: [
      {
        id: 'colman',
        name: 'מכללת ניהול – לימודים אקדמיים',
      },
    ],
    breadcrumbNames: ['בית', 'מוסדות לימוד', 'מכללת ניהול – לימודים אקדמיים', 'מנהל עסקים'],
  },
  {
    id: 'colmgmt_law',
    structuredDataSha256: 'cd7b8253c7da8e582a88308253af83fa4d1c38845b7e4624a53355fff32e6498',
    name: 'משפטים',
    title: 'משפטים – מכללת ניהול – לימודים אקדמיים: תנאי קבלה',
    description:
      'משפטים במכללת ניהול – לימודים אקדמיים: תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.',
    providers: [
      {
        id: 'colman',
        name: 'מכללת ניהול – לימודים אקדמיים',
      },
    ],
    breadcrumbNames: ['בית', 'מוסדות לימוד', 'מכללת ניהול – לימודים אקדמיים', 'משפטים'],
  },
];

describe('program institution attribution', () => {
  it.each(unchangedPrograms)('preserves canonical output for $id', async (expected) => {
    const page = (await getPublicProgramPageData(expected.id))!;
    expect(await buildProgramMetadata(expected.id)).toEqual({
      title: expected.title,
      description: expected.description,
      alternates: { canonical: `/programs/${expected.id}` },
      openGraph: {
        title: expected.title,
        description: expected.description,
        url: `/programs/${expected.id}`,
        type: 'website',
        locale: 'he_IL',
        siteName: 'MyWay',
      },
    });
    const ld = await programLd(page);
    // Freeze the complete JSON-LD, including nested provider catalogues.
    expect(
      createHash('sha256')
        .update(JSON.stringify({ ld, breadcrumb: programBreadcrumbLd(page) }))
        .digest('hex'),
    ).toBe(expected.structuredDataSha256);
    expect(ld.name).toBe(expected.name);
    expect(ld.provider.map(({ name }) => name)).toEqual(expected.providers.map(({ name }) => name));
    expect(ld.url).toBe(`https://findmyway.co.il/programs/${expected.id}`);
    expect(programBreadcrumbLd(page).itemListElement.map(({ name }) => name)).toEqual(
      expected.breadcrumbNames,
    );
    const markup = renderToStaticMarkup(
      await ProgramPage({ params: Promise.resolve({ programId: expected.id }) }),
    );
    expect(markup.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]).toBe(expected.name);
    if (expected.id === 'nursing') {
      expect(page.isGeneral).toBe(true);
      expect(page.program.institutionId).toBeUndefined();
    }
  });

  it.each([
    {
      id: 'haifa_engineering',
      institution: 'אוניברסיטת חיפה',
      location: 'באוניברסיטת חיפה',
      token: 'אוניברסיטת חיפה',
    },
    {
      id: 'technion_engineering',
      institution: 'הטכניון – מכון טכנולוגי לישראל',
      location: 'בטכניון – מכון טכנולוגי לישראל',
      token: 'טכניון',
    },
    {
      id: 'huji_engineering',
      institution: 'האוניברסיטה העברית בירושלים',
      location: 'באוניברסיטה העברית בירושלים',
      token: 'אוניברסיטה העברית בירושלים',
    },
  ])(
    'names the provider once for $id without changing canonical',
    async ({ id, institution, location, token }) => {
      const page = (await getPublicProgramPageData(id))!;
      const title = `הנדסה וטכנולוגיה – ${institution}${id === 'haifa_engineering' ? ': תנאי קבלה' : ''}`;
      const description = `הנדסה וטכנולוגיה ${location}: תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.`;
      const metadata = await buildProgramMetadata(id);
      expect(metadata).toMatchObject({
        title,
        description,
        openGraph: { title, description, url: `/programs/${id}` },
        alternates: { canonical: `/programs/${id}` },
      });
      for (const text of [title, description]) expect(text.split(token)).toHaveLength(2);
      const ld = await programLd(page);
      expect(ld.name).toBe('הנדסה וטכנולוגיה');
      expect(ld.provider.map(({ name }) => name)).toEqual([institution]);
      expect([ld.name, ld.provider[0].name].join(' ').split(token)).toHaveLength(2);
      expect(ld.url).toBe(`https://findmyway.co.il/programs/${id}`);
      const breadcrumbs = programBreadcrumbLd(page).itemListElement;
      expect(breadcrumbs.map(({ name }) => name)).toEqual([
        'בית',
        'מוסדות לימוד',
        institution,
        'הנדסה וטכנולוגיה',
      ]);
      expect(
        breadcrumbs
          .map(({ name }) => name)
          .join(' ')
          .split(token),
      ).toHaveLength(2);
      expect(breadcrumbs.at(-1)?.item).toBe(ld.url);
    },
  );

  it.each([
    ['mta_cs', 'מדעי המחשב – המכללה האקדמית תל-אביב-יפו: תנאי קבלה'],
    ['colman_law', 'משפטים – מכללת ניהול – לימודים אקדמיים: תנאי קבלה'],
    ['colman_business', 'מנהל עסקים – מכללת ניהול – לימודים אקדמיים: תנאי קבלה'],
  ])('uses the keeper title for alias %s', async (id, title) => {
    expect((await buildProgramMetadata(id)).title).toBe(title);
  });
});
