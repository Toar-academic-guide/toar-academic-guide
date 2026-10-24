import { z } from 'zod';

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
      url.search = '';
      url.hash = '';
      const decoded = decodeURIComponent(url.href);
      if (
        /@|%40|%25/i.test(decoded) ||
        phoneLike.test(decoded) ||
        /^[\d.]+$/.test(url.hostname) ||
        url.hostname.includes(':')
      )
        return null;
      return url.href;
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
