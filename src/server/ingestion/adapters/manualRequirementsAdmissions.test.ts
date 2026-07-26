import { describe, expect, it } from 'vitest';

import { runManualRequirementsAdmissionsProof } from './manualRequirementsAdmissions';

describe('manual requirements admissions adapter', () => {
  it('replays Technion architecture gates and exposes the entrance exam as manual', async () => {
    const proof = await runManualRequirementsAdmissionsProof({
      program: {
        targetId: 'technion-architecture-live',
        id: 'architecture',
        name: 'Architecture',
        manualGateProfile: 'technion_architecture',
      },
      applicant: {
        psychometric: 700,
        bagrutAverage: 105,
        mathUnits: 5,
        mathGrade: 80,
        englishUnits: 5,
      },
    });

    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: 1,
      officialVerdict: 'eligible_to_apply',
    });
    expect(proof.limitations[0]).toContain('entrance exam');
  });

  it('returns below when Colman’s automatic Bagrut route misses its average gate', async () => {
    const proof = await runManualRequirementsAdmissionsProof({
      program: {
        targetId: 'colman-computer-science-live',
        id: 'colmgmt_cs',
        name: 'Computer Science',
        manualGateProfile: 'colman_computer_science',
      },
      applicant: {
        psychometric: 600,
        bagrutAverage: 84,
        mathUnits: 5,
        mathGrade: 75,
      },
    });

    expect(proof.normalizedPayload).toMatchObject({
      selectedScore: 0,
      officialVerdict: 'below',
    });
  });
});
