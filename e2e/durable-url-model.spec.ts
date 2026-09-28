import { expect, test } from '@playwright/test';

test.describe('durable URL model', () => {
  test('guest profile retains official decimal averages, false confirmations and zero after reload', async ({
    page,
  }) => {
    await page.goto('/app/profile');
    await page.getByLabel('ממוצע בגרות רשמי של אוניברסיטת תל אביב (50–130)').fill('112.5');
    await page.getByLabel('ממוצע בגרות או הנדסאי מוכר של בן־גוריון (50–130)').fill('110.25');
    await page.getByLabel('אישור תנאי הגשה לתל אביב').selectOption('false');
    await page.getByLabel('אישור דרישות שפה בבן־גוריון').selectOption('false');
    await page.getByLabel('ציון סיווג במתמטיקה של אוניברסיטת תל אביב (0–100)').fill('0');
    await page.getByText('נתונים להנדסה בבן־גוריון', { exact: true }).click();
    await page.getByLabel('אפיק בדיקה להנדסה בבן־גוריון').selectOption('engineering_score');
    await page.getByLabel('השלמת קורס פיזיקה מוכר בבן־גוריון').selectOption('false');
    await page.getByLabel('מוסד המכינה המוכרת להנדסה').selectOption('bgu');
    await page.getByLabel('שנת סיום המכינה (2018 ואילך)').fill('2026');
    await page.getByLabel('יחידות מתמטיקה במכינה (4 או 5)').fill('5');
    await page.getByLabel('ציון מתמטיקה במכינה', { exact: true }).fill('95');
    await page.getByLabel('יחידות פיזיקה במכינה (4 או 5)').fill('5');
    await page.getByLabel('ציון פיזיקה במכינה', { exact: true }).fill('90');
    await page.getByLabel('ממוצע מכינת בן־גוריון למדעים מדויקים והנדסה').fill('91.25');
    await page.getByLabel('תעודת הנדסאי מוסמך מוכרת בבן־גוריון').selectOption('true');
    await page.getByLabel('שעות מתמטיקה או אלגברה ליניארית בתעודת הנדסאי').fill('90');
    await page.getByLabel('ציון מתמטיקה בתעודת הנדסאי', { exact: true }).fill('96');
    await page.getByLabel('שעות פיזיקה בתעודת הנדסאי').fill('90');
    await page.getByLabel('ציון פיזיקה בתעודת הנדסאי', { exact: true }).fill('85');
    await page.getByLabel('כל נתוני ההנדסה הרלוונטיים הוזנו').check();
    await page.getByRole('button', { name: 'שמור והמשך לשאלון ←' }).click();
    await expect(page).toHaveURL(/\/app\/assessment$/);
    await page.goto('/app/profile');
    await page.reload();
    await expect(page.getByLabel('ממוצע בגרות רשמי של אוניברסיטת תל אביב (50–130)')).toHaveValue(
      '112.5',
    );
    await expect(page.getByLabel('ממוצע בגרות או הנדסאי מוכר של בן־גוריון (50–130)')).toHaveValue(
      '110.25',
    );
    await expect(page.getByLabel('אישור תנאי הגשה לתל אביב')).toHaveValue('false');
    await expect(page.getByLabel('אישור דרישות שפה בבן־גוריון')).toHaveValue('false');
    await expect(page.getByLabel('ציון סיווג במתמטיקה של אוניברסיטת תל אביב (0–100)')).toHaveValue(
      '0',
    );
    await page.getByText('נתונים להנדסה בבן־גוריון', { exact: true }).click();
    await expect(page.getByLabel('אפיק בדיקה להנדסה בבן־גוריון')).toHaveValue('engineering_score');
    await expect(page.getByLabel('השלמת קורס פיזיקה מוכר בבן־גוריון')).toHaveValue('false');
    await expect(page.getByLabel('מוסד המכינה המוכרת להנדסה')).toHaveValue('bgu');
    await expect(page.getByLabel('שנת סיום המכינה (2018 ואילך)')).toHaveValue('2026');
    await expect(page.getByLabel('ציון מתמטיקה במכינה', { exact: true })).toHaveValue('95');
    await expect(page.getByLabel('ציון פיזיקה במכינה', { exact: true })).toHaveValue('90');
    await expect(page.getByLabel('ממוצע מכינת בן־גוריון למדעים מדויקים והנדסה')).toHaveValue(
      '91.25',
    );
    await expect(page.getByLabel('תעודת הנדסאי מוסמך מוכרת בבן־גוריון')).toHaveValue('true');
    await expect(page.getByLabel('שעות מתמטיקה או אלגברה ליניארית בתעודת הנדסאי')).toHaveValue(
      '90',
    );
    await expect(page.getByLabel('ציון מתמטיקה בתעודת הנדסאי', { exact: true })).toHaveValue('96');
    await expect(page.getByLabel('ציון פיזיקה בתעודת הנדסאי', { exact: true })).toHaveValue('85');
    await expect(page.getByLabel('כל נתוני ההנדסה הרלוונטיים הוזנו')).toBeChecked();
  });

  test('direct recommendations entry shows a prerequisite state', async ({ page }) => {
    await page.goto('/app/recommendations');

    await expect(page).toHaveURL(/\/app\/recommendations$/);
    await expect(page.getByText('כדי להציג המלצות צריך להשלים שאלון')).toBeVisible();
  });

  test('browser back moves through durable app URLs', async ({ page }) => {
    await page.goto('/app/recommendations');
    await page.goto('/app/calculator');
    await page.goto('/app/saved-programs');

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/calculator$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/recommendations$/);
  });

  test('public catalogue pages render without login', async ({ page }) => {
    await page.goto('/programs/cs');
    await expect(page.getByRole('heading', { name: 'מדעי המחשב' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'בדיקת סיכויי קבלה' })).toHaveAttribute(
      'href',
      '/app/calculator',
    );

    await page.goto('/institutions/tau');
    await expect(page.getByRole('heading', { name: 'אוניברסיטת תל אביב' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'שאלון התאמה' })).toHaveAttribute(
      'href',
      '/app/assessment',
    );
  });

  test('internal data health remains fail-closed for unauthenticated visitors', async ({
    page,
  }) => {
    const response = await page.goto('/internal/data-health');

    expect(response?.status()).toBe(404);
    await expect(page.getByText('Operational Data Health')).toHaveCount(0);
  });
});
