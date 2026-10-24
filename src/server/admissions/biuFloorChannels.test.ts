import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resultLabel } from '@/lib/studyJourney';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import { evaluateBiuPublishedRoutes } from './biuPublishedRoutesEvaluation';

vi.mock('server-only', () => ({}));
import { evaluateAdmissionsForProgram } from './evaluator';

const institution = getStaticCatalogueInstitutions().find((item) => item.id === 'biu')!;
const calculator = 'https://shoham.biu.ac.il/kabala/';
const noPsych =
  'https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry';
const general =
  'https://www.biu.ac.il/registration-and-admission/information/general-admission-req';
const eeSource = 'https://engineering.biu.ac.il/prerequisites';
const swSource = 'https://social-work.biu.ac.il/Admission_BA';
const conflict = 'בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650';
const reservists = 'אלא אם את/ה זכאי/ת למסלול מילואימניקים';
const university = 'ייתכנו גם מסלולי קבלה מיוחדים ברמת האוניברסיטה';
const ee = {
  psychometricMath: 132,
  mathUnits: 5,
  mathGrade: 90,
  physicsUnits: 5,
  physicsGrade: 85,
};
const ids = [
  'biu_law',
  'biu_cs',
  'biu_ee',
  'biu_socialwork',
  'biu_criminology',
  'biu_lifesciences',
  'biu_biotech',
  'biu_computational_bio',
];
type Profile = Omit<AdmissionsEvaluationInput, 'degreeId'>;
function evaluate(degreeId: string, scores: Profile = {}) {
  return evaluateBiuPublishedRoutes({
    institution,
    input: { degreeId, ...scores, extraInputs: { psychometricEnglish: 85, ...scores.extraInputs } },
  });
}
function noVerdict(result: AdmissionsEvaluationResult) {
  expect(result.decision).toBe('unknown');
  expect(result.scoreAssessment).toBeUndefined();
  expect(result.score).toBeUndefined();
  expect(result.threshold).toBeUndefined();
  expect(result.officialUrls).toContain(calculator);
  expect(result.floorChecks?.length).toBeGreaterThan(0);
}
function row(result: AdmissionsEvaluationResult, label: string, status: string) {
  expect(result.floorChecks).toContainEqual(expect.objectContaining({ label, status }));
}
function caveats(result: AdmissionsEvaluationResult, source?: string) {
  expect(result.decision).toBe('below');
  expect(result.explanation).toContain(university);
  expect(result.officialUrls).toEqual(expect.arrayContaining([noPsych, general]));
  if (source) {
    expect(result.explanation).toContain(reservists);
    expect(result.officialUrls).toContain(source);
    expect(result.explanation.indexOf(reservists)).toBeLessThan(
      result.explanation.indexOf(university),
    );
  }
}

