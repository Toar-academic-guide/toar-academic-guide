import type { Program } from '@/data/degrees/types';
import { analyzeBucketList } from '@/utils/bucketListEngine';

const requirementProgram: Program = {
  id: 'req_program',
  name: 'ייעוץ חינוכי',
  institution: 'המכללה האקדמית אונו',
  institutionId: 'ono',
  type: 'academic',
  category: 'מדעי החברה',
  profileScore: { AN: 2, TE: 0, CR: 1, SO: 5, LE: 1, OR: 1, DI: 0, ER: 3 },
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
  profileScore: { AN: 5, TE: 2, CR: 0, SO: 0, LE: 1, OR: 3, DI: 5, ER: 2 },
  admissionType: 'sekhem',
  admissionRequirements: [],
  thresholds: { tau: 700, huji: null, technion: null, bgu: null },
};

describe('bucketListEngine', () => {
  it('returns requirements for non-sekhem programs', () => {
    const entries = analyzeBucketList(['req_program'], { psychometric: 650, bagrut: 100 }, [
      requirementProgram,
    ]);

    expect(entries[0]?.status).toBe('requirements');
  });

  it('returns no-data when scores are missing or the threshold is unavailable', () => {
    const noScores = analyzeBucketList(['sekhem_program'], null, [sekhemProgram]);
    const noThreshold = analyzeBucketList(['sekhem_program'], { psychometric: 650, bagrut: 100 }, [
      { ...sekhemProgram, thresholds: { tau: null, huji: null, technion: null, bgu: null } },
    ]);

    expect(noScores[0]?.status).toBe('no-data');
    expect(noThreshold[0]?.status).toBe('no-data');
  });
});
