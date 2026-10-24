import { expect, test, type Page } from '@playwright/test';
import { studyFields } from '../src/lib/studyJourney';
import type { CatalogueProgram } from '../src/types/catalogue';

const next = (page: Page) => page.getByRole('button', { name: 'המשך', exact: true });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/enquiries', (route) => route.abort());
  await page.route(/(?:monday\.com|slack\.com|posthog\.com|vercel-insights\.com)/, (route) =>
    route.abort(),
  );
});

for (const width of [1280, 390]) {
  test.describe(`UX P1 at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test('engineering search includes every engineering subject and hub on both entry points', async ({
      page,
      request,
    }) => {
      const response = await request.get('/api/catalog/programs');
      expect(response.status()).toBe(200);
      const programs: CatalogueProgram[] = (await response.json()).data;
      const fields = studyFields(programs).filter((field) => /הנדס[הת]/.test(field.name));
      expect(fields.some((field) => field.name === 'הנדסה וטכנולוגיה')).toBe(true);
      expect(fields.some((field) => field.name === 'הנדסת תוכנה')).toBe(true);
      for (const path of ['/', '/app/calculator']) {
        await page.goto(path);
        if (path === '/') {
          await page.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' }).click();
          await page.getByRole('button', { name: 'כן', exact: true }).click();
        }
        await page.getByLabel('חיפוש תחום לימודים').fill('הנדסה');
        for (const field of fields)
          await expect(page.getByRole('button', { name: field.name, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'מדעי המחשב', exact: true })).toHaveCount(0);
      }
    });

    test('Haifa CS and law retain working official programme destinations and referral attribution', async ({
      page,
    }) => {
      for (const [id, path] of [
        ['haifa_cs', '/computer-information-science/program/3210/'],
        ['haifa_law', '/law/program/3000/'],
      ]) {
        await page.goto(`/programs/${id}`);
        const href = await page
          .getByRole('link', { name: 'לאתר המוסד', exact: true })
          .getAttribute('href');
        const url = new URL(href!);
        expect(url.origin).toBe('https://admissions.haifa.ac.il');
        expect(url.pathname).toBe(path);
        expect(url.searchParams.get('utm_source')).toBe('myway');
        expect(url.searchParams.get('utm_medium')).toBe('referral');
      }
    });

    test('blank compulsory units stay empty and are excluded from the submitted grades', async ({
      page,
    }) => {
      await page.goto('/app/calculator?program=tau_cs');
      await expect(next(page)).toBeEnabled();
      await next(page).click();
      await next(page).click();
      await page.getByRole('button', { name: /יש לי ציונים לפי מקצוע/ }).click();
      await page.getByRole('combobox', { name: 'סוג תעודה', exact: true }).selectOption('internal');
      for (const index of [1, 2, 3, 6, 7])
        await expect(page.getByLabel(`יחידות ${index}`, { exact: true })).toHaveValue('');
      for (const [index, grade] of [
        [4, '95'],
        [5, '90'],
      ] as const) {
        await page.getByLabel(`יחידות ${index}`, { exact: true }).fill('5');
        await page.getByLabel(`ציון ${index}`, { exact: true }).fill(grade);
      }
      await next(page).click();
      await page.getByRole('button', { name: 'בלי פסיכומטרי כרגע', exact: true }).click();
      const evaluated = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/admissions/evaluate') &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'לגלות את האפשרויות שלי', exact: true }).click();
      const response = await evaluated;
      expect(response.status()).toBe(200);
      const input = response.request().postDataJSON();
      expect(input.extraInputs.bagrutSubjectRecord.subjects).toEqual([
        { subjectId: 'english', units: 5, grade: 95, assessmentKind: 'exam' },
        { subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' },
      ]);
    });

    test('programme CTA preselects its subject and institution through reload', async ({
      page,
    }) => {
      await page.goto('/programs/tau_cs');
      await page.getByRole('link', { name: 'בדיקת סיכויי קבלה', exact: true }).click();
      await expect(page).toHaveURL(/\/app\/calculator\?program=tau_cs$/);
      await expect(next(page)).toBeEnabled();
      await expect(
        page.getByRole('button', { name: 'מדעי המחשב', exact: true }).first(),
      ).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await expect(next(page)).toBeEnabled();
      expect(
        await page.evaluate(() => JSON.parse(sessionStorage.getItem('myway_study_journey_v2')!)),
      ).toMatchObject({ fields: ['cs'], selectedRowId: 'tau_cs:tau' });
      await next(page).click();
      await expect(page.getByRole('button', { name: 'כל הארץ', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });
}
