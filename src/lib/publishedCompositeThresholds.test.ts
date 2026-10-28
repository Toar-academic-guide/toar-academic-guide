import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';
import {
  hasPublishedCompositeThreshold,
  hasPublishedCompositeThresholds,
} from './publishedCompositeThresholds';

export const STATIC_THRESHOLD_PAGE_IDS = [
  'accounting',
  'afeka_biomedical',
  'architecture',
  'ariel_communication',
  'ariel_criminology',
  'ariel_economics',
  'ariel_health_systems',
  'ariel_psychology',
  'bgu_accounting',
  'bgu_business',
  'bgu_psychology',
  'biu_psychology',
  'business',
  'communication',
  'criminology',
  'cs',
  'datascience',
  'economics',
  'education',
  'ee',
  'haifa_accounting',
  'haifa_communication',
  'haifa_infosystems',
  'haifa_nursing',
  'haifa_politicalscience',
  'haifa_psychology',
  'haifa_sociology',
  'law',
  'me',
  'nursing',
  'nutrition',
  'occupational_therapy',
  'physiotherapy',
  'political_science',
  'psychology',
  'reichman_business',
  'reichman_cs',
  'reichman_economics',
  'reichman_law',
  'reichman_psychology',
  'ruppin_cs',
  'ruppin_marine_bio',
  'tau_accounting',
  'tau_business',
  'tau_law',
  'technion_ee',
  'technion_me',
  'tlvyaffo_business',
  'tlvyaffo_cs',
  'tlvyaffo_nursing',
];

describe('published composite threshold selector', () => {
  it('selects the 50 static pages from the same resolved requirements the page renders', async () => {
    const programs = getStaticCataloguePrograms();
    vi.mocked(listCataloguePrograms).mockResolvedValue({ data: programs, meta: {} });
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: getStaticCatalogueInstitutions(),
      meta: {},
    });
    const selected = await Promise.all(
      programs.map(async ({ id }) => {
        const data = (await getPublicProgramPageData(id))!;
        const sources = await getPublicProgramRequirementSources(data);
        return hasPublishedCompositeThresholds(data, sources) ? id : null;
      }),
    );
    expect(selected.filter(Boolean).sort()).toEqual(STATIC_THRESHOLD_PAGE_IDS);
    expect(STATIC_THRESHOLD_PAGE_IDS).toHaveLength(50);
  });

  it.each([
    'סכם 650 לפחות',
    'סכם כמותי 620',
    'סכם הנדסה 720',
    'סכם מעל 180',
    'ציון מתואם 705 ומעלה',
    'ציון מתאם 600',
    'ציון התאמה לניהול 610',
    'ציון משולב 515',
    'ציון קבלה משולב 560',
    'ציון קבלה 106',
    'מצרף 620',
    'בחורף תשפ"ז: סכם 91.5',
  ])('recognizes a published threshold: %s', (text) => {
    expect(hasPublishedCompositeThreshold([text], 'tau')).toBe(true);
  });

  it.each([
    'פסיכומטרי 650 לפחות',
    'ממוצע בגרות 100 ומעלה',
    'סכם = 0.5 × פסיכומטרי',
    'ציון משולב = (פסיכומטרי + (ממוצע בגרות − 30) × 10) ÷ 2',
    'סכם לפי המחשבון הרשמי; פסיכומטרי 600 לפחות',
    'סכם לשנת 2026 טרם פורסם',
    'הסכם מתפרסם באתר המוסד',
  ])('rejects a floor, formula, year or unspecified threshold: %s', (text) => {
    expect(hasPublishedCompositeThreshold([text], 'tau')).toBe(false);
  });

  it('links numeric thresholds regardless of institution', () => {
    expect(hasPublishedCompositeThreshold(['סכם 620'], 'ariel')).toBe(true);
    expect(hasPublishedCompositeThreshold(['סכם 620'], 'bgu')).toBe(true);
  });

  it('excludes hidden, non-degree, ingestion and alias pages despite their threshold text', async () => {
    const programs = getStaticCataloguePrograms();
    vi.mocked(listCataloguePrograms).mockResolvedValue({ data: programs, meta: {} });
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: getStaticCatalogueInstitutions(),
      meta: {},
    });
    const data = (await getPublicProgramPageData('tlvyaffo_cs'))!;
    const sources = await getPublicProgramRequirementSources(data);
    for (const override of [
      { isListed: false },
      { type: 'certificate' as const },
      { id: 'mon_saved' },
      { id: 'mta_cs' },
    ]) {
      expect(
        hasPublishedCompositeThresholds(
          { ...data, program: { ...data.program, ...override } },
          sources,
        ),
      ).toBe(false);
    }
  });

  it('links TAU adaptation and prior-degree FAQ thresholds too', () => {
    expect(hasPublishedCompositeThreshold(['ציון התאמה לניהול 610'], 'tau', { forFaq: true })).toBe(
      true,
    );
    expect(
      hasPublishedCompositeThreshold(
        ['ציון התאמה 647', 'לבעלי תואר ראשון: ציון משולב 1475 לפחות'],
        'tau',
        { forFaq: true },
      ),
    ).toBe(true);
    expect(
      hasPublishedCompositeThreshold(['ציון התאמה 647', 'סכם 650'], 'tau', { forFaq: true }),
    ).toBe(true);
    expect(hasPublishedCompositeThreshold(['ציון התאמה 647'], 'haifa', { forFaq: true })).toBe(
      true,
    );
  });
});
