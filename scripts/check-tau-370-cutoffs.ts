import {
  parseTau370CutoffPage,
  TAU_370_CUTOFFS,
} from '../src/data/admissions/tau370CutoffVerification';

async function main() {
  const mismatches: string[] = [];
  for (const [programId, semester, url, acceptance, rejection] of TAU_370_CUTOFFS) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const actual = response.ok ? parseTau370CutoffPage(await response.text()) : null;
    if (
      !actual ||
      actual.acceptance !== acceptance ||
      actual.rejection !== rejection ||
      actual.semester !== `סמסטר ${semester}` ||
      actual.year !== 'תשפ"ז'
    ) {
      mismatches.push(
        `${programId} semester ${semester}: source drift or unavailable (${response.status})`,
      );
    }
  }
  if (mismatches.length) throw new Error(mismatches.join('\n'));
  process.stdout.write(
    `Verified both TAU cutoff fields and semester labels on ${TAU_370_CUTOFFS.length} official tabs.\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
