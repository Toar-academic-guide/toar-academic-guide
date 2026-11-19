export const bagrutDatesCheckedOn = '2026-11-08';

export const bagrutDatesSources = {
  portal: 'https://parents.education.gov.il/gov-education/school/matriculation/dates',
  winter: 'https://meyda.education.gov.il/files/Exams/LuachWinExams2027Sofi.pdf',
  summer: 'https://meyda.education.gov.il/files/Exams/LuachSumExams2027Tyota.pdf',
  spokenAndSimulations: 'https://meyda.education.gov.il/files/Exams/DatesAvatarExams2027.pdf',
} as const;

export interface BagrutDateMonth {
  label: string;
  dates: readonly string[];
}

export const bagrutExamCalendars = [
  {
    id: 'winter',
    label: 'חורף',
    year: '2027',
    status: 'טיוטה לפי פורטל משרד החינוך',
    sourceUrl: bagrutDatesSources.winter,
    months: [
      { label: 'דצמבר 2026', dates: ['2026-12-28'] },
      {
        label: 'ינואר 2027',
        dates: [
          '2027-01-04',
          '2027-01-11',
          '2027-01-12',
          '2027-01-14',
          '2027-01-18',
          '2027-01-20',
          '2027-01-21',
          '2027-01-24',
          '2027-01-25',
          '2027-01-26',
          '2027-01-27',
          '2027-01-28',
        ],
      },
      { label: 'פברואר 2027', dates: ['2027-02-01', '2027-02-04', '2027-02-09'] },
    ],
  },
  {
    id: 'summer',
    label: 'קיץ',
    year: '2027',
    status: 'טיוטה לפי פורטל משרד החינוך',
    sourceUrl: bagrutDatesSources.summer,
    months: [
      {
        label: 'מאי 2027',
        dates: [
          '2027-05-02',
          '2027-05-05',
          '2027-05-09',
          '2027-05-13',
          '2027-05-17',
          '2027-05-20',
          '2027-05-24',
          '2027-05-26',
          '2027-05-31',
        ],
      },
      {
        label: 'יוני 2027',
        dates: [
          '2027-06-01',
          '2027-06-02',
          '2027-06-03',
          '2027-06-07',
          '2027-06-08',
          '2027-06-09',
          '2027-06-14',
          '2027-06-15',
          '2027-06-17',
          '2027-06-21',
          '2027-06-22',
          '2027-06-23',
          '2027-06-24',
          '2027-06-28',
          '2027-06-30',
        ],
      },
      {
        label: 'יולי 2027',
        dates: ['2027-07-01', '2027-07-05', '2027-07-06', '2027-07-07', '2027-07-08'],
      },
    ],
  },
] as const;

export const spokenLanguageExams = [
  {
    language: 'אנגלית',
    sittings: [
      {
        label: 'חורף',
        dates: ['2026-11-24', '2026-11-25', '2026-12-01', '2026-12-02', '2026-12-14'],
      },
      {
        label: 'קיץ',
        dates: ['2027-02-25', '2027-03-01', '2027-03-02', '2027-03-03', '2027-03-08'],
      },
      { label: 'מועד ב׳', dates: ['2027-07-06'] },
    ],
  },
  {
    language: 'עברית לערבים ולעדה הדרוזית',
    sittings: [
      { label: 'חורף', dates: ['2026-12-01', '2026-12-02', '2026-12-14'] },
      { label: 'קיץ', dates: ['2027-03-01', '2027-03-03', '2027-03-08'] },
    ],
  },
  {
    language: 'עברית לערבים ולעדה הדרוזית — הגבר',
    sittings: [{ label: 'קיץ', dates: ['2027-02-24', '2027-03-17'] }],
  },
  {
    language: 'עברית לערבים ולעדה הדרוזית + הגבר',
    sittings: [{ label: 'נבחני משנה ואקסטרניים בלבד', dates: ['2027-05-24'] }],
  },
  {
    language: 'ערבית ליהודים',
    sittings: [
      { label: 'קיץ', dates: ['2027-02-24', '2027-03-17'] },
      { label: 'נבחני משנה ואקסטרניים בלבד', dates: ['2027-05-05'], time: '8:30–9:15' },
    ],
  },
] as const;

export const simulationOpenings = [
  { label: 'שפות דבורות — חורף', date: '2026-10-18' },
  { label: 'זכאים להתאמות — חורף', date: '2026-11-08' },
  { label: 'שפות דבורות — קיץ', date: '2027-01-26' },
  { label: 'טכנאים והנדסאים', date: '2027-02-07' },
  { label: 'זכאים להתאמות ובחינות עתירות מדיה — קיץ', date: '2027-03-14' },
  { label: 'ביוטכנולוגיה — יום הדמיה נפרד', date: '2027-04-06' },
  { label: 'מידע ונתונים AI — יום הדמיה נפרד', date: '2027-04-08' },
] as const;
