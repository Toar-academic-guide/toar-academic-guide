import { runReadyPrSlackNotification } from '../src/server/automation/readyPrSlack';

async function main() {
  const result = await runReadyPrSlackNotification({});
  console.info(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
