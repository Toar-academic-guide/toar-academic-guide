import repair from './catalogueContentRepair.json';
import { INSTITUTION_BY_ID, INSTITUTION_BY_NAME, type InstitutionId } from '../institutions';
import type { Program } from '../degrees/types';

type ContentRepair = {
  programId: string;
  institutionId: string;
  notes: string[];
  sourceUrl: string;
  programUrl?: string;
  identity?: Pick<Program, 'name' | 'category' | 'type'>;
};

const requirements = repair.requirements as ContentRepair[];
const excludedIds = new Set(repair.excludedPrograms.map((row) => row.programId));

/** Apply verified display content after legacy normalization, never deriving admission facts. */
export function applyCatalogueContentRepair(program: Program): Program {
  const rows = requirements.filter((row) => row.programId === program.id);
  if (rows.length === 0) {
    return excludedIds.has(program.id) ? { ...program, isListed: false } : program;
  }

  const identity = rows.find((row) => row.identity)?.identity;
  const details = [...(program.institutionDetails ?? [])];
  for (const row of rows) {
    const institution = INSTITUTION_BY_ID[row.institutionId as InstitutionId];
    if (
      !institution ||
      details.some(
        (detail) => INSTITUTION_BY_NAME[detail.institutionName]?.id === row.institutionId,
      )
    )
      continue;
    details.push({
      institutionName: institution.name,
      durationYears: null,
      estimatedStudentsPerYear: '',
      quantitativeMinRequirement: null,
      englishMinRequirement: null,
      specificAdmissionNotes: [],
      officialCalculatorUrl: '',
    });
  }
  return {
    ...program,
    ...identity,
    institutionDetails: details.map((detail) => {
      const institutionId = INSTITUTION_BY_NAME[detail.institutionName]?.id;
      const row = rows.find((candidate) => candidate.institutionId === institutionId);
      if (!row) return detail;
      return {
        ...detail,
        specificAdmissionNotes: row.notes,
        programUrl: row.programUrl ?? row.sourceUrl,
      };
    }),
  };
}
