import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const serverOnlyShim = fileURLToPath(new URL('./server-only-shim.mjs', import.meta.url));

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

export async function runAdmissionsReleasePublication(
  argv,
  { createViteServer = createServer, operationTimeoutMs = 15_000 } = {},
) {
  const vite = await createViteServer({
    root,
    appType: 'custom',
    customLogger: quietViteLogger,
    logLevel: 'error',
    server: { hmr: false, middlewareMode: true },
    resolve: { alias: { 'server-only': serverOnlyShim }, tsconfigPaths: true },
    optimizeDeps: { noDiscovery: true },
  });

  let publicationError;
  try {
    const [
      { createAdmissionsReleasePublisher },
      { parsePublicationArguments },
      { enqueueAdmissionAlertTransitionWork },
    ] = await Promise.all([
      vite.ssrLoadModule('/src/server/admissions/admissionsReleasePublisher.ts'),
      vite.ssrLoadModule('/src/server/admissions/publicationArgs.ts'),
      vite.ssrLoadModule('/src/server/admission-alerts/transitionWork.ts'),
    ]);
    const args = parsePublicationArguments(argv);
    const manifestPath = resolveInsideRepository(args.manifestPath);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const result = await createAdmissionsReleasePublisher().publish({
      manifest,
      repositoryCommit: args.repositoryCommit,
      proofFailureStage: args.proofFailureStage,
      proofConfirmationId: args.proofConfirmationId,
    });

    const transitionWork =
      result.status === 'no_changes' || manifest.releaseKind !== 'canonical_change'
        ? null
        : await enqueueAdmissionAlertTransitionWork({ releaseId: result.releaseId });

    console.log(JSON.stringify({ ...result, transitionWork }));
  } catch (error) {
    publicationError = error;
    throw error;
  } finally {
    const cleanup = await closeAdmissionPublicationResources(vite, { operationTimeoutMs });
    if (cleanup.incomplete && !publicationError) {
      throw new Error('Admissions publication cleanup did not settle before the deadline.');
    }
  }
}

/**
 * @param {{ ssrLoadModule: (path: string) => Promise<{ closeDb?: () => Promise<void> }>; close: () => Promise<void> }} vite
 * @param {{ operationTimeoutMs?: number; log?: Pick<Console, 'info' | 'warn'> }} [options]
 */
export async function closeAdmissionPublicationResources(
  vite,
  { operationTimeoutMs = 15_000, log = console } = {},
) {
  let incomplete = false;
  let closeDb;
  try {
    const databaseClient = await completeWithin(
      vite.ssrLoadModule('/src/db/client.ts'),
      'Admissions publication database client cleanup setup',
      operationTimeoutMs,
    );
    closeDb = databaseClient.closeDb;
  } catch (error) {
    incomplete = true;
    log.warn(
      JSON.stringify({
        phase: 'database_close_setup_incomplete',
        error: cleanupErrorMessage(error),
      }),
    );
  }

  if (closeDb) {
    incomplete =
      (await completeCleanup({
        operation: closeDb,
        description: 'Admissions publication database cleanup',
        startPhase: 'database_close_start',
        completePhase: 'database_close_complete',
        timeoutPhase: 'database_close_incomplete',
        operationTimeoutMs,
        log,
      })) || incomplete;
  }

  incomplete =
    (await completeCleanup({
      operation: () => vite.close(),
      description: 'Admissions publication Vite cleanup',
      startPhase: 'vite_close_start',
      completePhase: 'vite_close_complete',
      timeoutPhase: 'vite_close_incomplete',
      operationTimeoutMs,
      log,
    })) || incomplete;

  return { incomplete };
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
    return false;
  } catch (error) {
    log.warn(
      JSON.stringify({
        phase: timeoutPhase,
        error: cleanupErrorMessage(error),
      }),
    );
    return true;
  }
}

function completeWithin(promise, description, timeoutMs) {
  let timeout;
  const timedOut = new Promise((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${description} timed out after ${timeoutMs}ms.`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timedOut]).finally(() => clearTimeout(timeout));
}

function cleanupErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function resolveInsideRepository(path) {
  const resolved = resolve(root, path);
  const relativePath = relative(root, resolved);
  if (relativePath.startsWith('..') || relativePath === '') {
    throw new Error('Publication manifest must be a file inside this repository.');
  }
  return resolved;
}

export async function runAdmissionsReleasePublicationCli(
  argv,
  { runPublication = runAdmissionsReleasePublication } = {},
  exit = /** @type {(code: number) => void} */ (process.exit),
) {
  try {
    await runPublication(argv);
    exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    // A timed-out cleanup can leave Vite or the postgres pool holding active handles.
    // Exit deliberately after recording the failure instead of leaving the workflow alive.
    exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runAdmissionsReleasePublicationCli(process.argv.slice(2));
}
