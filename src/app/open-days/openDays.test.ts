import { afterEach, expect, it, vi } from 'vitest';
import { loadOpenDays } from './openDays';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (loader: () => unknown) => loader }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('joins confirmed events to institutions across pages and removes cancellations', async () => {
  vi.stubEnv('MONDAY_API_TOKEN', 'test-token');
  const event = (id: string, status: string) => ({
    id,
    name: 'מוסד — יום פתוח',
    group: { id: 'group_mm8t9en6' },
    column_values: Object.entries({
      color_mm8te8s1: status,
      text_mm8te55d: 'https://malichi-hub.monday.com/boards/18438707562/pulses/7',
      date_mm8tddsr: '2027-01-01',
      date_mm8tyvjz: '2026-11-05',
      text_mm8tyta5: 'https://example.edu/open',
      text_mm8t7kt9: '',
    }).map(([id, text]) => ({ id, text })),
  });
  const page = (items: unknown[], cursor: string | null) =>
    Response.json({ data: { boards: [{ items_page: { items, cursor } }] } });
  const request = vi
    .fn()
    .mockResolvedValueOnce(page([event('8', 'Confirmed'), event('9', 'Cancelled')], 'next'))
    .mockResolvedValueOnce(
      page(
        [
          {
            id: '7',
            name: 'מוסד',
            group: { id: 'topics' },
            column_values: [{ id: 'boolean_mm8th0tr', text: 'v', checked: true }],
          },
        ],
        null,
      ),
    );
  vi.stubGlobal('fetch', request);
  const events = await loadOpenDays();
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    id: '8',
    title: 'יום פתוח',
    institution: 'מוסד',
    university: true,
    source: 'https://example.edu/open',
    registration: '',
  });
  expect(JSON.parse(request.mock.calls[1][1].body).variables.cursor).toBe('next');
});
