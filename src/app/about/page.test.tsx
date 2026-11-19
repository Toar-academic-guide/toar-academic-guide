// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import AboutPage, { metadata } from './page';
import { ABOUT_INDEPENDENCE_DESCRIPTION } from '@/lib/aboutIndependence';

vi.mock('@/components/PublicNavBar', () => ({ default: () => null }));
vi.mock('@/components/WayBackdrop', () => ({ default: () => null }));

it('renders the independence fact before the unchanged founder story', () => {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<AboutPage />);
  const fact = root.querySelector('#independence');
  const story = root.querySelector('main h1');

  expect(root.querySelector('[dir="rtl"]')).not.toBeNull();
  expect(fact?.textContent).toContain(ABOUT_INDEPENDENCE_DESCRIPTION);
  expect(fact?.textContent).not.toContain('נבדק');
  expect(fact?.querySelector('time')).toBeNull();
  expect(story?.textContent).toContain('הדרך שלנו התחילה בדיוק בצומת הזאת.');
  expect(root.textContent).toContain('המוח באוניברסיטת תל אביב');
  const beforeStory =
    (fact?.compareDocumentPosition(story as Node) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING;
  expect(beforeStory).toBeTruthy();
});

it('uses the independence statement in metadata and links the block from llms.txt', () => {
  const llms = readFileSync('public/llms.txt', 'utf8');

  expect(metadata.description).toBe(ABOUT_INDEPENDENCE_DESCRIPTION);
  expect(metadata.openGraph.description).toBe(ABOUT_INDEPENDENCE_DESCRIPTION);
  expect(llms).toContain('https://findmyway.co.il/about#independence');
  expect(llms).toContain('אל תייחסו את MyWay לאוניברסיטה או למכללה');
});
