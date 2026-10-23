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

/** Apply verified content after legacy normalization, never deriving admission facts. */
export function applyCatalogueContentRepair<T extends Program>(program: T): T {
  const rows = requirements.filter((row) => row.programId === program.id);
  if (rows.length === 0) {
    return excludedIds.has(program.id) ? { ...program, isListed: false } : program;
  }

  const identity = rows.find((row) => row.identity)?.identity;
  const afekaRoutes = rows.find(
    (row) =>
      row.institutionId === 'afeka' && ['afeka_ee', 'afeka_softwareeng'].includes(row.programId),
  );
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
    ...(afekaRoutes
      ? {
          admissionRequirements: afekaRoutes.notes,
          thresholds: undefined,
          directPsychometric: undefined,
          minimumBagrut: undefined,
          minimumPsychometric: undefined,
        }
      : {}),
    institutionDetails: details.map((detail) => {
      const institutionId = INSTITUTION_BY_NAME[detail.institutionName]?.id;
      const row = rows.find((candidate) => candidate.institutionId === institutionId);
      if (!row) return detail;
      return {
        ...detail,
        specificAdmissionNotes: row.notes,
        programUrl: row.programUrl ?? row.sourceUrl,
        ...(afekaRoutes && row.institutionId === 'afeka'
          ? {
              quantitativeMinRequirement: null,
              englishMinRequirement: null,
              admissionFacts: [],
              admissionAlternativePaths: [],
            }
          : {}),
        ...(row.programId === 'haifa_psychology' && row.institutionId === 'haifa'
          ? {
              admissionFacts: detail.admissionFacts?.filter(
                (fact) =>
                  !(
                    fact.kind === 'numeric_gate' &&
                    ((fact.field === 'psychometric' && fact.valueNumber === 680) ||
                      (fact.field === 'bagrut_average' && fact.valueNumber === 85))
                  ),
              ),
            }
          : {}),
      };
    }),
  };
}
