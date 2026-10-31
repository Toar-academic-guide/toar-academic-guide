// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/server/catalogue/queries', async () => {
  const { getStaticCataloguePrograms, getStaticCatalogueInstitutions } =
    await import('@/lib/catalogueStatic');
  return {
    listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
    listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
  };
});
import Page, { metadata } from './page';
import sitemap from '@/app/sitemap';
import { readFileSync } from 'node:fs';
import * as calculatorSupport from '@/lib/sekhemCalculatorSupport';
import { sekhemCalculatorLd, webApplicationLd } from '@/lib/seo/jsonLd';

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

it.each(absentEvaluatorIds)(
  'shows an unavailable state for absent evaluator programme %s without evaluating another programme',
  async (program) => {
    const { getStaticCataloguePrograms } = await import('@/lib/catalogueStatic');
    vi.spyOn(await import('@/server/catalogue/queries'), 'listCataloguePrograms').mockResolvedValue(
      {
        data: getStaticCataloguePrograms().filter((row) => !absentEvaluatorIds.includes(row.id)),
        meta: {},
      },
    );
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ data: { received: true } }));
    vi.stubGlobal('fetch', fetcher);
    try {
      render(await Page({ searchParams: Promise.resolve({ program }) }));
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 26)
      expect(screen.getByText('לתוכנית הזו: בדיקה אישית מול המוסד.')).toBeTruthy();
      expect(
        screen.getByRole('link', { name: 'לתנאי הקבלה של התוכנית' }).getAttribute('href'),
      ).toBe(`/programs/${program}`);
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 28)
      expect(screen.queryByRole('button', { name: 'חשבו את הסכם שלי' })).toBeNull();
      expect(screen.queryByText('חלק מהתוכניות לא חושבו. אפשר לנסות שוב.')).toBeNull();
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('does not link an unknown unavailable programme to a nonexistent public page', async () => {
  render(await Page({ searchParams: Promise.resolve({ program: 'not_a_public_programme' }) }));
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 26)
  expect(screen.getByText('לתוכנית הזו: בדיקה אישית מול המוסד.')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'לתנאי הקבלה של התוכנית' })).toBeNull();
  expect(screen.getByRole('link', { name: 'יצירת קשר' }).getAttribute('href')).toBe('/contact');
  expect(screen.getByRole('link', { name: 'לחישוב תוכנית אחרת' }).getAttribute('href')).toBe(
    '/sekhem-calculator',
  );
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 28)
  expect(screen.queryByRole('button', { name: 'חשבו את הסכם שלי' })).toBeNull();
});

it('offers only programmes in the runtime evaluator catalogue and refreshes membership on the next render', async () => {
  const { getStaticCataloguePrograms } = await import('@/lib/catalogueStatic');
  const active = getStaticCataloguePrograms().filter((row) => !absentEvaluatorIds.includes(row.id));
  const query = vi.spyOn(await import('@/server/catalogue/queries'), 'listCataloguePrograms');
  const meta = { catalogueSourceMode: 'database', catalogueSource: 'database' } as const;
  query.mockResolvedValue({ data: active, meta });
  const view = render(await Page({ searchParams: Promise.resolve({}) }));
  const ids = () =>
    within(screen.getByLabelText('תוכנית לימודים'))
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value)
      .filter(Boolean);
  expect(ids().length).toBeGreaterThan(0);
  expect(ids().every((id) => active.some((row) => row.id === id))).toBe(true);
  expect(ids().filter((id) => absentEvaluatorIds.includes(id))).toEqual([]);
  expect(ids()).toContain('tau_law');
  view.unmount();
  query.mockResolvedValue({ data: active.filter((row) => row.id !== 'tau_law'), meta });
  render(await Page({ searchParams: Promise.resolve({}) }));
  expect(ids()).not.toContain('tau_law');
});

