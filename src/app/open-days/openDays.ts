import 'server-only';

import { unstable_cache } from 'next/cache';
import seed from '@/data/openDays.initial.json';

export type OpenDay = Omit<(typeof seed)[number], 'startTime' | 'endTime'> & {
  startTime?: string;
  endTime?: string;
};
type BoardItem = {
  id: string;
  name: string;
  group: { id: string };
  column_values: {
    id: string;
    text: string | null;
    checked?: boolean;
    date?: string | null;
    value?: string | null;
  }[];
};

type BoardResponse = {
  data?: { boards: { items_page: { cursor: string | null; items: BoardItem[] } }[] };
  errors?: unknown[];
};

const columns = {
  date: 'date_mm8tddsr',
  endDate: 'date_mm8tgetv',
  checked: 'date_mm8tyvjz',
  institution: 'text_mm8te55d',
  source: 'text_mm8tyta5',
  registration: 'text_mm8t7kt9',
  place: 'text_mm8t6bcc',
  faculty: 'text_mm8txfhf',
  status: 'color_mm8te8s1',
  university: 'boolean_mm8th0tr',
} as const;

const query = `query OpenDays($cursor: String) {
  boards(ids: [18438707562]) {
    items_page(limit: 500, cursor: $cursor) {
      cursor
      items { id name group { id } column_values(ids: ${JSON.stringify(Object.values(columns))}) { id text ... on CheckboxValue { checked } ... on DateValue { date value } } }
    }
  }
}`;

function officialLink(value: string) {
  if (!URL.canParse(value)) return '';
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    ? url.href
    : '';
}

function israelDate(column?: BoardItem['column_values'][number]) {
  // Monday's displayed time depends on the API user's profile. Raw values are UTC.
  const raw: { date?: string; time?: string | null } = column?.value
    ? JSON.parse(column.value)
    : {};
  const date = raw.date || column?.date || column?.text || '';
  if (!raw.time) return { date, time: undefined };
  const instant = new Date(`${date}T${raw.time}Z`);
  if (!Number.isFinite(instant.getTime())) throw new Error('Invalid Open Days date');
  return {
    date: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant),
    time: new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(instant),
  };
}

function publishedEvents(items: BoardItem[]): OpenDay[] {
  const institutions = new Map(items.filter((i) => i.group.id === 'topics').map((i) => [i.id, i]));
  const events: OpenDay[] = [];
  for (const item of items) {
    if (item.group.id !== 'group_mm8t9en6') continue;
    const values = Object.fromEntries(item.column_values.map((v) => [v.id, v.text || '']));
    if (values[columns.status] !== 'Confirmed') continue;
    const institutionId = values[columns.institution]?.match(
      /\/boards\/18438707562\/pulses\/(\d+)\/?$/,
    )?.[1];
    const institution = institutionId && institutions.get(institutionId);
    const source = officialLink(values[columns.source]);
    const start = israelDate(item.column_values.find((v) => v.id === columns.date));
    const end = israelDate(item.column_values.find((v) => v.id === columns.endDate));
    const date = start.date;
    const endDate = end.date;
    if (!institution || !source || !date || !values[columns.checked]) continue;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      (endDate && (endDate < date || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)))
    )
      continue;
    const name = institution.name;
    events.push({
      id: item.id,
      title: item.name.startsWith(name + ' — ') ? item.name.slice(name.length + 3) : item.name,
      institution: name,
      university: institution.column_values.some(
        (v) => v.id === columns.university && v.checked === true,
      ),
      date,
      endDate,
      startTime: start.time,
      endTime: end.time,
      checked: values[columns.checked],
      place: values[columns.place],
      faculty: values[columns.faculty],
      source,
      registration: officialLink(values[columns.registration]),
    });
  }
  return events;
}

const readBoard = unstable_cache(
  async () => {
    const items: BoardItem[] = [];
    let cursor: string | null = null;
    do {
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          Authorization: process.env.MONDAY_API_TOKEN!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables: { cursor } }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Open Days board request failed');
      const body: BoardResponse = await response.json();
      const page = body.data?.boards?.[0]?.items_page;
      if (body.errors?.length || !page || !Array.isArray(page.items))
        throw new Error('Open Days board unavailable');
      items.push(...page.items);
      cursor = page.cursor;
    } while (cursor);
    return publishedEvents(items);
  },
  ['open-days-board-v3'],
  { revalidate: 900 },
);

export async function loadOpenDays(): Promise<OpenDay[]> {
  if (process.env.MONDAY_API_TOKEN) return readBoard();
  if (process.env.VERCEL_ENV === 'production')
    throw new Error('Missing Open Days board credentials');
  return seed;
}
