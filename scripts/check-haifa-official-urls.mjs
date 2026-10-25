import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

const PROGRAM_IDS = ['haifa_cs', 'haifa_law'];

export function collectOfficialUrls(programs) {
  const urls = new Set();
  const visit = (value) => {
    if (typeof value === 'string' && /^https?:\/\//.test(value)) urls.add(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  for (const id of PROGRAM_IDS) {
    const program = programs.find((candidate) => candidate.id === id);
    if (!program) throw new Error(`Missing catalogue row: ${id}`);
    // Visit the entire row, including future nested evidence/source links.
    visit(program);
    if (!program.institutionDetails?.some((detail) => detail.programUrl)) {
      throw new Error(`Missing official programme URL: ${id}`);
    }
  }
  return [...urls];
}

export async function checkOfficialUrl(
  url,
  { request = fetch, pause = (ms) => setTimeout(ms), timeoutMs = 15_000 } = {},
) {
  const official = (candidate) => {
    const parsed = new URL(candidate);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'haifa.ac.il' || parsed.hostname.endsWith('.haifa.ac.il'))
    );
  };
  if (!official(url)) return { url, outcome: 'broken', reason: 'Not an official Haifa HTTPS URL' };
  let reason;
  let status;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': 'MyWay-catalogue-link-check/1.0' },
      });
      status = response.status;
      await response.body?.cancel().catch(() => {});
      if (response.url && !official(response.url)) {
        return {
          url,
          outcome: 'broken',
          status,
          reason: 'Redirected outside the official Haifa site',
        };
      }
      if (status === 200) return { url, outcome: 'ok', status };
      reason = `HTTP ${status}`;
      if (![408, 425, 429].includes(status) && status < 500) {
        return { url, outcome: 'broken', status, reason };
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 2) await pause(250 * (attempt + 1));
  }
  return { url, outcome: 'inconclusive', status, reason };
}

export function exitCodeFor(results, networkTolerant) {
  return results.some(
    (result) => result.outcome === 'broken' || (!networkTolerant && result.outcome !== 'ok'),
  )
    ? 1
    : 0;
}

async function main() {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
    resolve: { tsconfigPaths: true },
  });
  try {
    const { getStaticCataloguePrograms } = await vite.ssrLoadModule('/src/lib/catalogueStatic.ts');
    const urls = collectOfficialUrls(getStaticCataloguePrograms());
    const results = await Promise.all(urls.map((url) => checkOfficialUrl(url)));
    const networkTolerant = process.argv.includes('--ci') && !process.argv.includes('--strict');
    for (const result of results) {
      const message = `${result.outcome}: ${result.url} (${result.status ?? result.reason})`;
      if (result.outcome === 'inconclusive' && networkTolerant)
        console.warn(`::warning::${message}`);
      else console.log(message);
    }
    process.exitCode = exitCodeFor(results, networkTolerant);
  } finally {
    await vite.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
