import { expect, test } from './fixtures';

for (const width of [390, 1280]) {
  test(`Technion programme pages show the official verification notice at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    for (const id of ['ee', 'me']) {
      await page.goto(`/programs/technion_${id}`);
      await expect(page.getByRole('listitem').first()).toHaveText(
        `בחורף תשפ"ז: סכם ${id === 'ee' ? '91.5' : '87'}`,
      );
      const notice = page
        .locator('div')
        .filter({ has: page.locator('> p > time[datetime="2026-10-25"]') });
      await expect(notice).toBeVisible();
      await expect(notice).toHaveCSS('text-align', 'right');
      await expect(notice.getByRole('link', { name: 'הטכניון', exact: true })).toHaveAttribute(
        'href',
        /admissions\.technion\.ac\.il\/sechem-for-admission\//,
      );
      if (id === 'ee')
        await expect(notice).toContainText(
          'באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם',
        );
      else await expect(page.getByText(/באביב תשפ/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (['ee', 'me'].includes(id))
        await page.screenshot({ path: testInfo.outputPath(`${id}-${width}.png`), fullPage: true });
    }
  });

  test(`EE verdict 92 keeps spring 94 in note text at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    // Evaluator boundaries are exercised with official HTML in the unit suite;
    // this response isolates rendering of its accepted result.
    await page.route('**/api/admissions/evaluate', async (route) => {
      const input = route.request().postDataJSON();
      const result = {
        linkedInstitutionId: 'technion',
        institution: { id: 'technion', name: 'הטכניון – מכון טכנולוגי לישראל' },
        kind: 'exact',
        capability: 'exact',
        decision: 'accepted',
        confidence: 'high',
        score: 92,
        threshold: 91.5,
        sourceLabel: 'תנאי קבלה',
        explanation: 'הציון עומד בסף הקבלה.',
        nextAction: 'בדקו את התנאים באתר הטכניון.',
      };
      const report = {
        input,
        program: { id: 'technion_ee', name: 'הנדסת חשמל' },
        results: [result],
        generatedAt: '2026-10-25T00:00:00Z',
        evaluatorVersion: 'test',
        inputDigest: 'test',
      };
      await route.fulfill({
        json: {
          data: input.degreeIds
            ? { reports: { technion_ee: report }, failedDegreeIds: [] }
            : report,
        },
      });
    });
    await page.addInitScript(() =>
      sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: [],
          locations: ['all'],
          types: ['all'],
          selectedRowId: 'technion_ee:technion',
          scores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 750 } },
        }),
      ),
    );
    await page.goto('/app/calculator#detail');
    await expect(page.locator('.journey-result-explanation')).toHaveText('הציון עומד בסף הקבלה.');
    await expect(
      page.getByRole('main').getByText('עומד/ת בסף שחושב', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם'),
    ).toBeVisible();
    await expect(page.getByText(/סף: 91.5/)).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('button', { name: 'יצירת קשר', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`ee-verdict-${width}.png`), fullPage: true });
  });
}

for (const width of [390, 1280]) {
  for (const [programId, name, winter] of [
    ['technion_ee', 'הנדסת חשמל', 'בחורף תשפ"ז: סכם 91.5'],
    ['technion_me', 'הנדסת מכונות', 'בחורף תשפ"ז: סכם 87'],
  ]) {
    test(`${programId} no-score detail puts winter before subjects at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      const explanation =
        'כדי לחשב את המסלול במוסד זה צריך נתוני מקצועות בגרות שהמחשבון הרשמי משתמש בהם.';
      await page.route('**/api/admissions/evaluate', async (route) => {
        const input = route.request().postDataJSON();
        const result = {
          linkedInstitutionId: 'technion',
          institution: { id: 'technion', name: 'הטכניון – מכון טכנולוגי לישראל' },
          capability: 'needs_input',
          kind: 'needs_input',
          decision: 'unknown',
          confidence: 'low',
          sourceLabel: 'נדרשים נתונים נוספים',
          explanation,
          nextAction: 'השלימו את יחידות וציון המקצועות החסרים כדי לקבל הערכה למסלול.',
          requiredInputs: ['bagrut_subject_record'],
        };
        const report = {
          input,
          program: { id: programId, name },
          results: [result],
          generatedAt: '2026-10-25T00:00:00Z',
          evaluatorVersion: 'test',
          inputDigest: 'test',
        };
        await route.fulfill({
          json: {
            data: input.degreeIds
              ? { reports: { [programId]: report }, failedDegreeIds: [] }
              : report,
          },
        });
      });
      await page.addInitScript((id) => {
        sessionStorage.setItem(
          'myway_study_journey_v2',
          JSON.stringify({
            fields: [],
            locations: ['all'],
            types: ['all'],
            selectedRowId: `${id}:technion`,
            scores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 750 } },
          }),
        );
      }, programId);
      await page.goto('/app/calculator#detail');
      const detail = page.locator('.journey-narrow');
      await expect(
        page.getByRole('main').getByRole('heading', { name, exact: true }),
      ).toBeVisible();
      await expect(detail.locator('.journey-result-explanation')).toHaveText(explanation);
      await expect(detail.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
      await expect(detail.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      // Approved test update, Jorje 2026-10-28
      const subjects = [
        'מתמטיקה: 5 יחידות בציון 70 לפחות; בעלי 4 יחידות או ציון נמוך מ־70 ב־5 יחידות נדרשים לבחינת סיווג במתמטיקה בציון 70 לפחות.',
        'פטור מבחינת הסיווג במתמטיקה: קורס חדו״א א׳ (20406) באוניברסיטה הפתוחה בציון 65 לפחות.',
        '5 יח"ל פיזיקה — חובה',
      ];
      // Approved test update, Jorje 2026-10-28
      // The extra maths line moves physics into the existing disclosure.
      await detail.getByText('תנאים נוספים', { exact: true }).click();
      // Approved test update, Jorje 2026-10-28
      for (const subject of subjects) await expect(detail.getByText(subject)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (programId === 'technion_me') await expect(detail.getByText(/באביב תשפ/)).toHaveCount(0);

      const items = detail.getByRole('listitem');
      await expect(items.first(), 'winter must be the first requirement').toHaveText(winter);
      await expect(detail.getByText(winter, { exact: true })).toBeVisible();
      // Approved test update, Jorje 2026-10-28
      await expect(items.nth(1)).toHaveText(subjects[0]);
      // Approved test update, Jorje 2026-10-28
      await expect(items.nth(2)).toHaveText(subjects[1]);
      // Approved test update, Jorje 2026-10-28
      await expect(items.nth(3)).toHaveText(subjects[2]);
      if (programId === 'technion_ee') {
        const spring = 'באביב תשפ"ז, על בסיס מקום פנוי: סכם 94 — מספר המקומות מצומצם';
        await expect(detail.getByText(spring, { exact: true })).toBeVisible();
        const text = await detail.innerText();
        // Approved test update, Jorje 2026-10-28
        expect(text.indexOf(spring)).toBeGreaterThan(text.indexOf(subjects[2]));
      } else {
        await expect(detail.getByText(/באביב תשפ/)).toHaveCount(0);
      }
    });
  }
}
