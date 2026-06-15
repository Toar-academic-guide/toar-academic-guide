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
    const userScores = { R: 1, I: 5, A: 0, S: 3, E: 1, C: 2 };

    const withoutAvoidances = getRecommendations(
      userScores,
      { soloScore: 2, deskScore: 1 },
      [],
      testPrograms
    );
    const withAvoidances = getRecommendations(
      userScores,
      { soloScore: 2, deskScore: 1 },
      ['heavy-math', 'solo-work'],
      testPrograms
    );

    expect(withoutAvoidances[0]?.id).toBe('מדעי המחשב');
    expect(withAvoidances[0]?.id).toBe('מדעי החברה');
  });
});
