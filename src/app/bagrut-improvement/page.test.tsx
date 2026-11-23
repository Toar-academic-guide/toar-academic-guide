// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Page, { metadata } from './page';
import guidance from '@/data/bagrutImprovement.json';

it('keeps cycle-specific improvement restrictions and exact oral dates and module numbers', () => {
  render(<Page />);
  const main = screen.getByRole('main');
  expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(guidance.heading);
  for (const text of [
    'בקיץ תשפ״ו',
    'אינה חלה על נבחני משנה',
    'באמצעות היבחנות פנימית',
    'COBE',
    'BOOST',
    '016486',
    '016586',
    '016387',
    '24–25.11.2026',
    '1–2.12.2026',
    '14.12.2026',
    '25.2.2027',
    '1–3.3.2027',
    '8.3.2027',
    '6.7.2027',
    'תגובה אישית (25 נקודות)',
    'הצגת פרויקט (25)',
    'שמע־חזותי (50)',
  ])
    expect(main.textContent).toContain(text);
  for (const date of ['24–25.11.2026', '1–3.3.2027', '6.7.2027']) {
    expect(within(main).getByText(date).closest('bdi')?.getAttribute('dir')).toBe('ltr');
  }
});

it('publishes the newly readable registration steps without outdated deadlines or a higher-score promise', () => {
  render(<Page />);
  const main = screen.getByRole('main');
  expect(within(main).getByRole('heading', { name: 'איך נרשמים לשיפור בגרות' })).toBeTruthy();
  expect(main.textContent).toContain('נרשמים ונבחנים בבית הספר שבו סיימו ללמוד');
  expect(main.textContent).toContain('מגישים פנייה אישית');
  expect(main.textContent).toContain('פתיחת תיק אינה הרשמה לבחינה');
  expect(main.textContent).toContain('באיזה ציון ישתמשו אם ניגשים שוב — לא פורסם');
  expect(main.textContent).not.toMatch(/20%|הציון הגבוה|פטורים|2024|20\.11|20\.3/);
});

it('matches all three visible FAQs to the structured answers and keeps source metadata out of the UI', () => {
  const { container } = render(<Page />);
  const schema = JSON.parse(
    container.querySelector('script[type="application/ld+json"]')!.textContent!,
  );
  expect(schema['@graph'][0]['@type']).toBe('FAQPage');
  expect(schema['@graph'][0].mainEntity).toHaveLength(3);
  for (const question of schema['@graph'][0].mainEntity) {
    const summary = screen.getByText(question.name, { selector: 'summary' });
    expect(summary.closest('details')!.querySelector('p')!.textContent).toBe(
      question.acceptedAnswer.text,
    );
  }
  const main = screen.getByRole('main');
  expect(main.querySelector('article')!.textContent).not.toMatch(/מקור:|נבדק|אומת|https?:/);
  const links = within(main)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));
  expect(links).toEqual(['/sekhem-calculator', '/without-psychometric', '/programs/prep']);
  expect(links).not.toContain('/amirnet');
  expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/bagrut-improvement');
  expect(metadata.robots).toBeUndefined();
});
