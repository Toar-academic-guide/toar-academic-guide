import { notFound } from 'next/navigation';
import WayPageShell from '@/components/WayPageShell';

export default function DevShortcuts() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const steps = [
    { label: 'דף הבית', url: '/', desc: 'Landing page' },
    { label: 'מבוא לשאלון', url: '/?step=intro', desc: 'Quiz intro screen' },
    { label: 'פרופיל אקדמי', url: '/?step=academic-profile', desc: 'Bagrut / psychometric form' },
    {
      label: 'שאלון קריירה',
      url: '/?step=career-assessment',
      desc: 'Career assessment (screen 1)',
    },
    { label: 'שאלון קריירה — מסך 3', url: '/?screen=3', desc: 'Jump to specific screen' },
    { label: 'שאלון קריירה — מסך 5', url: '/?screen=5', desc: 'Jump to specific screen' },
    { label: 'פילטרים מהירים', url: '/?step=quick-filters', desc: 'Onboarding funnel' },
    { label: 'המלצות', url: '/?step=recommendations', desc: 'Recommendations (mock RIASEC data)' },
    { label: 'מחשבון', url: '/?step=calculator', desc: 'Score calculator' },
    { label: 'הרשימה שלי', url: '/?step=bucket-list', desc: 'Saved programs list' },
    { label: 'בחירת תואר', url: '/?step=degree-picker', desc: 'Degree picker' },
  ];

  return (
    <WayPageShell showLogo>
      <main className="dev-shortcuts">
      <style>{`
        .dev-shortcuts {
          max-width: 640px;
          margin: 0 auto;
          padding: 60px 24px 96px;
          direction: rtl;
        }
        .dev-shortcuts h1 { color: #0c1d45; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .dev-shortcuts p { color: #6f7a99; font-size: 14px; margin-bottom: 32px; }
        .dev-shortcuts .links { display: flex; flex-direction: column; gap: 10px; }
        .dev-shortcuts a {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 18px;
          text-decoration: none;
          color: #445274;
          background: rgba(255,255,255,0.82);
          box-shadow: 0 16px 44px rgba(105,133,190,0.10);
          backdrop-filter: blur(18px);
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
        }
        .dev-shortcuts a:hover {
          border-color: #8fd8ff;
          box-shadow: 0 20px 58px rgba(105,133,190,0.16);
          transform: translateY(-1px);
        }
        .dev-shortcuts .name { font-weight: 600; font-size: 15px; }
        .dev-shortcuts .hint { color: #7c86a2; font-size: 12px; }
        .dev-shortcuts .footer { margin-top: 32px; font-size: 12px; color: #9aa8c2; }
      `}</style>

      <h1>קיצורי דרך לפיתוח</h1>
      <p>לחץ על כל כפתור כדי לקפוץ ישירות לאותו מסך. הקישורים יחסיים — עובדים בכל פורט.</p>

      <div className="links">
        {steps.map(({ label, url, desc }) => (
          <a key={url} href={url}>
            <span className="name">{label}</span>
            <span className="hint">{desc}</span>
          </a>
        ))}
      </div>

      <p className="footer">
        הוסף מסכים נוספים לפי הצורך ב-<code>src/app/dev/page.tsx</code>
      </p>
      </main>
    </WayPageShell>
  );
}
