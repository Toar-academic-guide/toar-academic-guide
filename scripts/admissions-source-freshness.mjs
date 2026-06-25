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

async function main() {
  const vite = await createServer({
    root,
    appType: 'custom',
    customLogger: quietViteLogger,
    logLevel: 'error',
    server: {
      hmr: false,
      middlewareMode: true,
    },
    resolve: {
      tsconfigPaths: true,
    },
    optimizeDeps: {
      noDiscovery: true,
    },
  });

  try {
    const { parseAdmissionsSourceFreshnessArgs, runAdmissionsSourceFreshness } =
      await vite.ssrLoadModule('/src/server/ingestion/admissionsSourceFreshnessRunner.ts');

    const result = await runAdmissionsSourceFreshness(
      parseAdmissionsSourceFreshnessArgs(process.argv.slice(2))
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
