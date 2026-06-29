import type { MondayAdmissionEvidenceRecord } from '@/data/admissions/mondayEvidence';
import { getMondayAdmissionEvidenceByCatalogueInstitutionId } from '@/data/admissions/mondayEvidence';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { AdmissionsEvaluationCapability } from '@/types/admissionsEvaluation';

import { buildAdmissionsCapabilityMatrix } from './capabilityMatrix';

export type CatalogueEvidenceCoverageStatus =
  | 'decision_rule_available'
  | 'needs_input'
  | 'manual_or_eligible'
  | 'open_admission'
  | 'tracked_missing_rule'
  | 'untracked_gap';

export type CatalogueEvidenceTrackingSource =
  | 'monday_evidence'
  | 'catalogue_gap_inventory'
  | 'runtime_capability'
  | 'none';

export interface CatalogueEvidenceGapTracking {
  missingData: readonly string[];
  nextAction: string;
}

export interface CatalogueEvidenceCoverageEntry {
  programId: string;
  programName: string;
  programType: CatalogueProgram['type'];
  institutionId: string;
  capability: AdmissionsEvaluationCapability;
  status: CatalogueEvidenceCoverageStatus;
  trackingSource: CatalogueEvidenceTrackingSource;
  evidenceItemId: string | null;
  evidenceItemName: string | null;
  officialUrls: readonly string[];
  missingData: readonly string[];
  nextAction: string;
}

const TRACKED_CATALOGUE_EVIDENCE_GAPS: Record<string, CatalogueEvidenceGapTracking> = {
  broshim: {
    missingData: ['monday_item_mapping', 'official_rule'],
    nextAction:
      'Find official admissions evidence for מכללת ברושים and connect it to the catalogue institution id.',
  },
  elevation: {
    missingData: ['monday_item_mapping', 'official_rule'],
    nextAction:
      'Find official admissions evidence for Elevation Academy and connect it to the catalogue institution id.',
  },
  itc: {
    missingData: ['monday_item_mapping', 'official_rule'],
    nextAction:
      'Find official admissions evidence for Israel Tech Challenge and connect it to the catalogue institution id.',
  },
  kinneret: {
    missingData: ['monday_item_mapping', 'official_rule'],
    nextAction:
      'Find official admissions evidence for המכללה האקדמית כנרת; do not reuse the technological-college item without official confirmation.',
  },
  ono_ce: {
    missingData: ['monday_item_mapping', 'official_rule'],
    nextAction:
      'Find official admissions evidence for the Ono continuing-education division; the academic Ono item is not enough by itself.',
  },
  pardeshana: {
    missingData: ['monday_item_mapping', 'official_rule'],
    nextAction:
      'Find official admissions evidence for מכללת פרדס חנה and connect it to the catalogue institution id.',
  },
};

export function reconcileCatalogueAdmissionsEvidence(args: {
  programs: CatalogueProgram[];
  institutions: CatalogueInstitution[];
}): CatalogueEvidenceCoverageEntry[] {
  const { programs, institutions } = args;

  return programs.flatMap((program) =>
    buildAdmissionsCapabilityMatrix({ program, institutions }).map((capabilityEntry) => {
      const evidence = selectBestEvidence(capabilityEntry.institutionId);
      const trackedGap = TRACKED_CATALOGUE_EVIDENCE_GAPS[capabilityEntry.institutionId];
      const status = resolveCoverageStatus({
        capability: capabilityEntry.capability,
        evidence,
        trackedGap,
      });
      const trackingSource = resolveTrackingSource({
        status,
        evidence,
        trackedGap,
        capability: capabilityEntry.capability,
      });

      return {
        programId: program.id,
        programName: program.name,
        programType: program.type,
        institutionId: capabilityEntry.institutionId,
        capability: capabilityEntry.capability,
        status,
        trackingSource,
        evidenceItemId: evidence?.itemId ?? null,
        evidenceItemName: evidence?.itemName ?? null,
        officialUrls: evidence?.officialUrls ?? [],
        missingData: getMissingData(evidence, trackedGap),
        nextAction:
          evidence?.nextAction ??
          trackedGap?.nextAction ??
          'Add Monday/official admissions evidence for this catalogue institution.',
      };
    }),
  );
}

export function findUntrackedCatalogueAdmissionsGaps(
  entries: readonly CatalogueEvidenceCoverageEntry[],
): CatalogueEvidenceCoverageEntry[] {
  return entries.filter((entry) => entry.status === 'untracked_gap');
}

function getMissingData(
  evidence: MondayAdmissionEvidenceRecord | undefined,
  trackedGap: CatalogueEvidenceGapTracking | undefined,
): readonly string[] {
  if (evidence && evidence.missingData.length > 0) {
    return evidence.missingData;
  }

  return trackedGap?.missingData ?? [];
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

function resolveCoverageStatus(args: {
  capability: AdmissionsEvaluationCapability;
  evidence: MondayAdmissionEvidenceRecord | undefined;
  trackedGap: CatalogueEvidenceGapTracking | undefined;
}): CatalogueEvidenceCoverageStatus {
  const { capability, evidence, trackedGap } = args;

  if (capability === 'exact' || capability === 'estimated') {
    return 'decision_rule_available';
  }

  if (capability === 'needs_input') {
    return 'needs_input';
  }

  if (capability === 'open_admission') {
    return 'open_admission';
  }

  if (evidence) {
    if (evidence.publicBucket === 'decision_capable') {
      return 'decision_rule_available';
    }

    if (evidence.publicBucket === 'open_admission') {
      return 'open_admission';
    }

    if (
      evidence.publicBucket === 'manual_gate' ||
      evidence.publicBucket === 'eligible_with_manual_gate' ||
      evidence.publicBucket === 'eligible_no_formal_grade_gate'
    ) {
      return 'manual_or_eligible';
    }

    return 'tracked_missing_rule';
  }

  if (trackedGap) {
    return 'tracked_missing_rule';
  }

  if (capability === 'manual_gate') {
    return 'untracked_gap';
  }

  return 'untracked_gap';
}

function resolveTrackingSource(args: {
  status: CatalogueEvidenceCoverageStatus;
  evidence: MondayAdmissionEvidenceRecord | undefined;
  trackedGap: CatalogueEvidenceGapTracking | undefined;
  capability: AdmissionsEvaluationCapability;
}): CatalogueEvidenceTrackingSource {
  const { status, evidence, trackedGap, capability } = args;

  if (evidence) {
    return 'monday_evidence';
  }

  if (trackedGap) {
    return 'catalogue_gap_inventory';
  }

  if (
    status !== 'untracked_gap' &&
    (capability === 'exact' ||
      capability === 'estimated' ||
      capability === 'needs_input' ||
      capability === 'open_admission')
  ) {
    return 'runtime_capability';
  }

  return 'none';
}
