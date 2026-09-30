import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { closeAdmissionPublicationResources } from './publish-admissions-release.mjs';

export function parseAlertProcessingArguments(argv) {
  if (argv.length === 0) return {};
  if (
    argv.length !== 2 ||
    argv[0] !== '--release-id' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(argv[1])
  ) {
    throw new Error('Expected --release-id with a release UUID, or no arguments for recovery.');
  }
  return { releaseId: argv[1] };
}

async function main(argv) {
  const args = parseAlertProcessingArguments(argv);
  if (!process.env.ADMISSION_ALERT_DATABASE_URL)
    throw new Error('ADMISSION_ALERT_DATABASE_URL is required.');
  process.env.DATABASE_URL = process.env.ADMISSION_ALERT_DATABASE_URL;
  process.env.CATALOGUE_SOURCE_MODE = 'database';
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    appType: 'custom',
    logLevel: 'silent',
    server: { hmr: false, middlewareMode: true },
    resolve: {
      alias: { 'server-only': fileURLToPath(new URL('./server-only-shim.mjs', import.meta.url)) },
      tsconfigPaths: true,
    },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { runAdmissionAlertProcessing } = await vite.ssrLoadModule(
      '/src/server/admission-alerts/processingRuntime.ts',
    );
    console.log(JSON.stringify(await runAdmissionAlertProcessing(args)));
  } finally {
    const cleanup = await closeAdmissionPublicationResources(vite);
    if (cleanup.incomplete) throw new Error('Alert worker cleanup incomplete.');
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
    .then(() => process.exit(0))
    .catch(() => {
      // Evaluator/database errors can embed academic values. Do not log the raw error.
      console.error(
        'Admission alert processing failed; inspect aggregate queue health and configuration.',
      );
      process.exit(1);
    });
}
