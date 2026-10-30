import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFDict, PDFName, StandardFonts } from 'pdf-lib';
import { readGlyphUnicodeMap, repairBagrutPdfFonts } from './bagrutPdfFontRepair';

// A small sfnt with hand-built cmap subtables, independent of fontkit.
function sfnt(subtables: Uint8Array[]) {
  const bytes = new Uint8Array(
    28 + 4 + subtables.length * 8 + subtables.reduce((n, s) => n + s.length, 0),
  );
  const view = new DataView(bytes.buffer);
  view.setUint16(4, 1);
  view.setUint32(12, 0x636d6170);
  view.setUint32(20, 28);
  view.setUint32(24, bytes.length - 28);
  view.setUint16(30, subtables.length);
  let offset = 4 + subtables.length * 8;
  subtables.forEach((table, index) => {
    view.setUint16(32 + index * 8, 0);
    view.setUint32(36 + index * 8, offset);
    bytes.set(table, 28 + offset);
    offset += table.length;
  });
  return bytes;
}
function format12(groups: [number, number, number][]) {
  const bytes = new Uint8Array(16 + groups.length * 12);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 12);
  view.setUint32(4, bytes.length);
  view.setUint32(12, groups.length);
  groups.forEach(([first, last, glyph], i) => {
    view.setUint32(16 + i * 12, first);
    view.setUint32(20 + i * 12, last);
    view.setUint32(24 + i * 12, glyph);
  });
  return bytes;
}
function format4() {
  const bytes = new Uint8Array(46);
  const v = new DataView(bytes.buffer);
  v.setUint16(0, 4);
  v.setUint16(2, bytes.length);
  v.setUint16(6, 6);
  // '4'/'5' use idDelta; final pe uses glyphIdArray plus idDelta.
  [0x35, 0x5e3, 0xffff].forEach((n, i) => v.setUint16(14 + i * 2, n));
  [0x34, 0x5e3, 0xffff].forEach((n, i) => v.setUint16(22 + i * 2, n));
  [-42, 3, 1].forEach((n, i) => v.setInt16(28 + i * 2, n));
  v.setUint16(36, 6);
  v.setUint16(42, 20);
  return bytes;
}

describe('embedded TrueType Unicode mapping', () => {
  it('reads format 4 delta and glyph-array mappings', () => {
    expect([...readGlyphUnicodeMap(sfnt([format4()]))]).toEqual([
      [10, 0x34],
      [11, 0x35],
      [23, 0x5e3],
    ]);
  });
  it('reads format 12 ranges, prefers Hebrew/ASCII over alternatives, and ignores PUA', () => {
    const mapping = readGlyphUnicodeMap(
      sfnt([
        format12([
          [0xe000, 0xe000, 10],
          [0x2000, 0x2000, 10],
          [0x34, 0x35, 10],
          [0x5e3, 0x5e3, 23],
          [0x1f600, 0x1f600, 30],
          [0xf0000, 0xf0000, 40],
        ]),
      ]),
    );
    expect([...mapping]).toEqual([
      [10, 0x34],
      [11, 0x35],
      [23, 0x5e3],
      [30, 0x1f600],
    ]);
  });
  it('skips malformed PDFs and fonts without modifying their bytes', async () => {
    const bad = new Uint8Array([0, 1, 2]);
    expect(await repairBagrutPdfFonts(bad)).toBe(bad);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage().drawText('Synthetic fixture', { font });
    const bytes = await doc.save();
    expect(await repairBagrutPdfFonts(bytes)).toBe(bytes);
  });
  it('leaves unsupported encodings and broken embedded fonts untouched', async () => {
    for (const mode of ['encoding', 'font'] as const) {
      const doc = await PDFDocument.load(
        await readFile(new URL('./__fixtures__/bagrut-pdf/synthetic-corrupt.pdf', import.meta.url)),
      );
      for (const [, object] of doc.context.enumerateIndirectObjects()) {
        if (!(object instanceof PDFDict)) continue;
        if (mode === 'encoding' && object.get(PDFName.of('Subtype')) === PDFName.of('Type0')) {
          object.set(PDFName.of('Encoding'), PDFName.of('Identity-V'));
        }
        if (mode === 'font' && object.get(PDFName.of('FontFile2'))) {
          object.set(
            PDFName.of('FontFile2'),
            doc.context.register(doc.context.flateStream(new Uint8Array([0]))),
          );
        }
      }
      const bytes = await doc.save();
      expect(await repairBagrutPdfFonts(bytes)).toBe(bytes);
    }
  });
});
