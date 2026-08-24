'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, ExternalLink, MapPin, Search, SlidersHorizontal } from 'lucide-react';

import InstitutionLogo from '@/components/InstitutionLogo';
import LogoCanvas from '@/components/LogoCanvas';
import type {
  InstitutionAreaFilter,
  InstitutionCategoryFilter,
  InstitutionCredentialFilter,
  InstitutionDirectoryItem,
} from '@/data/institutionDirectory';
import { ROUTES } from '@/lib/routes';

interface InstitutionsDirectoryProps {
  institutions: InstitutionDirectoryItem[];
}

const AREA_FILTERS: Array<{ id: InstitutionAreaFilter; label: string }> = [
  { id: 'all', label: 'הכל' },
  { id: 'center', label: 'מרכז' },
  { id: 'north', label: 'צפון' },
  { id: 'south', label: 'דרום' },
  { id: 'jerusalem', label: 'ירושלים' },
  { id: 'tel_aviv', label: 'תל אביב' },
  { id: 'haifa', label: 'חיפה' },
  { id: 'online', label: 'אונליין' },
];

const CATEGORY_FILTERS: Array<{ id: InstitutionCategoryFilter; label: string }> = [
  { id: 'all', label: 'כל הסוגים' },
  { id: 'popular', label: 'פופולריים' },
  { id: 'universities', label: 'אוניברסיטאות' },
  { id: 'public_colleges', label: 'מכללות ציבוריות' },
  { id: 'private_colleges', label: 'מכללות פרטיות' },
  { id: 'professional_schools', label: 'בתי ספר מקצועיים' },
];

const CREDENTIAL_FILTERS: Array<{ id: InstitutionCredentialFilter; label: string }> = [
  { id: 'all', label: 'כל התעודות' },
  { id: 'academic_degree', label: 'תואר אקדמי' },
  { id: 'professional_certificate', label: 'תעודה מקצועית' },
  { id: 'subsidized', label: 'מסובסד' },
  { id: 'unsubsidized', label: 'לא מסובסד' },
];

function countByArea(institutions: InstitutionDirectoryItem[], area: InstitutionAreaFilter) {
  if (area === 'all') {
    return institutions.length;
  }

  return institutions.filter((institution) => institution.areas.includes(area)).length;
}

function countByCategory(
  institutions: InstitutionDirectoryItem[],
  category: InstitutionCategoryFilter,
) {
  if (category === 'all') {
    return institutions.length;
  }

  return institutions.filter((institution) => institution.categories.includes(category)).length;
}

function countByCredential(
  institutions: InstitutionDirectoryItem[],
  credential: InstitutionCredentialFilter,
) {
  if (credential === 'all') {
    return institutions.length;
  }

  return institutions.filter((institution) => institution.credentials.includes(credential)).length;
}

function FilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]',
        active
          ? 'border-[#7784e8] bg-[#7784e8] text-white shadow-[0_14px_30px_rgba(119,132,232,0.24)]'
          : 'border-[#d9e3f3] bg-white/80 text-[#647091] hover:border-[#b8c4ff] hover:bg-white hover:text-[#5262d9]',
      ].join(' ')}
    >
      <span>{label}</span>
      <span
        className={[
          'rounded-full px-1.5 py-0.5 text-[10px]',
          active ? 'bg-white/18 text-white' : 'bg-[#f0f4fa] text-[#72809a]',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

function getEmptyStateText(searchTerm: string) {
  return searchTerm.trim()
    ? 'לא נמצאו מוסדות שמתאימים לחיפוש ולמסננים שבחרת.'
    : 'לא נמצאו מוסדות שמתאימים למסננים שבחרת.';
}

function DirectoryBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <img
        src="/way-abstract-glass-blob.png"
        alt=""
        draggable={false}
        className="absolute left-[-9rem] top-28 h-[24rem] w-[24rem] object-contain opacity-45 drop-shadow-[0_36px_70px_rgba(99,126,206,0.18)]"
      />
      <img
        src="/way-abstract-glass-knot.png"
        alt=""
        draggable={false}
        className="absolute right-[-8rem] top-[32rem] h-80 w-80 object-contain opacity-35 drop-shadow-[0_36px_70px_rgba(99,126,206,0.18)]"
      />
      <img
        src="/way-abstract-glass-pebble.png"
        alt=""
        draggable={false}
        className="absolute left-[10%] top-[44rem] h-32 w-32 object-contain opacity-30 drop-shadow-[0_26px_54px_rgba(99,126,206,0.14)]"
      />
    </div>
  );
}

