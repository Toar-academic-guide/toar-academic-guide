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
});
