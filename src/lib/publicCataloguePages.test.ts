import { describe, expect, it } from 'vitest';

import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

import { getPublicInstitutionPageData, getPublicProgramPageData } from './publicCataloguePages';

describe('public catalogue page data', () => {
  it('resolves a known program without account-owned state', () => {
    const knownProgram = getStaticCataloguePrograms()[0];

    expect(knownProgram).toBeTruthy();

    const data = getPublicProgramPageData(knownProgram.id);

    expect(data?.program.name).toBe(knownProgram.name);
    expect(data).not.toHaveProperty('savedProgramIds');
    expect(data).not.toHaveProperty('academicScores');
  });

  it('resolves a known institution and its public programs', () => {
    const knownInstitution = getStaticCatalogueInstitutions()[0];

    expect(knownInstitution).toBeTruthy();

    const data = getPublicInstitutionPageData(knownInstitution.id);

    expect(data?.institution.name).toBe(knownInstitution.name);
    expect(
      data?.programs.every((program) => program.linkedInstitutionIds.includes(knownInstitution.id)),
    ).toBe(true);
  });

  it('returns null for unknown public IDs', () => {
    expect(getPublicProgramPageData('missing-program')).toBeNull();
    expect(getPublicInstitutionPageData('missing-institution')).toBeNull();
  });
});
