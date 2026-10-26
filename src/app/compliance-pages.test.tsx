// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PrivacyPage, { metadata as privacyMetadata } from './privacy/page';
import TermsPage, { metadata as termsMetadata } from './terms/page';
import ContactPage, { metadata as contactMetadata } from './contact/page';
import AccessibilityPage, { metadata as accessibilityMetadata } from './accessibility/page';
import SiteFooter from '@/components/SiteFooter';

vi.mock('@/components/PublicNavBar', () => ({ default: () => null }));
vi.mock('@/components/WayBackdrop', () => ({ default: () => null }));

const pages = [
  {
    path: '/privacy',
    Page: PrivacyPage,
    metadata: privacyMetadata,
    title: 'מדיניות פרטיות – MyWay',
    headings: [
      '1. מי אנחנו',
      '4. למי אנחנו מעבירים מידע ולאיזו מטרה',
      '7. הזכויות שלך וביטול הסכמה',
    ],
  },
  {
    path: '/terms',
    Page: TermsPage,
    metadata: termsMetadata,
    title: 'תנאי שימוש – MyWay',
    headings: ['3. הערכה בלבד – ההחלטה בידי המוסד', '11. דין ושיפוט'],
  },
  {
    path: '/contact',
    Page: ContactPage,
    metadata: contactMetadata,
    title: 'יצירת קשר',
    headings: [],
  },
  {
    path: '/accessibility',
    Page: AccessibilityPage,
    metadata: accessibilityMetadata,
    title: 'הצהרת נגישות',
    headings: ['מה עשינו באתר', 'מגבלות ידועות', 'נתקלתם בבעיה?'],
  },
];

function markup(element: ReactNode) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(element);
  return container;
}

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function sourceText(text: string) {
  // Source "- " list markers render as literal "• " bullets inside semantic <li> elements.
  return normalize(text.replace(/^- /gm, '• '));
}

function pageText(container: HTMLElement) {
  return normalize(
    Array.from(container.querySelectorAll('h1, h2, p, li'), (node) => node.textContent).join(' '),
  );
}

