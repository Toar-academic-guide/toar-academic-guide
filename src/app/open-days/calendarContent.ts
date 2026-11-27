import type { OpenDay } from './openDays';

export const unannouncedInstitutions = [
  { name: 'הטכניון - מכון טכנולוגי לישראל', university: true },
  { name: 'אוניברסיטת אריאל בשומרון', university: true },
  { name: 'המכללה האקדמית תל אביב-יפו', university: false },
];

const dateFormat = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function dateText(event: Pick<OpenDay, 'date' | 'endDate'>) {
  const first = new Date(`${event.date}T12:00:00Z`);
  return event.endDate && event.endDate !== event.date
    ? dateFormat.formatRange(first, new Date(`${event.endDate}T12:00:00Z`))
    : dateFormat.format(first);
}

export function timeText(event: OpenDay) {
  return event.startTime ? `${event.startTime}${event.endTime ? `–${event.endTime}` : ''}` : '';
}

export function isOnline(event: OpenDay) {
  return /^(זום|zoom|אונליין)$/i.test(event.place.trim());
}

export function calendarSummary(events: OpenDay[]) {
  const universities = Map.groupBy(
    events.filter((event) => event.university && event.date.startsWith('2027-')),
    (event) => event.institution,
  );
  const dates = Array.from(
    universities.values(),
    (rows) => rows.find((row) => !isOnline(row)) ?? rows[0],
  )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => `${event.institution} ב-${dateText(event)}${isOnline(event) ? ' בזום' : ''}`);
  const pending = unannouncedInstitutions.filter(
    (row) => !events.some((event) => event.institution === row.name),
  );
  return [
    dates.length
      ? `בין הימים הפתוחים שפורסמו לשנת 2027: ${dates.join('; ')}.`
      : 'כרגע אין מועדי ימים פתוחים באוניברסיטאות לשנת 2027 להצגה.',
    pending.length ? `${pending.map((row) => row.name).join(', ')} — טרם פורסם מועד.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function calendarFaq(events: OpenDay[]) {
  const online = events.filter((event) => isOnline(event));
  return [
    { question: 'מתי הימים הפתוחים באוניברסיטאות ל-2027?', answer: calendarSummary(events) },
    {
      question: 'יש ימים פתוחים בזום?',
      answer: online.length
        ? `כן. ${online.map((event) => `${event.institution}: ${event.title}, ${dateText(event)}${timeText(event) ? ` בשעות ${timeText(event)}` : ''}`).join('; ')}.`
        : 'כרגע לא מוצגים מועדים קרובים בזום.',
    },
    {
      question: 'מה עושים אם המוסד עוד לא פרסם תאריך?',
      answer:
        'בטבלה מסומן ״טרם פורסם״ ליד מוסדות שעוד לא פרסמו מועד לשנה הזו, ונוסיף את התאריך כשיתפרסם. בינתיים אפשר לבדוק את הסכם שלכם במחשבון הסכם.',
      link: { href: '/sekhem-calculator', text: 'מחשבון הסכם' },
    },
    {
      question: 'מתי מבחני הפסיכומטרי הקרובים?',
      answer: 'המועדים הקרובים ותאריכי פרסום הציונים מרוכזים בעמוד מועדי הפסיכומטרי.',
      link: { href: '/psychometric-dates', text: 'מועדי הפסיכומטרי' },
    },
  ];
}

function datedTime(date: string, time?: string) {
  if (!time) return date;
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')!.value;
  return `${date}T${time}:00+${offset.replace('GMT+', '').padStart(2, '0')}:00`;
}

export function eventSchema(event: OpenDay) {
  // An absent venue is not permission to invent the institution's campus.
  if (!event.place.trim()) return null;
  const online = isOnline(event);
  return {
    '@type': 'Event',
    '@id': `https://findmyway.co.il/open-days#event-${event.id}`,
    name: `${event.title} — ${event.institution}`,
    startDate: datedTime(event.date, event.startTime),
    ...(event.endDate ? { endDate: datedTime(event.endDate, event.endTime) } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: `https://schema.org/${online ? 'OnlineEventAttendanceMode' : 'OfflineEventAttendanceMode'}`,
    location: online
      ? { '@type': 'VirtualLocation', url: event.source }
      : {
          '@type': 'Place',
          name: event.place,
          address: { '@type': 'PostalAddress', streetAddress: event.place, addressCountry: 'IL' },
        },
    organizer: { '@type': 'CollegeOrUniversity', name: event.institution },
    url: event.source,
  };
}
