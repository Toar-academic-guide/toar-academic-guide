import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const serverOnlyShim = fileURLToPath(new URL('./server-only-shim.mjs', import.meta.url));
const usage = 'Usage: node scripts/approve-admissions-review.mjs <reviewItemId> --actor <name>';
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
  if (
    (argv.length !== 3 && argv.length !== 5) ||
    argv[1] !== '--actor' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(argv[0] ?? '') ||
    !argv[2]?.trim() ||
    argv[2].startsWith('--') ||
    (argv.length === 5 &&
      (argv[3] !== '--triggering-actor' || !argv[4]?.trim() || argv[4].trim().startsWith('--')))
  ) {
    throw new Error(usage);
  }
  return { reviewItemId: argv[0], actor: argv[2].trim(), triggeringActor: argv[4]?.trim() };
}

export async function runAdmissionsReviewApprovalCli(
  argv,
  { approve, createViteServer = createServer } = {},
  exit = /** @type {(code: number) => void} */ (process.exit),
) {
  let vite;
  let closeDb;
  let exitCode = 1;
  try {
    // Validate before loading any server modules or constructing a repository.
    const { reviewItemId, actor, triggeringActor } = parseArguments(argv);
    if (!approve) {
      vite = await createViteServer({
        root,
        appType: 'custom',
        customLogger: quietViteLogger,
        logLevel: 'error',
        server: { hmr: false, middlewareMode: true },
        resolve: { alias: { 'server-only': serverOnlyShim }, tsconfigPaths: true },
        optimizeDeps: { noDiscovery: true },
      });
      ({ closeDb } = await vite.ssrLoadModule('/src/db/client.ts'));
      ({ approveReviewItem: approve } = await vite.ssrLoadModule(
        '/src/server/ingestion/reviewResolution.ts',
      ));
    }
    const result = await approve(reviewItemId, {
      actor,
      // Keep stdout machine-readable; the single audit event goes to stderr.
      auditLog: (entry) =>
        console.error(JSON.stringify(triggeringActor ? { ...entry, triggeringActor } : entry)),
    });
    console.log(JSON.stringify(result));
    exitCode = result.status === 'approved' ? 0 : 1;
  } catch (error) {
    // Database errors can contain credentials or query parameters; never print them.
    console.error(
      error instanceof Error && error.message === usage ? usage : 'Review approval failed.',
    );
  } finally {
    try {
      await closeDb?.();
    } catch {
      console.error('Database cleanup failed.');
      exitCode = 1;
    } finally {
      try {
        await vite?.close();
      } catch {
        console.error('Runtime cleanup failed.');
        exitCode = 1;
      }
    }
  }
  exit(exitCode);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runAdmissionsReviewApprovalCli(process.argv.slice(2));
}
