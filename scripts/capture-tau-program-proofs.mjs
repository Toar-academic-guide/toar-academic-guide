import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const quietViteLogger = {
  clearScreen() {},
  error(message) {
    if (!String(message).includes('WebSocket server error')) {
      console.error(message);
    }
  },
  hasErrorLogged() {
    return false;
  },
  info() {},
  warn() {},
  warnOnce() {},
};

function applicantFromFixture(fixture) {
  const input = fixture.input;
  const hasSubscores =
    input.psychometricEnglish !== undefined ||
    input.psychometricMath !== undefined ||
    input.psychometricVerbal !== undefined;

  return {
    bagrutAverage: input.bagrut,
    bagrutSubjectRecord: input.bagrutSubjectRecord,
    psychometric: input.psychometric,
    exactSciencesBonusEligible: input.exactSciencesBonusEligible === true,
    psychometricSubscores: hasSubscores
      ? {
          english: input.psychometricEnglish ?? input.psychometric,
          math: input.psychometricMath ?? input.psychometric,
          verbal: input.psychometricVerbal ?? input.psychometric,
        }
      : undefined,
  };
}

async function main() {
  const vite = await createServer({
    root,
    appType: 'custom',
    customLogger: quietViteLogger,
    logLevel: 'error',
    server: { hmr: false, middlewareMode: true },
    resolve: { tsconfigPaths: true },
  });

  try {
    const [
      { TAU_PROGRAM_VERIFICATION_METADATA },
      { admissionsSourceTargets },
      { runTauAdmissionsProof },
    ] = await Promise.all([
      vite.ssrLoadModule('/src/data/admissions/tauProgramVerification.ts'),
      vite.ssrLoadModule('/src/server/ingestion/admissionsSourceRegistry.ts'),
      vite.ssrLoadModule('/src/server/ingestion/adapters/tauAdmissions.ts'),
    ]);
    const targetsById = new Map(admissionsSourceTargets.map((target) => [target.id, target]));
    const capturedAt = new Date().toISOString();
    const captures = [];

    for (const artifact of Object.values(TAU_PROGRAM_VERIFICATION_METADATA)) {
      const targetId = artifact.contract.source.targetId;
      const target = targetsById.get(targetId);
      if (!target?.defaultProgram) {
        throw new Error(`Missing TAU source target or program for ${targetId}`);
      }

      for (const fixture of artifact.fixtures) {
        const proof = await runTauAdmissionsProof({
          applicant: applicantFromFixture(fixture),
          program: target.defaultProgram,
        });
        const score = proof.normalizedPayload.selectedScore;
        const verdict = proof.normalizedPayload.officialVerdict;
        if (
          proof.status !== 'succeeded' ||
          typeof score !== 'number' ||
          (verdict !== 'accepted' && verdict !== 'below' && verdict !== 'eligible_to_apply')
        ) {
          throw new Error(`Official TAU capture did not produce a usable decision for ${targetId}`);
        }

        captures.push({
          targetId,
          captureId: `${targetId}:${fixture.verdict}:${capturedAt}`,
          capturedAt,
          officialUrl: proof.officialUrl,
          applicant: applicantFromFixture(fixture),
          expected: { score, verdict },
          rawResponseMetadata: proof.rawResponseMetadata,
        });
      }
    }

    console.log(JSON.stringify(captures, null, 2));
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
