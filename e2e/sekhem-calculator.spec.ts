import { expect, test, type Page } from './fixtures';
import { formatSekhemNumber } from '../src/lib/sekhemResultPresentation';
import { ENQUIRY_COPY, ENQUIRY_PREP_CONSENT } from '../src/lib/enquiries';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
} from '../src/types/admissionsEvaluation';

const title = 'מחשבון סכם וסיכויי קבלה לפי מוסד ותוכנית | MyWay';
const canonical = 'https://findmyway.co.il/sekhem-calculator';
const description =
  'מחשבון סכם וסיכויי קבלה בחינם: מזינים ציוני בגרות ופסיכומטרי, מחשבים סכם לפי נוסחאות המוסדות הנתמכים וממשיכים לבדיקת התוכנית שמעניינת אותך.';
const noScoreLine = 'בחלק מהמוסדות נבדקים תנאי קבלה בלי חישוב סכם.';
const kidumText = 'מסלול ראויים לקידום';
const compositeInput = /סכם|מתואם|מצרף|ציון משוקלל|sekhem|sekem|composite|weighted.?score/i;
const absentEvaluatorIds = [
  'bgu_engineering',
  'biu_engineering',
  'biu_prep',
  'haifa_engineering',
  'reichman_engineering',
  'tau_engineering',
  'huji_engineering',
  'huji_prep',
  'technion_engineering',
  'hit_engineering',
  'afeka_engineering',
];
type Locator = ReturnType<Page['locator']>;

type BatchRequest = Omit<AdmissionsEvaluationInput, 'degreeId'> & { degreeIds: string[] };

function result(
  institution: string,
  overrides: Partial<AdmissionsEvaluationResult> = {},
): AdmissionsEvaluationResult {
  return {
    institution: { id: institution, name: institution, region: 'מרכז', domain: 'university' },
    linkedInstitutionId: institution,
    kind: 'exact',
    capability: 'exact',
    decision: 'accepted',
    confidence: 'high',
    sourceLabel: 'תנאי הקבלה',
    explanation: 'הציונים עומדים בתנאי הקבלה.',
    nextAction: 'אפשר להגיש מועמדות.',
    ...overrides,
  };
}

// The browser characterizes the API response contract. Evaluator integration and
// official numerical fixtures are exercised separately by the mapping unit tests.
function apiResults(programId: string, needsHaifa: boolean): AdmissionsEvaluationResult[] {
  return [
    result('tau', { score: 639, scoreLabel: 'סכם', threshold: 610 }),
    result(
      'huji',
      programId.includes('psychology')
        ? {
            kind: 'manual_gate',
            capability: 'manual_gate',
            decision: 'eligible_to_apply',
            sourceLabel: kidumText,
            explanation:
              'מסלול ראויים לקידום מיועד לציון פסיכומטרי 690 ומעלה ולניקוד 30 באגודה לקידום החינוך.',
          }
        : { score: 21.12, scoreLabel: 'סכם', threshold: 20.75 },
    ),
    result('bgu', {
      score: 648,
      scoreLabel: 'סכם',
      threshold: 735,
      decision: 'below',
      scoreAssessment: 'below_threshold',
    }),
    result(
      'haifa',
      needsHaifa
        ? {
            kind: 'needs_input',
            capability: 'needs_input',
            decision: 'unknown',
            requiredInputs: ['haifa_bagrut_average', 'haifa_hebrew_qualification'],
          }
        : {
            kind: 'manual_gate',
            capability: 'manual_gate',
            score: 706,
            scoreLabel: 'סכם',
            threshold: 700,
            scoreAssessment: 'meets_threshold',
            additionalConditions: [
              { id: 'admissions_committee', label: 'ראיון', status: 'unconfirmed' },
            ],
          },
    ),
    result('technion', {
      score: 84.4,
      scoreLabel: 'סכם',
      threshold: 91.5,
      decision: 'below',
      scoreAssessment: 'below_threshold',
    }),
    result('reichman', {
      kind: 'estimated',
      capability: 'estimated',
      confidence: 'medium',
      estimated: true,
      score: 639.17,
      scoreLabel: 'סכם',
      threshold: 600,
    }),
    result('biu', { kind: 'estimated', capability: 'estimated', confidence: 'medium' }),
    result('afeka'),
    result('hit', { kind: 'unsupported', capability: 'unsupported', decision: 'unknown' }),
    // A contaminated response must never make Ariel visible on this page.
    result('ariel', { score: 999, threshold: 888 }),
  ];
}

