export const psychometricDatesCheckedOn = '2026-10-29';

export interface PsychometricSitting {
  readonly id: string;
  readonly displayLabel: string;
  readonly testDays: readonly [string, ...string[]];
  readonly registrationDeadline: string;
  readonly languages: readonly string[];
  /** Official forecast for score reporting, not a guaranteed publication date. */
  readonly scoresForecast?: string;
  readonly sourceUrl: `https://www.nite.org.il/${string}`;
  readonly checkedOn: typeof psychometricDatesCheckedOn;
}

const schedule2027 = 'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf';

export const psychometricDates: readonly PsychometricSitting[] = [
  {
    id: 'december-2026',
    displayLabel: '4,6.12.2026',
    testDays: ['2026-12-04', '2026-12-06'],
    registrationDeadline: '2026-10-14',
    languages: ['עברית', 'ערבית'],
    scoresForecast: '2027-01-20',
    sourceUrl: 'https://www.nite.org.il/test-dates-and-prices/',
    checkedOn: psychometricDatesCheckedOn,
  },
  {
    id: 'april-2027',
    displayLabel: '18–19.4.2027',
    testDays: ['2027-04-18', '2027-04-19'],
    registrationDeadline: '2027-02-10',
    languages: ['עברית', 'ערבית', 'משולב/אנגלית', 'רוסית', 'צרפתית'],
    sourceUrl: schedule2027,
    checkedOn: psychometricDatesCheckedOn,
  },
  {
    id: 'july-2027',
    displayLabel: '1.7.2027',
    testDays: ['2027-07-01'],
    registrationDeadline: '2027-05-13',
    languages: ['עברית', 'ערבית', 'משולב/אנגלית', 'רוסית', 'צרפתית'],
    sourceUrl: schedule2027,
    checkedOn: psychometricDatesCheckedOn,
  },
  {
    id: 'september-2027',
    displayLabel: '6–7.9.2027',
    testDays: ['2027-09-06', '2027-09-07'],
    registrationDeadline: '2027-07-12',
    languages: ['עברית', 'ערבית'],
    sourceUrl: schedule2027,
    checkedOn: psychometricDatesCheckedOn,
  },
  {
    id: 'december-2027',
    displayLabel: '24,26.12.2027',
    testDays: ['2027-12-24', '2027-12-26'],
    registrationDeadline: '2027-10-25',
    languages: ['עברית', 'ערבית'],
    sourceUrl: schedule2027,
    checkedOn: psychometricDatesCheckedOn,
  },
];

export const psychometricFacts = {
  ordinaryRegistration: { price: 495, sourceUrl: 'https://www.nite.org.il/test-dates-and-prices/' },
  reform: {
    from: '2026-12',
    domains: ['חשיבה מילולית', 'חשיבה כמותית'],
    sourceUrl: 'https://www.nite.org.il/two-domain-psychometric-entrance-test/format/',
  },
} as const;