it('renders an indexable public calculator with absolute title and canonical metadata', async () => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('מחשבון סכם וסיכויי קבלה');
  expect(metadata.title).toEqual({ absolute: 'מחשבון סכם וסיכויי קבלה לפי מוסד ותוכנית | MyWay' });
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/sekhem-calculator');
  expect(metadata.description).toBe(
    // Approved test update, Jorje 2026-10-29: meta no-overclaim
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows Extra)
    'מחשבון סכם וסיכויי קבלה בחינם: מזינים ציוני בגרות ופסיכומטרי, בוחרים תוכנית נתמכת, עם קישור לתנאי הקבלה של התוכנית.',
  );
});
it('uses the same estimate description without formula claims in metadata and Open Graph', () => {
  expect(metadata.description).not.toContain('לפי נוסחאות');
  expect(metadata.openGraph?.description).not.toContain('לפי נוסחאות');
  expect(metadata.openGraph?.description).toBe(metadata.description);
});
it('has one sitemap entry with the authored date and one llms entry', async () => {
  const entries = (await sitemap()).filter(
    (row) => row.url === 'https://findmyway.co.il/sekhem-calculator',
  );
  expect(entries).toHaveLength(1);
  expect(entries[0].lastModified).toBe('2026-10-28');
  expect(
    readFileSync('public/llms.txt', 'utf8')
      .split('\n')
      .filter((line) => line.includes('/sekhem-calculator')),
  ).toHaveLength(1);
});
it('sets the Open Graph URL to the calculator canonical URL', () => {
  expect(metadata.openGraph?.url).toBe('https://findmyway.co.il/sekhem-calculator');
});
it('supplies an existing canonical public programme page for every offered result', async () => {
  const { loadSekhemCalculatorOfferings } = await import('@/lib/sekhemCalculatorSupport');
  const { getPublicProgramPageData } = await import('@/lib/publicCataloguePages');
  const { canonicalProgramPath } = await import('@/lib/seo/programAliases');
  const offerings = await loadSekhemCalculatorOfferings();
  expect(offerings.length).toBeGreaterThan(0);
  for (const offering of offerings) {
    expect(offering).toHaveProperty('programPath', canonicalProgramPath(offering.programId));
    const page = await getPublicProgramPageData(offering.programId);
    expect(page?.program.id).toBe(offering.programId);
    expect(page?.program.type).toBe('academic');
    expect(page?.program.isListed).not.toBe(false);
  }
});
it('does not turn catalogue failure into static calculator data', async () => {
  const { listCataloguePrograms } = await import('@/server/catalogue/queries');
  vi.spyOn(
    await import('@/server/catalogue/queries'),
    'listCataloguePrograms',
  ).mockRejectedValueOnce(new Error('catalogue unavailable'));
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
    'catalogue unavailable',
  );
  expect(listCataloguePrograms).toBeDefined();
});