async function installMocks(
  page: Page,
  baseURL?: string,
  requestHaifa = false,
  decorate?: (row: AdmissionsEvaluationResult) => AdmissionsEvaluationResult,
) {
  const submissions: Record<string, unknown>[] = [];
  const batches: BatchRequest[] = [];
  const reports = new Map<string, AdmissionsEvaluationReport>();
  const origin = new URL(baseURL ?? 'http://localhost:3000').origin;
  // Analytics and other external mutations are irrelevant to this isolated flow.
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method()) && new URL(request.url()).origin !== origin)
      await route.abort();
    else await route.continue();
  });
  // Install both POST interceptions before any navigation. Never continue either.
  await page.route('**/api/enquiries', async (route) => {
    expect(route.request().method()).toBe('POST');
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { data: { received: true } } });
  });
  await page.route('**/api/admissions/evaluate', async (route) => {
    expect(route.request().method()).toBe('POST');
    const batch = route.request().postDataJSON() as BatchRequest;
    expect(batch.degreeIds.length).toBeGreaterThan(0);
    expect(batch.degreeIds.length).toBeLessThanOrEqual(50);
    expect(new Set(batch.degreeIds).size).toBe(batch.degreeIds.length);
    batches.push(batch);
    const response: Record<string, AdmissionsEvaluationReport> = {};
    for (const degreeId of batch.degreeIds) {
      const input = { ...batch };
      Reflect.deleteProperty(input, 'degreeIds');
      const report: AdmissionsEvaluationReport = {
        generatedAt: '2026-10-28T00:00:00.000Z',
        evaluatorVersion: 'browser-response-contract',
        inputDigest: 'browser-response-contract',
        input: { ...input, degreeId },
        program: { id: degreeId, name: degreeId },
        results: apiResults(degreeId, requestHaifa && !batch.extraInputs?.haifaBagrutAverage).map(
          (row) => (decorate ? decorate(row) : row),
        ),
      };
      response[degreeId] = report;
      reports.set(degreeId, report);
    }
    await route.fulfill({ json: { data: { reports: response, failedDegreeIds: [] } } });
  });
  return { submissions, batches, reports };
}

async function fillProfile(page: Page) {
  for (let row = 1; row <= 4; row++) {
    await page.getByRole('spinbutton', { name: `ציון ${row}`, exact: true }).fill('90');
  }
  await page.getByLabel('פסיכומטרי — ציון כללי').fill('700');
  await page.getByLabel('מילולי', { exact: true }).fill('130');
  await page.getByLabel('כמותי', { exact: true }).fill('140');
  await page.locator('#psychometric-english').fill('135');
}

async function assertAlignedFields(root: Locator) {
  for (const field of await root
    .locator('input:visible:not([type="checkbox"]), select:visible')
    .all()) {
    expect(await field.evaluate((node) => getComputedStyle(node).textAlign)).toBe('right');
    const box = await field.boundingBox();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  }
}

async function assertStudentCards(page: Page) {
  for (const card of await page.locator('[data-testid^="institution-"]').all()) {
    await expect(card).not.toContainText(/מתואם|סכם|מצרף/);
    await expect(card.locator('[data-testid^="result-"]')).not.toContainText('נתונים');
  }
}

async function assertNoCompositeInput(page: Page) {
  const inputNames = await page.locator('main input, main select').evaluateAll((inputs) =>
    inputs.map((node) => {
      const input = node as HTMLInputElement | HTMLSelectElement;
      return [
        input.name,
        input.getAttribute('aria-label'),
        ...Array.from(input.labels ?? [], (label) => label.textContent),
      ].join(' ');
    }),
  );
  for (const name of inputNames) expect(name).not.toMatch(compositeInput);
}

function assertNoCompositePayload(value: unknown) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    expect(key).not.toMatch(compositeInput);
    assertNoCompositePayload(child);
  }
}

