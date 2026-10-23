import { describe, expect, it } from 'vitest';
import {
  toggleLocation,
  resultLabel,
  resultExplanation,
  groupJourneyRows,
  studyFields,
  journeyRows,
  distinctRecommendations,
} from './studyJourney';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from './catalogueStatic';
import { PROGRAM_CANONICAL_ALIASES } from './seo/programAliases';

describe('approved journey', () => {
  it.each([
    'tlvyaffo_cs',
    'tlvyaffo_nursing',
    'tlvyaffo_business',
    'colmgmt_law',
    'colmgmt_business',
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
