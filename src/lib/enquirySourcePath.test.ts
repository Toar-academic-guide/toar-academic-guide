import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enquirySourcePath } from './enquirySourcePath';

describe('enquiry source route guard', () => {
  it.each([
    ['/680', '/'],
    ['/680?bagrut=105.5#what_if_750', '/'],
    ['/unknown', '/'],
    ['/programs/cs/extra', '/'],
    ['https://example.com/programs/cs', '/'],
    ['//example.com/programs/cs', '/'],
    ['/programs/cs', '/programs/cs'],
    ['/programs/cs?psychometric=680#score_680', '/programs/cs'],
    ['/institutions/tau', '/institutions/tau'],
    ['/app/calculator#inquiry', '/app/calculator'],
    ['/#inquiry', '/'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(enquirySourcePath(input)).toBe(expected);
  });
  it('recognizes every real app page, including dynamic route patterns', () => {
    const pages = readdirSync('src/app', { recursive: true, encoding: 'utf8' }).filter((path) =>
      /(?:^|\/)page\.tsx$/.test(path),
    );
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      const path = '/' + page.replace(/(?:^|\/)page\.tsx$/, '').replace(/\[[^/]+\]/g, 'example-id');
      expect(enquirySourcePath(path), page).toBe(path);
    }
  });
});
