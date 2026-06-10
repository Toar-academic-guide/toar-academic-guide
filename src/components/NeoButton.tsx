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

/**
 * Neo-brutalist button — black border, hard offset shadow on hover, cyan fill.
 * Used on LandingPage (Yes/No), DegreePicker (add / floating CTA), and elsewhere.
 *
 * Visual spec provided by the user:
 *   h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF]
 *   hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] rounded-full
 */
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
    'inline-flex items-center justify-center gap-2 rounded-full border-2 border-black font-bold text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<Variant, string> = {
    cyan:
      'bg-[#A6FAFF] hover:bg-[#79F7FF] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF]',
    'cyan-filled':
      'bg-[#00E1EF] hover:bg-[#79F7FF] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
    ghost:
      'bg-white hover:bg-slate-50 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
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
