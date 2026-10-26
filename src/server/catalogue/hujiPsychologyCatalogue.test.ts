import { describe, expect, it, vi } from 'vitest';
import { allPrograms, programsWithLegacyAdmissionFacts } from '@/data/degrees';
import { applyCatalogueContentRepair } from '@/data/admissions/catalogueContentRepair';
import repair from '@/data/admissions/catalogueContentRepair.json';
import { getRequirementsChecked } from '@/lib/requirementsChecked';
import { buildCatalogueSeed } from '@/db/seeds/catalogueSeed';
import type {
  AdmissionFactRow,
  AdmissionRequirementRow,
  AdmissionThresholdRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
} from '@/db/types';
import { serializeInstitutionRow, serializeProgramRow } from './serializers';

vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

describe('HUJI psychology catalogue correction', () => {
  it.each(['huji_psychology', 'psychology'])('sets the static %s direct route to 725', (id) => {
    expect(allPrograms.find((row) => row.id === id)!.directPsychometric?.huji).toBe(725);
  });

  it.each(['huji_psychology', 'psychology'])(
    'omits sekem and internal verification wording from %s HUJI student copy',
    async (id) => {
      const seed = buildCatalogueSeed();
      const institutions = seed.institutions.map((row) =>
        serializeInstitutionRow(row as InstitutionRow),
      );
      const programs = ['huji_psychology', 'psychology'].map((programId) =>
        serializeProgramRow({
          program: seed.programs.find((row) => row.id === programId)! as ProgramRow,
          relations: seed.programInstitutions.filter(
            (row) => row.programId === programId,
          ) as ProgramInstitutionRow[],
          requirements: seed.admissionRequirements.filter(
            (row) => row.programId === programId && row.institutionId === 'huji',
          ) as AdmissionRequirementRow[],
          thresholds: seed.admissionThresholds.filter(
            (row) => row.programId === programId,
          ) as AdmissionThresholdRow[],
          sourceUrls: [],
          institutionsById: new Map(
            seed.institutions.map((row) => [row.id, row as InstitutionRow]),
          ),
        }),
      );
      const { listCataloguePrograms, listCatalogueInstitutions } =
        await import('@/server/catalogue/queries');
      vi.mocked(listCataloguePrograms).mockResolvedValue({ data: programs, meta: {} });
      vi.mocked(listCatalogueInstitutions).mockResolvedValue({ data: institutions, meta: {} });
      const { getPublicProgramPageData, getPublicProgramRequirementSources } =
        await import('@/lib/publicCataloguePages');
      const page = await getPublicProgramPageData(id);
      expect(page).not.toBeNull();
      const source = (await getPublicProgramRequirementSources(page!)).huji;
      expect(source.sourceProgramId).toBe('huji_psychology');
      const detail = source.program.institutionDetails!.find(
        (entry) => entry.institutionName === institutions.find((row) => row.id === 'huji')!.name,
      )!;
      for (const copy of [
        detail.specificAdmissionNotes.join(' '),
        source.program.admissionRequirements.join(' '),
        source.requirements.join(' '),
      ]) {
        for (const forbidden of ['סכ״ם', 'סכ"ם', 'נבדק ב']) expect(copy).not.toContain(forbidden);
      }
      for (const copy of [detail.specificAdmissionNotes.join(' '), source.requirements.join(' ')]) {
        expect(copy).toContain('725');
        expect(copy).toContain('690');
      }
    },
  );

  it.each(['huji_psychology', 'psychology'])(
    'shows the exact 30+ route conditions without referral wording in %s HUJI student copy',
    async (id) => {
      const seed = buildCatalogueSeed();
      const institutions = seed.institutions.map((row) =>
        serializeInstitutionRow(row as InstitutionRow),
      );
      const programs = ['huji_psychology', 'psychology'].map((programId) =>
        serializeProgramRow({
          program: seed.programs.find((row) => row.id === programId)! as ProgramRow,
          relations: seed.programInstitutions.filter(
            (row) => row.programId === programId,
          ) as ProgramInstitutionRow[],
          requirements: seed.admissionRequirements.filter(
            (row) => row.programId === programId && row.institutionId === 'huji',
          ) as AdmissionRequirementRow[],
          thresholds: seed.admissionThresholds.filter(
            (row) => row.programId === programId,
          ) as AdmissionThresholdRow[],
          sourceUrls: [],
          institutionsById: new Map(
            seed.institutions.map((row) => [row.id, row as InstitutionRow]),
          ),
        }),
      );
      const { listCataloguePrograms, listCatalogueInstitutions } =
        await import('@/server/catalogue/queries');
      vi.mocked(listCataloguePrograms).mockResolvedValue({ data: programs, meta: {} });
      vi.mocked(listCatalogueInstitutions).mockResolvedValue({ data: institutions, meta: {} });
      const { getPublicProgramPageData, getPublicProgramRequirementSources } =
        await import('@/lib/publicCataloguePages');
      const page = await getPublicProgramPageData(id);
      expect(page).not.toBeNull();
      const source = (await getPublicProgramRequirementSources(page!)).huji;
      const detail = source.program.institutionDetails!.find(
        (entry) => entry.institutionName === institutions.find((row) => row.id === 'huji')!.name,
      )!;
      for (const lines of [detail.specificAdmissionNotes, source.requirements]) {
        expect(lines).toContain(
          'לבני 30 ומעלה (שנולדו בשנת 1996 ולפניה, נדרשת זכאות לבגרות): ציון 673 ומעלה בפסיכומטרי.',
        );
      }
      for (const copy of [
        detail.specificAdmissionNotes.join(' '),
        source.program.admissionRequirements.join(' '),
        source.requirements.join(' '),
      ]) {
        expect(copy).not.toContain('יש לבדוק');
        expect(copy).not.toContain('באתר האוניברסיטה');
      }
    },
  );

  it('repairs dedicated programme copy and provenance without deriving a required PET gate', () => {
    const program = allPrograms.find((row) => row.id === 'huji_psychology')!;
    const detail = program.institutionDetails![0];
    const row = repair.requirements.find((item) => item.programId === program.id);
    expect(row).toMatchObject({
      institutionId: 'huji',
      checkedAt: '2026-10-26',
      sourceUrl: 'https://info.huji.ac.il/bachelor/Psychology',
      programUrl: 'https://info.huji.ac.il/bachelor/Psychology',
      sourceSha256: 'ee19ad865370598dcbf35751e5559428a23026eb1d2c93e40a9866942e5c9414',
      coverage: 'published_conditions',
      durationYears: 3,
    });
    expect(detail.durationYears).toBe(3);
    expect(detail.programUrl).toBe('https://info.huji.ac.il/bachelor/Psychology');
    const notes = detail.specificAdmissionNotes.join(' ');
    for (const text of ['725', '690', '673', '30', 'האגודה לקידום החינוך'])
      // Approved test update, Jorje 2026-10-26
      expect(notes).toContain(text);
    expect(notes).not.toMatch(/660|סכ[״"ם]*\s*21/);
    expect(
      getRequirementsChecked(program.id, { id: 'huji' }, detail.specificAdmissionNotes),
    ).toEqual({
      date: '26.10.2026',
      sourceUrl: 'https://info.huji.ac.il/bachelor/Psychology?utm_source=myway&utm_medium=referral',
    });
    const beforeRepair = programsWithLegacyAdmissionFacts.find((item) => item.id === program.id)!;
    expect(
      beforeRepair.institutionDetails![0].admissionFacts?.filter(
        (fact) => fact.kind === 'numeric_gate' && fact.field === 'psychometric',
      ),
    ).toEqual([]);
    expect(
      detail.admissionFacts?.filter(
        (fact) => fact.kind === 'numeric_gate' && fact.field === 'psychometric',
      ),
    ).toEqual([]);
    expect(program.thresholds?.huji).toBe(725);
  });

  it('derives no PET numeric gate even if repaired notes go through legacy normalization', async () => {
    const row = repair.requirements.find((item) => item.programId === 'huji_psychology');
    expect(row).toBeDefined();
    vi.resetModules();
    vi.doMock('@/data/degrees/academicPrograms', async (importOriginal) => {
      const original = await importOriginal<typeof import('@/data/degrees/academicPrograms')>();
      return {
        ...original,
        academicPrograms: original.academicPrograms.map((program) =>
          program.id !== 'huji_psychology'
            ? program
            : {
                ...program,
                institutionDetails: [
                  { ...program.institutionDetails![0], specificAdmissionNotes: row!.notes },
                ],
              },
        ),
      };
    });
    try {
      const { programsWithLegacyAdmissionFacts: normalized } = await import('@/data/degrees');
      const facts = normalized.find((program) => program.id === 'huji_psychology')!
        .institutionDetails![0].admissionFacts;
      expect(
        facts?.filter((fact) => fact.kind === 'numeric_gate' && fact.field === 'psychometric'),
      ).toEqual([]);
    } finally {
      vi.doUnmock('@/data/degrees/academicPrograms');
      vi.resetModules();
    }
  });

  it.each(['huji_psychology:detail-0:legacy-fact-0', 'reordered:legacy-fact-7'])(
    'removes the numeric PET 660 fact with id %s',
    (id) => {
      const program = allPrograms.find((row) => row.id === 'huji_psychology')!;
      const legacyFact = {
        id,
        kind: 'numeric_gate' as const,
        field: 'psychometric' as const,
        comparison: 'gte' as const,
        valueNumber: 660,
        valueText: null,
        unit: 'points' as const,
        confidence: 'high' as const,
        description: 'פסיכומטרי 660 ומעלה',
        isRequired: true,
      };
      const retained = { ...legacyFact, id: 'unrelated', field: 'psychometric_english' as const };
      const otherThreshold = { ...legacyFact, id: 'other-threshold', valueNumber: 725 };
      const corrected = applyCatalogueContentRepair({
        ...program,
        institutionDetails: [
          {
            ...program.institutionDetails![0],
            admissionFacts: [legacyFact, retained, otherThreshold],
          },
        ],
      });
      expect(corrected.institutionDetails![0].admissionFacts).toEqual([retained, otherThreshold]); // Approved test update, Jorje 2026-10-26
    },
  );

  it.each(['huji_psychology', 'psychology'])(
    'masks the persisted 660 direct row from %s page payload and evaluator input',
    (id) => {
      const seed = buildCatalogueSeed();
      const requirement = seed.admissionRequirements.find(
        (row) => row.programId === id && row.institutionId === 'huji',
      )!;
      const result = serializeProgramRow({
        program: seed.programs.find((row) => row.id === id)! as ProgramRow,
        relations: seed.programInstitutions.filter(
          (row) => row.programId === id,
        ) as ProgramInstitutionRow[],
        requirements: [
          {
            ...requirement,
            durationYears: 4,
            specificAdmissionNotes: ['קבלה ישירה בפסיכומטרי ≥ 660'],
          },
        ] as AdmissionRequirementRow[],
        thresholds: [
          {
            id: `${id}:huji:huji:direct`,
            programId: id,
            institutionId: 'huji',
            universityId: 'huji',
            thresholdKind: 'direct_psychometric',
            thresholdValue: 660,
          },
          {
            id: `${id}:huji:huji:sekhem`,
            programId: id,
            institutionId: 'huji',
            universityId: 'huji',
            thresholdKind: 'sekhem',
            thresholdValue: 725,
          },
          ...(id === 'psychology'
            ? [
                {
                  id: 'other-direct',
                  programId: id,
                  institutionId: 'tau',
                  universityId: 'tau',
                  thresholdKind: 'direct_psychometric',
                  thresholdValue: 720,
                },
              ]
            : []),
        ] as AdmissionThresholdRow[],
        sourceUrls: [],
        admissionFacts: [
          {
            id: 'huji_psychology:detail-0:legacy-fact-0',
            admissionRequirementId: requirement.id,
            kind: 'numeric_gate',
            field: 'psychometric',
            valueNumber: 660,
          },
        ] as AdmissionFactRow[],
        institutionsById: new Map(seed.institutions.map((row) => [row.id, row as InstitutionRow])),
      });
      expect(result.directPsychometric?.huji).toBeUndefined();
      const pagePayload = JSON.parse(JSON.stringify(result));
      expect(pagePayload.directPsychometric?.huji).toBeUndefined();
      expect(result.thresholds?.huji).toBe(725);
      if (id === 'psychology') expect(result.directPsychometric?.tau).toBe(720);
      else {
        expect(result.institutionDetails![0].durationYears).toBe(3);
        expect(result.institutionDetails![0].specificAdmissionNotes.join(' ')).not.toContain('660');
        expect(result.institutionDetails![0].admissionFacts).toEqual([]);
      }
    },
  );
});
