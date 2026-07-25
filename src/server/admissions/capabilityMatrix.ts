import 'server-only';

import { inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { sourceFreshnessStates } from '@/db/schema';
import type { SourceFreshnessStateRow } from '@/db/types';
import {
  getMondayAdmissionEvidenceByCatalogueInstitutionId,
  type MondayAdmissionEvidenceRecord,
} from '@/data/admissions/mondayEvidence';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type {
  AdmissionsExtraInputs,
  AdmissionsEvaluationCapability,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import { admissionsInputValue } from './admissionsInputValue';
import {
  admissionsSourceTargets,
  type AdmissionsSourceTarget,
} from '@/server/ingestion/admissionsSourceRegistry';
import type { AdmissionsProgramInput } from '@/server/ingestion/admissionsSourceAdapters';

const SOURCE_FRESHNESS_STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

export interface ExactCapabilityTarget {
  targetId: string;
  sourceTarget: AdmissionsSourceTarget;
  program: AdmissionsProgramInput;
  requiredInputs: AdmissionsRequiredInput[];
}

export interface AdmissionsCapabilityEntry {
  institutionId: string;
  capability: AdmissionsEvaluationCapability;
  sourceTarget?: AdmissionsSourceTarget;
  exactTarget?: ExactCapabilityTarget;
  requiredInputs?: AdmissionsRequiredInput[];
  evidence?: MondayAdmissionEvidenceRecord;
  freshnessState?: SourceFreshnessStateRow;
}

const EXACT_PROGRAM_TARGETS: Record<string, ExactCapabilityTarget> = {
  haifa_cs__haifa: {
    targetId: 'haifa-cs-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'haifa-cs-live')!,
    program: {
      id: 'haifa-cs',
      name: 'Computer Science',
      externalId: '52258372',
    },
    requiredInputs: ['psychometric_math', 'psychometric_verbal', 'psychometric_english'],
  },
  tau_datascience__tau: {
    targetId: 'tau-digital-sciences-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-digital-sciences-live',
    )!,
    program: {
      id: 'tau-digital-sciences',
      name: 'Digital Sciences for High-Tech',
      externalId: '056011050000',
      searchText: 'מדעים דיגיטליים',
      scoreField: 'hatama_handasa',
    },
    requiredInputs: [],
  },
};

const SOURCE_TARGETS_BY_INSTITUTION = new Map<string, AdmissionsSourceTarget>(
  admissionsSourceTargets.map((target) => [target.institutionId, target]),
);

const REVIEWED_PARTIAL_ESTIMATE_INSTITUTIONS = new Set(['reichman', 'afeka', 'hit']);

export async function loadFreshnessStatesBySourceIds(
  sourceIds: string[],
): Promise<Map<string, SourceFreshnessStateRow>> {
  if (sourceIds.length === 0) {
    return new Map();
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(sourceFreshnessStates)
      .where(inArray(sourceFreshnessStates.sourceId, sourceIds));

    return new Map(rows.map((row) => [row.sourceId, row]));
  } catch {
    return new Map();
  }
}

export function buildAdmissionsCapabilityMatrix(args: {
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  input?: AdmissionsExtraInputs;
  freshnessStatesBySourceId?: Map<string, SourceFreshnessStateRow>;
  now?: Date;
}): AdmissionsCapabilityEntry[] {
  const {
    program,
    institutions,
    input,
    freshnessStatesBySourceId = new Map<string, SourceFreshnessStateRow>(),
    now = new Date(),
  } = args;

  return program.linkedInstitutionIds.map((institutionId) => {
    const exactTarget = EXACT_PROGRAM_TARGETS[`${program.id}__${institutionId}`];
    const sourceTarget =
      exactTarget?.sourceTarget ?? SOURCE_TARGETS_BY_INSTITUTION.get(institutionId);
    const evidence = selectBestEvidence(institutionId);
    const freshnessState = exactTarget
      ? freshnessStatesBySourceId.get(exactTarget.targetId)
      : sourceTarget
        ? freshnessStatesBySourceId.get(sourceTarget.id)
        : undefined;
    const institution = institutions.find((entry) => entry.id === institutionId);
    const hasCalculatorConfig = Boolean(institution?.calculatorConfig);
    const hasThreshold = hasDecisionThreshold(program, institutionId);
    const hasMappedFormulaWithoutVerifiedCutoff =
      hasCalculatorConfig &&
      hasThreshold &&
      evidence?.capabilityCandidate === 'score_only_or_formula_without_verified_cutoff';

    if (exactTarget) {
      if (freshnessState?.status === 'blocked') {
        return {
          institutionId,
          capability: 'blocked',
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      if (freshnessState?.status === 'failed' || isFreshnessStateStale(freshnessState, now)) {
        return {
          institutionId,
          capability: 'stale',
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      const missingRequiredInputs = requiredInputsMissingFrom(input, exactTarget.requiredInputs);
      if (missingRequiredInputs.length > 0) {
        return {
          institutionId,
          capability: 'needs_input',
          sourceTarget,
          exactTarget,
          requiredInputs: missingRequiredInputs,
          evidence,
          freshnessState,
        };
      }

      return {
        institutionId,
        capability: 'exact',
        sourceTarget,
        exactTarget,
        evidence,
        freshnessState,
      };
    }

    if (sourceTarget?.category !== 'partial') {
      if (hasMappedFormulaWithoutVerifiedCutoff) {
        return {
          institutionId,
          capability: 'score_only',
          sourceTarget,
          evidence,
          freshnessState,
        };
      }

      const evidenceCapability = capabilityFromEvidence(evidence);
      if (evidenceCapability) {
        return {
          institutionId,
          capability: evidenceCapability,
          sourceTarget,
          evidence,
          freshnessState,
        };
      }
    }

    if (sourceTarget?.category === 'blocked') {
      return {
        institutionId,
        capability: 'blocked',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (sourceTarget?.category === 'open_admission') {
      return {
        institutionId,
        capability: 'open_admission',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (sourceTarget?.category === 'manual_gate') {
      return {
        institutionId,
        capability: 'manual_gate',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (sourceTarget?.category === 'requirements_only') {
      return {
        institutionId,
        capability: 'requirements_only',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (sourceTarget?.category === 'partial') {
      const verifiedThreshold = getVerifiedProgramThreshold(evidence, program.id);
      const hasVerifiedProgramThreshold = hasVerifiedDecisionThreshold({
        evidence,
        program,
        institutionId,
      });

      if (hasCalculatorConfig && verifiedThreshold?.thresholdKind === 'invitation_to_manual_gate') {
        return {
          institutionId,
          capability: 'manual_gate',
          sourceTarget,
          evidence,
          freshnessState,
        };
      }

      if (hasCalculatorConfig && hasThreshold && hasVerifiedProgramThreshold) {
        return {
          institutionId,
          capability: 'estimated',
          sourceTarget,
          evidence,
          freshnessState,
        };
      }

      if (hasMappedFormulaWithoutVerifiedCutoff) {
        return {
          institutionId,
          capability: 'score_only',
          sourceTarget,
          evidence,
          freshnessState,
        };
      }

      const evidenceCapability = capabilityFromEvidence(evidence);
      if (evidenceCapability) {
        return {
          institutionId,
          capability: evidenceCapability,
          sourceTarget,
          evidence,
          freshnessState,
        };
      }

      if (
        REVIEWED_PARTIAL_ESTIMATE_INSTITUTIONS.has(institutionId) &&
        hasCalculatorConfig &&
        hasThreshold
      ) {
        return {
          institutionId,
          capability: 'estimated',
          sourceTarget,
          evidence,
          freshnessState,
        };
      }

      return {
        institutionId,
        capability: 'score_only',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (hasCalculatorConfig && hasThreshold) {
      return {
        institutionId,
        capability: 'estimated',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    const detail = findInstitutionDetail(program, institution);
    const hasStructuredOpenAdmission =
      program.admissionType === 'requirements' &&
      Boolean(detail?.admissionFacts?.some((fact) => fact.kind === 'open_admission'));
    const hasStructuredManualRequirements =
      program.admissionType === 'requirements' &&
      (program.admissionRequirements.length > 0 ||
        Boolean(detail?.admissionFacts?.some((fact) => fact.kind === 'manual_gate')) ||
        Boolean(detail?.admissionAlternativePaths?.length) ||
        Boolean(detail?.specificAdmissionNotes?.length));
    const hasStructuredRequirements =
      program.admissionType === 'requirements' &&
      (Boolean(detail?.admissionFacts?.length) ||
        Boolean(detail?.admissionAlternativePaths?.length) ||
        Boolean(detail?.specificAdmissionNotes?.length));

    if (!hasCalculatorConfig && hasStructuredOpenAdmission) {
      return {
        institutionId,
        capability: 'open_admission',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (!hasCalculatorConfig && hasStructuredManualRequirements) {
      return {
        institutionId,
        capability: 'manual_gate',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (!hasCalculatorConfig && hasStructuredRequirements) {
      return {
        institutionId,
        capability: 'requirements_only',
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    return {
      institutionId,
      capability: sourceTarget ? 'unsupported' : 'missing',
      sourceTarget,
      evidence,
      freshnessState,
    };
  });
}

function requiredInputsMissingFrom(
  input: AdmissionsExtraInputs | undefined,
  requiredInputs: AdmissionsRequiredInput[],
): AdmissionsRequiredInput[] {
  return requiredInputs.filter(
    (requiredInput) => admissionsInputValue(input, requiredInput) === undefined,
  );
}

function hasVerifiedDecisionThreshold(args: {
  evidence: MondayAdmissionEvidenceRecord | undefined;
  program: CatalogueProgram;
  institutionId: string;
}): boolean {
  const { evidence, program, institutionId } = args;
  const verifiedThreshold = getVerifiedProgramThreshold(evidence, program.id);

  if (!verifiedThreshold) {
    return false;
  }

  if (verifiedThreshold.thresholdKind === 'invitation_to_manual_gate') {
    return false;
  }

  return program.thresholds?.[institutionId] === verifiedThreshold.threshold;
}

function getVerifiedProgramThreshold(
  evidence: MondayAdmissionEvidenceRecord | undefined,
  programId: string,
) {
  return evidence?.verifiedProgramThresholds?.find((entry) => entry.programId === programId);
}

function selectBestEvidence(institutionId: string): MondayAdmissionEvidenceRecord | undefined {
  return getMondayAdmissionEvidenceByCatalogueInstitutionId(institutionId).sort(
    (a, b) => evidencePriority(b) - evidencePriority(a),
  )[0];
}

function evidencePriority(record: MondayAdmissionEvidenceRecord): number {
  switch (record.publicBucket) {
    case 'decision_capable':
      return 70;
    case 'open_admission':
      return 60;
    case 'eligible_no_formal_grade_gate':
      return 50;
    case 'eligible_with_manual_gate':
      return 45;
    case 'manual_gate':
      return 40;
    case 'tracked_missing_rule':
      return 30;
    case 'requirements_review':
      return 20;
  }
}

function capabilityFromEvidence(
  evidence: MondayAdmissionEvidenceRecord | undefined,
): AdmissionsEvaluationCapability | undefined {
  if (!evidence) {
    return undefined;
  }

  if (evidence.publicBucket === 'tracked_missing_rule') {
    return 'tracked_missing_rule';
  }

  if (evidence.publicBucket === 'open_admission') {
    return 'open_admission';
  }

  if (
    evidence.publicBucket === 'manual_gate' ||
    evidence.publicBucket === 'eligible_with_manual_gate' ||
    evidence.publicBucket === 'eligible_no_formal_grade_gate'
  ) {
    return 'manual_gate';
  }

  return undefined;
}

function findInstitutionDetail(
  program: CatalogueProgram,
  institution: CatalogueInstitution | undefined,
) {
  if (!institution) {
    return undefined;
  }

  return program.institutionDetails?.find(
    (detail) =>
      detail.institutionName === institution.name ||
      detail.officialCalculatorUrl?.includes(institution.id) ||
      detail.programUrl?.includes(institution.id),
  );
}

function hasDecisionThreshold(program: CatalogueProgram, institutionId: string): boolean {
  const sekhemThreshold = program.thresholds?.[institutionId];
  const directPsychometric = program.directPsychometric?.[institutionId];

  return (
    (sekhemThreshold !== undefined && sekhemThreshold !== null) ||
    (directPsychometric !== undefined && directPsychometric !== null)
  );
}

function isFreshnessStateStale(state: SourceFreshnessStateRow | undefined, now: Date): boolean {
  if (!state || state.status !== 'fresh') {
    return false;
  }

  if (!state.lastSuccessfulCheckAt) {
    return true;
  }

  return now.getTime() - state.lastSuccessfulCheckAt.getTime() > SOURCE_FRESHNESS_STALE_AFTER_MS;
}
