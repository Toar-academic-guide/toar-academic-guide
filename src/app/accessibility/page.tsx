import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'הצהרת נגישות',
  alternates: { canonical: '/accessibility' },
};

// TODO(compliance): accessibility statement copy pending approval (IS 5568 reg 35ה)
export default function AccessibilityPage() {
  return (
    <LegalPageShell title="הצהרת נגישות">
      <p>[נוסח הצהרת הנגישות ממתין לאישור]</p>
      <p>עמית מליחי (עוסק פטור)</p>
      <p>
        <a href="mailto:info@findmyway.co.il">
          <bdi dir="ltr">info@findmyway.co.il</bdi>
        </a>
      </p>
    </LegalPageShell>
  );
}
