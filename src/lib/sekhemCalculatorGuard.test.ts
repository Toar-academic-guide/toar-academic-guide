import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public composite calculator boundaries', () => {
  it('keeps formula ownership out of page and presentation modules', () => {
    const files = [
      'src/app/sekhem-calculator/page.tsx',
      'src/lib/sekhemCalculator.ts',
      ...readdirSync('src/components/sekhem')
        .filter((name) => /\.tsx?$/.test(name) && !name.includes('.test.'))
        .map((name) => join('src/components/sekhem', name)),
    ];
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(
        /sekhemCalculators|calculatorCoverage|server\/admissions\/evaluator|publishedCompositeThresholds/,
      );
    }
  });
  it('retires the coverage registry without weakening the independent aggregate baseline', () => {
    const guard = readFileSync('scripts/pre-pr-guard.mjs', 'utf8');
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    for (const source of [guard, ci]) {
      expect(source).not.toContain('calculatorCoverage.test.ts');
      expect(source).toContain('admissionsCoverageRetirement.test.ts');
    }
  });
});
