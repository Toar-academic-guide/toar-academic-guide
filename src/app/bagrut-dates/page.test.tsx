// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/bagrut-dates' }));
import {
  bagrutDatesCheckedOn,
  bagrutDatesSources,
  bagrutExamCalendars,
  simulationOpenings,
  spokenLanguageExams,
} from '@/data/bagrutDates';
import Page, { metadata } from './page';

it('renders complete official winter, summer, spoken-language and simulation schedules', async () => {
  render(await Page());
  const main = screen.getByRole('main');
  expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(
    'מועדי בחינות הבגרות תשפ״ז',
  );
  expect(main.textContent).not.toMatch(/נבדק/);
  expect(main.textContent).not.toContain(bagrutDatesCheckedOn);
  expect(main.textContent).toContain('טיוטה לפי פורטל משרד החינוך');
  const dates = Array.from(main.querySelectorAll('time'));
  const expectedDates = [
    ...bagrutExamCalendars.flatMap((calendar) => calendar.months.flatMap((month) => month.dates)),
    ...spokenLanguageExams.flatMap((exam) => exam.sittings.flatMap((sitting) => sitting.dates)),
    ...simulationOpenings.map((opening) => opening.date),
  ];
  expect(dates.map((date) => date.dateTime)).toEqual(expectedDates);
  expect(dates).toHaveLength(75);
  for (const date of dates) {
    const [year, month, day] = date.dateTime.split('-');
    expect(date.textContent).toBe(`${Number(day)}.${Number(month)}.${year}`);
    expect(date.dir).toBe('ltr');
  }
  expect(dates[0].parentElement?.textContent).toContain('יום שני');
  const details = main.querySelectorAll('details');
  expect(details[0].querySelectorAll('h3')).toHaveLength(9);
  expect(details[1].querySelectorAll('h3')).toHaveLength(7);
  expect(main.querySelector('table')).toBeNull();
  expect(main.querySelector('a[href^="https://"]')).toBeNull();
  for (const url of Object.values(bagrutDatesSources)) {
    expect(main.innerHTML).not.toContain(url);
    expect(url).toMatch(/^https:\/\//);
  }
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
