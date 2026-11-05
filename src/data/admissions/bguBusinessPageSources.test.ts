import { describe, expect, it, vi } from 'vitest';
import repair from './catalogueContentRepair.json';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', async () => {
  const { getStaticCatalogueInstitutions, getStaticCataloguePrograms } =
    await import('@/lib/catalogueStatic');
  return {
    listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms(), meta: {} }),
    listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions(), meta: {} }),
  };
});

import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';

describe('BGU business page requirement sources', () => {
  it.each(['business', 'bgu_business'])(
    'resolves %s to the corrected business administration notes',
    async (id) => {
      const page = (await getPublicProgramPageData(id))!;
      const source = (await getPublicProgramRequirementSources(page)).bgu;
      const row = repair.requirements.find((entry) => entry.programId === 'bgu_business')!;
      expect(source.sourceProgramId).toBe('bgu_business');
      expect(source.requirements).toEqual(row.notes);
      expect(source.requirements.join(' ')).toContain(
        'סכם כמותי 620 לפחות וגם פסיכומטרי 600 לפחות',
      );
      expect(source.requirements.join(' ')).not.toMatch(/580|בניהול/);
    },
  );
});
