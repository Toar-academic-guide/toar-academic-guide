import Link from 'next/link';
import type { Ref } from 'react';
import SilkBackground from './SilkBackground';
import './hero.css';

export default function HomeHero({ heading }: { heading: Ref<HTMLHeadingElement> }) {
  return (
    <section id="main" className="hero-v2" tabIndex={-1}>
      <SilkBackground />
      <div className="journey-hero-copy">
        <h1 ref={heading} tabIndex={-1}>
          הדרך ללימודים <span>שלכם</span> <br />
          מתחילה כאן.
        </h1>
        <p className="hero-subline">
          בתוך ריבוי האפשרויות, <bdi dir="ltr">MyWay</bdi> עוזרת לעשות סדר ולבנות דרך שמתאימה לכם.
          שנתחיל?
        </p>
        <div className="hero-actions">
          <Link href="/app/calculator" className="hero-primary journey-primary">
            בדקו לאן אתם מתקבלים{'\n'}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {'\n'}
              <path d="M21 12L3 12M3 12L11.5 3.5M3 12L11.5 20.5" />
              {'\n'}
            </svg>
          </Link>
          <Link href="/app/assessment" className="hero-secondary">
            לא בטוחים מה ללמוד? לשאלון
          </Link>
        </div>
      </div>
      <p className="hero-intro">בוחרים תחום לימודים ומשווים בין אוניברסיטאות ומכללות בכל הארץ</p>
    </section>
  );
}
