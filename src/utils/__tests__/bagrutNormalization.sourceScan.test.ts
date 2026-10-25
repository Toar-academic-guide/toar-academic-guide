import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const root = resolve('.');
const calculatorPath = 'src/utils/sekhemCalculators.ts';
const arielScriptPath = 'scripts/admissions-calculators/8_ariel.js';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    // Exclude tests themselves, including existing TAU number pins, and fixtures.
    if (
      ['node_modules', '__tests__', '__fixtures__', 'fixtures', 'dist', '.git'].includes(entry.name)
    )
      return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (/\.(?:test|spec)\./.test(entry.name)) return [];
    return /\.(?:[cm]?[jt]sx?|json|css)$/.test(entry.name) ? [path] : [];
  });
}

interface AllowedRange {
  start: number;
  end: number;
  kind: 'tau' | 'ariel';
}

function allowedCalculatorRanges(source: string): AllowedRange[] {
  const file = ts.createSourceFile(calculatorPath, source, ts.ScriptTarget.Latest, true);
  const ranges: AllowedRange[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
      // TEMPORARY: TAU's existing normalizer; postfreeze-2 removes this.
      if (node.name?.text === 'normalizeBagrut') {
        ranges.push({ start: node.getStart(file), end: node.end, kind: 'tau' });
      }
      // A named Ariel-only function, never a shared conversion helper.
      if (node.name && /^(?:sekhemAriel|calculateArielSekhem)$/.test(node.name.text)) {
        ranges.push({ start: node.getStart(file), end: node.end, kind: 'ariel' });
      }
      if (node.name?.text === 'sekhemWeighted') {
        for (const statement of node.body?.statements ?? []) {
          // TEMPORARY: the existing TAU helper call site; postfreeze-2 removes this.
          if (
            ts.isReturnStatement(statement) &&
            statement.getText(file).includes('normalizeBagrut(scores.bagrut)')
          ) {
            ranges.push({ start: statement.getStart(file), end: statement.end, kind: 'tau' });
          }
        }
      }
    }
    // Alternatively permit the literal only inside an explicit Ariel dispatcher branch.
    if (
      ts.isIfStatement(node) &&
      /\b\w+\.id\s*===\s*['"]ariel['"]/.test(node.expression.getText(file))
    ) {
      ranges.push({
        start: node.thenStatement.getStart(file),
        end: node.thenStatement.end,
        kind: 'ariel',
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return ranges;
}

it('pin 18 source scan: conversions occur only in temporary TAU code or Ariel own formula', () => {
  const offenses: string[] = [];
  for (const path of [...sourceFiles(resolve('src')), ...sourceFiles(resolve('scripts'))].sort()) {
    const filename = relative(root, path).replaceAll('\\', '/');
    const original = readFileSync(path, 'utf8');
    // Preserve character offsets/line breaks for useful file:line diagnostics.
    let source = original.replace(/Chrome\/120(?:\.[\d]+)*/g, (match) => ' '.repeat(match.length));
    if (filename === 'src/data/journeyGeography.ts') {
      source = source.replace(/\bd:\s*(['"])[^\r\n]*?\1/g, (match) => ' '.repeat(match.length));
    }
    const ranges = filename === calculatorPath ? allowedCalculatorRanges(original) : [];
    // Whitespace includes newlines: catches /120, / 120, 800 /120,
    // (bagrut / 120) * 800, and literal 6.66-family constants in code/comments.
    for (const match of source.matchAll(/\/\s*120\b|6\.66\d*/g)) {
      const position = match.index;
      const token = match[0];
      const isArielLiteral = token === '6.666';
      const allowed =
        ranges.some(
          (range) =>
            position >= range.start &&
            position < range.end &&
            (range.kind === 'tau' || isArielLiteral),
        ) ||
        (filename === arielScriptPath && isArielLiteral);
      if (allowed) continue;
      const line = original.slice(0, position).split('\n').length;
      offenses.push(`${filename}:${line}: ${original.split('\n')[line - 1].trim()}`);
    }
  }
  expect(offenses, `Unapproved bagrut conversions:\n${offenses.join('\n')}`).toEqual([]);
});
