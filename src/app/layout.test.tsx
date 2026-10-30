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

describe('Hero 2.0 head assets', () => {
  it('sets theme colours and Twitter images while leaving home Open Graph to the file convention', async () => {
    const { metadata, viewport } = await import('./layout');
    const home = await import('./page');
    expect(viewport.themeColor).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
      { media: '(prefers-color-scheme: dark)', color: '#0C1D45' },
    ]);
    expect(metadata.manifest).toBe('/site.webmanifest');
    expect(metadata.openGraph).toMatchObject({
      images: [
        {
          url: '/opengraph-image.png',
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: 'MyWay — הדרך ללימודים שלכם מתחילה כאן.',
        },
      ],
    });
    expect(home.metadata.openGraph).not.toHaveProperty('images');
    for (const value of [metadata, home.metadata]) {
      expect(value.twitter).toMatchObject({
        card: 'summary_large_image',
        images: [
          {
            url: expect.stringContaining('/opengraph-image.png'),
            alt: 'MyWay — הדרך ללימודים שלכם מתחילה כאן.',
          },
        ],
      });
    }
  });
});

it('keeps Next file-convention app icons at the required intrinsic sizes', async () => {
  const { readFileSync } = await import('node:fs');
  for (const [path, size] of [
    ['src/app/icon.png', 512],
    ['src/app/apple-icon.png', 180],
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
    ['public/icon-512-maskable.png', 512],
  ] as const) {
    const bytes = readFileSync(path);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([size, size]);
  }
  const favicon = readFileSync('src/app/favicon.ico');
  expect(favicon.readUInt16LE(2)).toBe(1);
  expect(favicon.readUInt16LE(4)).toBe(3);
  expect([0, 1, 2].map((index) => favicon[6 + index * 16])).toEqual([16, 32, 48]);
  const og = readFileSync('src/app/opengraph-image.png');
  expect([og.readUInt32BE(16), og.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(readFileSync('src/app/opengraph-image.alt.txt', 'utf8')).toBe(
    'MyWay — הדרך ללימודים שלכם מתחילה כאן.',
  );
});
