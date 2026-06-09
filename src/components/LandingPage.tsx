'use client';

import { motion } from 'framer-motion';
import LogoCanvas from './LogoCanvas';

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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(150deg, #1e1b4b 0%, #312e81 55%, #4f46e5 100%)' }}
    >
      {/* ── Badge chip ─────────────────────────────────────────── */}
      <motion.div {...FADE_UP(0)} className="mb-6">
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-bold tracking-widest text-indigo-300"
          style={{ background: 'rgba(99,102,241,0.25)' }}
        >
          גרסה 2025 ✦
        </span>
      </motion.div>

      {/* ── Logo ───────────────────────────────────────────────── */}
      <motion.div {...FADE_UP(0.1)} className="mb-8">
        <LogoCanvas size={120} brighten={false} />
      </motion.div>

      {/* ── Headline ───────────────────────────────────────────── */}
      <motion.h1
        {...FADE_UP(0.22)}
        className="mb-4 text-center text-4xl font-black leading-tight tracking-tight text-white md:text-5xl"
        style={{ letterSpacing: '-0.02em' }}
      >
        גלה לאן<br />הכישרונות שלך<br />מובילים
      </motion.h1>

      {/* ── Sub-headline ───────────────────────────────────────── */}
      <motion.p
        {...FADE_UP(0.34)}
        className="mb-10 text-center text-base font-medium text-white/55 md:text-lg"
      >
        הדרך לדיוק העצמי שלך בעולם האקדמי והתעסוקתי מתחילה כאן!
      </motion.p>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <motion.div {...FADE_UP(0.46)} className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="rounded-full bg-white px-10 py-3 text-base font-bold text-indigo-700 shadow-lg transition-colors duration-200 hover:bg-indigo-50"
        >
          מתחילים ←
        </motion.button>
        <span className="text-sm text-white/35">ללא הרשמה · חינמי</span>
      </motion.div>
    </div>
  );
}
