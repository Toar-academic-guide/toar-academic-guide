// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/atuda' }));
import Page, { metadata } from './page';

it('renders the 2027–2028 booklet values and complete selected-major tables', () => {
  render(<Page />);
  const main = screen.getByRole('main');
  expect(main.getAttribute('dir')).toBe('rtl');
  expect(within(main).getByRole('heading', { level: 1 }).textContent).toContain(
    'עתודה אקדמית 2027–2028',
  );
  for (const value of ['590', '28.02.2027', '10.2.2027', '18–19.4.2027', '10,500', '2,500']) {
    expect(main.textContent).toContain(value);
  }
  expect(main.textContent).not.toMatch(/28\.02\.26(?!\d)|28\.02\.2026|מובטח/);
  const tables = within(main).getAllByRole('table');
  expect(tables).toHaveLength(3);
  expect(tables[0].querySelectorAll('tbody tr')).toHaveLength(8);
  expect(tables[1].querySelectorAll('tbody tr')).toHaveLength(9);
  expect(tables[2].querySelectorAll('tbody tr')).toHaveLength(9);
  for (const name of ['אלונים', 'אביבים']) {
    const row = Array.from(tables[1].querySelectorAll('tbody tr')).find((tr) =>
      tr.textContent?.includes(name),
    );
    expect(row?.lastElementChild?.textContent).toBe('לא צוין בעמוד');
  }
  expect(main.textContent).toContain('פתיחת הכיתות במסלול פסגה מותנית באישור חיל הרפואה');
  expect(
    main.querySelector('a[href="/programs/technion_cs"]')?.closest('tr')?.textContent,
  ).toContain('מדעי המחשב');
  expect(main.querySelector('a[href="/programs/technion_softwareeng"]')).toBeNull();
  for (const number of main.querySelectorAll('bdi')) expect(number.getAttribute('dir')).toBe('ltr');
});

it('keeps the five visible FAQ answers identical to schema and has breadcrumb only', () => {
  const { container } = render(<Page />);
  const graph = JSON.parse(
    container.querySelector('script[type="application/ld+json"]')!.textContent!,
  )['@graph'];
  expect(graph.map((item: { '@type': string }) => item['@type'])).toEqual([
    'FAQPage',
    'BreadcrumbList',
  ]);
  const visible = Array.from(container.querySelectorAll('section[aria-labelledby="faq"] > div'));
  expect(visible).toHaveLength(5);
  expect(graph[0].mainEntity).toEqual(
    visible.map((item) => ({
      '@type': 'Question',
      name: item.querySelector('h3')!.textContent,
      acceptedAnswer: { '@type': 'Answer', text: item.querySelector('p')!.textContent },
    })),
  );
});

it('sets the exact metadata and self-canonical URL', () => {
  expect(metadata.title).toEqual({
    absolute: 'עתודה אקדמית 2027–2028: תנאי קבלה, 590 בפסיכומטרי ומועדים | MyWay',
  });
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/atuda');
});

it('marks the 2027–2028 booklet for review after nine months', () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2027-08-18T00:00:00Z'));
    render(<Page />);
    expect(screen.getByText(/המידע לשנה זו בבדיקה מחדש/)).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});
