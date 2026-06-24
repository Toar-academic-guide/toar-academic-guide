import type { ProfileScores, ValuesProfile } from '@/types';
import type { Program } from '@/data/degrees/types';
import { getRecommendations } from '@/utils/recommendationEngine';

const testPrograms: Program[] = [
  {
    id: 'test_cs',
    name: 'מדעי המחשב',
    institution: 'אוניברסיטת תל אביב',
    institutionId: 'tau',
    type: 'academic',
    category: 'מדעי המחשב',
    profileScore: { AN: 5, TE: 2, CR: 0, SO: 0, LE: 1, OR: 3, DI: 5, ER: 2 },
    admissionType: 'sekhem',
    admissionRequirements: [],
    thresholds: { tau: 700, huji: null, technion: null, bgu: null },
  },
  {
    id: 'test_psychology',
    name: 'פסיכולוגיה',
    institution: 'האוניברסיטה העברית בירושלים',
    institutionId: 'huji',
    type: 'academic',
    category: 'מדעי החברה',
    profileScore: { AN: 4, TE: 0, CR: 1, SO: 5, LE: 1, OR: 1, DI: 0, ER: 4 },
    admissionType: 'sekhem',
    admissionRequirements: [],
    thresholds: { tau: null, huji: 725, technion: null, bgu: null },
  },
];

describe('recommendationEngine', () => {
  it('reorders categories when avoidance tags penalize overlapping fields', () => {
    const userScores: ProfileScores = {
      AN: 5,
      TE: 1,
      CR: 0,
      SO: 3,
      LE: 1,
      OR: 2,
      DI: 5,
      ER: 1,
    };

    const withoutAvoidances = getRecommendations(
      userScores,
      undefined,
      { soloScore: 2, deskScore: 1 },
      [],
      testPrograms,
    );
    const withAvoidances = getRecommendations(
      userScores,
      undefined,
      { soloScore: 2, deskScore: 1 },
      ['heavy-math', 'solo-work'],
      testPrograms,
    );

    expect(withoutAvoidances[0]?.id).toBe('מדעי המחשב');
    expect(withAvoidances[0]?.id).toBe('מדעי החברה');
  });

  it('uses digital and erudition dimensions directly in scoring', () => {
    const digitalPrograms: Program[] = [
      {
        id: 'test_cyber',
        name: 'סייבר',
        institution: 'אוניברסיטת תל אביב',
        institutionId: 'tau',
        type: 'academic',
        category: 'טכנולוגיה ופיתוח',
        profileScore: { AN: 1, TE: 1, CR: 0, SO: 0, LE: 0, OR: 1, DI: 5, ER: 0 },
        admissionType: 'requirements',
        admissionRequirements: [],
      },
      {
        id: 'test_literature',
        name: 'ספרות',
        institution: 'האוניברסיטה העברית בירושלים',
        institutionId: 'huji',
        type: 'academic',
        category: 'מדעי החברה',
        profileScore: { AN: 1, TE: 0, CR: 0, SO: 1, LE: 0, OR: 0, DI: 0, ER: 5 },
        admissionType: 'requirements',
        admissionRequirements: [],
      },
    ];

    const recs = getRecommendations(
      { AN: 1, TE: 0, CR: 0, SO: 0, LE: 0, OR: 0, DI: 5, ER: 0 },
      undefined,
      { soloScore: 2, deskScore: 1 },
      [],
      digitalPrograms,
    );

    expect(recs[0]?.id).toBe('טכנולוגיה ופיתוח');
    expect(recs[0]?.matchedDimensions).toContain('DI');
  });

  it('threads value sliders into recommendation reasoning and ordering', () => {
    const balancedScores: ProfileScores = {
      AN: 1,
      TE: 1,
      CR: 1,
      SO: 1,
      LE: 1,
      OR: 1,
      DI: 1,
      ER: 1,
    };
    const impactValues: ValuesProfile = {
      incomeVsImpact: 2,
      independenceVsTeam: 2,
      growthVsStability: 0,
      prestigeVsMeaning: 2,
    };
    const financeValues: ValuesProfile = {
      incomeVsImpact: -2,
      independenceVsTeam: 0,
      growthVsStability: 0,
      prestigeVsMeaning: -2,
    };
    const valuesPrograms: Program[] = [
      {
        id: 'test_business_values',
        name: 'ניהול עסקי',
        institution: 'אוניברסיטת תל אביב',
        institutionId: 'tau',
        type: 'academic',
        category: 'כלכלה ועסקים',
        profileScore: { AN: 1, TE: 1, CR: 1, SO: 1, LE: 1, OR: 1, DI: 1, ER: 1 },
        admissionType: 'requirements',
        admissionRequirements: [],
      },
      {
        id: 'test_social_values',
        name: 'פסיכולוגיה יישומית',
        institution: 'האוניברסיטה העברית בירושלים',
        institutionId: 'huji',
        type: 'academic',
        category: 'מדעי החברה',
        profileScore: { AN: 1, TE: 1, CR: 1, SO: 1, LE: 1, OR: 1, DI: 1, ER: 1 },
        admissionType: 'requirements',
        admissionRequirements: [],
      },
    ];

    const impactFirst = getRecommendations(
      balancedScores,
      impactValues,
      { soloScore: 1, deskScore: 1 },
      [],
      valuesPrograms,
    );
    const financeFirst = getRecommendations(
      balancedScores,
      financeValues,
      { soloScore: 1, deskScore: 1 },
      [],
      valuesPrograms,
    );

    expect(impactFirst[0]?.id).toBe('מדעי החברה');
    expect(impactFirst[0]?.matchReason).toContain('משמעות והשפעה');
    expect(financeFirst[0]?.id).toBe('כלכלה ועסקים');
  });
});
