// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  buildEmailRedirectTo,
  buildOAuthRedirectTo,
  resolvePendingSignupMessage,
  resolveSignupDuplicateMessage,
  translateAuthError,
} from '@/context/AuthContext';

describe('AuthContext helpers', () => {
  it('builds the signup redirect from the configured app url', () => {
    expect(buildEmailRedirectTo('https://toar.example.com/', 'http://localhost:3000')).toBe(
      'https://toar.example.com/'
    );
  });

  it('falls back to the browser origin when no app url is configured', () => {
    expect(buildEmailRedirectTo(null, 'http://localhost:3000')).toBe('http://localhost:3000/');
  });

  it('builds the oauth callback redirect from the configured app url', () => {
    expect(buildOAuthRedirectTo('https://toar.example.com/some/path', 'http://localhost:3000')).toBe(
      'https://toar.example.com/auth/callback'
    );
  });

  it('falls back to the browser origin for the oauth callback redirect', () => {
    expect(buildOAuthRedirectTo(null, 'http://localhost:3000')).toBe('http://localhost:3000/auth/callback');
  });

  it('recognizes the fake-user duplicate signup response', () => {
    expect(
      resolveSignupDuplicateMessage({
        user: {
          identities: [],
        },
        session: null,
      })
    ).toBe('כבר קיים חשבון עם האימייל הזה. נסה להתחבר במקום להירשם שוב.');
  });

  it('recognizes a resent confirmation on an older pending account', () => {
    expect(
      resolvePendingSignupMessage({
        user: {
          identities: [{ id: 'identity-1' }],
          created_at: '2026-06-13T09:00:00.000Z',
          confirmation_sent_at: '2026-06-13T10:15:00.000Z',
        },
        session: null,
      })
    ).toBe('כבר התחלת הרשמה עם האימייל הזה. פתח את מייל האישור ואז התחבר.');
  });

  it('translates rate-limit and confirmation errors into product messages', () => {
    expect(translateAuthError({ message: 'For security purposes, you can only request this after 60 seconds.' })).toBe(
      'כבר שלחנו מייל אימות לאחרונה. חכה רגע ונסה שוב.'
    );
    expect(translateAuthError({ message: 'Email not confirmed', code: 'email_not_confirmed' })).toBe(
      'צריך לאשר את האימייל לפני ההתחברות.'
    );
  });
});
