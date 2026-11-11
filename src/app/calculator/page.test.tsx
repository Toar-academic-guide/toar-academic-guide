// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import Page, { metadata } from './page';

it('renders the indexable calculator explanation and sends guests to the existing journey', () => {
  const { container } = render(<Page />);
  const main = screen.getByRole('main');
  expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(
    'לאן אני מתקבל/ת עם הציונים שלי?',
  );
  expect(within(main).getAllByRole('link', { name: /בדקו.*לאן אתם מתקבלים/ })).toHaveLength(2);
  expect(
    within(main)
      .getAllByRole('link', { name: /בדקו.*לאן אתם מתקבלים/ })
      .every((link) => link.getAttribute('href') === '/app/calculator'),
  ).toBe(true);
  expect(within(main).getAllByRole('listitem')).toHaveLength(4);
  expect(within(main).getByRole('table').textContent).toContain('680–699');
  expect(within(main).getByText('680–699').getAttribute('dir')).toBe('ltr');
  expect(within(main).getByRole('table').textContent).toContain('105 ומעלה');
  expect(within(main).queryByRole('link', { name: 'לימודים ללא פסיכומטרי' })).toBeNull();
  expect(main.textContent).not.toMatch(/מתואם|כל התארים|%/);
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/calculator');
  expect(metadata.robots).toBeUndefined();

  const graph = JSON.parse(
    container.querySelector('script[type="application/ld+json"]')!.textContent!,
  )['@graph'];
  expect(
    graph.find((node: { '@type': string }) => node['@type'] === 'WebApplication').featureList,
  ).toEqual(['מה ללמוד', 'איפה ללמוד', 'הציונים שלי', 'האפשרויות שלי']);
  const questions = graph.find(
    (node: { '@type': string }) => node['@type'] === 'FAQPage',
  ).mainEntity;
  expect(questions).toHaveLength(7);
  for (const item of questions) {
    const details = within(main).getByText(item.name).closest('details')!;
    expect(details.querySelector('p')!.textContent).toBe(item.acceptedAnswer.text);
  }
});
