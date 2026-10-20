import { ALL_SUBJECTS, SECTORS } from '@/data/bagrutSubjects';

export interface ExtractedGrade {
  label: string;
  units: number;
  grade: number;
}
const normalize = (value: string) =>
  value
    .replace(/["׳״']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const labels = [
  ...new Set([
    ...ALL_SUBJECTS,
    ...Object.values(SECTORS).flatMap((subjects) => subjects.map((subject) => subject.n)),
  ]),
].sort((a, b) => b.length - a.length);

export function parseGradeLines(lines: string[]): ExtractedGrade[] {
  return lines.flatMap((line) => {
    const normalized = normalize(line);
    const label = labels.find((candidate) => normalized.includes(normalize(candidate)));
    if (!label) return [];
    const values = (normalized.match(/(?<!\d)\d{1,3}(?!\d)/g) ?? []).map(Number);
    const units = values.filter((value) => value >= 1 && value <= 5);
    const grades = values.filter((value) => value > 5 && value <= 100);
    // More than one potential grade could mean exam/module marks, not the final subject mark.
    if (units.length !== 1 || grades.length !== 1) return [];
    return [{ label, units: units[0], grade: grades[0] }];
  });
}

export async function readBagrutPdf(file: File, onProgress: (message: string) => void) {
  if (file.size > 15 * 1024 * 1024) throw new Error('אפשר להעלות PDF עד 15MB.');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | undefined;
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 8) throw new Error('בחרו גיליון ציונים של עד 8 עמודים.');
    const rows: ExtractedGrade[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress(`קוראים עמוד ${pageNumber} מתוך ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNumber);
      const text = await page.getTextContent();
      const lines = new Map<number, { x: number; text: string }[]>();
      for (const item of text.items) {
        if (!('str' in item)) continue;
        const y = Math.round(item.transform[5] / 4) * 4;
        const line = lines.get(y) ?? [];
        line.push({ x: item.transform[4], text: item.str });
        lines.set(y, line);
      }
      const extracted = parseGradeLines(
        [...lines.values()].map((line) =>
          line
            .sort((a, b) => b.x - a.x)
            .map((part) => part.text)
            .join(' '),
        ),
      );
      if (extracted.length) rows.push(...extracted);
      else {
        onProgress(`סורקים עמוד ${pageNumber} מתוך ${pdf.numPages}…`);
        const { createWorker } = await import('tesseract.js');
        worker ??= await createWorker(['heb', 'eng']);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: Math.min(2, 2200 / Math.max(base.width, base.height)),
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const result = await worker.recognize(canvas);
        rows.push(...parseGradeLines(result.data.text.split('\n')));
        canvas.width = 0;
        canvas.height = 0;
      }
      page.cleanup();
    }
    return rows;
  } finally {
    await worker?.terminate();
    await task.destroy();
  }
}
