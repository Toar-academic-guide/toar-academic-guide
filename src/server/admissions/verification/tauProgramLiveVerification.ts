import {
  TAU_DIGITAL_SCIENCES_CONTRACT,
  TAU_DIGITAL_SCIENCES_FIXTURES,
} from '@/data/admissions/tauProgramVerification';
import { evaluateTauDigitalSciencesGates } from '../tauDigitalSciencesPolicy';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';

export interface TauProgramFixtureComparison {
  fixtureId: string;
  expectedScore: number;
  actualScore: number | null;
  expectedVerdict: 'accepted' | 'below';
  actualVerdict: 'accepted' | 'below' | 'pending' | null;
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

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function verdictValue(value: unknown): TauProgramFixtureComparison['actualVerdict'] {
  return value === 'accepted' || value === 'below' || value === 'pending' ? value : null;
}
