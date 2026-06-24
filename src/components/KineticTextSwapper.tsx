'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const DEGREES = [
  'אדריכלות נוף?',
  'מתמטיקה?',
  'קדרות?',
  'מדעי המחשב?',
  'פילוסופיה?',
  'מוזיקה?',
  'הנדסת חשמל?',
  'עבודה סוציאלית?',
  'צילום?',
  'כלכלה?',
  'אפייה?',
  'פיזיקה?',
  'תסריטאות?',
  'משפטים?',
  'קורס ריתוך?',
  'מדעי המוח?',
  'עיצוב תעשייתי?',
  'חינוך?',
  'כימיה?',
  'ריקוד?',
  'פסיכולוגיה?',
  'מדעי הצמח?',
  'מינהל עסקים?',
  'אמנות?',
  'פכ"מ?',
  'בלשנות?',
];

export default function KineticTextSwapper() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % DEGREES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col bg-white px-8 md:px-16" dir="rtl">
      <div className="flex flex-1 items-center">
        <div className="w-full text-right">
          <div
            className="font-black leading-none tracking-tight"
            style={{ fontSize: 'clamp(64px, 10vw, 160px)' }}
          >
            <div style={{ color: '#1a1a2e' }}>חושב/ת על לימודי</div>
            <div
              className="relative overflow-hidden"
              style={{ height: 'clamp(72px, 11.5vw, 184px)' }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={index}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="absolute right-0"
                  style={{ color: '#00E5FF' }}
                >
                  {DEGREES[index].slice(0, -1)}
                  <span style={{ marginRight: '0.12em' }}>?</span>
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start pb-8 md:pb-12" dir="ltr">
        <img
          src="/way-cartoon.png"
          alt="I'm not sure which way to go"
          className="h-auto w-full max-w-2xl md:max-w-4xl"
          style={{ mixBlendMode: 'multiply', filter: 'brightness(1.1) contrast(1.2)' }}
        />
      </div>
    </section>
  );
}
