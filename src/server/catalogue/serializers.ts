import type { InstitutionDetail } from '@/data/degrees/types';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type {
  AdmissionRequirementRow,
  AdmissionThresholdRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  SourceUrlRow,
  UniversityCalculatorConfigRow,
} from '@/db/types';

function serializeCalculatorConfigRow(
  row: UniversityCalculatorConfigRow
): NonNullable<CatalogueInstitution['calculatorConfig']> {
  return {
    formulaType: row.formulaType,
    scaleDescription: row.scaleDescription,
    ...(row.psyWeight !== null && row.bagrutWeight !== null
      ? {
          sekhemWeight: {
            psy: row.psyWeight,
            bag: row.bagrutWeight,
          },
        }
      : {}),
  };
}

export function serializeInstitutionRow(
  row: InstitutionRow,
  calculatorConfig?: UniversityCalculatorConfigRow
): CatalogueInstitution {
  return {
    id: row.id as CatalogueInstitution['id'],
    name: row.name,
    region: row.region as CatalogueInstitution['region'],
    domain: row.domain ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    programUrl: row.programUrl ?? undefined,
    calculatorUrl: row.calculatorUrl ?? undefined,
    universityId: (row.universityId ?? undefined) as CatalogueInstitution['universityId'],
    calculatorConfig: calculatorConfig ? serializeCalculatorConfigRow(calculatorConfig) : undefined,
  };
}

function buildInstitutionDetails(
  requirements: AdmissionRequirementRow[],
  urlsByRequirementId: Map<string, SourceUrlRow[]>,
  institutionsById: Map<string, InstitutionRow>
): InstitutionDetail[] | undefined {
  const details = requirements
    .map((requirement) => {
      const institution = institutionsById.get(requirement.institutionId);
      if (!institution) {
        return null;
      }

      const urls = urlsByRequirementId.get(requirement.id) ?? [];
      const programUrl = urls.find((url) => url.kind === 'program')?.url ?? institution.programUrl ?? undefined;
      const calculatorUrl =
        urls.find((url) => url.kind === 'calculator')?.url ?? institution.calculatorUrl ?? undefined;

      const detail: InstitutionDetail = {
        institutionName: institution.name,
        durationYears: requirement.durationYears,
        estimatedStudentsPerYear: requirement.estimatedStudentsPerYear ?? '',
        quantitativeMinRequirement: requirement.quantitativeMinRequirement ?? null,
        englishMinRequirement: requirement.englishMinRequirement ?? null,
        specificAdmissionNotes: requirement.specificAdmissionNotes,
        officialCalculatorUrl: calculatorUrl ?? '',
        ...(programUrl ? { programUrl } : {}),
        ...(calculatorUrl ? { calculatorUrl } : {}),
        ...(requirement.programDescription ? { programDescription: requirement.programDescription } : {}),
      };

      return detail;
    })
    .filter((detail): detail is InstitutionDetail => detail !== null);

  return details.length > 0 ? details : undefined;
}

export function serializeProgramRow(args: {
  program: ProgramRow;
  relations: ProgramInstitutionRow[];
  requirements: AdmissionRequirementRow[];
  thresholds: AdmissionThresholdRow[];
  sourceUrls: SourceUrlRow[];
  institutionsById: Map<string, InstitutionRow>;
}): CatalogueProgram {
  const { program, relations, requirements, thresholds, sourceUrls, institutionsById } = args;
  const urlsByRequirementId = new Map<string, SourceUrlRow[]>();

  for (const sourceUrl of sourceUrls) {
    const existing = urlsByRequirementId.get(sourceUrl.admissionRequirementId) ?? [];
    existing.push(sourceUrl);
    urlsByRequirementId.set(sourceUrl.admissionRequirementId, existing);
  }

  const thresholdMap: Partial<Record<string, number | null>> = {};
  const directPsychometricMap: Partial<Record<string, number>> = {};

  for (const threshold of thresholds) {
    if (threshold.thresholdKind === 'sekhem') {
      thresholdMap[threshold.universityId] = threshold.thresholdValue;
    } else if (threshold.thresholdValue !== null) {
      directPsychometricMap[threshold.universityId] = threshold.thresholdValue;
    }
  }

  return {
    id: program.id,
    name: program.name,
    institution: program.institutionName,
    institutionId: (program.institutionId ?? undefined) as CatalogueProgram['institutionId'],
    type: program.type,
    category: program.category,
    riasecScore: {
      R: program.riasecR,
      I: program.riasecI,
      A: program.riasecA,
      S: program.riasecS,
      E: program.riasecE,
      C: program.riasecC,
    },
    admissionType: program.admissionType,
    admissionRequirements: requirements.flatMap((requirement) => requirement.admissionRequirements),
    thresholds:
      (Object.keys(thresholdMap).length > 0 ? thresholdMap : undefined) as CatalogueProgram['thresholds'],
    isTauEngineering: program.isTauEngineering || undefined,
    directPsychometric:
      (Object.keys(directPsychometricMap).length > 0
        ? directPsychometricMap
        : undefined) as CatalogueProgram['directPsychometric'],
    institutionDetails: buildInstitutionDetails(requirements, urlsByRequirementId, institutionsById),
    linkedInstitutionIds: relations.map((relation) => relation.institutionId),
  };
}
