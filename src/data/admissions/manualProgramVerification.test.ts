import { describe, expect, it } from 'vitest';

import {
  MANUAL_PROGRAM_VERIFICATION_METADATA,
} from './manualProgramVerification';
import { evaluateProgramVerification, fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

describe('manual application-gate verification artifacts', () => {
  it.each(Object.values(MANUAL_PROGRAM_VERIFICATION_METADATA))(
    'has complete eligible and below proof for $contract.pairId',
    (artifact) => {
      expect(fingerprintVerificationFixtures(artifact.fixtures)).toBe(
        artifact.contract.fixtureSetFingerprint,
      );
      expect(
        evaluateProgramVerification({
          contract: artifact.contract,
          fixtures: artifact.fixtures,
          currentAdmissionCycle: '2026-2027',
          currentSourceFingerprint: artifact.contract.sourceFingerprint,
        }),
      ).toEqual({ state: 'exact', capability: 'exact', issues: [] });
    },
  );
});
