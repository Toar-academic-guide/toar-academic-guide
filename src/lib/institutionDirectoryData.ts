import 'server-only';
import type { CatalogueInstitution } from '@/types/catalogue';
import { canonicalInstitutionId } from '@/data/institutionAliases';
import {
  getInstitutionDirectoryItems,
  publicDirectoryInstitutionId,
  type DirectoryInstitution,
} from '@/data/institutionDirectory';
import fieldEvidence from '@/data/institutionFieldSources.json';
import {
  officialDirectorySubject,
  directoryField,
  directorySubject,
  type DirectorySubject,
} from '@/data/institutionSubjects';
import { institutionLink } from '@/lib/institutionLinks';
import { institutionProgramName } from '@/lib/institutionProgramName';
import {
  additionalPublicInstitutionProgrammes,
  directoryProviderRecord,
  loadPublicCatalogue,
  publicInstitutionPrograms,
} from '@/lib/publicCataloguePages';

const fieldSources: Readonly<Record<string, Readonly<Record<string, string>>>> = fieldEvidence;
const collator = new Intl.Collator('he');
const QUALIFICATIONS = {
  academic: 'תואר אקדמי',
  certificate: 'תעודה',
  vocational: 'הכשרה מקצועית',
  'short-course': 'קורס קצר',
  course: 'קורס',
};

export async function getPublicInstitutionDirectoryData() {
  const catalogue = await loadPublicCatalogue();
  const institutions = new Map<string, DirectoryInstitution>();
  const subjects = new Map<string, DirectorySubject>();

  for (const item of getInstitutionDirectoryItems()) {
    const id = canonicalInstitutionId(item.id);

    const {
      name,
      type,
      funding,
      location,
      diplomaType,
      sourceUrl,
      domain,
      logoUrl,
      areas,
      categories,
      credentials,
    } = item;
    const previous = institutions.get(id);
    if (previous) {
      for (const area of areas) if (!previous.areas.includes(area)) previous.areas.push(area);
      continue;
    }
    institutions.set(id, {
      id,
      name,
      type,
      funding,
      location,
      diplomaType,
      sourceUrl: institutionLink(sourceUrl) ?? null,
      domain,
      logoUrl,
      areas,
      categories,
      credentials,
      fieldSources: { ...fieldSources[id] },
      programmes: [],
    });
  }

  const providers = new Map<string, CatalogueInstitution>(
    catalogue.institutions.map((provider) => [provider.id, provider]),
  );
  const rendered = new Set<string>();
  for (const source of [
    ...catalogue.institutions,
    ...[...institutions.values()]
      .filter((row) => !providers.has(row.id))
      .map(directoryProviderRecord),
  ]) {
    const id = publicDirectoryInstitutionId(source.id);
    if (!id || rendered.has(id)) continue;
    rendered.add(id);
    const institution = providers.get(id) ?? source;
    const programmes = publicInstitutionPrograms(catalogue, institution);
    if (!institutions.has(id)) {
      if (!programmes.length && !institutionLink(institution.programUrl, id)) continue;
      institutions.set(id, {
        id,
        name: institution.name,
        type: null,
        funding: null,
        location:
          institution.region === 'any'
            ? null
            : ({ north: 'צפון', center: 'מרכז', south: 'דרום', jerusalem: 'ירושלים' }[
                institution.region
              ] ?? null),
        diplomaType: null,
        sourceUrl: institutionLink(institution.programUrl, id) ?? null,
        domain: institution.domain ?? null,
        logoUrl: institution.logoUrl ?? null,
        areas: institution.region === 'any' ? [] : [institution.region],
        categories: [],
        credentials: [],
        fieldSources: { ...fieldSources[id] },
        programmes: [],
      });
    }
    const item = institutions.get(id);
    if (!item) continue;
    const offerings = [
      ...programmes.map((programme) => {
        const owner = programme.institutionId ? providers.get(programme.institutionId) : undefined;
        const name = institutionProgramName(programme, owner ?? institution);
        return {
          id: programme.id,
          name,
          type: programme.type,
          category: programme.category,
          href: `/programs/${encodeURIComponent(programme.id)}`,
        };
      }),
      ...additionalPublicInstitutionProgrammes(institution, programmes).map((p) => ({
        ...p,
        href: p.url,
      })),
    ];
    item.programmes = offerings
      .map((programme) => {
        const subject =
          'fieldKey' in programme
            ? officialDirectorySubject(programme.name, programme.type, programme.fieldKey)
            : directorySubject(programme, programme.name);
        const previous = subjects.get(subject.key);
        if (previous && previous.field.key !== subject.field.key)
          throw new Error(`Conflicting directory fields for ${subject.key}`);
        subjects.set(subject.key, subject);
        return {
          id: programme.id,
          name: programme.name,
          href: programme.href,
          subjectKey: subject.key,
          fieldKey: subject.field.key,
        };
      })
      .sort((a, b) => collator.compare(a.name, b.name));
  }

  const labels = new Map<string, number>();
  for (const subject of subjects.values())
    labels.set(subject.label, (labels.get(subject.label) ?? 0) + 1);
  const options = [...subjects.values()]
    .map((subject) => ({
      ...subject,
      label:
        (labels.get(subject.label) ?? 0) > 1
          ? `${subject.label} (${QUALIFICATIONS[subject.type]})`
          : subject.label,
    }))
    .sort((a, b) => collator.compare(a.label, b.label));
  const fieldKeys = new Set(options.map((subject) => subject.field.key));
  for (const institution of institutions.values()) {
    for (const field of Object.keys(institution.fieldSources)) fieldKeys.add(field);
  }
  const fields = [...fieldKeys]
    .map(directoryField)
    .sort((a, b) => collator.compare(a.label, b.label));
  return {
    institutions: [...institutions.values()].sort((a, b) => collator.compare(a.name, b.name)),
    subjects: options,
    fields,
  };
}
