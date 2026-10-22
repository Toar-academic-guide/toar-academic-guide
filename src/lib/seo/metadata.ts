import type { Metadata } from 'next';
import {
  getPublicInstitutionPageData,
  getPublicProgramPageData,
  type PublicProgramPageData,
} from '@/lib/publicCataloguePages';
import { indexableProgramIds, isIndexableInstitution, isIndexableProgram } from './indexability';
import { SITE_NAME } from '@/lib/site';

function programTitle({ program, institutions }: PublicProgramPageData): string {
  return institutions.length === 1
    ? `${program.name} – ${institutions[0].name}`
    : `לימודי ${program.name}: באילו מוסדות לומדים`;
}

function duplicateTitles(titles: Map<string, string>): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const title of titles.values()) {
    if (seen.has(title)) duplicates.add(title);
    seen.add(title);
  }
  return duplicates;
}

function buildUniqueProgramTitles(): Map<string, string> {
  const pages = indexableProgramIds().map((id) => getPublicProgramPageData(id)!);
  const titles = new Map(pages.map((data) => [data.program.id, programTitle(data)]));
  const collisions = duplicateTitles(titles);
  for (const { program } of pages) {
    const title = titles.get(program.id)!;
    if (collisions.has(title)) titles.set(program.id, `${title} (${program.category})`);
  }
  const remaining = duplicateTitles(titles);
  for (const { program } of pages) {
    const title = titles.get(program.id)!;
    if (remaining.has(title)) titles.set(program.id, `${title} (${program.id})`);
  }
  return titles;
}

// Derived once from the same static page loaders, without network or database access.
const PROGRAM_TITLES = buildUniqueProgramTitles();

function pageMetadata(
  title: string,
  description: string,
  path: string,
  indexable: boolean,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      locale: 'he_IL',
      siteName: SITE_NAME,
    },
    ...(!indexable ? { robots: { index: false, follow: true } } : {}),
  };
}

export function buildInstitutionMetadata(id: string): Metadata {
  const data = getPublicInstitutionPageData(id);
  if (!data) return {};

  const { institution, programs } = data;
  const title = `${institution.name}: מסלולים ותנאי קבלה`;
  const description = `${programs.length} מסלולי לימוד של ${institution.name} מופיעים בקטלוג MyWay. מידע על המסלולים ובדיקת סיכויי קבלה אישית בחינם; תנאי הקבלה המחייבים באתר המוסד.`;
  return pageMetadata(
    title,
    description,
    `/institutions/${encodeURIComponent(id)}`,
    isIndexableInstitution(id),
  );
}

export function buildProgramMetadata(id: string): Metadata {
  const data = getPublicProgramPageData(id);
  if (!data) return {};

  const title = PROGRAM_TITLES.get(id) ?? programTitle(data);
  const qualifier = title.slice(programTitle(data).length);
  const offering =
    data.institutions.length === 1
      ? `${data.program.name}${qualifier} ב${data.institutions[0].name}`
      : `${data.program.name}${qualifier} ב-${data.institutions.length} מוסדות לימוד`;
  const description = `${offering}: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.`;
  return pageMetadata(
    title,
    description,
    `/programs/${encodeURIComponent(id)}`,
    isIndexableProgram(id),
  );
}
