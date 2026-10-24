const emailAddress = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu;

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
        .map(([key, entry]) => [key, scrub(entry)]),
    );
  }
  return value;
}

export function sanitizePostHogEvent<
  T extends { properties?: Record<string, unknown>; distinctId?: string },
>(event: T | null): T | null {
  if (!event) return null;
  const distinctId = event.properties?.distinct_id ?? event.distinctId;
  if (typeof distinctId === 'string' && scrub(distinctId) !== distinctId) return null;
  return scrub(event) as T;
}
