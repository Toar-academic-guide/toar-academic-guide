import { describe, expect, it } from 'vitest';
import { institutionProgramName } from './institutionProgramName';

const institution = { id: 'haifa' as const, name: 'אוניברסיטת חיפה' };
const program = { institutionId: institution.id, institution: institution.name };

describe('institutionProgramName', () => {
  it.each(['-', '–', '—'])('removes only a trailing own-institution suffix with %s', (dash) => {
    expect(
      institutionProgramName(
        { ...program, name: `הנדסה וטכנולוגיה ${dash} אוניברסיטת חיפה` },
        institution,
      ),
    ).toBe('הנדסה וטכנולוגיה');
  });

  it.each([
    'הנדסה וטכנולוגיה',
    'הנדסה וטכנולוגיה - האוניברסיטה העברית בירושלים',
    'הנדסה - אוניברסיטת חיפה ותוכנית נוספת',
    'הנדסה- אוניברסיטת חיפה',
    'הנדסה -אוניברסיטת חיפה',
    'הנדסה –  אוניברסיטת חיפה',
    'הנדסה — אוניברסיטת חיפה ',
    ' - אוניברסיטת חיפה',
    '   - אוניברסיטת חיפה',
  ])('keeps the full name when there is no exact safe suffix: %s', (name) => {
    expect(institutionProgramName({ ...program, name }, institution)).toBe(name);
  });

  it('matches the generator display name only when the program belongs to this institution', () => {
    const technion = { id: 'technion' as const, name: 'הטכניון – מכון טכנולוגי לישראל' };
    const own = {
      institutionId: technion.id,
      institution: 'הטכניון - מכון טכנולוגי לישראל',
      name: 'הנדסה וטכנולוגיה - הטכניון - מכון טכנולוגי לישראל',
    };
    expect(institutionProgramName(own, technion)).toBe('הנדסה וטכנולוגיה');
    expect(institutionProgramName(own, institution)).toBe(own.name);
    expect(institutionProgramName({ ...own, institutionId: undefined }, technion)).toBe(own.name);
  });
});
