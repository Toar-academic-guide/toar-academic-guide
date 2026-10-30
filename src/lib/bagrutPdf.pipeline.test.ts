import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readBagrutPdfBytes } from './bagrutPdf';

const fixture = (filename = 'synthetic-corrupt.pdf') =>
  readFile(new URL(`./__fixtures__/bagrut-pdf/${filename}`, import.meta.url));
export const expectedSyntheticSubjects = [
  { label: 'מתמטיקה', units: 5, grade: 45 },
  { label: 'אנגלית', units: 4, grade: 54 },
  { label: 'תנ״ך', units: 2, grade: 84 },
  { label: 'מקצוע בדיקה עם ף', units: 5, grade: 55, unmatched: true },
];

describe('synthetic corrupted Ministry-style PDF', () => {
  it.each(['synthetic-corrupt.pdf', 'synthetic-nine-starred.pdf'])(
    'reproduces corruption in raw pdf.js extraction: %s',
    async (filename) => {
      const task = pdfjs.getDocument({
        data: new Uint8Array(await fixture(filename)),
        verbosity: 0,
      });
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
    },
  );

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

const expectedNineSubjects = [
  { label: 'מתמטיקה', units: 5, grade: 45 },
  { label: 'אנגלית', units: 4, grade: 54 },
  { label: 'תנ״ך', units: 2, grade: 84 },
  { label: 'פיסיקה', units: 5, grade: 90 },
  { label: 'ביולוגיה', units: 5, grade: 75 },
  { label: 'כימיה', units: 5, grade: 94 },
  { label: 'מדעי המחשב', units: 5, grade: 85 },
  { label: 'היסטוריה', units: 2, grade: 64 },
  { label: 'גלוף עץ עצוב וטכנולוגיה', units: 4, grade: 95 },
];

it.each(['synthetic-nine-starred.pdf', 'synthetic-nine-simple.pdf'])(
  'imports all nine synthetic subjects with canonical physics and no unmatched rows: %s',
  async (filename) => {
    const bytes = new Uint8Array(
      await readFile(new URL(`./__fixtures__/bagrut-pdf/${filename}`, import.meta.url)),
    );
    const ocr = vi.fn(async () => {
      throw new Error('Synthetic text PDF must not use OCR');
    });
    const found = await readBagrutPdfBytes(bytes, pdfjs, () => {}, ocr);
    expect(found).toHaveLength(9);
    expect(found).toEqual(expectedNineSubjects);
    expect(found.filter((row) => row.unmatched)).toHaveLength(0);
    expect(ocr).not.toHaveBeenCalled();
  },
);

it('does not bypass a broken starred table with simple lines', async () => {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.addPage();
  const page = {
    cleanup: vi.fn(),
    getTextContent: async () => ({
      items: [
        { str: '*', transform: [1, 0, 0, 1, 552, 500], width: 5 },
        { str: 'פיזיקה 5 90', transform: [1, 0, 0, 1, 400, 400], width: 90 },
      ],
    }),
  };
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({ numPages: 1, getPage: async () => page }),
    destroy: vi.fn(),
  }));
  const ocr = vi.fn(async () => []);
  expect(
    await readBagrutPdfBytes(
      await doc.save(),
      { getDocument } as unknown as Pick<typeof pdfjs, 'getDocument'>,
      () => {},
      ocr,
    ),
  ).toEqual([]);
  expect(ocr).toHaveBeenCalledOnce();
});

it('imports all nine QA plain PDF subjects with correct ranges and canonical physics without OCR', async () => {
  const ocr = vi.fn(async () => []);
  const found = await readBagrutPdfBytes(
    new Uint8Array(await fixture('synthetic-plain.pdf')),
    pdfjs,
    () => {},
    ocr,
  );
  expect(found).toEqual([
    { label: 'מתמטיקה', units: 4, grade: 88 },
    { label: 'אנגלית', units: 5, grade: 95 },
    { label: 'פיסיקה', units: 5, grade: 90 },
    { label: 'מדעי המחשב', units: 5, grade: 94 },
    { label: 'הבעה עברית', units: 2, grade: 88 },
    { label: 'תנ״ך', units: 2, grade: 85 },
    { label: 'ספרות', units: 2, grade: 90 },
    { label: 'היסטוריה', units: 2, grade: 87 },
    { label: 'אזרחות', units: 2, grade: 93 },
  ]);
  expect(found).toHaveLength(9);
  expect(found.filter((row) => row.unmatched)).toHaveLength(0);
  expect(ocr).not.toHaveBeenCalled();
});
