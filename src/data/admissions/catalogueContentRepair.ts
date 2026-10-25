import { canonicalInstitutionId } from '../institutionAliases';
import repair from './catalogueContentRepair.json';
import { INSTITUTION_BY_ID, INSTITUTION_BY_NAME, type InstitutionId } from '../institutions';
import type { Program } from '../degrees/types';
import { vocationalPrograms } from '../degrees/vocationalPrograms';

type ContentRepair = {
  programId: string;
  institutionId: string;
  notes: string[];
  sourceUrl: string;
  programUrl?: string;
  identity?: Pick<Program, 'name' | 'category' | 'type' | 'awardedCredential'>;
  durationYears?: number;
};

export const RETIRED_PROGRAM_IDS = [
  'jerusalem_academy_graphic_design',
  'rubin_graphic_design',
  'spieldocs_graphic_design',
  'samspiegel_documentary',
];

const requirements = repair.requirements as ContentRepair[];
const excludedIds = new Set(repair.excludedPrograms.map((row) => row.programId));

/** Apply verified content after legacy normalization, never deriving admission facts. */
export function applyCatalogueContentRepair<T extends Program>(program: T): T {
  if (program.id === 'jerusalem_academy_graphic_design') {
    program = { ...program, id: 'jerusalem_academy_dance' };
  }
  const rows = requirements.filter((row) => row.programId === program.id);
  if (rows.length === 0) {
    return excludedIds.has(program.id) ? { ...program, isListed: false } : program;
  }

  const identity = rows.find((row) => row.identity)?.identity;
  const verifiedArts = ['jerusalem_academy_dance', 'rubin_classical'].includes(program.id);
  const artsSource = verifiedArts
    ? vocationalPrograms.find((source) => source.id === program.id)
    : undefined;
  const afekaRoutes = rows.find(
    (row) =>
      row.institutionId === 'afeka' &&
      ['afeka_ee', 'afeka_softwareeng', 'afeka_cs'].includes(row.programId),
  );
  const details = [...(program.institutionDetails ?? [])];
  for (const row of rows) {
    const institution = INSTITUTION_BY_ID[row.institutionId as InstitutionId];
    if (
      !institution ||
      details.some(
        (detail) =>
          INSTITUTION_BY_NAME[detail.institutionName]?.id ===
          canonicalInstitutionId(row.institutionId),
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
    ...(afekaRoutes || verifiedArts
      ? {
          admissionType: 'requirements' as const,
          admissionRequirements: (afekaRoutes ?? rows[0]).notes,
          thresholds: undefined,
          directPsychometric: undefined,
          minimumBagrut: undefined,
          minimumPsychometric: undefined,
        }
      : {}),
    institutionDetails: details.map((detail) => {
      const institutionId = INSTITUTION_BY_NAME[detail.institutionName]?.id;
      const row = rows.find(
        (candidate) => canonicalInstitutionId(candidate.institutionId) === institutionId,
      );
      if (!row) return detail;
      return {
        ...detail,
        specificAdmissionNotes: row.notes,
        programUrl: row.programUrl ?? row.sourceUrl,
        ...(row.durationYears !== undefined ? { durationYears: row.durationYears } : {}),
        ...(verifiedArts ? { programDescription: undefined } : {}),
        ...((afekaRoutes && row.institutionId === 'afeka') || verifiedArts
          ? {
              quantitativeMinRequirement: null,
              englishMinRequirement: null,
              admissionFacts: artsSource?.institutionDetails?.[0].admissionFacts ?? [],
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
