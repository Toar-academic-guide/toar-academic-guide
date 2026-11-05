'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { buildLoginPath, ROUTES } from '@/lib/routes';
import styles from './PublicNavBar.module.css';

const NAV_GROUPS = [
  {
    id: 'calculators',
    label: 'מחשבונים',
    links: [
      { label: 'מחשבון סכם', href: '/sekhem-calculator' },
      { label: 'בדיקת סיכויי קבלה', href: '/sekhem-calculator' },
    ],
  },
  {
    id: 'study',
    label: 'מה ללמוד?',
    links: [
      { label: 'תחומי לימוד', href: '/programs' },
      { label: 'שאלון ״מה מתאים לי?״', href: ROUTES.assessment },
    ],
  },
  {
    id: 'institutions',
    label: 'איפה ללמוד?',
    links: [{ label: 'מוסדות לימוד', href: ROUTES.institutions }],
  },
  {
    id: 'preparation',
    label: 'הכנה וקבלה',
    links: [{ label: 'עזרה בהכנה לפסיכומטרי', href: '/enquiry?program=psychometric-preparation' }],
  },
];

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
      {children}{' '}
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
  const id = useId();
  const linksId = `${id}-links`;
  const savedId = `${id}-saved`;
  const headerRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenus = () => {
    setOpenDropdown(null);
    setMobileOpen(false);
  };

  useEffect(() => {
    if (mobileOpen) document.getElementById(linksId)?.querySelector('a')?.focus();
  }, [linksId, mobileOpen]);

  useEffect(() => {
    const closeDropdown = () => {
      if (!openDropdown) return;
      const trigger = triggerRefs.current[openDropdown];
      const panel = document.getElementById(`${id}-${openDropdown}`);
      if (panel?.contains(document.activeElement)) trigger?.focus();
      setOpenDropdown(null);
    };
    const closeMobile = () => {
      const links = document.getElementById(linksId);
      const saved = document.getElementById(savedId);
      if (links?.contains(document.activeElement) || saved?.contains(document.activeElement)) {
        hamburgerRef.current?.focus();
      }
      setMobileOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileOpen) {
        setOpenDropdown(null);
        closeMobile();
        hamburgerRef.current?.focus();
      } else if (openDropdown) {
        closeDropdown();
        triggerRefs.current[openDropdown]?.focus();
      } else return;
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (Object.values(triggerRefs.current).some((trigger) => trigger?.contains(target))) return;
      const active = document.activeElement;
      // Clicking non-interactive content can focus body or a heading with tabindex=-1.
      // Preserve focus when the click instead focuses another control.
      const restoreTriggerFocus =
        !active ||
        active === document.body ||
        (active instanceof HTMLElement &&
          active.tabIndex < 0 &&
          !active.matches('a[href], button, input, select, textarea, summary, [contenteditable]'));
      if (!headerRef.current?.contains(target)) {
        closeDropdown();
        if (mobileOpen) closeMobile();
        if (restoreTriggerFocus) {
          if (mobileOpen) hamburgerRef.current?.focus();
          else if (openDropdown) triggerRefs.current[openDropdown]?.focus();
        }
      } else if (
        openDropdown &&
        !triggerRefs.current[openDropdown]?.parentElement?.contains(target)
      ) {
        closeDropdown();
        if (restoreTriggerFocus) triggerRefs.current[openDropdown]?.focus();
      }
    };
    const onResize = () => {
      closeDropdown();
      closeMobile();
    };
    const media = window.matchMedia?.('(max-width: 1000px)');
    media?.addEventListener('change', onResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    return () => {
      media?.removeEventListener('change', onResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, [id, linksId, savedId, mobileOpen, openDropdown]);

  return (
    <header
      ref={headerRef}
      dir="rtl"
      className={styles.header}
      data-mobile-open={mobileOpen}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('a')) closeMenus();
      }}
    >
      <NavItem href={ROUTES.home} onClick={onGoHome} label="MyWay" className={styles.logo}>
        <span dir="ltr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/myway-wordmark.svg" alt="MyWay" width={606} height={186} />
        </span>
      </NavItem>
      <nav aria-label="ניווט ראשי" className={styles.navigation}>
        <div id={linksId} className={styles.links}>
          <Link
            href="/sekhem-calculator"
            className={styles.question}
            aria-current={pathname === '/sekhem-calculator' ? 'page' : undefined}
          >
            מה הסיכויים שלי?{' '}
          </Link>
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className={styles.group}>
              <button
                ref={(element) => {
                  triggerRefs.current[group.id] = element;
                }}
                type="button"
                className={styles.trigger}
                aria-expanded={openDropdown === group.id}
                aria-controls={`${id}-${group.id}`}
                onClick={() => setOpenDropdown(openDropdown === group.id ? null : group.id)}
              >
                {group.label}{' '}
                <svg
                  className={styles.chevron}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>{' '}
              <ul
                id={`${id}-${group.id}`}
                className={styles.panel}
                hidden={openDropdown !== group.id}
              >
                {group.links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      aria-current={pathname === href.split('?')[0] ? 'page' : undefined}
                    >
                      {label}{' '}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <span id={savedId} className={styles.saved}>
            <NavItem href={ROUTES.savedPrograms} onClick={onGoToBucket}>
              הרשימה שלי
            </NavItem>
          </span>
          <div className={styles.accountControls}>
            <button
              ref={hamburgerRef}
              type="button"
              className={styles.hamburger}
              aria-label="תפריט ניווט"
              aria-expanded={mobileOpen}
              aria-controls={`${linksId} ${savedId}`}
              onClick={() => {
                setMobileOpen(!mobileOpen);
                setOpenDropdown(null);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            {loading ? (
              <span
                className={styles.account}
                role="status"
                aria-label="טוען חשבון"
                aria-busy="true"
              >
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
          </div>
        </div>
      </nav>
    </header>
  );
}
