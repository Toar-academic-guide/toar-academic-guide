// @vitest-environment jsdom
import { render, screen, within, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import seed from '@/data/openDays.initial.json';
vi.mock('server-only', () => ({}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/open-days' }));
vi.mock('./openDays', () => ({ loadOpenDays: vi.fn(async () => seed) }));
import Page, { metadata } from './page';
import { loadOpenDays } from './openDays';
import { calendarSummary, eventSchema } from './calendarContent';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-27T10:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.mocked(loadOpenDays).mockResolvedValue(seed);
});

it('renders all institutions by default, published times, unknowns, and matching FAQ/Event data', async () => {
  const { container } = render(await Page({ searchParams: Promise.resolve({}) }));
  expect(metadata.title).toBe('ימים פתוחים 2027 באוניברסיטאות ובמכללות');
  expect(screen.getByRole('link', { name: 'הכול' }).getAttribute('aria-current')).toBe('page');
  const table = screen.getByRole('table', { name: 'ימים פתוחים קרובים' });
  for (const institution of [
    'בצלאל אקדמיה לאמנות ועיצוב',
    'המכללה למנהל',
    'אוניברסיטת רייכמן',
    'אוניברסיטת חיפה',
    'המכללה האקדמית סמי שמעון SCE',
    'המכללה האקדמית ספיר',
    'סם שפיגל לקולנוע ולטלוויזיה',
  ]) {
    expect(within(table).getByRole('rowheader', { name: institution })).toBeTruthy();
  }
  expect(within(table).getAllByText('טרם פורסם')).toHaveLength(3);
  expect(within(table).getByText('17:00–19:00').getAttribute('dir')).toBe('ltr');
  expect(within(table).getByText('ערב פתוח לתארים שניים')).toBeTruthy();
  expect(table.querySelectorAll('a')).toHaveLength(0);
  expect(screen.getByRole('main').textContent).not.toMatch(/מקור|נבדק בתאריך|עודכן לאחרונה/);
  const graph = JSON.parse(
    container.querySelector('script[type="application/ld+json"]')!.textContent!,
  )['@graph'];
  const events = graph.filter((entry: { '@type': string }) => entry['@type'] === 'Event');
  const future = seed.filter((event) => (event.endDate || event.date) >= '2026-11-27');
  expect(events.map((event: { '@id': string }) => event['@id']).sort()).toEqual(
    future
      .filter((event) => event.place)
      .map((event) => `https://findmyway.co.il/open-days#event-${event.id}`)
      .sort(),
  );
  expect(
    events.find(
      (event: { url: string }) => event.url === 'https://www.bgu.ac.il/events/online-open-day-ba/',
    ),
  ).toMatchObject({
    startDate: '2027-01-07T17:00:00+02:00',
    endDate: '2027-01-07T19:00:00+02:00',
    location: { '@type': 'VirtualLocation' },
  });
  const faq = graph.find((entry: { '@type': string }) => entry['@type'] === 'FAQPage');
  const details = screen.getByRole('region', { name: 'שאלות נפוצות' }).querySelectorAll('details');
  expect(faq.mainEntity).toHaveLength(4);
  details.forEach((detail, index) => {
    expect(detail.querySelector('summary')!.textContent).toBe(faq.mainEntity[index].name);
    expect(detail.querySelector('p')!.textContent).toBe(faq.mainEntity[index].acceptedAnswer.text);
  });
  const words = calendarSummary(future).split(/\s+/).length;
  expect(words).toBeGreaterThanOrEqual(40);
  expect(words).toBeLessThanOrEqual(60);
});

it.each(['universities', 'colleges'])(
  'filters both SSR rows and Event schema for %s',
  async (type) => {
    const { container } = render(await Page({ searchParams: Promise.resolve({ type }) }));
    const table = screen.getByRole('table');
    expect(!!within(table).queryByRole('rowheader', { name: 'אוניברסיטת תל אביב' })).toBe(
      type === 'universities',
    );
    expect(!!within(table).queryByRole('rowheader', { name: 'המכללה למנהל' })).toBe(
      type === 'colleges',
    );
    const graph = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!,
    )['@graph'];
    for (const event of graph.filter((entry: { '@type': string }) => entry['@type'] === 'Event')) {
      expect(table.textContent).toContain(event.organizer.name);
    }
  },
);

it('removes unavailable dates from the answer and FAQ instead of repeating fixed claims', async () => {
  vi.mocked(loadOpenDays).mockResolvedValue(
    seed.filter((event) => event.institution !== 'אוניברסיטת חיפה'),
  );
  render(await Page({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole('region', { name: 'מתי הימים הפתוחים 2027?' }).textContent).not.toContain(
    'אוניברסיטת חיפה',
  );
  expect(screen.getByRole('region', { name: 'שאלות נפוצות' }).textContent).not.toContain('17–18');
});

it('keeps date-only events date-only and uses Israel daylight time for published summer hours', () => {
  expect(eventSchema({ ...seed[2], startTime: undefined })?.startDate).toBe('2026-12-03');
  expect(eventSchema({ ...seed[2], date: '2027-04-12', startTime: '16:00' })?.startDate).toBe(
    '2027-04-12T16:00:00+03:00',
  );
  expect(eventSchema({ ...seed[2], place: '' })).toBeNull();
});
