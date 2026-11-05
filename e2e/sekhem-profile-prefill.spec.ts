import { expect, test, type Page } from './fixtures';

const academicScores = {
  psychometric: { overall: 650, verbal: 111 },
  bagrut: {
    subjectRecord: {
      schemaVersion: 2,
      sector: 'jewish',
      certificateType: 'internal',
      complete: true,
      subjects: [{ subjectId: 'mathematics', units: 5, grade: 92, assessmentKind: 'exam' }],
    },
  },
};

async function calculate(page: Page) {
  const result = page.waitForResponse(
    (r) => r.url().endsWith('/api/admissions/evaluate') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'חשבו את הסכם שלי' }).click();
  const response = await result;
  expect(response.ok()).toBe(true);
  const { data } = await response.json();
  const input = response.request().postDataJSON();
  return { input, results: data.reports[input.degreeIds[0]].results };
}

for (const width of [390, 1280]) {
  test(`results calculator keeps experiments separate from profile saves at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((scores) => {
      if (!localStorage.getItem('sag_user_profile_v1'))
        localStorage.setItem(
          'sag_user_profile_v1',
          JSON.stringify({
            geographicPreference: 'any',
            academicScores: scores,
            assessmentProgress: {
              schemaVersion: 1,
              stage: 'completed',
              geographicPreference: 'any',
              avoidances: [],
              scores: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 2, DI: 3, ER: 1 },
              values: {
                incomeVsImpact: 0,
                independenceVsTeam: 0,
                growthVsStability: 0,
                prestigeVsMeaning: 0,
              },
            },
          }),
        );
      if (!sessionStorage.getItem('myway_study_journey_v2'))
        sessionStorage.setItem(
          'myway_study_journey_v2',
          JSON.stringify({
            fields: ['cs'],
            locations: ['all'],
            types: ['all'],
            scores,
            gradeMode: 'exact',
          }),
        );
    }, academicScores);
    await page.goto('/app/calculator#results');
    await page.getByRole('button', { name: 'סינון' }).click();
    const filter = page.getByLabel('חיפוש אפשרויות');
    await filter.fill('תל אביב');
    const journeyLink = page
      .locator('a[href="/sekhem-calculator?program=tau_cs&from=results"]')
      .first();
    await journeyLink.click();
    const overall = page.locator('#psychometric-total');
    const program = page.getByRole('combobox', { name: 'תוכנית לימודים', includeHidden: true });
    await expect(overall).toHaveValue('650');
    await expect(program).toHaveValue('tau_cs');
    await expect(page.getByLabel('מקצוע 1', { exact: true })).toHaveValue('מתמטיקה');
    await expect(page.getByLabel('יחידות 1', { exact: true })).toHaveValue('5');
    await expect(page.getByLabel('ציון 1', { exact: true })).toHaveValue('92');
    await expect(page.locator('#psychometric-verbal')).toHaveValue('111');
    await expect(overall).toHaveCSS('text-align', 'right');
    await expect(page.locator('#psychometric-english')).toHaveValue('');
    await expect(page.locator('#psychometric-english')).toHaveCSS('text-align', 'right');
    expect((await calculate(page)).input.psychometric).toBe(650);
    await overall.fill('700');
    const { input, results } = await calculate(page);
    expect(input).toMatchObject({
      psychometric: 700,
      degreeIds: ['tau_cs'],
      extraInputs: { bagrutSubjectRecord: academicScores.bagrut.subjectRecord },
    });
    const manual = await page.context().newPage();
    await manual.goto('/sekhem-calculator?program=tau_cs');
    await expect(manual.locator('#psychometric-total')).toHaveValue('');
    for (const index of [4, 3, 2]) {
      await manual.getByRole('button', { name: 'הסרת מקצוע ' + index }).click();
    }
    await manual.getByLabel('יחידות 1', { exact: true }).selectOption('5');
    await manual.getByLabel('ציון 1', { exact: true }).fill('92');
    await manual.locator('summary').filter({ hasText: 'פרטי תעודת הבגרות' }).click();
    await manual.getByRole('combobox', { name: /סוג תעודה/ }).selectOption('internal');
    await manual.locator('#psychometric-total').fill('700');
    await manual.locator('#psychometric-verbal').fill('111');
    expect(await calculate(manual)).toEqual({ input, results });
    await manual.close();
    await page.getByText('בחירת תחום לימודים', { exact: true }).click();
    await program.selectOption('huji_cs');
    await page.reload();
    await expect(overall).toHaveValue('700');
    await expect(program).toHaveValue('huji_cs');
    await page.goBack();
    await journeyLink.click();
    await expect(overall).toHaveValue('650');
    await expect(program).toHaveValue('tau_cs');
    await overall.fill('700');
    await page.getByRole('button', { name: 'עדכון הפרופיל' }).click();
    await expect(page.getByText('הציונים נשמרו בפרופיל.')).toBeVisible();
    const reevaluation = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/admissions/evaluate') &&
        r.request().postDataJSON()?.psychometric === 700,
    );
    await page.goBack();
    expect((await reevaluation).ok()).toBe(true);
    await expect(filter).toHaveValue('תל אביב');
    await journeyLink.click();
    await expect(overall).toHaveValue('700');

    await page.goto('/app/recommendations');
    await page
      .getByRole('button', { name: /חשבונאות.*לחץ לפרטים/ })
      .first()
      .click();
    const recommendation = page.getByRole('link', { name: 'חשבו סכם לתוכנית הזו' }).first();
    const target = new URL((await recommendation.getAttribute('href'))!, page.url());
    await recommendation.click();
    await expect(overall).toHaveValue('700');
    await expect(program).toHaveValue(target.searchParams.get('program')!);
    expect([...target.searchParams.keys()]).toEqual(['program', 'from']);
    await overall.fill('650');
    await page.reload();
    await expect(overall).toHaveValue('650');
    await page.goBack();
    const programDetail = page.getByRole('button', { name: /חשבונאות.*לחץ לפרטים/ }).first();
    await expect(recommendation.or(programDetail).first()).toBeVisible();
    if (!(await recommendation.isVisible())) await programDetail.click();
    await recommendation.click();
    await expect(overall).toHaveValue('700');
  });
}
