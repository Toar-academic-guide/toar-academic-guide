import { describe, expect, it } from 'vitest';
import { sanitizePostHogEvent } from './posthogPrivacy';

describe('PostHog payload privacy', () => {
  it('removes email properties and addresses from nested, automatic URL and error payloads', () => {
    const event = {
      event: '$pageview',
      properties: {
        distinct_id: 'b783a6d4-0428-4ddd-827f-82d33251be52',
        $set: { email: 'private@example.com', plan: 'student' },
        $current_url: 'https://example.com/?next=private%40example.com',
        nested: [{ message: 'error for private@example.com', $email: 'private@example.com' }],
        institution_id: 'tau',
      },
    };
    const result = sanitizePostHogEvent(event);
    expect(JSON.stringify(result)).not.toMatch(/[A-Z0-9._%+-]+(?:@|%40)[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(result?.properties.$set).toEqual({ plan: 'student' });
    expect(result?.properties.institution_id).toBe('tau');
    expect(result?.properties.distinct_id).toBe(event.properties.distinct_id);
  });
  it('drops events whose distinct ID is an email', () => {
    expect(sanitizePostHogEvent({ properties: { distinct_id: 'private@example.com' } })).toBeNull();
  });
  it('preserves SDK Date timestamps while removing person emails', () => {
    const timestamp = new Date('2026-10-24T12:00:00Z');
    const event = {
      timestamp,
      properties: { distinct_id: 'user-123' },
      $set: { email: 'private@example.com' },
    };
    const result = sanitizePostHogEvent(event);
    expect(result?.timestamp).toBe(timestamp);
    expect(JSON.stringify(result)).toContain('2026-10-24T12:00:00.000Z');
    expect(JSON.stringify(result)).not.toContain('private@example.com');
  });
  it('redacts international email addresses as well as ASCII addresses', () => {
    const result = sanitizePostHogEvent({ properties: { message: 'עמית@example.com' } });
    expect(result?.properties.message).toBe('[redacted]');
  });
  it('drops node SDK events whose distinctId is an email', () => {
    expect(sanitizePostHogEvent({ properties: {}, distinctId: 'private@example.com' })).toBeNull();
  });
});
