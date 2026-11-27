// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/psychometric-dates' }));
import Page, { dynamic, metadata } from './page';
import { semesterValiditySources } from './SemesterValidity';

const title = 'מועדי פסיכומטרי 2026–2027: תאריכים וסיום הרשמה | MyWay';
const description =
  'מועדי הבחינה הפסיכומטרית לפי לוח מאל״ו: תאריכי בחינה, מועדי סיום הרשמה ושפות לכל מועד, ואיזה מועד נחשב לאיזה סמסטר.';
const canonical = 'https://findmyway.co.il/psychometric-dates';
afterEach(() => vi.useRealTimers());

it('renders sourced semester dates without filling unpublished deadlines', async () => {
  render(await Page());
  const section = screen.getByRole('region', { name: 'איזה מועד פסיכומטרי נחשב לאיזה סמסטר' });
  expect(within(section).getByRole('heading', { level: 2 }).id).toBe('semester-validity');
  const spring = within(section).getByRole('table', { name: 'סמסטר ב\' תשפ"ז (פברואר–מרץ 2027)' });
  const rows = within(spring).getAllByRole('row').slice(1);
  expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
    'הטכניון',
    'אוניברסיטת חיפה',
    'האוניברסיטה העברית',
    'אוניברסיטת תל אביב',
    'אוניברסיטת בן־גוריון',
    'האוניברסיטה הפתוחה',
  ]);
  expect(
    within(rows[0])
      .getAllByRole('cell')
      .slice(0, 4)
      .map((cell) => cell.textContent),
  ).toEqual([
    '1.11.2026בשעה 10:00',
    '28.1.2027הרשמה מאוחרת מ־31.1.2027, על בסיס מקום פנוי',
    'דצמבר 2026',
    '24.3.2027',
  ]);
  expect(within(rows[1]).getAllByRole('cell')[0].textContent).toBe('29.11.2026');
  expect(within(rows[2]).getAllByRole('cell')[0].textContent).toBe('03.01.2027');
  for (const row of rows.slice(1, 3)) {
    expect(
      within(row)
        .getAllByRole('cell')
        .slice(1, 4)
        .map((cell) => cell.textContent),
    ).toEqual(['', '', '']);
  }
  const autumn = within(section).getByRole('table', { name: 'סמסטר א\' תשפ"ח (אוקטובר 2027)' });
  const autumnRows = within(autumn).getAllByRole('row').slice(1);
  expect(autumnRows).toHaveLength(5);
  expect(autumnRows[0].textContent).toContain('כלל תוקף כפי שמפורסם באתר הטכניון');
  expect(
    within(autumnRows[0])
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual([
    "אפריל תקף לסמסטר א' — המועד האחרון לרפואה ולמסלולי רפואה.",
    "יולי: הדיון לסמסטר א' על בסיס מקום פנוי.",
    "ספטמבר אינו תקף לסמסטר א'.",
  ]);
  expect(autumnRows[1].textContent).toContain(
    'פתיחת הרשמה: 31.1.2027. שנת הלימודים מתחילה באוקטובר 2027.',
  );
  expect(autumnRows[2].textContent).toContain('פתיחת הרשמה לשנת תשפ"ח: 01.11.2026.');
  const huji = autumnRows[3];
  expect(within(huji).getByRole('rowheader').textContent).toBe('האוניברסיטה העברית');
  const sittings = within(huji)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
  expect(sittings[0]).toContain('אפריל 2027:');
  expect(sittings[0]).toContain('כולל צמרת ורפואה ומחקר ביו־רפואי');
  expect(sittings[0]).toContain('למעט עתודאים במסלול בינה');
  expect(sittings[0]).toContain('לרפואה וטרינרית ולתכנית אמירים רוח');
  expect(sittings[1]).toContain('יולי 2027:');
  expect(sittings[1]).toContain('המכינה האוניברסיטאית של העברית (למעט רפואה)');
  expect(sittings[1]).toContain('לעתודאים (למעט צמרת)');
  expect(sittings[1]).toContain('ולנרשמים לשנה ב׳ ומעלה בחוגים שבהם נדרשת הבחינה');
  expect(sittings[2]).toContain('ספטמבר 2027: תקף לתחומים שיישארו פתוחים להרשמה');
  expect(huji.textContent).toContain('הציון הגבוה מבין הבחינות');
  expect(huji.textContent).toContain('אוקטובר 1990 ואילך תקף');
  expect(within(autumnRows[4]).getByRole('cell').textContent).toBe('לא פורסם בעמוד הרשמי לתשפ״ח.');
  expect(autumnRows[4].textContent).not.toMatch(/2026|2027/);
  expect(section.textContent).not.toMatch(/מקור|https?:|נבדק|עודכן/);
  expect(within(section).queryAllByRole('link')).toHaveLength(0);
  expect(Object.values(semesterValiditySources)).toEqual([
    'https://admissions.technion.ac.il/registeration-dates/',
    'https://admissions.technion.ac.il/technion_psychometri/',
    'https://admissions.haifa.ac.il/registration-deadlines-and-entrance-exams/',
    'https://info.huji.ac.il/registration-process/calendar',
    'https://info.huji.ac.il/reception-components/Psychometric',
    'https://go.tau.ac.il/he/med/ba/dental?v=important-info',
    'https://www.bgu.ac.il/events/registrastion-2027-2028/',
    'https://go.tau.ac.il/he/reg-dates',
    'https://www.bgu.ac.il/welcome/contents/spring-semester/ba-spring-semester/',
    'https://www.openu.ac.il/registration/spring/pages/default.aspx',
  ]);
  expect(section.querySelectorAll('time[datetime="2026-11-17"]')).toHaveLength(0);
  expect(section.querySelectorAll('time[datetime="2026-11-10"]')).toHaveLength(0);
  expect(section.textContent).not.toMatch(/נבדק בתאריך/);
  expect(section.textContent).not.toMatch(/עודכן לאחרונה/);
  const values = (row: HTMLElement) =>
    within(row)
      .getAllByRole('cell')
      .slice(0, 4)
      .map((cell) => cell.textContent);
  expect(values(rows[3])).toEqual([
    '1.11.2026',
    'התוכניות רשאיות לסגור את ההרשמה ללא הודעה מוקדמת.',
    '',
    '',
  ]);
  expect(values(rows[4])).toEqual(['3.1.2027', '', '', '28.2.2027']);
  expect(values(rows[5])).toEqual([
    '1.11.2026',
    '29.12.2026הרשמה מאוחרת: 30.12.2026–12.2.2027הרשמה עד 5.3.2027 תתאפשר על בסיס מקום פנוי בקבוצת הלימוד.',
    '',
    '7.3.2027',
  ]);
});

