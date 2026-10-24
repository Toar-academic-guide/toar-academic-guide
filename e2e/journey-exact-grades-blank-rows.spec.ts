import { expect, test } from '@playwright/test';

function findSubjectRecords(value: unknown): { subjects: { subjectId: string }[] }[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const own =
    record.subjectRecord && typeof record.subjectRecord === 'object'
      ? [record.subjectRecord as { subjects: { subjectId: string }[] }]
      : [];
  return [...own, ...Object.values(record).flatMap(findSubjectRecords)];
}

test('exact grades submit with untouched blank starter rows and send only filled subjects', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' }).click();
  await page.getByRole('button', { name: 'כן', exact: true }).click();
  await page.getByRole('button', { name: 'מדעי המחשב', exact: true }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('button', { name: 'יש לי ציונים לפי מקצוע' }).click();
  await page.getByLabel('סוג תעודה').selectOption('internal');

  const labels = await page
    .locator('input[aria-label^="מקצוע "]')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  const math = labels.indexOf('מתמטיקה') + 1;
  const english = labels.indexOf('אנגלית') + 1;
  await page.getByLabel(`יחידות ${math}`, { exact: true }).fill('5');
  await page.getByLabel(`ציון ${math}`, { exact: true }).fill('90');
  await page.getByLabel(`יחידות ${english}`, { exact: true }).fill('5');
  await page.getByLabel(`ציון ${english}`, { exact: true }).fill('85');
  await page.getByRole('button', { name: 'המשך', exact: true }).click();

  await expect(page).toHaveURL(/#psy-mode$/);
  await page.getByRole('button', { name: 'כן, יש לי ציון', exact: true }).click();
  await page.getByLabel('ציון כללי', { exact: true }).fill('650');
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  const requestPromise = page.waitForRequest(
    (request) => request.url().endsWith('/api/admissions/evaluate') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'לגלות את האפשרויות שלי' }).click();
  const request = await requestPromise;

  const records = findSubjectRecords(request.postDataJSON());
  expect(records.length).toBeGreaterThan(0);
  for (const record of records) {
    expect(record.subjects.map((subject) => subject.subjectId).sort()).toEqual([
      'english',
      'mathematics',
    ]);
  }
  expect((await request.response())?.status()).toBe(200);
});
