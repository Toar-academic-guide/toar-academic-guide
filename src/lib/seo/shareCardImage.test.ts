import { describe, expect, it } from 'vitest';
import { renderShareCard } from './shareCardImage';
import { shareCards } from './shareCards';

describe('share card images', () => {
  it.each(Object.values(shareCards))('renders $id as a 1200×630 PNG', async (card) => {
    const response = await renderShareCard(card);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(response.headers.get('content-type')).toContain('image/png');
  });
});
