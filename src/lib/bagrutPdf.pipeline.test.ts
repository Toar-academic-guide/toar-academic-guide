import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readBagrutPdfBytes } from './bagrutPdf';

const fixture = () =>
  readFile(new URL('./__fixtures__/bagrut-pdf/synthetic-corrupt.pdf', import.meta.url));
export const expectedSyntheticSubjects = [
  { label: 'מתמטיקה', units: 5, grade: 45 },
  { label: 'אנגלית', units: 4, grade: 54 },
  { label: 'תנ״ך', units: 2, grade: 84 },
  { label: 'מקצוע בדיקה עם ף', units: 5, grade: 55, unmatched: true },
];

describe('synthetic corrupted Ministry-style PDF', () => {
  it('reproduces digit and final-pe corruption in raw pdf.js extraction', async () => {
    const task = pdfjs.getDocument({ data: new Uint8Array(await fixture()), verbosity: 0 });
    try {
      const pdf = await task.promise;
      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, i) => {
          const text = await (await pdf.getPage(i + 1)).getTextContent();
          return text.items.flatMap((item) => ('str' in item ? [item.str] : []));
        }),
      );
      const text = pages.flat().join(' ');
      expect(text).not.toContain('045');
      expect(text).not.toContain('054');
      expect(text).not.toContain('ף');
      expect(text).toContain('000');
    } finally {
      await task.destroy();
    }
  });

  it('repairs embedded font maps and imports exactly the final subjects without OCR', async () => {
    const ocr = vi.fn(async () => {
      throw new Error('Valid text PDF must not use OCR');
    });
    expect(await readBagrutPdfBytes(new Uint8Array(await fixture()), pdfjs, () => {}, ocr)).toEqual(
      expectedSyntheticSubjects,
    );
    expect(ocr).not.toHaveBeenCalled();
  });
});

describe('document-wide OCR fallback', () => {
  const positioned = (grade = '054') => [
    { str: '*', x: 552, y: 501 },
    { str: '999900', x: 505, y: 500 },
    { str: 'אנגלית', x: 410, y: 500, width: 80 },
    { str: '5 יח״ל', x: 313, y: 500, width: 30 },
    { str: grade, x: 103, y: 500 },
    { str: '04/2024', x: 45, y: 500 },
  ];
  it('rescans every page when one starred text row is invalid, and cleans up', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.addPage();
    const extracted = [positioned(), positioned('101')];
    const cleanup = vi.fn();
    const destroy = vi.fn();
    const pages = extracted.map((items) => ({
      cleanup,
      getTextContent: async () => ({
        items: items.map((item) => ({
          str: item.str,
          transform: [1, 0, 0, 1, item.x, item.y],
          width: item.width,
        })),
      }),
    }));
    const getDocument = vi.fn(() => ({
      promise: Promise.resolve({ numPages: 2, getPage: async (n: number) => pages[n - 1] }),
      destroy,
    }));
    const ocr = vi.fn(async () => positioned('045'));
    const result = await readBagrutPdfBytes(
      await doc.save(),
      { getDocument } as unknown as Pick<typeof pdfjs, 'getDocument'>,
      () => {},
      ocr,
    );
    expect(result.map((row) => row.grade)).toEqual([45, 45]);
    expect(ocr).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(4);
    expect(destroy).toHaveBeenCalledOnce();
  });
  it('runs OCR for an image-only PDF, and cleans up if recognition fails', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    const ocr = vi.fn(async () => positioned('000'));
    expect(await readBagrutPdfBytes(bytes.slice(), pdfjs, () => {}, ocr)).toEqual([
      { label: 'אנגלית', units: 5, grade: 0 },
    ]);
    const fail = async () => {
      throw new Error('Synthetic OCR failure');
    };
    await expect(readBagrutPdfBytes(bytes.slice(), pdfjs, () => {}, fail)).rejects.toThrow(
      'Synthetic OCR failure',
    );
  });
  it('returns no partial rows when OCR is structurally invalid', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage();
    expect(
      await readBagrutPdfBytes(
        await doc.save(),
        pdfjs,
        () => {},
        async () => positioned('101'),
      ),
    ).toEqual([]);
  });
});
