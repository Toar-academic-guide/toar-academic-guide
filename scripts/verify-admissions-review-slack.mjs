async function slackRequest(path, token) {
  const response = await fetch(`https://slack.com/api/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Slack preflight request failed (${response.status}).`);
  const body = await response.json();
  if (!body.ok) throw new Error('Slack preflight was rejected by the configured workspace.');
}

async function main() {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const channelId = process.env.SLACK_READY_PR_CHANNEL_ID?.trim();
  if (!token || !channelId) {
    throw new Error('Admissions Slack preflight requires the configured bot token and ready-PR channel.');
  }
  await slackRequest('auth.test', token);
  await slackRequest(`conversations.info?channel=${encodeURIComponent(channelId)}`, token);
  console.info(JSON.stringify({ status: 'ok' }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Slack preflight failed.');
  process.exitCode = 1;
});