it('sends only active supported programmes in a full nine-subject run without a partial-failure warning', async () => {
  const { getStaticCataloguePrograms } = await import('@/lib/catalogueStatic');
  const queries = await import('@/server/catalogue/queries');
  const absentIds = [
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
  const active = getStaticCataloguePrograms().filter((program) => !absentIds.includes(program.id));
  vi.spyOn(queries, 'listCataloguePrograms').mockResolvedValue({ data: active, meta: {} });
  const sent: string[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (url === '/api/enquiries') return Response.json({ data: { received: true } });
    const ids = JSON.parse(String(init?.body)).degreeIds as string[];
    sent.push(...ids);
    return Response.json({
      data: { reports: {}, failedDegreeIds: ids.filter((id) => absentIds.includes(id)) },
    });
  });
  vi.stubGlobal('fetch', fetcher);
  try {
    render(await Page({ searchParams: Promise.resolve({}) }));
    const subjects = [
      ['מתמטיקה', 5, 92],
      ['אנגלית', 5, 95],
      ['הבעה עברית', 2, 88],
      ['תנ״ך', 2, 85],
      ['ספרות', 2, 90],
      ['היסטוריה / תע״י', 2, 87],
      ['אזרחות', 2, 93],
      ['פיזיקה', 5, 90],
      ['מדעי המחשב', 5, 94],
    ];
    for (let index = 0; index < subjects.length; index++) {
      if (index >= 4) fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
      for (const [label, value] of [
        ['מקצוע', subjects[index][0]],
        ['יחידות', subjects[index][1]],
        ['ציון', subjects[index][2]],
      ])
        fireEvent.change(screen.getByLabelText(`${label} ${index + 1}`), {
          target: { value: String(value) },
        });
    }
    for (const [label, value] of [
      ['פסיכומטרי — ציון כללי', 700],
      ['מילולי', 130],
      ['כמותי', 140],
      ['אנגלית', 135],
    ])
      fireEvent.change(
        screen.getByLabelText(
          label === 'פסיכומטרי — ציון כללי' ? /פסיכומטרי — ציון כללי/ : String(label),
        ),
        { target: { value: String(value) } },
      );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 28)
    fireEvent.click(screen.getByRole('button', { name: 'חשבו את הסכם שלי' }));
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));
    await waitFor(() =>
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 28)
      expect(screen.getByRole('button', { name: 'חשבו את הסכם שלי' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    expect(sent.filter((id) => absentIds.includes(id))).toEqual([]);
    expect(screen.queryByText('חלק מהתוכניות לא חושבו. אפשר לנסות שוב.')).toBeNull();
    expect(fetcher).toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

// Approved test update, Jorje 2026-10-29 (answer-block list + guarantee Q removal)
// Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 30)
const answerHeadings = [
  'הסכם: המפתח לקבלה',
  'איך מחשבים כאן?',
  'באילו מוסדות ותוכניות אפשר לבדוק כאן?',
];

it.each(answerHeadings)('renders the answer heading %s', async (name) => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
});

// Approved test update, Jorje 2026-10-29 (answer-block list + guarantee Q removal)
// Approved test update, Jorje 2026-10-29 (answer-block copy swaps)
it('omits lists and institution names from the answer section with mocked offerings', async () => {
  const loader = vi.spyOn(calculatorSupport, 'loadSekhemCalculatorOfferings').mockResolvedValue([
    {
      programId: 'z_cs',
      programName: 'מדעי המחשב',
      institutionId: 'z',
      institutionName: 'תל אביב',
    },
    { programId: 'a_cs', programName: 'מדעי המחשב', institutionId: 'a', institutionName: 'אפקה' },
    { programId: 'a_ee', programName: 'הנדסת חשמל', institutionId: 'a', institutionName: 'אפקה' },
  ]);
  try {
    render(await Page({ searchParams: Promise.resolve({}) }));
    const section = screen.getByRole('region', { name: 'שאלות על מחשבון הסכם' });
    expect(within(section).queryByRole('list')).toBeNull();
    expect(within(section).queryAllByRole('listitem')).toHaveLength(0);
    const heading = within(section).getByRole('heading', {
      level: 2,
      name: 'באילו מוסדות ותוכניות אפשר לבדוק כאן?',
    });
    expect(heading.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'המחשבון מכסה מספר הולך וגדל של מוסדות ותוכניות, ומתעדכן כל הזמן.',
    );
    for (const name of ['אפקה', 'תל אביב']) {
      expect(section.textContent).not.toContain(name);
    }
  } finally {
    loader.mockRestore();
  }
});

// Approved test update, Jorje 2026-10-29 (answer-block list + guarantee Q removal)
// Approved test update, Jorje 2026-10-29 (answer-block copy swaps)
it('omits lists and every real catalogue institution name from the answer section', async () => {
  const offerings = await calculatorSupport.loadSekhemCalculatorOfferings();
  const institutionNames = [...new Set(offerings.map((offering) => offering.institutionName))];
  expect(institutionNames.length).toBeGreaterThan(0);
  render(await Page({ searchParams: Promise.resolve({}) }));
  const section = screen.getByRole('region', { name: 'שאלות על מחשבון הסכם' });
  expect(within(section).queryByRole('list')).toBeNull();
  expect(within(section).queryAllByRole('listitem')).toHaveLength(0);
  const heading = within(section).getByRole('heading', {
    level: 2,
    name: 'באילו מוסדות ותוכניות אפשר לבדוק כאן?',
  });
  expect(heading.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
    'המחשבון מכסה מספר הולך וגדל של מוסדות ותוכניות, ומתעדכן כל הזמן.',
  );
  for (const name of institutionNames) {
    expect(section.textContent).not.toContain(name);
  }
});

// Approved test update, Jorje 2026-10-29 (answer-block copy swaps)
it('describes exactly how to calculate a sekhem here', async () => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  const section = screen.getByRole('region', { name: 'שאלות על מחשבון הסכם' });
  const heading = within(section).getByRole('heading', {
    level: 2,
    name: 'איך מחשבים כאן?',
  });
  expect(heading.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
    'מזינים ציוני בגרות ופסיכומטרי, ומקבלים מיד את הסכם שלכם מול סף הקבלה של התוכנית.',
  );
});

// Approved test update, Jorje 2026-10-29 (answer-block copy swaps)
it.each([undefined, 'not_a_public_programme'])(
  'keeps the answer block free of estimate and guarantee wording for programme %s',
  async (program) => {
    render(await Page({ searchParams: Promise.resolve({ program }) }));
    const section = screen.getByRole('region', { name: 'שאלות על מחשבון הסכם' });
    for (const phrase of ['הערכה', 'מבטיח', 'הבטחה']) {
      expect(section.textContent).not.toContain(phrase);
    }
  },
);

// Approved test update, Jorje 2026-10-29 (answer-block list + guarantee Q removal)
it('keeps the answer section free of numbers and unsupported admission promises', async () => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  const section = screen.getByRole('region', { name: 'שאלות על מחשבון הסכם' });
  const text = section.textContent!;
  expect(text).not.toMatch(/[0-9]/);
  for (const phrase of ['לפי הנוסחה של כל מוסד', 'כל המוסדות', 'תתקבל']) {
    expect(text).not.toContain(phrase);
  }
  expect(text).not.toContain('מבטיח');
  expect(text).not.toContain('הערכה בלבד');
});

