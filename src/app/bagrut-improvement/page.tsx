import type { Metadata } from 'next';
import Link from 'next/link';
import WayPageShell from '@/components/WayPageShell';
import JsonLd from '@/components/seo/JsonLd';
import guidance from '@/data/bagrutImprovement.json';
import { absoluteUrl, SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

const canonical = absoluteUrl('/bagrut-improvement');
export const metadata: Metadata = {
  title: { absolute: guidance.title },
  description: guidance.description,
  alternates: { canonical },
  openGraph: {
    title: guidance.title,
    description: guidance.description,
    url: canonical,
    type: 'website',
    locale: 'he_IL',
    siteName: SITE_NAME,
  },
  twitter: { card: 'summary', title: guidance.title, description: guidance.description },
};

function GuideText({ children }: { children: string }) {
  return children.split(/(\d+(?:[.–־-]\d+)*|COBE|BOOST)/g).map((part, index) =>
    /^(?:\d|COBE|BOOST)/.test(part) ? (
      <bdi dir="ltr" key={index}>
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

export default function Page() {
  return (
    <WayPageShell className={styles.shell}>
      <main id="main-content" dir="rtl" className={styles.main}>
        <JsonLd
          data={{
            '@type': 'FAQPage',
            mainEntity: guidance.faqs.map(({ question, answer }) => ({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          }}
        />
        <article>
          <header>
            <h1>{guidance.heading}</h1>
            <p className={styles.lead}>
              <GuideText>{guidance.answer}</GuideText>
            </p>
          </header>
          {guidance.sections.map(({ title, items }, index) => (
            <section key={title} aria-labelledby={`section-${index}`} className={styles.section}>
              <h2 id={`section-${index}`}>{title}</h2>
              <ul>
                {items.map((item) => (
                  <li key={item}>
                    <GuideText>{item}</GuideText>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section aria-labelledby="faq-heading" className={styles.section}>
            <h2 id="faq-heading">שאלות נפוצות</h2>
            {guidance.faqs.map(({ question, answer }) => (
              <details key={question} className={styles.faq}>
                <summary>{question}</summary>
                <p>
                  <GuideText>{answer}</GuideText>
                </p>
              </details>
            ))}
          </section>
          <nav aria-label="כלים להמשך" className={styles.next}>
            <Link href="/sekhem-calculator">בדיקת סכם עם ציון הבגרות החדש</Link>
            <Link href="/without-psychometric">קבלה ללימודים ללא פסיכומטרי</Link>
            <Link href="/programs/prep">מכינות קדם־אקדמיות</Link>
          </nav>
        </article>
      </main>
    </WayPageShell>
  );
}
