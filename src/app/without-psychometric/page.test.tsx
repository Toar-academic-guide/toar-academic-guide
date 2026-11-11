// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
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
vi.mock('@/lib/sekhemCalculatorSupport', () => ({
  loadSekhemCalculatorOfferings: async () => [{ programId: 'tau_business', institutionId: 'tau' }],
  canLinkToSekhemCalculator: () => true,
}));

import Page, { metadata } from './page';
import sitemap from '@/app/sitemap';

it('renders official sourced routes in numeric order, preserving cycle and conditional requirements', async () => {
  render(await Page());
  const rows = screen.getAllByRole('row').slice(1);
  const averages = rows.map((row) => row.querySelector('td')?.textContent ?? '');
  const numbers = averages.map((average) =>
    Number(average.match(/\d+(?:\.\d+)?/)?.[0] ?? Infinity),
  );
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  expect(rows.length).toBeGreaterThan(15);
  for (const row of rows) {
    expect(
      within(row).getByRole('link', { name: 'תנאי הקבלה באתר המוסד' }).getAttribute('href'),
    ).toMatch(/^https:\/\//);
    expect(within(row).getByText('10.11.2026')).toBeTruthy();
  }
  const psychology = rows.find((row) => row.textContent?.includes('פסיכולוגיה — דו־מחלקתי'))!;
  expect(psychology.textContent).toContain('ההרשמה סגורה');
  expect(psychology.textContent).toContain('113');
  expect(within(psychology).queryByRole('link', { name: 'בדקו במחשבון' })).toBeNull();
  const haifa = rows.find((row) => row.textContent?.includes('מדעי המחשב — מסלול אופק'))!;
  expect(haifa.textContent).toContain('הקבלה אינה מובטחת');
  expect(within(haifa).queryByRole('link', { name: 'בדקו במחשבון' })).toBeNull();
  const jmc = rows.filter((row) => row.textContent?.includes('המרכז האקדמי הרב־תחומי ירושלים'));
  expect(jmc).toHaveLength(2);
  expect(jmc.map((row) => row.querySelector('td')?.textContent)).toEqual([
    'ממוצע בגרות משוקלל 95',
    'ממוצע בגרות משוקלל 100',
  ]);
  expect(jmc[0].textContent).toContain('מבחן תי״ל');
});

it('keeps source-only identities off internal programme and calculator links', async () => {
  render(await Page());
  for (const name of ['סטטיסטיקה ומדע הנתונים', 'מדעי התזונה', 'רוקחות', 'הנדסת הסביבה']) {
    const row = screen.getByRole('heading', { name }).closest('tr')!;
    expect(within(row).getAllByRole('link')).toHaveLength(1);
    expect(row.textContent).toContain('10.11.2026');
  }
  const business = screen
    .getAllByRole('heading', { name: 'מנהל עסקים' })
    .map((heading) => heading.closest('tr')!)
    .find((row) => row.textContent?.includes('אוניברסיטת תל אביב'))!;
  expect(within(business).getByRole('link', { name: 'בדקו במחשבון' }).getAttribute('href')).toBe(
    '/sekhem-calculator?program=tau_business',
  );
});

it('publishes a self-canonical indexable route in the sitemap', async () => {
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/without-psychometric');
  expect(metadata.robots).toBeUndefined();
  const entries = (await sitemap()).filter((entry) => entry.url === metadata.alternates?.canonical);
  expect(entries).toHaveLength(1);
  expect(entries[0].lastModified).toBe('2026-11-10');
});
