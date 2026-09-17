'use client';

import type { ReactNode } from 'react';
import PublicNavBar from './PublicNavBar';
import WayBackdrop from './WayBackdrop';
import styles from './WayPageShell.module.css';

interface WayPageShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  dir?: 'ltr' | 'rtl';
  navigation?: ReactNode;
}

export default function WayPageShell({
  children,
  className = '',
  contentClassName = 'pt-28',
  dir = 'rtl',
  navigation = <PublicNavBar />,
}: WayPageShellProps) {
  return (
    <div dir={dir} className={`way-app ${styles.page} ${className}`}>
      <WayBackdrop />
      {navigation}
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  );
}
