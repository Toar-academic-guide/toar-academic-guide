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
    'inline-flex items-center justify-center gap-2 rounded-full border-2 border-black font-bold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-50';

  const variants: Record<Variant, string> = {
    cyan: 'bg-[#00E5FF] hover:bg-[#79F7FF] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00BCD4]',
    'cyan-filled': 'bg-[#00E5FF] hover:bg-[#79F7FF] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
    ghost: 'bg-white hover:bg-slate-50 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
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
