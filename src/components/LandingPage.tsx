'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Props {
  onStart: () => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const FADE_UP = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.72, ease: EASE, delay },
});

export default function LandingPage({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* ── Logo ───────────────────────────────────────────────── */}
      <motion.div {...FADE_UP(0)} className="mb-10">
        <Image
          src="/logo.jpg.PNG"
          alt="לוגו נאה תואר"
          width={960}
          height={320}
          className="h-72 w-auto object-contain drop-shadow-sm md:h-96"
          priority
        />
      </motion.div>

      {/* ── Sub-headline ───────────────────────────────────────── */}
      <motion.p
        {...FADE_UP(0.28)}
        className="mb-12 whitespace-nowrap text-center text-2xl font-bold tracking-wide text-slate-900 md:text-3xl"
      >
        הדרך שלך לדיוק העצמי שלך בעולם האקדמי מתחילה כאן
      </motion.p>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <motion.div {...FADE_UP(0.52)}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-10 rounded-full shadow-md transition-colors duration-300"
        >
          מתחילים
        </motion.button>
      </motion.div>
    </div>
  );
}
