'use client';

import type { ReactNode } from 'react';

type Variant = 'cyan' | 'cyan-filled' | 'ghost';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: Variant;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export default function NeoButton({
  children,
  onClick,
  type = 'button',
  variant = 'cyan',
  ariaLabel,
  className = '',
  disabled = false,
}: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

  const variants: Record<Variant, string> = {
    cyan: 'way-button-primary',
    'cyan-filled': 'way-button-primary',
    ghost: 'way-button-secondary',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
