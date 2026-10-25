import { describe, expect, it } from 'vitest';
import {
  toggleLocation,
  resultLabel,
  resultExplanation,
  groupJourneyRows,
  studyFields,
  matchesStudyField,
  selectedStudyFieldIds,
  journeyRows,
  distinctRecommendations,
} from './studyJourney';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from './catalogueStatic';
import { evaluateBatchBManualPath } from '@/server/admissions/batchBManualPathEvaluation';
import { PROGRAM_CANONICAL_ALIASES } from './seo/programAliases';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

it.each(['exact', 'estimated'] as const)(
  'preserves other programmes no-verdict status for kind %s',
  (kind) => {
    const result: AdmissionsEvaluationResult = {
      institution: getStaticCatalogueInstitutions().find((i) => i.id === 'haifa')!,
      linkedInstitutionId: 'haifa',
      kind,
      capability: kind,
      decision: 'pending',
      confidence: 'medium',
      score: 520,
      sourceLabel: 'תנאי קבלה',
      explanation: 'בטווח המתנה',
      nextAction: 'בדקו באתר המוסד',
    };
    expect(resultLabel(result, false, false, 'haifa_sociology')).toEqual({
      label: 'אין הכרעת קבלה',
      group: 'explore',
    });
    expect(
      resultLabel({ ...result, linkedInstitutionId: 'technion' }, false, false, 'technion_cs'),
    ).toEqual({ label: 'אין הכרעת קבלה', group: 'explore' });
    expect(resultLabel(result, false, false, 'technion_medicine')).toEqual({
      label: 'אין הכרעת קבלה',
      group: 'explore',
    });
  },
);

describe('subject search synonyms', () => {
  it.each(['הנדסה', 'הנדסת', '  הנדסה  '])('matches engineering forms for %s', (query) => {
    for (const name of ['הנדסת תוכנה', 'הנדסה אזרחית', 'הנדסה וטכנולוגיה', 'הנדסת חלל']) {
      expect(matchesStudyField({ name }, query)).toBe(true);
    }
    expect(matchesStudyField({ name: 'מדעי המחשב' }, query)).toBe(false);
  });

  it('preserves specific and unrelated subject searches', () => {
    expect(matchesStudyField({ name: 'הנדסת חשמל' }, 'הנדסה חשמל')).toBe(true);
    expect(matchesStudyField({ name: 'הנדסת מכונות' }, 'הנדסה חשמל')).toBe(false);
    expect(matchesStudyField({ name: 'מדעי המחשב' }, 'מדעי   המחשב')).toBe(true);
    expect(matchesStudyField({ name: 'משפטים' }, 'משפט')).toBe(true);
  });
});

describe('engineering search without catalogue hub rows', () => {
  // The live catalogue has individual engineering programmes, with no row
  // named "הנדסה וטכנולוגיה". The static catalogue also has broad hub rows.
  const programs = getStaticCataloguePrograms().filter(
    (program) =>
      program.institutionId &&
      program.isListed !== false &&
      program.type === 'academic' &&
      ((/הנדס[הת]/.test(program.name) && !program.name.startsWith('הנדסה וטכנולוגיה')) ||
        program.id === 'tau_cs'),
  );

  it.each(['הנדסה', 'הנדסת'])(
    'returns the hub and individual engineering chips for %s',
    (query) => {
      expect(programs.some((program) => program.name.startsWith('הנדסה וטכנולוגיה'))).toBe(false);
      const names = studyFields(programs)
        .filter((field) => matchesStudyField(field, query))
        .map((field) => field.name);

      expect(names).toContain('הנדסה וטכנולוגיה');
      expect(names).toEqual(
        expect.arrayContaining([
          'הנדסה אזרחית',
          'הנדסה ביורפואית',
          'הנדסה כימית',
          'הנדסת חשמל',
          'הנדסת מכונות',
          'הנדסת קול וסאונד',
          'הנדסת תוכנה',
          'הנדסת תעשייה וניהול',
        ]),
      );
      expect(names).not.toContain('מדעי המחשב');
    },
  );

  it('selects the family members without duplicating programmes or including unrelated subjects', () => {
    const fields = studyFields(programs);
    const hub = fields.find((field) => field.name === 'הנדסה וטכנולוגיה')!;
    const ids = selectedStudyFieldIds(fields, [hub.id]);
    const rows = journeyRows(fields, getStaticCatalogueInstitutions());
    const selected = rows.filter((row) => ids.includes(row.fieldId));

    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((row) => /הנדס[הת]/.test(row.fieldName))).toBe(true);
    expect(selected.some((row) => row.program.id === 'afeka_softwareeng')).toBe(true);
    expect(selected.some((row) => row.program.id === 'tau_cs')).toBe(false);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(selectedStudyFieldIds(fields, [hub.id, 'ee']).filter((id) => id === 'ee')).toHaveLength(
      1,
    );
  });

  it('keeps a single hub when the catalogue already contains hub programmes', () => {
    const fields = studyFields(getStaticCataloguePrograms());
    expect(fields.filter((field) => field.name === 'הנדסה וטכנולוגיה')).toHaveLength(1);
    expect(
      fields.find((field) => field.name === 'הנדסה וטכנולוגיה')!.programs.length,
    ).toBeGreaterThan(0);
  });

  it('does not create an empty engineering family for an unrelated catalogue', () => {
    const cs = programs.find((program) => program.id === 'tau_cs')!;
    expect(studyFields([cs]).map((field) => field.name)).toEqual(['מדעי המחשב']);
  });
});