describe('compliance pages', () => {
  for (const { path, Page, metadata, title, headings } of pages) {
    it(`${path} has one RTL main, approved headings, email and canonical metadata`, () => {
      const container = markup(<Page />);
      expect(container.querySelectorAll('main')).toHaveLength(1);
      expect(container.querySelector('main')?.id).toBe('main-content');
      expect(container.querySelector('main')?.getAttribute('dir')).toBe('rtl');
      expect(container.querySelector('main')?.getAttribute('tabindex')).toBe('-1');
      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelector('h1')?.textContent).toBe(title);
      const sectionTitles = Array.from(
        container.querySelectorAll('h2'),
        (node) => node.textContent,
      );
      expect(sectionTitles).toEqual(expect.arrayContaining(headings));
      const emails = container.querySelectorAll('a[href="mailto:info@findmyway.co.il"]');
      expect(emails.length).toBeGreaterThan(0);
      for (const email of emails) expect(email.textContent).toBe('info@findmyway.co.il');
      expect(container.textContent).not.toMatch(/\d{9}/);
      expect(container.textContent).toContain(
        path === '/accessibility' ? 'עמית מליחי' : 'עמית מליחי (עוסק פטור)',
      );
      expect(metadata.title).toBeTruthy();
      expect(metadata.alternates?.canonical).toBe(path);
      expect(container.querySelector('form')).toBeNull();
    });
  }

  for (const { Page, path } of pages.filter(({ path }) => path !== '/contact')) {
    it(`${path} preserves the entire approved copy`, () => {
      const source = readFileSync(`src/content/legal${path}.he.txt`, 'utf8');
      expect(pageText(markup(<Page />))).toBe(sourceText(source));
    });
  }

  for (const { Page, path } of pages.slice(0, 2)) {
    it(`${path} preserves the entire approved copy, including numbering`, () => {
      const source = readFileSync(`src/content/legal${path}.he.txt`, 'utf8');
      const container = markup(<Page />);
      expect(pageText(container)).toBe(normalize(source));
      const update = container.querySelector('main p');
      expect(update?.textContent).toBe(source.split('\n')[1]);
      expect(update?.className).toContain('text-sm');
      expect(update?.className).toContain('text-[var(--text-muted)]');
      const expectedHeadings = source.split('\n').filter((line) => /^\d+\.\s/.test(line));
      expect(Array.from(container.querySelectorAll('h2'), (node) => node.textContent)).toEqual(
        expectedHeadings,
      );
      expect(Array.from(container.querySelectorAll('li'), (node) => node.textContent)).toEqual(
        source.split('\n').filter((line) => line.startsWith('• ')),
      );
    });
  }

  it('terms use the business name and email without an address placeholder', () => {
    const text = pageText(markup(<TermsPage />));
    expect(text).not.toContain('[כתובת]');
    expect(text).toContain('עמית מליחי (עוסק פטור)');
    expect(text).toContain('info@findmyway.co.il');
    expect(text).not.toMatch(/\d{9}/);
  });

  it('privacy contains the operator address without placeholders or an identity number', () => {
    const text = pageText(markup(<PrivacyPage />));
    expect(text).toContain('שדרות יהודית 20, תל אביב 6701622');
    expect(text).not.toContain('[כתובת]');
    expect(text).not.toMatch(/\d{9}/);
  });

  it.each([
    ['/terms', TermsPage],
    ['/contact', ContactPage],
    ['/accessibility', AccessibilityPage],
    ['SiteFooter', SiteFooter],
  ])('%s does not expose the privacy operator address or an identity number', (_, Component) => {
    const text = markup(<Component />).textContent;
    expect(text).not.toContain('שדרות יהודית');
    expect(text).not.toContain('6701622');
    expect(text).not.toMatch(/\d{9}/);
  });

  it('links the exact policy path and government URL without changing their text', () => {
    const policyLink = markup(<TermsPage />).querySelector('a[href="/privacy"]');
    expect(policyLink?.textContent).toBe('/privacy');
    const url = 'https://www.gov.il/he/departments/the_privacy_protection_authority';
    const governmentLink = markup(<PrivacyPage />).querySelector(`a[href="${url}"]`);
    expect(governmentLink?.textContent).toBe(url);
    expect(governmentLink?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('contact contains only its approved body strings', () => {
    const contact = markup(<ContactPage />);
    expect(pageText(contact)).toBe('יצירת קשר עמית מליחי (עוסק פטור) info@findmyway.co.il');
    expect(contact.querySelector('a bdi')?.getAttribute('dir')).toBe('ltr');
  });

  it('accessibility renders the approved statement with a list and email contact', () => {
    const container = markup(<AccessibilityPage />);
    expect(Array.from(container.querySelectorAll('h2'), (node) => node.textContent)).toEqual([
      'מה עשינו באתר',
      'מגבלות ידועות',
      'נתקלתם בבעיה?',
    ]);
    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('ul > li')).toHaveLength(5);
    const source = readFileSync('src/content/legal/accessibility.he.txt', 'utf8');
    expect(Array.from(container.querySelectorAll('li'), (node) => node.textContent)).toEqual(
      source
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => '• ' + line.slice(2)),
    );
    const email = container.querySelector('a[href="mailto:info@findmyway.co.il"]');
    expect(email?.textContent).toBe('info@findmyway.co.il');
    expect(email?.querySelector('bdi')?.getAttribute('dir')).toBe('ltr');
    const text = pageText(container);
    expect(text).not.toContain('[');
    expect(text).not.toContain(']');
    expect(text).not.toMatch(/0\d[\d-]{7,}/);
    expect(text).not.toMatch(/\+972/);
    expect(text).not.toMatch(/\d{9}/);
  });
});
