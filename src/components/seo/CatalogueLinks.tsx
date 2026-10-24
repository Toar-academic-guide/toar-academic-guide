import Link from 'next/link';
import { getPublicBrowseLinks, type SubjectHub } from '@/lib/publicCatalogueLinks';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const linkStyle =
  'rounded-sm py-1 text-[var(--text-body)] underline-offset-4 hover:text-[var(--way-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4';

function HubLinks({ hubs }: { hubs: SubjectHub[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
      {hubs.map((hub) => (
        <li key={hub.id}>
          <Link className={linkStyle} href={`/programs/${encodeURIComponent(hub.id)}`}>
            {hub.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CatalogueBrowse({
  hubs,
  institutions,
}: {
  hubs: SubjectHub[];
  institutions: CatalogueInstitution[];
}) {
  return (
    <section
      dir="rtl"
      aria-labelledby="browse-title"
      className="mx-auto mt-12 w-full max-w-6xl border-t border-[var(--border)] px-4 py-10 text-right sm:px-6"
    >
      <h2 id="browse-title" className="mb-6 text-xl font-bold">
        מה ואיפה ללמוד
      </h2>
      <HubLinks hubs={hubs.slice(0, 24)} />
      {hubs.length > 24 && (
        <details className="mt-4">
          <summary className="cursor-pointer py-2 text-sm font-semibold">תחומים נוספים</summary>
          <div className="mt-3">
            <HubLinks hubs={hubs.slice(24)} />
          </div>
        </details>
      )}
      <div className="mt-8 flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold">מוסדות לימוד</h3>
        <Link className={`${linkStyle} text-sm`} href="/institutions">
          כל המוסדות
        </Link>
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {institutions.map((institution) => (
          <li key={institution.id}>
            <Link
              className={linkStyle}
              href={`/institutions/${encodeURIComponent(institution.id)}`}
            >
              {institution.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Catalogue links must never take a page down: if the catalogue read fails the
// homepage block is omitted and the footer keeps only its static links.
async function browseLinksOrNull() {
  try {
    return await getPublicBrowseLinks();
  } catch {
    return null;
  }
}

export async function HomeBrowse() {
  const links = await browseLinksOrNull();
  return links ? <CatalogueBrowse {...links} /> : null;
}

// A plain <footer> (contentinfo landmark), not a second <nav>: the header keeps
// the page's only navigation landmark.
export async function CatalogueFooter() {
  const links = await browseLinksOrNull();
  return (
    <footer
      dir="rtl"
      className="relative z-10 bg-[var(--way-page-background)] px-4 py-10 text-right sm:px-6"
    >
      <div className="mx-auto max-w-6xl border-t border-[var(--border)] pt-8">
        <ul className="mb-6 flex flex-wrap gap-x-8 gap-y-2 font-semibold">
          <li>
            <Link className={linkStyle} href="/institutions">
              מוסדות לימוד
            </Link>
          </li>
          <li>
            <Link className={linkStyle} href="/about">
              מי אנחנו
            </Link>
          </li>
        </ul>
        {links && (
          <details>
            <summary className="cursor-pointer py-2 font-semibold">תחומי לימוד</summary>
            <div className="mt-4">
              <HubLinks hubs={links.hubs} />
            </div>
          </details>
        )}
      </div>
    </footer>
  );
}

export function RelatedPrograms({
  hub,
  programs,
  institutions,
}: {
  hub?: SubjectHub;
  programs: CatalogueProgram[];
  institutions: CatalogueInstitution[];
}) {
  if (!hub) return null;
  return (
    <section
      dir="rtl"
      aria-labelledby="related-title"
      className="border-t border-[var(--border)] pt-6 text-right"
    >
      <h2 id="related-title" className="mb-4 text-xl font-bold">
        מסלולים נוספים
      </h2>
      <Link
        className={`${linkStyle} font-semibold`}
        href={`/programs/${encodeURIComponent(hub.id)}`}
      >
        {hub.name}
      </Link>
      <ul className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {programs.map((program) => (
          <li key={program.id}>
            <Link className={linkStyle} href={`/programs/${encodeURIComponent(program.id)}`}>
              {institutions.find((institution) => institution.id === program.institutionId)?.name ??
                program.institution}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
