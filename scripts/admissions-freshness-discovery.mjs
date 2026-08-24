import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const officialHtml = `
  <html>
    <header>Admissions | News | Contact</header>
    <main>
      <h1>Admissions requirements</h1>
      <p>Minimum psychometric score: 680.</p>
      <p>Acceptance threshold: 720.</p>
      <p>English requirement: advanced A.</p>
    </main>
    <footer>Campaign footer 2026</footer>
  </html>
`;

const apiStaticJson = {
  faculty: 'Engineering',
  generatedAt: '2026-06-25T05:00:00Z',
  programs: [
    {
      id: 'cs',
      name: 'Computer Science',
      threshold: 720,
      rejectionCutoff: 690,
    },
  ],
};

const pdfText = `
  Admissions brochure
  Minimum bagrut average: 95.
  Psychometric requirement: 620.
  Campus services and map.
`;

const scoreOnlyCalculator = {
  score: 714,
  formula: 'published calculator response',
};

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
  });

  try {
    const { evaluateFreshnessDiscovery } = await vite.ssrLoadModule(
      '/src/server/ingestion/freshnessDiscovery.ts',
    );

    const samples = [
      {
        id: 'official-html-sample',
        sourceClass: 'official_html',
        body: officialHtml,
      },
      {
        id: 'api-static-json-sample',
        sourceClass: 'api_static_json',
        body: apiStaticJson,
      },
      {
        id: 'pdf-text-sample',
        sourceClass: 'pdf_text',
        body: pdfText,
      },
      {
        id: 'score-only-calculator-sample',
        sourceClass: 'score_only_calculator',
        body: scoreOnlyCalculator,
      },
      {
        id: 'browser-required-sample',
        sourceClass: 'browser_required',
        body: '',
        blockedReason: 'requires persistent browser cookies or anti-bot clearance',
      },
    ];

    const results = samples.map(evaluateFreshnessDiscovery);

    console.log(
      JSON.stringify(
        {
          summary: {
            total: results.length,
            supportedInGithubActions: results.filter((result) => result.status !== 'blocked')
              .length,
            blockedForLaterHermesLane: results.filter((result) => result.status === 'blocked')
              .length,
          },
          results,
        },
        null,
        2,
      ),
    );
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
