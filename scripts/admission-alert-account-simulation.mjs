import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { closeAdmissionPublicationResources } from './publish-admissions-release.mjs';

export function accountSimulationConfiguration(env) {
  if (
    env.GITHUB_ACTIONS !== 'true' ||
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    env.GITHUB_RUN_ATTEMPT !== '1' ||
    env.CONFIRM_SIMULATION !== 'true' ||
    !/^[a-f0-9-]{36}$/.test(env.ADMISSION_ALERT_SIMULATION_USER_ID ?? '') ||
    !env.ADMISSION_ALERT_DATABASE_URL ||
    !env.ADMISSION_ALERT_RESEND_API_KEY?.startsWith('re_') ||
    env.ADMISSION_ALERT_PROCESSING_ENABLED === 'true' ||
    env.ADMISSION_ALERT_DELIVERY_ENABLED === 'true'
  )
    throw new Error(
      'Simulation requires approved manual main execution with automatic workers disabled.',
    );
  return { userId: env.ADMISSION_ALERT_SIMULATION_USER_ID, recipient: 'amitm1630@gmail.com' };
}

async function main() {
  const config = accountSimulationConfiguration(process.env);
  process.env.DATABASE_URL = process.env.ADMISSION_ALERT_DATABASE_URL;
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
    const { getDb } = await vite.ssrLoadModule('/src/db/client.ts');
    const { runAccountAlertSimulation } = await vite.ssrLoadModule(
      '/scripts/admission-alert-account-simulation-runtime.ts',
    );
    const { createResendAdmissionAlertProvider } = await vite.ssrLoadModule(
      '/src/server/admission-alerts/resendProvider.ts',
    );
    const rows = await runAccountAlertSimulation({
      db: getDb(),
      userId: config.userId,
      secret: process.env.ADMISSION_ALERT_TOKEN_SECRET ?? '',
      provider: createResendAdmissionAlertProvider({
        apiKey: process.env.ADMISSION_ALERT_RESEND_API_KEY,
      }),
    });
    console.log(JSON.stringify({ simulation: true, results: rows }));
    if (rows.length !== 2 || rows.some((row) => row.status !== 'accepted'))
      throw new Error('Inspect simulation status before any new send.');
  } finally {
    const cleanup = await closeAdmissionPublicationResources(vite);
    if (cleanup.incomplete) throw new Error('Simulation cleanup incomplete.');
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  main()
    .then(() => process.exit(0))
    .catch(() => {
      console.error('Account simulation stopped; inspect aggregate state before continuing.');
      process.exit(1);
    });
