// CIDToGIDMap /Identity makes the PDF character code the TrueType glyph id.
// Read only Unicode cmap formats 4/12; no font engine is needed at runtime.
export function readGlyphUnicodeMap(bytes: Uint8Array): Map<number, number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset);
  const u32 = (offset: number) => view.getUint32(offset);
  let cmapOffset = 0;
  let cmapLength = 0;
  for (let index = 0; index < u16(4); index++) {
    const offset = 12 + index * 16;
    if (u32(offset) === 0x636d6170) {
      cmapOffset = u32(offset + 8);
      cmapLength = u32(offset + 12);
      break;
    }
  }
  if (!cmapOffset || cmapOffset + cmapLength > bytes.length) return new Map();
  const cmap = new DataView(bytes.buffer, bytes.byteOffset + cmapOffset, cmapLength);
  const result = new Map<number, number>();
  const rank = (code: number) =>
    (code >= 0x20 && code <= 0x7e) || (code >= 0x5d0 && code <= 0x5ea) ? 0 : 1;
  const add = (glyph: number, code: number) => {
    if (
      !glyph ||
      glyph > 0xffff ||
      code < 0x20 ||
      code > 0x10ffff ||
      (code >= 0xd800 && code <= 0xf8ff) ||
      (code & 0xffff) >= 0xfffe ||
      (code >= 0xf0000 && code <= 0x10fffd)
    )
      return;
    const previous = result.get(glyph);
    if (
      previous === undefined ||
      rank(code) < rank(previous) ||
      (rank(code) === rank(previous) && code < previous)
    )
      result.set(glyph, code);
  };
  const seen = new Set<number>();
  for (let index = 0; index < cmap.getUint16(2); index++) {
    const record = 4 + index * 8;
    const platform = cmap.getUint16(record);
    const encoding = cmap.getUint16(record + 2);
    if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10))) continue;
    const start = cmap.getUint32(record + 4);
    if (seen.has(start)) continue;
    seen.add(start);
    const format = cmap.getUint16(start);
    if (format !== 4 && format !== 12) continue;
    const length = format === 4 ? cmap.getUint16(start + 2) : cmap.getUint32(start + 4);
    if (start + length > cmapLength) throw new Error('Invalid cmap bounds');
    const table = new DataView(cmap.buffer, cmap.byteOffset + start, length);
    if (format === 12) {
      const groups = table.getUint32(12);
      for (let group = 0; group < groups; group++) {
        const offset = 16 + group * 12;
        const first = table.getUint32(offset);
        const last = table.getUint32(offset + 4);
        const glyph = table.getUint32(offset + 8);
        if (first > last || last > 0x10ffff) throw new Error('Invalid cmap group');
        for (let code = first; code <= last && glyph + code - first <= 0xffff; code++)
          add(glyph + code - first, code);
      }
    } else {
      const count = table.getUint16(6) / 2;
      for (let segment = 0; segment < count; segment++) {
        const last = table.getUint16(14 + segment * 2);
        const first = table.getUint16(16 + count * 2 + segment * 2);
        const delta = table.getInt16(16 + count * 4 + segment * 2);
        const rangeAddress = 16 + count * 6 + segment * 2;
        const range = table.getUint16(rangeAddress);
        for (let code = first; code <= last && code !== 0xffff; code++) {
          const glyph = range ? table.getUint16(rangeAddress + range + (code - first) * 2) : code;
          if (glyph) add((glyph + delta) & 0xffff, code);
        }
      }
    }
  }
  return result;
}

function toUnicodeCmap(mapping: Map<number, number>): string {
  const hex = (n: number) => n.toString(16).padStart(4, '0');
  const unicode = (n: number) =>
    n <= 0xffff
      ? hex(n)
      : hex(0xd800 + ((n - 0x10000) >> 10)) + hex(0xdc00 + ((n - 0x10000) & 0x3ff));
  const entries = [...mapping].sort(([a], [b]) => a - b);
  const blocks: string[] = [];
  for (let offset = 0; offset < entries.length; offset += 100) {
    const block = entries.slice(offset, offset + 100);
    blocks.push(
      `${block.length} beginbfchar\n${block.map(([glyph, code]) => `<${hex(glyph)}> <${unicode(code)}>`).join('\n')}\nendbfchar`,
    );
  }
  return `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /RepairedUnicode def\n/CMapType 2 def
1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange
${blocks.join('\n')}
endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
}

export async function repairBagrutPdfFonts(bytes: Uint8Array): Promise<Uint8Array> {
  const { PDFDocument, PDFDict, PDFArray, PDFName, PDFRawStream, decodePDFRawStream } =
    await import('pdf-lib');
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    let repaired = false;
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFDict)) continue;
      try {
        if (
          object.get(PDFName.of('Subtype')) !== PDFName.of('Type0') ||
          object.get(PDFName.of('Encoding')) !== PDFName.of('Identity-H')
        )
          continue;
        const descendants = object.lookup(PDFName.of('DescendantFonts'));
        if (!(descendants instanceof PDFArray)) continue;
        const cid = descendants.lookup(0);
        if (
          !(cid instanceof PDFDict) ||
          cid.get(PDFName.of('Subtype')) !== PDFName.of('CIDFontType2') ||
          cid.get(PDFName.of('CIDToGIDMap')) !== PDFName.of('Identity')
        )
          continue;
        const descriptor = cid.lookup(PDFName.of('FontDescriptor'));
        if (!(descriptor instanceof PDFDict)) continue;
        const font = descriptor.lookup(PDFName.of('FontFile2'));
        if (!(font instanceof PDFRawStream)) continue;
        const mapping = readGlyphUnicodeMap(decodePDFRawStream(font).decode());
        if (!mapping.size) continue;
        object.set(
          PDFName.of('ToUnicode'),
          pdf.context.register(pdf.context.flateStream(toUnicodeCmap(mapping))),
        );
        repaired = true;
      } catch {
        /* Unsupported or malformed font: leave its mapping untouched. */
      }
    }
    return repaired ? await pdf.save() : bytes;
  } catch {
    return bytes;
  }
}
