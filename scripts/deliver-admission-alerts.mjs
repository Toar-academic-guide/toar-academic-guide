import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { closeAdmissionPublicationResources } from './publish-admissions-release.mjs';

export function parseAlertDeliveryArguments(argv) {
  if (argv.length === 1 && argv[0] === '--dry-run') return { dryRun: true };
  if (argv.length === 1 && argv[0] === '--send') return { dryRun: false };
  throw new Error('Specify --dry-run or --send explicitly.');
}
async function main(argv) {
  const args = parseAlertDeliveryArguments(argv);
  if (!process.env.ADMISSION_ALERT_DATABASE_URL) throw new Error('ADMISSION_ALERT_DATABASE_URL is required.');
  process.env.DATABASE_URL = process.env.ADMISSION_ALERT_DATABASE_URL;
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)), appType: 'custom', logLevel: 'silent',
    server: { hmr: false, middlewareMode: true },
    resolve: {
      alias: { 'server-only': fileURLToPath(new URL('./server-only-shim.mjs', import.meta.url)) },
      tsconfigPaths: true,
    },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { runAdmissionAlertDelivery } = await vite.ssrLoadModule('/src/server/admission-alerts/deliveryRuntime.ts');
    console.log(JSON.stringify(await runAdmissionAlertDelivery(args)));
  } finally {
    const cleanup = await closeAdmissionPublicationResources(vite);
    if (cleanup.incomplete) throw new Error('Alert worker cleanup incomplete.');
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(() => process.exit(0)).catch(() => {
    console.error('Admission alert delivery failed; inspect aggregate queue health and configuration.');
    process.exit(1);
  });
}
