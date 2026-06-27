// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Fragment, createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  getSupabaseEnv: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: hoistedMocks.createSupabaseBrowserClient,
  isSupabaseConfigured: true,
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabaseEnv: hoistedMocks.getSupabaseEnv,
}));

import {
  AuthProvider,
  buildEmailRedirectTo,
  buildOAuthRedirectTo,
  resolvePendingSignupMessage,
  resolveSignupDuplicateMessage,
  translateAuthError,
  useAuth,
} from '@/context/AuthContext';

function AuthHarness({ children }: { children?: ReactNode }) {
  const auth = useAuth();

  return createElement(
    Fragment,
    null,
    createElement(
      'button',
      { type: 'button', onClick: () => void auth.signInWithGoogle() },
      'Google',
    ),
    children,
  );
}

describe('AuthContext helpers', () => {
  beforeEach(() => {
    hoistedMocks.getSupabaseEnv.mockReset();
    hoistedMocks.getSupabaseEnv.mockReturnValue({
      publicAppUrl: 'https://toar.example.com',
      supabasePublishableKey: 'anon-key',
      supabaseUrl: 'https://example.supabase.co',
    });
    hoistedMocks.createSupabaseBrowserClient.mockReset();
  });

  it('builds the signup redirect from the configured app url', () => {
    expect(buildEmailRedirectTo('https://toar.example.com/', 'http://localhost:3000')).toBe(
      'https://toar.example.com/',
    );
  });

  it('falls back to the browser origin when no app url is configured', () => {
    expect(buildEmailRedirectTo(null, 'http://localhost:3000')).toBe('http://localhost:3000/');
  });

  it('builds the oauth callback redirect from the configured app url', () => {
    expect(
      buildOAuthRedirectTo('https://toar.example.com/some/path', 'http://localhost:3000'),
    ).toBe('https://toar.example.com/auth/callback');
  });

  it('falls back to the browser origin for the oauth callback redirect', () => {
    expect(buildOAuthRedirectTo(null, 'http://localhost:3000')).toBe(
      'http://localhost:3000/auth/callback',
    );
  });

  it('recognizes the fake-user duplicate signup response', () => {
    expect(
      resolveSignupDuplicateMessage({
        user: {
          identities: [],
        },
        session: null,
      }),
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
      }),
    ).toBe('כבר התחלת הרשמה עם האימייל הזה. פתח את מייל האישור ואז התחבר.');
  });

  it('translates rate-limit and confirmation errors into product messages', () => {
    expect(
      translateAuthError({
        message: 'For security purposes, you can only request this after 60 seconds.',
      }),
    ).toBe('כבר שלחנו מייל אימות לאחרונה. חכה רגע ונסה שוב.');
    expect(
      translateAuthError({ message: 'Email not confirmed', code: 'email_not_confirmed' }),
    ).toBe('צריך לאשר את האימייל לפני ההתחברות.');
  });

  it('starts Google OAuth with an explicit account-consent prompt', async () => {
    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    hoistedMocks.createSupabaseBrowserClient.mockReturnValue(mockSupabase);

    render(createElement(AuthProvider, null, createElement(AuthHarness)));

    await waitFor(() => expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Google' }));

    await waitFor(() =>
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://toar.example.com/auth/callback',
          queryParams: {
            prompt: 'select_account consent',
          },
        },
      }),
    );
  });
});
