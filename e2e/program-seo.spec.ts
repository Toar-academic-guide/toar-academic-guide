import { expect, test } from './fixtures';

const programs = [
  {
    id: 'haifa_engineering',
    name: 'הנדסה וטכנולוגיה',
    h1: 'הנדסה וטכנולוגיה - אוניברסיטת חיפה',
    title: 'הנדסה וטכנולוגיה – אוניברסיטת חיפה',
    description:
      'הנדסה וטכנולוגיה: מידע על המסלול באוניברסיטת חיפה בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
    institution: 'אוניברסיטת חיפה',
    token: 'אוניברסיטת חיפה',
  },
  {
    id: 'technion_engineering',
    name: 'הנדסה וטכנולוגיה',
    h1: 'הנדסה וטכנולוגיה - הטכניון - מכון טכנולוגי לישראל',
    title: 'הנדסה וטכנולוגיה – הטכניון – מכון טכנולוגי לישראל',
    description:
      'הנדסה וטכנולוגיה: מידע על המסלול בטכניון – מכון טכנולוגי לישראל בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
    institution: 'הטכניון – מכון טכנולוגי לישראל',
    token: 'טכניון',
  },
  // These strings were captured from main (a4d84ae) before the change.
  {
    id: 'bgu_psychology',
    name: 'פסיכולוגיה',
    h1: 'פסיכולוגיה',
    title: 'פסיכולוגיה – אוניברסיטת בן-גוריון בנגב',
    description:
      'פסיכולוגיה באוניברסיטת בן-גוריון בנגב: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
    institution: 'אוניברסיטת בן-גוריון בנגב',
    token: 'אוניברסיטת בן-גוריון בנגב',
  },
  {
    id: 'tau_cs',
    name: 'מדעי המחשב',
    h1: 'מדעי המחשב',
    title: 'מדעי המחשב – אוניברסיטת תל אביב',
    description:
      'מדעי המחשב באוניברסיטת תל אביב: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.',
    institution: 'אוניברסיטת תל אביב',
    token: 'אוניברסיטת תל אביב',
  },
];

for (const width of [1440, 390]) {
  for (const program of programs) {
    test(`${program.id} metadata and heading at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/programs/${program.id}`);
      await expect(page).toHaveTitle(`${program.title} | MyWay`);
      for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
        await expect(page.locator(selector)).toHaveAttribute('content', program.title);
      }
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        program.description,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://findmyway.co.il/programs/${program.id}`,
      );
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveText(program.h1);
      await expect(heading).toHaveCSS('text-align', 'right');
      await expect(heading).toBeVisible();
      const structured = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((scripts) =>
          scripts.flatMap((script) => JSON.parse(script.textContent!)['@graph']),
        );
      const ld = structured.find((node) => node['@type'] === 'EducationalOccupationalProgram');
      const breadcrumb = structured.find((node) => node['@type'] === 'BreadcrumbList');
      expect(ld.name).toBe(program.name);
      expect(ld.provider.map((provider: { name: string }) => provider.name)).toEqual([
        program.institution,
      ]);
      expect(breadcrumb.itemListElement.map((item: { name: string }) => item.name)).toEqual([
        'בית',
        'מוסדות לימוד',
        program.institution,
        program.name,
      ]);
      for (const text of [
        await page.title(),
        program.title,
        program.description,
        `${ld.name} ${ld.provider[0].name}`,
        breadcrumb.itemListElement.map((item: { name: string }) => item.name).join(' '),
      ])
        expect(text.split(program.token)).toHaveLength(2);
    });
  }
}
