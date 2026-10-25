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
