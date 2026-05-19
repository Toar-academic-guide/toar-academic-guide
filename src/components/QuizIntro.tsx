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

export default function QuizIntro({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-12">

      {/* ── Logo ─────────────────────────────────────────────────── */}
      <motion.div {...FADE_UP(0)} className="mb-10">
        <Image
          src="/logo.jpg.PNG"
          alt="לוגו נאה תואר"
          width={480}
          height={160}
          className="h-24 w-auto object-contain md:h-32"
          priority
        />
      </motion.div>

      {/* ── Body copy ────────────────────────────────────────────── */}
      <motion.div
        {...FADE_UP(0.22)}
        className="max-w-xl mx-auto text-center px-2"
      >
        <p className="text-lg md:text-xl text-slate-700 leading-relaxed">
          כשאנחנו מתחילים לחשוב איזה מין לימודים אקדמאים יוכלו להתאים לנו,
          אנחנו צריכים קודם להבין{' '}
          <strong className="font-bold text-slate-900">
            מי אנחנו, מה החוזקות שלנו ולאן אנחנו מכוונים להגיע.
          </strong>
        </p>

        <p className="mt-5 text-lg md:text-xl text-slate-700 leading-relaxed">
          בוא נבנה עכשיו{' '}
          <strong className="font-bold text-slate-900">פרופיל אישי</strong>{' '}
          שיעזור לך להתכוונן ולהבין מה האפשרויות שעומדות בפניך.
        </p>

        <p className="mt-5 text-lg md:text-xl text-slate-700 leading-relaxed">
          בשלב הראשון, נתחיל לאפיין את{' '}
          <strong className="font-bold text-slate-900">
            החוזקות שלך והמשיכה הטבעית שלך
          </strong>
          , ולאט לאט נסנן יחד את האפשרויות הרלוונטיות ביותר עבורך!
        </p>
      </motion.div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <motion.div {...FADE_UP(0.44)} className="mt-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-sm transition-all duration-300"
        >
          בוא ניקח כיוון
        </motion.button>
      </motion.div>

    </div>
  );
}
