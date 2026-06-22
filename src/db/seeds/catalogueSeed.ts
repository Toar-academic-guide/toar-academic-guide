import {
  admissionRequirements,
  admissionThresholds,
  institutions,
  programInstitutions,
  programs,
  requirementVersions,
  sourceUrls,
  universityCalculatorConfigs,
} from '@/db/schema';
import { allPrograms } from '@/data/degrees';
import type { InstitutionDetail, Program } from '@/data/degrees/types';
import { INSTITUTIONS, INSTITUTION_BY_NAME, type InstitutionId } from '@/data/institutions';
import { UNIVERSITIES } from '@/data/degreesData';
import type { UniversityId } from '@/types';

export interface CatalogueSeedValidationError {
  programId: string;
  message: string;
}

export interface CatalogueSeedPayload {
  institutions: typeof institutions.$inferInsert[];
  universityCalculatorConfigs: typeof universityCalculatorConfigs.$inferInsert[];
  programs: typeof programs.$inferInsert[];
  programInstitutions: typeof programInstitutions.$inferInsert[];
  admissionRequirements: typeof admissionRequirements.$inferInsert[];
  admissionThresholds: typeof admissionThresholds.$inferInsert[];
  sourceUrls: typeof sourceUrls.$inferInsert[];
  requirementVersions: typeof requirementVersions.$inferInsert[];
  validationErrors: CatalogueSeedValidationError[];
}

function getProgramInstitutionIds(program: Program): InstitutionId[] {
  if (program.institutionId) {
    return [program.institutionId];
  }

  const byName = INSTITUTION_BY_NAME[program.institution];
  if (byName) {
    return [byName.id];
  }

  const fromThresholds =
    program.thresholds == null
      ? []
      : (Object.entries(program.thresholds)
          .filter(([, value]) => value !== null)
          .map(([institutionId]) => institutionId) as InstitutionId[]);

  if (fromThresholds.length > 0) {
    return fromThresholds;
  }

  return (
    program.institutionDetails
      ?.map((detail) => INSTITUTION_BY_NAME[detail.institutionName]?.id)
      .filter((value): value is InstitutionId => Boolean(value)) ?? []
  );
}

