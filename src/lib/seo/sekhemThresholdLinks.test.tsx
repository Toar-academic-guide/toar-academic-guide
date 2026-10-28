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
import ProgramPage from '@/app/programs/[programId]/page';

const FAQ_IDS = [
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
];

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

  it('links exactly 11 existing admission FAQ answers without changing their published text', async () => {
    const selected: string[] = [];
    for (const program of getStaticCataloguePrograms()) {
      const data = (await getPublicProgramPageData(program.id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const faq = programFaqPageLd(data, sources);
      if (!faq) continue;
      for (const entity of faq.mainEntity) {
        const answer = entity.acceptedAnswer;
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
    expect(selected).toHaveLength(11);
  });

  it('renders a contextual programme link, and none for Ariel-only published thresholds', async () => {
    for (const [id, expected] of [
      ['haifa_psychology', true],
      ['nutrition', false],
    ] as const) {
      const data = (await getPublicProgramPageData(id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const html = renderToStaticMarkup(<SekhemCalculatorLink data={data} sources={sources} />);
      if (expected) expect(html).toContain(`href="/sekhem-calculator?program=${id}"`);
      else expect(html).toBe('');
    }
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
