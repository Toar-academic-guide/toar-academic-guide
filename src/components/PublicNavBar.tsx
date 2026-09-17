'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';

import LogoCanvas from '@/components/LogoCanvas';
import { ROUTES } from '@/lib/routes';

interface PublicNavBarProps {
  authLoading?: boolean;
  isAuthenticated?: boolean;
  savedCount?: number;
  userInitials?: string;
  userEmail?: string;
  onGoHome?: () => void;
  onGoToBucket?: () => void;
  onMethodClick?: () => void;
  onCalculatorClick?: () => void;
  onPathClick?: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onStartClick?: () => void;
}

function getInitials(email: string): string {
  const prefix = email.split('@')[0] ?? '';
  const parts = prefix.split(/[._-]/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  return prefix.slice(0, 2).toUpperCase();
}

function NavItem({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className = 'rounded-2xl px-4 py-2 transition hover:bg-[#eef4ff] hover:text-[#5262d9]';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href ?? ROUTES.home} className={className}>
      {children}
    </Link>
  );
}

export default function PublicNavBar({
  authLoading = false,
  isAuthenticated = false,
  savedCount = 0,
  userInitials,
  userEmail,
  onGoHome,
  onGoToBucket,
  onMethodClick,
  onCalculatorClick,
  onPathClick,
  onSignIn,
  onSignOut,
  onStartClick,
}: PublicNavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const navItems = (
    <>
      <NavItem href={`${ROUTES.home}#method`} onClick={onMethodClick}>
        איך זה עובד
      </NavItem>
      <NavItem href={`${ROUTES.home}#calculator`} onClick={onCalculatorClick}>
        מחשבון קבלה
      </NavItem>
      <NavItem href={ROUTES.institutions}>מוסדות</NavItem>
      <NavItem href={ROUTES.about}>מי אנחנו</NavItem>
      <NavItem href={`${ROUTES.home}#path`} onClick={onPathClick}>
        המסלול
      </NavItem>
      <NavItem href={ROUTES.savedPrograms} onClick={onGoToBucket}>
        <span className="inline-flex items-center gap-1.5">
          הרשימה שלי
          {savedCount > 0 ? (
            <span className="rounded-full bg-[#eef4ff] px-1.5 py-0.5 text-[10px] font-bold text-[#7784e8]">
              {savedCount}
            </span>
          ) : null}
        </span>
      </NavItem>
    </>
  );
  const initials = userInitials ?? (userEmail ? getInitials(userEmail) : '');

  return (
    <header
      dir="rtl"
      className="fixed inset-x-0 top-0 z-50 px-3 pt-5 sm:px-6 lg:px-8"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          menuToggleRef.current?.focus();
        }
      }}
    >
      <div className="mx-auto flex h-[68px] w-full max-w-[92rem] items-center justify-between rounded-[1.4rem] border border-white bg-white/78 px-3 shadow-[0_20px_70px_rgba(117,139,190,0.18)] backdrop-blur-xl sm:px-5 lg:px-6">
        {onGoHome ? (
          <button
            type="button"
            onClick={onGoHome}
            aria-label="דף הבית"
            className="flex h-11 items-center rounded-2xl border border-[#e3e9f6] bg-white px-2 shadow-sm transition hover:bg-[#f6f9ff] sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
          >
            <LogoCanvas size={30} brighten={false} />
          </button>
        ) : (
          <Link
            href={ROUTES.home}
            aria-label="דף הבית"
            className="flex h-11 items-center rounded-2xl border border-[#e3e9f6] bg-white px-2 shadow-sm transition hover:bg-[#f6f9ff] sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
          >
            <LogoCanvas size={30} brighten={false} />
          </Link>
        )}

        <nav className="hidden items-center gap-1 text-sm font-semibold text-[#647091] xl:flex" aria-label="ניווט">
          {navItems}
        </nav>

        <div className="flex items-center gap-2">
          <button
            ref={menuToggleRef}
            type="button"
            aria-label={menuOpen ? 'סגירת תפריט' : 'פתיחת תפריט'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-[#5262d9] transition hover:bg-[#eef4ff] xl:hidden"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          {authLoading ? (
            <div className="hidden h-10 w-10 animate-pulse rounded-2xl bg-[#edf3ff] sm:block" />
          ) : isAuthenticated && (initials || userEmail) ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span
                title={userEmail ? `מחובר כ-${userEmail}` : 'מחובר'}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7784e8] text-xs font-bold text-white shadow-sm"
              >
                {initials}
              </span>
              {onSignOut ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="hidden rounded-2xl px-3 py-2 text-sm font-bold text-[#647091] transition hover:bg-[#eef4ff] hover:text-[#5262d9] sm:inline-flex"
                >
                  התנתק
                </button>
              ) : null}
            </div>
          ) : onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden rounded-2xl px-3 py-2 text-sm font-bold text-[#647091] transition hover:bg-[#eef4ff] hover:text-[#5262d9] sm:inline-flex"
            >
              התחברות
            </button>
          ) : (
            <Link
              href={ROUTES.login}
              className="hidden rounded-2xl px-3 py-2 text-sm font-bold text-[#647091] transition hover:bg-[#eef4ff] sm:inline-flex"
            >
              התחברות
            </Link>
          )}

          {onStartClick ? (
            <button
              type="button"
              onClick={onStartClick}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-[#7784e8] px-3 sm:gap-2 sm:px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(119,132,232,0.32)] transition hover:bg-[#6574dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
            >
              מתחילים
              <ArrowLeft size={16} />
            </button>
          ) : (
            <Link
              href={ROUTES.app}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-[#7784e8] px-3 sm:gap-2 sm:px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(119,132,232,0.32)] transition hover:bg-[#6574dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
            >
              מתחילים
              <ArrowLeft size={16} />
            </Link>
          )}
        </div>
      </div>
      {menuOpen ? (
        <nav
          id={menuId}
          aria-label="ניווט בנייד"
          onClick={() => setMenuOpen(false)}
          className="mx-auto mt-3 grid max-h-[calc(100dvh-7rem)] max-w-[92rem] gap-1 overflow-y-auto rounded-2xl border border-white bg-[#fbfdff]/95 p-3 text-right text-sm font-semibold text-[#647091] shadow-[0_20px_60px_rgba(105,133,190,0.18)] backdrop-blur-xl xl:hidden"
        >
          {navItems}
          {!isAuthenticated ? (
            <NavItem href={ROUTES.login} onClick={onSignIn}>התחברות</NavItem>
          ) : onSignOut ? (
            <NavItem onClick={onSignOut}>התנתק</NavItem>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
