import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  authRouteScreen: vi.fn(() => null),
}));

vi.mock('@/components/AuthRouteScreen', () => ({
  default: hoisted.authRouteScreen,
}));

import SignupPage from './page';

describe('SignupPage', () => {
  it('passes signup mode with a safe next destination', async () => {
    const element = await SignupPage({
      searchParams: Promise.resolve({ next: '/app/profile' }),
    });

    expect(element).toEqual(
      expect.objectContaining({
        props: { mode: 'signup', nextPath: '/app/profile' },
        type: hoisted.authRouteScreen,
      }),
    );
  });

  it('falls back when next targets internal pages', async () => {
    const element = await SignupPage({
      searchParams: Promise.resolve({ next: '/internal/data-health' }),
    });

    expect(element).toEqual(
      expect.objectContaining({
        props: { mode: 'signup', nextPath: '/' },
        type: hoisted.authRouteScreen,
      }),
    );
  });
});
