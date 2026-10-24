import { z } from 'zod';

const phoneLike = /(?:\d[-_ .()+]*){7}/;
const campaignToken = z
  .string()
  .trim()
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/i)
  .refine((value) => !phoneLike.test(value));

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

export const enquiryAttributionSchema = z.strictObject({
  utm_source: campaignToken.optional(),
  utm_medium: campaignToken.optional(),
  utm_campaign: campaignToken.optional(),
  referrer: referrerSchema.optional(),
});

export type EnquiryAttribution = z.infer<typeof enquiryAttributionSchema>;
