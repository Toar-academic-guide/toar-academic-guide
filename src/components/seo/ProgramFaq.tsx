import type { ProgramFaqEntry } from '@/lib/seo/jsonLd';

export default function ProgramFaq({ entries }: { entries: ProgramFaqEntry[] }) {
  return (
    <section
      aria-labelledby="program-faq-heading"
      data-testid="program-faq"
      className="rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm sm:p-8"
    >
      <h2 id="program-faq-heading" className="text-xl font-bold">
        שאלות נפוצות
      </h2>
      {entries.map(({ question, answer }) => (
        <div key={question} className="mt-6">
          <h3 className="font-semibold">{question}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{answer}</p>
        </div>
      ))}
    </section>
  );
}