for (const width of [1280, 390]) {
  test(`example fills all nine certificate subjects at ${width}px without sending enquiries`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL);
    await page.goto('/sekhem-calculator');
    await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
    await expect(page.getByRole('button', { name: /^הסרת מקצוע / })).toHaveCount(9);
    await expect(page.getByLabel('מקצוע 3', { exact: true })).toHaveValue('הבעה עברית');
    await expect(page.getByLabel('מקצוע 7', { exact: true })).toHaveValue('אזרחות');
    await expect(page.getByLabel('ציון 9', { exact: true })).toHaveValue('94');
    await assertAlignedFields(page.locator('main'));
    expect(mocks.batches).toHaveLength(0);
    expect(mocks.submissions).toHaveLength(0);
  });

  test(`raw grades, honest results and mocked institution leads at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const mocks = await installMocks(page, baseURL);
    await page.goto('/sekhem-calculator');
    await expect(
      page.getByRole('heading', { name: 'מחשבון סכם וסיכויי קבלה', exact: true }),
    ).toBeVisible();
    const headingBox = (await page
      .getByRole('heading', {
        name: 'מחשבון סכם וסיכויי קבלה',
        exact: true,
      })
      .boundingBox())!;
    const navbarBox = (await page
      .getByRole('navigation', { name: 'ניווט ראשי' })
      .locator('..')
      .boundingBox())!;
    expect(headingBox.y).toBeGreaterThanOrEqual(navbarBox.y + navbarBox.height);
    await assertNoCompositeInput(page);
    await assertAlignedFields(page.locator('main'));
    await test.info().attach(`calculator-empty-${width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    await test.step('subject rows can be added and removed without submitting', async () => {
      await page.getByRole('button', { name: 'הוספת מקצוע' }).click();
      await page.getByLabel('מקצוע 5', { exact: true }).fill('כימיה');
      await page.getByLabel('ציון 5', { exact: true }).fill('91');
      await page.getByRole('button', { name: 'הסרת מקצוע 5' }).click();
      await expect(page.getByLabel('מקצוע 5', { exact: true })).toHaveCount(0);
      expect(mocks.batches).toHaveLength(0);
    });
    await fillProfile(page);
    await assertAlignedFields(page.locator('main'));
    await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'הסכם לפי מוסד ותוכנית' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'מחשבים…' })).toHaveCount(0);
    expect(mocks.batches.length).toBeGreaterThan(0);
    for (const batch of mocks.batches) {
      expect(batch).toMatchObject({
        psychometric: 700,
        bagrut: 90,
        extraInputs: { psychometricVerbal: 130, psychometricMath: 140, psychometricEnglish: 135 },
      });
      expect(batch.extraInputs?.bagrutSubjectRecord?.subjects).toHaveLength(4);
      for (const subject of batch.extraInputs!.bagrutSubjectRecord!.subjects) {
        expect(subject).toMatchObject({ units: 5, grade: 90 });
      }
      assertNoCompositePayload(batch);
    }

    await assertStudentCards(page);
    await expect(page.getByText(noScoreLine, { exact: true })).toHaveCount(1);
    await expect(page.locator('[data-testid="institution-ariel"]')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('אריאל');
    await expect(page.locator('main')).not.toContainText('נדרשת בדיקה מול המוסד');
    await expect(page.locator('main')).not.toContainText('שנת הנוסחה לא מצוינת');
    await expect(page.getByText('אומדן, עד לאישור המוסד', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'יש גם אפיקי קבלה נוספים' })).toHaveAttribute(
      'href',
      '/institutions/afeka',
    );
    await expect(page.getByTestId('institution-haifa')).toContainText('ראיון');

    await test.step('every visible numerical result comes from that API row', async () => {
      for (const row of await page.locator('[data-testid^="result-"]').all()) {
        const id = await row.getAttribute('data-testid');
        const [, programId, institutionId] = id!.match(/^result-(.+)-([^-]+)$/)!;
        const api = mocks.reports
          .get(programId)!
          .results.find((item) => item.linkedInstitutionId === institutionId)!;
        for (const number of await row.locator('[data-result-number]').all()) {
          const field = await number.getAttribute('data-result-number');
          expect(await number.textContent()).toBe(
            formatSekhemNumber(api[field as 'score' | 'threshold']!, institutionId),
          );
        }
        const renderedNumbers = (await row.innerText()).match(/\d+(?:\.\d+)?/g) ?? [];
        for (const number of renderedNumbers) {
          expect(
            [api.score, api.threshold]
              .filter((value): value is number => typeof value === 'number')
              .map((value) => formatSekhemNumber(value, institutionId)),
          ).toContain(number);
        }
      }
    });

    await test.step('the HUJI psychology manual route keeps all numbers suppressed', async () => {
      const huji = page.getByTestId('institution-huji');
      const select = huji.getByRole('combobox');
      const psychology = (
        await select
          .locator('option')
          .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
      ).find((id) => id.includes('psychology'));
      expect(psychology).toBeTruthy();
      await select.selectOption(psychology!);
      const row = huji.locator('[data-testid^="result-"]');
      await expect(row).toHaveAttribute('data-kind', 'manual_gate');
      await expect(row).toContainText(kidumText);
      await expect(row.locator('[data-result-number]')).toHaveCount(0);
      expect(await row.innerText()).not.toMatch(/\d/);
      await assertStudentCards(page);
    });

    await test.step('every displayed institution has a real, selectable lead target', async () => {
      await page.getByRole('heading', { name: 'הסכם לפי מוסד ותוכנית' }).scrollIntoViewIfNeeded();
      await test.info().attach(`calculator-results-${width}`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
      const groups = page.locator('[data-testid^="institution-"]');
      expect(await groups.count()).toBeGreaterThanOrEqual(6);
      for (const id of await groups.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-testid')!),
      )) {
        const group = page.getByTestId(id);
        const cta = group.getByRole('button', { name: 'קבלת מידע על התוכנית', exact: true });
        await expect(cta).toHaveCount(1);
        const select = group.getByRole('combobox');
        if (await select.count()) {
          const last = await select.locator('option').last().getAttribute('value');
          await select.selectOption(last!);
        }
        await assertStudentCards(page);
        const resultId = await group
          .locator('[data-testid^="result-"]')
          .getAttribute('data-testid');
        const institutionId = (await group.getAttribute('data-testid'))!.replace(
          'institution-',
          '',
        );
        const programId = resultId!.slice('result-'.length, -institutionId.length - 1);
        await expect(
          group.getByRole('link', { name: 'לתנאי הקבלה של התוכנית', exact: true }),
        ).toHaveAttribute('href', `/programs/${programId}`);
        await cta.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(
          (await group.getByRole('heading', { level: 3 }).textContent())!,
        );
        await expect(
          dialog.getByRole('checkbox', { name: ENQUIRY_PREP_CONSENT }),
        ).not.toBeChecked();
        await assertAlignedFields(dialog);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(cta).toBeFocused();
      }
      expect(mocks.submissions).toHaveLength(0);
    });

    const tau = page.getByTestId('institution-tau');
    const selectedProgram = await tau.getByRole('combobox').inputValue();
    await tau.getByRole('button', { name: 'קבלת מידע על התוכנית', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(ENQUIRY_COPY.nameLabel, { exact: true }).fill('בדיקת MyWay');
    await dialog.getByLabel(ENQUIRY_COPY.phoneLabel, { exact: true }).fill('0501234567');
    await assertAlignedFields(dialog);
    await dialog.getByRole('button', { name: ENQUIRY_COPY.button, exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(ENQUIRY_COPY.successTitle);
    expect(mocks.submissions).toHaveLength(1);
    expect(mocks.submissions[0]).toMatchObject({
      programId: selectedProgram,
      institutionId: 'tau',
      consent: true,
      prepConsent: false,
      sourcePath: '/sekhem-calculator',
      evaluationInput: { degreeId: selectedProgram, psychometric: 700 },
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await assertNoCompositeInput(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 360]) {
  test(`complete example subject values fit inside their inputs at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL);
    await page.goto('/sekhem-calculator');
    await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const subjects = page.locator('.journey-grade-table input[list]');
    await expect(subjects).toHaveCount(9);
    await expect(page.getByLabel('מקצוע 6', { exact: true })).toHaveValue('היסטוריה / תע״י');
    for (const field of await subjects.all()) {
      const size = await field.evaluate((node) => {
        const input = node as HTMLInputElement;
        const style = getComputedStyle(input);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return {
          value: input.value,
          client: input.clientWidth,
          scroll: input.scrollWidth,
          text: context.measureText(input.value).width,
          available:
            input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        };
      });
      expect(size.scroll, size.value).toBeLessThanOrEqual(size.client);
      expect(size.text, size.value).toBeLessThanOrEqual(size.available);
    }
    await assertAlignedFields(page.locator('main'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await test.info().attach(`example-certificate-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(mocks.batches).toHaveLength(0);
    expect(mocks.submissions).toHaveLength(0);
  });
}

test('Haifa supplementary inputs follow the latest evaluator response', async ({
  page,
  baseURL,
}) => {
  const mocks = await installMocks(page, baseURL, true);
  await page.goto('/sekhem-calculator');
  const average = page.getByLabel('ממוצע בגרות בחיפה', { exact: true });
  const hebrew = page.getByLabel('הבסיס לעמידה בדרישת העברית בחיפה', { exact: true });
  await expect(average).toHaveCount(0);
  await expect(hebrew).toHaveCount(0);
  await fillProfile(page);
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  await expect(average).toBeVisible();
  await expect(hebrew).toBeVisible();
  await expect(average).not.toHaveAttribute('required', '');
  await expect(page.getByTestId('institution-haifa').locator('[data-result-reason]')).toHaveText([
    'עדיין לא מחשבים כאן את ציון הקבלה של חיפה',
  ]);
  await expect(page.locator('main')).not.toContainText('ממוצע בגרות רשמי של חיפה');
  const haifa = page.getByTestId('institution-haifa');
  const selectedProgram = await haifa.getByRole('combobox').inputValue();
  await expect(
    haifa.getByRole('link', { name: 'לתנאי הקבלה של התוכנית', exact: true }),
  ).toHaveAttribute('href', `/programs/${selectedProgram}`);
  await expect(page.getByTestId('institution-haifa')).toContainText(
    'עדיין לא מחשבים כאן את ציון הקבלה של חיפה',
  );
  await average.fill('104');
  await hebrew.selectOption('hebrew_school');
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  await expect(average).toHaveCount(0);
  await expect(hebrew).toHaveCount(0);
  await expect(page.getByTestId('institution-haifa')).toContainText('706');
  expect(mocks.batches.some((batch) => batch.extraInputs?.haifaBagrutAverage === 104)).toBe(true);
  await page.getByLabel('פסיכומטרי — ציון כללי').fill('701');
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  await expect(average).toBeVisible();
  expect(mocks.batches.at(-1)!.extraInputs).not.toHaveProperty('haifaBagrutAverage');
  expect(mocks.batches.at(-1)!.extraInputs).not.toHaveProperty('haifaHebrewQualification');
  expect(mocks.submissions).toHaveLength(0);
});

test('public metadata and crawl links use the calculator URL; homepage hero has no calculator link', async ({
  page,
  baseURL,
  request,
}) => {
  await installMocks(page, baseURL);
  await page.goto('/sekhem-calculator');
  await expect(page).toHaveTitle(title);
  await expect(page.locator('head title')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toMatch(
    /<url>\s*<loc>https:\/\/findmyway\.co\.il\/sekhem-calculator<\/loc>\s*<lastmod>2026-10-28(?:T[^<]+)?<\/lastmod>/,
  );
  const llms = await request.get('/llms.txt');
  expect(llms.ok()).toBe(true);
  expect((await llms.text()).split('\n').filter((line) => line.includes(canonical))).toHaveLength(
    1,
  );
  await page.goto('/');
  await expect(
    page
      .locator('.journey-hero-copy')
      .getByRole('link', { name: 'בדקו לאן אתם מתקבלים', exact: true }),
  ).toBeVisible();
  // PM ruling (Jorje, 2026-10-29): no sekhem link in the homepage hero.
  await expect(page.locator('.journey-hero-copy a[href="/sekhem-calculator"]')).toHaveCount(0);
});

test('numberless cards explain missing inputs and unavailable result states', async ({
  page,
  baseURL,
}) => {
  let kind: AdmissionsEvaluationResult['kind'] = 'needs_input';
  await installMocks(page, baseURL, false, (row) => ({
    ...row,
    kind,
    capability: kind === 'degraded' ? 'blocked' : kind,
    decision: 'unknown',
    score: undefined,
    threshold: undefined,
    sourceLabel: 'מקור חסום',
    explanation: 'bagrut_subject_record: authority_unavailable',
    requiredInputs: kind === 'needs_input' ? ['bagrut_subject_record'] : [],
  }));
  await page.goto('/sekhem-calculator');
  await fillProfile(page);
  for (const state of [
    'needs_input',
    'authority_unavailable',
    'degraded',
    'unsupported',
    'manual_gate',
  ] as const) {
    kind = state;
    await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
    await expect(page.getByRole('button', { name: 'לחשב את הסכם', exact: true })).toBeEnabled();
    await assertStudentCards(page);
    const rows = page.locator('[data-testid^="result-"]');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const row of await rows.all()) {
      await expect(row.locator('[data-result-number]')).toHaveCount(0);
      expect(
        (await row.locator('[data-result-reason]').allTextContents()).join('').trim(),
      ).not.toBe('');
      await expect(row).not.toContainText('נדרשת בדיקה מול המוסד');
      await expect(row).not.toContainText('מקור חסום');
      await expect(row).not.toContainText('bagrut_subject_record');
    }
    await expect(page.locator('main')).not.toContainText('ממוצע בגרות רשמי של חיפה');
    await expect(page.getByTestId('institution-haifa').locator('[data-result-reason]')).toHaveText([
      'עדיין לא מחשבים כאן את ציון הקבלה של חיפה',
    ]);
    for (const group of await page.locator('[data-testid^="institution-"]').all()) {
      await expect(
        group.getByRole('button', { name: 'קבלת מידע על התוכנית', exact: true }),
      ).toHaveCount(1);
      await expect(
        group.getByRole('link', { name: 'לתנאי הקבלה של התוכנית', exact: true }),
      ).toHaveClass(/way-button-secondary/);
    }
  }
});

for (const width of [1280, 390]) {
  test(`unavailable deep links never evaluate another programme at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL);
    await page.goto('/sekhem-calculator');
    const offered = await page
      .getByLabel('תוכנית לימודים')
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    expect(offered.filter((id) => absentEvaluatorIds.includes(id))).toEqual([]);
    for (const id of absentEvaluatorIds) {
      await page.goto(`/sekhem-calculator?program=${id}`);
      await expect(page.getByText('אי אפשר לחשב כאן את סיכויי הקבלה לתוכנית הזו.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'לתנאי הקבלה של התוכנית' })).toHaveAttribute(
        'href',
        `/programs/${id}`,
      );
      await expect(page.getByRole('button', { name: 'לחשב את הסכם', exact: true })).toHaveCount(0);
      await expect(page.getByText('חלק מהתוכניות לא חושבו. אפשר לנסות שוב.')).toHaveCount(0);
    }
    await page.goto('/sekhem-calculator?program=not_a_public_programme');
    await expect(page.getByText('אי אפשר לחשב כאן את סיכויי הקבלה לתוכנית הזו.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'לתנאי הקבלה של התוכנית' })).toHaveCount(0);
    await expect(
      page.getByRole('main').getByRole('link', { name: 'יצירת קשר', exact: true }),
    ).toHaveAttribute('href', '/contact');
    expect(mocks.batches).toHaveLength(0);
    expect(mocks.submissions).toHaveLength(0);
  });
}

test('retry clears a transient service error and shows the requested programme results', async ({
  page,
  baseURL,
}) => {
  const mocks = await installMocks(page, baseURL);
  let failed = false;
  await page.route('**/api/admissions/evaluate', async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } });
    } else await route.fallback();
  });
  await page.goto('/sekhem-calculator?program=tau_law');
  await fillProfile(page);
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  const error = page.getByRole('main').getByRole('alert');
  await expect(error).toHaveText('לא הצלחנו לחשב כרגע. אפשר לנסות שוב.');
  await page.getByRole('button', { name: 'לנסות שוב', exact: true }).click();
  await expect(page.getByTestId('institution-tau')).toContainText('הציונים עומדים בתנאי הקבלה');
  await expect(error).toHaveCount(0);
  expect(mocks.batches.flatMap((batch) => batch.degreeIds)).toEqual(['tau_law']);
  expect(mocks.submissions).toHaveLength(0);
});

test('a missing subject action adds its row and focuses its grade', async ({ page, baseURL }) => {
  const mocks = await installMocks(page, baseURL, false, (row) =>
    row.linkedInstitutionId === 'tau'
      ? {
          ...row,
          kind: 'needs_input',
          decision: 'accepted',
          scoreAssessment: 'meets_threshold',
          score: undefined,
          threshold: 600,
          requiredInputs: ['physics_grade'],
        }
      : row,
  );
  await page.goto('/sekhem-calculator?program=tau_ee');
  await fillProfile(page);
  await page.getByRole('button', { name: 'הסרת מקצוע 3', exact: true }).click();
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  await assertStudentCards(page);
  await page
    .getByTestId('institution-tau')
    .getByRole('button', { name: 'פיזיקה', exact: true })
    .click();
  await expect(page.getByLabel('מקצוע 4', { exact: true })).toHaveValue('פיזיקה');
  const grade = page.getByLabel('ציון 4', { exact: true });
  await expect(grade).toBeFocused();
  await expect(grade).toBeInViewport();
  expect(mocks.submissions).toHaveLength(0);
});

test('Reichman CS below-route flags without scores never become an invented estimate', async ({
  page,
  baseURL,
}) => {
  const mocks = await installMocks(page, baseURL, false, (row) =>
    row.linkedInstitutionId === 'reichman'
      ? {
          ...row,
          kind: 'estimated',
          capability: 'estimated',
          decision: 'below',
          scoreAssessment: 'below_threshold',
          score: undefined,
          threshold: undefined,
          requiredInputs: undefined,
          explanation: 'תנאי מסלולי הקבלה הרגילים שנבדקו אינם מתקיימים.',
        }
      : row,
  );
  await page.goto('/sekhem-calculator?program=reichman_cs');
  await fillProfile(page);
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  const row = page.getByTestId('result-reichman_cs-reichman');
  await expect(row).toHaveText('הציונים אינם עומדים בתנאי הקבלה שנבדקו.');
  await expect(row.locator('[data-result-number]')).toHaveCount(0);
  await assertStudentCards(page);
  expect(mocks.submissions).toHaveLength(0);
});

test('Technion medicine with an exact score and no cutoff has no verdict or success styling', async ({
  page,
  baseURL,
}) => {
  const mocks = await installMocks(page, baseURL, false, (row) =>
    row.linkedInstitutionId === 'technion'
      ? {
          ...row,
          kind: 'exact',
          capability: 'score_only',
          decision: 'unknown',
          scoreAssessment: undefined,
          score: 87.6,
          threshold: null,
        }
      : row,
  );
  await page.goto('/sekhem-calculator?program=technion_medicine');
  await fillProfile(page);
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  const card = page.getByTestId('institution-technion');
  const row = page.getByTestId('result-technion_medicine-technion');
  await expect(row.locator('[data-result-number="score"]')).toHaveText('87.6');
  await expect(row.getByText('ציון הקבלה', { exact: true })).toBeVisible();
  await expect(
    card.getByRole('link', { name: 'לתנאי הקבלה של התוכנית', exact: true }),
  ).toHaveAttribute('href', '/programs/technion_medicine');
  await expect(row).toHaveText('87.6ציון הקבלה');
  await expect(row.locator('p, [data-result-reason], [data-result-verdict]')).toHaveCount(0);
  await expect(card).not.toContainText(/עדיין לא מחשבים כאן|עומדים/);
  const classes = (
    await card
      .locator('[class]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('class')))
  ).join(' ');
  expect(classes).not.toMatch(/eligible|success|accepted|green|#206345/);
  await assertStudentCards(page);
  expect(mocks.submissions).toHaveLength(0);
});

for (const width of [1280, 390]) {
  test(`filtered biu_cs remains actionable at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL, false, (row) =>
      row.linkedInstitutionId === 'biu'
        ? {
            ...row,
            kind: 'estimated',
            capability: 'estimated',
            decision: 'unknown',
            score: undefined,
            threshold: undefined,
            explanation:
              'עמידה בתנאי הסף אינה אישור קבלה. יש לבדוק את השקלול במחשבון הרשמי של בר-אילן.',
          }
        : row,
    );
    await page.goto('/sekhem-calculator?program=biu_cs');
    await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
    await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
    const card = page.getByTestId('programme-actions-biu');
    await expect(card).toBeVisible();
    await expect(card).toContainText('מדעי המחשב');
    await expect(card.locator('[data-testid^="result-"]')).toHaveCount(0);
    await expect(card.locator('[data-result-number], [data-result-reason]')).toHaveCount(0);
    await expect(card).not.toContainText(/\d|עומדים|מתחת|עדיין לא/);
    await expect(card.getByRole('link', { name: 'לתנאי הקבלה של התוכנית' })).toHaveAttribute(
      'href',
      '/programs/biu_cs',
    );
    await card.getByRole('button', { name: 'קבלת מידע על התוכנית' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(ENQUIRY_COPY.nameLabel, { exact: true }).fill('QA Test');
    await dialog.getByLabel(ENQUIRY_COPY.phoneLabel, { exact: true }).fill('0500000000');
    await dialog.getByRole('button', { name: ENQUIRY_COPY.button, exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(ENQUIRY_COPY.successTitle);
    expect(mocks.submissions).toHaveLength(1);
    expect(mocks.submissions[0]).toMatchObject({
      programId: 'biu_cs',
      institutionId: 'biu',
      evaluationInput: { degreeId: 'biu_cs', psychometric: 700 },
    });
  });

  test(`programme Back restores calculator state at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL);
    await page.goto('/sekhem-calculator');
    await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
    await page.getByText('בחירת תחום לימודים', { exact: true }).click();
    await page.getByLabel('תוכנית לימודים').selectOption('bgu_psychology');
    await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
    await page
      .getByTestId('institution-bgu')
      .getByRole('link', { name: 'לתנאי הקבלה של התוכנית' })
      .click();
    await expect(page).toHaveURL(/\/programs\/bgu_psychology$/);
    await page.goBack();
    await expect(page.getByLabel('ציון 1', { exact: true })).toHaveValue('92');
    await expect(page.getByLabel('יחידות 1', { exact: true })).toHaveValue('5');
    await expect(page.getByLabel('פסיכומטרי — ציון כללי')).toHaveValue('700');
    await expect(page.getByLabel('תוכנית לימודים')).toHaveValue('bgu_psychology');
    await expect(page.getByTestId('institution-bgu')).toContainText('648');
    expect(mocks.batches).toHaveLength(1);
    expect(mocks.submissions).toHaveLength(0);
  });

  test(`range errors identify and focus their field at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL);
    await page.goto('/sekhem-calculator');
    await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
    for (const [label, value, message] of [
      ['ציון 1', '101', 'ציון בין 0 ל-100'],
      ['יחידות 1', '0', 'יחידות בין 1 ל-5'],
    ]) {
      const input = page.getByLabel(label, { exact: true });
      await input.fill(value);
      await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
      await expect(input).toBeFocused();
      await expect(input).toBeInViewport();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      const id = await input.getAttribute('aria-describedby');
      await expect(page.locator(`[id="${id}"]`)).toHaveText(message);
      await expect(page.locator(`[id="${id}"]`)).toBeVisible();
      await assertAlignedFields(page.locator('main'));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await test.info().attach(`range-error-${label}-${width}`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
      await input.fill(label.startsWith('ציון') ? '100' : '5');
    }
    expect(mocks.batches).toHaveLength(0);
    expect(mocks.submissions).toHaveLength(0);
  });
}

test('calculator reload restores state without another evaluation', async ({ page, baseURL }) => {
  const mocks = await installMocks(page, baseURL);
  await page.goto('/sekhem-calculator?program=tau_law');
  await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
  await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
  await expect(page.getByTestId('institution-tau')).toContainText('639');
  await page.reload();
  await expect(page.getByLabel('ציון 1', { exact: true })).toHaveValue('92');
  await expect(page.getByLabel('מילולי', { exact: true })).toHaveValue('130');
  await expect(page.getByTestId('institution-tau')).toContainText('639');
  expect(mocks.batches).toHaveLength(1);
  expect(mocks.submissions).toHaveLength(0);
});

for (const width of [1280, 390]) {
  test(`shared subject rows retain their default behavior at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL);
    await page.goto('/app/calculator?program=tau_cs');
    const next = page.getByRole('button', { name: 'המשך', exact: true });
    await next.click();
    await next.click();
    await page.getByRole('button', { name: /יש לי ציונים לפי מקצוע/ }).click();
    await page.getByRole('combobox', { name: 'סוג תעודה', exact: true }).selectOption('internal');
    const units = page.getByLabel('יחידות 1', { exact: true });
    const grade = page.getByLabel('ציון 1', { exact: true });
    await expect(units).toHaveValue('');
    await expect(grade).toHaveValue('');
    await assertAlignedFields(page.locator('.journey-grade-table'));
    await units.fill('5');
    await grade.fill('90');
    await expect(units).toHaveValue('5');
    await expect(grade).toHaveValue('90');
    await expect(units).not.toHaveAttribute('aria-invalid');
    await expect(grade).not.toHaveAttribute('aria-describedby');
    await assertAlignedFields(page.locator('.journey-grade-table'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(mocks.batches).toHaveLength(0);
    expect(mocks.submissions).toHaveLength(0);
    await test.info().attach(`shared-subjects-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}

for (const width of [1280, 390]) {
  for (const [field, label, value, message] of [
    ['grade', 'ציון 1', '130', 'ציון בין 0 ל-100'],
    ['units', 'יחידות 1', '6', 'יחידות בין 1 ל-5'],
  ] as const) {
    test(`range message sits below an aligned subject row (${field}) at ${width}px`, async ({
      page,
      baseURL,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const mocks = await installMocks(page, baseURL);
      await page.goto('/sekhem-calculator');
      await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
      const input = page.getByLabel(label, { exact: true });
      await input.fill(value);
      await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
      await expect(input).toBeFocused();
      await expect(input).toBeInViewport();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      const id = await input.getAttribute('aria-describedby');
      expect(id).toMatch(new RegExp(`-0-${field}-error$`));
      const error = page.locator(`[id="${id}"]`);
      await expect(error).toHaveText(message);
      await expect(error).toBeVisible();
      expect(await error.evaluate((node) => getComputedStyle(node).textAlign)).toBe('right');
      // Stop the focus scroll before measuring the whole row in viewport coordinates.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const boxes = await Promise.all(
        ['מקצוע 1', 'יחידות 1', 'ציון 1'].map((name) =>
          page.getByLabel(name, { exact: true }).boundingBox(),
        ),
      );
      expect(boxes.every((box) => box !== null)).toBe(true);
      const tops = boxes.map((box) => box!.y);
      const bottoms = boxes.map((box) => box!.y + box!.height);
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
      expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(1);
      const errorBox = (await error.boundingBox())!;
      expect(errorBox.y).toBeGreaterThanOrEqual(Math.max(...bottoms));
      const nextBoxes = await Promise.all(
        ['מקצוע 2', 'יחידות 2', 'ציון 2'].map((name) =>
          page.getByLabel(name, { exact: true }).boundingBox(),
        ),
      );
      expect(errorBox.y + errorBox.height).toBeLessThanOrEqual(
        Math.min(...nextBoxes.map((box) => box!.y)),
      );
      await expect(input).toBeFocused();
      expect(mocks.batches).toHaveLength(0);
      expect(mocks.submissions).toHaveLength(0);
    });
  }
}

for (const width of [1280, 390]) {
  test(`invalid range fields keep danger borders and focus outline at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installMocks(page, baseURL);
    await page.goto('/sekhem-calculator');
    await page.getByRole('button', { name: 'ערכים לדוגמה', exact: true }).click();
    const first = page.getByLabel('ציון 1', { exact: true });
    const second = page.getByLabel('יחידות 2', { exact: true });
    const valid = page.getByLabel('ציון 4', { exact: true });
    await first.fill('130');
    await second.fill('6');
    await page.getByRole('button', { name: 'לחשב את הסכם', exact: true }).click();
    await expect(first).toBeFocused();
    await expect(second).not.toBeFocused();
    const appearance = (input: Locator) =>
      input.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          borders: [
            style.borderTopColor,
            style.borderRightColor,
            style.borderBottomColor,
            style.borderLeftColor,
          ],
          outlineColour: style.outlineColor,
          outlineWidth: parseFloat(style.outlineWidth),
          outlineStyle: style.outlineStyle,
        };
      });
    const danger = Array(4).fill('rgb(140, 36, 56)');
    const normal = Array(4).fill('rgb(132, 148, 173)');
    for (const input of [first, second]) {
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      expect.soft((await appearance(input)).borders).toEqual(danger);
    }
    const focused = await appearance(first);
    expect.soft(focused.outlineColour).toBe('rgb(140, 36, 56)');
    expect(focused.outlineWidth).toBeGreaterThan(0);
    expect(focused.outlineStyle).not.toBe('none');
    expect((await appearance(valid)).borders).toEqual(normal);
    expect(await valid.getAttribute('class')).toBeNull();
    await page.getByLabel('ציון 3', { exact: true }).focus();
    await expect(first).not.toBeFocused();
    for (const input of [first, second])
      expect.soft((await appearance(input)).borders).toEqual(danger);
    expect((await appearance(valid)).borders).toEqual(normal);
    expect(mocks.batches).toHaveLength(0);
    expect(mocks.submissions).toHaveLength(0);
  });
}
