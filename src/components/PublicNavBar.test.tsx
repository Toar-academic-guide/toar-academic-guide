// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicNavBar from './PublicNavBar';

const state = vi.hoisted(() => ({
  pathname: '/institutions',
  auth: { loading: false, user: null as null | { id: string } },
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));

describe('shared current navigation', () => {
  beforeEach(() => {
    state.pathname = '/institutions';
    state.auth = { loading: false, user: null };
  });

  it('exposes the current destinations without obsolete section links', () => {
    render(<PublicNavBar />);
    const nav = screen.getByRole('navigation', { name: 'ניווט ראשי' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/institutions', '/app/saved-programs', '/about']);
    expect(screen.getByRole('link', { name: 'Way — עמוד הבית' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'כניסה' }).getAttribute('href')).toBe(
      '/login?next=%2Finstitutions',
    );
  });

  it('keeps journey callbacks and usable link destinations', () => {
    const onGoToBucket = vi.fn();
    render(<PublicNavBar onGoToBucket={onGoToBucket} loginHref="/login?next=%2F%23results" />);
    const saved = screen.getByRole('link', { name: 'הרשימה שלי' });
    fireEvent.click(saved);
    expect(onGoToBucket).toHaveBeenCalledTimes(1);
    expect(saved.getAttribute('href')).toBe('/app/saved-programs');
    expect(screen.getByRole('link', { name: 'כניסה' }).getAttribute('href')).toBe(
      '/login?next=%2F%23results',
    );
  });

  it('uses shared auth state even without route-owner props', () => {
    state.auth.user = { id: 'test-user' };
    const onAccountClick = vi.fn();
    render(<PublicNavBar onAccountClick={onAccountClick} />);
    expect(screen.queryByRole('link', { name: 'כניסה' })).toBeNull();
    const account = screen.getByRole('link', { name: 'החשבון שלי' });
    expect(account.getAttribute('href')).toBe('/#account');
    fireEvent.click(account);
    expect(onAccountClick).toHaveBeenCalledTimes(1);
  });

  it('does not show a logged-out action while auth is loading', () => {
    state.auth.loading = true;
    render(<PublicNavBar />);
    expect(screen.getByRole('status', { name: 'טוען חשבון' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'כניסה' })).toBeNull();
  });
});