function getInstitutionDetailFor(program: Program, institutionId: InstitutionId): InstitutionDetail | undefined {
  if (!program.institutionDetails || program.institutionDetails.length === 0) {
    return undefined;
  }

  const institution = INSTITUTIONS.find((entry) => entry.id === institutionId);
  const byName = institution
    ? program.institutionDetails.find((detail) => detail.institutionName === institution.name)
    : undefined;

  return byName ?? (program.institutionDetails.length === 1 ? program.institutionDetails[0] : undefined);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildCatalogueSeed(seedPrograms: Program[] = allPrograms): CatalogueSeedPayload {
  const validationErrors: CatalogueSeedValidationError[] = [];
  const institutionRows = INSTITUTIONS.map((institution) => ({
    id: institution.id,
    name: institution.name,
    region: institution.region,
    domain: institution.domain ?? null,
    logoUrl: institution.logoUrl ?? null,
    programUrl: institution.programUrl ?? null,
    calculatorUrl: institution.calculatorUrl ?? null,
    universityId: institution.universityId ?? null,
  }));

  const programRows: typeof programs.$inferInsert[] = [];
  const calculatorConfigRows: typeof universityCalculatorConfigs.$inferInsert[] = UNIVERSITIES.map(
    (university) => ({
      institutionId: university.id,
      formulaType: university.formulaType,
      psyWeight: university.sekhemWeight?.psy ?? null,
      bagrutWeight: university.sekhemWeight?.bag ?? null,
      minPsychometric: university.minPsychometric ?? null,
      minBagrut: university.minBagrut ?? null,
      scaleDescription: university.scaleDescription,
    })
  );
  const relationRows: typeof programInstitutions.$inferInsert[] = [];
  const requirementRows: typeof admissionRequirements.$inferInsert[] = [];
  const thresholdRows: typeof admissionThresholds.$inferInsert[] = [];
  const sourceUrlRows: typeof sourceUrls.$inferInsert[] = [];
  const versionRows: typeof requirementVersions.$inferInsert[] = [];

  for (const program of seedPrograms) {
    const linkedInstitutionIds = unique(getProgramInstitutionIds(program));

    if (linkedInstitutionIds.length === 0) {
      validationErrors.push({
        programId: program.id,
        message: `Program "${program.name}" is missing an institution mapping.`,
      });
    }

    programRows.push({
      id: program.id,
      name: program.name,
      institutionName: program.institution,
      institutionId: program.institutionId ?? null,
      type: program.type as 'academic' | 'certificate' | 'vocational',
      category: program.category,
      admissionType: program.admissionType,
      riasecR: program.profileScore.AN,
      riasecI: program.profileScore.TE,
      riasecA: program.profileScore.CR,
      riasecS: program.profileScore.SO,
      riasecE: program.profileScore.LE,
      riasecC: program.profileScore.OR,
      isTauEngineering: program.isTauEngineering ?? false,
    });

    for (const institutionId of linkedInstitutionIds) {
      relationRows.push({
        programId: program.id,
        institutionId,
      });

      const detail = getInstitutionDetailFor(program, institutionId);
      const institution = INSTITUTIONS.find((entry) => entry.id === institutionId);
      const requirementId = `${program.id}:${institutionId}`;

      requirementRows.push({
        id: requirementId,
        programId: program.id,
        institutionId,
        durationYears: detail?.durationYears ?? null,
        estimatedStudentsPerYear: detail?.estimatedStudentsPerYear ?? null,
        quantitativeMinRequirement: detail?.quantitativeMinRequirement ?? null,
        englishMinRequirement: detail?.englishMinRequirement ?? null,
        admissionRequirements: program.admissionRequirements,
        specificAdmissionNotes: detail?.specificAdmissionNotes ?? [],
        programDescription: detail?.programDescription ?? null,
        reviewStatus: 'seeded',
      });

      versionRows.push({
        id: `${requirementId}:v1`,
        admissionRequirementId: requirementId,
        versionNumber: 1,
        durationYears: detail?.durationYears ?? null,
        estimatedStudentsPerYear: detail?.estimatedStudentsPerYear ?? null,
        quantitativeMinRequirement: detail?.quantitativeMinRequirement ?? null,
        englishMinRequirement: detail?.englishMinRequirement ?? null,
        admissionRequirements: program.admissionRequirements,
        specificAdmissionNotes: detail?.specificAdmissionNotes ?? [],
        programDescription: detail?.programDescription ?? null,
        sourceSnapshot: {
          program: detail?.programUrl ?? institution?.programUrl ?? null,
          calculator:
            detail?.calculatorUrl ?? detail?.officialCalculatorUrl ?? institution?.calculatorUrl ?? null,
          institution: institution?.programUrl ?? (institution?.domain ? `https://${institution.domain}` : null),
        },
      });

      const programUrl = detail?.programUrl ?? institution?.programUrl;
      if (programUrl) {
        sourceUrlRows.push({
          id: `${requirementId}:program`,
          admissionRequirementId: requirementId,
          institutionId,
          programId: program.id,
          kind: 'program',
          url: programUrl,
        });
      }

      const calculatorUrl =
        detail?.calculatorUrl ?? detail?.officialCalculatorUrl ?? institution?.calculatorUrl;
      if (calculatorUrl) {
        sourceUrlRows.push({
          id: `${requirementId}:calculator`,
          admissionRequirementId: requirementId,
          institutionId,
          programId: program.id,
          kind: 'calculator',
          url: calculatorUrl,
        });
      }

      const institutionUrl = institution?.programUrl ?? (institution?.domain ? `https://${institution.domain}` : undefined);
      if (institutionUrl) {
        sourceUrlRows.push({
          id: `${requirementId}:institution`,
          admissionRequirementId: requirementId,
          institutionId,
          programId: program.id,
          kind: 'institution',
          url: institutionUrl,
        });
      }

      for (const [universityId, thresholdValue] of Object.entries(program.thresholds ?? {}) as [
        UniversityId,
        number | null,
      ][]) {
        thresholdRows.push({
          id: `${program.id}:${institutionId}:${universityId}:sekhem`,
          programId: program.id,
          institutionId,
          universityId,
          thresholdKind: 'sekhem',
          thresholdValue,
        });
      }

      for (const [universityId, thresholdValue] of Object.entries(program.directPsychometric ?? {}) as [
        UniversityId,
        number,
      ][]) {
        thresholdRows.push({
          id: `${program.id}:${institutionId}:${universityId}:direct`,
          programId: program.id,
          institutionId,
          universityId,
          thresholdKind: 'direct_psychometric',
          thresholdValue,
        });
      }
    }
  }

  return {
    institutions: institutionRows,
    universityCalculatorConfigs: calculatorConfigRows,
    programs: programRows,
    programInstitutions: relationRows,
    admissionRequirements: requirementRows,
    admissionThresholds: thresholdRows,
    sourceUrls: sourceUrlRows,
    requirementVersions: versionRows,
    validationErrors,
  };
}

export async function upsertCatalogueSeed(payload: CatalogueSeedPayload) {
  if (payload.validationErrors.length > 0) {
    throw new Error(
      `Catalogue seed validation failed:\n${payload.validationErrors
        .map((error) => `- ${error.programId}: ${error.message}`)
        .join('\n')}`
    );
  }

  const { getDb } = await import('@/db/client');
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.insert(institutions).values(payload.institutions).onConflictDoUpdate({
      target: institutions.id,
      set: {
        name: institutions.name,
        region: institutions.region,
        domain: institutions.domain,
        logoUrl: institutions.logoUrl,
        programUrl: institutions.programUrl,
        calculatorUrl: institutions.calculatorUrl,
        universityId: institutions.universityId,
      },
    });

    await tx
      .insert(universityCalculatorConfigs)
      .values(payload.universityCalculatorConfigs)
      .onConflictDoUpdate({
        target: universityCalculatorConfigs.institutionId,
        set: {
          formulaType: universityCalculatorConfigs.formulaType,
          psyWeight: universityCalculatorConfigs.psyWeight,
          bagrutWeight: universityCalculatorConfigs.bagrutWeight,
          scaleDescription: universityCalculatorConfigs.scaleDescription,
        },
      });

    await tx.insert(programs).values(payload.programs).onConflictDoUpdate({
      target: programs.id,
      set: {
        name: programs.name,
        institutionName: programs.institutionName,
        institutionId: programs.institutionId,
        type: programs.type,
        category: programs.category,
        admissionType: programs.admissionType,
        riasecR: programs.riasecR,
        riasecI: programs.riasecI,
        riasecA: programs.riasecA,
        riasecS: programs.riasecS,
        riasecE: programs.riasecE,
        riasecC: programs.riasecC,
        isTauEngineering: programs.isTauEngineering,
      },
    });

    await tx.insert(programInstitutions).values(payload.programInstitutions).onConflictDoNothing();
    await tx.insert(admissionRequirements).values(payload.admissionRequirements).onConflictDoUpdate({
      target: admissionRequirements.id,
      set: {
        durationYears: admissionRequirements.durationYears,
        estimatedStudentsPerYear: admissionRequirements.estimatedStudentsPerYear,
        quantitativeMinRequirement: admissionRequirements.quantitativeMinRequirement,
        englishMinRequirement: admissionRequirements.englishMinRequirement,
        admissionRequirements: admissionRequirements.admissionRequirements,
        specificAdmissionNotes: admissionRequirements.specificAdmissionNotes,
        programDescription: admissionRequirements.programDescription,
        reviewStatus: admissionRequirements.reviewStatus,
      },
    });

    await tx.insert(admissionThresholds).values(payload.admissionThresholds).onConflictDoUpdate({
      target: admissionThresholds.id,
      set: {
        thresholdValue: admissionThresholds.thresholdValue,
      },
    });

    await tx.insert(sourceUrls).values(payload.sourceUrls).onConflictDoUpdate({
      target: sourceUrls.id,
      set: {
        url: sourceUrls.url,
      },
    });

    await tx.insert(requirementVersions).values(payload.requirementVersions).onConflictDoUpdate({
      target: requirementVersions.id,
      set: {
        durationYears: requirementVersions.durationYears,
        estimatedStudentsPerYear: requirementVersions.estimatedStudentsPerYear,
        quantitativeMinRequirement: requirementVersions.quantitativeMinRequirement,
        englishMinRequirement: requirementVersions.englishMinRequirement,
        admissionRequirements: requirementVersions.admissionRequirements,
        specificAdmissionNotes: requirementVersions.specificAdmissionNotes,
        programDescription: requirementVersions.programDescription,
        sourceSnapshot: requirementVersions.sourceSnapshot,
      },
    });
  });
}
