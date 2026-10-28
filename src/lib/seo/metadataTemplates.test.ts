import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metadata } from 'next';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import { buildSubjectHubs } from '@/lib/publicCatalogueLinks';
import { generateMetadata } from '@/app/programs/[programId]/page';
import { buildInstitutionMetadata, buildProgramMetadata } from './metadata';
import { canonicalProgramId } from './programAliases';
import { indexableInstitutionIds, indexableProgramIds } from './indexability';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(listCataloguePrograms).mockResolvedValue({
    data: getStaticCataloguePrograms(),
    meta: {},
  });
  vi.mocked(listCatalogueInstitutions).mockResolvedValue({
    data: getStaticCatalogueInstitutions(),
    meta: {},
  });
});

function assertLimits(metadata: Metadata, canonical: string) {
  expect(typeof metadata.title).toBe('string');
  expect(`${metadata.title} | MyWay`.length).toBeLessThanOrEqual(60);
  expect(metadata.description).toBeTruthy();
  expect(metadata.description!.length).toBeLessThanOrEqual(160);
  for (const text of [metadata.title, metadata.description]) {
    expect(text).not.toMatch(/סכם|מתואם|מצרף|composite/i);
    expect(text).not.toMatch(/\.\.\.|…|\s[-–:,]$/);
  }
  expect(metadata.alternates).toEqual({ canonical });
  expect(metadata.openGraph).toMatchObject({
    title: metadata.title,
    description: metadata.description,
    url: canonical,
  });
}

describe('admission search templates', () => {
  it('includes program, provider and both search phrases when they fit', async () => {
    const metadata = await buildProgramMetadata('tau_law');
    for (const phrase of ['משפטים', 'אוניברסיטת תל אביב', 'תנאי קבלה', 'סיכויי קבלה']) {
      expect(metadata.title).toContain(phrase);
    }
    assertLimits(metadata, '/programs/tau_law');
  });

  it('includes the institution and both search phrases', async () => {
    const metadata = await buildInstitutionMetadata('tau');
    for (const phrase of ['אוניברסיטת תל אביב', 'תנאי קבלה', 'סיכויי קבלה']) {
      expect(metadata.title).toContain(phrase);
    }
    assertLimits(metadata, '/institutions/tau');
  });

  it('uses both search phrases on general programs and generated hubs', async () => {
    const catalogue = await loadPublicCatalogue();
    const generated = buildSubjectHubs(catalogue).publishedHubs.find(
      (hub) => !catalogue.programs.some((program) => program.id === hub.id) && hub.name.length < 20,
    )!;
    expect(generated).toBeDefined();
    for (const id of ['cs', generated.id]) {
      const metadata = await generateMetadata({ params: Promise.resolve({ programId: id }) });
      expect(metadata.title).toContain('תנאי קבלה');
      expect(metadata.title).toContain('סיכויי קבלה');
      assertLimits(metadata, `/programs/${encodeURIComponent(id)}`);
    }
  });

  it('shortens a long provider while retaining a unique program title', async () => {
    const institutions = getStaticCatalogueInstitutions().map((institution) =>
      institution.id === 'tau'
        ? { ...institution, name: 'אוניברסיטת תל אביב ללימודים מתקדמים ולמחקר במדעים ובאמנויות' }
        : institution,
    );
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({ data: institutions, meta: {} });
    const metadata = await buildProgramMetadata('tau_cs');
    expect(metadata.title).toContain('מדעי המחשב');
    expect(metadata.title).not.toContain(
      institutions.find((institution) => institution.id === 'tau')!.name,
    );
    expect(metadata.title).not.toBe((await buildProgramMetadata('bgu_cs')).title);
    assertLimits(metadata, '/programs/tau_cs');
  });

  it('shortens an overlong program name at a word boundary', async () => {
    const original = getStaticCataloguePrograms().find((program) => program.id === 'tau_law')!;
    const name = 'לימודי משפטים ומדיניות ציבורית בינלאומית במסגרת לימודים משולבים עם מחקר מתקדם';
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [
        ...getStaticCataloguePrograms().filter((program) => program.id !== original.id),
        { ...original, name },
      ],
      meta: {},
    });
    const metadata = await buildProgramMetadata(original.id);
    expect(metadata.title).toMatch(/^לימודי משפטים/);
    const titleName = String(metadata.title).split(/[:–]/)[0].trim();
    expect(name === titleName || name.startsWith(`${titleName} `)).toBe(true);
    assertLimits(metadata, '/programs/tau_law');
  });

  it('shortens an overlong institution name at a word boundary', async () => {
    const name = 'המכללה האקדמית ללימודים מתקדמים בתחומי המדעים והאמנויות והמחקר הבינלאומי';
    vi.mocked(listCatalogueInstitutions).mockResolvedValue({
      data: getStaticCatalogueInstitutions().map((institution) =>
        institution.id === 'tau' ? { ...institution, name } : institution,
      ),
      meta: {},
    });
    const metadata = await buildInstitutionMetadata('tau');
    expect(metadata.title).toMatch(/^המכללה האקדמית/);
    expect(name.startsWith(`${String(metadata.title).split(':')[0]} `)).toBe(true);
    assertLimits(metadata, '/institutions/tau');
  });

  it('keeps metadata safe, bounded and canonical across the entire catalogue and generated hubs', async () => {
    const catalogue = await loadPublicCatalogue();
    for (const { id } of catalogue.programs) {
      assertLimits(
        await buildProgramMetadata(id),
        `/programs/${encodeURIComponent(canonicalProgramId(id))}`,
      );
    }
    for (const { id } of catalogue.institutions) {
      assertLimits(await buildInstitutionMetadata(id), `/institutions/${encodeURIComponent(id)}`);
    }
    for (const { id } of buildSubjectHubs(catalogue).publishedHubs) {
      assertLimits(
        await generateMetadata({ params: Promise.resolve({ programId: id }) }),
        `/programs/${encodeURIComponent(id)}`,
      );
    }
  }, 60_000);

  it('keeps final titles and descriptions unique after shortening, including generated hubs', async () => {
    const catalogue = await loadPublicCatalogue();
    const programIds = await indexableProgramIds(catalogue);
    const institutionIds = await indexableInstitutionIds(catalogue);
    const generated = buildSubjectHubs(catalogue).publishedHubs.filter(
      (hub) => !catalogue.programs.some((program) => program.id === hub.id),
    );
    const metadata = [
      ...(await Promise.all(programIds.map(buildProgramMetadata))),
      ...(await Promise.all(institutionIds.map(buildInstitutionMetadata))),
      ...(await Promise.all(
        generated.map(({ id }) => generateMetadata({ params: Promise.resolve({ programId: id }) })),
      )),
    ];
    const titles = metadata.map((item) => `${item.title} | MyWay`);
    expect(new Set(titles).size).toBe(titles.length);
    const descriptions = metadata.map((item) => item.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  }, 60_000);
});
