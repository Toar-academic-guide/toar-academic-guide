import { referrerSchema } from './leadAttribution';
import { SITE_URL } from './site';

const emailAddress = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu;
// Seven to fifteen digits cover local numbers through E.164, including URL-form spaces (+).
const phoneNumber =
  /(?<![\p{L}\p{N}])\+?\(?\d(?:[\s()+.\-\u2010-\u2015]*\d){6,14}(?![\p{L}\p{N}])/gu;
const internalUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const urlProperties = new Set([
  '$current_url',
  '$initial_current_url',
  '$session_entry_url',
  '$external_click_url',
  'href',
  'attr__href',
]);

function scrubUrl(value: unknown, mode: 'url' | 'path' | 'origin'): unknown {
  if (typeof value !== 'string' || !value.trim()) return null;
  const source = value.trim();
  if (!source.startsWith('/') && !/^https?:\/\//i.test(source)) return null;
  try {
    const url = new URL(source, mode === 'origin' ? undefined : SITE_URL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (mode === 'origin') {
      const parsed = referrerSchema.safeParse(url.origin);
      return parsed.success ? url.origin : null;
    }
    const relative = source.startsWith('/') && !source.startsWith('//');
    return scrub(mode === 'path' || relative ? url.pathname : url.origin + url.pathname);
  } catch {
    return null;
  }
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    let decoded = value;
    for (let pass = 0; pass < 3; pass++) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        // Error strings and DOM text are not necessarily URI encoded.
        break;
      }
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
  if (/^\$(?:(?:initial|session_entry)_)?referrer$/.test(key)) {
    return scrubUrl(value, 'origin');
  }
  if (key === 'referrer') {
    const parsed = referrerSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }
  if (/^\$(?:(?:initial|session_entry|prev_pageview)_)?pathname$/.test(key)) {
    return scrubUrl(value, 'path');
  }
  if (urlProperties.has(key)) return scrubUrl(value, 'url');
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
