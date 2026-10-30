import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readBagrutPdfBytes } from './bagrutPdf';

const normalize = (s: string) =>
  s
    .replace(/[״׳"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

describe.skipIf(!process.env.BAGRUT_PRIVATE_PDF || !!process.env.CI)('local private PDF', () => {
  it('compares privately with count-only output', async () => {
    let expectedCount = 0,
      parsedCount = 0,
      matched = 0,
      mismatched = 0,
      passed = false;
    // Suppress third-party diagnostics as well as exception/assertion payloads.
    const silent = ['log', 'warn', 'error', 'info', 'debug'] as const;
    const spies = silent.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
    try {
      const path = process.env.BAGRUT_PRIVATE_PDF!;
      if (!/\.pdf$/i.test(path)) throw new Error('Private input must be PDF');
      const expected = JSON.parse(
        await readFile(path.replace(/\.pdf$/i, '.expected.json'), 'utf8'),
      ) as {
        subjects: { name: string; units: number; grade: number }[];
      };
      expectedCount = expected.subjects.length;
      const parsed = await readBagrutPdfBytes(
        new Uint8Array(await readFile(path)),
        pdfjs,
        () => {},
        async () => {
          throw new Error('Private text extraction failed sanity');
        },
      );
      parsedCount = parsed.length;
      const byName = new Map(parsed.map((row) => [normalize(row.label), row]));
      for (const row of expected.subjects) {
        const actual = byName.get(normalize(row.name));
        if (actual?.units === row.units && actual.grade === row.grade) matched++;
        else mismatched++;
      }
      passed =
        expectedCount > 0 &&
        expectedCount === parsedCount &&
        byName.size === parsedCount &&
        mismatched === 0;
    } catch {
      passed = false;
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    console.log(
      `expected ${expectedCount}, parsed ${parsedCount}, matched ${matched}, mismatched ${mismatched}`,
    );
    expect(passed).toBe(true);
  });
});
