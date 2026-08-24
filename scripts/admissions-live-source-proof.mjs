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

function parseArgs(argv) {
  const options = {
    applicant: {
      bagrutAverage: 105,
      psychometric: 680,
    },
    includeCapabilityMatrix: false,
    institutionId: undefined,
    limit: undefined,
    offset: 0,
    summaryOnly: false,
    targetIds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--all') {
      options.includeCapabilityMatrix = true;
    } else if (arg === '--summary') {
      options.summaryOnly = true;
    } else if (arg === '--target' && argv[index + 1]) {
      options.targetIds.push(argv[index + 1]);
      index += 1;
    } else if (arg === '--institution' && argv[index + 1]) {
      options.institutionId = argv[index + 1];
      index += 1;
    } else if (arg === '--limit' && argv[index + 1]) {
      options.limit = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--offset' && argv[index + 1]) {
      options.offset = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--bagrut' && argv[index + 1]) {
      options.applicant.bagrutAverage = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--psychometric' && argv[index + 1]) {
      options.applicant.psychometric = Number(argv[index + 1]);
      index += 1;
    }
  }

  if (options.targetIds.length === 0) {
    delete options.targetIds;
  }

  return options;
}

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
  });

  try {
    const { runAdmissionsLiveProof } = await vite.ssrLoadModule(
      '/src/server/ingestion/admissionsLiveProofRunner.ts',
    );

    const options = parseArgs(process.argv.slice(2));
    const report = await runAdmissionsLiveProof(options);
    console.log(JSON.stringify(options.summaryOnly ? report.summary : report, null, 2));
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
