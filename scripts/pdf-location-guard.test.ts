import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { disallowedPdfPaths } from './pdf-location-guard.mjs';

describe('PDF privacy guard', () => {
  it('allows only synthetic fixtures and admissions evidence PDFs', () => {
    expect(
      disallowedPdfPaths([
        'src/lib/__fixtures__/bagrut-pdf/synthetic.pdf',
        'docs/admissions-verification/evidence/test.pdf',
        'private/transcript.pdf',
        'src/transcript.PDF',
        'src/lib/__fixtures__/bagrut-pdf/nested/transcript.pdf',
      ]),
    ).toEqual([
      'private/transcript.pdf',
      'src/transcript.PDF',
      'src/lib/__fixtures__/bagrut-pdf/nested/transcript.pdf',
    ]);
  });
  it('contains no tracked or staged PDF outside the approved directories', () => {
    const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
    expect(disallowedPdfPaths(paths).length).toBe(0);
  });
});
