import { expect, test } from './fixtures';

test('biu_cs student values wrap only between whole unit tokens at 375px', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: [],
        locations: ['all'],
        types: ['all'],
        selectedRowId: 'biu_cs:biu',
        scores: {
          bagrut: {
            weightedAverage: 105,
            subjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId: 'mathematics', units: 4, grade: 100 }],
            },
          },
          psychometric: { overall: 700, english: 110 },
        },
      }),
    ),
  );
  const evaluated = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/admissions/evaluate') &&
      response.request().postDataJSON()?.degreeIds?.includes('biu_cs'),
  );
  await page.goto('/app/calculator#detail');
  expect((await evaluated).status()).toBe(200);
  const table = page.getByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלך' });
  await expect(table).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const cells = table.getByRole('cell', { name: '4 יח״ל בציון 100', exact: true });
  expect(await cells.count()).toBeGreaterThan(0);
  for (const cell of await cells.all()) {
    const layout = await cell.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const text = node.firstChild!;
      const content = text.textContent!.replace(/\u00a0/g, ' ');
      const rectsFor = (start: number, end: number) => {
        const range = document.createRange();
        range.setStart(text, start);
        range.setEnd(text, end);
        return Array.from(range.getClientRects(), (rect) => ({
          left: rect.left,
          right: rect.right,
          top: rect.top,
        }));
      };
      return {
        box: { left: box.left, right: box.right },
        contentBox: {
          left: box.left + parseFloat(style.paddingLeft),
          right: box.right - parseFloat(style.paddingRight),
        },
        textRects: rectsFor(0, content.length),
        tokens: ['4 יח״ל', 'בציון 100'].map((token) => {
          const start = content.indexOf(token);
          return { token, rects: rectsFor(start, start + token.length) };
        }),
      };
    });
    expect(layout.textRects.length).toBeGreaterThan(0);
    for (const rect of layout.textRects) {
      expect
        .soft(rect.left, 'student text stays inside the cell left edge')
        .toBeGreaterThanOrEqual(layout.box.left - 0.5);
      expect
        .soft(rect.right, 'student text stays inside the cell right edge')
        .toBeLessThanOrEqual(layout.box.right + 0.5);
      expect
        .soft(rect.left, 'student text preserves the cell left padding')
        .toBeGreaterThanOrEqual(layout.contentBox.left - 0.5);
      expect
        .soft(rect.right, 'student text preserves the cell right padding')
        .toBeLessThanOrEqual(layout.contentBox.right + 0.5);
    }
    for (const { token, rects } of layout.tokens) {
      expect(rects.length, token).toBeGreaterThan(0);
      expect(new Set(rects.map((rect) => rect.top)).size, `${token} stays on one line`).toBe(1);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

const cases = [
  {
    id: 'ee-conflicting',
    program: 'biu_ee',
    bagrut: 100,
    psychometric: 650,
    quantitative: 132,
    mathGrade: 90,
    decision: 'unknown',
    verdict: 'מקורות סותרים לגבי תנאי הסף — כדאי לבדוק במחשבון הרשמי',
  },
  {
    id: 'ee-below',
    program: 'biu_ee',
    bagrut: 100,
    psychometric: 649,
    quantitative: 132,
    mathGrade: 90,
    decision: 'below',
    verdict: 'לא עומד/ת בתנאי הסף: פסיכומטרי 649 מתחת ל-700',
  },
  {
    id: 'cs-alternative',
    program: 'biu_cs',
    bagrut: 100,
    psychometric: 650,
    quantitative: 132,
    mathGrade: 92,
    decision: 'unknown',
    verdict: 'עומד/ת בתנאי הסף באחד ממסלולי הקבלה',
  },
  {
    id: 'comp-bio-no-psych',
    program: 'biu_computational_bio',
    bagrut: 100,
    psychometric: undefined,
    quantitative: undefined,
    mathGrade: 80,
    decision: 'below',
    verdict: 'לא עומד/ת בתנאי הסף: ממוצע בגרות 100 מתחת ל-112 · מתמטיקה 5 יח״ל 80 מתחת ל-95',
  },
];

for (const width of [1280, 390])
  for (const profile of cases) {
    test(`${profile.id} floors at ${width}px`, async ({ page }, testInfo) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      const calculatorRequests: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('https://shoham.biu.ac.il/**', (route) => {
        calculatorRequests.push(route.request().url());
        return route.abort();
      });
      await page.addInitScript(
        (profile) =>
          sessionStorage.setItem(
            'myway_study_journey_v2',
            JSON.stringify({
              fields: [],
              locations: ['all'],
              types: ['all'],
              selectedRowId: `${profile.program}:biu`,
              scores: {
                bagrut: {
                  weightedAverage: profile.bagrut,
                  subjectRecord: {
                    schemaVersion: 1,
                    sector: 'jewish',
                    subjects: [
                      { subjectId: 'mathematics', units: 5, grade: profile.mathGrade },
                      { subjectId: 'physics', units: 5, grade: 85 },
                    ],
                  },
                },
                psychometric: {
                  overall: profile.psychometric,
                  quantitative: profile.quantitative,
                  english: 85,
                },
              },
            }),
          ),
        profile,
      );
      const waitForEvaluation = () =>
        page.waitForResponse(
          (response) =>
            response.url().endsWith('/api/admissions/evaluate') &&
            response.request().postDataJSON()?.degreeIds?.includes(profile.program),
        );
      const evaluated = waitForEvaluation();
      await page.goto(width === 1280 ? '/#detail' : '/app/calculator#detail');
      let response = await evaluated;
      if (response.status() === 429) {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        const retry = waitForEvaluation();
        await page.reload();
        response = await retry;
      }
      expect(response.status()).toBe(200);
      const result = (await response.json()).data.reports[profile.program].results.find(
        (r: { linkedInstitutionId: string }) => r.linkedInstitutionId === 'biu',
      );
      expect(result.decision).toBe(profile.decision);
      expect(result.floorChecks.length).toBeGreaterThan(0);
      const table = page.getByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלך' });
      await expect(table).toBeVisible();
      await expect(table).toHaveCSS('text-align', 'right');
      const explanation = page.locator('.journey-result-explanation');
      // Approved test update (Jorje, 2026-10-25): single verdict line replaces rejected prose paragraph
      await expect(explanation).toHaveText(profile.verdict);
      await expect(explanation).toHaveCount(1);
      const summary = await explanation.textContent();
      expect(summary).not.toMatch(
        /https?:\/\/|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:ac\.il|co\.il|org\.il|com)/i,
      );
      expect(summary).not.toMatch(/\n|\.\s+\S/);
      await expect(explanation).toHaveCSS('text-align', 'right');
      if (profile.id === 'ee-conflicting') {
        await expect(table).toContainText('מקורות סותרים');
        await expect(table).toContainText('בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650');
        await expect(explanation).not.toContainText('אלא אם');
      }
      if (profile.decision === 'below') {
        await expect(
          page.locator('.journey-status').filter({ hasText: 'לא עומד/ת בתנאי הסף' }),
        ).toBeVisible();
        // Approved test update (Jorje, 2026-10-25): single verdict line replaces rejected prose paragraph
        await expect(
          page.getByText('מילואימניקים: ייתכן מסלול קבלה ייעודי — כדאי לבדוק מול האוניברסיטה.', {
            exact: true,
          }),
        ).toBeVisible();
      }
      if (profile.decision !== 'below') {
        await expect(
          page.getByText('מילואימניקים: ייתכן מסלול קבלה ייעודי — כדאי לבדוק מול האוניברסיטה.', {
            exact: true,
          }),
        ).toHaveCount(0);
      }
      const detailText = await table.locator('xpath=ancestor::section[1]').textContent();
      expect(detailText).not.toMatch(
        /https?:\/\/|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:ac\.il|co\.il|org\.il|com)/i,
      );
      const estimate = page.locator('.admission-estimate');
      if (await estimate.count()) {
        expect(
          await table.evaluate(
            (node) =>
              !!(
                node.compareDocumentPosition(document.querySelector('.admission-estimate')!) &
                Node.DOCUMENT_POSITION_FOLLOWING
              ),
          ),
        ).toBe(true);
      }
      const link = page.getByRole('link', { name: 'המחשבון הרשמי של בר-אילן', exact: true });
      await expect(link).toHaveAttribute(
        'href',
        'https://shoham.biu.ac.il/kabala/?utm_source=myway&utm_medium=referral',
      );
      await expect(
        // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
        page.getByRole('main').getByRole('button', { name: 'קבלו שיחה מהמוסד', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('button', { name: 'שמירה לרשימה', exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(errors).toEqual([]);
      expect(calculatorRequests).toEqual([]);
      await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
      await page.screenshot({
        path: testInfo.outputPath(`${profile.id}-${width}.png`),
        fullPage: true,
      });
    });
  }