// Approved test update, Jorje 2026-10-29 (answer-block list + guarantee Q removal)
it('renders all three answers below the unavailable block for an unknown programme', async () => {
  render(await Page({ searchParams: Promise.resolve({ program: 'not_a_public_programme' }) }));
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 26)
  const unavailable = screen.getByText('לתוכנית הזו: בדיקה אישית מול המוסד.');
  for (const name of answerHeadings) {
    const heading = screen.getByRole('heading', { level: 2, name });
    expect(unavailable.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  }
});

// Approved test update, Jorje 2026-10-29 (answer-block list + guarantee Q removal)
it('renders exactly three visible answer headings in order without the guarantee question', async () => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  const section = screen.getByRole('region', { name: 'שאלות על מחשבון הסכם' });
  const headings = within(section)
    .getAllByRole('heading', { level: 2 })
    .filter((heading) => !heading.classList.contains('sr-only'));
  expect(headings).toHaveLength(3);
  expect(headings.map((heading) => heading.textContent)).toEqual(answerHeadings);
  expect(section.textContent).not.toContain('האם התוצאה מבטיחה קבלה?');
});

// Approved test update, Jorje 2026-10-29 (answer-block list + guarantee Q removal)
it.each([undefined, 'not_a_public_programme'])(
  'keeps all rendered page JSON-LD free of Q&A and removed answer text for programme %s',
  async (program) => {
    const offerings = await calculatorSupport.loadSekhemCalculatorOfferings();
    const institutionNames = [
      'אפקה',
      'תל אביב',
      ...new Set(offerings.map((offering) => offering.institutionName)),
    ];
    expect(offerings.length).toBeGreaterThan(0);
    const { container } = render(await Page({ searchParams: Promise.resolve({ program }) }));
    const scripts = Array.from(
      container.querySelectorAll('main script[type="application/ld+json"]'),
    );
    expect(scripts.length).toBeGreaterThan(0);
    const jsonLd = JSON.stringify(scripts.map((script) => JSON.parse(script.textContent!)));
    for (const type of ['FAQPage', 'Question', 'Answer']) {
      expect(jsonLd).not.toContain(type);
    }
    for (const name of institutionNames) {
      expect(jsonLd).not.toContain(name);
    }
    expect(jsonLd).not.toContain('המחשבון כולל כרגע תוכניות במוסדות הבאים');
    expect(jsonLd).not.toContain('האם התוצאה מבטיחה קבלה?');
    expect(jsonLd).not.toContain('הערכה בלבד');
  },
);

