// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

it('renders an indexable public calculator with absolute title and canonical metadata', async () => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('מחשבון סכם וסיכויי קבלה');
  expect(metadata.title).toEqual({ absolute: 'מחשבון סכם וסיכויי קבלה לפי מוסד ותוכנית | MyWay' });
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/sekhem-calculator');
  expect(metadata.description).toBe(
    'מחשבון סכם וסיכויי קבלה בחינם: מזינים ציוני בגרות ופסיכומטרי, מחשבים סכם לפי נוסחאות המוסדות הנתמכים וממשיכים לבדיקת התוכנית שמעניינת אותך.',
  );
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
    fireEvent.click(screen.getByRole('button', { name: 'לחשב את הסכם' }));
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'לחשב את הסכם' })).toHaveProperty(
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
