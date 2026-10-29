import posthog from 'posthog-js';

import { sanitizePostHogEvent } from './src/lib/posthogPrivacy';
import { getSessionAttribution } from './src/lib/sessionAttribution';
import { clearEnquiryOrigin, recordEnquiryOrigin } from './src/lib/leadAttribution';

// A fresh document cannot inherit the origin of an earlier soft navigation.
clearEnquiryOrigin();

export function onRouterTransitionStart(
  url: string,
  _navigationType: 'push' | 'replace' | 'traverse',
) {
  recordEnquiryOrigin(url);
}

const firstTouch = getSessionAttribution();
const attribution = {
  utm_source: firstTouch.utm_source ?? null,
  utm_medium: firstTouch.utm_medium ?? null,
  utm_campaign: firstTouch.utm_campaign ?? null,
  referrer: firstTouch.referrer ?? null,
};

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: '/ingest',
  ui_host: 'https://eu.posthog.com',
  defaults: '2026-01-30',
  save_campaign_params: false,
  save_referrer: false,
  loaded: (client) => client.register_for_session(attribution),
  before_send: (event) =>
    sanitizePostHogEvent(
      event
        ? {
            ...event,
            properties: { ...event.properties, ...attribution },
          }
        : null,
    ),
  session_recording: { maskAllInputs: true, maskTextSelector: '*' },
  capture_pageview: true,
  capture_exceptions: true,
  debug: process.env.NODE_ENV === 'development',
});