describe('approved journey', () => {
  it.each([
    'tlvyaffo_cs',
    'tlvyaffo_nursing',
    'tlvyaffo_business',
    'colmgmt_law',
    'colmgmt_business',
    'colman_law',
    'colman_business',
    'colmgmt_economics',
    'colmgmt_cs',
  ])('preserves program-specific route explanations for %s', (programId) => {
    const result = {
      institution: getStaticCatalogueInstitutions()[0],
      linkedInstitutionId: programId.startsWith('tlvyaffo_') ? 'mta' : 'colman',
      capability: 'manual_gate' as const,
      kind: 'manual_gate' as const,
      decision: 'unknown' as const,
      confidence: 'high' as const,
      sourceLabel: 'תנאי קבלה',
      nextAction: 'בדקו מול מרכז הרישום',
      explanation: 'במסלול בגרות ופסיכומטרי ההחלטה היא של המכללה.',
    };
    expect(resultExplanation(result, programId)).toBe(result.explanation);
    expect(resultExplanation(result, 'colmgmt_accounting')).not.toBe(result.explanation);
  });
  it.each([
    ['bezalel_industrial_design', 'bezalel'],
    ['shenkar_fashion', 'shenkar'],
    ['samspiegel_cinema', 'spieldocs'],
    ['telhai_nursing', 'telhai'],
    ['ono_nursing', 'ono'],
  ] as const)('preserves Batch B manual-gate explanation for %s', (programId, institutionId) => {
    const result = {
      institution: getStaticCatalogueInstitutions()[0],
      linkedInstitutionId: institutionId,
      capability: 'manual_gate' as const,
      kind: 'manual_gate' as const,
      decision: 'eligible_to_apply' as const,
      confidence: 'medium' as const,
      sourceLabel: 'נדרש מיון נוסף',
      nextAction: 'הגישו מועמדות',
      explanation: 'במסלול הזה לא מספיקים ציוני בגרות או פסיכומטרי לבדם.',
    };
    expect(resultExplanation(result, programId)).toBe(result.explanation);
  });
  it('gives accepted manual score passes priority over the score-assessment label', () => {
    const result = evaluateBatchBManualPath({
      input: { degreeId: 'ono_nursing', bagrut: 85, psychometric: 520 },
      institution: getStaticCatalogueInstitutions().find((i) => i.id === 'ono')!,
    })!;
    expect(resultLabel(result)).toEqual({ label: 'מתקבלים', group: 'match' });
    expect(resultExplanation(result, 'ono_nursing')).toBe(result.explanation);
    expect(resultLabel({ ...result, decision: 'pending' })).toEqual({
      label: 'הציונים עומדים בסף',
      group: 'match',
    });
    expect(
      resultLabel({ ...result, decision: 'below', scoreAssessment: 'below_threshold' }),
    ).toEqual({ label: 'הציונים מתחת לסף', group: 'improve' });
    expect(
      resultLabel({ ...result, decision: 'eligible_to_apply', scoreAssessment: undefined }),
    ).toEqual({ label: 'אפשר להגיש מועמדות', group: 'match' });
  });

  it('keeps Afeka software engineering in its own field, not Computer Science', () => {
    const fields = studyFields(getStaticCataloguePrograms());
    expect(
      fields
        .find((field) => field.id === 'cs')
        ?.programs.some((program) => program.id === 'afeka_softwareeng'),
    ).toBe(false);
    expect(
      fields.find((field) => field.programs.some((program) => program.id === 'afeka_softwareeng'))
        ?.name,
    ).toBe('הנדסת תוכנה');
  });
  it.each(Object.entries(PROGRAM_CANONICAL_ALIASES))(
    'shows one recommendation for %s while keeping its saved row available',
    (alias, canonical) => {
      const template = getStaticCataloguePrograms().find(
        (program) => program.id === canonical || program.id === alias,
      )!;
      const programmes = [
        { ...template, id: canonical },
        { ...template, id: alias },
      ];
      const rows = journeyRows(studyFields(programmes), getStaticCatalogueInstitutions());
      expect(rows.map((row) => row.program.id)).toContain(alias);
      expect(distinctRecommendations(rows).map((row) => row.program.id)).toEqual([canonical]);
      expect(distinctRecommendations(rows.filter((row) => row.program.id === alias))).toHaveLength(
        1,
      );
      expect(distinctRecommendations([...rows].reverse()).map((row) => row.program.id)).toEqual([
        canonical,
      ]);
      const otherInstitution = {
        ...rows.find((row) => row.program.id === canonical)!,
        institution: getStaticCatalogueInstitutions().find(
          (institution) => institution.id !== template.institutionId,
        )!,
      };
      expect(
        distinctRecommendations([
          ...rows.filter((row) => row.program.id === alias),
          otherInstitution,
        ]),
      ).toHaveLength(2);
    },
  );
  it('excludes withdrawn import placeholders from choices while retaining saved references', () => {
    const program = { ...getStaticCataloguePrograms()[0], isListed: false };
    expect(studyFields([program])).toEqual([]);
    expect(studyFields([program], true).flatMap((field) => field.programs)).toContain(program);
  });
  it('uses corrected catalogue classification even when a legacy ID ends in cs', () => {
    const catalogue = getStaticCataloguePrograms();
    const culinary = catalogue.find((program) => program.id === 'danon_culinary')!;
    const corrected = { ...culinary, id: 'danon_cs' };
    const fields = studyFields([...catalogue, corrected]);
    expect(
      fields
        .find((field) => field.id === 'cs')
        ?.programs.some((program) => program.institutionId === 'danon'),
    ).toBe(false);
    expect(fields.find((field) => field.programs.includes(corrected))?.name).toBe('קולינריה');
  });
  it('keeps International independent of All Israel and domestic areas', () => {
    expect(toggleLocation(['all'], 'online')).toEqual(['all', 'online']);
    expect(toggleLocation(['all', 'online'], 'north')).toEqual(['online', 'north']);
    expect(toggleLocation(['online', 'north'], 'all')).toEqual(['online', 'all']);
    expect(toggleLocation(['all', 'online'], 'online')).toEqual(['all']);
  });
  it('does not turn unavailable admissions data into an acceptance', () => {
    expect(resultLabel(undefined).group).toBe('explore');
    expect(resultLabel(undefined).label).toBe('טרם חושבה התאמה');
    expect(resultLabel(undefined, true).label).toBe('החישוב לא נטען');
    expect(resultLabel(undefined, false, true).label).toBe('החישוב מתבצע…');
  });
  it('keeps incomplete official conditions in exploration without asking for more grades', () => {
    const result = {
      institution: getStaticCatalogueInstitutions()[0],
      linkedInstitutionId: 'test',
      capability: 'requirements_only' as const,
      kind: 'requirements_only' as const,
      decision: 'unknown' as const,
      confidence: 'low' as const,
      sourceLabel: 'תנאי קבלה',
      explanation: 'תנאי הקבלה המלאים אינם מפורסמים באתר המוסד, ולכן עדיין אי אפשר לקבוע התאמה.',
      nextAction: 'בררו את תנאי הקבלה עם המוסד לפני ההרשמה.',
      degradationReason: 'incomplete_published_requirements',
    };
    expect(resultLabel(result)).toEqual({ label: 'עדיין לא ניתן לקבוע התאמה', group: 'explore' });
    expect(resultExplanation(result)).toBeUndefined();
  });
  it('groups degree results without hiding their contact rows', () => {
    expect(groupJourneyRows([], 'field')).toEqual([]);
  });
});
