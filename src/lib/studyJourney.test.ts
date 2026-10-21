import { describe, expect, it } from 'vitest';
import { toggleLocation, resultLabel, groupJourneyRows, studyFields } from './studyJourney';
import { getStaticCataloguePrograms } from './catalogueStatic';

describe('approved journey', () => {
  it('excludes withdrawn import placeholders from choices while retaining saved references', () => {
    const program = { ...getStaticCataloguePrograms()[0], isListed: false };
    expect(studyFields([program])).toEqual([]);
    expect(studyFields([program], true).flatMap((field) => field.programs)).toContain(program);
  });
  it('uses corrected catalogue classification even when a legacy ID ends in cs', () => {
    const catalogue = getStaticCataloguePrograms();
    const culinary = catalogue.find((program) => program.id === 'danon_culinary')!;
    const corrected = { ...culinary, id: 'danon_cs' };
    const fields = studyFields([...catalogue, corrected]);
    expect(
      fields
        .find((field) => field.id === 'cs')
        ?.programs.some((program) => program.institutionId === 'danon'),
    ).toBe(false);
    expect(fields.find((field) => field.programs.includes(corrected))?.name).toBe('קולינריה');
  });
  it('keeps International independent of All Israel and domestic areas', () => {
    expect(toggleLocation(['all'], 'online')).toEqual(['all', 'online']);
    expect(toggleLocation(['all', 'online'], 'north')).toEqual(['online', 'north']);
    expect(toggleLocation(['online', 'north'], 'all')).toEqual(['online', 'all']);
    expect(toggleLocation(['all', 'online'], 'online')).toEqual(['all']);
  });
  it('does not turn unavailable admissions data into an acceptance', () => {
    expect(resultLabel(undefined).group).toBe('explore');
    expect(resultLabel(undefined).label).toBe('טרם חושבה התאמה');
    expect(resultLabel(undefined, true).label).toBe('החישוב לא נטען');
    expect(resultLabel(undefined, false, true).label).toBe('החישוב מתבצע…');
  });
  it('groups degree results without hiding their contact rows', () => {
    expect(groupJourneyRows([], 'field')).toEqual([]);
  });
});
