import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from './catalogueStatic';
import { dentistryFaq, dentistryProgrammes } from '@/data/degrees/dentistry';
import ProgramPage, { generateMetadata } from '@/app/programs/[programId]/page';
import { getPublicSubjectHub } from './publicCatalogueLinks';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import sitemap from '@/app/sitemap';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(async () => ({
    data: getStaticCataloguePrograms(),
    meta: { source: 'static' },
  })),
  listCatalogueInstitutions: vi.fn(async () => ({
    data: getStaticCatalogueInstitutions(),
    meta: { source: 'static' },
  })),
}));
vi.mock('@/db', () => ({
  getDb: () => {
    throw new Error('No live database in dentistry tests');
  },
}));

const page = (programId: string) => ProgramPage({ params: Promise.resolve({ programId }) });

describe('dentistry public catalogue', () => {
  it('serves the two university records and keeps medicine MD-only', async () => {
    expect(dentistryProgrammes.map((p) => [p.id, p.institutionId, p.awardedCredential])).toEqual([
      ['huji_dentistry', 'huji', 'D.M.D.'],
      ['tau_dentistry', 'tau', 'D.M.D.'],
    ]);
    const hub = await getPublicSubjectHub('dentistry');
    expect(hub?.hub.programs.map((p) => p.id).sort()).toEqual(['huji_dentistry', 'tau_dentistry']);
    const medicine = await getPublicSubjectHub('medicine');
    expect(medicine?.hub.programs.some((p) => p.id.endsWith('_dentistry')) ?? false).toBe(false);
    const html = renderToStaticMarkup(await page('medicine'));
    expect(html).toContain('href="/programs/dentistry"');
    expect(html).not.toContain('href="/programs/huji_dentistry"');
    expect(html).not.toContain('href="/programs/tau_dentistry"');
  });

  it('renders historical stages, unpublished next-intake dates and exact FAQ schema', async () => {
    const html = renderToStaticMarkup(await page('dentistry'));
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, '');
    expect(html.match(/<tr/g)).toHaveLength(3);
    for (const value of [
      '640',
      '120',
      '23.000',
      '12.6.2026',
      '14–16.7.2026',
      '19.6.2026',
      '75%',
      '25%',
      '70%',
      '15%',
      '150',
      '80%',
      'תשפ״ז',
      'תשפ״ח',
      'טרם פורסם',
    ])
      expect(visible).toContain(value);
    expect(visible).not.toMatch(/מקור|עודכן|נבדק|https?:/);
    expect(html).not.toMatch(/href="https?:/);
    expect(html).not.toContain('href="/sekhem-calculator');
    expect(html).toContain('href="/programs/medicine"');
    const schema = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]);
    expect(schema['@graph'][0].mainEntity).toEqual(
      dentistryFaq.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    );
    for (const { question, answer } of dentistryFaq) {
      expect(visible).toContain(question);
      expect(visible).toContain(answer);
    }
  });

  it('indexes hub and both records with authored dates and a canonical', async () => {
    const entries = await sitemap();
    for (const id of ['dentistry', 'huji_dentistry', 'tau_dentistry']) {
      expect(entries.filter((e) => e.url.endsWith(`/programs/${id}`))).toHaveLength(1);
      expect(entries.find((e) => e.url.endsWith(`/programs/${id}`))?.lastModified).toBe(
        '2026-11-27',
      );
    }
    expect(
      (await generateMetadata({ params: Promise.resolve({ programId: 'dentistry' }) })).alternates
        ?.canonical,
    ).toBe('/programs/dentistry');
  });

  it.each(['huji_dentistry', 'tau_dentistry'])(
    'does not turn historical requirements into eligibility for %s',
    async (id) => {
      const program = getStaticCataloguePrograms().find((p) => p.id === id)!;
      const fetcher = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('No official calculator call expected'));
      const report = await evaluateAdmissionsForProgram({
        program,
        institutions: getStaticCatalogueInstitutions(),
        input: { degreeId: id, bagrut: 120, psychometric: 800 },
        now: new Date('2026-11-27T12:00:00Z'),
        freshnessStatesBySourceId: new Map(),
        fetcher,
      });
      expect(report.results).toHaveLength(1);
      expect(report.results[0]).toMatchObject({
        capability: 'unsupported',
        decision: 'unknown',
      });
      expect(report.results[0].explanation).not.toMatch(/אין צורך בבגרות|אין צורך בפסיכומטרי/);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
