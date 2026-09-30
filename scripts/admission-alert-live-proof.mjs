/** This test mode never accepts a recipient or a production database as input. */
export function liveProofConfiguration(env) {
  if (env.ALERT_LIVE_PROOF !== '1') return null;
  const db = new URL(env.DATABASE_URL ?? 'postgresql://unused');
  if (
    env.ALERT_DB_INTEGRATION !== '1' ||
    !['localhost', '127.0.0.1'].includes(db.hostname) ||
    db.pathname !== '/admission_alert_live_proof' ||
    db.search ||
    env.GITHUB_ACTIONS !== 'true' ||
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    env.GITHUB_RUN_ATTEMPT !== '1' ||
    !env.ADMISSION_ALERT_RESEND_API_KEY?.startsWith('re_')
  ) {
    throw new Error(
      'Live proof requires a first-attempt manual main run and the isolated local database. Do not rerun an uncertain send.',
    );
  }
  return {
    recipient: 'amitm1630@gmail.com',
    apiKey: env.ADMISSION_ALERT_RESEND_API_KEY,
    email: {
      from: 'onboarding@resend.dev',
      supportEmail: 'amitm1630@gmail.com',
      origin: 'https://toar-academic-guide.vercel.app',
    },
  };
}
