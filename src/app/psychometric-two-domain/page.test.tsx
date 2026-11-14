// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Page, { metadata } from './page';

vi.mock('@/components/PublicNavBar', () => ({ default: () => null }));
vi.mock('@/components/WayBackdrop', () => ({ default: () => null }));

function renderPage() {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<Page />);
  return root;
}

describe('psychometric score choice guide', () => {
  it('renders a dated institution comparison and short answer in server HTML', () => {
    const root = renderPage();
    const table = root.querySelector('table[aria-labelledby="admissions"]');
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(table?.querySelectorAll('time[datetime="2026-11-14"]')).toHaveLength(4);
    const answer = root.querySelector('#admissions-answer')?.textContent?.trim().split(/\s+/);
    expect(answer?.length).toBeGreaterThanOrEqual(40);
    expect(answer?.length).toBeLessThanOrEqual(60);
    expect(metadata.alternates?.canonical).toBe('https://findmyway.co.il/psychometric-two-domain');
  });

  it('keeps the verified BGU and TAU score rules separate from semester validity', () => {
    const root = renderPage();
    const rows = Array.from(root.querySelectorAll('table[aria-labelledby="admissions"] tbody tr'));
    const bgu = rows.find((row) => row.textContent?.includes('בן־גוריון'));
    expect(bgu?.textContent).toContain('לפני דצמבר 2026');
    expect(bgu?.textContent).toContain('אין צורך להיבחן שוב רק בגלל השינוי');
    expect(bgu?.querySelector('a')?.href).toBe(
      'https://www.bgu.ac.il/welcome/blog/articles/new-psychometry/',
    );
    const tau = rows.find((row) => row.textContent?.includes('תל אביב'));
    expect(tau?.textContent).toContain('הגבוה מבין שלושת הציונים');
    expect(tau?.textContent).toContain('פיילוט לשנתיים');
    expect(Array.from(tau?.querySelectorAll('a') ?? [], (a) => a.href)).toEqual([
      'https://go.tau.ac.il/he/psychometric-test',
      'https://go.tau.ac.il/he/ba/psycho',
    ]);
    expect(root.querySelector('#admissions')?.parentElement?.textContent).not.toContain('תשפ״ז');
    expect(root.querySelector('#admissions')?.parentElement?.textContent).not.toContain('בר־אילן');
  });

  it('leaves institutions without verified score-choice rules as source links only', () => {
    const root = renderPage();
    const rows = Array.from(root.querySelectorAll('table[aria-labelledby="admissions"] tbody tr'));
    for (const name of ['האוניברסיטה העברית', 'אוניברסיטת חיפה']) {
      const row = rows.find((candidate) => candidate.textContent?.includes(name));
      expect(row?.textContent).toContain('לא נמצא כלל לתשפ״ח בעמוד שנבדק');
      expect(row?.textContent).not.toContain('הגבוה');
      expect(row?.querySelector('a')?.href).toMatch(
        /^https:\/\/(info\.huji|admissions\.haifa)\.ac\.il\//,
      );
    }
    expect(root.textContent).toContain('אפשר להיבחן בפסיכומטרי במועדים רצופים?');
  });
});
