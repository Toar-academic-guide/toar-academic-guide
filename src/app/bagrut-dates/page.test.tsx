// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/bagrut-dates' }));
import Page, { metadata } from './page';

it('renders complete official winter, summer, spoken-language and simulation schedules', async () => {
  render(await Page());
  const main = screen.getByRole('main');
  expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(
    'מועדי בחינות הבגרות תשפ״ז',
  );
  expect(main.textContent).toContain('נבדק בתאריך 8.11.2026');
  expect(main.textContent).toContain('טיוטה לפי פורטל משרד החינוך');
  expect(main.querySelectorAll('time')).toHaveLength(45);
  expect(
    main.querySelector(
      'a[href="https://parents.education.gov.il/gov-education/school/matriculation/dates"]',
    ),
  ).not.toBeNull();
  expect(
    main.querySelector(
      'a[href="https://meyda.education.gov.il/files/Exams/LuachWinExams2027Sofi.pdf"]',
    ),
  ).not.toBeNull();
  expect(
    main.querySelector(
      'a[href="https://meyda.education.gov.il/files/Exams/LuachSumExams2027Tyota.pdf"]',
    ),
  ).not.toBeNull();
  expect(main.querySelectorAll('details')).toHaveLength(2);
  expect(main.textContent).toContain('עברית לערבים ולעדה הדרוזית');
  expect(main.textContent).toContain('8:30–9:15');
  expect(main.textContent).toContain('פתיחת הדמיות');
  expect(main.textContent).toContain('מועד ב׳');
  expect(main.querySelector('a[href="/enquiry?program=psychometric-preparation"]')).not.toBeNull();
});

it('publishes canonical indexable metadata', () => {
  expect(metadata).toMatchObject({
    title: { absolute: 'מועדי בחינות הבגרות 2026–2027 | MyWay' },
    alternates: { canonical: 'https://findmyway.co.il/bagrut-dates' },
    openGraph: { url: 'https://findmyway.co.il/bagrut-dates', locale: 'he_IL' },
  });
  expect(metadata.robots).not.toEqual(expect.objectContaining({ index: false }));
});
