// Synthetic data only. Regenerate with: npx tsx scripts/generate-bagrut-fixture.mts
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFDict, PDFName, PDFRawStream, decodePDFRawStream, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const directory = new URL('../src/lib/__fixtures__/bagrut-pdf/', import.meta.url);
const fontBytes = await readFile(new URL('NotoSansHebrew.ttf', directory));
async function generateFixture(
  subjects: { label: string; units: number; grade: number }[],
  filename: string,
  simple = false,
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: false });
  doc.setTitle('Synthetic Bagrut fixture — invented data only');
  doc.setAuthor('MyWay test fixture');
  doc.setCreationDate(new Date('2026-01-01T00:00:00Z'));
  doc.setModificationDate(new Date('2026-01-01T00:00:00Z'));
  const perPage = Math.ceil(subjects.length / 2);
  for (let pageIndex = 0; pageIndex < 2; pageIndex++) {
    const page = doc.addPage([595.5, 842.2]);
    const draw = (text: string, x: number, y: number, size = 10) =>
      page.drawText(text, { x, y, size, font });
    const right = (text: string, x: number, y: number) =>
      draw(text, x - font.widthOfTextAtSize(text, 10), y);
    draw('גיליון בדיקה סינתטי', 350, 665, 14);
    draw('תלמיד בדיקה', 410, 635);
    draw('000000000', 410, 610);
    // The column header is deliberately graphical, not a text-layer anchor.
    page.drawRectangle({ x: 40, y: 560, width: 520, height: 18, color: rgb(0.9, 0.9, 0.9) });
    for (let index = 0; index < perPage; index++) {
      const subject = subjects[pageIndex * perPage + index];
      if (!subject) break;
      const y = 530 - index * Math.min(100, 320 / Math.max(1, perPage - 1));
      if (simple) {
        right(subject.label, 495, y);
        draw(String(subject.units), 313, y);
        draw(String(subject.grade), 103, y);
        continue;
      }
      draw('*', 552, y + (index === 0 ? 1 : -1));
      right(`99990${pageIndex * perPage + index}`, 544, y);
      right(subject.label, 495, y);
      right(`${subject.units} יח״ל`, 340, y);
      draw('רגיל', 240, y);
      draw(String(subject.grade).padStart(3, '0'), 103, y);
      draw('04/2024', 45, y);
      for (let module = 0; module < 2; module++) {
        const componentY = y - 24 * (module + 1);
        right('999999', 544, componentY);
        right(`${subject.label} (רמה רגילה)`, 495, componentY);
        if (module === 0) right('1/2 יח״ל', 340, componentY);
        draw('בחינה', 240, componentY);
        draw('095', 140, componentY);
        draw('05/2024', 45, componentY);
      }
    }
    if (!simple) {
      const hoursY = perPage > 2 ? 110 : 300;
      right('מעורבות חברתית', 495, hoursY);
      right('60 שעות', 340, hoursY);
      draw('100', 103, hoursY);
      draw('05/2024', 45, hoursY);
      if (pageIndex === 1)
        for (const x of [45, 103, 140, 240, 320, 410, 505, 552]) draw('*', x, hoursY - 40);
    }
    draw(`עמוד ${pageIndex + 1}`, 260, 29);
  }
  // Save/reload to materialize the font objects, then corrupt the ToUnicode only.
  const generated = await PDFDocument.load(await doc.save());
  const glyphFont = fontkit.create(fontBytes);
  const corruptions = new Map(
    ['4', '5', 'ף'].map((c) => [
      glyphFont.glyphForCodePoint(c.codePointAt(0)!).id.toString(16).padStart(4, '0'),
      c === 'ף' ? '0020' : '0030',
    ]),
  );
  for (const [, object] of simple ? [] : generated.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict) || object.get(PDFName.of('Subtype')) !== PDFName.of('Type0'))
      continue;
    const stream = object.lookup(PDFName.of('ToUnicode'));
    if (!(stream instanceof PDFRawStream)) throw new Error('Fixture font CMap missing');
    let cmap = new TextDecoder().decode(decodePDFRawStream(stream).decode());
    for (const [glyph, unicode] of corruptions) {
      cmap = cmap.replace(new RegExp(`<${glyph}>\\s*<[0-9a-f]+>`, 'gi'), `<${glyph}> <${unicode}>`);
    }
    object.set(
      PDFName.of('ToUnicode'),
      generated.context.register(generated.context.flateStream(cmap)),
    );
  }
  await writeFile(new URL(filename, directory), await generated.save());
  console.log(
    `Generated synthetic fixture: ${subjects.length} subjects, 2 pages (${fileURLToPath(directory)})`,
  );
}

await generateFixture(
  [
    { label: 'מתמטיקה', units: 5, grade: 45 },
    { label: 'אנגלית', units: 4, grade: 54 },
    { label: 'תנ״ך', units: 2, grade: 84 },
    { label: 'מקצוע בדיקה עם ף', units: 5, grade: 55 },
  ],
  'synthetic-corrupt.pdf',
);

const nineSubjects = [
  { label: 'מתמטיקה', units: 5, grade: 45 },
  { label: 'אנגלית', units: 4, grade: 54 },
  { label: 'תנ״ך', units: 2, grade: 84 },
  { label: 'פיזיקה', units: 5, grade: 90 },
  { label: 'ביולוגיה', units: 5, grade: 75 },
  { label: 'כימיה', units: 5, grade: 94 },
  { label: 'מדעי המחשב', units: 5, grade: 85 },
  { label: 'היסטוריה ותע״י', units: 2, grade: 64 },
  { label: 'גלוף עץ עצוב וטכנולוגיה', units: 4, grade: 95 },
];
await generateFixture(nineSubjects, 'synthetic-nine-starred.pdf');
await generateFixture(nineSubjects, 'synthetic-nine-simple.pdf', true);
