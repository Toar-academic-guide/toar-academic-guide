// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { readBagrutPdf } from './bagrutPdf';

const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), createWorker: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ getDocument: mocks.getDocument, GlobalWorkerOptions: {} }));
vi.mock('tesseract.js', () => ({ createWorker: mocks.createWorker }));

const header =
  'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
const tsv = [
  header,
  ...[
    ['*', 552, 5],
    ['999900', 505, 35],
    ['אנגלית', 410, 80],
    ['5', 339, 5],
    ['יח״ל', 313, 20],
    ['054', 103, 15],
    ['04/2024', 45, 30],
  ].map(
    ([str, x, width]) =>
      `5\t1\t1\t1\t1\t1\t${Number(x) * 2}\t200\t${Number(width) * 2}\t20\t99\t${str}`,
  ),
].join('\n');

describe('browser OCR resource lifecycle', () => {
  it.each([false, true])(
    'renders locally, parses TSV, and releases worker/canvas (failure=%s)',
    async (fail) => {
      const cleanup = vi.fn(),
        destroy = vi.fn(),
        terminate = vi.fn();
      let canvas: HTMLCanvasElement | undefined;
      const page = {
        cleanup,
        getTextContent: async () => ({ items: [] }),
        getViewport: ({ scale }: { scale: number }) => ({
          width: 595 * scale,
          height: 842 * scale,
        }),
        render: vi.fn((options: { canvas: HTMLCanvasElement }) => {
          canvas = options.canvas;
          return { promise: Promise.resolve() };
        }),
      };
      mocks.getDocument.mockReturnValue({
        promise: Promise.resolve({ numPages: 1, getPage: async () => page }),
        destroy,
      });
      const recognize = vi.fn(async () => {
        if (fail) throw new Error('Synthetic OCR error');
        return { data: { tsv } };
      });
      mocks.createWorker.mockResolvedValue({ recognize, terminate });
      const doc = await PDFDocument.create();
      doc.addPage();
      const bytes = await doc.save();
      const file = { size: bytes.length, arrayBuffer: async () => bytes.buffer } as File;
      if (fail) await expect(readBagrutPdf(file, () => {})).rejects.toThrow('Synthetic OCR error');
      else
        expect(await readBagrutPdf(file, () => {})).toEqual([
          { label: 'אנגלית', units: 5, grade: 54 },
        ]);
      expect(mocks.createWorker).toHaveBeenCalledWith(['heb', 'eng']);
      expect(terminate).toHaveBeenCalledOnce();
      expect(destroy).toHaveBeenCalledOnce();
      expect(cleanup).toHaveBeenCalledTimes(2);
      expect(canvas?.width).toBe(0);
      expect(canvas?.height).toBe(0);
    },
  );
});
