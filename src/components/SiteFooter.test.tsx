// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SiteFooter from './SiteFooter';
import { FOOTER_LEGAL_LINKS, FOOTER_NAV_LINKS } from '@/lib/footerLinks';

const navigationLinks = [
  { label: 'תחומי לימוד', href: '/programs' },
  { label: 'מוסדות לימוד', href: '/institutions' },
  { label: 'מי אנחנו', href: '/about' },
  { label: 'הרשימה שלי', href: '/app/saved-programs' },
];
const legalLinks = [
  { label: 'מדיניות פרטיות', href: '/privacy' },
  { label: 'תנאי שימוש', href: '/terms' },
  { label: 'הצהרת נגישות', href: '/accessibility' },
  { label: 'צור קשר', href: '/contact' },
];

function footerMarkup() {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(<SiteFooter />);
  return container;
}

describe('SiteFooter', () => {
  it('exports and renders the approved navigation and legal destinations in two named navs', () => {
    expect(FOOTER_NAV_LINKS).toEqual(navigationLinks);
    expect(FOOTER_LEGAL_LINKS).toEqual(legalLinks);
    const container = footerMarkup();
    expect(container.querySelector('footer')?.getAttribute('dir')).toBe('rtl');
    expect(container.querySelectorAll('nav')).toHaveLength(2);
    for (const [label, heading, links] of [
      ['ניווט בכותרת התחתונה', 'ניווט', navigationLinks],
      ['קישורים משפטיים', 'מידע משפטי', legalLinks],
    ] as const) {
      const nav = container.querySelector(`nav[aria-label="${label}"]`);
      expect(nav?.querySelector('h2')?.textContent).toBe(heading);
      expect(
        Array.from(nav?.querySelectorAll('a') ?? [], (a) => ({
          label: a.textContent,
          href: a.getAttribute('href'),
        })),
      ).toEqual(links);
    }
    expect(container.querySelectorAll('a')).toHaveLength(10);
    expect(container.querySelector('h1')).toBeNull();
  });

  it('renders the inverse wordmark, approved copy and isolated email/copyright without identifiers', () => {
    const container = footerMarkup();
    const home = container.querySelector('a[href="/"]');
    expect(home?.getAttribute('aria-label')).toBe('MyWay — עמוד הבית');
    const image = home?.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/brand/myway-wordmark-inverse.svg');
    expect(image?.getAttribute('alt')).toBe('MyWay');
    expect(image?.getAttribute('width')).toBe('606');
    expect(image?.getAttribute('height')).toBe('186');
    const email = container.querySelector('a[href="mailto:info@findmyway.co.il"]');
    expect(email?.querySelector('bdi[dir="ltr"]')?.textContent).toBe('info@findmyway.co.il');
    expect(container.textContent).toContain('יצירת קשר');
    expect(container.textContent).toContain(
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 32)
      'הציונים שלכם. התואר שלכם. הדרך שלכם.',
    );
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 31)
    expect(container.textContent).not.toContain(
      'התוצאות הן הערכה בלבד; ההחלטה על קבלה היא של המוסד',
    );
    expect(container.querySelector('p bdi[dir="ltr"]')?.textContent).toBe('© 2026 MyWay');
    expect(container.textContent).not.toMatch(/\d{9}/);
  });
});

it('removes the disclaimer paragraph and its exclusive flex spacing', () => {
  const footer = footerMarkup();
  const copyright = footer.querySelector('p bdi[dir="ltr"]')!.parentElement!;
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 31)
  expect(copyright.parentElement!.children).toHaveLength(1);
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 31)
  expect(copyright.parentElement!.className).not.toMatch(/gap-|justify-between/);
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 31)
  expect([...footer.querySelectorAll('p')].every((p) => p.textContent?.trim())).toBe(true);
});
