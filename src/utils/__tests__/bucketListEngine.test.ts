import type { Program } from '@/data/degrees/types';
import { analyzeBucketList } from '@/utils/bucketListEngine';

const requirementProgram: Program = {
  id: 'req_program',
  name: 'ייעוץ חינוכי',
  institution: 'המכללה האקדמית אונו',
  institutionId: 'ono',
  type: 'academic',
  category: 'מדעי החברה',
  riasecScore: { R: 0, I: 2, A: 1, S: 5, E: 1, C: 1 },
  admissionType: 'requirements',
  admissionRequirements: ['ראיון אישי'],
};

const sekhemProgram: Program = {
  id: 'sekhem_program',
  name: 'מדעי המחשב',
  institution: 'אוניברסיטת תל אביב',
  institutionId: 'tau',
  type: 'academic',
  category: 'מדעי המחשב',
  riasecScore: { R: 2, I: 5, A: 0, S: 0, E: 1, C: 3 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 700, huji: null, technion: null, bgu: null },
};

describe('bucketListEngine', () => {
  it('returns requirements for non-sekhem programs', () => {
    const entries = analyzeBucketList(
      ['req_program'],
      { psychometric: 650, bagrut: 100 },
      [requirementProgram]
    );

    expect(entries[0]?.status).toBe('requirements');
  });

  it('returns no-data when scores are missing or the threshold is unavailable', () => {
    const noScores = analyzeBucketList(['sekhem_program'], null, [sekhemProgram]);
    const noThreshold = analyzeBucketList(
      ['sekhem_program'],
      { psychometric: 650, bagrut: 100 },
      [{ ...sekhemProgram, thresholds: { tau: null, huji: null, technion: null, bgu: null } }]
    );

    expect(noScores[0]?.status).toBe('no-data');
    expect(noThreshold[0]?.status).toBe('no-data');
  });
});
