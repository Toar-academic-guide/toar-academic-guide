import { describe, expect, it } from 'vitest';
import { toggleLocation, resultLabel, groupJourneyRows } from './studyJourney';

describe('approved journey', () => {
  it('keeps International independent of All Israel and domestic areas', () => {
    expect(toggleLocation(['all'], 'online')).toEqual(['all', 'online']);
    expect(toggleLocation(['all', 'online'], 'north')).toEqual(['online', 'north']);
    expect(toggleLocation(['online', 'north'], 'all')).toEqual(['online', 'all']);
    expect(toggleLocation(['all', 'online'], 'online')).toEqual(['all']);
  });
  it('does not turn unavailable admissions data into an acceptance', () => {
    expect(resultLabel(undefined).group).toBe('explore');
    expect(resultLabel(undefined).label).toBe('להכיר את המסלול');
  });
  it('groups degree results without hiding their contact rows', () => {
    expect(groupJourneyRows([], 'field')).toEqual([]);
  });
});
