import { z } from 'zod';
import { enquirySourcePath } from './enquirySourcePath';
import { SITE_URL } from './site';

const phoneLike = /(?:\d[-_ .()+]*){7}/;
// Campaign values are bounded metadata; do not reinterpret names, numbers or punctuation.
const campaignValue = z.string().max(100);

export const referrerSchema = z
  .string()
  .max(2048)
  .transform((value) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      const sameSite =
        url.origin === SITE_URL ||
        (typeof window !== 'undefined' && url.origin === window.location.origin) ||
        (Boolean(process.env.VERCEL_URL) && url.origin === `https://${process.env.VERCEL_URL}`);
      const referrer = url.origin + (sameSite ? enquirySourcePath(url.pathname) : '');
      const decoded = decodeURIComponent(referrer);
      if (
        /@|%40|%25/i.test(decoded) ||
        phoneLike.test(decoded) ||
        /^[\d.]+$/.test(url.hostname) ||
        url.hostname.includes(':')
      )
        return null;
      return referrer;
    } catch {
      return null;
    }
  })
  .pipe(z.string().max(256));

export const enquiryAttributionSchema = z.object({
  utm_source: campaignValue.optional(),
  utm_medium: campaignValue.optional(),
  utm_campaign: campaignValue.optional(),
  referrer: referrerSchema.optional(),
});

export type EnquiryAttribution = z.infer<typeof enquiryAttributionSchema>;

const ENQUIRY_ORIGIN_KEY = 'myway_enquiry_origin_v1';

function validatedOriginPath(value: string): string | undefined {
  const pathname = value.split(/[?#]/)[0];
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\'))
    return undefined;
  // enquirySourcePath uses / for unknown routes; do not mistake that fallback for an origin.
  return enquirySourcePath(pathname) === pathname ? pathname : undefined;
}

export function clearEnquiryOrigin(): void {
  try {
    window.sessionStorage.removeItem(ENQUIRY_ORIGIN_KEY);
  } catch {
    // Storage can be unavailable in embedded browsers.
  }
}

export function recordEnquiryOrigin(destination: string): void {
  clearEnquiryOrigin();
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(destination, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== '/enquiry') return;
    const pathname = validatedOriginPath(window.location.pathname);
    if (pathname) window.sessionStorage.setItem(ENQUIRY_ORIGIN_KEY, pathname);
  } catch {
    // Attribution must never interrupt navigation when storage or the URL is unavailable.
  }
}

export function getEnquiryOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = window.sessionStorage.getItem(ENQUIRY_ORIGIN_KEY);
    const pathname = stored === null ? undefined : validatedOriginPath(stored);
    if (pathname) return pathname;
  } catch {
    // A same-origin referrer can still be used when storage is blocked.
  }
  try {
    const url = new URL(document.referrer);
    if (url.origin !== window.location.origin || url.username || url.password) return undefined;
    return validatedOriginPath(url.pathname);
  } catch {
    return undefined;
  }
}
