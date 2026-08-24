import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  authRouteScreen: vi.fn(() => null),
}));

vi.mock('@/components/AuthRouteScreen', () => ({
  default: hoisted.authRouteScreen,
}));

import LoginPage from './page';

describe('LoginPage', () => {
  it('passes login mode with a safe next destination', async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({ next: '/app/saved-programs' }),
    });

    expect(element).toEqual(
      expect.objectContaining({
        props: { mode: 'login', nextPath: '/app/saved-programs' },
        type: hoisted.authRouteScreen,
      }),
    );
  });

  it('falls back when next is unsafe', async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({ next: 'https://evil.example' }),
    });

    expect(element).toEqual(
      expect.objectContaining({
        props: { mode: 'login', nextPath: '/' },
        type: hoisted.authRouteScreen,
      }),
    );
  });
});
