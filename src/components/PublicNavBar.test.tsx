// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
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
    ).toEqual(['/app/calculator', '/app/saved-programs', '/login?next=%2Finstitutions']);
    expect(within(nav).queryByRole('link', { name: 'מי אנחנו' })).toBeNull();
    const group = within(nav).getByRole('link', { name: 'מה הסיכויים שלי?' }).parentElement!;
    expect(
      Array.from(group.children, (item) =>
        (item.matches('a') ? item : item.querySelector('button'))?.textContent?.trim(),
      ),
    ).toEqual(['מה הסיכויים שלי?', 'מחשבונים', 'מה ללמוד?', 'איפה ללמוד?', 'הכנה וקבלה']);
    expect(screen.getByRole('link', { name: 'MyWay' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'כניסה' }).getAttribute('href')).toBe(
      '/login?next=%2Finstitutions',
    );
  });

  it('uses the approved transparent wordmark with the MyWay accessible name', () => {
    render(<PublicNavBar />);
    const logo = screen.getByRole('img', { name: 'MyWay' });
    expect(logo.getAttribute('src')).toBe('/brand/myway-wordmark.svg');
    expect(screen.getByRole('link', { name: 'MyWay' }).contains(logo)).toBe(true);
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

  it.each([
    [
      'מחשבונים',
      [
        ['מחשבון סכם', '/sekhem-calculator'],
        ['בדיקת סיכויי קבלה', '/app/calculator'],
      ],
    ],
    [
      'מה ללמוד?',
      [
        ['תחומי לימוד', '/programs'],
        ['שאלון ״מה מתאים לי?״', '/app/assessment'],
      ],
    ],
    ['איפה ללמוד?', [['מוסדות לימוד', '/institutions']]],
    ['הכנה וקבלה', [['עזרה בהכנה לפסיכומטרי', '/enquiry?program=psychometric-preparation']]],
  ] as const)('discloses the ordered %s links with matching ARIA state', (label, links) => {
    render(<PublicNavBar />);
    const trigger = screen.getByRole('button', { name: label });
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!;
    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    expect(
      within(panel)
        .getAllByRole('link')
        .map((link) => [link.textContent?.trim(), link.getAttribute('href')]),
    ).toEqual(links);
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
  });

  it('opens only one dropdown at a time', () => {
    render(<PublicNavBar />);
    const calculators = screen.getByRole('button', { name: 'מחשבונים' });
    const study = screen.getByRole('button', { name: 'מה ללמוד?' });
    fireEvent.click(calculators);
    fireEvent.click(study);
    expect(calculators.getAttribute('aria-expanded')).toBe('false');
    expect(study.getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByRole('link', { name: 'מחשבון סכם' })).toBeNull();
  });

  it('closes a dropdown on Escape and returns focus to its trigger', () => {
    render(<PublicNavBar />);
    const trigger = screen.getByRole('button', { name: 'מחשבונים' });
    fireEvent.click(trigger);
    screen.getByRole('link', { name: 'מחשבון סכם' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on outside clicks and restores focus only when it is inside the panel', () => {
    render(
      <>
        <PublicNavBar />
        <button type="button">outside</button>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'מחשבונים' });
    fireEvent.click(trigger);
    screen.getByRole('link', { name: 'מחשבון סכם' }).focus();
    fireEvent.click(document.body);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    const outside = screen.getByRole('button', { name: 'outside' });
    outside.focus();
    fireEvent.click(outside);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(outside);
  });

  it.each(['מחשבונים', 'מה ללמוד?', 'איפה ללמוד?', 'הכנה וקבלה'])(
    'returns focus to %s after an outside click leaves focus on body',
    (label) => {
      render(<PublicNavBar />);
      const trigger = screen.getByRole('button', { name: label });
      const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!;
      fireEvent.click(trigger);
      trigger.focus();
      trigger.blur(); // A non-focusable outside target leaves browser focus on body.
      expect(document.activeElement).toBe(document.body);
      fireEvent.click(document.body);
      expect(panel.hidden).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    },
  );

  it.each([false, true])(
    'returns focus to the hamburger after an outside click leaves focus on body (dropdown open: %s)',
    (dropdownOpen) => {
      render(<PublicNavBar />);
      const hamburger = screen.getByRole('button', { name: 'תפריט ניווט' });
      fireEvent.click(hamburger);
      if (dropdownOpen) fireEvent.click(screen.getByRole('button', { name: 'מחשבונים' }));
      (document.activeElement as HTMLElement).blur();
      expect(document.activeElement).toBe(document.body);
      fireEvent.click(document.body);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.getByRole('button', { name: 'מחשבונים' }).getAttribute('aria-expanded')).toBe(
        'false',
      );
      expect(document.activeElement).toBe(hamburger);
    },
  );

  it.each(['מחשבונים', 'מה ללמוד?', 'איפה ללמוד?', 'הכנה וקבלה', 'תפריט ניווט'])(
    'keeps focus on an outside input when closing %s',
    (label) => {
      render(
        <>
          <PublicNavBar />
          <input aria-label="outside input" />
        </>,
      );
      const trigger = screen.getByRole('button', { name: label });
      fireEvent.click(trigger);
      const input = screen.getByRole('textbox', { name: 'outside input' });
      input.focus();
      fireEvent.click(input);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(input);
    },
  );

  it('marks only the panel link matching the current pathname as current', () => {
    render(<PublicNavBar />);
    fireEvent.click(screen.getByRole('button', { name: 'איפה ללמוד?' }));
    expect(screen.getByRole('link', { name: 'מוסדות לימוד' }).getAttribute('aria-current')).toBe(
      'page',
    );
    fireEvent.click(screen.getByRole('button', { name: 'מחשבונים' }));
    expect(
      screen.getByRole('link', { name: 'מחשבון סכם' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('starts closed in server HTML', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<PublicNavBar />);
    expect(container.querySelectorAll('ul[hidden]')).toHaveLength(4);
    expect(container.querySelectorAll('button[aria-expanded="false"]')).toHaveLength(5);
  });

  it('toggles the mobile menu and closes it with Escape, restoring hamburger focus', () => {
    render(<PublicNavBar />);
    const hamburger = screen.getByRole('button', { name: 'תפריט ניווט' });
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    for (const id of hamburger.getAttribute('aria-controls')!.split(' ')) {
      expect(document.getElementById(id)).toBeTruthy();
    }
    fireEvent.click(hamburger);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'מה הסיכויים שלי?' }));
    fireEvent.click(screen.getByRole('button', { name: 'מחשבונים' }));
    screen.getByRole('link', { name: 'מחשבון סכם' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'מחשבונים' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(document.activeElement).toBe(hamburger);
    fireEvent.click(hamburger);
    fireEvent.click(hamburger);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the mobile menu on an outside click and returns focus from its links', () => {
    render(<PublicNavBar />);
    const hamburger = screen.getByRole('button', { name: 'תפריט ניווט' });
    fireEvent.click(hamburger);
    screen.getByRole('link', { name: 'מה הסיכויים שלי?' }).focus();
    fireEvent.click(document.body);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(hamburger);
  });

  it('closes both menus when a callback link is followed', () => {
    const onGoToBucket = vi.fn();
    render(<PublicNavBar onGoToBucket={onGoToBucket} />);
    const hamburger = screen.getByRole('button', { name: 'תפריט ניווט' });
    fireEvent.click(hamburger);
    fireEvent.click(screen.getByRole('button', { name: 'מחשבונים' }));
    fireEvent.click(screen.getByRole('link', { name: 'הרשימה שלי' }));
    expect(onGoToBucket).toHaveBeenCalledTimes(1);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'מחשבונים' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('keeps home and sign-in callback behavior', () => {
    const onGoHome = vi.fn();
    const onSignIn = vi.fn();
    render(<PublicNavBar onGoHome={onGoHome} onSignIn={onSignIn} />);
    fireEvent.click(screen.getByRole('link', { name: 'MyWay' }));
    fireEvent.click(screen.getByRole('link', { name: 'כניסה' }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
