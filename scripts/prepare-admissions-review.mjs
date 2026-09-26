import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const serverOnlyShim = fileURLToPath(new URL('./server-only-shim.mjs', import.meta.url));

const quietViteLogger = {
  clearScreen() {},
  error(message) {
    if (!String(message).includes('WebSocket server error')) console.error(message);
  },
  hasErrorLogged() {
    return false;
  },
  info() {},
  warn() {},
  warnOnce() {},
};

function parseArguments(argv) {
  const values = new Map();
  const targets = [];
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (flag === '--target') {
      const target = argv[index + 1];
      if (!target || target.startsWith('--')) throw new Error('--target requires a value.');
      targets.push(target);
      index += 1;
      continue;
    }
    if (!['--run-key', '--cycle', '--output', '--exclusions-file', '--mode', '--proof-scenario'].includes(flag)) {
      throw new Error(`Unknown admissions review argument: ${flag ?? '(missing)'}.`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--') || values.has(flag)) {
      throw new Error(`${flag} requires one value.`);
    }
    values.set(flag, value);
    index += 1;
  }

  const runKey = values.get('--run-key');
  const cycle = values.get('--cycle');
  const output = values.get('--output');
  const mode = values.get('--mode') ?? 'live';
  if (!['live', 'bootstrap', 'operational_proof'].includes(mode)) {
    throw new Error('--mode must be live, bootstrap, or operational_proof.');
  }
  if (mode === 'operational_proof') {
    if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(runKey ?? '')) {
      throw new Error('Operational proof --run-key must be a stable safe identifier.');
    }
    if (values.get('--proof-scenario') !== runKey) {
      throw new Error('Operational proof --proof-scenario must match --run-key.');
    }
  } else if (!/^20\d{2}-W\d{2}$/.test(runKey ?? '')) {
    throw new Error('--run-key must use YYYY-Www for live and bootstrap modes.');
  }
  if (mode === 'operational_proof') {
    if (cycle !== '2099') throw new Error('Operational proof mode requires cycle 2099.');
  } else if (!/^20\d{2}$/.test(cycle ?? '')) {
    throw new Error('--cycle must use YYYY.');
  }
  if (mode !== 'operational_proof' && values.has('--proof-scenario')) {
    throw new Error('--proof-scenario is only valid for operational_proof mode.');
  }
  if (!output) throw new Error('--output is required.');
  return {
    runKey,
    cycle,
    output,
    exclusionsFile: values.get('--exclusions-file'),
    mode,
    proofScenario: values.get('--proof-scenario'),
    dryRun,
    targetIds: targets.length > 0 ? targets : undefined,
  };
}

function resolveOutput(path) {
  const resolved = resolve(root, path);
  const relativePath = relative(root, resolved);
  if (relativePath.startsWith('..') || !relativePath.startsWith('scratch/')) {
    throw new Error('Admissions review output must be inside scratch/.');
  }
  return resolved;
}

async function readExcludedCandidateIds(path, runKey) {
  if (!path) return undefined;
  const resolved = resolve(root, path);
  const relativePath = relative(root, resolved);
  if (relativePath.startsWith('..') || !relativePath.startsWith('docs/admissions-review-runs/')) {
    throw new Error(
      'Admissions review exclusions must be stored under docs/admissions-review-runs/.',
    );
  }
  const value = JSON.parse(await readFile(resolved, 'utf8'));
  if (
    !value ||
    value.version !== 1 ||
    value.runKey !== runKey ||
    !Array.isArray(value.excludedCandidateIds) ||
    value.excludedCandidateIds.some(
      (id) => typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]*:admission_cutoff$/.test(id),
    )
  ) {
    throw new Error('Admissions review exclusions must be valid metadata for this weekly run.');
  }
  return [...new Set(value.excludedCandidateIds)].sort();
}

