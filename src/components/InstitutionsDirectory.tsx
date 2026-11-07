'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import InstitutionLogo from '@/components/InstitutionLogo';
import WayPageShell from '@/components/WayPageShell';
import type {
  InstitutionAreaFilter,
  InstitutionCategoryFilter,
  InstitutionCredentialFilter,
  DirectoryInstitution,
  DirectoryProgramme,
} from '@/data/institutionDirectory';
import type { DirectoryOption, DirectorySubject } from '@/data/institutionSubjects';

interface InstitutionsDirectoryProps {
  institutions: DirectoryInstitution[];
  fields: DirectoryOption[];
  subjects: DirectorySubject[];
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

const collator = new Intl.Collator('he');
const inputClass =
  'min-h-11 w-full rounded-xl border border-[#d9e3f3] bg-white px-3 text-right text-sm text-[#445274] outline-none focus:border-[#7784e8] focus:ring-2 focus:ring-[#8fd8ff]';
const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5868c7] focus-visible:ring-offset-2';

function PillGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: DirectoryOption[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const query = search.trim().toLocaleLowerCase('he-IL');
  const visible = options.filter(
    (option) => option.key === selected || option.label.toLocaleLowerCase('he-IL').includes(query),
  );
  if (options.length === 0) {
    return (
      <fieldset>
        <legend className="text-sm font-bold text-[#445274]">{label}</legend>
        <p className="mt-2 text-sm text-[#647091]">אין עדיין פירוט תכניות בתחום הזה בקטלוג.</p>
      </fieldset>
    );
  }
  function pill(option: DirectoryOption, index: number) {
    const active = selected === option.key;
    const display =
      expanded || query || active || index < 4
        ? 'inline-flex'
        : index < 8
          ? 'hidden sm:inline-flex'
          : 'hidden';
    return (
      <button
        key={option.key}
        type="button"
        aria-pressed={active}
        onClick={() => onSelect(active ? '' : option.key)}
        className={`${display} min-h-11 max-w-full items-center rounded-full border px-4 py-2 text-right text-sm font-semibold transition ${focusClass} ${active ? 'border-[#5868c7] bg-[#5868c7] text-white' : 'border-[#d9e3f3] bg-white text-[#596582] hover:border-[#7784e8]'}`}
      >
        {option.label}
      </button>
    );
  }
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-bold text-[#445274]">{label}</legend>
      <input
        type="search"
        aria-label={`חיפוש ${label}`}
        placeholder={`חיפוש ${label}`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className={`${inputClass} mb-3 sm:max-w-xs`}
      />
      <div className="flex flex-wrap gap-2">
        {pill({ key: '', label: 'הכל' }, -1)}
        {visible.map(pill)}
      </div>
      {visible.length === 0 && <p className="mt-3 text-sm text-[#647091]">לא נמצאו אפשרויות.</p>}
      {!query && options.length > 4 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className={`mt-2 min-h-11 rounded-lg text-sm font-semibold text-[#5262d9] ${focusClass} ${options.length <= 8 ? 'sm:hidden' : ''}`}
        >
          {expanded ? 'הצגת פחות' : 'הצגת הכל'}
        </button>
      )}
    </fieldset>
  );
}

function ProgrammeLinks({ programmes }: { programmes: DirectoryProgramme[] }) {
  const links = (items: DirectoryProgramme[]) =>
    items.map((programme) => (
      <Link
        key={programme.id}
        href={programme.href}
        className={`w-fit rounded text-sm text-[#5262d9] underline decoration-[#bbc3ed] underline-offset-4 hover:decoration-current ${focusClass}`}
      >
        {programme.name}
        {programme.href.startsWith('https://') && (
          <ExternalLink aria-hidden="true" size={12} className="ms-1 inline" />
        )}
      </Link>
    ));
  return (
    <div className="flex flex-col gap-2">
      {links(programmes.slice(0, 3))}
      {programmes.length > 3 && (
        <details className="group">
          <summary
            className={`min-h-11 w-fit cursor-pointer rounded py-2 text-sm font-semibold text-[#5262d9] ${focusClass}`}
          >
            <span className="group-open:hidden">הצגת הכל</span>
            <span className="hidden group-open:inline">הצגת פחות</span>
          </summary>
          <div className="flex flex-col gap-2">{links(programmes.slice(3))}</div>
        </details>
      )}
    </div>
  );
}

