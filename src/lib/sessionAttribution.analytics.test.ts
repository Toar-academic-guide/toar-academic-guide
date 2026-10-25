// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
const { init, register } = vi.hoisted(() => ({ init: vi.fn(), register: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { init, register_for_session: register } }));
afterEach(() => {
  window.history.replaceState(null, '', '/');
  sessionStorage.clear();
});
it('registers session super properties before the initial pageview and keeps all events on first touch', async () => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/?utm_source=tiktok&utm_campaign=fall_2026');
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://example.com/article?token=secret');
  vi.resetModules();
  await import('../../instrumentation-client');
  const options = init.mock.calls[0][1];
  expect(options.save_campaign_params).toBe(false);
  expect(options.save_referrer).toBe(false);
  options.loaded({ register_for_session: register });
  expect(register.mock.calls).toEqual([
    [
      {
        utm_source: 'tiktok',
        utm_medium: null,
        utm_campaign: 'fall_2026',
        referrer: 'https://example.com',
      },
    ],
  ]);
  window.history.replaceState(null, '', '/?utm_source=facebook');
  const event = options.before_send({
    event: '$pageview',
    properties: {
      utm_source: 'facebook',
      $referrer: 'https://example.com/article?phone=0501234567',
    },
  });
  expect(event.properties).toMatchObject({
    utm_source: 'tiktok',
    utm_campaign: 'fall_2026',
    referrer: 'https://example.com',
    $referrer: 'https://example.com',
  });
  expect(JSON.stringify(event)).not.toContain('0501234567');
  expect(options.before_send(null)).toBeNull();
});

it('does not leak invalid campaign values through automatic page URLs or referrer properties', async () => {
  init.mockClear();
  register.mockClear();
  vi.resetModules();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/?utm_campaign=0501234567');
  await import('../../instrumentation-client');
  const options = init.mock.calls[0][1];
  const event = options.before_send({
    event: '$pageview',
    properties: {
      $current_url: 'https://example.com/?utm_campaign=0501234567&utm_source=tiktok',
      $initial_referrer: 'https://example.com/article?phone=0501234567',
    },
  });
  expect(JSON.stringify(event)).not.toContain('0501234567');
  expect(event.properties.$current_url).toBe('https://example.com/');
});

it('minimizes SDK URL fields through before_send while keeping canonical first-touch campaigns', async () => {
  init.mockClear();
  register.mockClear();
  vi.resetModules();
  window.history.replaceState(null, '', '/?utm_source=psy750&score=680#105.5');
  vi.spyOn(document, 'referrer', 'get').mockReturnValue(
    'https://example.com/psychometric_680?bagrut=105.5#750',
  );
  await import('../../instrumentation-client');
  const options = init.mock.calls[0][1];
  const event = options.before_send({
    event: '$pageview',
    properties: {
      $current_url: 'https://findmyway.co.il/?score=680#105.5',
      $session_entry_url: 'https://findmyway.co.il/?score=680#105.5',
      $session_entry_referrer: 'https://example.com/psychometric_680?bagrut=105.5#750',
      $referrer: 'https://findmyway.co.il/programs/680?bagrut=105.5#750',
      $set_once: {
        $initial_current_url: 'https://findmyway.co.il/?score=680#105.5',
        $initial_referrer: 'https://example.com/680',
      },
      $pathname: '/?score=680#105.5',
    },
  });
  expect(event.properties).toMatchObject({
    utm_source: 'psy750',
    referrer: 'https://example.com',
    $current_url: 'https://findmyway.co.il/',
    $session_entry_url: 'https://findmyway.co.il/',
    $session_entry_referrer: 'https://example.com',
    $referrer: 'https://findmyway.co.il',
    $set_once: {
      $initial_current_url: 'https://findmyway.co.il/',
      $initial_referrer: 'https://example.com',
    },
    $pathname: '/',
  });
  expect(JSON.stringify(event)).not.toMatch(/680|105\.5/);
});
