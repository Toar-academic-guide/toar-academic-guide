import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function main() {
  const dryRun = process.argv.includes('--dry-run');
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
    const { buildCatalogueSeed, upsertCatalogueSeed } = await vite.ssrLoadModule(
      '/src/db/seeds/catalogueSeed.ts'
    );
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
          2
        )
      );
      return;
    }

    if (!hasDatabaseUrl()) {
      throw new Error(
        'DATABASE_URL is required for db:seed. Use npm run db:seed:dry-run to inspect seed output.'
      );
    }

    await upsertCatalogueSeed(payload);
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
        },
        null,
        2
      )
    );
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
