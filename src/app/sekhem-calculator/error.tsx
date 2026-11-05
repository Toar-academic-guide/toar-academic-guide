'use client';

import WayPageShell from '@/components/WayPageShell';

export default function CalculatorError({ reset }: { reset: () => void }) {
  return (
    <WayPageShell contentClassName="pt-28">
      <main dir="rtl" className="mx-auto max-w-3xl px-4 py-12 text-right">
        <h1 className="text-2xl font-semibold">לא הצלחנו לטעון את המחשבון כרגע</h1>
        <button className="way-button-primary mt-6 px-6 py-3" onClick={reset}>
          לנסות שוב
        </button>
      </main>
    </WayPageShell>
  );
}
