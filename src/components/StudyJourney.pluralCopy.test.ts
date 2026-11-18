/// <reference types="vite/client" />

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sources = import.meta.glob<string>(
  './{StudyJourney,JourneyExactGrades,BagrutSubjectRows,BagrutCalculatorWizard,AcademicProfileForm,JourneyRegionMap,TauPhysiotherapyFields,BguEngineeringFields,BguQuantitativeFields,BguHealthFields,BguPsychologyFields,BguSocialScienceFields,HujiMedicineFields,HaifaQualificationFields}.tsx',
  { eager: true, query: '?raw', import: 'default' },
);
const singularForms = [
  'שלך',
  'לך',
  'אותך',
  'עבורך',
  'את/ה',
  'הזן',
  'בחר',
  'תוכל',
  'המשך',
  'שמור',
  'דלג',
  'הצג',
  'חשב',
  'הסר',
  'נקה',
  'נסה',
];
const singularWord = new RegExp(
  `(?<![\\p{L}\\p{M}])(?:${singularForms.join('|')})(?![\\p{L}\\p{M}])`,
  'gu',
);

function singularMatches(text: string) {
  return Array.from(text.matchAll(singularWord), (match) => match[0]);
}

function copyViolations(path: string, source: string) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: string[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isJsxText(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const matches = singularMatches(node.text);
      if (matches.length) {
        const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
        violations.push(
          `${path}:${line} — ${matches.join(', ')} — ${node.text.trim().replace(/\s+/g, ' ')}`,
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return violations;
}

describe('journey plural student address', () => {
  it.each(Object.entries(sources))('%s contains no singular-addressed copy', (path, source) => {
    expect(copyViolations(path, source)).toEqual([]);
  });

  it('matches complete Hebrew words without rejecting plural forms or first-person responses', () => {
    expect(singularMatches('שלך, לך. הזן בחר תוכל המשך')).toEqual([
      'שלך',
      'לך',
      'הזן',
      'בחר',
      'תוכל',
      'המשך',
    ]);
    expect(
      singularMatches(
        'שלכם לכם הזינו בחרו תוכלו המשיכו ואילך בהמשך יש לי בדקתי הזנתי אמלא מאוחר יותר',
      ),
    ).toEqual([]);
  });

  it('covers every explicitly named journey surface', () => {
    for (const name of [
      'StudyJourney',
      'JourneyExactGrades',
      'BagrutSubjectRows',
      'BagrutCalculatorWizard',
      'AcademicProfileForm',
    ]) {
      expect(sources[`./${name}.tsx`]).toBeTypeOf('string');
    }
  });
});
