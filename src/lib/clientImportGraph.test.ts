import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const verification = 'src/data/admissions/technionProgramVerification.ts';
const extensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'];

function runtimeImports(source: string, filename: string): string[] {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  const add = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteralLike(node)) imports.push(node.text);
  };
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause?.isTypeOnly) return;
      const bindings = clause?.namedBindings;
      if (
        !clause?.name &&
        bindings &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every((item) => item.isTypeOnly)
      )
        return;
      add(node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node)) {
      if (node.isTypeOnly) return;
      if (
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((item) => item.isTypeOnly)
      )
        return;
      add(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      add(node.arguments[0]);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node.moduleReference.expression);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return imports;
}

function resolveLocal(specifier: string, importer: string): string | undefined {
  // Package internals belong to their own bundler contracts; walk every local edge.
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return undefined;
  const base = specifier.startsWith('@/')
    ? resolve(root, 'src', specifier.slice(2))
    : resolve(dirname(importer), specifier);
  const candidates = [
    base,
    ...extensions.map((ext) => base + ext),
    ...extensions.map((ext) => join(base, 'index' + ext)),
  ];
  // TypeScript source may use the emitted .js/.mjs/.cjs extension.
  if (/\.[mc]?js$/.test(base)) {
    candidates.unshift(
      ...['.ts', '.tsx', '.mts', '.cts'].map((ext) => base.replace(/\.[mc]?js$/, ext)),
    );
  }
  const found = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
  if (!found) throw new Error(`Unresolved local import: ${importer} → ${specifier}`);
  return found;
}

function forbiddenChains(entry: string): string[] {
  const visited = new Set<string>();
  const violations: string[] = [];
  function walk(file: string, chain: string[]) {
    if (visited.has(file)) return;
    visited.add(file);
    if (!/\.[cm]?[jt]sx?$/.test(file)) return;
    for (const specifier of runtimeImports(readFileSync(file, 'utf8'), file)) {
      if (
        ['crypto', 'node:crypto', 'server-only'].includes(specifier) ||
        specifier.startsWith('@/server/')
      ) {
        violations.push([...chain, specifier].join(' → '));
        continue;
      }
      const target = resolveLocal(specifier, file);
      if (!target) continue;
      const label = relative(root, target);
      if (label === verification || label.startsWith('src/server/')) {
        violations.push([...chain, label].join(' → '));
      } else {
        walk(target, [...chain, label]);
      }
    }
  }
  walk(resolve(root, entry), [entry]);
  return violations;
}

describe('client admission import boundaries', () => {
  it('keeps winter cutoffs free of server dependencies', () => {
    expect(forbiddenChains('src/data/admissions/technionWinterCutoffs.ts')).toEqual([]);
  });

  it('detects the real verification module crypto dependency', () => {
    expect(forbiddenChains(verification)).toContain(`${verification} → node:crypto`);
  });

  it('follows alias imports, re-exports, and dynamic imports while ignoring type-only edges', () => {
    const dir = mkdtempSync(join(tmpdir(), 'myway-import-graph-'));
    try {
      writeFileSync(
        join(dir, 'entry.ts'),
        `
        import type { A } from '@/server/typeOnly';
        import { type B } from '@/server/typeOnly';
        export type { C } from '@/server/typeOnly';
        export { type D } from '@/server/typeOnly';
        type E = import('@/server/typeOnly').E;
        export * from './barrel';
        void import('./dynamic');
        import { getTechnionProgramConfig } from '@/data/admissions/technionProgramVerification';
      `,
      );
      writeFileSync(join(dir, 'barrel.ts'), "export { x } from './leaf';");
      writeFileSync(join(dir, 'leaf.ts'), "import 'server-only'; export const x = 1;");
      writeFileSync(join(dir, 'dynamic.ts'), "import 'crypto';");
      const entry = join(dir, 'entry.ts');
      const chains = forbiddenChains(entry);
      expect(chains).toEqual([
        [
          entry,
          relative(root, join(dir, 'barrel.ts')),
          relative(root, join(dir, 'leaf.ts')),
          'server-only',
        ].join(' → '),
        [entry, relative(root, join(dir, 'dynamic.ts')), 'crypto'].join(' → '),
        [entry, verification].join(' → '),
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects additional server dependencies beyond the existing profile schema edges', () => {
    const existing = new Set([
      'src/components/StudyJourney.tsx → @/server/user/profileSchema',
      'src/components/StudyJourney.tsx → src/hooks/useUserProfile.ts → @/server/user/profileSchema',
    ]);
    expect(
      forbiddenChains('src/components/StudyJourney.tsx').filter((chain) => !existing.has(chain)),
    ).toEqual([]);
  });

  // Existing client boundary violation; phase 1 must not edit components.
  // StudyJourney.tsx → @/server/user/profileSchema
  // StudyJourney.tsx → src/hooks/useUserProfile.ts → @/server/user/profileSchema
  it.fails('keeps the StudyJourney client graph free of server dependencies', () => {
    expect(forbiddenChains('src/components/StudyJourney.tsx')).toEqual([]);
  });
});
