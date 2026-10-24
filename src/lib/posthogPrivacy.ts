import { enquiryAttributionSchema, referrerSchema } from './leadAttribution';

const emailAddress = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu;

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
    const redacted = decoded.replace(emailAddress, '[redacted]');
    return redacted === decoded ? value : redacted;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/email/i.test(key) && scrub(key) === key)
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
  if (typeof distinctId === 'string' && scrub(distinctId) !== distinctId) return null;
  return scrub(event) as T;
}