describe('BIU final brief T1–T30 (25.10.2026)', () => {
  const fetch = vi.fn(() => {
    throw new Error('BIU evaluation must never use the network');
  });
  beforeEach(() => {
    fetch.mockClear();
    vi.stubGlobal('fetch', fetch);
  });
  afterEach(() => {
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('T1 all computational biology channels miss, naming floors and sources', () => {
    const result = evaluate('biu_computational_bio', {
      bagrut: 100,
      psychometric: 640,
      extraInputs: { mathUnits: 5, mathGrade: 80 },
    });
    expect(result).toMatchObject({ decision: 'below', scoreAssessment: 'below_threshold' });
    expect(resultLabel(result).label).toBe('לא עומד/ת בתנאי הסף');
    expect(result.explanation).toContain('ממוצע בגרות 112 (שלך 100)');
    expect(result.explanation).toContain('פסיכומטרי 660 (שלך 640)');
    expect(result.explanation).toContain(noPsych);
    expect(result.explanation).toContain(calculator);
  });
  it('T2 social work misses psychometric, not the conditional Hebrew requirement', () => {
    const result = evaluate('biu_socialwork', { psychometric: 560, bagrut: 95 });
    expect(result.decision).toBe('below');
    expect(result.explanation).toContain('פסיכומטרי 580 (שלך 560)');
    expect(result.officialUrls).toEqual(expect.arrayContaining([calculator, swSource]));
    row(result, 'יע״ל (לנדרשים)', 'missing');
    noVerdict(evaluate('biu_socialwork', { psychometric: 580, bagrut: 95 }));
  });
  it('T3 CS option B survives option A missing its floor', () => {
    const result = evaluate('biu_cs', {
      psychometric: 650,
      extraInputs: { psychometricMath: 132, mathUnits: 5, mathGrade: 92 },
    });
    noVerdict(result);
    row(result, 'פסיכומטרי', 'miss');
    row(result, 'כמותי', 'pass');
  });
  it('T4 life sciences combined channel survives failed bagrut', () => {
    noVerdict(
      evaluate('biu_lifesciences', {
        bagrut: 100,
        psychometric: 600,
        extraInputs: { mathUnits: 4, mathGrade: 80 },
      }),
    );
  });
  it('T5 CS all floors passing never means accepted', () => {
    const result = evaluate('biu_cs', {
      psychometric: 700,
      extraInputs: { psychometricMath: 130, mathUnits: 5, mathGrade: 90 },
    });
    noVerdict(result);
    expect(result.floorChecks?.every((floor) => floor.status === 'pass')).toBe(true);
    expect(result.explanation).not.toContain('לא עומד/ת בתנאי הסף');
  });
  it('T6 EE all floors passing never means accepted', () => {
    noVerdict(evaluate('biu_ee', { psychometric: 720, extraInputs: ee }));
  });
  it('T7 CS cannot reject a missing option B', () => {
    const result = evaluate('biu_cs', { psychometric: 650 });
    expect(result).toMatchObject({ decision: 'unknown', kind: 'needs_input' });
    expect(result.requiredInputs).toEqual(
      expect.arrayContaining(['psychometric_math', 'math_units', 'math_grade']),
    );
  });
  it('T8 computational biology missing math gives no verdict', () => {
    const result = evaluate('biu_computational_bio', { bagrut: 100, psychometric: 700 });
    expect(result).toMatchObject({ decision: 'unknown', kind: 'needs_input' });
    expect(result.requiredInputs).toEqual(expect.arrayContaining(['math_units', 'math_grade']));
  });
  it.each([
    [9, 649, 'miss', 'below'],
    [10, 650, 'conflicting', 'unknown'],
    [11, 699, 'conflicting', 'unknown'],
    [12, 700, 'pass', 'unknown'],
  ] as const)('T%i EE psychometric %i is %s', (_, psychometric, status, decision) => {
    const result = evaluate('biu_ee', { psychometric, extraInputs: ee });
    expect(result.decision).toBe(decision);
    expect(result.floorChecks).toContainEqual(
      expect.objectContaining({
        label: 'פסיכומטרי',
        displayValue: 700,
        verdictThreshold: 650,
        studentValue: psychometric,
        status,
        note: conflict,
        sourceUrl: calculator,
      }),
    );
    if (decision === 'below')
      expect(result.explanation).toContain(`נדרש 700 במחשבון; ${conflict} (שלך 649)`);
    else noVerdict(result);
  });
  it('T13 EE math and absent physics only require summer prep', () => {
    const result = evaluate('biu_ee', {
      psychometric: 720,
      extraInputs: { ...ee, mathGrade: 70, physicsUnits: undefined, physicsGrade: undefined },
    });
    noVerdict(result);
    row(result, 'מתמטיקה 5 יח״ל', 'soft_miss');
    row(result, 'פיזיקה 5 יח״ל', 'soft_miss');
  });
  it('T14 EE both quantitative alternatives miss', () => {
    const result = evaluate('biu_ee', {
      psychometric: 720,
      extraInputs: { ...ee, psychometricMath: 120, mathGrade: 95 },
    });
    expect(result.decision).toBe('below');
    expect(result.explanation).toContain('כמותי 125 (שלך 120)');
    caveats(result, eeSource);
  });
  it('T15 EE quantitative 127 leaves the lenient alternative open', () => {
    const result = evaluate('biu_ee', {
      psychometric: 720,
      extraInputs: { ...ee, psychometricMath: 127, mathGrade: 70 },
    });
    noVerdict(result);
    expect(result.floorChecks).toContainEqual(
      expect.objectContaining({
        label: 'כמותי',
        displayValue: 125,
        verdictThreshold: 125,
        status: 'conflicting',
        note: 'בדף הפקולטה מופיע כמותי 130 בלבד',
      }),
    );
  });
  it('T16 criminology combined channel has no published floors to miss', () => {
    const result = evaluate('biu_criminology', { bagrut: 90, psychometric: 600 });
    noVerdict(result);
    expect(result.explanation).toContain('לא פורסמו תנאי סף נוספים למסלול השקלול');
  });
  it('T17 preserves #277 decisions and appends named law misses', () => {
    for (const [bagrut, psychometric, decision] of [
      [105, 650, 'unknown'],
      [95, 730, 'pending'],
      [88, 650, 'below'],
      [105, 590, 'below'],
    ] as const) {
      expect(evaluate('biu_law', { bagrut, psychometric }).decision).toBe(decision);
    }
    expect(evaluate('biu_law', { bagrut: 88, psychometric: 650 }).explanation).toContain(
      'ממוצע בגרות 90 (שלך 88)',
    );
    expect(evaluate('biu_law', { bagrut: 105, psychometric: 590 }).explanation).toContain(
      'פסיכומטרי 600 (שלך 590)',
    );
  });
  it.each(['biu_psychology', 'biu_optometry', 'biu_medicine'])(
    'T18 %s stays outside the new channels',
    async (degreeId) => {
      const report = await evaluateAdmissionsForProgram({
        input: { degreeId, psychometric: 700 },
        program: getStaticCataloguePrograms().find((p) => p.id === degreeId)!,
        institutions: [institution],
        freshnessStatesBySourceId: new Map(),
      });
      const result = report.results.find((r) => r.linkedInstitutionId === 'biu')!;
      expect(result.floorChecks).toBeUndefined();
      expect(result.scoreAssessment).toBeUndefined();
      expect(result.decision).toBe('unknown');
    },
  );
  it('T19 copy and decision guard across every routed track and score grid', () => {
    for (const id of ids)
      for (const psychometric of [560, 600, 649, 650, 699, 700, 750])
        for (const bagrut of [88, 100, 112])
          for (const psychometricMath of [120, 127, 132])
            for (const mathGrade of [70, 85, 95]) {
              const result = evaluate(id, {
                bagrut,
                psychometric,
                extraInputs: { ...ee, psychometricMath, mathGrade },
              });
              expect(result.decision).not.toBe('accepted');
              expect(result.explanation + result.nextAction).not.toMatch(
                /התקבל|נדחה|(?:סכם|שקלול|סף קבלה)\s*[:=]?\s*\d/,
              );
              expect(result.explanation.includes('לא עומד/ת בתנאי הסף')).toBe(
                result.decision === 'below',
              );
              if (result.decision === 'below') expect(result.explanation).toContain('https://');
            }
  });
  it('T20 never requests the official calculator (or any network endpoint)', () => {
    for (const id of ids) evaluate(id, { psychometric: 700, bagrut: 100, extraInputs: ee });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('T21 EE below includes the sourced reservist caveat then U1', () => {
    caveats(evaluate('biu_ee', { psychometric: 649, extraInputs: ee }), eeSource);
  });
  it.each(['biu_criminology', 'criminology'])(
    'T22 %s no psych keeps below and has no invented psych floor',
    (id) => {
      const result = evaluate(id, { bagrut: 90 });
      caveats(result);
      expect(result.explanation).toContain(
        'אפשר להתקבל גם עם פסיכומטרי, במסלול שקלול בגרות ופסיכומטרי. לא פורסם סף פסיכומטרי למסלול זה.',
      );
      expect(result.explanation).toContain('בוגרי מוסדות חינוך חרדיים, עולים חדשים ועוד');
      expect(result.officialUrls).toContain('https://criminology.biu.ac.il/tracks/BA');
      expect(result.explanation).not.toMatch(/פסיכומטרי\s*[–—-]?\s*סף\s*\d/);
    },
  );
  it.each(['biu_law', 'law'])(
    'T23 %s no psych keeps below and names the two psych floors',
    (id) => {
      const result = evaluate(id, {
        bagrut: 110,
        extraInputs: { englishUnits: 5, englishGrade: 95 },
      });
      caveats(result, 'https://law.biu.ac.il/node/129');
      expect(result.explanation).toContain(
        'אפשר להתקבל גם עם פסיכומטרי – סף 600 (במסלול השקלול, יחד עם ממוצע בגרות 90) או 720 (במסלול הפסיכומטרי)',
      );
    },
  );
  it('T24 law all channels missed has S2 without a psych-route line', () => {
    const result = evaluate('biu_law', { bagrut: 88, psychometric: 650 });
    caveats(result, 'https://law.biu.ac.il/node/129');
    expect(result.explanation).not.toContain('אפשר להתקבל גם עם פסיכומטרי');
  });
  it('T25 social work special channels are sourced and in order', () => {
    const result = evaluate('biu_socialwork', { psychometric: 560, bagrut: 95 });
    caveats(result, swSource);
    const texts = [
      reservists,
      'אלא אם את/ה בוגר/ת מוסד חינוך חרדי – קיים מסלול קבלה נפרד',
      'אלא אם את/ה בוגר/ת המכינה הייעודית למדעי החברה או מכינת 30+ – קיים מסלול קבלה נפרד',
      university,
    ];
    for (let i = 0; i < texts.length - 1; i++) {
      expect(result.explanation).toContain(texts[i]);
      expect(result.explanation.indexOf(texts[i])).toBeLessThan(
        result.explanation.indexOf(texts[i + 1]),
      );
    }
  });
  it.each([
    [26, 'biu_lifesciences', 550, 320, 'https://life-sciences.biu.ac.il/node/10404', 4],
    [27, 'biu_biotech', 580, 320, 'https://life-sciences.biu.ac.il/tracks/10423', 4],
    [28, 'biu_computational_bio', 660, 360, 'https://life-sciences.biu.ac.il/tracks/10424', 5],
  ] as const)(
    'T%i %s no psych gives sourced next route',
    (_, id, psych, product, source, mathUnits) => {
      const result = evaluate(id, { bagrut: 100, extraInputs: { mathUnits, mathGrade: 80 } });
      caveats(result, source);
      expect(result.explanation).toContain(
        `אפשר להתקבל גם עם פסיכומטרי – סף ${psych} (ובנוסף מכפלת מתמטיקה ${product})`,
      );
      const withPsych = evaluate(id, {
        bagrut: 100,
        psychometric: psych - 20,
        extraInputs: { mathUnits, mathGrade: 80 },
      });
      caveats(withPsych, source);
      expect(withPsych.explanation).not.toContain('אפשר להתקבל גם עם פסיכומטרי');
    },
  );
  it('T29 CS all channels missed has U1 only', () => {
    const result = evaluate('biu_cs', {
      psychometric: 650,
      extraInputs: { psychometricMath: 120, mathUnits: 5, mathGrade: 92 },
    });
    caveats(result);
    expect(result.explanation).not.toContain('אלא אם');
    expect(result.explanation).toContain('פסיכומטרי 690 (שלך 650)');
    expect(result.explanation).toContain('כמותי 130 (שלך 120)');
  });
  it('T30 special-channel and alternative-psych copy appears only below', () => {
    for (const id of ids)
      for (const scores of [
        {
          bagrut: 120,
          psychometric: 750,
          extraInputs: { ...ee, englishUnits: 5, englishGrade: 95 },
        },
        { psychometric: 700 },
        {},
      ]) {
        const result = evaluate(id, scores);
        if (result.decision === 'below') continue;
        expect(result.explanation).not.toContain('אלא אם');
        expect(result.explanation).not.toContain(university);
        expect(result.explanation).not.toContain('אפשר להתקבל גם עם פסיכומטרי');
      }
  });

  it.each(ids)('%s reaches the floor evaluator through the public dispatcher', async (degreeId) => {
    const input = {
      degreeId,
      bagrut: 100,
      psychometric: 700,
      extraInputs: { ...ee, psychometricEnglish: 85 },
    };
    const direct = evaluateBiuPublishedRoutes({ input, institution });
    const report = await evaluateAdmissionsForProgram({
      input,
      program: getStaticCataloguePrograms().find((p) => p.id === degreeId)!,
      institutions: [institution],
      freshnessStatesBySourceId: new Map(),
    });
    const result = report.results.find((r) => r.linkedInstitutionId === 'biu')!;
    expect(result.decision).toBe(direct.decision);
    expect(result.floorChecks).toEqual(direct.floorChecks);
  });

  it.each([
    [74, 'soft_miss'],
    [75, 'conflicting'],
    [79, 'conflicting'],
    [80, 'pass'],
  ] as const)('EE math %i respects the 75/80 conflict', (mathGrade, status) => {
    const result = evaluate('biu_ee', { psychometric: 720, extraInputs: { ...ee, mathGrade } });
    noVerdict(result);
    expect(result.floorChecks).toContainEqual(
      expect.objectContaining({
        label: 'מתמטיקה 5 יח״ל',
        displayValue: 75,
        verdictThreshold: 75,
        studentValue: mathGrade,
        status,
        note: 'בדף הפקולטה מופיע 80',
      }),
    );
  });

  it('a high four-unit math grade cannot satisfy the CS five-unit alternative', () => {
    expect(
      evaluate('biu_cs', {
        psychometric: 650,
        extraInputs: { psychometricMath: 132, mathUnits: 4, mathGrade: 100 },
      }).decision,
    ).toBe('below');
  });
});
