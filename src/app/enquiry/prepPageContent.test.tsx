// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import expectedCopy from './__fixtures__/prep-page-copy.json';
import EnquiryPage, { metadata } from './page';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/lib/enquiryTarget', () => ({
  getEnquiryTarget: vi.fn().mockResolvedValue({
    program: { name: 'מדעי המחשב' },
    institution: { name: 'אוניברסיטת תל אביב' },
  }),
}));

async function renderPage(program = 'psychometric-preparation', institution = '') {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(
    await EnquiryPage({ searchParams: Promise.resolve({ program, institution }) }),
  );
  return root;
}

describe('server-rendered preparation reading content', () => {
  it('renders the four approved blocks verbatim, excluding only new-tab announcements', async () => {
    const root = await renderPage();
    const reading = root.querySelector('[data-prep-content]')!;
    expect(reading).not.toBeNull();
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    const headings = [...reading.querySelectorAll('h2')];
    expect(headings.map((heading) => heading.textContent)).toEqual(
      expectedCopy.map((block) => block.heading),
    );
    for (const [index, heading] of headings.entries()) {
      const pieces: string[] = [];
      for (
        let node = heading.nextElementSibling;
        node && node.tagName !== 'H2';
        node = node.nextElementSibling
      ) {
        const clone = node.cloneNode(true) as Element;
        clone.querySelectorAll('[data-prep-new-tab]').forEach((annotation) => annotation.remove());
        pieces.push(clone.textContent!);
      }
      expect(pieces.join(' ')).toBe(expectedCopy[index].text);
    }
    expect(metadata).toEqual({ robots: { index: false, follow: true } });
  });

  it('uses the approved semantic lists and exactly ten strong phrases', async () => {
    const reading = (await renderPage()).querySelector('[data-prep-content]')!;
    expect([...reading.querySelectorAll('ul')].map((list) => list.children.length)).toEqual([4, 3]);
    expect([...reading.querySelectorAll('strong')].map((node) => node.textContent)).toEqual([
      'מדצמבר 2026',
      '150 דקות',
      'מסגרת קבוצתית',
      '495 ₪',
      '200 ל־800',
      '50% כל אחת',
      'פי שלושה',
      'MyWay בלבד',
      '18 ומעלה',
      'מסלול מתוגבר בתשלום',
    ]);
    expect(reading.querySelector('button')).toBeNull();
  });

  it('keeps internal links relative and source links safely announced with the approved icon', async () => {
    const reading = (await renderPage()).querySelector('[data-prep-content]')!;
    const links = [...reading.querySelectorAll('a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/psychometric-dates',
      '/sekhem-calculator',
      'https://www.nite.org.il/two-domain-psychometric-entrance-test/format/',
      'https://campus.gov.il/course/mse-gov-psychometry-he/',
    ]);
    for (const link of links.slice(0, 2)) expect(link.hasAttribute('target')).toBe(false);
    for (const link of links.slice(2)) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.querySelector('[data-prep-new-tab]')?.textContent).toBe(' (נפתח בכרטיסייה חדשה)');
      const icon = link.querySelector('svg')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('focusable')).toBe('false');
      expect(icon.querySelector('path')?.getAttribute('d')).toBe('M21 3L15 3M21 3L12 12M21 3V9');
      expect(icon.parentElement?.firstChild?.textContent).toMatch(/^(הבחינה|המדינה)$/);
    }
  });

  it('leaves institution enquiry markup without prep reading content or prep layout classes', async () => {
    const root = await renderPage('cs', 'tau');
    expect(root.querySelector('[data-prep-content]')).toBeNull();
    expect(root.querySelector('main')?.className).toBe('mx-auto max-w-2xl px-5 pb-16 pt-8');
    expect(root.querySelector('h1')?.textContent).toBe('רוצים תשובות ישר מהמוסד?');
  });
});
