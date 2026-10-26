// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RootLayout from './layout';

vi.mock('server-only', () => ({}));
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/components/SiteFooter', () => ({
  default: () => <footer>Existing footer</footer>,
}));
vi.mock('@/components/seo/JsonLd', () => ({ default: () => null }));
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));

describe('RootLayout skip link', () => {
  it('renders the skip link as the first body element without adding a main landmark', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main>Page content</main>
      </RootLayout>,
    );
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const first = doc.body.firstElementChild;
    expect(first?.tagName).toBe('A');
    expect(first?.getAttribute('href')).toBe('#main-content');
    expect(first?.textContent).toBe('דלג לתוכן הראשי');
    expect(first?.getAttribute('dir')).toBe('rtl');
    expect(doc.querySelectorAll('main')).toHaveLength(1);
    expect(doc.querySelector('footer')?.textContent).toBe('Existing footer');
  });
});
