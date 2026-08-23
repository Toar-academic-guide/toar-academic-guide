'use client';

import type { CSSProperties, ReactNode } from 'react';
import LogoCanvas from './LogoCanvas';

export const wayPageBackground: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle at 18% 24%, rgba(174, 227, 255, 0.62), transparent 30%), radial-gradient(circle at 80% 20%, rgba(199, 214, 255, 0.58), transparent 26%), radial-gradient(circle at 10% 82%, rgba(239, 131, 187, 0.34), transparent 24%), linear-gradient(180deg, #ffffff 0%, #f8fbff 46%, #eef6ff 100%)',
};

interface WayPageShellProps {
  children: ReactNode;
  className?: string;
  dir?: 'ltr' | 'rtl';
  showLogo?: boolean;
}

export default function WayPageShell({
  children,
  className = '',
  dir = 'rtl',
  showLogo = false,
}: WayPageShellProps) {
  return (
    <div
      dir={dir}
      className={`way-app relative min-h-screen overflow-hidden bg-[#f8fbff] text-[#435072] ${className}`}
      style={wayPageBackground}
    >
      {showLogo ? (
        <div className="relative z-10 mx-auto flex w-full max-w-6xl px-4 pt-5 sm:px-6">
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#e3e9f6] bg-white/86 px-3 shadow-sm backdrop-blur-xl">
            <LogoCanvas size={30} brighten={false} />
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
