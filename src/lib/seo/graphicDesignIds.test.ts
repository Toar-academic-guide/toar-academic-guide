import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../../../next.config';
import { allPrograms, programsWithLegacyAdmissionFacts } from '@/data/degrees';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import repair from '@/data/admissions/catalogueContentRepair.json';
import { getRequirementsChecked } from '@/lib/requirementsChecked';
import { evaluateBatchBManualPath } from '@/server/admissions/batchBManualPathEvaluation';
import { canonicalProgramId } from './programAliases';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import {
  getPublicInstitutionPageData,
  getPublicProgramPageData,
  loadPublicCatalogue,
  subjectProgramPages,
} from '@/lib/publicCataloguePages';
import {
  buildSubjectHubs,
  getPublicBrowseLinks,
  getPublicRelatedPrograms,
} from '@/lib/publicCatalogueLinks';
import sitemap from '@/app/sitemap';
import { institutionLd, programLd } from './jsonLd';

const redirects = [
  ['jerusalem_academy_graphic_design', '/programs/jerusalem_academy_dance'],
  ['rubin_graphic_design', '/programs/rubin_classical'],
  ['spieldocs_graphic_design', '/institutions/spieldocs'],
  ['samspiegel_documentary', '/institutions/spieldocs'],
  ['documentary', '/programs/cinema'],
] as const;
const corrected = [
  ['jerusalem_academy_dance', 'jerusalem_academy', 'תואר ראשון במחול', 'B.Dance'],
  ['rubin_classical', 'rubin', 'תואר ראשון במוזיקה', 'B.Mus.'],
] as const;

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

describe('verified dance, TAU music and Sam Spiegel identities', () => {
  it.each(redirects)(
    '308 redirects %s before catalogue or auth access',
    async (id, destination) => {
      const response = await unstable_getResponseFromNextConfig({
        url: `https://findmyway.co.il/programs/${id}?ref=saved`,
        nextConfig,
      });
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(
        `https://findmyway.co.il${destination}?ref=saved`,
      );
    },
  );

  it('keeps cinema as a published hub with a real programme for documentary visitors', async () => {
    const catalogue = await loadPublicCatalogue();
    const cinema = buildSubjectHubs(catalogue).publishedHubs.find((hub) => hub.id === 'cinema');
    expect(cinema?.programs.map((program) => program.id)).toContain('samspiegel_cinema');
    expect(cinema?.programLinks).toBeGreaterThan(0);
    expect((await sitemap()).map((row) => row.url)).toContain(
      'https://findmyway.co.il/programs/cinema',
    );
  });

  it('removes the retired records and documentary hub from the active source catalogue', () => {
    for (const [id] of redirects) expect(allPrograms.map((p) => p.id)).not.toContain(id);
    expect(allPrograms.filter((p) => p.institutionId === 'rubin').map((p) => p.id)).toEqual([
      'rubin_classical',
    ]);
    expect(allPrograms.find((p) => p.id === 'samspiegel_documentary')).toBeUndefined();
  });

  it.each(corrected)(
    '%s carries the official identity and four-year credential',
    async (id, institutionId, name, credential) => {
      const program = allPrograms.find((p) => p.id === id);
      expect(program).toMatchObject({
        name,
        type: 'academic',
        institutionId,
        awardedCredential: credential,
      });
      expect(program?.institutionDetails?.[0]).toMatchObject({ durationYears: 4 });
      const original = programsWithLegacyAdmissionFacts.find((p) => p.id === id)!;
      const entry = repair.requirements.find((row) => row.programId === id)!;
      expect(original.institutionDetails?.[0].specificAdmissionNotes).toEqual(entry.notes);
      expect(program?.institutionDetails?.[0].specificAdmissionNotes).toEqual(entry.notes);
      expect(getRequirementsChecked(id, { id: institutionId }, entry.notes)).toMatchObject({
        date: '24.10.2026',
      });
      const page = (await getPublicProgramPageData(id))!;
      expect(await programLd(page)).toMatchObject({
        timeToComplete: 'P48M',
        educationalCredentialAwarded: credential,
      });
    },
  );

  it('keeps dance audition-only for absent, weak and strong scores', () => {
    const program = allPrograms.find((p) => p.id === 'jerusalem_academy_dance')!;
    expect(program).toBeDefined();
    expect(program.admissionType).toBe('requirements');
    expect(program.thresholds).toBeUndefined();
    expect(program.minimumPsychometric).toBeUndefined();
    expect(program.minimumBagrut).toBeUndefined();
    expect(
      program.institutionDetails
        ?.flatMap((d) => d.admissionFacts ?? [])
        .some((f) => f.kind === 'numeric_gate'),
    ).toBe(false);
    for (const scores of [
      {},
      { bagrut: 60, psychometric: 200 },
      { bagrut: 120, psychometric: 800 },
    ]) {
      const result = evaluateBatchBManualPath({
        input: { degreeId: program.id, ...scores },
        institution: getStaticCatalogueInstitutions().find((i) => i.id === 'jerusalem_academy')!,
      });
      expect(result).toMatchObject({
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision: 'eligible_to_apply',
      });
      expect(result?.explanation).toContain('אודישן');
      expect(result?.threshold).toBeUndefined();
      expect(result?.scoreAssessment).toBeUndefined();
    }
    expect(canonicalProgramId('jerusalem_academy_graphic_design')).toBe('jerusalem_academy_dance');
    expect(canonicalProgramId('rubin_graphic_design')).toBe('rubin_classical');
  });

  it('uses the official Sam Spiegel website in catalogue and institution schema', async () => {
    const page = (await getPublicInstitutionPageData('spieldocs'))!;
    expect(page.institution.domain).toBe('www.jsfs.co.il');
    expect(page.institution.programUrl).toBe('https://www.jsfs.co.il');
    expect(institutionLd(page).sameAs).toBe('https://www.jsfs.co.il/');
  });

  it('omits retired paths from sitemap, hubs, subject links, browse, related programmes and institution OfferCatalogs', async () => {
    const catalogue = await loadPublicCatalogue();
    const hubs = buildSubjectHubs(catalogue);
    const browse = await getPublicBrowseLinks();
    const discovery: unknown[] = [(await sitemap()).map((row) => row.url), hubs, browse];
    for (const program of catalogue.programs) {
      discovery.push([...subjectProgramPages(catalogue, program).values()].map((p) => p.id));
      discovery.push(await getPublicRelatedPrograms(program.id));
    }
    for (const id of ['jerusalem_academy', 'rubin', 'spieldocs']) {
      const page = (await getPublicInstitutionPageData(id))!;
      discovery.push(
        page.programs.map((p) => p.id),
        institutionLd(page),
      );
    }
    const json = JSON.stringify(discovery);
    for (const [id] of redirects) expect(json).not.toContain(id);
    const urls = (await sitemap()).map((row) => row.url);
    for (const [id] of corrected) expect(urls).toContain(`https://findmyway.co.il/programs/${id}`);
  });
});
