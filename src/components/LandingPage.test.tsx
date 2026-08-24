// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import LandingPage from '@/components/LandingPage';
import type { CatalogueProgram } from '@/types/catalogue';

vi.mock('@/components/LogoCanvas', () => ({
  default: () => <div data-testid="logo-canvas" />,
}));

vi.mock('@/components/PaintingCanvas', () => ({
  default: () => <div data-testid="painting-canvas" />,
}));

vi.mock('@/components/KineticTextSwapper', () => ({
  default: () => <div data-testid="kinetic-text-swapper" />,
}));

vi.mock('@/components/NeoButton', () => ({
  default: ({
    ariaLabel,
    children,
    disabled,
    onClick,
    type = 'button',
  }: {
    ariaLabel?: string;
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button aria-label={ariaLabel} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  ),
}));

function program(id: string, name: string): CatalogueProgram {
  return {
    id,
    name,
    institution: 'אוניברסיטת תל אביב',
    institutionId: 'tau',
    type: 'academic',
    category: 'מדעים',
    profileScore: { AN: 5, TE: 5, CR: 1, SO: 1, LE: 1, OR: 1, DI: 5, ER: 3 },
    admissionType: 'sekhem',
    admissionRequirements: [],
    thresholds: { tau: 700 },
    linkedInstitutionIds: ['tau'],
  };
}

const defaultProps = {
  onAlreadyKnow: vi.fn(),
  onNeedHelp: vi.fn(),
  onSignIn: vi.fn(),
  onGoToProfile: vi.fn(),
};

describe('LandingPage calculator', () => {
  it('keeps initials separate from the logout action', () => {
    const onSignOut = vi.fn();
    render(
      <LandingPage
        {...defaultProps}
        authLoading={false}
        isAuthenticated
        onCalculate={vi.fn()}
        onSignOut={onSignOut}
        programs={[program('degree', 'מסלול')]}
        userEmail="daniel.cohen@example.com"
      />,
    );

    fireEvent.click(screen.getByTitle('מחובר כ-daniel.cohen@example.com'));
    expect(onSignOut).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'התנתק' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected degree valid when the catalogue is replaced', async () => {
    const onCalculate = vi.fn();
    const { rerender } = render(
      <LandingPage
        {...defaultProps}
        onCalculate={onCalculate}
        programs={[program('old-degree', 'מסלול ישן')]}
      />,
    );

    rerender(
      <LandingPage
        {...defaultProps}
        onCalculate={onCalculate}
        programs={[program('new-degree', 'מסלול חדש')]}
      />,
    );

    await waitFor(() =>
      expect((screen.getByLabelText('מה תרצה/י ללמוד?') as HTMLSelectElement).value).toBe(
        'new-degree',
      ),
    );

    fireEvent.change(screen.getByLabelText('ציון פסיכומטרי'), { target: { value: '700' } });
    fireEvent.change(screen.getByLabelText('ממוצע בגרות'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'חשב סיכויים ←' }));

    expect(onCalculate).toHaveBeenCalledWith(700, 100, 'new-degree');
  });
});