export default function InstitutionsDirectory({ institutions }: InstitutionsDirectoryProps) {
  const [area, setArea] = useState<InstitutionAreaFilter>('all');
  const [category, setCategory] = useState<InstitutionCategoryFilter>('all');
  const [credential, setCredential] = useState<InstitutionCredentialFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInstitutions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('he-IL');

    return institutions.filter((institution) => {
      const matchesArea = area === 'all' || institution.areas.includes(area);
      const matchesCategory =
        category === 'all' || institution.categories.includes(category);
      const matchesCredential =
        credential === 'all' || institution.credentials.includes(credential);
      const searchable = [
        institution.name,
        institution.type,
        institution.funding,
        institution.location,
        institution.diplomaType,
        institution.domain,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('he-IL');

      return (
        matchesArea &&
        matchesCategory &&
        matchesCredential &&
        (!normalizedSearch || searchable.includes(normalizedSearch))
      );
    });
  }, [area, category, credential, institutions, searchTerm]);

  const featuredInstitutions = useMemo(
    () => institutions.filter((institution) => institution.categories.includes('popular')).slice(0, 6),
    [institutions],
  );

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#f8fbff] text-[#435072]"
      style={{
        backgroundImage:
          'linear-gradient(180deg, #fbfdff 0%, #eef7ff 38%, #fbfdff 72%), radial-gradient(circle at 18% 18%, rgba(142,222,255,0.34), transparent 28%), radial-gradient(circle at 86% 24%, rgba(177,164,255,0.30), transparent 30%)',
      }}
    >
      <DirectoryBackdrop />
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-5 sm:px-6">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between rounded-[1.4rem] border border-white bg-white/78 px-4 shadow-[0_20px_70px_rgba(117,139,190,0.18)] backdrop-blur-xl sm:px-5">
          <Link
            href={ROUTES.home}
            aria-label="דף הבית"
            className="flex h-11 items-center rounded-2xl border border-[#e3e9f6] bg-white px-3 shadow-sm transition hover:bg-[#f6f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff]"
          >
            <LogoCanvas size={30} brighten={false} />
          </Link>

          <nav
            className="hidden items-center gap-1 text-sm font-semibold text-[#647091] md:flex"
            aria-label="ניווט"
          >
            <Link
              href={ROUTES.assessment}
              className="rounded-2xl px-4 py-2 transition hover:bg-[#eef4ff] hover:text-[#5262d9]"
            >
              שאלון
            </Link>
            <span className="rounded-2xl bg-[#eef4ff] px-4 py-2 font-bold text-[#5262d9]">
              מוסדות
            </span>
            <Link
              href={ROUTES.calculator}
              className="rounded-2xl px-4 py-2 transition hover:bg-[#eef4ff] hover:text-[#5262d9]"
            >
              מחשבון קבלה
            </Link>
          </nav>

          <Link
            href={ROUTES.savedPrograms}
            className="rounded-2xl bg-[#7784e8] px-4 py-2 text-sm font-bold text-white shadow-[0_16px_34px_rgba(119,132,232,0.24)] transition hover:bg-[#6574dc]"
          >
            הרשימה שלי
          </Link>
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-8 pt-32 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pb-12 lg:pt-36">
          <div>
            <p className="text-sm font-bold text-[#7784e8]">מוסדות לימוד בישראל</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#445274] sm:text-6xl">
              למצוא מוסד לפי מקום, סוג ותעודה
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#6f7a99] sm:text-lg">
              קטלוג מוסדות מתוך Monday, מאורגן לחיפוש מהיר בין אוניברסיטאות, מכללות
              ובתי ספר מקצועיים.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              [`${institutions.length}`, 'מוסדות'],
              [`${countByCategory(institutions, 'universities')}`, 'אוניברסיטאות'],
              [`${countByCredential(institutions, 'professional_certificate')}`, 'תעודות'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="min-h-28 rounded-[1.4rem] border border-white bg-white/72 p-4 shadow-[0_20px_60px_rgba(105,133,190,0.14)] backdrop-blur"
              >
                <span className="block text-3xl font-black text-[#445274]">{value}</span>
                <span className="mt-2 block text-sm font-semibold text-[#6f7a99]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-2 sm:px-6">
        <div className="rounded-[1.6rem] border border-white bg-white/76 p-4 shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur sm:p-5">
          <label className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7b8aa4]"
              size={18}
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="חיפוש מוסד, עיר או סוג לימודים"
              className="h-12 w-full rounded-2xl border border-[#e2e9f4] bg-[#f8fbff] pr-11 pl-4 text-sm font-semibold text-[#445274] outline-none transition placeholder:text-[#8a98ad] focus:border-[#7784e8] focus:bg-white focus:ring-2 focus:ring-[#8fd8ff]/30"
            />
          </label>

          <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#445274]">
            <MapPin size={16} />
            <span>אזור</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {AREA_FILTERS.map((filter) => (
              <FilterButton
                key={filter.id}
                active={area === filter.id}
                count={countByArea(institutions, filter.id)}
                label={filter.label}
                onClick={() => setArea(filter.id)}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#445274]">
            <SlidersHorizontal size={16} />
            <span>סינון נוסף</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_FILTERS.map((filter) => (
              <FilterButton
                key={filter.id}
                active={category === filter.id}
                count={countByCategory(institutions, filter.id)}
                label={filter.label}
                onClick={() => setCategory(filter.id)}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CREDENTIAL_FILTERS.map((filter) => (
              <FilterButton
                key={filter.id}
                active={credential === filter.id}
                count={countByCredential(institutions, filter.id)}
                label={filter.label}
                onClick={() => setCredential(filter.id)}
              />
            ))}
          </div>
        </div>

        {featuredInstitutions.length > 0 && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredInstitutions.map((institution) => (
              <Link
                key={institution.id}
                href={`/institutions/${institution.id}`}
                className="group flex min-h-24 items-center justify-between rounded-[1.4rem] border border-white bg-white/78 p-4 shadow-[0_18px_50px_rgba(105,133,190,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(105,133,190,0.17)]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <InstitutionLogo
                    institution={institution.name}
                    domain={institution.domain}
                    logoUrl={institution.logoUrl}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[#445274]">
                      {institution.name}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-[#75849d]">
                      {institution.location ?? institution.type ?? 'מוסד לימודים'}
                    </span>
                  </span>
                </span>
                <ArrowUpLeft
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-[#8a98ad] transition group-hover:text-[#5262d9]"
                />
              </Link>
            ))}
          </section>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#445274]">כל המוסדות</h2>
          <span className="rounded-full border border-white bg-white/78 px-3 py-1 text-xs font-bold text-[#60708c] shadow-sm backdrop-blur">
            {filteredInstitutions.length} תוצאות
          </span>
        </div>

        {filteredInstitutions.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredInstitutions.map((institution) => (
              <article
                key={`${institution.itemId}-${institution.id}`}
                className="flex min-h-[220px] flex-col rounded-[1.4rem] border border-white bg-white/78 p-4 shadow-[0_18px_50px_rgba(105,133,190,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(105,133,190,0.17)]"
              >
                <div className="flex items-start gap-3">
                  <InstitutionLogo
                    institution={institution.name}
                    domain={institution.domain}
                    logoUrl={institution.logoUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/institutions/${institution.id}`}
                      className="line-clamp-2 min-h-10 text-base font-bold leading-5 text-[#445274] hover:text-[#5262d9]"
                    >
                      {institution.name}
                    </Link>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-[#75849d]">
                      {institution.location ?? 'מיקום לא עודכן'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                  {institution.type && (
                    <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[#5262d9]">
                      {institution.type}
                    </span>
                  )}
                  {institution.diplomaType && (
                    <span className="rounded-full bg-[#e9f8f2] px-2.5 py-1 text-[#087f5b]">
                      {institution.diplomaType}
                    </span>
                  )}
                  {institution.funding && (
                    <span className="rounded-full bg-[#fff3df] px-2.5 py-1 text-[#916000]">
                      {institution.funding}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <Link
                    href={`/institutions/${institution.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#7784e8] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(119,132,232,0.22)] transition hover:bg-[#6574dc]"
                  >
                    לעמוד המוסד
                  </Link>
                  {institution.sourceUrl && (
                    <a
                      href={institution.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d9e3f3] bg-white/70 text-[#60708c] transition hover:bg-white hover:text-[#445274]"
                      aria-label={`מקור רשמי עבור ${institution.name}`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-[1.6rem] border border-white bg-white/78 px-5 py-12 text-center shadow-[0_18px_50px_rgba(105,133,190,0.12)] backdrop-blur">
            <h2 className="text-lg font-bold text-[#445274]">אין תוצאות</h2>
            <p className="mt-2 text-sm font-semibold text-[#75849d]">
              {getEmptyStateText(searchTerm)}
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
