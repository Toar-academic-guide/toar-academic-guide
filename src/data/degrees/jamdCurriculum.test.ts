import { describe, expect, it, vi } from 'vitest';
import { allPrograms } from '@/data/degrees';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { serializeInstitutionRow, serializeProgramRow } from '@/server/catalogue/serializers';
import type {
  AdmissionRequirementRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  SourceUrlRow,
  AdmissionsSourceCandidateRow,
} from '@/db/types';
import { renderToStaticMarkup } from 'react-dom/server';
import ProgramPage from '@/app/programs/[programId]/page';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));

const ids = ['jerusalem_academy_classical', 'jerusalem_academy_jazz', 'jerusalem_academy_dance'];

describe('official JAMD curriculum', () => {
  it.each(ids)('%s lasts four degree years with unknown overall credits', async (id) => {
    const program = allPrograms.find((p) => p.id === id)!;
    const detail = program.institutionDetails![0];
    expect(detail.durationYears).toBe(4);
    expect(detail.creditPoints).toBeNull();
    expect(program.awardedCredential).toBe(id.endsWith('_dance') ? 'B.Dance' : 'B.Mus.');
    const html = renderToStaticMarkup(
      await ProgramPage({ params: Promise.resolve({ programId: id }) }),
    );
    expect(html).toContain('P48M');
    expect(html).not.toMatch(/(?:0|null|undefined) (?:נ״ז|נקודות זכות)/);
    expect(html).not.toContain('P60M');
  });

  it('scopes verified 160-credit totals to four departments and keeps other totals null', () => {
    const detail = allPrograms.find((p) => p.id === 'jerusalem_academy_classical')!
      .institutionDetails![0];
    expect(detail.departmentCredits?.map((d) => [d.id, d.creditPoints])).toEqual([
      ['keyboard', 160],
      ['wind_percussion', 160],
      ['vocal', 160],
      ['composition', 160],
      ['strings', null],
      ['theory', null],
      ['eastern_music', null],
      ['cross_disciplinary_performance', null],
    ]);
    const jazz = allPrograms.find((p) => p.id === 'jerusalem_academy_jazz')!.institutionDetails![0];
    expect(jazz.departmentCredits?.map((d) => [d.id, d.creditPoints])).toEqual([['jazz', null]]);
    expect(detail.programDescription).toContain('160 נקודות זכות');
    expect(detail.programDescription).toContain('קומפוזיציה רב־תחומית');
    expect(jazz.programDescription).not.toMatch(/160|0 נקודות/);
    const dance = allPrograms.find((p) => p.id === 'jerusalem_academy_dance')!
      .institutionDetails![0];
    expect(dance.programDescription).not.toContain('160');
    expect(dance.programDescription).toContain('בשנה החמישית');
  });

  it.each(ids)('corrects stale DB curriculum for %s without publishing a guessed total', (id) => {
    const seed = buildCatalogueSeed();
    const result = serializeProgramRow({
      program: seed.programs.find((p) => p.id === id)! as ProgramRow,
      relations: seed.programInstitutions.filter(
        (p) => p.programId === id,
      ) as ProgramInstitutionRow[],
      requirements: seed.admissionRequirements
        .filter((r) => r.programId === id)
        .map((r) => ({ ...r, durationYears: 3 })) as AdmissionRequirementRow[],
      thresholds: [],
      sourceUrls: [],
      institutionsById: new Map(seed.institutions.map((i) => [i.id, i as InstitutionRow])),
    });
    expect(result.institutionDetails![0]).toMatchObject({ durationYears: 4, creditPoints: null });
    expect(result.institutionDetails![0].departmentCredits).toEqual(
      allPrograms.find((p) => p.id === id)!.institutionDetails![0].departmentCredits,
    );
  });
});

describe('Sam Spiegel official URLs throughout catalogue output', () => {
  it('removes the dead domain from persisted institution and programme output', () => {
    const seed = buildCatalogueSeed();
    const row = seed.institutions.find((i) => i.id === 'spieldocs')! as InstitutionRow;
    const institution = serializeInstitutionRow({
      ...row,
      domain: 'spieldocs.ac.il',
      programUrl: 'https://www.spieldocs.ac.il/',
      calculatorUrl: 'https://spieldocs.ac.il/registration',
    });
    const id = 'samspiegel_cinema';
    const requirement = seed.admissionRequirements.find((r) => r.programId === id)!;
    const program = serializeProgramRow({
      program: seed.programs.find((p) => p.id === id)! as ProgramRow,
      relations: seed.programInstitutions.filter(
        (p) => p.programId === id,
      ) as ProgramInstitutionRow[],
      requirements: [requirement] as AdmissionRequirementRow[],
      thresholds: [],
      sourceUrls: [
        {
          admissionRequirementId: requirement.id,
          kind: 'program',
          url: 'https://www.spieldocs.ac.il/main-program',
        },
        {
          admissionRequirementId: requirement.id,
          kind: 'calculator',
          url: 'https://spieldocs.ac.il/registration',
        },
      ] as SourceUrlRow[],
      admissionsSourceCandidates: [
        {
          id: 'old',
          admissionRequirementId: requirement.id,
          url: 'https://spieldocs.ac.il/registration',
        },
      ] as AdmissionsSourceCandidateRow[],
      institutionsById: new Map([['spieldocs', row]]),
    });
    const output = JSON.stringify({
      institution,
      program,
      programs: getStaticCataloguePrograms(),
      institutions: getStaticCatalogueInstitutions(),
    });
    expect(output).not.toContain('spieldocs.ac.il');
    expect(program.institutionDetails![0].programUrl).toBe('https://www.jsfs.co.il/main-program');
    expect(program.institutionDetails![0].admissionsSourceCandidates![0].url).toBe(
      'https://www.jsfs.co.il/registration',
    );
  });
});
