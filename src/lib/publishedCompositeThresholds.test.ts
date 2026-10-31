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
  'architecture',
  'bgu_accounting',
  'bgu_business',
  'bgu_psychology',
  'business',
  'communication',
  'cs',
  'datascience',
  'economics',
  'education',
  'ee',
  'haifa_accounting',
  'haifa_communication',
  // haifa_cs added: official Haifa 3210 סכם 700 (תשפ״ז), approved by CEO 2026-10-30.
  'haifa_cs',
  'haifa_infosystems',
  'haifa_nursing',
  'haifa_politicalscience',
  // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
  'haifa_psychology',
  'haifa_sociology',
  'huji_accounting',
  'huji_business',
  'huji_law',
  'law',
  'me',
  'nursing',
  'nutrition',
  'occupational_therapy',
  'pharmacy',
  'physiotherapy',
  'political_science',
  'psychology',
  'reichman_business',
  'reichman_cs',
  'reichman_economics',
  'reichman_law',
  'reichman_psychology',
  'tau_accounting',
  'tau_business',
  'tau_law',
  'technion_ee',
  'technion_me',
];

describe('published composite threshold selector', () => {
  it('selects the 40 supported static pages from the same resolved requirements the page renders', async () => {
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
    // Approved test update: Jorje 2026-10-29, haifa_psychology and psychology become exact in the Haifa formula PR
    // haifa_cs added: official Haifa 3210 סכם 700 (תשפ״ז), approved by CEO 2026-10-30.
    expect(STATIC_THRESHOLD_PAGE_IDS).toHaveLength(42);
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
    'באפיק המשולב נדרש ציון 22.700 לפחות לפי חישוב האוניברסיטה.',
    'מצרף 620',
    'בחורף תשפ"ז: סכם 91.5',
  ])('recognizes a published threshold: %s', (text) => {
    expect(hasPublishedCompositeThreshold([text])).toBe(true);
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
    expect(hasPublishedCompositeThreshold([text])).toBe(false);
  });

  it('recognizes numeric threshold wording independently of calculator eligibility', () => {
    expect(hasPublishedCompositeThreshold(['סכם 620'])).toBe(true);
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

  it('recognises TAU adaptation and prior-degree published thresholds', () => {
    expect(hasPublishedCompositeThreshold(['ציון התאמה לניהול 610'])).toBe(true);
    expect(
      hasPublishedCompositeThreshold(['ציון התאמה 647', 'לבעלי תואר ראשון: ציון משולב 1475 לפחות']),
    ).toBe(true);
    expect(hasPublishedCompositeThreshold(['ציון התאמה 647', 'סכם 650'])).toBe(true);
    expect(hasPublishedCompositeThreshold(['ציון התאמה 647'])).toBe(true);
  });
});
