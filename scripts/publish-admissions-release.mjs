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
    const [
      { createAdmissionsReleasePublisher },
      { parsePublicationArguments },
      { enqueueAdmissionAlertTransitionWork },
    ] = await Promise.all([
      vite.ssrLoadModule('/src/server/admissions/admissionsReleasePublisher.ts'),
      vite.ssrLoadModule('/src/server/admissions/publicationArgs.ts'),
      vite.ssrLoadModule('/src/server/admission-alerts/transitionWork.ts'),
    ]);
    const args = parsePublicationArguments(process.argv.slice(2));
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
  } finally {
    await vite.close();
  }
}

function resolveInsideRepository(path) {
  const resolved = resolve(root, path);
  const relativePath = relative(root, resolved);
  if (relativePath.startsWith('..') || relativePath === '') {
    throw new Error('Publication manifest must be a file inside this repository.');
  }
  return resolved;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
