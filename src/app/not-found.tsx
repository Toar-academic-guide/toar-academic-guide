import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import WayPageShell from '@/components/WayPageShell';

export default function NotFound() {
  return (
    <WayPageShell>
      <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-xl flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[#7784e8]">404</p>
        <h1 className="text-3xl font-semibold">העמוד לא נמצא</h1>
        <p>אפשר לחזור לדף הבית ולהמשיך משם.</p>
        <Link
          href="/"
          className="way-button-primary inline-flex items-center gap-2 px-6 py-3 font-semibold"
        >
          <ArrowRight size={18} />
          חזרה לדף הבית
        </Link>
      </main>
    </WayPageShell>
  );
}
