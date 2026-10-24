import posthog from 'posthog-js';

import { sanitizePostHogEvent } from './src/lib/posthogPrivacy';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: '/ingest',
  ui_host: 'https://eu.posthog.com',
  defaults: '2026-01-30',
  before_send: sanitizePostHogEvent,
  session_recording: { maskAllInputs: true, maskTextSelector: '*' },
  capture_pageview: true,
  capture_exceptions: true,
  debug: process.env.NODE_ENV === 'development',
});
