// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/psychometric-dates' }));
import Page, { dynamic, metadata } from './page';

const title = 'מועדי פסיכומטרי 2026–2027: תאריכים וסיום הרשמה | MyWay';
const description =
  'מועדי הבחינה הפסיכומטרית לפי לוח מאל״ו: תאריכי בחינה, מועדי סיום הרשמה ושפות לכל מועד, עם תאריך בדיקה וקישור למקור הרשמי.';
const canonical = 'https://findmyway.co.il/psychometric-dates';
afterEach(() => vi.useRealTimers());

it('renders the approved dates, derived answer, closed badge, next label and single CTA', async () => {
  vi.useFakeTimers();
  vi.setSystemTime('2026-10-29T12:00:00Z');
  render(await Page());
  const main = screen.getByRole('main');
  expect(
    within(main)
      .getAllByRole('heading', { level: 1 })
      .map((node) => node.textContent),
  ).toEqual(['מועדי פסיכומטרי 2026–2027']);
  expect(main.textContent).toContain(
    'המועד הפתוח הקרוב להרשמה: 18–19.4.2027. ההרשמה נסגרת ב־10.2.2027.',
  );
  const rows = within(main).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(5);
  expect(
    rows.map((row) => within(row).getByRole('rowheader').querySelector('bdi')?.textContent),
  ).toEqual(['4,6.12.2026', '18–19.4.2027', '1.7.2027', '6–7.9.2027', '24,26.12.2027']);
  expect(rows[0].textContent).toContain('ההרשמה נסגרה');
  expect(rows[1].textContent).toContain('המועד הקרוב');
  expect(within(main).getAllByText('המועד הקרוב')).toHaveLength(1);
  const ctas = within(main).getAllByRole('link', { name: 'בדיקת סיכויי קבלה' });
  expect(ctas).toHaveLength(1);
  expect(ctas[0].getAttribute('href')).toBe('/sekhem-calculator');
  const stamp = within(main).getByText(/נבדק בתאריך/);
  expect(stamp.textContent).toContain('29.10.2026');
  expect(
    within(stamp).getByRole('link', { name: 'לוח הבחינות הרשמי באתר מאל״ו' }).getAttribute('href'),
  ).toBe('https://www.nite.org.il/test-dates-and-prices/');
  expect(within(main).getByRole('table').querySelector('caption')?.textContent).toBe(
    'מועדי פסיכומטרי מ־29.10.2026 ואילך',
  );
  expect(main.textContent).not.toMatch(/סכם/);
  expect(
    screen
      .getByRole('navigation', { name: 'ניווט ראשי' })
      .querySelector('a[href="/psychometric-dates"]'),
  ).toBeNull();
  for (const date of main.querySelectorAll('bdi')) expect(date.getAttribute('dir')).toBe('ltr');
  expect(main.textContent).toContain('תחזית הציונים למועד דצמבר 2026: 20.1.2027');
  expect(main.textContent).toContain('מחיר הרשמה רגילה המוצג באתר מאל״ו: 495 ₪.');
});

it('omits an answer when no verified registration is open and hides past rows', async () => {
  vi.useFakeTimers();
  vi.setSystemTime('2027-10-26T12:00:00Z');
  render(await Page());
  expect(screen.getByRole('main').textContent).not.toContain('המועד הפתוח הקרוב להרשמה:');
  expect(screen.getAllByRole('row')).toHaveLength(2);
  expect(screen.queryByText('המועד הקרוב')).toBeNull();
});

it('exports exact indexable metadata and request-time rendering', () => {
  expect(dynamic).toBe('force-dynamic');
  expect(metadata).toMatchObject({
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'he_IL',
      siteName: 'MyWay',
    },
    twitter: { card: 'summary', title, description },
  });
  expect(metadata.robots).not.toEqual(expect.objectContaining({ index: false }));
});