export async function runAdmissionsReviewPreparation(
  argv,
  { createViteServer = createServer, operationTimeoutMs = 15_000 } = {},
) {
  const args = parseArguments(argv);
  const excludedCandidateIds = await readExcludedCandidateIds(args.exclusionsFile, args.runKey);
  const vite = await createViteServer({
    root,
    appType: 'custom',
    customLogger: quietViteLogger,
    logLevel: 'error',
    server: { hmr: false, middlewareMode: true },
    resolve: { alias: { 'server-only': serverOnlyShim }, tsconfigPaths: true },
    optimizeDeps: { noDiscovery: true },
  });

  try {
    const [
      { createAdmissionsWeeklyReviewPreparer },
      { createAdmissionsReviewRunLedger },
      { buildOperationalProofReviewRun },
    ] =
      await Promise.all([
        vite.ssrLoadModule('/src/server/admissions/weeklyReviewPreparation.ts'),
        vite.ssrLoadModule('/src/server/admissions/admissionsReviewRunLedger.ts'),
        vite.ssrLoadModule('/src/server/admissions/operationalProofRun.ts'),
      ]);
    const result =
      args.mode === 'operational_proof'
        ? {
            run: buildOperationalProofReviewRun({
              runKey: args.runKey,
              proofScenario: args.proofScenario,
              checkedAt: new Date(),
            }),
            persistence: null,
          }
        : await createAdmissionsWeeklyReviewPreparer().prepare({
            runKey: args.runKey,
            cycle: args.cycle,
            targetIds: args.targetIds,
            excludedCandidateIds,
            dryRun: args.dryRun,
            releaseKind: args.mode === 'bootstrap' ? 'canonical_bootstrap' : 'canonical_change',
          });
    if (!args.dryRun) await createAdmissionsReviewRunLedger().recordPreparedRun(result.run);

    const output = resolveOutput(args.output);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify({ run: result.run }, null, 2)}\n`, 'utf8');
    console.info(
      JSON.stringify({
        runKey: result.run.runKey,
        status: result.run.summary.status,
        candidateCount: result.run.summary.candidateCount,
        excludedCount: result.run.summary.excludedCount,
        mode: args.mode,
        output: relative(root, output),
      }),
    );
  } finally {
    await closeReviewPreparationResources(vite, { operationTimeoutMs });
  }
}

/**
 * @param {{ ssrLoadModule: (path: string) => Promise<{ closeDb?: () => Promise<void> }>; close: () => Promise<void> }} vite
 * @param {{ operationTimeoutMs?: number; log?: Pick<Console, 'info' | 'warn'> }} [options]
 */
export async function closeReviewPreparationResources(
  vite,
  { operationTimeoutMs = 15_000, log = console } = {},
) {
  let closeDb;
  try {
    const databaseClient = await completeWithin(
      vite.ssrLoadModule('/src/db/client.ts'),
      'Admissions review database client cleanup setup',
      operationTimeoutMs,
    );
    closeDb = databaseClient.closeDb;
  } catch (error) {
    log.warn(
      JSON.stringify({
        phase: 'database_close_setup_incomplete',
        error: cleanupErrorMessage(error),
      }),
    );
  }

  if (closeDb) {
    await completeCleanup({
      operation: closeDb,
      description: 'Admissions review database cleanup',
      startPhase: 'database_close_start',
      completePhase: 'database_close_complete',
      timeoutPhase: 'database_close_incomplete',
      operationTimeoutMs,
      log,
    });
  }

  await completeCleanup({
    operation: () => vite.close(),
    description: 'Admissions review Vite cleanup',
    startPhase: 'vite_close_start',
    completePhase: 'vite_close_complete',
    timeoutPhase: 'vite_close_incomplete',
    operationTimeoutMs,
    log,
  });
}

async function completeCleanup({
  operation,
  description,
  startPhase,
  completePhase,
  timeoutPhase,
  operationTimeoutMs,
  log,
}) {
  log.info(JSON.stringify({ phase: startPhase }));
  try {
    await completeWithin(operation(), description, operationTimeoutMs);
    log.info(JSON.stringify({ phase: completePhase }));
  } catch (error) {
    log.warn(
      JSON.stringify({
        phase: timeoutPhase,
        error: cleanupErrorMessage(error),
      }),
    );
  }
}

function cleanupErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function completeWithin(promise, operation, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${operation} timed out after ${timeoutMs}ms.`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function runAdmissionsReviewPreparationCli(
  argv,
  dependencies,
  exit = /** @type {(code: number) => void} */ (process.exit),
) {
  try {
    await runAdmissionsReviewPreparation(argv, dependencies);
    exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runAdmissionsReviewPreparationCli(process.argv.slice(2));
}
