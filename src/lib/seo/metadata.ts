import type { Metadata } from 'next';
import {
  loadPublicCatalogue,
  getPublicInstitutionPageData,
  getPublicProgramPageData,
  type PublicProgramPageData,
} from '@/lib/publicCataloguePages';
import { isIndexableInstitution, isIndexableProgram } from './indexability';
import { SITE_NAME } from '@/lib/site';
import { withBet } from '@/lib/hebrew';
import { canonicalProgramId, canonicalProgramPath } from './programAliases';

function programTitle({
  program,
  institutions,
  isGeneral,
}: Pick<PublicProgramPageData, 'program' | 'institutions' | 'isGeneral'>): string {
  return isGeneral || institutions.length !== 1
    ? `לימודי ${program.name}: באילו מוסדות לומדים`
    : `${program.name} – ${institutions[0].name}`;
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

async function buildUniqueProgramTitles(): Promise<Map<string, string>> {
  const catalogue = await loadPublicCatalogue();
  const pages = catalogue.programs
    .filter(
      (program) =>
        canonicalProgramId(program.id) === program.id &&
        !program.id.startsWith('mon_') &&
        program.isListed !== false,
    )
    .map((program) => ({
      program,
      isGeneral: catalogue.generalProgramIds.has(program.id),
      institutions: catalogue.institutions.filter((institution) =>
        program.linkedInstitutionIds.includes(institution.id),
      ),
    }))
    .filter((data) => data.institutions.length > 0);
  const titles = new Map(pages.map((data) => [data.program.id, programTitle(data)]));
  const collisions = duplicateTitles(titles);
  for (const { program } of pages) {
    const title = titles.get(program.id)!;
    if (collisions.has(title) && !catalogue.generalProgramIds.has(program.id)) {
      titles.set(program.id, `${title}: מסלול ${withBet(program.category)}`);
    }
  }
  return titles;
}

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

export async function buildInstitutionMetadata(id: string): Promise<Metadata> {
  const data = await getPublicInstitutionPageData(id);
  if (!data) return {};

  const { institution, programs } = data;
  const title = `${institution.name}: מסלולים ותנאי קבלה`;
  const description = `${programs.length} מסלולי לימוד של ${institution.name} מופיעים בקטלוג MyWay. מידע על המסלולים ובדיקת סיכויי קבלה אישית בחינם; תנאי הקבלה המחייבים באתר המוסד.`;
  return pageMetadata(
    title,
    description,
    `/institutions/${encodeURIComponent(id)}`,
    await isIndexableInstitution(id),
  );
}

export async function buildProgramMetadata(id: string): Promise<Metadata> {
  const data = await getPublicProgramPageData(id);
  if (!data) return {};

  const title =
    (await buildUniqueProgramTitles()).get(canonicalProgramId(id)) ?? programTitle(data);
  const qualifier = title.slice(programTitle(data).length);
  const offering =
    data.institutions.length === 1
      ? `${data.program.name} ${withBet(data.institutions[0].name)}${qualifier}`
      : `${data.program.name} ב-${data.institutions.length} מוסדות לימוד${qualifier}`;
  const description = `${offering}: מידע על המסלול בקטלוג MyWay ובדיקת סיכויי קבלה אישית בחינם. תנאי הקבלה המחייבים באתר המוסד.`;
  return pageMetadata(
    title,
    description,
    canonicalProgramPath(id),
    await isIndexableProgram(canonicalProgramId(id)),
  );
}
