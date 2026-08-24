import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const verifyOnly = process.argv.includes('--verify');
  const vite = await createServer({
    root,
    appType: 'custom',
    logLevel: 'error',
    server: {
      middlewareMode: true,
    },
    resolve: {
      tsconfigPaths: true,
    },
  });

  try {
    const { buildCatalogueSeed, upsertCatalogueSeed, verifyCatalogueSeed } =
      await vite.ssrLoadModule('/src/db/seeds/catalogueSeed.ts');
    const { hasDatabaseUrl } = await vite.ssrLoadModule('/src/env.ts');
    const payload = buildCatalogueSeed();

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            counts: {
              institutions: payload.institutions.length,
              programs: payload.programs.length,
              programInstitutions: payload.programInstitutions.length,
              admissionRequirements: payload.admissionRequirements.length,
              admissionThresholds: payload.admissionThresholds.length,
              sourceUrls: payload.sourceUrls.length,
              requirementVersions: payload.requirementVersions.length,
            },
            validationErrors: payload.validationErrors,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (!hasDatabaseUrl()) {
      throw new Error(
        'DATABASE_URL is required for db:seed. Use npm run db:seed:dry-run to inspect seed output.',
      );
    }

    if (verifyOnly) {
      const verification = await verifyCatalogueSeed(payload);
      console.log(
        JSON.stringify(
          {
            verification,
          },
          null,
          2,
        ),
      );
      if (!verification.isMatching) {
        process.exitCode = 1;
      }
      return;
    }

    await upsertCatalogueSeed(payload);
    const verification = await verifyCatalogueSeed(payload);
    console.log(
      JSON.stringify(
        {
          seeded: {
            institutions: payload.institutions.length,
            programs: payload.programs.length,
            programInstitutions: payload.programInstitutions.length,
            admissionRequirements: payload.admissionRequirements.length,
            admissionThresholds: payload.admissionThresholds.length,
            sourceUrls: payload.sourceUrls.length,
            requirementVersions: payload.requirementVersions.length,
          },
          verification,
        },
        null,
        2,
      ),
    );
    if (!verification.isMatching) {
      process.exitCode = 1;
    }
  } finally {
    const { closeDb } = await vite.ssrLoadModule('/src/db/client.ts');
    await closeDb();
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
