import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/admissions/catalogueContentRepair.json', () => ({
  default: {
    requirements: [
      ['checked', 'https://admissions.bgu.ac.il/requirements?year=2027', '2026-10-21'],
      ['root', 'https://bgu.ac.il/requirements', '2026-10-21'],
      ['http', 'http://bgu.ac.il/requirements', '2026-10-21'],
      ['aggregator', 'https://www.study.co.il/requirements', '2026-10-21'],
      ['suffix', 'https://bgu.ac.il.example.com/requirements', '2026-10-21'],
      ['prefix', 'https://fakebgu.ac.il/requirements', '2026-10-21'],
      ['credentials', 'https://user:password@bgu.ac.il/requirements', '2026-10-21'],
      ['malformed', 'not a URL', '2026-10-21'],
      ['invalid-date', 'https://bgu.ac.il/requirements', '2026-02-30'],
    ].map(([programId, sourceUrl, checkedAt]) => ({
      programId,
      institutionId: 'bgu',
      notes: ['תנאי ראשון', 'תנאי שני'],
      sourceUrl,
      checkedAt,
    })),
  },
}));

import { formatRequirementsCheckedDate, getRequirementsChecked } from './requirementsChecked';

const institution = { id: 'bgu' as const, domain: 'bgu.ac.il' };
const notes = ['תנאי ראשון', 'תנאי שני'];

describe('getRequirementsChecked', () => {
  it('returns the entry date and exact official source URL for matching raw notes', () => {
    expect(getRequirementsChecked('checked', institution, [...notes])).toEqual({
      date: '21.10.2026',
      sourceUrl: 'https://admissions.bgu.ac.il/requirements?year=2027',
    });
    expect(getRequirementsChecked('root', institution, notes)?.sourceUrl).toBe(
      'https://bgu.ac.il/requirements',
    );
  });

  it.each([
    { sourceNotes: undefined },
    { sourceNotes: [] },
    { sourceNotes: ['תנאי ראשון'] },
    { sourceNotes: ['תנאי שני', 'תנאי ראשון'] },
    { sourceNotes: ['תנאי ראשון ', 'תנאי שני'] },
    { sourceNotes: [...notes, 'תנאי נוסף'] },
    { sourceNotes: ['תנאי חדש', 'תנאי שני'] },
  ])('withholds the entire line when notes differ: $sourceNotes', ({ sourceNotes }) => {
    expect(getRequirementsChecked('checked', institution, sourceNotes)).toBeUndefined();
  });

  it('requires the same program and institution, and a valid per-entry date', () => {
    expect(getRequirementsChecked('missing', institution, notes)).toBeUndefined();
    expect(getRequirementsChecked('checked', { ...institution, id: 'tau' }, notes)).toBeUndefined();
    expect(getRequirementsChecked('invalid-date', institution, notes)).toBeUndefined();
  });

  it.each(['http', 'aggregator', 'suffix', 'prefix', 'credentials', 'malformed'])(
    'keeps only the checked date for a non-official source (%s)',
    (programId) => {
      expect(getRequirementsChecked(programId, institution, notes)).toEqual({
        date: '21.10.2026',
        sourceUrl: undefined,
      });
    },
  );

  it.each([undefined, 'tau.ac.il'])(
    'withholds the URL without a matching official domain (%s)',
    (domain) => {
      expect(getRequirementsChecked('checked', { ...institution, domain }, notes)).toEqual({
        date: '21.10.2026',
        sourceUrl: undefined,
      });
    },
  );
});

describe('formatRequirementsCheckedDate', () => {
  it.each([
    ['2026-10-21', '21.10.2026'],
    ['2026-01-02', '02.01.2026'],
    ['2024-02-29', '29.02.2024'],
    ['2026-02-29', undefined],
    ['2026-00-21', undefined],
    ['2026-13-21', undefined],
    ['2026-10-00', undefined],
    ['2026-04-31', undefined],
    ['2026-10-21T00:00:00Z', undefined],
    ['not a date', undefined],
  ])('formats %s by string parsing as %s', (input, expected) => {
    expect(formatRequirementsCheckedDate(input)).toBe(expected);
  });
});
