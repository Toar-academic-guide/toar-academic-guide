import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const serverOnlyShim = fileURLToPath(new URL('./server-only-shim.mjs', import.meta.url));

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!['--run-file', '--pr-number', '--pr-url', '--controlled-failure-before-send'].includes(flag)) {
      throw new Error(`Unknown admissions review notification argument: ${flag ?? '(missing)'}.`);
    }
    if (!value || value.startsWith('--') || values.has(flag)) throw new Error(`${flag} requires one value.`);
    values.set(flag, value);
  }
  const runFile = values.get('--run-file');
  if (!runFile) throw new Error('--run-file is required.');
  const prNumber = values.has('--pr-number') ? Number(values.get('--pr-number')) : undefined;
  const prUrl = values.get('--pr-url');
  const controlledFailureConfirmationId = values.get('--controlled-failure-before-send');
  if ((prNumber === undefined) !== (prUrl === undefined) || (prNumber !== undefined && !Number.isInteger(prNumber))) {
    throw new Error('--pr-number and --pr-url must be supplied together.');
  }
  return { runFile, prNumber, prUrl, controlledFailureConfirmationId };
}

function resolveRunFile(path) {
  const resolved = resolve(root, path);
  const relativePath = relative(root, resolved);
  if (relativePath.startsWith('..') || !relativePath.startsWith('scratch/')) {
    throw new Error('Admissions review run file must be inside scratch/.');
  }
  return resolved;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const vite = await createServer({
    root,
    appType: 'custom',
    logLevel: 'error',
    server: { hmr: false, middlewareMode: true },
    resolve: { alias: { 'server-only': serverOnlyShim }, tsconfigPaths: true },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { run } = JSON.parse(await readFile(resolveRunFile(args.runFile), 'utf8'));
    const [
      { createAdmissionsReviewRunLedger },
      { buildAdmissionsReviewSlackMessage },
      { canInjectAdmissionsReviewSlackFailure, postAdmissionsReviewSlackMessage },
    ] =
      await Promise.all([
        vite.ssrLoadModule('/src/server/admissions/admissionsReviewRunLedger.ts'),
        vite.ssrLoadModule('/src/server/admissions/weeklyReviewRun.ts'),
        vite.ssrLoadModule('/src/server/automation/admissionsReviewSlack.ts'),
      ]);
    const ledger = createAdmissionsReviewRunLedger();
    if (args.prNumber !== undefined) {
      await ledger.recordPullRequest({
        runKey: run.runKey,
        pullRequestNumber: args.prNumber,
        pullRequestUrl: args.prUrl,
      });
    }
    const existing = await ledger.getRun(run.runKey);
    if (existing?.slackStatus === 'sent') {
      console.info(JSON.stringify({ status: 'already_sent', runKey: run.runKey }));
      return;
    }
    if (args.controlledFailureConfirmationId) {
      if (
        !existing ||
        !canInjectAdmissionsReviewSlackFailure({
          releaseKind: existing.releaseKind,
          proofScenario: existing.proofScenario,
          confirmationId: args.controlledFailureConfirmationId,
        })
      ) {
        throw new Error(
          'Controlled Slack failure requires the matching operational proof confirmation ID.',
        );
      }
      await ledger.recordSlackFailure({
        runKey: run.runKey,
        error: 'Controlled operational-proof Slack failure before send.',
      });
      console.info(JSON.stringify({ status: 'controlled_failure', runKey: run.runKey }));
      return;
    }
    const result = await postAdmissionsReviewSlackMessage(
      buildAdmissionsReviewSlackMessage(run, { pullRequestUrl: args.prUrl }),
    );
    if (result.status === 'sent') await ledger.recordSlackSent({ runKey: run.runKey });
    else await ledger.recordSlackFailure({ runKey: run.runKey, error: result.error });
    console.info(JSON.stringify({ ...result, runKey: run.runKey }));
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
