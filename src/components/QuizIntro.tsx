'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Lightbulb, Target, UserRound } from 'lucide-react';
import posthog from 'posthog-js';
import PublicNavBar from './PublicNavBar';
import WayPageShell from './WayPageShell';
import styles from './QuizIntro.module.css';

interface Props {
  onStart: () => void;
  authLoading?: boolean;
  isAuthenticated?: boolean;
  savedCount?: number;
  userInitials?: string;
  userEmail?: string;
  onGoHome?: () => void;
  onGoToBucket?: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const FADE_UP = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.72, ease: EASE, delay },
});

const insightBubbles = [
  {
    label: 'החוזקות שלנו',
    icon: UserRound,
    tone: styles.strengths,
    className: 'right-2 top-0 h-[13.5rem] w-[14.5rem]',
  },
  {
    label: 'תחומים שמסקרנים אותנו',
    icon: Lightbulb,
    tone: styles.interests,
    className: 'left-3 top-[14rem] h-[13.6rem] w-[14.5rem]',
  },
  {
    label: 'המטרות שלנו',
    icon: Target,
    tone: styles.goals,
    className: 'right-8 top-[28.4rem] h-[13.2rem] w-[14rem]',
  },
  {
    label: 'בחירה מדויקת יותר',
    icon: CheckCircle2,
    tone: styles.success,
    className: 'left-2 top-[43rem] h-[10.5rem] w-[14.2rem]',
  },
];

export default function QuizIntro({
  onStart,
  authLoading = false,
  isAuthenticated = false,
  savedCount = 0,
  userInitials,
  userEmail,
  onGoHome,
  onGoToBucket,
  onSignIn,
  onSignOut,
}: Props) {
  return (
    <WayPageShell
      contentClassName="px-4 pb-14 pt-28 sm:px-6 lg:pt-32"
      navigation={
      <PublicNavBar
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        savedCount={savedCount}
        userInitials={userInitials}
        userEmail={userEmail}
        onGoHome={onGoHome}
        onGoToBucket={onGoToBucket}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />
      }
    >
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-9rem)] max-w-[91rem] items-center justify-center">
        <section
          dir="ltr"
          className="flex w-full flex-col items-center justify-center gap-8 py-10 lg:flex-row lg:items-center lg:gap-16 xl:gap-20"
        >
          <motion.aside
            {...FADE_UP(0.08)}
            className="relative mx-auto h-[55rem] w-full max-w-[25rem] shrink-0 lg:mx-0 lg:w-[30%]"
            aria-label="נקודות הכוונה"
            dir="rtl"
          >
            <svg
              aria-hidden="true"
              className="absolute left-[7.5rem] top-[9rem] h-[33.5rem] w-[12rem] overflow-visible"
              viewBox="0 0 190 560"
              fill="none"
            >
              <path
                d="M118 6C48 58 48 111 101 141C165 176 163 229 100 266C36 303 42 353 111 383C178 412 176 474 111 548"
                stroke="#b9d0ff"
                strokeWidth="2"
                opacity="0.62"
              />
            </svg>
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                aria-hidden="true"
                className={[
                  'absolute z-10 h-5 w-5 rounded-full border-2 border-white bg-[#b8d2ff] shadow-sm',
                  index === 0 ? 'left-[8.6rem] top-[8.8rem]' : '',
                  index === 1 ? 'left-[9rem] top-[15rem]' : '',
                  index === 2 ? 'left-[13.9rem] top-[28.4rem]' : '',
                  index === 3 ? 'left-[10.2rem] top-[36.8rem]' : '',
                  index === 4 ? 'left-[11.6rem] top-[42.8rem]' : '',
                ].join(' ')}
              />
            ))}
            {insightBubbles.map(({ label, icon: Icon, tone, className }, index) => (
              <motion.div
                key={label}
                {...FADE_UP(0.14 + index * 0.08)}
                className={`absolute z-20 flex flex-col items-center justify-center text-center ${styles.bubble} ${tone} ${className}`}
              >
                <span className="mb-3 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-white/80 bg-white/60 text-[#24458e] shadow-[0_4px_16px_rgba(104,130,197,0.08)]">
                  <Icon size={31} strokeWidth={1.7} />
                </span>
                <span className="max-w-[11rem] px-1 text-lg font-medium leading-7 text-[#23437f]">
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.aside>

          <motion.div
            {...FADE_UP(0.22)}
            className="relative order-first mx-auto w-full max-w-[55rem] rounded-[2rem] border border-white/80 bg-white/74 px-6 py-8 text-center shadow-[0_28px_90px_rgba(105,133,190,0.16)] backdrop-blur-xl sm:px-10 sm:py-12 lg:order-none lg:mx-0 lg:min-h-[52rem] lg:px-16 xl:px-20"
            dir="rtl"
          >
            <div className="mx-auto mb-5 flex w-full max-w-[47rem] items-center justify-center gap-4 text-lg font-bold text-[#7784e8] lg:justify-start">
              <span className="relative right-8 h-px w-12 bg-[#9c7dff]" />
              <span>בוא נתחיל</span>
            </div>

            <h1 className="mx-auto max-w-[47rem] text-4xl font-semibold leading-tight text-[#0c1d45] sm:text-5xl lg:text-[2.7rem]">
              כדי לדייק את הכיוון הרלוונטי עבורך
            </h1>

            <div className="mx-auto mt-8 grid max-w-[46rem] gap-6 text-lg leading-9 text-[#33405f] sm:text-xl sm:leading-10 lg:text-[1.28rem]">
              <p>
                כשאנחנו מתחילים לחשוב איזה מין לימודים יכולים להתאים לנו, שווה לנו קודם כל לשאול את עצמנו
                שאלות כמו: מה החוזקות שלנו, אילו תחומים מסקרנים אותנו, ומה המטרות האקדמיות
                והתעסוקתיות שלנו, במידה שכבר יש לנו כאלה.
              </p>

              <p>
                השאלון הבא נבנה תוך כדי התבססות על שאלונים קיימים, אשר נמצאים בשימוש בעולם כבר עשרות
                שנים. ביצענו שינויים והתאמות במטרה להיות כמה שיותר מדויקים ורלוונטיים לעידן בו אנחנו
                חיים.
              </p>

              <p>
                מטרת השאלון היא להוות משפך ולעזור לך לצמצם את ריבוי האפשרויות הקיימות, במטרה להגיע
                למספר מצומצם של אפשרויות רלוונטיות.
              </p>

              <p>על אף הזמן והמאמץ הרב שהשקענו בשאלון , הוא כמובן אינו מושלם.</p>

              <p>היינו שמחים לעזרתך להמשיך ולדייק אותו עבורך ועבור משתמשים נוספים.</p>

              <p>במידה ויש לך הצעות כלשהן לשיפור או הערות, נשמח מאוד לשמוע בסופו😊</p>
            </div>

            <div className="mt-9">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  posthog.capture('quiz_started');
                  onStart();
                }}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(90deg,#5b66f0,#8938ee)] px-8 text-base font-bold text-white shadow-[0_18px_44px_rgba(119,72,232,0.30)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff] sm:min-w-[18rem]"
              >
                קדימה, בוא נתחיל!
                <ArrowLeft size={20} />
              </motion.button>
            </div>
          </motion.div>
        </section>
      </main>
    </WayPageShell>
  );
}
