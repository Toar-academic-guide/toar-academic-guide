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

async function main() {
  const vite = await createServer({
    root,
    appType: 'custom',
    customLogger: quietViteLogger,
    logLevel: 'error',
    server: { hmr: false, middlewareMode: true },
    resolve: { alias: { 'server-only': serverOnlyShim }, tsconfigPaths: true },
    optimizeDeps: { noDiscovery: true },
  });

  try {
    const {
      createDrizzleAdmissionAlertExpirationRepository,
      expirePriorAdmissionAlertSubscriptions,
    } = await vite.ssrLoadModule('/src/server/admission-alerts/expirationService.ts');
    const result = await expirePriorAdmissionAlertSubscriptions({
      repository: createDrizzleAdmissionAlertExpirationRepository(),
    });
    const { getDb } = await vite.ssrLoadModule('/src/db/client.ts');
    const { sql } = await import('drizzle-orm');
    const [retention] = await getDb().execute(
      sql`select admission_alert_private.prune_retained_data() as cleanup`,
    );
    console.log(JSON.stringify({ ...result, retention: retention.cleanup }));
  } finally {
    const { closeDb } = await vite.ssrLoadModule('/src/db/client.ts');
    await closeDb();
    await vite.close();
  }
}

main().catch(() => {
  console.error('Admission-alert maintenance failed. Inspect schema and runtime grants.');
  process.exitCode = 1;
});
