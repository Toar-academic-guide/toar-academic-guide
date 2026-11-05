import type { ReactNode } from 'react';
import WayPageShell from './WayPageShell';

export default function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <WayPageShell>
      <main
        id="main-content"
        dir="rtl"
        tabIndex={-1}
        className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-16 pt-8 text-right sm:px-8 lg:pt-12"
      >
        <h1 className="mb-6 text-3xl font-semibold leading-tight text-[var(--text-heading)] sm:text-4xl">
          {title}
        </h1>
        <div className="space-y-5 text-base leading-8 text-[var(--text-body)] [&_a]:break-words [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-3">
          {children}
        </div>
      </main>
    </WayPageShell>
  );
}
