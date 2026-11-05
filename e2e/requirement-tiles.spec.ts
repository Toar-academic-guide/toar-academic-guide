import { expect, test, type Page } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidence = resolve('docs/ui-verification/2026-10-23-requirement-tiles');
const baselineUrl = process.env.REQUIREMENT_TILES_BASELINE_URL;
const cases = {
  law_low: {
    program: 'colmgmt_law',
    institution: 'colman',
    scores: {
      bagrut: { weightedAverage: 60 },
      psychometric: { overall: 400, quantitative: 80, english: 100 },
      admissions: { colmanBagrutAverage: 60, colmanBagrutCertificateConfirmed: true },
    },
  },
  mta_low: {
    program: 'tlvyaffo_cs',
    institution: 'mta',
    scores: {
      bagrut: {
        weightedAverage: 60,
        subjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 70 }],
        },
      },
      psychometric: { overall: 400, quantitative: 80, english: 100 },
    },
  },
  cs_bagrut_match: {
    program: 'colmgmt_cs',
    institution: 'colman',
    scores: {
      bagrut: {
        weightedAverage: 95,
        subjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
        },
      },
      admissions: { colmanBagrutAverage: 90, colmanBagrutCertificateConfirmed: true },
    },
  },
  generic_education: {
    program: 'education',
    institution: 'bgu',
    scores: {
      bagrut: { weightedAverage: 100 },
      admissions: {
        bguBagrutAverage: 100,
        bguSocialScienceRoute: 'bagrut',
        bguSocialScienceRequirementsConfirmed: true,
        bguSocialScienceLanguageConfirmed: true,
        bguReturningFromStudyBreak: false,
      },
    },
  },
};

async function state(page: Page) {
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
  await expect(page.getByRole('button', { name: 'קבלו שיחה מהמוסד', exact: true })).toBeVisible();
  const badge = page.locator('.journey-status').first();
  await expect(badge).not.toContainText('מחשבים');
  return {
    badge: await badge.innerText(),
    explanation: await page.locator('.journey-result-explanation').allTextContents(),
    actions: await page.locator('.journey-detail-actions').innerText(),
    links: await page.locator('.journey-links').first().innerText(),
  };
}

for (const id of [
  'tlvyaffo_cs',
  'colmgmt_law',
  'colmgmt_business',
  'colmgmt_cs',
  'tau_law',
  'nursing',
  'education',
]) {
  test(`${id} requirements disclosure and layout`, async ({ page }) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/programs/${id}`);
      const card = page
        .locator('section.rounded-2xl')
        .filter({ has: page.getByRole('heading', { name: 'תנאי קבלה', exact: true }) });
      await expect(card).toBeVisible();
      const tiled = card.getByText('פרטים נוספים', { exact: true });
      if (
        ['tlvyaffo_cs', 'colmgmt_law', 'colmgmt_business', 'colmgmt_cs', 'education'].includes(id)
      ) {
        await expect(tiled.first()).toBeVisible();
        expect(
          await tiled.first().evaluate((e) => (e.parentElement as HTMLDetailsElement).open),
        ).toBe(false);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (
        (width === 1440 && id.startsWith('colmgmt')) ||
        (width === 1440 && id === 'tlvyaffo_cs')
      ) {
        mkdirSync(evidence, { recursive: true });
        await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
        await page.screenshot({ path: resolve(evidence, `${id}-1440.png`), fullPage: true });
      }
      for (const summary of await card.locator('summary').all()) await summary.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(card).not.toContainText('incomplete_published_requirements');
      if (id === 'tlvyaffo_cs') await expect(card.locator('bdi[dir="ltr"]')).toContainText('÷ 2');
    }
  });
}

for (const [name, c] of Object.entries(cases)) {
  test(`calculator ${name} preserves baseline decisions and actions`, async ({ browser, page }) => {
    test.skip(
      !baselineUrl,
      'Set REQUIREMENT_TILES_BASELINE_URL to compare against the deployed baseline.',
    );
    test.setTimeout(90000);
    const baseline = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      locale: 'he-IL',
    });
    const draft = {
      fields: [],
      locations: ['all'],
      types: ['all'],
      selectedRowId: `${c.program}:${c.institution}`,
      scores: c.scores,
    };
    await baseline.addInitScript(
      (draft) => sessionStorage.setItem('myway_study_journey_v2', JSON.stringify(draft)),
      draft,
    );
    const responses: Record<string, unknown> = {};
    baseline.on('response', async (response) => {
      if (response.url().includes('/api/catalog/'))
        responses[new URL(response.url()).pathname] = await response.json();
    });
    const evaluation = baseline.waitForResponse(
      (r) =>
        r.url().endsWith('/api/admissions/evaluate') &&
        r.request().postDataJSON()?.degreeIds?.includes(c.program),
    );
    await baseline.goto(`${baselineUrl}/app/calculator#detail`);
    const originalReport = await (await evaluation).json();
    const originalState = await state(baseline);
    const originalRequirements = await baseline
      .getByRole('heading', { name: 'תנאי קבלה', exact: true })
      .evaluate((h) =>
        [...h.nextElementSibling!.querySelectorAll('li')].map((li) => li.textContent!),
      );
    await baseline.close();

    // Replay the observed production catalogue and evaluation responses to isolate
    // this presentation change from local static-mode provider links and live scoring.
    await page.route('**/api/catalog/**', (route) =>
      route.fulfill({ json: responses[new URL(route.request().url()).pathname] }),
    );
    await page.route('**/api/admissions/evaluate', (route) =>
      route.fulfill({ json: originalReport }),
    );
    await page.addInitScript(
      (draft) => sessionStorage.setItem('myway_study_journey_v2', JSON.stringify(draft)),
      draft,
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/app/calculator#detail');
      if (width === 390) await page.reload();
      expect(await state(page)).toEqual(originalState);
      const disclosure = page.getByText('פרטים נוספים', { exact: true }).locator('..');
      await expect(disclosure).toBeVisible();
      expect(await disclosure.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
      const items = await disclosure.locator('li').allTextContents();
      for (const item of originalRequirements)
        expect(items.filter((t) => t === item)).toHaveLength(1);
      expect(new Set(items).size).toBe(items.length);
      await expect(page.getByText('התנאים מורכבים? בדקו את הסיכויים שלכם')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 1440) {
        mkdirSync(evidence, { recursive: true });
        await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
        await page.screenshot({
          path: resolve(evidence, `calculator-${name}-1440.png`),
          fullPage: true,
        });
        writeFileSync(
          resolve(evidence, `baseline-${name}.json`),
          JSON.stringify(
            { source: baselineUrl, ...originalState, requirements: originalRequirements },
            null,
            2,
          ) + '\n',
        );
      }
      if (width === 390)
        await page.screenshot({ path: test.info().outputPath(`${name}-390.png`), fullPage: true });
      await disclosure.locator('summary').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}
