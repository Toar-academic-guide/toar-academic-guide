// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