it('renders the approved dates, derived answer, closed badge, next label and single CTA', async () => {
  vi.useFakeTimers();
  vi.setSystemTime('2026-10-29T12:00:00Z');
  render(await Page());
  const main = screen.getByRole('main');
  expect(
    within(main)
      .getAllByRole('heading', { level: 1 })
      .map((node) => node.textContent),
  ).toEqual(['מועדי פסיכומטרי 2026–2027']);
  expect(main.textContent).toContain(
    'המועד הפתוח הקרוב להרשמה: 18–19.4.2027. ההרשמה נסגרת ב־10.2.2027.',
  );
  const examTable = within(main).getByRole('table', { name: 'מועדי פסיכומטרי' });
  const rows = within(examTable).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(5);
  expect(
    rows.map((row) => within(row).getByRole('rowheader').querySelector('bdi')?.textContent),
  ).toEqual(['4,6.12.2026', '18–19.4.2027', '1.7.2027', '6–7.9.2027', '24,26.12.2027']);
  expect(rows[0].textContent).toContain('ההרשמה נסגרה');
  expect(rows[1].textContent).toContain('המועד הקרוב');
  expect(within(main).getAllByText('המועד הקרוב')).toHaveLength(1);
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 41)
  const ctas = within(main).getAllByRole('link', { name: 'יש לכם ציון? בדקו לאן אתם מתקבלים' });
  expect(ctas).toHaveLength(1);
  expect(ctas[0].getAttribute('href')).toBe('/sekhem-calculator');
  expect(within(main).queryByRole('link', { name: 'לוח הבחינות הרשמי באתר מאל״ו' })).toBeNull();
  expect(examTable.querySelectorAll('a')).toHaveLength(0);
  expect(examTable.querySelector('caption')?.textContent).toBe('מועדי פסיכומטרי');
  expect(main.textContent).not.toMatch(/נבדק בתאריך/);
  expect(main.textContent).not.toMatch(/סכם/);
  expect(
    screen
      .getByRole('navigation', { name: 'ניווט ראשי' })
      .querySelector('a[href="/psychometric-dates"]'),
  ).toBeNull();
  for (const date of main.querySelectorAll('bdi')) expect(date.getAttribute('dir')).toBe('ltr');
  expect(main.textContent).toContain('תחזית הציונים למועד דצמבר 2026: 20.1.2027');
  expect(main.textContent).toContain('מחיר הרשמה רגילה המוצג באתר מאל״ו: 495 ₪.');
});

