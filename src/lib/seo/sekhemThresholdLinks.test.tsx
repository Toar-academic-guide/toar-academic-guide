// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

import { listCataloguePrograms, listCatalogueInstitutions } from '@/server/catalogue/queries';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';
import { programFaqPageLd } from './jsonLd';
import SekhemCalculatorLink from '@/components/seo/SekhemCalculatorLink';
import { canonicalProgramId } from './programAliases';
import ProgramPage from '@/app/programs/[programId]/page';

const FAQ_IDS = [
  'ariel_communication',
  'ariel_criminology',
  'ariel_economics',
  'ariel_health_systems',
  'ariel_psychology',
  'bgu_accounting',
  'bgu_business',
  'bgu_psychology',
  'biu_psychology',
  'haifa_accounting',
  'haifa_communication',
  'haifa_infosystems',
  'haifa_nursing',
  'haifa_politicalscience',
  'haifa_psychology',
  'haifa_sociology',
  'ruppin_cs',
  'tau_accounting',
  'tau_business',
  'tau_law',
];

// Independent rendered-copy oracle: a named composite followed by a cutoff.
// Do not call the production selector here: this must catch missing wording support.
const renderedThreshold =
  /(?:סכם|(?:ציון\s+)?מתואם|(?:ציון\s+)?מתאם|מצרף|ציון\s+(?:משולב|התאמה|קבלה(?:\s+משולב)?))\s*(?:(?:כמותי|הנדסי|הנדסה|ארכיטקטורה|לניהול|ניהול|מעל|לפחות|מינימלי|נדרש|קבלה|של)[:–-]?\s+){0,3}[:–-]?\s*(\d{2,4}(?:\.\d+)?)(?!\d)/g;

function containsRenderedThreshold(text: string) {
  return Array.from(text.matchAll(renderedThreshold)).some((match) => Number(match[1]) < 1900);
}

function unlinkedThresholds(rows: { id: string; text: string; linked: boolean }[]) {
  return rows
    .filter(({ text, linked }) => containsRenderedThreshold(text) && !linked)
    .map(({ id }) => id);
}

describe('published-threshold calculator links', () => {
  beforeEach(() => {
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms(),
      meta: {},
    });
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: getStaticCatalogueInstitutions(),
      meta: {},
    });
  });

  it('links every existing admission FAQ answer with a rendered threshold without changing their published text', async () => {
    const selected: string[] = [];
    const thresholds: string[] = [];
    for (const program of getStaticCataloguePrograms()) {
      const data = (await getPublicProgramPageData(program.id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const faq = programFaqPageLd(data, sources);
      if (!faq) continue;
      for (const entity of faq.mainEntity) {
        const answer = entity.acceptedAnswer;
        if (entity.name === 'מהם תנאי הקבלה למסלול?') {
          // Preserve the exact published answer for linked AND unlinked answers.
          expect(answer.text).toBe(sources[data.institutions[0].id].requirements.join(' '));
          if (containsRenderedThreshold(answer.text)) thresholds.push(program.id);
        }
        if ('potentialAction' in answer) {
          selected.push(program.id);
          expect(entity.name).toBe('מהם תנאי הקבלה למסלול?');
          expect(answer.text).toBe(sources[data.institutions[0].id].requirements.join(' '));
          expect(answer.potentialAction).toEqual({
            '@type': 'ViewAction',
            name: 'מחשבון סכם וסיכויי קבלה',
            target: 'https://findmyway.co.il/sekhem-calculator',
          });
          const html = renderToStaticMarkup(<SekhemCalculatorLink data={data} sources={sources} />);
          expect(html).toContain('href="/sekhem-calculator?program=');
        }
      }
    }
    expect(selected.sort()).toEqual(FAQ_IDS);
    expect(selected).toEqual(thresholds.sort());
    expect(selected).toHaveLength(20);
  });

  it('renders a contextual programme link only when a threshold is published', async () => {
    for (const [id, expected] of [
      ['haifa_psychology', true],
      ['ariel_nutrition', false],
      ['nutrition', true],
      ['ariel_economics', true],
      ['ruppin_marine_bio', true],
    ] as const) {
      const data = (await getPublicProgramPageData(id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const html = renderToStaticMarkup(<SekhemCalculatorLink data={data} sources={sources} />);
      if (expected) expect(html).toContain(`href="/sekhem-calculator?program=${id}"`);
      else expect(html).toBe('');
    }
  });

  it('links exactly every programme whose rendered requirements contain a composite cutoff', async () => {
    const rows = [];
    for (const program of getStaticCataloguePrograms()) {
      if (
        program.type !== 'academic' ||
        program.isListed === false ||
        program.id.startsWith('mon_') ||
        canonicalProgramId(program.id) !== program.id
      )
        continue;
      const html = renderToStaticMarkup(
        await ProgramPage({ params: Promise.resolve({ programId: program.id }) }),
      );
      const document = new DOMParser().parseFromString(html, 'text/html');
      const heading = Array.from(document.querySelectorAll('h2')).find(
        (node) => node.textContent === 'תנאי קבלה',
      );
      if (!heading) continue; // Subject hubs have no admission requirements section.
      const section = heading.parentElement!;
      rows.push({
        id: program.id,
        text: section.textContent ?? '',
        linked: !!section.querySelector(`a[href="/sekhem-calculator?program=${program.id}"]`),
      });
    }
    const linked = rows
      .filter((row) => row.linked)
      .map((row) => row.id)
      .sort();
    const thresholds = rows
      .filter((row) => containsRenderedThreshold(row.text))
      .map((row) => row.id)
      .sort();
    expect(unlinkedThresholds(rows)).toEqual([]);
    expect(linked).toEqual(thresholds);
    expect(linked).toHaveLength(50);
    expect(linked).toEqual(
      expect.arrayContaining([
        'criminology',
        'ariel_economics',
        'ariel_psychology',
        'ariel_communication',
        'ariel_criminology',
        'ariel_health_systems',
        'ruppin_cs',
        'ruppin_marine_bio',
        'nutrition',
      ]),
    );
    const nutrition = rows.find((row) => row.id === 'ariel_nutrition')!;
    expect(nutrition.text).toContain('ביולוגיה ו/או כימיה — יתרון');
    expect(nutrition.linked).toBe(false);
    expect(containsRenderedThreshold(nutrition.text)).toBe(false);
  });

  it('detects a future rendered threshold without a calculator link', () => {
    expect(
      unlinkedThresholds([
        { id: 'new_programme', text: 'ציון קבלה משולב 560', linked: false },
        {
          id: 'floor_only',
          text: 'פסיכומטרי 600; סכם = 0.5 × פסיכומטרי; לשנת 2026',
          linked: false,
        },
        { id: 'linked', text: 'ציון קבלה 106', linked: true },
      ]),
    ).toEqual(['new_programme']);
  });

  it('places the link beside the published requirements in the actual programme route', async () => {
    const html = renderToStaticMarkup(
      await ProgramPage({ params: Promise.resolve({ programId: 'haifa_psychology' }) }),
    );
    const document = new DOMParser().parseFromString(html, 'text/html');
    const heading = Array.from(document.querySelectorAll('h2')).find(
      (node) => node.textContent === 'תנאי קבלה',
    )!;
    const link = heading.parentElement!.querySelector(
      'a[href="/sekhem-calculator?program=haifa_psychology"]',
    );
    expect(link?.textContent).toBe('מחשבון סכם וסיכויי קבלה');
    expect(heading.parentElement!.textContent).toContain('650');
  });
});
