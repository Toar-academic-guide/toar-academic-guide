// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Page, { metadata } from './page';

it('renders eight sourced institution rows with the distinct admission and post-exemption rules', () => {
  render(<Page />);
  const table = screen.getByRole('table', { name: /רמות אמירנט בשמונה מוסדות/ });
  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(8);
  for (const row of rows) {
    expect(
      within(row).getByRole('link', { name: 'עמוד המוסד הרשמי' }).getAttribute('href'),
    ).toMatch(/^https:\/\//);
    expect(row.querySelector('time[datetime="2026-11-14"]')).toBeTruthy();
    expect(row.querySelectorAll('td:nth-child(-n+4) bdi[dir="ltr"]')).toHaveLength(3);
  }
  const rowFor = (name: string) =>
    rows.find((row) => within(row).getByRole('rowheader').textContent === name)!;
  expect(rowFor('הטכניון').textContent).toContain('103 ומטה');
  expect(rowFor('הטכניון').querySelectorAll('td bdi')[2].textContent).toBe('104–119');
  expect(rowFor('אוניברסיטת תל אביב').textContent).toContain('חריג לעולים');
  expect(rowFor('אוניברסיטת חיפה').textContent).toContain('50–84');
  expect(rowFor('אוניברסיטת חיפה').textContent).toContain('שני קורסי תוכן');
  expect(rowFor('האוניברסיטה הפתוחה').textContent).toContain('18 נקודות זכות');
  expect(rowFor('אוניברסיטת בן־גוריון').textContent).toContain('85–99');
  expect(rowFor('אוניברסיטת בר־אילן').textContent).toContain('לא פורסם סף דחייה');
});

it('publishes matching visible FAQ answers, exact metadata and live internal links', () => {
  const { container } = render(<Page />);
  expect(metadata.title).toEqual({ absolute: 'רמות אמירנט ופטור באנגלית לפי מוסד | MyWay' });
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/amirnet');
  expect(metadata.robots).toBeUndefined();
  const main = screen.getByRole('main');
  expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(
    'מה אומר הציון באמירנט, והאם הוא יכול לחסום קבלה?',
  );
  expect(main.textContent).toContain('הכרה ברמה ממוסד אחר אינה אוטומטית');
  const script = container.querySelector('script[type="application/ld+json"]');
  const graph = JSON.parse(script!.textContent!)['@graph'];
  const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
  expect(faq.mainEntity).toHaveLength(4);
  for (const item of faq.mainEntity) {
    const heading = within(main).getByRole('heading', { level: 3, name: item.name });
    expect(heading.nextElementSibling?.textContent).toBe(item.acceptedAnswer.text);
  }
  const related = screen.getByRole('navigation', { name: 'מדריכים קשורים' });
  expect(within(related).getAllByRole('link')).toHaveLength(6);
  expect(related.querySelector('a[href="/psychometric-accommodations"]')).toBeNull();
});
