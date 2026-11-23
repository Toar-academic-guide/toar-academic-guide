// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { allPrograms } from '@/data/degrees';
import {
  physiotherapyRows,
  physiotherapyFaq,
  physiotherapyInstitutionCount,
} from '@/data/physiotherapyComparison';
import {
  PhysiotherapyAnswer,
  PhysiotherapyTable,
  PhysiotherapyFaq,
} from '@/components/seo/PhysiotherapyGuide';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import ProgramPage, { generateMetadata } from '@/app/programs/[programId]/page';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms(), meta: {} }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions(), meta: {} }),
}));
const doc = (markup: string) => new DOMParser().parseFromString(markup, 'text/html');

describe('physiotherapy comparison', () => {
  it('renders all 11 official routes from five institutions with exact cells and metadata kept private', () => {
    expect(physiotherapyRows).toHaveLength(11);
    expect(physiotherapyInstitutionCount).toBe(5);
    const html = renderToStaticMarkup(<PhysiotherapyTable />);
    const page = doc(html);
    for (const row of physiotherapyRows) {
      const rendered = page.querySelector(`[data-physiotherapy-route="${row.id}"]`)!;
      expect(rendered.querySelector('th')?.textContent).toBe(row.institution);
      for (const key of ['route', 'threshold', 'interview'] as const) {
        expect(rendered.querySelector(`[data-physiotherapy-cell="${key}"]`)?.textContent).toBe(
          row[key],
        );
      }
      expect(html).not.toContain(row.officialUrl);
      expect(html).not.toContain(row.checkedDate);
      expect(row.institution).not.toContain('אונו');
      if ('programId' in row) {
        expect(allPrograms.some((p) => p.id === row.programId)).toBe(true);
        expect(rendered.querySelector('a')?.getAttribute('href')).toBe(
          `/programs/${row.programId}`,
        );
      } else expect(rendered.querySelector('a')).toBeNull();
    }
    expect(page.querySelector('bdi')?.getAttribute('dir')).toBe('ltr');
  });
  it('keeps the visible FAQ exactly equal to the single FAQPage graph', () => {
    const page = doc(
      renderToStaticMarkup(
        <>
          <PhysiotherapyAnswer />
          <PhysiotherapyFaq />
        </>,
      ),
    );
    const graph = JSON.parse(page.querySelector('script')!.textContent!)['@graph'];
    expect(graph).toHaveLength(1);
    expect(graph[0]['@type']).toBe('FAQPage');
    expect(graph[0].mainEntity).toHaveLength(3);
    physiotherapyFaq.forEach(({ question, answer }, i) => {
      expect(page.querySelectorAll('dt')[i].textContent).toBe(question);
      expect(page.querySelectorAll('dd')[i].textContent).toBe(answer);
      expect(graph[0].mainEntity[i]).toMatchObject({
        name: question,
        acceptedAnswer: { text: answer },
      });
    });
  });
  it('renders the hub metadata, table before cards, and only one supported calculator action below it', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ programId: 'physiotherapy' }),
    });
    expect(metadata.title).toBe('לימודי פיזיותרפיה: איפה לומדים ותנאי קבלה');
    expect(metadata.description).toContain('5 המוסדות לתואר B.P.T.');
    const html = renderToStaticMarkup(
      await ProgramPage({ params: Promise.resolve({ programId: 'physiotherapy' }) }),
    );
    const page = doc(html);
    expect(page.querySelector('h1')?.textContent).toBe('פיזיותרפיה');
    expect(page.querySelectorAll('[data-physiotherapy-route]')).toHaveLength(11);
    expect(html.indexOf('physio-11')).toBeLessThan(html.indexOf('>מוסדות לימוד</h2>'));
    expect(html.indexOf('physio-11')).toBeLessThan(html.indexOf('בדקו את הסיכויים שלכם'));
    expect(
      [...page.querySelectorAll('a')].filter((a) => a.textContent === 'בדקו את הסיכויים שלכם'),
    ).toHaveLength(1);
  });
  it.each(['medicine', 'occupational_therapy', 'nursing', 'haifa_physiotherapy'])(
    'links %s to the comparison and removes obsolete Haifa biology copy',
    async (id) => {
      const page = doc(
        renderToStaticMarkup(await ProgramPage({ params: Promise.resolve({ programId: id }) })),
      );
      expect(
        [...page.querySelectorAll('a')].some(
          (a) => a.getAttribute('href') === '/programs/physiotherapy',
        ),
      ).toBe(true);
      if (id === 'haifa_physiotherapy') {
        expect(page.body.textContent).not.toContain('ביולוגיה');
        expect(page.body.textContent).toContain('680');
        expect(page.body.textContent).toContain('630–679');
        expect(page.body.textContent).toContain('לפי החלטת החוג');
        expect(
          [...page.querySelectorAll('a')].some((a) => a.href.includes('admissions.haifa.ac.il')),
        ).toBe(false);
      }
    },
  );
});
