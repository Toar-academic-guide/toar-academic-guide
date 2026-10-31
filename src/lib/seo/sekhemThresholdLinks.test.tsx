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
import * as jsonLd from './jsonLd';
import SekhemCalculatorLink from '@/components/seo/SekhemCalculatorLink';
import { canonicalProgramId } from './programAliases';
import {
  calculatorOfferings,
  loadSekhemCalculatorOfferings,
  sekhemPairSupport,
} from '@/lib/sekhemCalculatorSupport';
import ProgramPage from '@/app/programs/[programId]/page';

// Independent rendered-copy oracle: a named composite followed by a cutoff.
// Do not call the production selector here: this must catch missing wording support.
const renderedThreshold =
  /(?:באפיק\s+המשולב\s+נדרש\s+ציון|סכם|(?:ציון\s+)?מתואם|(?:ציון\s+)?מתאם|מצרף|ציון\s+(?:משולב|התאמה|קבלה(?:\s+משולב)?))\s*(?:(?:כמותי|הנדסי|הנדסה|ארכיטקטורה|לניהול|ניהול|מעל|לפחות|מינימלי|נדרש|קבלה|של)[:–-]?\s+){0,3}[:–-]?\s*(\d{2,4}(?:\.\d+)?)(?!\d)/g;

// Requirement tiles render the numeric value before its composite label.
const renderedTileThreshold =
  /(\d{2,4}(?:\.\d+)?)\s*(?:סכם|ציון\s+(?:מתואם|מתאם|משולב|התאמה|קבלה))(?:\s|$)/g;

function containsRenderedThreshold(text: string) {
  return [renderedThreshold, renderedTileThreshold].some((pattern) =>
    Array.from(text.matchAll(pattern)).some((match) => Number(match[1]) < 1900),
  );
}

function renderedRequirementText(section: Element) {
  const walker = section.ownerDocument.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  const text = [];
  while (walker.nextNode()) text.push(walker.currentNode.textContent);
  return text.join(' ');
}

function unlinkedThresholds(
  rows: { id: string; text: string; linked: boolean; supported?: boolean }[],
) {
  return rows
    .filter(
      ({ text, linked, supported }) =>
        supported !== false && containsRenderedThreshold(text) && !linked,
    )
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

  it('keeps FAQPage markup and FAQ calculator actions removed', async () => {
    expect(jsonLd).not.toHaveProperty('programFaqPageLd');
    const html = renderToStaticMarkup(
      await ProgramPage({ params: Promise.resolve({ programId: 'tau_law' }) }),
    );
    const document = new DOMParser().parseFromString(html, 'text/html');
    const structured = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => script.textContent)
      .join('');
    expect(structured).not.toContain('FAQPage');
    expect(structured).not.toContain('potentialAction');
    expect(html).toContain('href="/sekhem-calculator?program=tau_law"');
  });

  it('renders a contextual programme link only when a threshold is published', async () => {
    const offerings = await loadSekhemCalculatorOfferings();
    for (const [id, expected] of [
      ['haifa_nursing', true],
      ['ariel_nutrition', false],
      ['nutrition', true],
      ['ariel_economics', false],
      ['ruppin_marine_bio', false],
    ] as const) {
      const data = (await getPublicProgramPageData(id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const html = renderToStaticMarkup(
        <SekhemCalculatorLink data={data} sources={sources} offerings={offerings} />,
      );
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
        text: renderedRequirementText(section),
        supported: Object.entries(
          await getPublicProgramRequirementSources((await getPublicProgramPageData(program.id))!),
        ).some(
          ([id, source]) =>
            ['score', 'gate'].includes(sekhemPairSupport(source.program, id) ?? '') &&
            containsRenderedThreshold(source.requirements.join(' ')),
        ),
        linked: !!section.querySelector(
          `a[href="/sekhem-calculator?program=${program.id}"], a[href="/sekhem-calculator"]`,
        ),
      });
    }
    const linked = rows
      .filter((row) => row.linked)
      .map((row) => row.id)
      .sort();
    const thresholds = rows
      .filter((row) => row.supported && containsRenderedThreshold(row.text))
      .map((row) => row.id)
      .sort();
    expect(unlinkedThresholds(rows)).toEqual([]);
    expect(linked).toEqual(thresholds);
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    // haifa_cs added: official Haifa 3210 סכם 700 (תשפ״ז), approved by CEO 2026-10-30.
    expect(linked).toHaveLength(42);
    expect(linked).toEqual(
      expect.arrayContaining([
        'haifa_infosystems',
        'nutrition',
        'pharmacy',
        'huji_accounting',
        'huji_business',
        'huji_law',
      ]),
    );
    expect(linked.filter((id) => id.startsWith('ariel_') || id.startsWith('ruppin_'))).toEqual([]);
    const nutrition = rows.find((row) => row.id === 'ariel_nutrition')!;
    expect(nutrition.text).toContain('ביולוגיה ו/או כימיה — יתרון');
    expect(nutrition.linked).toBe(false);
    expect(containsRenderedThreshold(nutrition.text)).toBe(false);
  }, 15_000);

  it('does not link a public legacy programme absent from the active evaluator catalogue', async () => {
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms().filter((program) => program.id !== 'haifa_nursing'),
      meta: {},
    });
    const html = renderToStaticMarkup(
      await ProgramPage({ params: Promise.resolve({ programId: 'haifa_nursing' }) }),
    );
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('a[href="/sekhem-calculator?program=haifa_nursing"]')).toBeNull();
    const faqScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => script.textContent)
      .join('');
    expect(faqScripts).not.toContain('potentialAction');
    expect(faqScripts).not.toContain('FAQPage');
  });

  it('every linked source maps to the same supported calculator offerings', async () => {
    const offerings = calculatorOfferings(
      getStaticCataloguePrograms(),
      getStaticCatalogueInstitutions(),
    );
    for (const program of getStaticCataloguePrograms()) {
      const data = (await getPublicProgramPageData(program.id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const html = renderToStaticMarkup(<SekhemCalculatorLink data={data} sources={sources} />);
      if (!html) continue;
      expect(
        Object.entries(sources).some(
          ([id, source]) =>
            ['score', 'gate'].includes(sekhemPairSupport(source.program, id) ?? '') &&
            offerings.some(
              (offering) =>
                offering.institutionId === id &&
                (offering.programId === source.program.id ||
                  offering.programName === source.program.name),
            ),
        ),
      ).toBe(true);
    }
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
        { id: 'outside-calculator', text: 'ציון קבלה 580', linked: false, supported: false },
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
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    expect(link).not.toBeNull();
    expect(heading.parentElement!.textContent).toContain('650');
  });
});
