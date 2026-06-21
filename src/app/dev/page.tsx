import { notFound } from 'next/navigation';

export default function DevShortcuts() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const steps = [
    { label: 'דף הבית', url: '/', desc: 'Landing page' },
    { label: 'מבוא לשאלון', url: '/?step=intro', desc: 'Quiz intro screen' },
    { label: 'פרופיל אקדמי', url: '/?step=academic-profile', desc: 'Bagrut / psychometric form' },
    { label: 'שאלון קריירה', url: '/?step=career-assessment', desc: 'Career assessment (screen 1)' },
    { label: 'שאלון קריירה — מסך 3', url: '/?screen=3', desc: 'Jump to specific screen' },
    { label: 'שאלון קריירה — מסך 5', url: '/?screen=5', desc: 'Jump to specific screen' },
    { label: 'פילטרים מהירים', url: '/?step=quick-filters', desc: 'Onboarding funnel' },
    { label: 'המלצות', url: '/?step=recommendations', desc: 'Recommendations (mock RIASEC data)' },
    { label: 'מחשבון', url: '/?step=calculator', desc: 'Score calculator' },
    { label: 'רשימת היעוד', url: '/?step=bucket-list', desc: 'Saved programs list' },
    { label: 'בחירת תואר', url: '/?step=degree-picker', desc: 'Degree picker' },
  ];

  return (
    <main className="dev-shortcuts">
      <style>{`
        .dev-shortcuts {
          font-family: sans-serif;
          max-width: 640px;
          margin: 60px auto;
          padding: 0 24px;
          direction: rtl;
        }
        .dev-shortcuts h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .dev-shortcuts p { color: #666; font-size: 14px; margin-bottom: 32px; }
        .dev-shortcuts .links { display: flex; flex-direction: column; gap: 10px; }
        .dev-shortcuts a {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          text-decoration: none;
          color: inherit;
          background: #fff;
          transition: box-shadow 0.15s;
        }
        .dev-shortcuts a:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .dev-shortcuts .name { font-weight: 600; font-size: 15px; }
        .dev-shortcuts .hint { color: #888; font-size: 12px; }
        .dev-shortcuts .footer { margin-top: 32px; font-size: 12px; color: #aaa; }
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
  );
}
