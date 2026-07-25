import {
  TAU_DIGITAL_SCIENCES_CONTRACT,
  TAU_DIGITAL_SCIENCES_FIXTURES,
  TAU_NURSING_CONTRACT,
  TAU_NURSING_FIXTURES,
} from '@/data/admissions/tauProgramVerification';
import type { AdmissionsVerificationVerdict } from '@/types/admissionsEvaluation';
import { evaluateTauDigitalSciencesGates } from '../tauDigitalSciencesPolicy';
import { evaluateTauNursingGates } from '../tauNursingPolicy';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';

export interface TauProgramFixtureComparison {
  fixtureId: string;
  expectedScore: number;
  actualScore: number | null;
  expectedVerdict: AdmissionsVerificationVerdict;
  actualVerdict: AdmissionsVerificationVerdict | 'pending' | null;
  scoreMatches: boolean;
  verdictMatches: boolean;
}

export interface TauProgramLiveVerificationReport {
  pairId: string;
  checkedAt: string;
  passed: boolean;
  comparisons: TauProgramFixtureComparison[];
}

export async function runTauDigitalSciencesLiveVerification(
  args: {
    fetcher?: typeof fetch;
    checkedAt?: Date;
  } = {},
): Promise<TauProgramLiveVerificationReport> {
  const comparisons: TauProgramFixtureComparison[] = [];

  for (const fixture of TAU_DIGITAL_SCIENCES_FIXTURES) {
    const gateResult = evaluateTauDigitalSciencesGates({
      degreeId: TAU_DIGITAL_SCIENCES_CONTRACT.programId,
      psychometric: fixture.input.psychometric,
      bagrut: fixture.input.bagrut,
      extraInputs: {
        psychometricEnglish: Number(fixture.input.psychometricEnglish),
        bagrutSubjectRecord: fixture.input.bagrutSubjectRecord,
      },
    });

    if (gateResult.state !== 'pass') {
      comparisons.push({
        fixtureId: fixture.id,
        expectedScore: fixture.expected.score,
        actualScore: null,
        expectedVerdict: fixture.expected.verdict,
        actualVerdict: null,
        scoreMatches: false,
        verdictMatches: false,
      });
      continue;
    }

    const proof = await runTauAdmissionsProof({
      fetcher: args.fetcher,
      program: {
        targetId: 'tau-digital-sciences-live',
        pairId: TAU_DIGITAL_SCIENCES_CONTRACT.pairId,
        id: 'tau-digital-sciences',
        name: 'Digital Sciences for High-Tech',
        externalId: TAU_DIGITAL_SCIENCES_CONTRACT.officialProgramId,
        searchText: 'מדעים דיגיטליים',
        scoreField: 'hatama_handasa',
      },
      applicant: {
        psychometric: fixture.input.psychometric,
        bagrutAverage: fixture.input.bagrut,
        exactSciencesBonusEligible: gateResult.exactSciencesBonusEligible,
      },
    });
    const actualScore = numberValue(proof.normalizedPayload.selectedScore);
    const actualVerdict = verdictValue(proof.normalizedPayload.officialVerdict);

    comparisons.push({
      fixtureId: fixture.id,
      expectedScore: fixture.expected.score,
      actualScore,
      expectedVerdict: fixture.expected.verdict,
      actualVerdict,
      scoreMatches: actualScore === fixture.expected.score,
      verdictMatches: actualVerdict === fixture.expected.verdict,
    });
  }

  return {
    pairId: TAU_DIGITAL_SCIENCES_CONTRACT.pairId,
    checkedAt: (args.checkedAt ?? new Date()).toISOString(),
    passed: comparisons.every((comparison) => comparison.scoreMatches && comparison.verdictMatches),
    comparisons,
  };
}

export async function runTauNursingLiveVerification(
  args: {
    fetcher?: typeof fetch;
    checkedAt?: Date;
  } = {},
): Promise<TauProgramLiveVerificationReport> {
  const comparisons: TauProgramFixtureComparison[] = [];

  for (const fixture of TAU_NURSING_FIXTURES) {
    const gateResult = evaluateTauNursingGates({
      degreeId: TAU_NURSING_CONTRACT.programId,
      psychometric: fixture.input.psychometric,
      bagrut: fixture.input.bagrut,
      extraInputs: {
        psychometricEnglish: Number(fixture.input.psychometricEnglish),
      },
    });

    if (gateResult.state !== 'pass') {
      comparisons.push(failedComparison(fixture));
      continue;
    }

    const proof = await runTauAdmissionsProof({
      fetcher: args.fetcher,
      program: {
        targetId: 'tau-nursing-live',
        pairId: TAU_NURSING_CONTRACT.pairId,
        id: 'tau-nursing',
        name: 'Nursing',
        externalId: TAU_NURSING_CONTRACT.officialProgramId,
        searchText: 'nursing',
        scoreField: 'hatama',
      },
      applicant: {
        psychometric: fixture.input.psychometric,
        bagrutAverage: fixture.input.bagrut,
      },
    });
    const actualScore = numberValue(proof.normalizedPayload.selectedScore);
    const officialVerdict = verdictValue(proof.normalizedPayload.officialVerdict);
    const actualVerdict = officialVerdict === 'accepted' ? 'eligible_to_apply' : officialVerdict;

    comparisons.push({
      fixtureId: fixture.id,
      expectedScore: fixture.expected.score,
      actualScore,
      expectedVerdict: fixture.expected.verdict,
      actualVerdict,
      scoreMatches: actualScore === fixture.expected.score,
      verdictMatches: actualVerdict === fixture.expected.verdict,
    });
  }

  return {
    pairId: TAU_NURSING_CONTRACT.pairId,
    checkedAt: (args.checkedAt ?? new Date()).toISOString(),
    passed: comparisons.every((comparison) => comparison.scoreMatches && comparison.verdictMatches),
    comparisons,
  };
}

function failedComparison(
  fixture: (typeof TAU_NURSING_FIXTURES)[number],
): TauProgramFixtureComparison {
  return {
    fixtureId: fixture.id,
    expectedScore: fixture.expected.score,
    actualScore: null,
    expectedVerdict: fixture.expected.verdict,
    actualVerdict: null,
    scoreMatches: false,
    verdictMatches: false,
  };
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function verdictValue(value: unknown): TauProgramFixtureComparison['actualVerdict'] {
  return value === 'accepted' ||
    value === 'below' ||
    value === 'eligible_to_apply' ||
    value === 'pending'
    ? value
    : null;
}