export default function InstitutionsDirectory({
  institutions,
  fields,
  subjects,
}: InstitutionsDirectoryProps) {
  const [field, setField] = useState('');
  const [subject, setSubject] = useState('');
  const [area, setArea] = useState<InstitutionAreaFilter>('all');
  const [category, setCategory] = useState<InstitutionCategoryFilter>('all');
  const [credential, setCredential] = useState<InstitutionCredentialFilter>('all');
  const [search, setSearch] = useState('');
  const [descending, setDescending] = useState(false);
  const availableSubjects = useMemo(
    () => subjects.filter((option) => !field || option.field.key === field),
    [subjects, field],
  );
  const results = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('he-IL');
    return institutions
      .map((institution) => ({
        ...institution,
        matching: institution.programmes.filter(
          (programme) =>
            (!field || programme.fieldKey === field) &&
            (!subject || programme.subjectKey === subject),
        ),
      }))
      .filter(
        (institution) =>
          (!(field || subject) ||
            institution.matching.length > 0 ||
            (!subject && !!institution.fieldSources[field])) &&
          (area === 'all' || institution.areas.includes(area)) &&
          (category === 'all' || institution.categories.includes(category)) &&
          (credential === 'all' || institution.credentials.includes(credential)) &&
          (!query ||
            [institution.name, institution.location, institution.type, institution.domain]
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase('he-IL')
              .includes(query)),
      )
      .sort((a, b) => collator.compare(a.name, b.name) * (descending ? -1 : 1));
  }, [institutions, field, subject, area, category, credential, search, descending]);

  return (
    <WayPageShell>
      <main dir="rtl" className="mx-auto max-w-6xl px-5 pb-16 pt-8 text-right sm:px-8 sm:pt-12">
        <h1 className="mb-8 text-3xl font-semibold text-[#445274] sm:text-4xl">
          מוסדות לימוד בישראל
        </h1>
        <div className="space-y-6 rounded-3xl border border-white bg-white/80 p-5 sm:p-6">
          <PillGroup
            label="תחום לימודים"
            options={fields}
            selected={field}
            onSelect={(value) => {
              setField(value);
              setSubject('');
            }}
          />
          <PillGroup
            key={field}
            label="תכנית לימודים"
            options={availableSubjects}
            selected={subject}
            onSelect={setSubject}
          />
          <div className="grid grid-cols-2 gap-3 border-t border-[#e2e9f4] pt-5 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-semibold text-[#445274]">
              <span>אזור</span>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as InstitutionAreaFilter)}
                className={inputClass}
              >
                {AREA_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold text-[#445274]">
              <span>סוג מוסד</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InstitutionCategoryFilter)}
                className={inputClass}
              >
                {CATEGORY_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 space-y-2 text-sm font-semibold text-[#445274] sm:col-span-1">
              <span>תעודה ומימון</span>
              <select
                value={credential}
                onChange={(e) => setCredential(e.target.value as InstitutionCredentialFilter)}
                className={inputClass}
              >
                {CREDENTIAL_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-2 text-sm font-semibold text-[#445274]">
            <span>חיפוש מוסד</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="שם המוסד או העיר"
              className={inputClass}
            />
          </label>
        </div>
        <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 aria-live="polite" className="text-xl font-semibold text-[#445274]">
            {results.length === 1 ? 'מוסד אחד' : `${results.length} מוסדות`}
          </h2>
          <label className="flex items-center gap-2 text-sm text-[#596582]">
            מיון
            <select
              value={descending ? 'desc' : 'asc'}
              onChange={(e) => setDescending(e.target.value === 'desc')}
              className={`${inputClass} w-auto`}
            >
              <option value="asc">שם המוסד: א–ת</option>
              <option value="desc">שם המוסד: ת–א</option>
            </select>
          </label>
        </div>
        {results.length ? (
          <table className="block w-full text-right md:table md:table-fixed">
            <caption className="sr-only">מוסדות ותכניות לימודים</caption>
            <thead className="hidden text-sm text-[#647091] md:table-header-group">
              <tr className="border-b border-[#d9e3f3]">
                <th scope="col" className="w-[30%] px-4 py-3">
                  מוסד
                </th>
                <th scope="col" className="w-[15%] px-4 py-3">
                  מיקום
                </th>
                <th scope="col" className="w-[18%] px-4 py-3">
                  סוג מוסד
                </th>
                <th scope="col" className="px-4 py-3">
                  תכניות בקטלוג
                </th>
              </tr>
            </thead>
            <tbody className="block space-y-3 md:table-row-group md:space-y-0">
              {results.map((institution) => (
                <tr
                  key={institution.id}
                  className="grid grid-cols-2 gap-3 rounded-2xl border border-[#e2e9f4] bg-white/85 p-5 md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:p-0"
                >
                  <th scope="row" className="col-span-2 text-right align-top md:px-4 md:py-5">
                    <div className="flex items-start gap-3">
                      <InstitutionLogo
                        institution={institution.name}
                        domain={institution.domain}
                        logoUrl={institution.logoUrl}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/institutions/${encodeURIComponent(institution.id)}`}
                          className={`rounded font-bold text-[#445274] hover:text-[#5262d9] ${focusClass}`}
                        >
                          {institution.name}
                        </Link>
                        {institution.sourceUrl && (
                          <a
                            href={institution.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`אתר ${institution.name}`}
                            className={`mt-2 flex min-h-11 w-fit items-center gap-1 rounded text-xs font-normal text-[#647091] ${focusClass}`}
                          >
                            לאתר המוסד <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  </th>
                  <td className="text-sm text-[#647091] align-top md:px-4 md:py-5">
                    {institution.location?.replace(/^\s*,\s*|\s*,\s*$/g, '') || '—'}
                  </td>
                  <td className="text-sm text-[#647091] align-top md:px-4 md:py-5">
                    {institution.type ?? '—'}
                  </td>
                  <td className="col-span-2 border-t border-[#e2e9f4] pt-3 align-top md:border-t-0 md:px-4 md:py-5">
                    <div className="mb-2 text-xs text-[#647091]">
                      {institution.matching.length === 1
                        ? 'תכנית אחת'
                        : institution.matching.length
                          ? `${institution.matching.length} תכניות`
                          : '—'}
                    </div>
                    <ProgrammeLinks programmes={institution.matching} />
                    {field &&
                      !subject &&
                      !institution.matching.length &&
                      institution.fieldSources[field] && (
                        <a
                          href={institution.fieldSources[field]}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex min-h-11 items-center text-sm text-[#5262d9] underline ${focusClass}`}
                        >
                          מסלולים באתר המוסד
                        </a>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rounded-2xl border border-[#e2e9f4] bg-white p-8 text-center text-[#647091]">
            לא נמצאו מוסדות שמתאימים לסינון.
          </p>
        )}
      </main>
    </WayPageShell>
  );
}