it.each([undefined, 'not_a_public_programme'])(
  'renders page-level WebApplication JSON-LD without FAQPage for programme %s',
  async (program) => {
    const { container } = render(await Page({ searchParams: Promise.resolve({ program }) }));
    const scripts = Array.from(
      container.querySelectorAll('main script[type="application/ld+json"]'),
    );
    expect(scripts.length).toBeGreaterThan(0);
    const graphs = scripts.map((script) => JSON.parse(script.textContent!));
    const nodes = graphs.flatMap((graph) => graph['@graph']);
    expect(nodes).toContainEqual(
      expect.objectContaining({
        '@type': 'WebApplication',
        '@id': 'https://findmyway.co.il/sekhem-calculator#webapp',
      }),
    );
    expect(JSON.stringify(graphs)).not.toContain('FAQPage');
  },
);

it('describes the calculator application with canonical site relationships and no FAQPage', () => {
  const application = sekhemCalculatorLd();
  expect(application).toEqual({
    '@type': 'WebApplication',
    '@id': 'https://findmyway.co.il/sekhem-calculator#webapp',
    name: 'מחשבון סכם וסיכויי קבלה',
    url: 'https://findmyway.co.il/sekhem-calculator',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    inLanguage: 'he',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'ILS' },
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows Extra)
    featureList: ['חישוב סכם לפי תוכנית', 'בדיקת סיכויי קבלה', 'קישור לתנאי הקבלה של התוכנית'],
    publisher: { '@id': 'https://findmyway.co.il/#organization' },
    isPartOf: { '@id': 'https://findmyway.co.il/#website' },
  });
  expect(JSON.stringify(application)).not.toContain('FAQPage');
});

it('preserves the complete homepage WebApplication node', () => {
  expect(webApplicationLd()).toEqual({
    '@type': 'WebApplication',
    '@id': 'https://findmyway.co.il/#webapp',
    name: 'MyWay',
    url: 'https://findmyway.co.il/',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    inLanguage: 'he',
    publisher: { '@id': 'https://findmyway.co.il/#organization' },
    isPartOf: { '@id': 'https://findmyway.co.il/#website' },
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'ILS' },
    featureList: ['שאלון התאמה ללימודים', 'קטלוג מוסדות ומסלולי לימוד', 'בדיקת סיכויי קבלה אישית'],
  });
});

it('uses the sell-first description for every social snippet', () => {
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows Extra)
  expect(metadata.twitter).toMatchObject({ description: metadata.description });
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows Extra)
  expect(metadata.description).not.toContain('ומקבלים הערכה');
});
it('renders the approved subtitle and explanation in the existing FAQ slot', async () => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 29)
  expect(screen.getByText('מזינים בגרות ופסיכומטרי, ורואים מה הסכם שלכם פותח.')).toBeTruthy();
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 30)
  const heading = screen.getByRole('heading', { name: 'הסכם: המפתח לקבלה' });
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 30)
  expect(heading.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
    'כל מוסד מחשב אותו אחרת, ואנחנו עושים בשבילכם את החשבון לכל תוכנית במחשבון.', // Approved copy update, Jorje/Amit 2026-10-30
  );
  expect(screen.queryByText('כל מוסד מחשב אותו אחרת, ואנחנו עושים בשבילכם את החשבון.')).toBeNull();
});
