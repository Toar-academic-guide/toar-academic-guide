// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import guide from '@/data/fineArtsGuide.json';
import { ArtHubLinks, FineArtsIntroduction, FineArtsFaq } from './FineArtsGuide';

it('renders every approved cell once, nine institutions and matching visible FAQ structured data', () => {
  const { container } = render(
    <>
      <FineArtsIntroduction />
      <FineArtsFaq />
    </>,
  );
  expect(container.querySelectorAll('[data-art-institution]')).toHaveLength(9);
  for (const row of guide.rows) {
    const element = container.querySelector(`[data-art-institution="${row.id}"]`)!;
    for (const key of ['programme', 'routes', 'exam', 'deadline'] as const) {
      expect(element.querySelector(`[data-art-cell="${key}"]`)?.textContent).toBe(row[key]);
    }
  }
  const ld = JSON.parse(
    container.querySelector('script[type="application/ld+json"]')!.textContent!,
  );
  expect(ld['@graph']).toHaveLength(1);
  expect(ld['@graph'][0]).toMatchObject({
    '@type': 'FAQPage',
    '@id': 'https://findmyway.co.il/programs/fine_arts#faq',
  });
  expect(ld['@graph'][0].mainEntity).toEqual(
    guide.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  );
  expect([...container.querySelectorAll('dd')].map((element) => element.textContent)).toEqual(
    guide.faq.map(({ answer }) => answer),
  );
  expect(
    [...container.querySelectorAll('a')].every((element) =>
      element.getAttribute('href')!.startsWith('/'),
    ),
  ).toBe(true);
  expect(container.textContent).not.toContain('מקור:');
  expect(container.querySelector('bdi[dir="ltr"]')?.textContent).toBe('4');
});

it('keeps art education identity while linking both other art hubs with the exact anchors', () => {
  render(<ArtHubLinks current="art_education" />);
  expect(screen.getByRole('link', { name: guide.title }).getAttribute('href')).toBe(
    '/programs/fine_arts',
  );
  expect(
    screen
      .getByRole('link', { name: 'לימודי אמנות והוראת אמנות (B.Ed.F.A.)' })
      .getAttribute('href'),
  ).toBe('/programs/art_teaching');
});
