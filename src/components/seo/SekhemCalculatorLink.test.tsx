// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
  type PublicProgramPageData,
} from '@/lib/publicCataloguePages';
import { hasPublishedCompositeThresholds } from '@/lib/publishedCompositeThresholds';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { calculatorOfferings, loadSekhemCalculatorOfferings } from '@/lib/sekhemCalculatorSupport';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import SekhemCalculatorLink from './SekhemCalculatorLink';

async function databaseCsPages() {
  const programs = getStaticCataloguePrograms();
  const haifa = getStaticCatalogueInstitutions().find((row) => row.id === 'haifa')!;
  const specific = programs.find((row) => row.id === 'haifa_cs')!;
  const generic = {
    ...programs.find((row) => row.id === 'cs')!,
    institutionId: haifa.id,
    admissionRequirements: [],
    institutionDetails: [],
    thresholds: { haifa: 700 },
    linkedInstitutionIds: [haifa.id],
  };
  vi.mocked(listCataloguePrograms).mockResolvedValue({
    data: [generic, specific],
    meta: { catalogueSource: 'database' },
  });
  vi.mocked(listCatalogueInstitutions).mockResolvedValue({
    data: [haifa],
    meta: { catalogueSource: 'database' },
  });
  const page = (await getPublicProgramPageData('cs'))!;
  const data: PublicProgramPageData = { ...page, institutions: [haifa] };
  const sources = await getPublicProgramRequirementSources(data);
  const offerings = calculatorOfferings([generic, specific], [haifa], new Set(['cs']));
  expect(data.program.id).toBe('cs');
  expect(sources.haifa.program.id).toBe('haifa_cs');
  expect(sources.haifa.requirements).toContain(
    'סכם 700 לפחות (תשפ״ז); ציונים 680–699 נמצאים בטווח ההמתנה ונבחנים בוועדת הקבלה החוגית.',
  );
  expect(offerings.some((row) => row.programId === 'haifa_cs')).toBe(true);
  expect(offerings.some((row) => row.programId === 'cs')).toBe(false);
  return { data, sources, offerings };
}

describe('SekhemCalculatorLink offered programme identity', () => {
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

  it('omits the CTA on a generic CS page without its own offering', async () => {
    const { data, sources, offerings } = await databaseCsPages();
    expect(hasPublishedCompositeThresholds(data, sources, offerings)).toBe(true);
    const html = renderToStaticMarkup(
      <SekhemCalculatorLink data={data} sources={sources} offerings={offerings} />,
    );
    expect(html).toBe('');
  });

  it('does not treat an offering source alias as an offered programme ID', async () => {
    const { data, sources, offerings } = await databaseCsPages();
    const withSourceAlias = offerings.map((row) => ({
      ...row,
      sourceProgramIds: ['cs', 'haifa_cs'],
    }));
    const html = renderToStaticMarkup(
      <SekhemCalculatorLink data={data} sources={sources} offerings={withSourceAlias} />,
    );
    expect(html).toBe('');
  });

  it('omits the CTA when offerings are omitted', async () => {
    const { data, sources } = await databaseCsPages();
    expect(hasPublishedCompositeThresholds(data, sources)).toBe(true);
    const html = renderToStaticMarkup(<SekhemCalculatorLink data={data} sources={sources} />);
    expect(html).toBe('');
  });

  it('keeps the Haifa CS own-page calculator link with its exact offered ID', async () => {
    const { offerings } = await databaseCsPages();
    const data = (await getPublicProgramPageData('haifa_cs'))!;
    const sources = await getPublicProgramRequirementSources(data);
    expect(hasPublishedCompositeThresholds(data, sources, offerings)).toBe(true);
    const html = renderToStaticMarkup(
      <SekhemCalculatorLink data={data} sources={sources} offerings={offerings} />,
    );
    const link = new DOMParser().parseFromString(html, 'text/html').querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/sekhem-calculator?program=haifa_cs');
    expect(link.textContent).toBe('חשבו סכם לתוכנית הזו');
  });

  it('emits only working calculator destinations across the real static catalogue', async () => {
    const offerings = await loadSekhemCalculatorOfferings();
    const linked: string[] = [];

    for (const program of getStaticCataloguePrograms()) {
      const data = (await getPublicProgramPageData(program.id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const passes =
        hasPublishedCompositeThresholds(data, sources, offerings) &&
        offerings.some((row) => row.programId === canonicalProgramId(data.program.id));
      const html = renderToStaticMarkup(
        <SekhemCalculatorLink data={data} sources={sources} offerings={offerings} />,
      );
      expect(Boolean(html), program.id).toBe(passes);
      if (!passes) continue;
      const link = new DOMParser().parseFromString(html, 'text/html').querySelector('a')!;
      const href = link.getAttribute('href')!;
      const requestedId = canonicalProgramId(data.program.id);
      expect(href, program.id).toBe(
        `/sekhem-calculator?program=${encodeURIComponent(requestedId)}`,
      );
      linked.push(data.program.id);
    }
    expect(linked).toContain('haifa_cs');
    expect(linked).not.toContain('cs');
  });
});
