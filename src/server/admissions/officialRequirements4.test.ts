import { describe, expect, it, vi } from 'vitest';
import official from '../../../docs/admissions-verification/2026-10-22-official-requirements-4.json';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import { academicPrograms, allPrograms } from '@/data/degrees';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { serializeProgramRow } from '@/server/catalogue/serializers';
import type {
  AdmissionRequirementRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  SourceUrlRow,
} from '@/db/types';
import { evaluateAdmissionsForProgram } from './evaluator';
import { allowsNoGenericBagrut, allowsNoPsychometric } from '@/lib/calculatorInputRequirements';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms(), meta: {} }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions(), meta: {} }),
}));
import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';

const seed = buildCatalogueSeed();

describe('official four-program catalogue and evaluator integration', () => {
  it.each(Object.entries(official))(
    '%s preserves canonical copy through seed, DB serialization and public display',
    async (pairId, value) => {
      for (const programs of [academicPrograms, allPrograms]) {
        const program = programs.find((program) => program.id === value.program)!;
        expect(program.admissionType).toBe('requirements');
        expect(program.admissionRequirements).toEqual(value.reqs);
        expect(program.institutionDetails).toContainEqual(
          expect.objectContaining({
            specificAdmissionNotes: value.notes,
            englishMinRequirement: value.english,
            quantitativeMinRequirement: value.quant,
            programUrl: value.urls.program,
            officialCalculatorUrl: value.urls.calculator,
          }),
        );
      }
      const requirement = seed.admissionRequirements.find((row) => row.id === pairId)!;
      expect(requirement).toMatchObject({
        admissionRequirements: value.reqs,
        specificAdmissionNotes: value.notes,
        englishMinRequirement: value.english,
        quantitativeMinRequirement: value.quant,
      });
      const serialized = serializeProgramRow({
        program: seed.programs.find((row) => row.id === value.program)! as ProgramRow,
        relations: seed.programInstitutions.filter(
          (row) => row.programId === value.program,
        ) as ProgramInstitutionRow[],
        requirements: [requirement] as AdmissionRequirementRow[],
        thresholds: [],
        sourceUrls: seed.sourceUrls.filter(
          (row) => row.admissionRequirementId === pairId,
        ) as SourceUrlRow[],
        institutionsById: new Map(seed.institutions.map((row) => [row.id, row as InstitutionRow])),
      });
      expect(serialized.admissionRequirements).toEqual(value.reqs);
      expect(serialized.institutionDetails?.[0]).toMatchObject({
        specificAdmissionNotes: value.notes,
        englishMinRequirement: value.english,
        quantitativeMinRequirement: value.quant,
        programUrl: value.urls.program,
        officialCalculatorUrl: value.urls.calculator,
      });
      const page = (await getPublicProgramPageData(value.program))!;
      const source = (await getPublicProgramRequirementSources(page))[value.institution];
      expect(source.requirements).toEqual([...value.reqs, ...value.notes]);
      for (const [key, url] of [
        ['officialUrl', value.urls.program],
        ['officialCalculatorUrl', value.urls.calculator],
      ] as const) {
        const link = new URL(source[key]!);
        expect(link.origin + link.pathname).toBe(new URL(url).origin + new URL(url).pathname);
        expect(link.searchParams.get('utm_source')).toBe('myway');
        expect(link.searchParams.get('utm_medium')).toBe('referral');
      }
    },
  );

  it.each(Object.values(official))(
    'routes $program at low scores through the dedicated policy despite generic institution evidence',
    async (value) => {
      const report = await evaluateAdmissionsForProgram({
        input: {
          degreeId: value.program,
          bagrut: 60,
          psychometric: 400,
          extraInputs: {
            colmanBagrutAverage: 60,
            colmanBagrutCertificateConfirmed: true,
            mathUnits: 5,
            mathGrade: 70,
            psychometricEnglish: 100,
            psychometricMath: 100,
          },
        },
        program: getStaticCataloguePrograms().find((program) => program.id === value.program)!,
        institutions: getStaticCatalogueInstitutions(),
        freshnessStatesBySourceId: new Map(),
      });
      const result = report.results.find(
        (result) => result.linkedInstitutionId === value.institution,
      )!;
      expect(result.decision).toBe('below');
      if (value.institution === 'mta') expect(result.explanation).not.toContain('ראיון');
      expect(result.officialUrls).toContain(
        value.requirements_source === 'https://www.mta.ac.il/conditions_for_applying'
          ? value.requirements_source
          : value.urls.program,
      );
    },
  );

  it('allows Bagrut routes without irrelevant general scores', () => {
    for (const value of Object.values(official))
      expect(allowsNoPsychometric(value.program)).toBe(true);
    for (const program of ['colmgmt_law', 'colmgmt_business'])
      expect(allowsNoGenericBagrut(program)).toBe(true);
  });
  it('keeps law academics and dual-subject interviews as requirements text without evaluating a degree average', () => {
    expect(official['colmgmt_law:colman'].reqs).toContain(
      'מסלול לאקדמאים: ממוצע תואר 80+ וראיון קבלה',
    );
    expect(academicPrograms.find((p) => p.id === 'colmgmt_law')!.admissionRequirements).toContain(
      'משפטים וכלכלה (דו־חוגי): עמידה בתנאי הקבלה האוטומטית וראיון קבלה',
    );
  });
});
