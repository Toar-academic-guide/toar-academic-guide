import { expect, test } from '@playwright/test';

const cases = [
  {
    id: 'law-boundary',
    program: 'biu_law',
    bagrut: 112,
    subjects: [{ subjectId: 'english', units: 5, grade: 90 }],
    decision: 'pending',
    kind: 'estimated',
  },
  {
    id: 'law-weak',
    program: 'biu_law',
    bagrut: 70,
    subjects: [],
    decision: 'below',
    kind: 'estimated',
  },
  {
    id: 'criminology-boundary',
    program: 'biu_criminology',
    bagrut: 98,
    subjects: [],
    decision: 'pending',
    kind: 'estimated',
  },
  {
    id: 'life-sciences-boundary',
    program: 'biu_lifesciences',
    bagrut: 108,
    subjects: [{ subjectId: 'mathematics', units: 5, grade: 85 }],
    decision: 'pending',
    kind: 'estimated',
  },
  {
    id: 'biotech-missing-science',
    program: 'biu_biotech',
    bagrut: 108,
    subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
    decision: 'unknown',
    kind: 'needs_input',
  },
];

for (const width of [390, 1440]) {
  for (const c of cases) {
    test(`${c.id} at ${width}px uses the real BIU evaluator`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript((c) => {
        sessionStorage.setItem(
          'myway_study_journey_v2',
          JSON.stringify({
            fields: [],
            locations: ['all'],
            types: ['all'],
            selectedRowId: `${c.program}:biu`,
            scores: {
              bagrut: {
                weightedAverage: c.bagrut,
                ...(c.subjects.length && {
                  subjectRecord: { schemaVersion: 1, sector: 'jewish', subjects: c.subjects },
                }),
              },
              psychometric: { english: 85 },
            },
          }),
        );
      }, c);
      const evaluated = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/admissions/evaluate') &&
          response.request().postDataJSON()?.degreeIds?.includes(c.program),
      );
      await page.goto(width === 1440 ? '/#detail' : '/app/calculator#detail');
      const response = await evaluated;
      expect(response.status()).toBe(200);
      const result = (await response.json()).data.reports[c.program].results.find(
        (entry: { linkedInstitutionId: string }) => entry.linkedInstitutionId === 'biu',
      );
      expect(result).toMatchObject({ decision: c.decision, kind: c.kind });
      expect(result.requiredInputs ?? []).not.toContain('institution_weighted_score');
      const explanation = page.locator('.journey-result-explanation');
      await expect(explanation).toHaveText(result.explanation);
      await expect(explanation).toHaveCSS('text-align', 'right');
      await expect(explanation).not.toContainText(/מתואם|מצרף|סכם/);
      const main = page.getByRole('main');
      await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      await expect(main).not.toContainText(/requirements_only|ingestion|needs_input|manual_gate/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(errors).toEqual([]);
      await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
      await page.screenshot({ path: testInfo.outputPath(`${c.id}-${width}.png`), fullPage: true });
    });
  }
}
