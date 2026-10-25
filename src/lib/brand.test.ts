import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file));
const pngSize = (file: string) => {
  const data = read(file);
  expect(data.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
};

describe('shipping brand assets', () => {
  it('serves a valid MyWay manifest with existing correctly sized icons', () => {
    const manifest = JSON.parse(read('public/site.webmanifest').toString());
    expect(manifest).toMatchObject({
      name: 'MyWay',
      short_name: 'MyWay',
      theme_color: '#698AED',
      start_url: '/',
      display: 'standalone',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    });
    for (const icon of manifest.icons) {
      expect(pngSize(`public${icon.src}`)).toBe(icon.sizes);
    }
    expect(pngSize('src/app/apple-icon.png')).toBe('180x180');
    expect(pngSize('src/app/icon.png')).toBe('512x512');
    expect(pngSize('public/brand/myway-wordmark-1200.png')).toBe('1200x368');
  });

  it('includes separate 16, 32 and 48px favicon frames', () => {
    const ico = read('src/app/favicon.ico');
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    const sizes = Array.from({ length: 3 }, (_, index) => {
      const offset = 6 + index * 16;
      return `${ico[offset]}x${ico[offset + 1]}`;
    });
    expect(sizes).toEqual(['16x16', '32x32', '48x48']);
  });
});
