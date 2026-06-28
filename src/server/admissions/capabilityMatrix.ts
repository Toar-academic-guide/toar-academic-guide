import 'server-only';

import { inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { sourceFreshnessStates } from '@/db/schema';
import type { SourceFreshnessStateRow } from '@/db/types';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type {
  AdmissionsEvaluationCapability,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
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
  freshnessStatesBySourceId?: Map<string, SourceFreshnessStateRow>;
  now?: Date;
}): AdmissionsCapabilityEntry[] {
  const {
    program,
    institutions,
    freshnessStatesBySourceId = new Map<string, SourceFreshnessStateRow>(),
    now = new Date(),
  } = args;

  return program.linkedInstitutionIds.map((institutionId) => {
    const exactTarget = EXACT_PROGRAM_TARGETS[`${program.id}__${institutionId}`];
    const sourceTarget =
      exactTarget?.sourceTarget ?? SOURCE_TARGETS_BY_INSTITUTION.get(institutionId);
    const freshnessState = exactTarget
      ? freshnessStatesBySourceId.get(exactTarget.targetId)
      : sourceTarget
        ? freshnessStatesBySourceId.get(sourceTarget.id)
        : undefined;

    if (exactTarget) {
      if (freshnessState?.status === 'blocked') {
        return {
          institutionId,
          capability: 'blocked',
          sourceTarget,
          exactTarget,
          freshnessState,
        };
      }

      if (freshnessState?.status === 'failed' || isFreshnessStateStale(freshnessState, now)) {
        return {
          institutionId,
          capability: 'stale',
          sourceTarget,
          exactTarget,
          freshnessState,
        };
      }

      if (exactTarget.requiredInputs.length > 0) {
        return {
          institutionId,
          capability: 'needs_input',
          sourceTarget,
          exactTarget,
          requiredInputs: exactTarget.requiredInputs,
          freshnessState,
        };
      }

      return {
        institutionId,
        capability: 'exact',
        sourceTarget,
        exactTarget,
        freshnessState,
      };
    }

    if (sourceTarget?.category === 'blocked') {
      return {
        institutionId,
        capability: 'blocked',
        sourceTarget,
        freshnessState,
      };
    }

    if (sourceTarget?.category === 'open_admission') {
      return {
        institutionId,
        capability: 'open_admission',
        sourceTarget,
        freshnessState,
      };
    }

    if (sourceTarget?.category === 'partial') {
      return {
        institutionId,
        capability: 'score_only',
        sourceTarget,
        freshnessState,
      };
    }

    const institution = institutions.find((entry) => entry.id === institutionId);
    const hasCalculatorConfig = Boolean(institution?.calculatorConfig);
    const hasThreshold =
      Boolean(program.thresholds?.[institutionId] !== undefined) ||
      Boolean(program.directPsychometric?.[institutionId] !== undefined);

    if (hasCalculatorConfig && hasThreshold) {
      return {
        institutionId,
        capability: 'estimated',
        sourceTarget,
        freshnessState,
      };
    }

    // Check if it is a manual gate (non-calculator institution with manual requirements/notes/facts)
    const detail = program.institutionDetails?.find(
      (d) =>
        d.institutionName === institution?.name || d.officialCalculatorUrl?.includes(institutionId),
    );
    const hasManualRequirements =
      Boolean(detail?.admissionFacts?.length) ||
      Boolean(detail?.admissionAlternativePaths?.length) ||
      Boolean(detail?.specificAdmissionNotes?.length);

    if (!hasCalculatorConfig && hasManualRequirements) {
      return {
        institutionId,
        capability: 'manual_gate',
        sourceTarget,
        freshnessState,
      };
    }

    return {
      institutionId,
      capability: sourceTarget ? 'unsupported' : 'missing',
      sourceTarget,
      freshnessState,
    };
  });
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
