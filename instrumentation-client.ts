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
function safeCampaignValue(value: string | undefined): string | null {
  if (!value || /[/?#\\]/.test(value)) return null;
  const sanitized = sanitizePostHogEvent({ properties: { value } });
  return sanitized?.properties?.value === value ? value : null;
}

const externalReferrer = (() => {
  if (!firstTouch.referrer) return null;
  try {
    const url = new URL(firstTouch.referrer);
    return url.origin === window.location.origin ? null : url.origin;
  } catch {
    return null;
  }
})();
const attribution = {
  utm_source: safeCampaignValue(firstTouch.utm_source),
  utm_medium: safeCampaignValue(firstTouch.utm_medium),
  utm_campaign: safeCampaignValue(firstTouch.utm_campaign),
  referrer: externalReferrer,
  $referrer: externalReferrer,
  $referring_domain: externalReferrer ? new URL(externalReferrer).hostname : null,
};

const campaign = Object.fromEntries(
  (['utm_source', 'utm_medium', 'utm_campaign'] as const).flatMap((key) =>
    attribution[key] ? [[key, attribution[key]]] : [],
  ),
);

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: '/ingest',
  ui_host: 'https://eu.posthog.com',
  defaults: '2026-01-30',
  save_campaign_params: false,
  save_referrer: false,
  custom_blocked_useragents: ['meta-externalfetcher', 'tiktokspider', 'tiktokbot', 'instagrambot'],
  loaded: (client) => client.register_for_session(attribution),
  before_send: (event) => {
    if (!event) return null;
    const properties: Record<string, unknown> = { ...event.properties };
    // The SDK also derives session-entry UTM fields from the raw landing query.
    for (const key of Object.keys(properties)) {
      if (/^(?:\$(?:initial|session_entry)_)?utm_/.test(key)) delete properties[key];
    }
    Object.assign(properties, attribution);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
      properties[`$session_entry_${key}`] = attribution[key];
    }
    properties.$session_entry_referrer = externalReferrer;
    properties.$session_entry_referring_domain = attribution.$referring_domain;
    if (event.event === '$identify') {
      properties.$set = { ...((properties.$set as Record<string, unknown>) ?? {}), ...campaign };
      properties.$set_once = {
        ...((properties.$set_once as Record<string, unknown>) ?? {}),
        ...Object.fromEntries(
          Object.entries(campaign).map(([key, value]) => [`$initial_${key}`, value]),
        ),
      };
    }
    return sanitizePostHogEvent({ ...event, properties });
  },
  session_recording: { maskAllInputs: true, maskTextSelector: '*' },
  capture_pageview: true,
  capture_exceptions: true,
  debug: process.env.NODE_ENV === 'development',
});