it('publishes a date list of individual NITE exam dates as Event structured data', async () => {
  const { container } = render(await Page());
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  const graph = JSON.parse(script!.textContent!) as {
    '@graph': Array<{
      '@type': string;
      name?: string;
      itemListElement?: Array<{ item: Record<string, unknown> }>;
    }>;
  };
  const dates = graph['@graph'].find((item) => item['@type'] === 'ItemList');
  expect(dates?.name).toBe('מועדי הבחינה הפסיכומטרית');
  expect(dates?.itemListElement?.map(({ item }) => [item.name, item.startDate, item.url])).toEqual([
    [
      'הבחינה הפסיכומטרית — 4.12.2026',
      '2026-12-04',
      'https://www.nite.org.il/test-dates-and-prices/',
    ],
    [
      'הבחינה הפסיכומטרית — 6.12.2026',
      '2026-12-06',
      'https://www.nite.org.il/test-dates-and-prices/',
    ],
    [
      'הבחינה הפסיכומטרית — 18.4.2027',
      '2027-04-18',
      'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
    ],
    [
      'הבחינה הפסיכומטרית — 19.4.2027',
      '2027-04-19',
      'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
    ],
    [
      'הבחינה הפסיכומטרית — 1.7.2027',
      '2027-07-01',
      'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
    ],
    [
      'הבחינה הפסיכומטרית — 6.9.2027',
      '2027-09-06',
      'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
    ],
    [
      'הבחינה הפסיכומטרית — 7.9.2027',
      '2027-09-07',
      'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
    ],
    [
      'הבחינה הפסיכומטרית — 24.12.2027',
      '2027-12-24',
      'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
    ],
    [
      'הבחינה הפסיכומטרית — 26.12.2027',
      '2027-12-26',
      'https://www.nite.org.il/wp-content/uploads/2026/05/test-schedule-2027-he.pdf',
    ],
  ]);
  expect(dates?.itemListElement?.every(({ item }) => item['@type'] === 'Event')).toBe(true);
});

it('omits an answer when no verified registration is open and hides past rows', async () => {
  vi.useFakeTimers();
  vi.setSystemTime('2027-10-26T12:00:00Z');
  render(await Page());
  expect(screen.getByRole('main').textContent).not.toContain('המועד הפתוח הקרוב להרשמה:');
  expect(
    within(screen.getByRole('table', { name: 'מועדי פסיכומטרי' })).getAllByRole('row'),
  ).toHaveLength(2);
  expect(screen.queryByText('המועד הקרוב')).toBeNull();
});

it('exports exact indexable metadata and request-time rendering', () => {
  expect(dynamic).toBe('force-dynamic');
  expect(metadata).toMatchObject({
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'he_IL',
      siteName: 'MyWay',
    },
    twitter: { card: 'summary', title, description },
  });
  expect(metadata.robots).not.toEqual(expect.objectContaining({ index: false }));
});

it('keeps the dates as text without a schedule citation', async () => {
  const { container } = render(await Page());
  expect(screen.queryByRole('link', { name: /לוח הבחינות הרשמי/ })).toBeNull();
  expect(container.textContent).not.toContain('לוח הבחינות הרשמי');
  expect([...container.querySelectorAll('p')].every((p) => p.textContent?.trim())).toBe(true);
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 41)
  expect(
    screen.getByRole('link', { name: 'יש לכם ציון? בדקו לאן אתם מתקבלים' }).getAttribute('href'),
  ).toBe('/sekhem-calculator');
});
