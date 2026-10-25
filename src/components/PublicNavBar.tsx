'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { buildLoginPath, ROUTES } from '@/lib/routes';
import styles from './PublicNavBar.module.css';

interface PublicNavBarProps {
  // Compatibility props for older route owners; authentication comes from AuthProvider.
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
  onAccountClick?: () => void;
  loginHref?: string;
}

function NavItem({
  children,
  href,
  onClick,
  className,
  label,
}: {
  children: ReactNode;
  href: string;
  onClick?: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      onClick={(event) => {
        if (onClick && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </Link>
  );
}

export default function PublicNavBar({
  onGoHome,
  onGoToBucket,
  onSignIn,
  onAccountClick,
  loginHref,
}: PublicNavBarProps) {
  const { loading, user } = useAuth();
  const pathname = usePathname();

  return (
    <header dir="rtl" className={styles.header}>
      <NavItem
        href={ROUTES.home}
        onClick={onGoHome}
        label="Way — עמוד הבית"
        className={styles.logo}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/way-logo.png" alt="Way" width={82} height={42} />
      </NavItem>
      <nav aria-label="ניווט ראשי" className={styles.links}>
        <Link href={ROUTES.institutions}>מוסדות לימוד</Link>
        <NavItem href={ROUTES.savedPrograms} onClick={onGoToBucket}>
          הרשימה שלי
        </NavItem>
        <Link href={ROUTES.about}>מי אנחנו</Link>
      </nav>
      {loading ? (
        <span className={styles.account} role="status" aria-label="טוען חשבון" aria-busy="true">
          <span className={styles.placeholder} />
        </span>
      ) : user ? (
        <NavItem href={ROUTES.account} onClick={onAccountClick} className={styles.account}>
          החשבון שלי
        </NavItem>
      ) : (
        <NavItem
          href={loginHref ?? buildLoginPath(pathname)}
          onClick={onSignIn}
          className={styles.account}
        >
          כניסה
        </NavItem>
      )}
    </header>
  );
}
