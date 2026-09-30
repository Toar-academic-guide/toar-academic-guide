// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PublicNavBar from './PublicNavBar';

vi.mock('./LogoCanvas', () => ({ default: () => <span>Way</span> }));

describe('PublicNavBar mobile navigation', () => {
  it('exposes every section and closes after a workflow action', () => {
    const onGoToBucket = vi.fn();
    render(<PublicNavBar onGoToBucket={onGoToBucket} savedCount={3} />);

    fireEvent.click(screen.getByRole('button', { name: 'פתיחת תפריט' }));
    const menu = screen.getByRole('navigation', { name: 'ניווט בנייד' });
    expect(within(menu).getByRole('link', { name: 'מי אנחנו' }).getAttribute('href')).toBe(
      '/about',
    );
    expect(within(menu).getByRole('link', { name: 'מוסדות' }).getAttribute('href')).toBe(
      '/institutions',
    );
    expect(within(menu).getByRole('link', { name: 'התחברות' }).getAttribute('href')).toBe('/login');
    fireEvent.click(within(menu).getByRole('button', { name: /הרשימה שלי/ }));
    expect(onGoToBucket).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('navigation', { name: 'ניווט בנייד' })).toBeNull();
  });

  it('closes with Escape and preserves the signed-in action', () => {
    const onSignOut = vi.fn();
    render(<PublicNavBar isAuthenticated userEmail="test@example.com" onSignOut={onSignOut} />);

    fireEvent.click(screen.getByRole('button', { name: 'פתיחת תפריט' }));
    const toggle = screen.getByRole('button', { name: 'סגירת תפריט' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('navigation', { name: 'ניווט בנייד' });
    const firstLink = within(menu).getByRole('link', { name: 'איך זה עובד' });
    firstLink.focus();
    fireEvent.keyDown(firstLink, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'ניווט בנייד' })).toBeNull();
    expect(document.activeElement).toBe(toggle);

    fireEvent.click(screen.getByRole('button', { name: 'פתיחת תפריט' }));
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'ניווט בנייד' })).getByRole('button', {
        name: 'התנתק',
      }),
    );
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
