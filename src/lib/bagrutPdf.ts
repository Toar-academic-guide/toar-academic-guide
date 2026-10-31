import { resolveBagrutWizardSubject } from '@/utils/bagrutSubjectRecord';
import { normalizeBagrutPdfSubject as normalize } from './bagrutPdfSubjectName';
import type { PDFPageProxy } from 'pdfjs-dist';

export interface ExtractedGrade {
  label: string;
  units: number | '';
  grade: number | '';
  unmatched?: boolean;
}
export interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width?: number;
  fontName?: string;
  bold?: boolean;
}
function subjectLabel(raw: string): Pick<ExtractedGrade, 'label' | 'unmatched'> {
  const subject = resolveBagrutWizardSubject(normalize(raw));
  return subject ? { label: subject.label } : { label: raw.trim(), unmatched: true };
}
const right = (item: PositionedItem) => item.x + (item.width ?? 0);
const isStars = (item: PositionedItem) => /^[*\s]+$/.test(item.str);

function groupRows(items: PositionedItem[]) {
  const rows: { y: number; items: PositionedItem[] }[] = [];
  for (const item of items
    .filter((item) => item.str.trim() && !isStars(item))
    .sort((a, b) => b.y - a.y)) {
    const row = rows.find((row) => Math.abs(row.y - item.y) <= 3);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  return rows;
}

function unitsCell(items: PositionedItem[]) {
  const unitLabel = items.find((item) => /יח["״׳']?ל/.test(item.str));
  if (!unitLabel) return;
  // pdf.js may emit the count and the label together or as adjacent spans.
  const nearby = items.filter(
    (item) => Math.abs(item.x - unitLabel.x) <= Math.max(35, (unitLabel.width ?? 0) + 10),
  );
  const text = nearby
    .sort((a, b) => b.x - a.x)
    .map((item) => item.str)
    .join(' ');
  const match =
    text.match(/(?:^|\s)(\d+(?:\/\d+)?)\s*יח["״׳']?ל(?:\s|$)/) ??
    text.match(/יח["״׳']?ל\s*(\d+(?:\/\d+)?)(?:\s|$)/);
  return {
    x: unitLabel.x,
    end: Math.max(...nearby.map(right)),
    units: match ? Number(match[1]) : NaN,
  };
}

export function parseBagrutTable(pages: PositionedItem[][]) {
  const subjects: ExtractedGrade[] = [];
  let starredRows = 0;
  let invalid = false;
  for (const items of pages) {
    const rows = groupRows(items);
    const starred = new Set<(typeof rows)[number]>();
    for (const marker of items.filter((item) => item.str.trim() === '*')) {
      // A row made entirely of stars is the Ministry's terminator, not a subject.
      const band = items.filter((item) => item.str.trim() && Math.abs(item.y - marker.y) <= 3);
      if (band.every(isStars) && band.length > 1) continue;
      const nearest = rows.reduce<(typeof rows)[number] | undefined>(
        (best, row) =>
          !best || Math.abs(row.y - marker.y) < Math.abs(best.y - marker.y) ? row : best,
        undefined,
      );
      if (!nearest || Math.abs(nearest.y - marker.y) > 3) {
        starredRows++;
        invalid = true;
        continue;
      }
      // Stars must be on the right of the table, outside its subject/code cells.
      if (nearest.items.some((item) => item.x > marker.x)) continue;
      starred.add(nearest);
    }
    const candidates = [...starred].map((row) => {
      const cell = unitsCell(row.items);
      const grades = row.items.filter(
        (item) => /^\d{3}$/.test(item.str.trim()) && (!cell || right(item) < cell.x),
      );
      return { row, cell, grades };
    });
    const finalX = Math.min(...candidates.flatMap(({ grades }) => grades.map((item) => item.x)));
    for (const { row, cell, grades } of candidates) {
      starredRows++;
      const gradeItems = grades.filter((item) => Math.abs(item.x - finalX) <= 6);
      const code = row.items.find((item) => /^\d{6}$/.test(item.str.trim()));
      const name = cell
        ? row.items
            .filter(
              (item) =>
                item.x >= cell.end && (!code || right(item) <= code.x) && /[א-ת]/.test(item.str),
            )
            .sort((a, b) => b.x - a.x)
            .map((item) => item.str)
            .join(' ')
            .trim()
        : '';
      const grade = gradeItems.length === 1 ? Number(gradeItems[0].str) : NaN;
      if (
        !cell ||
        !Number.isInteger(cell.units) ||
        cell.units < 1 ||
        cell.units > 10 ||
        !name ||
        !Number.isInteger(grade) ||
        grade < 0 ||
        grade > 100 ||
        row.items.some((item) => /שעות/.test(item.str))
      ) {
        invalid = true;
        continue;
      }
      subjects.push({ ...subjectLabel(name), units: cell.units, grade });
    }
  }
  return {
    subjects,
    starredRows,
    valid: starredRows > 0 && !invalid && subjects.length === starredRows,
  };
}

export function parseSimpleBagrutLines(lines: string[]): ExtractedGrade[] {
  const rows = lines.flatMap((line) => {
    const text = line.trim().replace(/\s+/g, ' ');
    const forward = text.match(/^(.+?)\s+(\d{1,3})\s+(\d{1,3})$/);
    const reverse = text.match(/^(\d{1,3})\s+(\d{1,3})\s+(.+)$/);
    const name = forward?.[1] ?? reverse?.[3] ?? '';
    if (!/[א-ת]/.test(name) || /[\d*]/.test(normalize(name)) || /שעות|יח["״׳']?ל/.test(name))
      return [];
    // Normalize both text directions to distance from the subject name.
    const adjacent = Number(forward?.[2] ?? reverse?.[2]);
    const far = Number(forward?.[3] ?? reverse?.[1]);
    const interpretations = [
      { units: adjacent, grade: far, unitsAdjacent: true },
      { units: far, grade: adjacent, unitsAdjacent: false },
    ].filter(
      ({ units, grade }) =>
        Number.isInteger(units) &&
        units >= 1 &&
        units <= 5 &&
        Number.isInteger(grade) &&
        grade >= 0 &&
        grade <= 100,
    );
    return interpretations.length ? [{ ...subjectLabel(name), interpretations }] : [];
  });
  const orders = new Set(
    rows.flatMap(({ interpretations }) =>
      interpretations.length === 1 && interpretations[0].grade > 5
        ? [interpretations[0].unitsAdjacent]
        : [],
    ),
  );
  const order = orders.size === 1 ? [...orders][0] : undefined;
  return rows.map(({ interpretations, ...subject }) => {
    const resolved =
      interpretations.length === 1 || interpretations[0].units === interpretations[1].units
        ? interpretations[0]
        : interpretations.find(({ unitsAdjacent }) => unitsAdjacent === order);
    return resolved
      ? { ...subject, units: resolved.units, grade: resolved.grade }
      : { ...subject, units: '', grade: '', unmatched: true };
  });
}

type RecognizePage = (
  page: PDFPageProxy,
  pageNumber: number,
  pageCount: number,
) => Promise<PositionedItem[]>;

export async function readBagrutPdfBytes(
  bytes: Uint8Array,
  pdfjs: Pick<typeof import('pdfjs-dist'), 'getDocument'>,
  onProgress: (message: string) => void,
  recognizePage: RecognizePage,
): Promise<ExtractedGrade[]> {
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error('אפשר להעלות PDF עד 15MB.');
  const { repairBagrutPdfFonts } = await import('./bagrutPdfFontRepair');
  const task = pdfjs.getDocument({ data: await repairBagrutPdfFonts(bytes), verbosity: 0 });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 8) throw new Error('בחרו גיליון ציונים של עד 8 עמודים.');
    const pages: PositionedItem[][] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      onProgress(`קוראים עמוד ${number} מתוך ${pdf.numPages}…`);
      const page = await pdf.getPage(number);
      try {
        const text = await page.getTextContent();
        pages.push(
          text.items.flatMap((item) =>
            'str' in item
              ? [
                  {
                    str: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    width: item.width,
                    fontName: item.fontName,
                  },
                ]
              : [],
          ),
        );
      } finally {
        page.cleanup();
      }
    }
    const parsed = parseBagrutTable(pages);
    if (parsed.valid) return parsed.subjects;
    if (parsed.starredRows === 0) {
      const simple = parseSimpleBagrutLines(
        pages.flatMap((items) =>
          groupRows(items).map(({ items: row }) =>
            row
              .sort((a, b) => b.x - a.x)
              .flatMap((item) => item.str.trim().split(/\s+/))
              .join(' '),
          ),
        ),
      );
      if (simple.length) return simple;
    }
    const scanned: PositionedItem[][] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      onProgress(`סורקים עמוד ${number} מתוך ${pdf.numPages}…`);
      const page = await pdf.getPage(number);
      try {
        scanned.push(await recognizePage(page, number, pdf.numPages));
      } finally {
        page.cleanup();
      }
    }
    const ocr = parseBagrutTable(scanned);
    return ocr.valid ? ocr.subjects : [];
  } finally {
    await task.destroy();
  }
}

export async function readBagrutPdf(file: File, onProgress: (message: string) => void) {
  if (file.size > 15 * 1024 * 1024) throw new Error('אפשר להעלות PDF עד 15MB.');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | undefined;
  try {
    return await readBagrutPdfBytes(
      new Uint8Array(await file.arrayBuffer()),
      pdfjs,
      onProgress,
      async (page) => {
        const { createWorker } = await import('tesseract.js');
        worker ??= await createWorker(['heb', 'eng']);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, 2200 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        try {
          await page.render({ canvas, viewport }).promise;
          const result = await worker.recognize(canvas, {}, { tsv: true });
          // Convert OCR's top-down pixel boxes to PDF-like baseline coordinates.
          return (result.data.tsv ?? '')
            .split('\n')
            .slice(1)
            .flatMap((line) => {
              const fields = line.split('\t');
              if (fields[0] !== '5' || !fields[11]?.trim()) return [];
              return [
                {
                  str: fields[11],
                  x: Number(fields[6]) / scale,
                  y: -(Number(fields[7]) + Number(fields[9])) / scale,
                  width: Number(fields[8]) / scale,
                },
              ];
            });
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      },
    );
  } finally {
    await worker?.terminate();
  }
}
