import { isUtf8 } from 'node:buffer';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const testFile = fileURLToPath(import.meta.url);
const previousFont = 'ru' + 'bik';

function textFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    if (!entry.isFile() || path === testFile) return [];
    const contents = readFileSync(path);
    return isUtf8(contents) && !contents.includes(0) ? [path] : [];
  });
}

const sourceFiles = textFiles(resolve(root, 'src'));
const publicFiles = textFiles(resolve(root, 'public'));

describe('site-wide Heebo', () => {
  it('uses Heebo as the primary site font', () => {
    const css = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
    expect(css).toMatch(/--font-sans:\s*Heebo,\s*Arial,\s*sans-serif\s*;/);
  });

  it('defines one variable Heebo face in the global stylesheet', () => {
    const faces = sourceFiles.flatMap((path) =>
      Array.from(readFileSync(path, 'utf8').matchAll(/@font-face\s*\{[^}]*\}/g), (match) => ({
        path,
        css: match[0],
      })),
    );
    expect(faces).toHaveLength(1);
    expect(faces[0].path).toBe(resolve(root, 'src/app/globals.css'));
    expect(faces[0].css).toMatch(/font-family:\s*Heebo\s*;/);
    expect(faces[0].css).toMatch(
      /src:\s*url\(['"]\/fonts\/heebo-variable\.ttf['"]\)\s*format\(['"]truetype['"]\)\s*;/,
    );
    expect(faces[0].css).toMatch(/font-weight:\s*100\s+900\s*;/);
    expect(faces[0].css).toMatch(/font-style:\s*normal\s*;/);
    expect(faces[0].css).toMatch(/font-display:\s*swap\s*;/);
  });

  it('has no previous font references in source or public text files', () => {
    const matches = [...sourceFiles, ...publicFiles].filter((path) =>
      readFileSync(path, 'utf8').toLowerCase().includes(previousFont),
    );
    expect(matches).toEqual([]);
  });

  it('ships the Heebo asset and removes the previous font assets', () => {
    const fontsDirectory = resolve(root, 'public/fonts');
    expect(existsSync(join(fontsDirectory, 'heebo-variable.ttf'))).toBe(true);
    expect(
      readdirSync(fontsDirectory).filter((name) => name.toLowerCase().startsWith(previousFont)),
    ).toEqual([]);
  });
});
