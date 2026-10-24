import { enquiryAttributionSchema, referrerSchema } from './leadAttribution';

const emailAddress = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu;
// Seven to fifteen digits cover local numbers through E.164, including URL-form spaces (+).
const phoneNumber =
  /(?<![\p{L}\p{N}])\+?\(?\d(?:[\s()+.\-\u2010-\u2015]*\d){6,14}(?![\p{L}\p{N}])/gu;
const internalUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function scrubCampaignUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
      const candidate = url.searchParams.get(key);
      if (candidate !== null && !enquiryAttributionSchema.shape[key].safeParse(candidate).success) {
        url.searchParams.delete(key);
      }
    }
    return url.href;
  } catch {
    return value;
  }
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    let decoded = value;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      // Error strings and DOM text are not necessarily URI encoded.
    }
    // Supabase and anonymous SDK UUIDs can contain long numeric groups.
    if (internalUuid.test(decoded)) return value;
    const redacted = decoded.replace(emailAddress, '[redacted]').replace(phoneNumber, '[redacted]');
    return redacted === decoded ? value : redacted;
  }
  if (typeof value === 'number' && Number.isInteger(value) && /^\d{7,15}$/.test(String(value))) {
    return '[redacted]';
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/email|phone|mobile/i.test(key) && scrub(key) === key)
        .map(([key, entry]) => [key, scrubProperty(key, entry)]),
    );
  }
  return value;
}

function scrubProperty(key: string, value: unknown): unknown {
  if (/^(?:\$initial_|\$)?referrer$/.test(key)) {
    const parsed = referrerSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }
  if (key === '$current_url' || key === '$initial_current_url') {
    return scrub(scrubCampaignUrl(value));
  }
  return scrub(value);
}

export function sanitizePostHogEvent<
  T extends { properties?: Record<string, unknown>; distinctId?: string },
>(event: T | null): T | null {
  if (!event) return null;
  const distinctId = event.properties?.distinct_id ?? event.distinctId;
  if (scrub(distinctId) !== distinctId) return null;
  return scrub(event) as T;
}
