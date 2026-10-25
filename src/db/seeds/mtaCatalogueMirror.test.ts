import { describe, expect, it, vi } from 'vitest';
import official from '../../../docs/admissions-verification/2026-10-23-mta-catalogue-nursing-business.json';
import { academicPrograms, allPrograms } from '@/data/degrees';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import type {
  AdmissionRequirementRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  SourceUrlRow,
} from '@/db/types';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { selectRequirementTiles } from '@/lib/requirementTiles';
import { journeyRows, studyFields } from '@/lib/studyJourney';
import { serializeProgramRow } from '@/server/catalogue/serializers';

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

describe('MTA nursing and economics-management official catalogue mirror', () => {
  it('uses the economics-management name in calculator and saved rows without renaming the field', () => {
    const fields = studyFields(getStaticCataloguePrograms());
    const rows = journeyRows(fields, getStaticCatalogueInstitutions());
    const mta = rows.find((row) => row.program.id === 'tlvyaffo_business')!;
    expect(mta.id).toBe('tlvyaffo_business:mta');
    expect(mta.fieldId).toBe('business');
    expect(mta.fieldName).toBe(official['tlvyaffo_business:mta'].display_name);
    expect(fields.find((field) => field.id === mta.fieldId)?.name).toBe('מנהל עסקים');
    expect(rows.find((row) => row.program.id === 'colmgmt_business')?.fieldName).toBe('מנהל עסקים');
  });

  it.each(Object.entries(official))(
    '%s preserves canonical copy, name and links through seed, serialization and display',
    async (pairId, value) => {
      for (const programs of [academicPrograms, allPrograms]) {
        const program = programs.find((entry) => entry.id === value.program)!;
        expect(program.name).toBe(value.display_name);
        expect(program.admissionRequirements).toEqual(value.reqs);
        expect(program.institutionDetails).toContainEqual(
          expect.objectContaining({
            englishMinRequirement: value.english,
            quantitativeMinRequirement: value.quant,
            specificAdmissionNotes: value.notes,
            programUrl: value.urls.program,
            officialCalculatorUrl: value.urls.calculator,
            calculatorUrl: value.urls.calculator,
          }),
        );
      }
      const program = seed.programs.find((entry) => entry.id === value.program)!;
      expect(program.name).toBe(value.display_name);
      const requirement = seed.admissionRequirements.find((entry) => entry.id === pairId)!;
      expect(requirement).toMatchObject({
        admissionRequirements: value.reqs,
        specificAdmissionNotes: value.notes,
        englishMinRequirement: value.english,
        quantitativeMinRequirement: value.quant,
      });
      const sourceUrls = seed.sourceUrls.filter((entry) => entry.admissionRequirementId === pairId);
      expect(Object.fromEntries(sourceUrls.map((entry) => [entry.kind, entry.url]))).toEqual(
        value.urls,
      );
      const serialized = serializeProgramRow({
        program: program as ProgramRow,
        relations: seed.programInstitutions.filter(
          (entry) => entry.programId === value.program,
        ) as ProgramInstitutionRow[],
        requirements: [requirement] as AdmissionRequirementRow[],
        thresholds: [],
        sourceUrls: sourceUrls as SourceUrlRow[],
        institutionsById: new Map(
          seed.institutions.map((entry) => [entry.id, entry as InstitutionRow]),
        ),
      });
      expect(serialized.name).toBe(value.display_name);
      expect(serialized.admissionRequirements).toEqual(value.reqs);
      expect(serialized.institutionDetails?.[0]).toMatchObject({
        englishMinRequirement: value.english,
        specificAdmissionNotes: value.notes,
        programUrl: value.urls.program,
        officialCalculatorUrl: value.urls.calculator,
        calculatorUrl: value.urls.calculator,
      });
      const page = (await getPublicProgramPageData(value.program))!;
      expect(page.program.name).toBe(value.display_name);
      const source = (await getPublicProgramRequirementSources(page))[value.institution];
      expect(source.requirements).toEqual([...value.reqs, ...value.notes]);
      for (const [key, expectedUrl] of [
        ['officialUrl', value.urls.program],
        ['officialCalculatorUrl', value.urls.calculator],
      ] as const) {
        const link = new URL(source[key]!);
        expect(link.searchParams.get('utm_source')).toBe('myway');
        expect(link.searchParams.get('utm_medium')).toBe('referral');
        link.searchParams.delete('utm_source');
        link.searchParams.delete('utm_medium');
        expect(link.href).toBe(expectedUrl);
      }
      for (const program of [page.program, serialized]) {
        expect(
          selectRequirementTiles({
            program,
            institutionId: value.institution,
            requirements: source.requirements,
            now: new Date('2026-10-23T12:00:00Z'),
          }).model,
        ).toBeUndefined();
      }
    },
  );
});
