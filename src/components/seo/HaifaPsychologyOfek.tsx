const sourceUrl = 'https://admissions.haifa.ac.il/social-sciences/program/3268/';

export function HaifaPsychologyOfek() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold">מסלול אופק בפסיכולוגיה — ללא פסיכומטרי</h2>
      <p className="mt-3 leading-7 text-slate-700">
        המסלול מיועד לבעלי תעודת בגרות מלאה. נדרשות אנגלית ברמת 5 יחידות בציון 85 לפחות ומתמטיקה
        ברמת 5 יחידות בציון 80 לפחות; או אנגלית 5 יחידות בציון 85, מתמטיקה 4 יחידות בציון 85 ומקצוע
        מורחב של 5 יחידות בציון 85 במדעי החברה, מדעי הטבע או המדעים המדויקים.
      </p>
      <p className="mt-3 leading-7 text-slate-700">
        נדרשים גם סיווג אנגלית ברמת טרום בסיסי ומעלה וסיווג עברית 120 לפחות ביעלנט או במבחן
        האוניברסיטה, או סיום קורס עברית באקדמיה במסגרת המכינה. כל בקשה נבדקת בנפרד. בסמסטר הראשון
        לומדים על תנאי וצריך לעבור 2–3 קורסים בציון 75 לפחות. רק לאחר עמידה בכל תנאי המסלול עוברים
        למעמד מן המניין בסמסטר ב׳; אי־עמידה בתנאים מובילה להפסקת הלימודים.
      </p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center text-[#6554b8] underline underline-offset-2"
      >
        תנאי מסלול אופק באתר אוניברסיטת חיפה
      </a>
      <p className="text-xs text-slate-500">
        נבדק בתאריך <bdi dir="ltr">14.11.2026</bdi>
      </p>
    </section>
  );
}
