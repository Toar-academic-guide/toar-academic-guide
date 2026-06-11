import 'server-only';

import { eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  admissionRequirements,
  admissionThresholds,
  institutions,
  programInstitutions,
  programs,
  sourceUrls,
  universityCalculatorConfigs,
} from '@/db/schema';
import { hasDatabaseUrl } from '@/env';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import { serializeInstitutionRow, serializeProgramRow } from './serializers';

export class CatalogueQueryError extends Error {
  code: string;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

export async function listCatalogueInstitutions(): Promise<CatalogueInstitution[]> {
  if (!hasDatabaseUrl()) {
    return getStaticCatalogueInstitutions();
  }

  try {
    const db = getDb();
    const rows = await db.select().from(institutions);
    const calculatorConfigRows =
      rows.length === 0
        ? []
        : await db
            .select()
            .from(universityCalculatorConfigs)
            .where(inArray(universityCalculatorConfigs.institutionId, rows.map((row) => row.id)));
    const calculatorConfigsByInstitutionId = new Map(
      calculatorConfigRows.map((row) => [row.institutionId, row])
    );

    return rows.map((row) => serializeInstitutionRow(row, calculatorConfigsByInstitutionId.get(row.id)));
  } catch (error) {
    throw new CatalogueQueryError(
      'CATALOGUE_INSTITUTIONS_UNAVAILABLE',
      'Unable to load catalogue institutions.',
      error
    );
  }
}

export async function listCataloguePrograms(): Promise<CatalogueProgram[]> {
  if (!hasDatabaseUrl()) {
    return getStaticCataloguePrograms();
  }

  try {
    const db = getDb();
    const programRows = await db.select().from(programs);
    if (programRows.length === 0) {
      return [];
    }

    const programIds = programRows.map((row) => row.id);
    const relationRows = await db
      .select()
      .from(programInstitutions)
      .where(inArray(programInstitutions.programId, programIds));
    const requirementRows = await db
      .select()
      .from(admissionRequirements)
      .where(inArray(admissionRequirements.programId, programIds));
    const thresholdRows = await db
      .select()
      .from(admissionThresholds)
      .where(inArray(admissionThresholds.programId, programIds));
    const sourceRows = await db
      .select()
      .from(sourceUrls)
      .where(inArray(sourceUrls.programId, programIds));

    const institutionIds = [...new Set(relationRows.map((row) => row.institutionId))];
    const institutionRows =
      institutionIds.length === 0
        ? []
        : await db.select().from(institutions).where(inArray(institutions.id, institutionIds));
    const institutionsById = new Map(institutionRows.map((row) => [row.id, row]));

    return programRows.map((programRow) =>
      serializeProgramRow({
        program: programRow,
        relations: relationRows.filter((row) => row.programId === programRow.id),
        requirements: requirementRows.filter((row) => row.programId === programRow.id),
        thresholds: thresholdRows.filter((row) => row.programId === programRow.id),
        sourceUrls: sourceRows.filter((row) => row.programId === programRow.id),
        institutionsById,
      })
    );
  } catch (error) {
    throw new CatalogueQueryError(
      'CATALOGUE_PROGRAMS_UNAVAILABLE',
      'Unable to load catalogue programs.',
      error
    );
  }
}

export async function getRequirementIdsForProgram(programId: string): Promise<string[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({ id: admissionRequirements.id })
    .from(admissionRequirements)
    .where(eq(admissionRequirements.programId, programId));

  return rows.map((row) => row.id);
}
