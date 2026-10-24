import type { Metadata } from 'next';
import WayPageShell from '@/components/WayPageShell';
import { HubLinks } from '@/components/seo/CatalogueLinks';
import { getPublicSubjectIndex } from '@/lib/publicCatalogueLinks';

// Rendered per request like the hub pages, so the build never needs the catalogue.
export const dynamic = 'force-dynamic';

const description = 'כל תחומי הלימוד, ולכל תחום המוסדות שמלמדים אותו.';

export const metadata: Metadata = {
  title: 'תחומי לימוד',
  description,
  alternates: { canonical: '/programs' },
  openGraph: {
    title: 'תחומי לימוד',
    description,
    url: '/programs',
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
  },
};

export default async function SubjectIndexPage() {
  const hubs = await getPublicSubjectIndex();
  return (
    <WayPageShell>
      <main dir="rtl" className="mx-auto max-w-4xl px-4 py-10 text-right sm:px-6">
        <h1 className="mb-8 text-3xl font-bold">תחומי לימוד</h1>
        <HubLinks hubs={hubs} />
      </main>
    </WayPageShell>
  );
}
