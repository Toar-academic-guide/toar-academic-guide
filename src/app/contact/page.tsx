import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'יצירת קשר',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <LegalPageShell title="יצירת קשר">
      <p>MyWay</p>
      <p>
        <a href="mailto:info@findmyway.co.il">
          <bdi dir="ltr">info@findmyway.co.il</bdi>
        </a>
      </p>
    </LegalPageShell>
  );
}
