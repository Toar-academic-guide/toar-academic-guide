import 'server-only';

import { unstable_cache } from 'next/cache';
import seed from '@/data/openDays.initial.json';

export type OpenDay = (typeof seed)[number];
type BoardItem = {
  id: string;
  name: string;
  group: { id: string };
  column_values: { id: string; text: string | null; checked?: boolean }[];
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
      items { id name group { id } column_values(ids: ${JSON.stringify(Object.values(columns))}) { id text ... on CheckboxValue { checked } } }
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
    const endDate = values[columns.endDate];
    if (!institution || !source || !values[columns.date] || !values[columns.checked]) continue;
    if (endDate && endDate < values[columns.date]) continue;
    const name = institution.name;
    events.push({
      id: item.id,
      title: item.name.startsWith(name + ' — ') ? item.name.slice(name.length + 3) : item.name,
      institution: name,
      university: institution.column_values.some(
        (v) => v.id === columns.university && v.checked === true,
      ),
      date: values[columns.date],
      endDate,
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
  ['open-days-board-v2'],
  { revalidate: 900 },
);

export async function loadOpenDays(): Promise<OpenDay[]> {
  if (process.env.MONDAY_API_TOKEN) return readBoard();
  if (process.env.VERCEL_ENV === 'production')
    throw new Error('Missing Open Days board credentials');
  return seed;
}
