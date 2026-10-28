import type { Metadata } from 'next';
import { cache } from 'react';
import {
  loadPublicCatalogue,
  getPublicInstitutionPageData,
  getPublicProgramPageData,
  type PublicProgramPageData,
} from '@/lib/publicCataloguePages';
import { buildSubjectHubs, getPublicSubjectHub } from '@/lib/publicCatalogueLinks';
import { isIndexableInstitution, isIndexableProgram } from './indexability';
import { SITE_NAME } from '@/lib/site';
import { withBet } from '@/lib/hebrew';
import { canonicalProgramId, canonicalProgramPath } from './programAliases';
import { institutionProgramName } from '@/lib/institutionProgramName';

const TITLE_BUDGET = 62 - ` | ${SITE_NAME}`.length;
const SEARCH_PHRASES = 'תנאי קבלה וסיכויי קבלה';

function cleanName(name: string): string {
  return name
    .replace(/סכם|מתואם|מצרף|composite(?:[- ]score)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wholeWords(text: string, budget: number): string {
  const words = cleanName(text).split(' ');
  while (words.join(' ').length > budget) words.pop();
  return words.join(' ').replace(/[\s:–—,-]+$/, '');
}

function titleCandidates(name: string, provider?: string, category?: string): string[] {
  const shortName = cleanName(name);
  const identity = provider ? `${shortName} – ${cleanName(provider)}` : shortName;
  const names = [...new Set([identity, shortName])];
  const phrases = [SEARCH_PHRASES, 'תנאי קבלה', 'סיכויי קבלה', ''];
  const candidates = phrases.flatMap((phrase) =>
    names.map((label) => (phrase ? `${label}: ${phrase}` : label)),
  );
  // Keep source category disambiguation before shortening otherwise identical records.
  if (category) {
    candidates.push(
      ...phrases.map(
        (phrase) =>
          `${identity}: מסלול ${withBet(cleanName(category))}${phrase ? `, ${phrase}` : ''}`,
      ),
    );
  }
  candidates.push(
    ...phrases.flatMap((phrase) => {
      const suffix = phrase ? `: ${phrase}` : '';
      return names.map((label) => `${wholeWords(label, TITLE_BUDGET - suffix.length)}${suffix}`);
    }),
  );
  return [...new Set(candidates.filter((title) => title && title.length <= TITLE_BUDGET))];
}

function programIdentity({
  program,
  institutions,
  isGeneral,
}: Pick<PublicProgramPageData, 'program' | 'institutions' | 'isGeneral'>) {
  const singleProvider = !isGeneral && institutions.length === 1;
  return {
    name: singleProvider
      ? institutionProgramName(program, institutions[0])
      : `לימודי ${program.name}`,
    provider: singleProvider ? institutions[0].name : undefined,
    category: program.category,
  };
}

let lastTitles: { identity: string; titles: Map<string, string> } | undefined;

const buildUniqueTitles = cache(async () => {
  const catalogue = await loadPublicCatalogue();
  // Bound the process cache to one public catalogue; live title inputs invalidate it.
  const identity = JSON.stringify([
    catalogue.programs.map((program) => [
      program.id,
      program.name,
      program.institution,
      program.institutionId,
      program.category,
      program.type,
      program.isListed,
      program.linkedInstitutionIds,
    ]),
    catalogue.institutions.map((institution) => [institution.id, institution.name]),
    [...catalogue.generalProgramIds],
  ]);
  if (lastTitles?.identity === identity) return lastTitles.titles;
  const entries = catalogue.programs
    .filter(
      (program) =>
        canonicalProgramId(program.id) === program.id &&
        !program.id.startsWith('mon_') &&
        program.isListed !== false,
    )
    .map((program) => {
      const identity = programIdentity({
        program,
        isGeneral: catalogue.generalProgramIds.has(program.id),
        institutions: catalogue.institutions.filter((institution) =>
          program.linkedInstitutionIds.includes(institution.id),
        ),
      });
      return {
        key: `program:${program.id}`,
        candidates: titleCandidates(identity.name, identity.provider, identity.category),
      };
    });
  entries.push(
    ...catalogue.institutions.map((institution) => ({
      key: `institution:${institution.id}`,
      candidates: titleCandidates(institution.name),
    })),
  );
  entries.push(
    ...buildSubjectHubs(catalogue)
      .publishedHubs.filter((hub) => !catalogue.programs.some((program) => program.id === hub.id))
      .map((hub) => ({
        key: `program:${hub.id}`,
        candidates: titleCandidates(`לימודי ${hub.name}`, undefined, hub.category),
      })),
  );

  const counts = new Map<string, number>();
  for (const { candidates } of entries)
    for (const title of candidates) counts.set(title, (counts.get(title) ?? 0) + 1);
  const titles = new Map<string, string>();
  const used = new Set<string>();
  for (const { key, candidates } of entries) {
    const title =
      candidates.find((candidate) => counts.get(candidate) === 1 && !used.has(candidate)) ??
      candidates.find((candidate) => !used.has(candidate));
    if (!title) throw new Error(`No distinct SEO title for ${key}`);
    titles.set(key, title);
    used.add(title);
  }
  lastTitles = { identity, titles };
  return titles;
});

function descriptionFor(offering: string): string {
  const name = cleanName(offering);
  const endings = [
    ': תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay. התנאים המחייבים באתר המוסד.',
    ': תנאי קבלה ובדיקת סיכויי קבלה בחינם ב-MyWay.',
    ': תנאי קבלה וסיכויי קבלה.',
  ];
  return (
    endings.map((ending) => `${name}${ending}`).find((description) => description.length <= 160) ??
    `${wholeWords(name, 160 - endings[2].length)}${endings[2]}`
  );
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
  const title =
    (await buildUniqueTitles()).get(`institution:${id}`) ?? titleCandidates(institution.name)[0];
  return pageMetadata(
    title,
    descriptionFor(`${programs.length} מסלולי לימוד של ${institution.name}`),
    `/institutions/${encodeURIComponent(id)}`,
    await isIndexableInstitution(id),
  );
}

export async function buildProgramMetadata(id: string): Promise<Metadata> {
  const data = await getPublicProgramPageData(id);
  if (!data) {
    const subject = await getPublicSubjectHub(id);
    if (!subject) return {};
    const title =
      (await buildUniqueTitles()).get(`program:${id}`) ??
      titleCandidates(`לימודי ${subject.hub.name}`)[0];
    return pageMetadata(
      title,
      descriptionFor(`לימודי ${subject.hub.name} ב-${subject.hub.programLinks} מסלולי לימוד`),
      `/programs/${encodeURIComponent(subject.hub.id)}`,
      subject.hub.programLinks > 0,
    );
  }
  const identity = programIdentity(data);
  const title =
    (await buildUniqueTitles()).get(`program:${canonicalProgramId(id)}`) ??
    titleCandidates(identity.name, identity.provider, identity.category)[0];
  const name =
    !data.isGeneral && data.institutions.length === 1
      ? institutionProgramName(data.program, data.institutions[0])
      : data.program.name;
  const offering =
    data.institutions.length === 1
      ? `${name} ${withBet(data.institutions[0].name)}`
      : `${name} ב-${data.institutions.length} מוסדות לימוד`;
  const catalogue = await loadPublicCatalogue();
  const hasCollision = catalogue.programs.some(
    (program) =>
      program.id !== canonicalProgramId(id) &&
      canonicalProgramId(program.id) === program.id &&
      program.isListed !== false &&
      program.name === data.program.name &&
      program.institutionId === data.program.institutionId &&
      program.category !== data.program.category,
  );
  return pageMetadata(
    title,
    descriptionFor(`${offering}${hasCollision ? `, מסלול ${withBet(data.program.category)}` : ''}`),
    canonicalProgramPath(id),
    await isIndexableProgram(canonicalProgramId(id)),
  );
}
