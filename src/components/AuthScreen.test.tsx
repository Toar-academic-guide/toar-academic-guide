// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockAuth = {
  configured: true,
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/components/LogoCanvas', () => ({
  default: () => <div data-testid="logo-canvas" />,
}));

import AuthScreen from '@/components/AuthScreen';

describe('AuthScreen', () => {
  beforeEach(() => {
    mockAuth = {
      configured: true,
      signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    };
  });

  it('starts Google sign-in from the secondary auth action', async () => {
    render(<AuthScreen onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'המשך עם Google' }));

    await waitFor(() => expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('passes names to signup and shows the confirmation handoff without logging in', async () => {
    const onSuccess = vi.fn();

    render(<AuthScreen onBack={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'אין לך חשבון? צור חשבון' }));
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { value: 'מלי' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { value: 'כהן' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'צור חשבון' }));

    await waitFor(() =>
      expect(mockAuth.signUp).toHaveBeenCalledWith('user@example.com', 'secret123', {
        firstName: 'מלי',
        lastName: 'כהן',
      }),
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('שלחנו מייל לאישור החשבון. אשר אותו ואז חזור להתחבר.')).toBeTruthy();
  });

  it('blocks signup when first or last name is blank', async () => {
    render(<AuthScreen onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'אין לך חשבון? צור חשבון' }));
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { value: '  ' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { value: 'כהן' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'צור חשבון' }));

    await waitFor(() => expect(screen.getByText('יש למלא שם פרטי ושם משפחה.')).toBeTruthy());
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('clears stale feedback when switching between login and signup', async () => {
    mockAuth.signUp = vi.fn().mockResolvedValue({
      error: 'כבר קיים חשבון עם האימייל הזה. נסה להתחבר במקום להירשם שוב.',
    });

    render(<AuthScreen onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'אין לך חשבון? צור חשבון' }));
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { value: 'מלי' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { value: 'כהן' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'צור חשבון' }));

    await waitFor(() =>
      expect(
        screen.getByText('כבר קיים חשבון עם האימייל הזה. נסה להתחבר במקום להירשם שוב.'),
      ).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'כבר יש לך חשבון? התחבר' }));

    expect(
      screen.queryByText('כבר קיים חשבון עם האימייל הזה. נסה להתחבר במקום להירשם שוב.'),
    ).toBeNull();
  });

  it('disables the Google action when auth is not configured', () => {
    mockAuth.configured = false;

    render(<AuthScreen onBack={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'המשך עם Google' })).toHaveProperty('disabled', true);
  });
});
