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
// catalogues, with duplicate aliases removed from MTA and Colman.
const unchangedPrograms = [
  {
    id: 'bgu_psychology',
    structuredDataSha256: '910ed89e7982717df30a80277764f6b3041523f76814e25ba55f536728b8635d',
    name: 'פסיכולוגיה',
    title: 'פסיכולוגיה – אוניברסיטת בן-גוריון בנגב',
    description:
      'פסיכולוגיה באוניברסיטת בן-גוריון בנגב: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
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
    structuredDataSha256: '7ceb4421cf5612ed958b4c0ebdadb6c7486d53e074d8374b18d33644b849dc64',
    name: 'מדעי המחשב',
    title: 'מדעי המחשב – אוניברסיטת תל אביב',
    description:
      'מדעי המחשב באוניברסיטת תל אביב: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
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
    structuredDataSha256: 'fc6047df073cff42d75dd925c8a83cefc71d5c7fa8fc060d8738656bf8e9d238',
    name: 'סיעוד',
    title: 'לימודי סיעוד: באילו מוסדות לומדים',
    description:
      'סיעוד ב-8 מוסדות לימוד: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
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
    structuredDataSha256: '2eb3cb31261c1496c78e0332f9419540ac1160c262b8529cb5eed0793e927cf7',
    name: 'מדעי המחשב',
    title: 'מדעי המחשב – המכללה האקדמית תל-אביב-יפו',
    description:
      'מדעי המחשב במכללה האקדמית תל-אביב-יפו: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
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
    structuredDataSha256: 'b7e54dafef4bf8285dbfc3c0ed3afa171636a5dd471992f67efbd15d30f0c143',
    name: 'מנהל עסקים',
    title: 'מנהל עסקים – מכללת ניהול – לימודים אקדמיים',
    description:
      'מנהל עסקים במכללת ניהול – לימודים אקדמיים: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
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
    structuredDataSha256: '33025153eb81bcb9d6a7848ad239ed8462dfb144129034b39cbbf0be5e71b021',
    name: 'משפטים',
    title: 'משפטים – מכללת ניהול – לימודים אקדמיים',
    description:
      'משפטים במכללת ניהול – לימודים אקדמיים: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
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
      const title = `הנדסה וטכנולוגיה – ${institution}`;
      const description = `הנדסה וטכנולוגיה: מידע על המסלול ${location} בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.`;
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
    ['mta_cs', 'מדעי המחשב – המכללה האקדמית תל-אביב-יפו'],
    ['colman_law', 'משפטים – מכללת ניהול – לימודים אקדמיים'],
    ['colman_business', 'מנהל עסקים – מכללת ניהול – לימודים אקדמיים'],
  ])('uses the keeper title for alias %s', async (id, title) => {
    expect((await buildProgramMetadata(id)).title).toBe(title);
  });
});
