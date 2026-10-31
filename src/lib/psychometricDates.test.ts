import { describe, expect, it } from 'vitest';
import {
  psychometricDates,
  psychometricDatesCheckedOn,
  psychometricFacts,
} from '@/data/psychometricDates';
import {
  formatPsychometricDate,
  getJerusalemDate,
  getNextOpenSitting,
  getSittingStatuses,
} from './psychometricDates';

describe('psychometric sitting calendar in Asia/Jerusalem', () => {
  it.each([
    ['2026-10-01T12:00:00Z', true, '4,6.12.2026'],
    ['2026-10-14T20:59:59Z', true, '4,6.12.2026'],
    ['2026-10-14T21:00:00Z', false, '18–19.4.2027'],
    ['2026-10-14T22:30:00Z', false, '18–19.4.2027'],
    ['2026-10-15T12:00:00Z', false, '18–19.4.2027'],
    ['2026-10-29T12:00:00Z', false, '18–19.4.2027'],
    ['2027-03-01T12:00:00Z', undefined, '1.7.2027'],
  ])('derives registration and next sitting at %s', (instant, decemberOpen, nextLabel) => {
    const now = new Date(instant);
    const statuses = getSittingStatuses(psychometricDates, now);
    expect(statuses.find(({ sitting }) => sitting.id === 'december-2026')?.registrationOpen).toBe(
      decemberOpen,
    );
    expect(getNextOpenSitting(psychometricDates, now)?.displayLabel).toBe(nextLabel);
    expect(
      statuses.filter(({ isNextOpen }) => isNextOpen).map(({ sitting }) => sitting.displayLabel),
    ).toEqual([nextLabel]);
  });

  it('uses the Jerusalem calendar day, including summer and winter offsets', () => {
    expect(getJerusalemDate(new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15');
    expect(getJerusalemDate(new Date('2027-02-10T21:59:59Z'))).toBe('2027-02-10');
    expect(getJerusalemDate(new Date('2027-02-10T22:00:00Z'))).toBe('2027-02-11');
    expect(
      getNextOpenSitting(psychometricDates, new Date('2027-02-10T21:59:59Z'))?.displayLabel,
    ).toBe('18–19.4.2027');
    expect(
      getNextOpenSitting(psychometricDates, new Date('2027-02-10T22:00:00Z'))?.displayLabel,
    ).toBe('1.7.2027');
  });

  it('derives the approved answer dates for today', () => {
    const next = getNextOpenSitting(psychometricDates, new Date('2026-10-29T12:00:00Z'))!;
    expect(next.displayLabel).toBe('18–19.4.2027');
    expect(formatPsychometricDate(next.registrationDeadline)).toBe('10.2.2027');
  });

  it('keeps a multi-day sitting through its final day, then hides it', () => {
    for (const instant of ['2026-12-05T12:00:00Z', '2026-12-06T21:59:59Z']) {
      expect(getSittingStatuses(psychometricDates, new Date(instant))[0].sitting.id).toBe(
        'december-2026',
      );
    }
    expect(
      getSittingStatuses(psychometricDates, new Date('2026-12-06T22:00:00Z')).map(
        ({ sitting }) => sitting.id,
      ),
    ).not.toContain('december-2026');
  });

  it('selects chronologically without mutating an unsorted input', () => {
    const reversed = [...psychometricDates].reverse();
    const original = [...reversed];
    expect(
      getSittingStatuses(reversed, new Date('2026-10-01T12:00:00Z')).map(
        ({ sitting }) => sitting.id,
      ),
    ).toEqual(psychometricDates.map(({ id }) => id));
    expect(getNextOpenSitting(reversed, new Date('2026-10-01T12:00:00Z'))?.id).toBe(
      'december-2026',
    );
    expect(reversed).toEqual(original);
  });

  it('has no next open sitting after all deadlines and no rows after all test days', () => {
    const now = new Date('2027-10-26T12:00:00Z');
    expect(getNextOpenSitting(psychometricDates, now)).toBeNull();
    expect(getSittingStatuses(psychometricDates, now)).toHaveLength(1);
    expect(getSittingStatuses(psychometricDates, now)[0]).toMatchObject({
      registrationOpen: false,
      isNextOpen: false,
    });
    expect(getSittingStatuses(psychometricDates, new Date('2027-12-27T12:00:00Z'))).toEqual([]);
    expect(getNextOpenSitting([], now)).toBeNull();
  });
});

describe('saved official NITE evidence checked 29.10.2026', () => {
  it('matches all five verified sitting rows exactly', () => {
    expect(
      psychometricDates.map(
        ({ displayLabel, testDays, registrationDeadline, languages, scoresForecast }) => [
          displayLabel,
          testDays,
          registrationDeadline,
          languages,
          scoresForecast,
        ],
      ),
    ).toEqual([
      ['4,6.12.2026', ['2026-12-04', '2026-12-06'], '2026-10-14', ['עברית', 'ערבית'], '2027-01-20'],
      [
        '18–19.4.2027',
        ['2027-04-18', '2027-04-19'],
        '2027-02-10',
        ['עברית', 'ערבית', 'משולב/אנגלית', 'רוסית', 'צרפתית'],
        undefined,
      ],
      [
        '1.7.2027',
        ['2027-07-01'],
        '2027-05-13',
        ['עברית', 'ערבית', 'משולב/אנגלית', 'רוסית', 'צרפתית'],
        undefined,
      ],
      ['6–7.9.2027', ['2027-09-06', '2027-09-07'], '2027-07-12', ['עברית', 'ערבית'], undefined],
      ['24,26.12.2027', ['2027-12-24', '2027-12-26'], '2027-10-25', ['עברית', 'ערבית'], undefined],
    ]);
    expect(psychometricDatesCheckedOn).toBe('2026-10-29');
    expect(new Set(psychometricDates.map(({ id }) => id)).size).toBe(5);
    for (const [index, sitting] of psychometricDates.entries()) {
      expect(sitting.checkedOn).toBe('2026-10-29');
      expect(sitting.sourceUrl).toBe(
        index === 0
          ? 'https://www.nite.org.il/test-dates-and-prices/'
          : 'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
      );
      for (const date of [
        sitting.checkedOn,
        sitting.registrationDeadline,
        ...sitting.testDays,
        ...(sitting.scoresForecast ? [sitting.scoresForecast] : []),
      ]) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(date).toISOString().slice(0, 10)).toBe(date);
      }
      expect(sitting.testDays).toEqual([...sitting.testDays].sort());
      expect(sitting.registrationDeadline < sitting.testDays[0]).toBe(true);
      if (index)
        expect(psychometricDates[index - 1].testDays.at(-1)! < sitting.testDays[0]).toBe(true);
    }
  });

  it('keeps the verified price and two-domain reform with official sources', () => {
    expect(psychometricFacts).toEqual({
      ordinaryRegistration: {
        price: 495,
        sourceUrl: 'https://www.nite.org.il/test-dates-and-prices/',
      },
      reform: {
        from: '2026-12',
        domains: ['חשיבה מילולית', 'חשיבה כמותית'],
        sourceUrl: 'https://www.nite.org.il/two-domain-psychometric-entrance-test/format/',
      },
    });
  });
});
