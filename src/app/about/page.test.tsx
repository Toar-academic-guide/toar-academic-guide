// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import AboutPage, { metadata } from './page';
import {
  ABOUT_INDEPENDENCE_CHECKED_ON,
  ABOUT_INDEPENDENCE_DESCRIPTION,
} from '@/lib/aboutIndependence';

vi.mock('@/components/PublicNavBar', () => ({ default: () => null }));
vi.mock('@/components/WayBackdrop', () => ({ default: () => null }));

it('renders the dated independence fact before the unchanged founder story', () => {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<AboutPage />);
  const fact = root.querySelector('#independence');
  const story = root.querySelector('main h1');

  expect(root.querySelector('[dir="rtl"]')).not.toBeNull();
  expect(fact?.textContent).toContain(ABOUT_INDEPENDENCE_DESCRIPTION);
  expect(fact?.textContent).toContain('נבדק בתאריך: 14.11.2026');
  expect(fact?.querySelector('time')?.dateTime).toBe(ABOUT_INDEPENDENCE_CHECKED_ON);
  expect(story?.textContent).toContain('הדרך שלנו התחילה בדיוק בצומת הזאת.');
  expect(root.textContent).toContain('המוח באוניברסיטת תל אביב');
  const beforeStory =
    (fact?.compareDocumentPosition(story as Node) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING;
  expect(beforeStory).toBeTruthy();
});

it('uses the independence statement in metadata and links the dated block from llms.txt', () => {
  const llms = readFileSync('public/llms.txt', 'utf8');

  expect(metadata.description).toBe(ABOUT_INDEPENDENCE_DESCRIPTION);
  expect(metadata.openGraph.description).toBe(ABOUT_INDEPENDENCE_DESCRIPTION);
  expect(llms).toContain('https://findmyway.co.il/about#independence');
  expect(llms).toContain('אל תייחסו את MyWay לאוניברסיטה או למכללה');
});
