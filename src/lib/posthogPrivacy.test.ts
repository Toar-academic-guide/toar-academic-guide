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

  it.each([
    '0501234567',
    '050-1234567',
    '052 123 4567',
    '+972501234567',
    '+972-50-123-4567',
    '+972 50 123 4567',
    '+972 (0) 50 123 4567',
    '+1 (415) 555-2671',
    '202-555-0123',
    '+44 20 7946 0958',
    '+33 6 12 34 56 78',
    '0049 30 12345678',
    '447700900123',
    '+123456789012345',
    '501234567',
  ])('scrubs %s from captures, identify, super and person properties', (phone) => {
    for (const event of ['contact_clicked', '$identify', '$set']) {
      const result = sanitizePostHogEvent({
        event,
        properties: {
          distinct_id: '12345678-1234-4234-8234-123456789012',
          custom_super_property: phone,
          $set: { contact: phone, phone_number: phone, plan: 'student' },
          $set_once: { contact: phone, mobile: phone },
          nested: [{ message: `Call ${phone} please`, numeric: Number(phone.replace(/\D/g, '')) }],
          $current_url: `https://example.com/?contact=${encodeURIComponent(phone)}`,
        },
        $set: { contact: phone, $phone: phone },
      });
      expect(result?.properties.distinct_id).toBe('12345678-1234-4234-8234-123456789012');
      expect(result?.properties.custom_super_property).toBe('[redacted]');
      expect(result?.properties.$set).toEqual({ contact: '[redacted]', plan: 'student' });
      expect(result?.properties.$set_once).toEqual({ contact: '[redacted]' });
      expect(result?.$set).toEqual({ contact: '[redacted]' });
      expect(result?.properties.nested).toEqual([
        { message: 'Call [redacted] please', numeric: '[redacted]' },
      ]);
      expect(result?.properties.$current_url).toBe('https://example.com/');
      // Internal UUIDs contain long digit groups but are not phone numbers.
      const serialized = JSON.stringify(result).replace(
        /12345678-1234-4234-8234-123456789012/g,
        '',
      );
      expect(serialized).not.toContain(phone);
      expect(serialized).not.toMatch(/(?:\d[\s().-]*){7}/);
    }
  });

  it('scrubs form-encoded URL spaces and phone property names even with nonstandard values', () => {
    const result = sanitizePostHogEvent({
      properties: {
        $current_url: 'https://example.com/?contact=%2B972+50+123+4567',
        phone: 'private contact',
        mobileNumber: 'private contact',
        telephone: 'private contact',
        '+1 (415) 555-2671': 'private contact',
      },
    });
    expect(result?.properties).toEqual({
      $current_url: 'https://example.com/',
    });
  });

  it.each(['0501234567', '+972 50 123 4567', '+1 (415) 555-2671'])(
    'drops browser and node events whose distinct ID is a phone: %s',
    (phone) => {
      expect(sanitizePostHogEvent({ properties: { distinct_id: phone } })).toBeNull();
      expect(sanitizePostHogEvent({ properties: {}, distinctId: phone })).toBeNull();
    },
  );

  it('drops a numeric phone distinct ID while preserving ordinary score/count properties', () => {
    expect(sanitizePostHogEvent({ properties: { distinct_id: 501234567 } })).toBeNull();
    const event = {
      properties: {
        distinct_id: '12345678-1234-4234-8234-123456789012',
        count: 22,
        psychometric: 680,
        timestamp: '2026-10-24T12:00:00.000Z',
      },
    };
    expect(sanitizePostHogEvent(event)).toEqual(event);
  });
});

it.each(['qa-test%2540example.com', 'qa-test%252540example.com'])(
  'scrubs repeatedly encoded contact data from URLs, replay, super/person properties and identity: %s',
  (encoded) => {
    const url = `/login?next=${encoded}`;
    const result = sanitizePostHogEvent({
      event: '$pageview',
      properties: {
        distinct_id: 'b783a6d4-0428-4ddd-827f-82d33251be52',
        $current_url: `https://findmyway.co.il${url}`,
        $session_entry_url: url,
        $set: { contact: encoded },
        $set_once: { contact: encoded },
        nested: [{ $snapshot_data: [{ data: { href: url } }] }],
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('qa-test');
    expect(serialized).not.toMatch(/(?:@|%(?:25)*40)example\.com/i);
    expect(serialized).toContain('[redacted]');
    expect(sanitizePostHogEvent({ distinctId: encoded, properties: {} })).toBeNull();
  },
);

describe('PostHog URL minimization', () => {
  it.each([
    '$current_url',
    '$initial_current_url',
    '$session_entry_url',
    '$external_click_url',
    'href',
    'attr__href',
  ])('drops the whole query and fragment from %s', (key) => {
    const result = sanitizePostHogEvent({
      properties: {
        [key]:
          'https://findmyway.co.il/programs/tau_cs?bagrut=105.5&score=%36%38%30&utm_source=psy750#psychometric_750',
        utm_source: 'psy750',
      },
    });
    expect(result?.properties[key]).toBe('https://findmyway.co.il/programs/tau_cs');
    expect(result?.properties.utm_source).toBe('psy750');
  });

  it.each(['$pathname', '$initial_pathname', '$session_entry_pathname', '$prev_pageview_pathname'])(
    'keeps only the path for %s',
    (key) => {
      const result = sanitizePostHogEvent({
        properties: { [key]: '/programs/tau_cs?score=680#bagrut=105.5' },
      });
      expect(result?.properties[key]).toBe('/programs/tau_cs');
    },
  );

  it.each(['$referrer', '$initial_referrer', '$session_entry_referrer'])(
    'keeps %s origin-only for external and same-site sources',
    (key) => {
      for (const origin of ['https://example.com', 'https://findmyway.co.il']) {
        for (const suffix of ['/680', '/psychometric_680', '/105.5', '/?score=680#750']) {
          const result = sanitizePostHogEvent({ properties: { [key]: origin + suffix } });
          expect(result?.properties[key]).toBe(origin);
        }
      }
    },
  );

  it('minimizes nested person, session, replay and autocapture URL properties', () => {
    const result = sanitizePostHogEvent({
      properties: {
        $set: {
          $initial_current_url: 'https://findmyway.co.il/?score=680#750',
          $initial_referrer: 'https://example.com/105.5',
        },
        $set_once: { $initial_pathname: '/enquiry?score=680#750' },
        $snapshot_data: [{ data: { href: 'https://findmyway.co.il/?score=680#750' } }],
        $elements: [{ attr__href: '/enquiry?program=tau_cs&institution=tau&score=680#750' }],
      },
    });
    expect(result?.properties).toEqual({
      $set: {
        $initial_current_url: 'https://findmyway.co.il/',
        $initial_referrer: 'https://example.com',
      },
      $set_once: { $initial_pathname: '/enquiry' },
      $snapshot_data: [{ data: { href: 'https://findmyway.co.il/' } }],
      $elements: [{ attr__href: '/enquiry' }],
    });
  });

  it.each([
    'javascript:alert(680)',
    'data:text/plain,680',
    'https://student:680@example.com/?score=750',
    'https://[broken/?score=680',
    '',
  ])('fails closed for unsafe URL metadata: %s', (value) => {
    const result = sanitizePostHogEvent({
      properties: { $current_url: value, $session_entry_referrer: value },
    });
    expect(result?.properties).toEqual({ $current_url: null, $session_entry_referrer: null });
  });
});
