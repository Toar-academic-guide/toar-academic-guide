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

it('renders the two separate decisions and concrete official-source next steps', () => {
  render(<Page />);

  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('שתי בדיקות נפרדות');
  expect(screen.getByRole('heading', { name: 'קבלה לתוכנית החדשה' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'הכרה בקורסים שכבר למדתם' })).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'מסמכי ההרשמה לבעלי השכלה אקדמית' }).getAttribute('href'),
  ).toBe('https://go.tau.ac.il/he/ba/process-doc');
  expect(
    screen
      .getByRole('link', { name: 'נוהל הפטורים בחוג לניהול בתל אביב — תשפ״ז' })
      .getAttribute('href'),
  ).toBe(
    'https://coller.tau.ac.il/BA-students/programs/2026-27/management/rules/student-exemption',
  );
  expect(
    screen.getByRole('link', { name: 'האוניברסיטה הפתוחה ב־MyWay' }).getAttribute('href'),
  ).toBe('/institutions/open_university');
  expect(screen.getByRole('link', { name: 'למחשבון הסכם' }).getAttribute('href')).toBe(
    '/sekhem-calculator',
  );

  const text = document.querySelector('article')?.textContent ?? '';
  expect(text).not.toMatch(/\b(?:30|40|44|50|700|800)\b/);
  expect(text).not.toContain('ההרשמה פתוחה');
  expect(text).not.toContain('חיסכון');
});

it('publishes matching absolute canonical and social metadata and a dated sitemap entry', async () => {
  const title = 'מעבר בין מוסדות לימוד אקדמיים: קבלה והכרה בקורסים | MyWay';
  expect(metadata.title).toEqual({ absolute: title });
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/transfer');
  expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
  expect(metadata.openGraph?.title).toBe(title);
  expect(metadata.openGraph?.description).toBe(metadata.description);
  expect(metadata.twitter?.title).toBe(title);
  expect(metadata.twitter?.description).toBe(metadata.description);

  const entries = (await sitemap()).filter(
    (entry) => entry.url === 'https://findmyway.co.il/transfer',
  );
  expect(entries).toHaveLength(1);
  expect(entries[0].lastModified).toBe('2026-11-08');
});
