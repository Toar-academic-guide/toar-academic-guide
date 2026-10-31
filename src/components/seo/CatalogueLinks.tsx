import Link from 'next/link';
import type { SubjectHub } from '@/lib/publicCatalogueLinks';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';

const linkStyle =
  'rounded-sm py-1 text-[var(--text-body)] underline-offset-4 hover:text-[var(--way-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4';

export function HubLinks({ hubs }: { hubs: SubjectHub[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
      {hubs.map((hub) => (
        <li key={hub.id}>
          <Link className={linkStyle} href={`/programs/${encodeURIComponent(hub.id)}`}>
            {hub.name}{' '}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// A plain <footer> (contentinfo landmark), not a second <nav>: the header keeps
// the page's only navigation landmark. Static links only, so it never depends on
// a catalogue read.
export function CatalogueFooter() {
  return (
    <footer
      dir="rtl"
      className="relative z-10 bg-[var(--way-page-background)] px-4 py-10 text-right sm:px-6"
    >
      <div className="mx-auto max-w-6xl border-t border-[var(--border)] pt-8">
        <ul className="flex flex-wrap gap-x-8 gap-y-2 font-semibold">
          <li>
            <Link className={linkStyle} href="/programs">
              תחומי לימוד{' '}
            </Link>
          </li>
          <li>
            <Link className={linkStyle} href="/institutions">
              מוסדות לימוד{' '}
            </Link>
          </li>
          <li>
            <Link className={linkStyle} href="/about">
              מי אנחנו{' '}
            </Link>
          </li>
        </ul>
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
  // A hub with no programme links is noindex: link the sibling programmes only.
  const hubLink = hub.programLinks > 0;
  if (!hubLink && programs.length === 0) return null;
  return (
    <section
      dir="rtl"
      aria-labelledby="related-title"
      className="border-t border-[var(--border)] pt-6 text-right"
    >
      <h2 id="related-title" className="mb-4 text-xl font-bold">
        מסלולים נוספים{' '}
      </h2>{' '}
      {hubLink && (
        <Link
          className={`${linkStyle} mb-4 inline-block font-semibold`}
          href={`/programs/${encodeURIComponent(hub.id)}`}
        >
          {hub.name}{' '}
        </Link>
      )}
      <ul className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {programs.map((program) => (
          <li key={program.id}>
            <Link className={linkStyle} href={`/programs/${encodeURIComponent(program.id)}`}>
              {institutions.find((institution) => institution.id === program.institutionId)?.name ??
                program.institution}{' '}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
