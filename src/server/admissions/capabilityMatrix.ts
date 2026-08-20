import 'server-only';

import { inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { sourceFreshnessStates } from '@/db/schema';
import type { SourceFreshnessStateRow } from '@/db/types';
import {
  getMondayAdmissionEvidenceByCatalogueInstitutionId,
  type MondayAdmissionEvidenceRecord,
} from '@/data/admissions/mondayEvidence';
import {
  formulaBackedPairScope,
  getFormulaPairVerificationEntry,
  type FormulaPairVerificationLedgerEntry,
} from '@/data/admissions/formulaBackedVerificationLedger';
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
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { HUJI_PROGRAM_VERIFICATION_ARTIFACTS } from '@/data/admissions/hujiProgramVerification';
import { BGU_PROGRAM_VERIFICATION_ARTIFACTS } from '@/data/admissions/bguProgramVerification';
import { TECHNION_PROGRAM_VERIFICATION_ARTIFACTS } from '@/data/admissions/technionProgramVerification';
import {
  getHaifaProgramConfig,
  HAIFA_PROGRAM_VERIFICATION_ARTIFACTS,
} from '@/data/admissions/haifaProgramVerification';
import { evaluateProgramVerification } from './verification/programVerification';

const SOURCE_FRESHNESS_STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

const WITHHELD_FORMULA_PAIR_CAPABILITIES: Record<
  string,
  Extract<AdmissionsEvaluationCapability, 'manual_gate' | 'requirements_only'>
> = {
  architecture__technion: 'manual_gate',
  colmgmt_cs__colman: 'manual_gate',
  medicine__tau: 'manual_gate',
  nutrition__tau: 'requirements_only',
  physiotherapy__tau: 'manual_gate',
  tau_medicine__tau: 'manual_gate',
  tau_infosystems__tau: 'requirements_only',
  physiotherapy__huji: 'requirements_only',
  nutrition__bgu: 'requirements_only',
};

export interface ExactCapabilityTarget {
  targetId: string;
  sourceTarget: AdmissionsSourceTarget;
  program: AdmissionsProgramInput;
  requiredInputs: AdmissionsRequiredInput[];
}

export interface AdmissionsCapabilityEntry {
  institutionId: string;
  capability: AdmissionsEvaluationCapability;
  formulaPairScope?: 'in_scope' | 'excluded';
  pairVerification?: FormulaPairVerificationLedgerEntry;
  sourceTarget?: AdmissionsSourceTarget;
  exactTarget?: ExactCapabilityTarget;
  requiredInputs?: AdmissionsRequiredInput[];
  evidence?: MondayAdmissionEvidenceRecord;
  freshnessState?: SourceFreshnessStateRow;
}

export type FreshnessStatesLoadResult =
  | { status: 'loaded'; states: Map<string, SourceFreshnessStateRow> }
  | { status: 'unavailable'; states: Map<string, SourceFreshnessStateRow> };

const HUJI_EXACT_PROGRAM_TARGETS: Record<string, ExactCapabilityTarget> = Object.fromEntries(
  Object.values(HUJI_PROGRAM_VERIFICATION_ARTIFACTS).map((artifact) => [
    artifact.contract.pairId,
    {
      targetId: artifact.contract.source.targetId,
      sourceTarget: admissionsSourceTargets.find(
        (entry) => entry.id === artifact.contract.source.targetId,
      )!,
      program: {
        targetId: artifact.contract.source.targetId,
        pairId: artifact.contract.pairId,
        id: artifact.contract.programId,
        name: artifact.contract.programId,
        externalId: artifact.contract.officialProgramId,
      },
      requiredInputs: [],
    } satisfies ExactCapabilityTarget,
  ]),
);

const BGU_EXACT_PROGRAM_TARGETS: Record<string, ExactCapabilityTarget> = Object.fromEntries(
  Object.values(BGU_PROGRAM_VERIFICATION_ARTIFACTS).map((artifact) => [
    artifact.contract.pairId,
    {
      targetId: artifact.contract.source.targetId,
      sourceTarget: admissionsSourceTargets.find(
        (entry) => entry.id === artifact.contract.source.targetId,
      )!,
      program: {
        targetId: artifact.contract.source.targetId,
        pairId: artifact.contract.pairId,
        id: artifact.contract.programId,
        name: artifact.contract.programId,
        externalId: artifact.contract.officialProgramId,
        searchText: artifact.contract.source.url,
      },
      requiredInputs: [],
    } satisfies ExactCapabilityTarget,
  ]),
);

const TECHNION_EXACT_PROGRAM_TARGETS: Record<string, ExactCapabilityTarget> = Object.fromEntries(
  Object.values(TECHNION_PROGRAM_VERIFICATION_ARTIFACTS).map((artifact) => [
    artifact.contract.pairId,
    {
      targetId: artifact.contract.source.targetId,
      sourceTarget: admissionsSourceTargets.find(
        (entry) => entry.id === artifact.contract.source.targetId,
      )!,
      program: {
        targetId: artifact.contract.source.targetId,
        pairId: artifact.contract.pairId,
        id: artifact.contract.programId,
        name: artifact.contract.programId,
        externalId: artifact.contract.officialProgramId,
        scoreField:
          artifact.contract.calculation.cutoff.acceptance === 92 &&
          artifact.contract.programId.includes('medicine')
            ? 'invitation'
            : undefined,
      },
      requiredInputs: ['bagrut_subject_record'],
    } satisfies ExactCapabilityTarget,
  ]),
);

const HAIFA_EXACT_PROGRAM_TARGETS: Record<string, ExactCapabilityTarget> = Object.fromEntries(
  Object.values(HAIFA_PROGRAM_VERIFICATION_ARTIFACTS).map((artifact) => [
    artifact.contract.pairId,
    {
      targetId: artifact.contract.source.targetId,
      sourceTarget: admissionsSourceTargets.find(
        (entry) => entry.id === artifact.contract.source.targetId,
      )!,
      program: {
        targetId: artifact.contract.source.targetId,
        pairId: artifact.contract.pairId,
        id: artifact.contract.programId,
        name: artifact.contract.programId,
        externalId: artifact.contract.officialProgramId,
        hug: getHaifaProgramConfig(artifact.contract.programId).hug,
      },
      requiredInputs: artifact.contract.calculation.requiredInputs,
    } satisfies ExactCapabilityTarget,
  ]),
);

const EXACT_PROGRAM_TARGETS: Record<string, ExactCapabilityTarget> = {
  ...HUJI_EXACT_PROGRAM_TARGETS,
  ...BGU_EXACT_PROGRAM_TARGETS,
  ...TECHNION_EXACT_PROGRAM_TARGETS,
  ...HAIFA_EXACT_PROGRAM_TARGETS,
  tau_datascience__tau: {
    targetId: 'tau-digital-sciences-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-digital-sciences-live',
    )!,
    program: {
      targetId: 'tau-digital-sciences-live',
      pairId: 'tau_datascience__tau',
      id: 'tau-digital-sciences',
      name: 'Digital Sciences for High-Tech',
      externalId: '056011050000',
      searchText: 'מדעים דיגיטליים',
      scoreField: 'hatama_handasa',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  nursing__tau: {
    targetId: 'tau-nursing-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-nursing-live')!,
    program: {
      targetId: 'tau-nursing-live',
      pairId: 'nursing__tau',
      id: 'tau-nursing',
      name: 'Nursing',
      externalId: '016211010000',
      searchText: 'nursing',
      scoreField: 'hatama',
      decisionMode: 'eligible_to_apply',
    },
    requiredInputs: ['psychometric_english'],
  },
  medicine__tau: {
    targetId: 'tau-medicine-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-medicine-live')!,
    program: {
      targetId: 'tau-medicine-live',
      pairId: 'medicine__tau',
      id: 'tau-medicine',
      name: 'Medicine',
      nodeId: 8215,
      externalId: '011167010000',
      scoreField: 'hatama_refua',
      decisionMode: 'eligible_to_apply',
    },
    requiredInputs: ['psychometric_english', 'math_units', 'math_grade'],
  },
  tau_medicine__tau: {
    targetId: 'tau-medicine-legacy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-medicine-legacy-live')!,
    program: {
      targetId: 'tau-medicine-legacy-live',
      pairId: 'tau_medicine__tau',
      id: 'tau_medicine',
      name: 'Medicine',
      nodeId: 8215,
      externalId: '011167010000',
      scoreField: 'hatama_refua',
      decisionMode: 'eligible_to_apply',
    },
    requiredInputs: ['psychometric_english', 'math_units', 'math_grade'],
  },
  physiotherapy__tau: {
    targetId: 'tau-physiotherapy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-physiotherapy-live')!,
    program: {
      targetId: 'tau-physiotherapy-live',
      pairId: 'physiotherapy__tau',
      id: 'tau-physiotherapy',
      name: 'Physiotherapy',
      nodeId: 8213,
      externalId: '016411010000',
      scoreField: 'hatama_refua',
      decisionMode: 'eligible_to_apply',
      staticThresholds: { acceptance: 664.92, rejection: 640 },
    },
    requiredInputs: ['psychometric_english'],
  },
  tau_psychology__tau: {
    targetId: 'tau-psychology-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-psychology-live')!,
    program: {
      targetId: 'tau-psychology-live',
      pairId: 'tau_psychology__tau',
      id: 'tau-psychology',
      name: 'Psychology',
      nodeId: 8275,
      externalId: '107111050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  social_work__tau: {
    targetId: 'tau-social-work-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-social-work-live')!,
    program: {
      targetId: 'tau-social-work-live',
      pairId: 'social_work__tau',
      id: 'tau-social-work',
      name: 'Social Work',
      nodeId: 8299,
      externalId: '111011010000',
      scoreField: 'hatama',
    },
    requiredInputs: [],
  },
  tau_socialwork__tau: {
    targetId: 'tau-social-work-legacy-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-social-work-legacy-live',
    )!,
    program: {
      targetId: 'tau-social-work-legacy-live',
      pairId: 'tau_socialwork__tau',
      id: 'tau-social-work',
      name: 'Social Work',
      nodeId: 8299,
      externalId: '111011010000',
      scoreField: 'hatama',
    },
    requiredInputs: [],
  },
  psychology__tau: {
    targetId: 'tau-psychology-legacy-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-psychology-legacy-live',
    )!,
    program: {
      targetId: 'tau-psychology-legacy-live',
      pairId: 'psychology__tau',
      id: 'tau-psychology',
      name: 'Psychology',
      nodeId: 8275,
      externalId: '107111050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  datascience__tau: {
    targetId: 'tau-digital-sciences-legacy-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-digital-sciences-legacy-live',
    )!,
    program: {
      targetId: 'tau-digital-sciences-legacy-live',
      pairId: 'datascience__tau',
      id: 'tau-digital-sciences',
      name: 'Digital Sciences for High-Tech',
      nodeId: 8286,
      externalId: '056011050000',
      scoreField: 'hatama_handasa',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  law__tau: {
    targetId: 'tau-law-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-law-live')!,
    program: {
      targetId: 'tau-law-live',
      pairId: 'law__tau',
      id: 'tau-law',
      name: 'Law',
      nodeId: 11820,
      externalId: '141111010000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  tau_law__tau: {
    targetId: 'tau-law-legacy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-law-legacy-live')!,
    program: {
      targetId: 'tau-law-legacy-live',
      pairId: 'tau_law__tau',
      id: 'tau-law',
      name: 'Law',
      nodeId: 11820,
      externalId: '141111010000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  accounting__tau: {
    targetId: 'tau-accounting-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-accounting-live')!,
    program: {
      targetId: 'tau-accounting-live',
      pairId: 'accounting__tau',
      id: 'tau-accounting',
      name: 'Accounting',
      nodeId: 11815,
      externalId: '121111050000',
      scoreField: 'hatama_nihul',
    },
    requiredInputs: ['psychometric_english'],
  },
  tau_accounting__tau: {
    targetId: 'tau-accounting-legacy-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-accounting-legacy-live',
    )!,
    program: {
      targetId: 'tau-accounting-legacy-live',
      pairId: 'tau_accounting__tau',
      id: 'tau-accounting',
      name: 'Accounting',
      nodeId: 11815,
      externalId: '121111050000',
      scoreField: 'hatama_nihul',
    },
    requiredInputs: ['psychometric_english'],
  },
  business__tau: {
    targetId: 'tau-business-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-business-live')!,
    program: {
      targetId: 'tau-business-live',
      pairId: 'business__tau',
      id: 'tau-business',
      name: 'Business Administration',
      nodeId: 8267,
      externalId: '122111050000',
      scoreField: 'hatama_nihul',
    },
    requiredInputs: [],
  },
  tau_business__tau: {
    targetId: 'tau-business-legacy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-business-legacy-live')!,
    program: {
      targetId: 'tau-business-legacy-live',
      pairId: 'tau_business__tau',
      id: 'tau-business',
      name: 'Business Administration',
      nodeId: 8267,
      externalId: '122111050000',
      scoreField: 'hatama_nihul',
    },
    requiredInputs: [],
  },
  architecture__tau: {
    targetId: 'tau-architecture-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-architecture-live')!,
    program: {
      targetId: 'tau-architecture-live',
      pairId: 'architecture__tau',
      id: 'tau-architecture',
      name: 'Architecture',
      nodeId: 8209,
      externalId: '088111010000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  biology__tau: {
    targetId: 'tau-biology-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-biology-live')!,
    program: {
      targetId: 'tau-biology-live',
      pairId: 'biology__tau',
      id: 'tau-biology',
      name: 'Biology',
      nodeId: 8219,
      externalId: '045511050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  communication__tau: {
    targetId: 'tau-communication-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-communication-live')!,
    program: {
      targetId: 'tau-communication-live',
      pairId: 'communication__tau',
      id: 'tau-communication',
      name: 'Communication',
      nodeId: 8277,
      externalId: '108511050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  political_science__tau: {
    targetId: 'tau-political-science-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-political-science-live',
    )!,
    program: {
      targetId: 'tau-political-science-live',
      pairId: 'political_science__tau',
      id: 'tau-political-science',
      name: 'Political Science',
      nodeId: 8276,
      externalId: '103111030000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  education__tau: {
    targetId: 'tau-education-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-education-live')!,
    program: {
      targetId: 'tau-education-live',
      pairId: 'education__tau',
      id: 'tau-education',
      name: 'Education',
      nodeId: 8415,
      externalId: '072311050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  economics__tau: {
    targetId: 'tau-economics-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-economics-live')!,
    program: {
      targetId: 'tau-economics-live',
      pairId: 'economics__tau',
      id: 'tau-economics',
      name: 'Economics',
      nodeId: 11821,
      externalId: '101111050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  tau_economics__tau: {
    targetId: 'tau-economics-legacy-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-economics-legacy-live',
    )!,
    program: {
      targetId: 'tau-economics-legacy-live',
      pairId: 'tau_economics__tau',
      id: 'tau-economics',
      name: 'Economics',
      nodeId: 11821,
      externalId: '101111050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  cs__tau: {
    targetId: 'tau-cs-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-cs-live')!,
    program: {
      targetId: 'tau-cs-live',
      pairId: 'cs__tau',
      id: 'tau-cs',
      name: 'Computer Science',
      nodeId: 8220,
      externalId: '036811010000',
      scoreField: 'hatama_meduyakim',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  tau_cs__tau: {
    targetId: 'tau-cs-legacy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-cs-legacy-live')!,
    program: {
      targetId: 'tau-cs-legacy-live',
      pairId: 'tau_cs__tau',
      id: 'tau-cs',
      name: 'Computer Science',
      nodeId: 8220,
      externalId: '036811010000',
      scoreField: 'hatama_meduyakim',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  ee__tau: {
    targetId: 'tau-ee-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-ee-live')!,
    program: {
      targetId: 'tau-ee-live',
      pairId: 'ee__tau',
      id: 'tau-ee',
      name: 'Electrical Engineering',
      nodeId: 11233,
      externalId: '051211010000',
      scoreField: 'hatama_meduyakim',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  tau_ee__tau: {
    targetId: 'tau-ee-legacy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-ee-legacy-live')!,
    program: {
      targetId: 'tau-ee-legacy-live',
      pairId: 'tau_ee__tau',
      id: 'tau-ee',
      name: 'Electrical Engineering',
      nodeId: 11233,
      externalId: '051211010000',
      scoreField: 'hatama_meduyakim',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  me__tau: {
    targetId: 'tau-me-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-me-live')!,
    program: {
      targetId: 'tau-me-live',
      pairId: 'me__tau',
      id: 'tau-me',
      name: 'Mechanical Engineering',
      nodeId: 8288,
      externalId: '054211010000',
      scoreField: 'hatama_meduyakim',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  tau_me__tau: {
    targetId: 'tau-me-legacy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-me-legacy-live')!,
    program: {
      targetId: 'tau-me-legacy-live',
      pairId: 'tau_me__tau',
      id: 'tau-me',
      name: 'Mechanical Engineering',
      nodeId: 8288,
      externalId: '054211010000',
      scoreField: 'hatama_meduyakim',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  occupational_therapy__tau: {
    targetId: 'tau-occupational-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-occupational-live')!,
    program: {
      targetId: 'tau-occupational-live',
      pairId: 'occupational_therapy__tau',
      id: 'tau-occupational-therapy',
      name: 'Occupational Therapy',
      nodeId: 8212,
      externalId: '016511010000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  tau_occupational_therapy__tau: {
    targetId: 'tau-occupational-legacy-live',
    sourceTarget: admissionsSourceTargets.find(
      (entry) => entry.id === 'tau-occupational-legacy-live',
    )!,
    program: {
      targetId: 'tau-occupational-legacy-live',
      pairId: 'tau_occupational_therapy__tau',
      id: 'tau-occupational-therapy',
      name: 'Occupational Therapy',
      nodeId: 8212,
      externalId: '016511010000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
  tau_industrial__tau: {
    targetId: 'tau-industrial-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-industrial-live')!,
    program: {
      targetId: 'tau-industrial-live',
      pairId: 'tau_industrial__tau',
      id: 'tau-industrial',
      name: 'Industrial Engineering and Management',
      nodeId: 8291,
      externalId: '057311010000',
      scoreField: 'hatama_meduyakim',
    },
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
  },
  tau_biology__tau: {
    targetId: 'tau-biology-legacy-live',
    sourceTarget: admissionsSourceTargets.find((entry) => entry.id === 'tau-biology-legacy-live')!,
    program: {
      targetId: 'tau-biology-legacy-live',
      pairId: 'tau_biology__tau',
      id: 'tau-biology',
      name: 'Biology',
      nodeId: 8219,
      externalId: '045511050000',
      scoreField: 'hatama',
    },
    requiredInputs: ['psychometric_english'],
  },
};

export function exactSourceIdsForProgram(
  program: Pick<CatalogueProgram, 'id' | 'linkedInstitutionIds'>,
) {
  return program.linkedInstitutionIds.flatMap((institutionId) => {
    const target = EXACT_PROGRAM_TARGETS[`${program.id}__${institutionId}`];
    return target ? [target.targetId] : [];
  });
}

const SOURCE_TARGETS_BY_INSTITUTION = new Map<string, AdmissionsSourceTarget>(
  admissionsSourceTargets.map((target) => [target.institutionId, target]),
);

const REVIEWED_PARTIAL_ESTIMATE_INSTITUTIONS = new Set(['reichman', 'afeka', 'hit']);

export async function loadFreshnessStatesBySourceIds(
  sourceIds: string[],
): Promise<FreshnessStatesLoadResult> {
  if (sourceIds.length === 0) {
    return { status: 'loaded', states: new Map() };
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(sourceFreshnessStates)
      .where(inArray(sourceFreshnessStates.sourceId, sourceIds));

    return { status: 'loaded', states: new Map(rows.map((row) => [row.sourceId, row])) };
  } catch {
    return { status: 'unavailable', states: new Map() };
  }
}

export function buildAdmissionsCapabilityMatrix(args: {
  program: CatalogueProgram;
  institutions: CatalogueInstitution[];
  input?: AdmissionsExtraInputs;
  freshnessStatesBySourceId?: Map<string, SourceFreshnessStateRow>;
  freshnessAuthorityUnavailable?: boolean;
  now?: Date;
}): AdmissionsCapabilityEntry[] {
  const {
    program,
    institutions,
    input,
    freshnessStatesBySourceId = new Map<string, SourceFreshnessStateRow>(),
    freshnessAuthorityUnavailable = false,
    now = new Date(),
  } = args;

  return program.linkedInstitutionIds.map((institutionId) => {
    const pairId = `${program.id}__${institutionId}`;
    const formulaPairScope = formulaBackedPairScope(pairId);
    const pairVerification = getFormulaPairVerificationEntry(pairId);
    const verificationArtifact = getProgramVerificationArtifact(pairId);
    const exactTarget = EXACT_PROGRAM_TARGETS[pairId];
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

    if (formulaPairScope === 'excluded') {
      return {
        institutionId,
        capability: 'unsupported',
        formulaPairScope,
        sourceTarget,
        evidence,
        freshnessState,
      };
    }

    if (formulaPairScope === 'in_scope' && pairVerification?.state !== 'exact') {
      return {
        institutionId,
        capability:
          WITHHELD_FORMULA_PAIR_CAPABILITIES[pairId] ??
          (pairVerification?.state === 'blocked'
            ? 'blocked'
            : pairVerification?.state === 'stale'
              ? 'stale'
              : 'authority_unavailable'),
        formulaPairScope,
        pairVerification,
        sourceTarget,
        exactTarget,
        evidence,
        freshnessState,
      };
    }

    if (formulaPairScope === 'in_scope' && pairVerification?.state === 'exact') {
      if (freshnessAuthorityUnavailable || !freshnessState) {
        return {
          institutionId,
          capability: 'authority_unavailable',
          formulaPairScope,
          pairVerification,
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      if (freshnessState?.status === 'blocked') {
        return {
          institutionId,
          capability: 'blocked',
          formulaPairScope,
          pairVerification,
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      if (
        freshnessState?.status === 'failed' ||
        freshnessState?.status === 'changed_needs_review'
      ) {
        return {
          institutionId,
          capability: 'stale',
          formulaPairScope,
          pairVerification,
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      const verification = verificationArtifact
        ? evaluateProgramVerification({
            contract: verificationArtifact.contract,
            fixtures: verificationArtifact.fixtures,
            currentAdmissionCycle: pairVerification.admissionCycle,
            currentSourceFingerprint: verificationArtifact.contract.sourceFingerprint,
          })
        : undefined;

      if (!verificationArtifact || !verification || verification.capability !== 'exact') {
        return {
          institutionId,
          capability: verification?.capability ?? 'authority_unavailable',
          formulaPairScope,
          pairVerification,
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      if (
        !isExactFreshnessState(freshnessState, verificationArtifact.contract.sourceFingerprint, now)
      ) {
        return {
          institutionId,
          capability: isFreshnessStateStale(freshnessState, now)
            ? 'stale'
            : 'authority_unavailable',
          formulaPairScope,
          pairVerification,
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      const verifiedCutoff = verificationArtifact?.contract.calculation.cutoff.acceptance;
      if (
        institutionId === 'technion' &&
        hasThreshold &&
        verifiedCutoff !== null &&
        program.thresholds?.[institutionId] !== verifiedCutoff
      ) {
        return {
          institutionId,
          capability: 'authority_unavailable',
          formulaPairScope,
          pairVerification,
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }
    }

    if (exactTarget) {
      if (freshnessAuthorityUnavailable || !freshnessState) {
        return {
          institutionId,
          capability: 'authority_unavailable',
          formulaPairScope,
          pairVerification,
          sourceTarget,
          exactTarget,
          evidence,
          freshnessState,
        };
      }

      if (freshnessState?.status === 'blocked') {
        return {
          institutionId,
          capability: 'blocked',
          formulaPairScope,
          pairVerification,
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
          formulaPairScope,
          pairVerification,
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
          formulaPairScope,
          pairVerification,
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
        formulaPairScope,
        pairVerification,
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

function isExactFreshnessState(
  state: SourceFreshnessStateRow,
  reviewedSourceFingerprint: string,
  now: Date,
): boolean {
  return (
    state.status === 'fresh' &&
    state.capability === 'decision_capable' &&
    state.proofLevel === 'exact_official' &&
    (state.decisionProvenance === 'official_response' ||
      state.decisionProvenance === 'verified_derivation') &&
    state.reviewedSourceFingerprint === reviewedSourceFingerprint &&
    !isFreshnessStateStale(state, now)
  );
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

  if (!state.lastExactCheckAt) {
    return true;
  }

  return now.getTime() - state.lastExactCheckAt.getTime() > SOURCE_FRESHNESS_STALE_AFTER_MS;
}
